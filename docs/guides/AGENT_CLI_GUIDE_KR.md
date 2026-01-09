# 🤖 HighStation 에이전트 시뮬레이터 (Demo)

HighStation의 핵심 기능인 **"에이전트 자동 결제(Agentic Payment)"**를 직접 체험할 수 있는 시뮬레이터입니다.
터미널에서 나만의 에이전트를 생성하고, 실제 지갑을 통해 Gatekeeper API를 호출하는 과정을 경험해 보세요.

## ✨ 주요 기능
- **CLI 에이전트 생성**: 암호화폐 지갑(Private Key)을 자동으로 생성하고 안전하게 로컬에 저장합니다.
- **자동 서명 및 인증**: 에이전트가 스스로 타임스탬프와 Nonce를 생성하고 서명(ECDSA)하여 API를 호출합니다.
- **후불 결제(Optimistic Payment)**: 신용도가 낮은 신규 에이전트도 데모 서비스를 통해 "선사용 후결제" 로직을 체험할 수 있습니다.

---

## 🚀 사용 가이드 (3단계)

이 데모는 로컬 개발 환경(`localhost`) 또는 **원격 배포 서버**(`Vercel`) 어디서든 작동합니다.

### 1단계: 서버 실행 (로컬 테스트 시)
내 컴퓨터에서 서버를 돌리는 경우에만 필요합니다. 원격 서버를 테스트한다면 생략하세요.
```bash
npm run dev
```

### 2단계: 에이전트 생성 (Wallet)
최초 1회 실행하여 나만의 에이전트 지갑을 만듭니다.
```bash
npx ts-node scripts/create-agent.ts
```
- **결과**: `scripts/agent-wallet.json` 파일이 생성됩니다.
- **팁**: 실제 메인넷 테스트 시에는 출력된 주소로 토큰(CRO)을 입금해야 합니다.

### 3단계: 에이전트 실행 (Action)
에이전트에게 **API 호출**을 명령합니다.

**옵션 A: 로컬 호스트 테스트 (기본값)**
```bash
npx ts-node scripts/run-agent.ts
```
> 기본적으로 `http://localhost:3000`으로 요청을 보냅니다.

**옵션 B: 원격 서버 테스트 (다른 컴퓨터 / Vercel)** ⭐️
이미 배포된 서버(예: Vercel)를 대상으로 테스트하려면 **URL을 뒤에 붙여주세요.**
```bash
npx ts-node scripts/run-agent.ts https://my-highstation-demo.vercel.app
```
> **외부 사용자**는 이 명령어를 사용하면 설치 없이도 배포된 서비스를 즉시 테스트할 수 있습니다.

---

## ✅ 실행 결과 예시
```
🤖 AGENT AI ACTIVATED
===============================
➤ Identity Loaded 0xaEE2...8462
➤ Target Acquired https://highstation-demo.vercel.app/gatekeeper/echo-service/resource
➤ Generating Proof Nonce: 812931
➤ Signing Request 0xc69f...4b20...

📡 Transmitting data to Gatekeeper...

✅ ACCESS GRANTED (124ms)
-------------------------------
Data Received: { service: 'Demo Echo', ... }

💳 NOTE: Optimistic Payment Mode
   Your reputation allowed you to pay later (Debt recorded).
```

---

## 💡 참고 사항
- **보안**: 생성된 지갑 파일(`agent-wallet.json`)은 `.gitignore`에 추가되어 깃허브에 올라가지 않습니다.
- **데모 모드**: `echo-service`는 DB 없이도 작동하도록 설정되어 있어, 가볍게 테스트하기 좋습니다.
