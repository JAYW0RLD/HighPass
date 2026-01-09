# 🤖 HighStation 에이전트 시뮬레이터 (Interactive CLI)

**"에이전트 자동 결제(Agentic Payment)"**를 체험할 수 있는 대화형 콘솔 도구입니다.
여러분의 터미널이 곧 AI 에이전트의 제어 화면이 됩니다.

## ✨ 주요 기능
- **대화형 메뉴**: 복잡한 명령어 없이 숫자 키(1, 2, 3...)로 에이전트를 제어합니다.
- **실시간 대시보드**: 지갑 주소, 잔액, 타겟 서버 상태를 한눈에 확인합니다.
- **원격 접속**: 내가 만든 서버뿐만 아니라, 다른 사람의 서버(Vercel 등)에도 접속해 테스트할 수 있습니다.

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
테스트하고 싶은 **서버 주소**를 뒤에 붙여서 실행하세요.

```bash
# 사용법: npx ts-node scripts/run-agent.ts [타겟_URL]

# 예시:
npx ts-node scripts/run-agent.ts https://highstation-demo.vercel.app
```

---

## 🎮 조작 방법

시뮬레이터가 실행되면 대시보드가 나타납니다.

```text
   HighStation Agent Simulator v2.0

⚡ AGENT PROFILE
   ID:      0xaEE2...8462
   Balance: 0.0 CRO
   Target:  https://highstation-demo.vercel.app
   Status:  ONLINE
----------------------------------------

COMMANDS:
  [1] 💰 Check Wallet Balance  (잔액 조회)
  [2] 📡 Send API Request      (요청 보내기)
  [3] ⚙️  Set Target URL        (타겟 변경)
  [4] 🚪 Exit                  (종료)
```

1.  **`[2]`번 (Send API Request)**를 눌러보세요.
2.  에이전트가 스스로 서명을 만들고 서버에 접속합니다.
3.  **"✅ ACCESS GRANTED"**가 뜨면 성공입니다! (후불 결제 모드)

---

## 💡 자주 묻는 질문
**Q: `MODULE_NOT_FOUND` 에러가 떠요.**
A: 1단계(`cd highstation`)를 수행했는지 확인하세요. `scripts` 폴더 밖에서 실행하면 안 됩니다.

**Q: 내 돈이 나가나요?**
A: 아니요. 테스트넷(Cronos Testnet) 환경이며, 기본적으로 비용이 들지 않는 'Optimistic Mode'(후불/데모)로 동작합니다.
