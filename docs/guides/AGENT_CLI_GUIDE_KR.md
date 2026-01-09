# 🤖 HighStation 에이전트 시뮬레이터 (Interactive CLI)

**"에이전트 자동 결제(Agentic Payment)"**를 체험할 수 있는 대화형 콘솔 도구입니다.

## 🚀 시작하기

```bash
cd highstation
npm install
npx ts-node scripts/create-agent.ts
npx ts-node scripts/run-agent.ts
```

### 🎯 서버 주소(Target URL) 입력 가이드

에이전트 시뮬레이터는 **두 가지 형태**의 주소를 모두 지원합니다.

**1. 기본 주소 (Base URL)**
*   입력 예시: `https://my-project.vercel.app`
*   동작: 자동으로 `.../gatekeeper/echo-service/resource` (기본 데모)를 호출합니다.
*   *처음 실행하는 분들에게 추천합니다.*

**2. 전체 주소 (Full Endpoint)**
*   입력 예시: `https://my-project.vercel.app/gatekeeper/custom-service/resource`
*   동작: 입력한 주소 **그대로** 호출합니다.
*   *대시보드에서 복사한 특정 API를 테스트할 때 사용하세요.*

---

## 🎮 조작 방법

```text
  HighStation Agent Simulator v2.4

⚡ AGENT PROFILE
   ID:      0x123...abc
   Grade:   Unknown (요청 시 갱신됨)
   Balance: 0 CRO
   Target:  https://my-project.vercel.app
```

```text
COMMANDS:
  [1] 💰 Check Wallet Balance
  [2] 📡 Send API Request      (핵심!) -- 등급(Grade) 확인 가능
  [3] ⚙️  Set Target URL        (주소 변경)
  [4] 🚰 Get Test Tokens       (가스비 받기 - Faucet)
  [5] ♻️  Reset Agent Identity  (지갑 초기화)
  [6] 🚪 Exit
```

### ✅ 결제 테스트 (Optimistic)
**`[2]`번**을 누르면 요청을 보냅니다.
*   **Grade C (신규)**: 잔액이 없어도 **"✅ ACCESS GRANTED"** (후불 승인)
*   **Grade A (우수)**: 더 높은 한도와 빠른 처리 속도 제공 (시뮬레이션)

### ❌ 404 에러가 뜬다면?
입력한 URL 뒤에 `/gatekeeper/echo-service...`가 중복으로 붙었을 수 있습니다.
대시보드에서 `.../resource`까지 포함된 Full URL을 복사했다면, 시뮬레이터가 알아서 판단하므로 걱정하지 마세요. (v2.4 업데이트)
