# 🤖 HighStation 에이전트 시뮬레이터 (Interactive CLI)

**"에이전트 자동 결제(Agentic Payment)"**를 체험할 수 있는 대화형 콘솔 도구입니다.
여러분의 터미널이 곧 AI 에이전트의 제어 화면이 됩니다.

## ✨ 주요 기능
- **대화형 메뉴**: 복잡한 명령어 없이 숫자 키(1, 2, 3...)로 에이전트를 제어합니다.
- **실시간 대시보드**: 지갑 주소, 잔액, 타겟 서버 상태를 한눈에 확인합니다.
- **실전 검증**: 실제 블록체인(Cronos Testnet)과 연동되어 동작합니다.

---

## 🚀 시작하기 (외부 사용자용)

이 가이드는 GitHub에서 프로젝트를 다운로드 받은 후, **외부 서버(Vercel 등)**를 테스트하는 상황을 가정합니다.

### 1단계: 프로젝트 폴더로 이동 (중요!)
스크립트를 실행하려면 반드시 `highstation` 폴더 안에 있어야 합니다.
(이 단계를 건너뛰면 `MODULE_NOT_FOUND` 에러가 발생합니다)

```bash
cd highstation
```

### 2단계: 의존성 설치
스크립트 실행에 필요한 도구를 설치합니다. (최초 1회)
```bash
npm install
```

### 3단계: 에이전트 생성 (지갑)
나만의 에이전트 지갑을 생성합니다.
```bash
npx ts-node scripts/create-agent.ts
```

### 4단계: 시뮬레이터 실행!
**테스트할 서버 주소(URL)**를 준비하세요.

```bash
# 그냥 실행하면 URL을 입력하는 화면이 나옵니다.
npx ts-node scripts/run-agent.ts

# 또는 실행할 때 URL을 바로 입력해도 됩니다.
npx ts-node scripts/run-agent.ts https://highstation-demo.vercel.app
```

---

## 🎮 조작 방법

```text
COMMANDS:
  [1] 💰 Check Wallet Balance  (잔액 조회)
  [2] 📡 Send API Request      (요청 보내기)
  [3] ⚙️  Set Target URL        (타겟 변경)
  [4] 🚰 Get Test Tokens       (가스비 받기 - Faucet)
  [5] ♻️  Reset Agent Identity  (지갑 초기화)
  [6] 🚪 Exit                  (종료)
```

### 주요 시나리오

**A. 돈 없이 사용하기 (Optimistic Payment)**
1.  **`[2]`번 (요청 보내기)**를 누릅니다.
2.  잔액이 0이어도 **"✅ ACCESS GRANTED"**가 뜨며 데이터가 수신됩니다.
3.  *이것은 신규 유저를 위한 '후불 결제' 모드입니다.*

**B. 실제 돈 내고 사용하기 (Real Payment)**
1.  **`[4]`번 (가스비 받기)**를 눌러 Faucet 사이트로 이동합니다.
2.  내 에이전트 주소로 무료 테스트 토큰(TCRO)을 받습니다.
3.  **`[1]`번 (잔액 조회)**로 입금을 확인합니다.
4.  이제 요청을 보내면, **실제 블록체인 트랜잭션**이 발생하고 결제가 완료됩니다.

---

## 💡 자주 묻는 질문
**Q: `MODULE_NOT_FOUND` 에러가 떠요.**
A: 1단계(`cd highstation`)를 수행했는지 확인하세요. `scripts` 폴더 밖에서 실행하면 안 됩니다.

**Q: 내 돈이 나가나요?**
A: 아니요. 테스트넷(Cronos Testnet) 환경이므로 실제 금전적 비용은 없습니다.
