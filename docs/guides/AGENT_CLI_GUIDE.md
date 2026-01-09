# 🤖 HighStation Agent Simulator (Interactive CLI)

Experience **"Agentic Payment"** firsthand with this interactive console tool.

## ✨ Key Features
- **Interactive Menu**: Control your agent using simple number keys (1, 2, 3...).
- **Global Wallet**: Wallet file is saved securely in your `Home Directory`, allowing you to use the same Identity across different folders.
- **Remote Access**: Connect to and test any deployed server (e.g., Vercel) seamlessly.

---

## 🚀 Quick Start

Currently, you need the project folder to install security libraries (`viem`).
(A fully standardized `npx highstation-cli` for zero-install execution is coming soon.)

### Step 1: Install (One Time)
```bash
git clone https://github.com/JAYW0RLD/HighStation.git
cd HighStation
npm install
```

### Step 2: Create Agent
Generate your unique agent wallet. (Saved to your Home Directory)
```bash
npx ts-node scripts/create-agent.ts
```

### Step 3: Run Simulator!
Pass the **Target Server URL** as an argument.

```bash
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
   Balance: 12.5 CRO
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
**Q: Can I run this without downloading?**
A: Currently, minimal setup is required for the crypto signing libraries (`viem`). Once published as an **npm package**, you will be able to run it via `npx` without downloading.

**Q: Where is my wallet?**
A: It is stored in your User Home Directory (`~/.highstation-agent-wallet.json`). Your identity persists even if you delete the project folder.
