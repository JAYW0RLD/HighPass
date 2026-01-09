# ⚡ HighStation

**The Autonomous Payment Gateway for AI Agents**

HighStation은 AI 에이전트 간의 **초고속, 무자각(Invisible) 결제**를 가능하게 하는 Layer 2 Payment Gateway입니다.
복잡한 지갑 서명, 후불 신용 평가, 자동 정산(Auto-Settlement)을 프로토콜 레벨에서 처리하여, 에이전트가 "돈 걱정 없이" 업무에만 집중할 수 있게 합니다.

---

## 🚀 Quick Start

역할에 맞는 가이드를 따라 즉시 시작해보세요.

| 🏢 **For Providers** (API 공급자) | 🤖 **For Users** (에이전트 개발자) |
| :--- | :--- |
| **1. 대시보드 시작하기** <br> 프로바이더 포털에 가입하고 지갑을 연결합니다.<br> 👉 [**Dashboard 접속**](https://highstation-dashboard.vercel.app) | **1. 대시보드 시작하기** <br> 개발자 계정을 생성하고 API 키를 발급받습니다.<br> 👉 [**Dashboard 접속**](https://highstation-dashboard.vercel.app) |
| **2. API 등록 (내 서비스 or 데모)** <br> 클릭 한 번으로 `Demo API`를 띄우거나 내 서버를 등록합니다.<br> 📖 [**공급자 가이드 보기**](./docs/guides/PROVIDER_GUIDE_KR.md) | **2. 테스트 대상(Target) 확보** <br> 테스트를 위해 `Demo API`를 먼저 발급받아 타겟을 확보합니다.<br> 📖 [**테스트 API 발급 가이드**](./docs/guides/PROVIDER_GUIDE_KR.md#방법-a-데모-api로-체험하기-recommended) |
| **3. 내 API 호출 테스트** <br> 내 터미널에서 `Agent Simulator`로 내 API를 호출해 봅니다.<br> 💻 [**CLI 시뮬레이터 가이드**](./docs/guides/AGENT_CLI_GUIDE_KR.md) | **3. 에이전트 코드 설정** <br> Python/Node.js 봇에 HighStation 결제 모듈을 장착합니다.<br> 👩‍💻 [**코드 연동 가이드**](./docs/guides/AGENT_INTEGRATION_GUIDE_KR.md) |
| **4. 수익 창출 (Enjoy!)** <br> 전 세계 에이전트들이 당신의 API를 유료로 사용합니다. 💰 | **4. 연결 및 실행 (Enjoy!)** <br> 이제 원하는 유료 API를 자유롭게 호출하세요. 알아서 결제됩니다! 🚀 |

---

## 🏗️ Project Architecture

### 🛡️ Gatekeeper (Middleware)
API 요청을 가로채 **"선 사용, 후 결제(Optimistic Payment)"**를 처리하는 핵심 엔진입니다.
- **Credit Engine**: 에이전트의 온체인 신용도(Reputation)를 분석하여 `Grade A/B/C`를 부여합니다.
- **Smart Credit Policy**: 한도의 80% 사용 시 경고를 보내고, 100% 도달 시 정산(Settlement)을 요청합니다.

### 🔌 X402 Protocol
HTTP `402 Payment Required` 표준을 확장한 자율 정산 프로토콜입니다.
- 에이전트는 402 에러를 받으면 **즉시 블록체인 트랜잭션**을 생성하고, 영수증(TxHash)을 들고 **자동 재시도(Retry)**합니다.

### 🎮 Agent Simulator
복잡한 코딩 없이 터미널에서 바로 결제 흐름을 체험할 수 있는 CLI 도구입니다.
```bash
npx ts-node scripts/run-agent.ts
```

## 📚 Resources
- [**프로젝트 히스토리 (History)**](./docs/PROJECT_HISTORY_KR.md)
- [**English README**](./README_EN.md) (Coming Soon)

---
© 2026 HighStation Team. Built for the Agentic Future.
