# HighStation - AI Agent Payment Gateway 🚀

[![License: ISC](https://img.shields.io/badge/License-ISC-blue.svg)](https://opensource.org/licenses/ISC)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue)](https://www.typescriptlang.org/)
[![Production](https://img.shields.io/badge/Status-Live-success)](https://highstation-dashboard.vercel.app/)

> **[한국어 문서 보기 →](./README_KR.md)**

**X402 Protocol** | **Reputation-Based Credit** | **Pay Later Model**

An autonomous "use now, pay later" platform for AI agents. Access APIs instantly based on credit score, settle debts automatically when thresholds are reached.

> � **Live Demo**: [https://highstation-dashboard.vercel.app](https://highstation-dashboard.vercel.app)

---

## ⚡ Quick Start (3 Minutes)

### 1️⃣ Visit Dashboard (Live Deployment)
👉 **[HighStation Dashboard](https://highstation-dashboard.vercel.app)**

### 2️⃣ Key Features
- **Provider Portal**: GitHub OAuth login → Register APIs → Track revenue
- **Services Page**: Browse all registered services (Public/Verified)
- **Agent Simulator**: Test payment flow in terminal

### 3️⃣ Test with Agent Simulator
Try the payment flow locally:
```bash
# 1. Clone repository
git clone https://github.com/JAYW0RLD/HighStation.git
cd HighStation/highstation

# 2. Install dependencies
npm install

# 3. Create agent wallet (first time only)
npx ts-node scripts/create-agent.ts

# 4. Fund wallet with test CRO (Cronos zkEVM Testnet)
# → New wallets start at Grade F (pay-per-call)
# → Recommended: 1-5 CRO for smooth testing
# → Get testnet tokens: https://faucet.cronos.org

# 5. Call gated API (experience credit flow)
npx ts-node scripts/run-agent.ts
```

**Expected Output**:
```
✅ Service: Demo Echo API
✅ Status: 200 OK (Optimistic Payment)
💰 Debt: 100000000000000 wei (0.0001 CRO)
```

### 4️⃣ How It Works
```
AI Agent (Grade A) → API Call → ✅ 200 OK (credit approved)
                   → Debt += 0.1 CRO
... 50 calls later ...
                   → Debt >= $5 → 🔔 402 Payment Required
                   → Auto Settlement (on-chain) → Debt = 0
```

---

## � Core Features

### Reputation-Based Credit Tiers (A-F)
Automatic tier assignment based on on-chain reputation:

| Tier | Reputation | Credit Limit | Policy |
|------|-----------|--------------|--------|
| **A** | 90+ | $5 | Instant access, pay later |
| **B-C** | 70-89 | $1 | Small credit allowed |
| **D-F** | 0-69 | $0 | Prepayment required |

### X402 Protocol (Autonomous Settlement)
Leveraging HTTP `402 Payment Required` for **automatic settlement**:

```http
HTTP/1.1 402 Payment Required
WWW-Authenticate: Token receiver="0x...", amount="500000000000000000", chainId="240"
```

→ Agent auto-generates transaction → retries → success ✅

### Optimistic Payment
High-credit agents can **use first → pay later**:
- 80% threshold → warning
- 100% threshold → forced settlement
- Settlement complete → limit restored

---

## 📚 Documentation

### Essential Reading
- [**Design Philosophy (Why?)**](./docs/DESIGN_PHILOSOPHY.md) - Why credit-based payments?
- [**Project History**](./docs/PROJECT_HISTORY.md) - Development timeline & roadmap
- [**Infrastructure Vision (10k TPS)**](./docs/INFRASTRUCTURE_VISION.md) - Future Architecture & Go Migration
- [**Security Audit**](./docs/security/) - Red Team comprehensive audit

### Integration Guides
- [AI Agent Integration](./docs/guides/AGENT_INTEGRATION_GUIDE_KR.md) - Python/Node.js SDK
- [Agent CLI Simulator](./docs/guides/AGENT_CLI_GUIDE_KR.md) - Terminal testing
- [Provider Guide](./docs/guides/PROVIDER_GUIDE_KR.md) - For API providers
- [Deployment Guide](./DEPLOYMENT_GUIDE_KR.md) - Vercel + Supabase

---

## 🏗️ Tech Stack

**Backend**: Node.js, Express, TypeScript  
**Database**: Supabase (PostgreSQL + RLS)  
**Blockchain**: Cronos zkEVM Testnet (Viem)  
**Frontend**: React, Vite, Supabase Auth (GitHub OAuth)  
**Deployment**: Vercel (Serverless Functions)  

---

## 🛠️ Local Development (For Contributors)

To contribute or run locally:

<details>
<summary><strong>📖 Development Setup Guide (Click to expand)</strong></summary>

### 1. Clone & Install
```bash
git clone https://github.com/JAYW0RLD/HighStation.git
cd HighStation/highstation
npm install
```

### 2. Environment Setup
```bash
cp .env.example .env.local
# Edit .env.local with:
# - SUPABASE_URL & SERVICE_ROLE_KEY
# - RPC_URL (https://testnet.zkevm.cronos.org)
# - PAYMENT_HANDLER_ADDRESS
# - IDENTITY_CONTRACT_ADDRESS
```

### 3. Database Setup
```bash
# Run schema.sql in Supabase SQL Editor
# Or seed locally:
npx ts-node scripts/seed-dev.ts
```

### 4. Start Backend
```bash
npm run dev
# Backend: http://localhost:3000
```

### 5. (Optional) Start Frontend
```bash
cd dashboard
npm install
npm run dev
# Frontend: http://localhost:5173
```

</details>

---

## 🔒 Security

- ✅ **Red Team Audit Complete** (v3.7)
- ✅ **15+ Vulnerabilities Fixed** (SSRF, Replay Attack, CSRF, etc.)
- ✅ **Database RLS** + Nonce-based Replay Protection
- ✅ **Helmet.js CSP** Applied

**Security Score**: 10/10

---

## 📊 Production Deployment

Currently live on **Vercel + Supabase**:
- **Backend API**: Vercel Serverless Functions
- **Frontend Dashboard**: Vercel Static Hosting
- **Database**: Supabase Production (PostgreSQL)
- **Blockchain**: Cronos zkEVM Testnet

---

## 🤝 Contributing

Issues and Pull Requests are welcome!

---

© 2026 HighStation Team | Built for the Agentic Future
