# 🤖 HighStation Agent Simulator (Interactive CLI)

Experience **"Agentic Payment"** firsthand with this interactive console tool.
Turn your terminal into an AI Agent's control center.

## ✨ Key Features
- **Interactive Menu**: Control your agent using simple number keys (1, 2, 3...).
- **Real-time Dashboard**: Monitor wallet address, balance, and target server status instantly.
- **Remote Access**: Connect to and test any deployed server (e.g., Vercel) seamlessly.

---

## 🚀 Getting Started (External Users)

This guide assumes you have downloaded the project and want to test against a **Remote Server (e.g., Vercel)**.

### Step 1: Navigate to Project Folder (Critical!)
You MUST be inside the `highstation` directory to run the scripts.
(Skipping this will cause `MODULE_NOT_FOUND` errors)

```bash
cd highstation
```

### Step 2: Install Dependencies
Install the necessary tools. (First time only)
```bash
npm install
```

### Step 3: Create Agent (Wallet)
Generate your unique agent wallet.
```bash
npx ts-node scripts/create-agent.ts
```

### Step 4: Run Simulator!
Pass the **Target Server URL** as an argument.

```bash
# Usage: npx ts-node scripts/run-agent.ts [TARGET_URL]

# Example:
npx ts-node scripts/run-agent.ts https://highstation-demo.vercel.app
```

---

## 🎮 How to Use

Once launched, you will see the dashboard:

```text
   HighStation Agent Simulator v2.0

⚡ AGENT PROFILE
   ID:      0xaEE2...8462
   Balance: 0.0 CRO
   Target:  https://highstation-demo.vercel.app
   Status:  ONLINE
----------------------------------------

COMMANDS:
  [1] 💰 Check Wallet Balance
  [2] 📡 Send API Request
  [3] ⚙️  Set Target URL
  [4] 🚪 Exit
```

1.  Press **`[2]` (Send API Request)**.
2.  The agent will auto-sign and connect to the server.
3.  Look for **"✅ ACCESS GRANTED"**! (Optimistic Payment Mode)

---

## 💡 FAQ
**Q: I get `MODULE_NOT_FOUND` error.**
A: Make sure you followed Step 1 (`cd highstation`). You cannot run this from the root folder.

**Q: Does this cost real money?**
A: No. It runs on Cronos Testnet and defaults to 'Optimistic Mode' (Post-paid/Demo), so no funds are required.
