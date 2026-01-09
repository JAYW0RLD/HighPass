# 🤖 HighStation Agent Simulator (Real-World Simulation)

This tool interacts with the **Public Cronos zkEVM Testnet**.
It is not a "fake" simulation but a **Real-World Verification** running on an environment technologically identical to Mainnet, just with free tokens.

## 🌍 "Why Testnet?"
*   **Identical Mechanics**: Block times, Gas Fees, and ECDSA Signatures work exactly like Mainnet.
*   **Zero Risk**: Uses free Test Tokens (TCRO) instead of real money.
*   **Production Standard**: If it works here, it works on Mainnet. This is how all professional blockchain apps are verified.

---

## 🚀 Getting Started (External Users)

### Step 1: Navigate to Project Folder
```bash
cd highstation
```

### Step 2: Install Dependencies
```bash
npm install
```

### Step 3: Create Agent
Generate your unique wallet.
```bash
npx ts-node scripts/create-agent.ts
```

### Step 4: Run Simulator!
No need to remember URLs. Just run it, and **it will ask you.**

```bash
npx ts-node scripts/run-agent.ts
```

---

## 🎮 Interactive Mode

On startup, select your target:

```text
🌐 SELECT TARGET SERVER
  [1] Localhost (http://localhost:3000) - For Developers
  [2] Remote URL (e.g. Vercel)        - For External Testers

Select [1/2]: 2
Enter Server URL: https://highstation-demo.vercel.app
```

Press **`[2] Send API Request`**.
Your agent will sign a transaction and authenticate with the remote server over the real internet.

---

## 💡 FAQ
**Q: What is "Optimistic Mode"?**
A: It's a feature where the service grants "Use now, pay later" access to new users with 0 balance. This is a real-world strategy for user acquisition.

**Q: Can I use real money?**
A: Yes. Simply switch the RPC endpoint to Mainnet in the code and fund your wallet with real CRO. The agent logic remains exactly the same.
