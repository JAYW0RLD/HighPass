# 🤖 HighStation 에이전트 시뮬레이터 (Real-World Simulation)

이 도구는 **실제 블록체인 네트워크(Cronos zkEVM Testnet)**와 연동하여 동작합니다.
단순한 '가짜'가 아니라, 실제 메인넷과 **동일한 기술 환경**에서 **안전하게(무료로)** 결제 시스템을 검증하는 도구입니다.

## 🌍 "왜 테스트넷인가요?"
*   **실전과 동일**: 블록 생성 시간, 가스비(Gas Fee), 서명 알고리즘(ECDSA) 등 모든 메커니즘이 실제(Mainnet)와 100% 동일합니다.
*   **비용 "0"**: 실제 돈(CRO) 대신 무료 테스트 토큰(TCRO)을 사용하므로 실수해도 안전합니다.
*   **검증의 표준**: 블록체인 서비스는 항상 테스트넷에서 기능 검증을 마친 후 메인넷으로 배포합니다. 이 시뮬레이터가 잘 작동한다면, 메인넷에서도 즉시 작동합니다.

---

## 🚀 시작하기 (외부 사용자용)

### 1단계: 프로젝트 폴더로 이동
```bash
cd highstation
```

### 2단계: 의존성 설치 (최초 1회)
블록체인 통신 라이브러리 등을 설치합니다.
```bash
npm install
```

### 3단계: 에이전트 생성
나만의 에이전트 지갑을 생성합니다.
```bash
npx ts-node scripts/create-agent.ts
```

### 4단계: 시뮬레이터 실행!
명령어 뒤에 주소를 적지 않아도, **실행하면 물어봅니다.**

```bash
# 그냥 실행하세요!
npx ts-node scripts/run-agent.ts
```

---

## 🎮 실행 화면

시뮬레이터가 켜지면 **서버를 선택**할 수 있습니다.

```text
🌐 SELECT TARGET SERVER
  [1] Localhost (http://localhost:3000) - For Developers
  [2] Remote URL (e.g. Vercel)        - For External Testers

Select [1/2]: 2
Enter Server URL: https://highstation-demo.vercel.app
```

이제 **`[2] Send API Request`**를 눌러보세요.
여러분의 컴퓨터에서 만들어진 서명이 실제 인터넷을 타고 서버로 날아가서 검증됩니다.

---

## 💡 자주 묻는 질문
**Q: "Optimistic Mode"가 뭔가요?**
A: 여러분의 지갑에 잔액이 '0'이어도, 데모 서비스가 "신규 유저는 믿고 외상으로 처리해주는" 설정입니다. 실제 서비스에서도 초기 유입을 늘리기 위해 많이 사용하는 전략입니다.

**Q: 실제 돈으로 결제하고 싶어요.**
A: `scripts/run-agent.ts`의 RPC 설정을 메인넷으로 바꾸고, 실제 CRO를 입금하면 됩니다. 코드는 수정할 필요 없습니다.
