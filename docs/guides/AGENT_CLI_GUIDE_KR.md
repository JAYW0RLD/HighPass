# 🤖 HighStation 에이전트 시뮬레이터 (Interactive CLI)

HighStation의 핵심 기능인 **"에이전트 자동 결제(Agentic Payment)"**를 체험할 수 있는 대화형 콘솔 도구입니다.
터미널이 곧 에이전트의 제어 화면이 됩니다.

## ✨ 주요 기능
- **대화형 메뉴**: 복잡한 명령어 없이 숫자 키(1, 2, 3...)로 에이전트를 제어합니다.
- **실시간 상태 확인**: 에이전트의 지갑 주소, 잔액, 연결 상태를 한눈에 볼 수 있습니다.
- **동적 타겟 변경**: 테스트 도중 자유롭게 타겟 서버 주소를 변경할 수 있습니다.

---

## 🚀 시작하기

**필수 조건**: 터미널의 현재 위치가 `highstation` 폴더여야 합니다.

```bash
# 위치 확인
cd highpass/highstation
```

### 1단계: 에이전트 생성 (최초 1회)
지갑이 없다면 먼저 생성해주세요.
```bash
npx ts-node scripts/create-agent.ts
```

### 2단계: 에이전트 실행
시뮬레이터를 켭니다.

**기본 모드 (로컬호스트)**
```bash
npx ts-node scripts/run-agent.ts
```

**원격 모드 (Vercel 배포 서버 등)**
```bash
# 예시
npx ts-node scripts/run-agent.ts https://my-project.vercel.app
```

---

## 🎮 조작 방법

시뮬레이터가 실행되면 아래와 같은 대시보드가 나타납니다.

```text
   ▄▄▄       ▄▄ • ▄▄▄ . ▐ ▄ ▄▄▄▄▄
   ... (ASCII ART) ...
   HighStation Agent Simulator v2.0

⚡ AGENT PROFILE
   ID:      0xaEE2...8462
   Balance: 0.0 CRO    <-- 잔액 확인 가능
   Target:  http://localhost:3000
   Status:  ONLINE
----------------------------------------

COMMANDS:
  [1] 💰 Check Wallet Balance  (잔액 조회)
  [2] 📡 Send API Request      (요청 보내기 - 핵심!)
  [3] ⚙️  Set Target URL        (서버 주소 변경)
  [4] � Exit                  (종료)
```

1.  **잔액 조회 (`1`)**: 실제 블록체인(Cronos Testnet)에 연결하여 에이전트의 잔액을 확인합니다.
2.  **요청 보내기 (`2`)**: 에이전트가 스스로 서명하고 Gatekeeper API를 호출합니다. 결제 성공 여부와 응답 데이터를 보여줍니다.
3.  **URL 변경 (`3`)**: 테스트할 서버 주소를 바꿉니다. (예: `http://localhost:3000` -> `https://...`)

---

## 💡 참고 사항
- **실패 시**: `MODULE_NOT_FOUND` 에러가 나면 반드시 `cd highstation` 명령어로 폴더를 이동했는지 확인하세요.
- **비용**: 테스트넷(Cronos Testnet)이므로 실제 돈이 들지 않습니다.
