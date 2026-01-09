# 🤖 HighStation 에이전트 시뮬레이터 (Interactive CLI)

**"에이전트 자동 결제(Agentic Payment)"**를 체험할 수 있는 대화형 콘솔 도구입니다.

## ✨ 주요 기능
- **대화형 메뉴**: 복잡한 명령어 없이 숫자 키(1, 2, 3...)로 에이전트를 제어합니다.
- **글로벌 지갑**: 지갑 파일이 내 컴퓨터(`Home Directory`)에 안전하게 저장되어, 어느 폴더에서나 동일한 ID를 사용할 수 있습니다.
- **원격 접속**: 내가 만든 서버뿐만 아니라, 다른 사람의 서버(Vercel 등)에도 접속해 테스트할 수 있습니다.

---

## 🚀 빠르고 간편하게 시작하기

현재는 보안 라이브러리(`viem`) 설치를 위해 프로젝트 폴더가 필요합니다.
(추후 `npx highstation-cli` 명령어로 설치 없이 실행하는 기능이 출시될 예정입니다.)

### 1단계: 설치 (최초 1회)
```bash
git clone https://github.com/JAYW0RLD/HighStation.git
cd HighStation
npm install
```

### 2단계: 에이전트 생성
나만의 에이전트 지갑을 생성합니다. (내 컴퓨터 홈 폴더에 저장됨)
```bash
npx ts-node scripts/create-agent.ts
```

### 3단계: 시뮬레이터 실행!
테스트하고 싶은 **서버 주소**를 뒤에 붙여서 실행하세요.

```bash
# 예시
npx ts-node scripts/run-agent.ts https://highstation-demo.vercel.app
```

---

## 🎮 조작 방법

시뮬레이터가 실행되면 대시보드가 나타납니다.

```text
   HighStation Agent Simulator v2.0

⚡ AGENT PROFILE
   ID:      0xaEE2...8462
   Balance: 12.5 CRO
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
**Q: 다운로드 없이 실행할 수는 없나요?**
A: 암호화폐 서명 기능(`viem`) 때문에 현재는 최소한의 설치가 필요합니다. 향후 **npm 패키지**로 배포되면 다운로드 없이 `npx` 한 줄로 실행할 수 있습니다.

**Q: 지갑 파일은 어디에 있나요?**
A: 사용자 홈 디렉토리(`~/.highstation-agent-wallet.json`)에 저장됩니다. 프로젝트 폴더를 지워도 지갑은 유지됩니다.
