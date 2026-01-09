# 로컬 테스트 가이드 (Anvil Fork 모드)

Anvil Fork 모드를 사용하면 Cronos zkEVM Testnet의 로컬 복사본을 실행할 수 있습니다. 이를 통해 실제 TCRO를 소비하지 않고, 더 빠른 응답 속도로 테스트할 수 있습니다.

## 사전 준비
- `anvil`이 설치되어 있다면 추가 설정이 필요 없습니다 (Foundry에 포함됨).

## 1단계: 로컬 포크 시작
새 터미널을 열고 다음을 실행하세요:
```bash
npm run test:node
```
이 명령은 `http://127.0.0.1:8545`에서 Cronos Testnet을 포크한 Anvil 인스턴스를 시작합니다.

## 2단계: 게이트키퍼 설정
시스템은 `.env.local` 파일이 존재하면 자동으로 로드하도록 설정되어 있습니다.
제공된 `.env.local`은 이미 로컬 노드를 가리키고 있습니다:
```env
RPC_URL=http://127.0.0.1:8545
CHAIN_ID=240
```

## 3단계: 서버 실행
Gatekeeper API를 재시작하세요:
```bash
npm run start
```
`[Server] Loaded local environment configuration` 메시지가 보이면 성공입니다.

## 4단계: 검증
1. 상태 확인 엔드포인트: `http://localhost:3000/health`
2. 평소대로 요청을 수행하세요. 이제 Gatekeeper는 공용 RPC 대신 로컬 Anvil 노드와 통신합니다.

## 장점
- **속도:** 로컬 RPC 호출은 거의 즉각적입니다.
- **비용:** TCRO가 전혀 소비되지 않습니다.
- **상태:** 테스트넷의 모든 기존 컨트랙트를 로컬 포크에서도 그대로 사용할 수 있습니다.
