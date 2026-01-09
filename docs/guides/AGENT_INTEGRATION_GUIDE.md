# 🤖 HighStation AI Agent Integration Guide

> **IMPORTANT (Hackathon 2025 Update):**
> It is now **HIGHLY RECOMMENDED** to use the official **`@crypto.com/facilitator-client`** package. The manual implementation guide below is for reference only. For production, please use the official SDK.

### 1. Auth Headers (X402 Standard) - Using Official SDK

```bash
npm install @crypto.com/facilitator-client
```

```typescript
import { Facilitator } from '@crypto.com/facilitator-client';

// SDK automatically generates and manages headers. (Refer to official docs)
```

### 2. Manual Implementation (Legacy)
If you must implement manually, include the following headers:
HighStation fully supports compatibility with agents using the **Crypto.com AI Agent SDK**.

---

## 🦁 Crypto.com AI Agent SDK Integration (Hackathon Special)

Are you building a bot using the Crypto.com AI Agent SDK?
HighStation is perfectly compatible with the standard EVM Wallet (`viem` based) used by the CDC SDK.

### ✅ Integration Demo
Check out our demo script to see the integration process in action.
```bash
# CDC Agent SDK style integration demo
npx ts-node scripts/cdc-agent-demo.ts
```
> This script simulates the full flow where a `Crypto.com AI Agent` calls a paid API, encounters a `402 Payment Required`, automatically settles the payment on Cronos Testnet, and resumes its task.

---

## 1. Integration Overview

HighStation integration consists of **two main steps**:

1.  **Identity**: Attach a digital signature to every API request.
2.  **Settlement**: If the server returns `402 Payment Required`, perform a blockchain transfer and retry the request.

### Prerequisites
*   **EVM Wallet**: Agent-specific wallet (Private Key required).
*   **Testnet Tokens**: Cronos zkEVM Testnet tokens (for Gas and Payments).

---

## 2. Request Header Spec (Protocol Spec)

Every HTTP request must include these 4 headers:

| Header | Description | Example |
|--------|-------------|---------|
| `x-agent-id` | Agent's Wallet Address (0x...) | `0x123...abc` |
| `x-auth-timestamp` | Current timestamp (ms) | `1701234567890` |
| `x-auth-nonce` | Random nonce to prevent replay | `987654` |
| `x-agent-signature` | Signed value of the above 3 data points | `0xabc...` |

### Signing Message Format
The signature must be the `personal_sign` result of the following string:
```text
Identify as [WalletAddress] at [Timestamp] with nonce [Nonce]
```
> Example: `Identify as 0x123... at 1709999999999 with nonce 123456`

---

## 3. Implementation Example (Python / LangChain)

Example for Python-based agents (LangChain, CrewAI, etc.).
Requires `web3.py` and `requests`.

```bash
pip install web3 requests
```

### `AgentClient.py`
```python
import time
import random
import requests
from web3 import Web3
from eth_account.messages import encode_defunct

class HighStationAgent:
    def __init__(self, private_key, rpc_url="https://testnet.cronos.org/evm"):
        self.w3 = Web3(Web3.HTTPProvider(rpc_url))
        self.account = self.w3.eth.account.from_key(private_key)
        self.address = self.account.address
        print(f"🤖 Agent Initialized: {self.address}")

    def sign_headers(self):
        timestamp = str(int(time.time() * 1000))
        nonce = str(random.randint(0, 1000000))
        message_text = f"Identify as {self.address} at {timestamp} with nonce {nonce}"
        
        # Sign the message
        message = encode_defunct(text=message_text)
        signed_message = self.account.sign_message(message)
        
        return {
            'x-agent-id': self.address,
            'x-auth-timestamp': timestamp,
            'x-auth-nonce': nonce,
            'x-agent-signature': signed_message.signature.hex(),
            'Content-Type': 'application/json'
        }

    def call_api(self, method, url, data=None):
        headers = self.sign_headers()
        
        try:
            response = requests.request(method, url, json=data, headers=headers)
            
            # Case 1: Success (200 OK)
            if response.status_code == 200:
                print("✅ Access Granted!")
                return response.json()
                
            # Case 2: Payment Required (402) - Auto Settlement Logic
            elif response.status_code == 402:
                print("⛔ Payment Required! Initiating Settlement...")
                return self.handle_payment(response, method, url, data)
                
            else:
                print(f"❌ Error: {response.status_code}")
                return response.text

        except Exception as e:
            print(f"Error: {e}")

    def handle_payment(self, response, method, url, data):
        # 1. Parse Bill
        details = response.json()
        amount_wei = int(details.get('debtAmount', 0))
        
        # Extract receiver from header or use default
        auth_header = response.headers.get('WWW-Authenticate', '')
        receiver = "0x..." # Default or parse from header
        
        if 'receiver="' in auth_header:
            receiver = auth_header.split('receiver="')[1].split('"')[0]

        print(f"💸 Paying {amount_wei} Wei to {receiver}...")

        # 2. Send On-Chain Transaction
        tx = {
            'to': receiver,
            'value': amount_wei,
            'gas': 21000,
            'gasPrice': self.w3.eth.gas_price,
            'nonce': self.w3.eth.get_transaction_count(self.address),
            'chainId': 240 # Cronos Testnet
        }
        
        signed_tx = self.w3.eth.account.sign_transaction(tx, self.account.key)
        tx_hash = self.w3.eth.send_raw_transaction(signed_tx.rawTransaction)
        print(f"🔗 Tx Sent: {self.w3.to_hex(tx_hash)}")
        
        # Wait for confirmation
        self.w3.eth.wait_for_transaction_receipt(tx_hash)
        
        # 3. Retry with Proof
        print("🔄 Retrying request with Proof...")
        headers = self.sign_headers()
        headers['Authorization'] = f"Token {self.w3.to_hex(tx_hash)}" # Proof attached
        
        retry_res = requests.request(method, url, json=data, headers=headers)
        return retry_res.json()

# --- Usage Example ---
# agent = HighStationAgent("YOUR_PRIVATE_KEY")
# result = agent.call_api("POST", "https://api.highstation.org/gatekeeper/chat/completions", {"prompt": "hello"})
# print(result)
```

---

## 4. Node.js Implementation Example

`viem` and `axios` example for JS/TS bots.

```typescript
import { createWalletClient, http, parseEther } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { cronosTestnet } from 'viem/chains';
import axios from 'axios';

const account = privateKeyToAccount('0xYOUR_PRIVATE_KEY');
const client = createWalletClient({ account, chain: cronosTestnet, transport: http() });

async function callApi(url: string) {
    const timestamp = Date.now().toString();
    const nonce = Math.floor(Math.random() * 1000000).toString();
    const signature = await account.signMessage({ 
        message: `Identify as ${account.address} at ${timestamp} with nonce ${nonce}` 
    });

    try {
        await axios.post(url, {}, {
            headers: {
                'x-agent-id': account.address,
                'x-auth-timestamp': timestamp,
                'x-auth-nonce': nonce,
                'x-agent-signature': signature
            }
        });
    } catch (error: any) {
        if (error.response?.status === 402) {
            console.log("💰 Paying Debt...");
            const amount = BigInt(error.response.data.debtAmount);
            
            // Send Tx
            const hash = await client.sendTransaction({
                account,
                to: process.env.PAYMENT_RECEIVER,
                value: amount
            });
            
            // Retry with Token
            await axios.post(url, {}, {
                headers: {
                    /* ...same headers... */
                    'Authorization': `Token ${hash}`
                }
            });
        }
    }
}
```
