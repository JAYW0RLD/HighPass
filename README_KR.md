# HighStation - 초간단 실행 가이드 🚀

이 가이드는 로컬 환경에서 **HighStation**을 빠르고 쉽게 실행하고 테스트하는 방법을 설명합니다.

## 1. 준비 사항
*   터미널 창 2개가 필요합니다.
*   **Node.js**가 설치되어 있어야 합니다.

## 2. 설치 (최초 1회)
프로젝트 폴더에서 다음 명령어로 라이브러리를 설치하세요.
```bash
npm install
```

## 3. 실행 방법

### 단계 1: 가짜 블록체인 실행 (터미널 1)
실제 Cronos 테스트넷을 복제한 로컬 블록체인을 실행합니다. 돈(Token)이 무제한입니다!
```bash
npm run test:node
```
*   *주의: 이 터미널은 끄지 말고 켜두세요.*

### 단계 2: 게이트키퍼 서버 실행 (터미널 2)
새로운 터미널을 열고 서버를 시작합니다.
```bash
npm run build && npm run start
```
*   `[Server] Loaded local environment configuration` 메시지가 나오면 성공입니다.

## 4. 테스트 해보기 (데모)

이 시스템에는 테스트를 위해 미리 설정된 3명의 에이전트가 있습니다.

| 에이전트 ID | 등급 | 특징 | 예상 결과 |
| :--- | :--- | :--- | :--- |
| `prime-agent` | **A** (최우수) | 외상 거래 가능 | **200 OK** (즉시 승인) |
| `subprime-agent` | **C** (보통) | 선결제 필수 | **402 Payment Required** |
| `risky-agent` | **F** (위험) | 접근 금지 | **403 Forbidden** |

### 테스트 명령어 (터미널 2에서 입력)

**1. 신용 좋은 에이전트 (A등급)**
```bash
curl -s -H "X-Agent-ID: prime-agent" http://localhost:3000/gatekeeper/resource
```
> 결과: `Access Granted` (성공)

**2. 신용 보통 에이전트 (C등급)**
```bash
curl -s -v -H "X-Agent-ID: subprime-agent" http://localhost:3000/gatekeeper/resource
```
> 결과: `402 Payment Required` (결제 필요)

**3. 위험 에이전트 (F등급)**
```bash
curl -s -H "X-Agent-ID: risky-agent" http://localhost:3000/gatekeeper/resource
```
> 결과: `403 Forbidden` (차단됨)

## 5. 대시보드 확인
웹 브라우저에서 아래 주소로 접속하면 실시간 로그를 볼 수 있습니다.
👉 [http://localhost:3000](http://localhost:3000)

### 🚀 AI Agent & MCP Support (New!)
HighStation은 단순한 API 마켓이 아닌, **AI 에이전트를 위한 경제 인프라**입니다.

*   **Official X402 Client**: `@crypto.com/facilitator-client`를 통한 표준화된 결제 검증
*   **AI Agent Demo**: 자연어로 API를 검색하고 구매하는 `cdc-agent-demo` (Crypto.com AI Agent SDK 기반)
*   **MCP Server**: Claude 등 LLM이 HighStation 마켓 데이터를 직접 조회할 수 있는 [Model Context Protocol](https://modelcontextprotocol.io) 서버 내장

```bash
# MCP 서버 실행 (Stdio 모드)
npx ts-node src/mcp-server.ts
```


---
**팁:** 테스트를 초기화하고 싶다면 서버를 끄고(`Ctrl+C`), `dist/gatekeeper.db` 파일을 지운 뒤 다시 시작하세요.
