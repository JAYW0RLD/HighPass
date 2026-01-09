# 🤖 HighStation Agent Simulator (Demo)

HighStation의 핵심 기능인 **"에이전트 자동 결제(Agentic Payment)"**를 직접 체험할 수 있는 시뮬레이터입니다.
터미널에서 나만의 에이전트를 생성하고, 실제 지갑을 통해 Gatekeeper API를 호출하는 과정을 경험해 보세요.

## ✨ 주요 기능
- **CLI 에이전트 생성**: 암호화폐 지갑(Private Key)을 자동으로 생성하고 안전하게 로컬에 저장합니다.
- **자동 서명 및 인증**: 에이전트가 스스로 타임스탬프와 Nonce를 생성하고 서명(ECDSA)하여 API를 호출합니다.
- **후불 결제(Optimistic Payment)**: 신용도가 낮은 신규 에이전트도 데모 서비스를 통해 "선사용 후결제" 로직을 체험할 수 있습니다.

---

## 🚀 시작하기

이 데모는 로컬 개발 환경에서 작동합니다. 터미널을 열고 다음 순서를 따라주세요.

### 1. 서버 실행 (필수)
최신 코드가 반영된 서버가 실행 중이어야 합니다.
```bash
npm run dev
```

### 2. 에이전트 생성 (Wallet)
새로운 에이전트 지갑을 생성합니다.
```bash
npx ts-node scripts/create-agent.ts
```
- **결과**: `scripts/agent-wallet.json` 파일이 생성됩니다.
- **확인**: 터미널에 출력된 `0x...` 주소가 당신의 에이전트 주소입니다.

### 3. 에이전트 실행 (Action)
에이전트에게 "API를 호출해!"라고 명령을 내립니다.
```bash
npx ts-node scripts/run-agent.ts
```
- **동작**: 에이전트가 지갑을 불러와 서명 헤더를 생성하고, `Echo Service`를 호출합니다.
- **성공 시**:
  ```
  ✅ ACCESS GRANTED
  Data Received: { ... }
  💳 NOTE: Optimistic Payment Mode (Pay later!)
  ```

---

## 💡 참고 사항
- **데모 모드**: 현재 데이터베이스 연결이 없어도 동작하도록 `echo-service`는 정적 설정(Static Fallback)이 되어 있습니다.
- **보안**: 생성된 지갑 파일(`agent-wallet.json`)은 `.gitignore`에 추가되어 깃허브에 올라가지 않습니다.
- **결제**: 실제 메인넷 연결 시에는 해당 지갑에 토큰(CRO)이 있어야 가스비와 비용을 지불할 수 있습니다. (데모는 무료/가스리스 환경을 가정)
