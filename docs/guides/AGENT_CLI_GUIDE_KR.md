# 🤖 HighStation 에이전트 시뮬레이터 (Generic Client)

**"에이전트 자동 결제(Agentic Payment)"**를 검증하기 위한 범용 API 클라이언트입니다.
등록된 모든 HighStation API 서비스를 호출하고 결제할 수 있습니다.

## 🚀 시작하기

**1단계: 서비스 주소(Endpoint) 확보**
이 시뮬레이터는 **실제 등록된 API**를 호출합니다. 테스트할 주소가 필요합니다.

1.  [Provider Portal](https://highstation-dashboard.vercel.app)에 접속합니다.
2.  **My Services** 메뉴에서 내가 등록한 서비스를 클릭합니다.
3.  **"API Endpoint"**를 복사합니다.
    *   예시: `GET https://.../gatekeeper/my-service-slug/resource`

**2단계: 시뮬레이터 실행**
```bash
cd highstation
npm install  # (최초 1회)
npx ts-node scripts/run-agent.ts
```

**3단계: 주소 입력**
실행 시 복사한 **전체 주소(Full URL)**를 붙여넣으세요.

---

## 🎮 주요 기능 (v2.5)

이제 GET 요청뿐만 아니라 **POST 요청**도 지원합니다.

```text
COMMANDS:
  [1] 💰 Check Wallet Balance
  [2] 📡 Send API Request      <-- (핵심)
  [3] ⚙️  Set Target URL
  ...
```

### 📡 API 요청 보내기 (`[2]`)
1.  **Method 선택**: `[1] GET` 또는 `[2] POST`를 선택합니다.
2.  **Body 입력**: POST 선택 시, 전송할 JSON 데이터를 입력할 수 있습니다.
    *   예: `{"query": "hello agent"}`

### 💰 결제 및 정산 (Real Payment)
HighStation에 등록된 서비스는 기본적으로 **유료**입니다.
*   **잔액 부족 시**: `402 Payment Required` 에러가 발생합니다.
*   **해결 방법**:
    1.  `[4] Faucet` 메뉴에서 무료 테스트 토큰(TCRO)을 받습니다.
    2.  잔액이 충전되면 다시 `[2] Request`를 보냅니다.
    3.  정상적으로 **결제가 완료(Settled)** 되고 데이터를 받게 됩니다.

---

## 💡 팁
**Q: 내가 등록한 서비스도 테스트 가능한가요?**
A: **네, 물론입니다.** Provider Portal에서 본인의 서비스를 등록하고, 그 Endpoint를 시뮬레이터에 넣으면 **내 서비스가 돈을 잘 받는지** 바로 검증할 수 있습니다.

**Q: 404 에러가 뜹니다.**
A: 입력한 URL이 정확한지 확인하세요. 단순히 도메인(`https://...`)만 넣으면 안 되고, `/gatekeeper/...`까지 포함된 **전체 경로**여야 합니다.
