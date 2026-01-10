# 🏢 Provider Quick Start Guide

HighStation에 API를 등록하고 수익을 창출하는 방법입니다.

## 1. 대시보드 가입 (Sign Up)
*   [**HighStation Dashboard**](https://highstation-dashboard.vercel.app)에 접속합니다.
*   지갑 연결 또는 소셜 로그인으로 가입합니다.

## 2. 서비스 등록 (Register API)
두 가지 방법으로 시작할 수 있습니다.

### 방법 A: 데모 API로 체험하기 (Recommended)
1.  대시보드 메인에서 **"Deploy Demo Echo API"** 버튼을 클릭합니다.
2.  즉시 사용할 수 있는 테스트용 API(`echo-service`)가 내 계정에 생성됩니다.
3.  **My Services** 탭에서 생성된 Endpoint URL을 확인하세요.

### 방법 B: 내 API 등록하기
1.  **"Register New Service"** 버튼을 클릭합니다.
2.  정보 입력:
    *   **Name**: 서비스 이름 (예: `My Stock Forecast`)
    *   **Base URL**: 실제 API 서버 주소 (예: `https://api.myserver.com`)
    *   **Price**: 요청당 가격 (예: `0.1` CRO)
3.  **Register**를 클릭하여 등록을 완료합니다.

## 3. 보안 검증 (Security Verification) - [REQUIRED]
제공자는 반드시 **HighStation이 보낸 요청인지 검증**해야 합니다. 단순 헤더 검사는 안전하지 않습니다.

### HMAC-SHA256 서명 검증 (Node.js 예시)
`signing_secret`은 대시보드 **Manage** 메뉴에서 확인할 수 있습니다.

```javascript
const crypto = require('crypto');

// Middleware Example
const verifySignature = (req, res, next) => {
    const signatureHeader = req.headers['x-highstation-signature']; // "t=...,v1=..."
    const timestamp = req.headers['x-highstation-time'];
    const SIGNING_SECRET = 'your_signing_secret_here'; // DB/Env에서 로드

    if (!signatureHeader || !timestamp) return res.status(403).send('No Signature');

    // 1. Replay Attack 방지 (5분 이내 요청만 허용)
    if (Date.now() / 1000 - Number(timestamp) > 300) return res.status(403).send('Expired Timestamp');

    // 2. Payload 생성 (Body가 있으면 포함)
    const body = req.body ? JSON.stringify(req.body) : '';
    const payload = body ? `${timestamp}.${body}` : timestamp;

    // 3. 서명 생성 및 비교
    const expected = crypto.createHmac('sha256', SIGNING_SECRET).update(payload).digest('hex');
    const received = signatureHeader.split('v1=')[1];

    if (expected === received) {
        next(); // 검증 성공!
    } else {
        res.status(403).send('Invalid Signature');
    }
};

app.use(verifySignature);
```

## 4. 동작 확인 (Verify)
등록된 API가 정상 작동하는지 **Agent Simulator**로 테스트해 보세요.
*   [**Agent Simulator 가이드 보기**](./AGENT_CLI_GUIDE_KR.md)

---
**Tip**: 등록이 완료되면 즉시 전 세계의 AI 에이전트들이 당신의 API를 검색하고 사용할 수 있습니다! 🌍
