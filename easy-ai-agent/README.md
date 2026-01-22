# 🤖 Easy AI Agent: HighStation Protocol 시연 도구

이 도구는 HighStation 플랫폼의 **신뢰 레이어(Trust Layer)**를 가장 쉽고 빠르게 체험해 볼 수 있는 CLI 에이전트입니다. 복잡한 MCP 설정 없이도 암호학적으로 검증된 데이터를 주고받는 과정을 실시간으로 확인할 수 있습니다.

## ✨ 주요 기능
- **자동 지갑 생성**: 임시 에피머럴 지갑을 생성하여 즉시 테스트 가능.
- **MCP 서비스 탐색**: HighStation에 등록된 다양한 AI 도구들을 자동으로 탐색.
- **x402 결제 시연**: 요청 시 필요한 테스트넷 USDC.e 결제 및 서명 과정을 단계별로 노출.
- **신뢰성 확인**: 서버가 응답한 데이터와 함께 제공되는 ZK(영지식 증명) 및 OpenSeal 검증 결과를 시연.

## 🚀 시작하기

### 1. 사전 준비
- **Node.js**: v18 이상이 설치되어 있어야 합니다.
- **Testnet Funds**: 테스트 결제를 위해 Cronos Testnet의 USDC.e가 필요합니다. 
  - [Cronos Faucet](https://faucet.cronos.org/)에서 지갑 주소로 'USDC'를 받으세요.

### 2. 설치 및 실행
```bash
# 의존성 설치
npm install

# 에이전트 실행
npm start
```

## 🛠️ 설정 (Optional)
`.env` 파일을 생성하여 아래 설정을 커스텀할 수 있습니다:
- `API_BASE_URL`: HighStation 게이트웨이 주소 (기본값: http://localhost:3000)
- `AGENT_PRIVATE_KEY`: 기존 지갑을 사용하려는 경우 개인키 입력.

---
**주의**: 이 도구는 시연 및 학습 목적으로 제작되었습니다. 실제 운영 환경에서는 보안이 강화된 에이전트 지갑 또는 SDK 연동을 권장합니다.
