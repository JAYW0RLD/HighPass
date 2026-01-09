# 🤖 HighStation Agent Simulator (Demo)

The **Agent Simulator** allows you to experience HighStation's core "Agentic Payment" feature firsthand.
You can create your own agent in the terminal and experience the process of calling the Gatekeeper API through a real wallet.

## ✨ Key Features
- **CLI Agent Generation**: Automatically generates a cryptocurrency wallet (Private Key) and saves it securely locally.
- **Auto Signing & Auth**: The agent autonomously generates timestamps and nonces, signing requests (ECDSA) to call the API.
- **Optimistic Payment**: Even new agents with low credit scores can experience the "Use now, pay later" logic via the demo service.

---

## 🚀 User Guide (3 Steps)

This demo works on both local development environments (`localhost`) and **remote deployed servers** (`Vercel`).

### Step 1: Start Server (Local Only)
Required only if you are running the server on your own machine. Skip this if testing a generic remote server.
```bash
npm run dev
```

### Step 2: Create Agent (Wallet)
Run this once to create your unique agent wallet.
```bash
npx ts-node scripts/create-agent.ts
```
- **Result**: A `scripts/agent-wallet.json` file is created.
- **Tip**: For real Mainnet testing, fund the printed address with tokens (CRO).

### Step 3: Run Agent (Action)
Command the agent to **call the API**.

**Option A: Localhost Test (Default)**
```bash
npx ts-node scripts/run-agent.ts
```
> Sends requests to `http://localhost:3000` by default.

**Option B: Remote Server Test (External User / Vercel)** ⭐️
To test against a live deployed server (e.g., Vercel), **pass the URL as an argument.**
```bash
npx ts-node scripts/run-agent.ts https://my-highstation-demo.vercel.app
```
> **External users** can use this command to instantly test deployed services without local server setup.

---

## ✅ Example Output
```
🤖 AGENT AI ACTIVATED
===============================
➤ Identity Loaded 0xaEE2...8462
➤ Target Acquired https://highstation-demo.vercel.app/gatekeeper/echo-service/resource
➤ Generating Proof Nonce: 812931
➤ Signing Request 0xc69f...4b20...

📡 Transmitting data to Gatekeeper...

✅ ACCESS GRANTED (124ms)
-------------------------------
Data Received: { service: 'Demo Echo', ... }

💳 NOTE: Optimistic Payment Mode
   Your reputation allowed you to pay later (Debt recorded).
```

---

## 💡 Notes
- **Security**: The generated wallet file (`agent-wallet.json`) is added to `.gitignore` and will not be uploaded to GitHub.
- **Demo Mode**: The `echo-service` has a Static Fallback configuration so it works without a database connection.
