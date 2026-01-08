# 🚀 HighStation | Agent Payment Gateway

> **Trustless Payments Meet Agent Identity** - A production-ready API gateway enabling secure, low-cost agent-to-agent payments on Cronos zkEVM using X402 protocol.

[![Cronos zkEVM](https://img.shields.io/badge/Cronos-zkEVM-blue)](https://zkevm.cronos.org)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Security: 9/10](https://img.shields.io/badge/Security-9%2F10-brightgreen)](docs/audit/EXECUTIVE_SUMMARY.md)
[![Red Team: Audited](https://img.shields.io/badge/Red%20Team-Audited-success)](docs/audit/RED_TEAM_REPORT.md)
[![Version: 2.0.3](https://img.shields.io/badge/Version-2.0.3-blue)](docs/PROJECT_HISTORY.md)


## 📖 Overview

HighStation is a **next-generation API gateway** designed for the **autonomous agent economy**. It combines:

- **Multi-Provider Platform** - Self-service portal for API providers to monetize services
- **Dynamic Pricing** - Real-time CRO/USD price feeds via Pyth Oracle
- **1% Protocol Fee** - Sustainable revenue model via `PaymentHandler` smart contract
- **HTTP 402 Standard** - Native web protocol for machine-to-machine payments
- **Cronos zkEVM** - Ultra-low gas fees (~$0.001/tx) for micro-transactions
- **Supabase Backend** - PostgreSQL + Auth + Realtime for production scalability

## 🎯 Key Features

- ✅ **Provider Portal** - Register APIs, set pricing, view analytics
- ✅ **Test Console** - Built-in API testing with response inspection
- ✅ **JWT Security** - Provider authentication with zero-trust verification
- ✅ **Automated Settlements** - Configure auto-withdrawal thresholds
- ✅ **Revenue Dashboard** - Real-time earnings and protocol metrics

## 📚 Documentation

- [📜 Project History & Changelog](docs/PROJECT_HISTORY.md) - Full development timeline
- [🚀 Deployment Guide (English)](docs/guides/DEPLOYMENT.md)
- [🚀 배포 가이드 (한국어)](docs/guides/DEPLOYMENT_KR.md)
- [🛡️ Security Audit](docs/audit/EXECUTIVE_SUMMARY.md)

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- Foundry
- Cronos zkEVM Testnet funds ([Faucet](https://cronos.org/faucet))

### Installation
```bash
git clone https://github.com/yourname/highstation
cd highstation
npm install
forge install
```

### Configuration
Create `.env`:
```env
PRIVATE_KEY=0x...
RPC_URL=https://testnet.zkevm.cronos.org
CHAIN_ID=240
ADMIN_WALLET_ADDRESS=0x...
PYTH_PRICE_FEED_ID=0xff61491a131119af66174c751631553554319142416d44692a7556e17be2139a
```

### Deploy Contracts
```bash
forge build
npm run deploy:cronos
```

### Start Backend
```bash
npm run start
```

### Start Dashboard
```bash
cd dashboard
npm run dev
```

### Run Verification
```bash
npm run verify:cronos
```

**Expected Output:**
```
>>> REAL WORLD SIMULATION (Public Cronos zkEVM) <<<
SUCCESS: 402 Recv. Header: Token realm="X402", amount="97230562443800720", asset="CRO"
Payment Tx Sent: 0x0ce...eb6
SUCCESS: 200 OK
```

## 📊 Live Demo

**Deployed Contracts (Cronos zkEVM Testnet):**
- Identity: `0xf793549b33b121125e06e0578455c9fe84cc8f23`
- Payment Handler: `0xcb54c99e0025ce8a2f407a7e6f4ecf01ced141dc`

**Example Transaction:**
[View on Explorer](https://explorer.zkevm.cronos.org/tx/0x0ce46d564c1cea58e000c9f3f4f24e7145dbc5b84aeb187889516f6b8768eeb6)

## 🛠️ Tech Stack

- **Blockchain**: Cronos zkEVM
- **Backend**: Node.js, Express, Supabase
- **Frontend**: React, Vite
- **Smart Contracts**: Solidity, Foundry

## 📜 License

MIT - See [LICENSE](./LICENSE)

---

**Built with ❤️ using X402 Protocol on Cronos zkEVM**
