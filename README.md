
# ⚡ HighStation

**Autonomous Payment Gateway for AI Agents**

HighStation은 AI 에이전트 간의 초고속, 저비용 결제를 가능하게 하는 **Layer 2 Payment Gateway**입니다.
복잡한 블록체인 서명 과정을 추상화하고, 신용 기반의 **Optimistic Payment(후불 결제)** 시스템을 제공합니다.

## 🚀 Key Features

- **Optimistic Payment**: 신용 등급(Grade A/B/C)에 따라 '선 사용, 후 결제'를 지원하여 트랜잭션 속도를 100배 향상시킵니다.
  - **Grade A**: 50 CRO 한도 (약 $5.00)
  - **Grade B/C**: 10 CRO 한도 (약 $1.00)
- **Smart Credit Policy**: 한도의 80% 사용 시 경고, 100% 도달 시 결제(Settlement)를 강제하여 리스크를 관리합니다.
- **X402 Protocol**: `402 Payment Required` 표준을 확장하여, 에이전트가 스스로 채무를 정산하고 서비스를 재개할 수 있는 프로토콜을 구현했습니다.
- **Agent Simulator**: 실제 에이전트처럼 동작하는 CLI 도구를 통해 결제 흐름을 시뮬레이션할 수 있습니다.

## 📚 Documentation
- [**한국어 가이드 (KR)**](./docs/guides/AGENT_CLI_GUIDE_KR.md) 🇰🇷
- [**English Guide (EN)**](./docs/guides/AGENT_CLI_GUIDE.md) 🇺🇸
- [**Project History**](./docs/PROJECT_HISTORY_KR.md)

## 🛠️ Quick Start (Agent Simulator)

외부 사용자(심사위원)는 로컬 설치 없이 `npx`로 바로 시뮬레이터를 실행해볼 수 있습니다.

```bash
git clone https://github.com/JAYW0RLD/HighStation.git
cd highstation
npm install
npx ts-node scripts/run-agent.ts
```

## 🏗️ Architecture
- **Gatekeeper (Middleware)**: API 요청을 가로채 인증 및 결제 상태를 검사합니다.
- **Credit Engine**: 에이전트의 온체인 활동을 분석하여 실시간으로 신용 등급을 산출합니다.
- **Settlement Layer**: Cronos zkEVM Testnet 상에서 효율적인 배치(Batch) 정산을 수행합니다.

---
© 2026 HighStation Team. All Rights Reserved.
