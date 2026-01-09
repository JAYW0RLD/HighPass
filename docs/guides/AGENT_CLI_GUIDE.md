# 🤖 HighStation Agent Simulator (Demo)

The **Agent Simulator** allows you to experience HighStation's core "Agentic Payment" feature firsthand.
You can create your own agent in the terminal and experience the process of calling the Gatekeeper API through a real wallet.

## ✨ Key Features
- **CLI Agent Generation**: Automatically generates a cryptocurrency wallet (Private Key) and saves it securely locally.
- **Auto Signing & Auth**: The agent autonomously generates timestamps and nonces, signing requests (ECDSA) to call the API.
- **Optimistic Payment**: Even new agents with low credit scores can experience the "Use now, pay later" logic via the demo service.

---

## 🚀 Getting Started

This demo runs in your local development environment. Open your terminal and follow these steps.

### 1. Start Server (Required)
The server with the latest code must be running.
```bash
npm run dev
```

### 2. Create Agent (Wallet)
Generate a new agent wallet.
```bash
npx ts-node scripts/create-agent.ts
```
- **Result**: A `scripts/agent-wallet.json` file is created.
- **Check**: The `0x...` address printed in the terminal is your agent's address.

### 3. Run Agent (Action)
Command the agent to "Call the API!".
```bash
npx ts-node scripts/run-agent.ts
```
- **Action**: The agent loads the wallet, generates auth headers, and calls the `Echo Service`.
- **Success**:
  ```
  ✅ ACCESS GRANTED
  Data Received: { ... }
  💳 NOTE: Optimistic Payment Mode (Pay later!)
  ```

---

## 💡 Notes
- **Demo Mode**: The `echo-service` has a Static Fallback configuration so it works without a database connection.
- **Security**: The generated wallet file (`agent-wallet.json`) is added to `.gitignore` and will not be uploaded to GitHub.
- **Payment**: To connect to a real Mainnet/Testnet, this wallet needs tokens (CRO) to pay for gas and fees. (The demo assumes a free/gasless environment or optimistic mode).
