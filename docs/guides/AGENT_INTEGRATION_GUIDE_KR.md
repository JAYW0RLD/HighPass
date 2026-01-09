# 🤖 HighStation AI Agent 연동 가이드

이 문서는 개발자가 자신의 **AI 에이전트(LangChain, AutoGPT, Python 봇 등)**에 HighStation 결제 프로토콜(X402)을 탑재하는 방법을 설명합니다.
특히 **Crypto.com AI Agent SDK**를 사용하는 에이전트와의 호환성을 완벽하게 지원합니다.

---

## 🦁 Crypto.com AI Agent SDK Integration (Hackathon Special)

Crypto.com AI Agent SDK를 사용하여 봇을 개발 중이신가요?
HighStation은 CDC SDK가 사용하는 표준 EVM Wallet (`viem` 기반)과 완벽하게 호환됩니다.

### ✅ Integration Demo
저희가 제공하는 데모 스크립트를 통해 연동 과정을 미리 확인해 보세요.
```bash
# CDC Agent SDK 스타일의 연동 데모 실행
npx ts-node scripts/cdc-agent-demo.ts
```
> 이 스크립트는 `Crypto.com AI Agent`가 외부 유료 API를 호출할 때, `402 Payment Required`를 만나면 자동으로 Cronos Testnet에서 결제를 수행하고 업무를 재개하는 전체 흐름을 시뮬레이션합니다.

---

## 1. 연동 개요 (Integration Overview)

HighStation 연동은 크게 **두 가지 단계**로 나뉩니다.

1.  **Identity (신원 증명)**: 모든 API 요청에 디지털 서명(Signature)을 첨부해야 합니다.
2.  **Settlement (자동 정산)**: 서버가 `402 Payment Required`를 반환하면, 블록체인 송금을 수행하고 재요청해야 합니다.

### 필요 사항 (Prerequisites)
*   **EVM Wallet**: 에이전트 전용 지갑 (Private Key 필요)
*   **Testnet Tokens**: Cronos zkEVM Testnet 토큰 (가스비 및 결제용)

---

## 2. 요청 헤더 규격 (Protocol Spec)

모든 HTTP 요청에는 다음 4가지 헤더가 필수입니다.

| Header | Description | Example |
|--------|-------------|---------|
| `x-agent-id` | 에이전트의 지갑 주소 (0x...) | `0x123...abc` |
| `x-auth-timestamp` | 현재 시간 (ms) | `1701234567890` |
| `x-auth-nonce` | 재전송 방지용 랜덤 난수 | `987654` |
| `x-agent-signature` | 위 3가지 데이터를 서명한 값 | `0xabc...` |

### 서명 메시지 형식 (Signing Message)
서명은 다음 문자열을 Private Key로 서명(`personal_sign`)한 값이어야 합니다.
```text
Identify as [지갑주소] at [타임스탬프] with nonce [난수]
```
> 예시: `Identify as 0x123... at 1709999999999 with nonce 123456`

---

## 3. 구현 예제 (Python / LangChain)

Python 기반의 에이전트(LangChain, CrewAI 등)를 위한 구현 예제입니다.
`web3.py`와 `requests` 라이브러리가 필요합니다.

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
        receiver = "0x..." # 기본값 혹은 헤더 파싱
        
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

# --- 사용 예시 ---
# agent = HighStationAgent("YOUR_PRIVATE_KEY")
# result = agent.call_api("POST", "https://api.highstation.org/gatekeeper/chat/completions", {"prompt": "hello"})
# print(result)
```

---

## 4. Node.js 구현 예제

JS/TS 봇을 위한 `viem` 및 `axios` 예제입니다.

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
