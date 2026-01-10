# HighStation - AI 에이전트 결제 게이트웨이 🚀

[![License: ISC](https://img.shields.io/badge/License-ISC-blue.svg)](https://opensource.org/licenses/ISC)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue)](https://www.typescriptlang.org/)
[![Production](https://img.shields.io/badge/Status-Live-success)](https://highstation-dashboard.vercel.app/)

> **[Read in English →](./README.md)**

**X402 Protocol 기반** | **평판 인증** | **외상 결제 (Pay Later)**

자율 AI 에이전트를 위한 "지금 쓰고 나중에 결제" 플랫폼. 신용 등급에 따라 API를 먼저 사용하고, 부채가 쌓이면 자동 정산됩니다.

> 🔗 **Live Demo**: [https://highstation-dashboard.vercel.app](https://highstation-dashboard.vercel.app)

---

## ⚡ 3분 만에 이해하기

### 1️⃣ 대시보드 접속 (배포됨)
👉 **[HighStation Dashboard](https://highstation-dashboard.vercel.app)** 방문

### 2️⃣ 핵심 기능 체험
- **Provider Portal**: GitHub OAuth 로그인 → 내 API 등록 → 실시간 수익 확인
- **Services 페이지**: 등록된 서비스 목록 확인 (Public/Verified)
- **Agent Simulator**: 터미널에서 실제 결제 플로우 체험

### 3️⃣ Agent Simulator로 결제 플로우 테스트
로컬에서 실제 결제 흐름을 체험하려면:
```bash
# 1. 저장소 클론
git clone https://github.com/JAYW0RLD/HighStation.git
cd HighStation/highstation

# 2. 의존성 설치
npm install

# 3. Agent 생성 (최초 1회)
npx ts-node scripts/create-agent.ts

# 4. Gated API 호출 (외상 결제 체험)
npx ts-node scripts/run-agent.ts
```

**출력 예시**:
```
✅ Service: Demo Echo API
✅ Status: 200 OK (Optimistic Payment)
💰 Debt: 100000000000000 wei (0.0001 CRO)
```

### 4️⃣ 작동 원리
```
AI Agent (Grade A) → API Call → ✅ 200 OK (외상 승인)
                   → Debt += 0.1 CRO
... 50번 호출 ...
                   → Debt >= $5 → 🔔 402 Payment Required
                   → Auto Settlement (on-chain) → Debt = 0
```

---

## 🎯 핵심 기능

### 평판 기반 신용 등급 (A-F)
온체인 평판 점수로 자동 등급 부여:

| 등급 | 평판 점수 (USD) | 외상 한도 | 플랫폼 수수료 (v1.6.1) | 정책 |
|------|----------------|----------|---------------------|------|
| **A** | $250+ | $5 | **2%** (VIP 우대) | 외상 OK, 먼저 쓰고 나중에 결제 |
| **B** | $150+ | $3 | **3%** | 외상 OK |
| **C** | $100+ | $1 | **4%** | 소액 외상 허용 |
| **D** | $50+ | $0.5 | **5%** | 소액 외상 허용 |
| **E** | $10+ | $0.1 | **6%** | 소액 외상 허용 |
| **F** | $0-9 | $0 | **8%** (Highest) | 선결제 필수 |

**💡 v1.6.1 신규**: 등급이 높을수록 낮은 수수료! 평판 관리 인센티브 제공

### X402 Protocol (Autonomous Settlement)
HTTP `402 Payment Required`를 활용한 **자동 정산**:

```http
HTTP/1.1 402 Payment Required
WWW-Authenticate: Token receiver="0x...", amount="500000000000000000", chainId="240"
```

→ Agent가 자동으로 트랜잭션 생성 → 재시도 → 성공 ✅

### Optimistic Payment
신용 좋은 에이전트는 **먼저 사용 → 나중에 정산**:
- 한도의 80% 도달 → 경고
- 한도의 100% 도달 → 강제 정산
- 정산 완료 → 한도 복구

### 🆕 선예치금 시스템 (v1.6.0)
**Grade F 에이전트도 즉시 사용 가능!**

**문제**: Grade F는 매 호출마다 온체인 결제 필요 → 3~5초 지연 + 높은 가스비

**해결**: 미리 충전 → 즉시 사용
```bash
# 1. 예치금 입금 (on-chain)
# PaymentHandler에 CRO 전송

# 2. API로 등록
curl -X POST https://highstation.vercel.app/api/deposit \
  -H "X-Agent-ID: 0xYourWallet" \
  -H "X-Tx-Hash: 0xYourTransactionHash"

# 3. 이제 즉시 호출 가능! (402 없음)
npx ts-node scripts/run-agent.ts
```

**동작 방식**:
```
잔액 있음? → 즉시 승인 ✅ (0ms, 가스비 없음)
잔액 부족? → 외상 체크 → 402 선결제
```

**동적 평판**: 입금·결제 행동으로 등급 자동 변경
- 입금 100 CRO → Grade E
- 입금 250 CRO → Grade A (외상 $5)

---

## 📚 문서

### 필수 읽을거리
- [**설계 철학 (Why?)**](./docs/DESIGN_PHILOSOPHY_KR.md) - 왜 외상 결제인가?
- [**프로젝트 히스토리**](./docs/PROJECT_HISTORY_KR.md) - 개발 과정 & 로드맵
- [**보안 감사 리포트**](./docs/security/) - Red Team 전면 감사 완료

### 개발자 가이드
- [AI 에이전트 연동](./docs/guides/AGENT_INTEGRATION_GUIDE_KR.md) - Python/Node.js SDK
- [Agent CLI Simulator](./docs/guides/AGENT_CLI_GUIDE_KR.md) - 터미널에서 테스트
- [Provider 가이드](./docs/guides/PROVIDER_GUIDE_KR.md) - API 공급자용
- [배포 가이드](./DEPLOYMENT_GUIDE_KR.md) - Vercel + Supabase

---

## 🏗️ 기술 스택

**Backend**: Node.js, Express, TypeScript  
**Database**: Supabase (PostgreSQL + RLS)  
**Blockchain**: Cronos zkEVM Testnet (Viem)  
**Frontend**: React, Vite, Supabase Auth (GitHub OAuth)  
**Deployment**: Vercel (Serverless Functions)  

---

## 🛠️ 로컬 개발 (For Developers)

프로젝트에 기여하거나 로컬에서 실행하려면:

<details>
<summary><strong>📖 개발 환경 설정 가이드 (클릭)</strong></summary>

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
# Supabase SQL Editor에서 schema.sql 실행
# 또는 로컬에서 seed:
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

## 🔒 보안

- ✅ **Red Team 전면 감사 완료** (v3.7)
- ✅ **15+ 취약점 수정** (SSRF, Replay Attack, CSRF 등)
- ✅ **Database RLS** + Nonce 기반 Replay 방어
- ✅ **Helmet.js CSP** 적용

**Security Score**: 10/10

---

## 📊 프로덕션 배포

현재 **Vercel + Supabase**에 실제 배포 중:
- **Backend API**: Vercel Serverless Functions
- **Frontend Dashboard**: Vercel Static Hosting
- **Database**: Supabase Production (PostgreSQL)
- **Blockchain**: Cronos zkEVM Testnet

---

## 🤝 기여

Issues와 Pull Requests를 환영합니다!

---

© 2026 HighStation Team | Built for the Agentic Future
