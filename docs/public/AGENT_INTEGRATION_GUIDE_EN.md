# 🤖 AI Agent Integration Guide (x402 Protocol)

This guide explains how AI agents can call paid APIs through the HighStation gateway. All integrations follow the official **x402 protocol**.

---

## 1. Integration Flow

HighStation requires real-time settlement for every request.

1.  **Agent**: Calls `/gatekeeper/:slug/info` to **verify OpenSeal integrity**.
2.  **Agent**: If verification passes, calls the Gated API resource endpoint.
3.  **HighStation**: Returns `402 Payment Required` with requirements.
4.  **Agent**: Generates a payment header using `@crypto.com/facilitator-client`.
5.  **Agent**: Retries the call with the generated payment header.
6.  **HighStation**: Verifies payment, settles on-chain, and forwards the API response.

---

## 2. SDK Installation

```bash
npm install @crypto.com/facilitator-client viem
```

---

## 3. Code Example (TypeScript)

Agents can perform payments using the `Facilitator` SDK as shown below:

```typescript
import { Facilitator, CronosNetwork } from '@crypto.com/facilitator-client';
import { createWalletClient, http } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import axios from 'axios';

async function callGatedApi() {
    // 1. Initial Call Attempt
    const endpoint = "https://text-washer.highstation.net/v1/resource";
    
    try {
        await axios.post(endpoint, { text: "Hello AI Economy" });
    } catch (error: any) {
        if (error.response?.status === 402) {
            const requirements = error.response.data.requirements;
            
            // 2. Generate Payment Header
            const account = privateKeyToAccount(PRIVATE_KEY);
            const facilitator = new Facilitator({ network: CronosNetwork.CronosTestnet });
            
            const paymentHeader = await facilitator.generatePaymentHeader({
                to: requirements.payTo,
                value: requirements.maxAmountRequired,
                signer: {
                    getAddress: async () => account.address,
                    signMessage: async (msg) => { /* implementation */ },
                    signTypedData: async (domain, types, value) => { /* implementation */ }
                }
            });

            // 3. Retry with Payment Header
            const result = await axios.post(endpoint, { text: "Hello AI Economy" }, {
                headers: {
                    'Authorization': `Bearer ${paymentHeader}`
                }
            });
            
            console.log("Success:", result.data);
        }
    }
}
```

---

## 4. Automated Discovery via MCP

AI Agents can automatically discover APIs registered in HighStation using the **MCP (Model Context Protocol)** standard.

### 🔌 Connection & Bootstrapping

Since the MCP ecosystem does not yet have a global auto-discovery registry, the **initial connection requires manual configuration**.

1. **Set Gateway Address**: You must provide the following endpoint to the Agent (via config file or environment variables).
   - **MCP Endpoint**: `https://highstation.net/mcp/sse`
   
2. **Handshake**:
   - The Agent requests an `SSE (Server-Sent Events)` connection to the above address.
   - Upon success, HighStation sends the available tool definitions (`search_services`, `get_payment_info`) to the Agent according to the MCP protocol.
   
From then on, the Agent can **discover APIs autonomously** using these tools. Once the gateway address is known, the Agent does not need to know individual API URLs in advance.

### 🛠️ Key Tools Provided

1.  **`search_services`**: Search for APIs.
    - **Input**: `query` (e.g., "stock", "news")
    - **Description**: Searches the HighStation registry and returns a list of relevant paid APIs (Name, Price, Description).
    - **Agent Behavior**: Upon receiving a natural language request (e.g., "I need stock info"), the Agent calls this tool to find an appropriate API.

2.  **`get_payment_info`**: Confirm payment protocols.
    - **Description**: Returns network info (Cronos Testnet), facilitator addresses, and payment method (x402) in JSON format.
    - **Agent Behavior**: If the discovered API requires payment, the Agent calls this tool to obtain the chain info needed for generating payment headers.

---

## 5. Interpreting Verification Flags

Every service provides a `trust_signal` via the `/info` endpoint. Agents should decide whether to proceed based on these signals.

```json
"trust_signal": {
  "computed_score": 0.98,
  "optimized_metadata": {
    "openseal_verified": true,  // [CRITICAL] Code is untampered (L1)
    "zk_proof_valid": true,     // [CRITICAL] Performance is mathematically proven (L2)
    "reliability_rank": "A"     // Statistical reliability (L3)
  }
}
```

> **Recommended Strategy**: Configure your agent to only interact with services where `openseal_verified: true` to eliminate security risks at the source.
