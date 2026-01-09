# 📜 프로젝트 히스토리 & 로드맵 (Project History & Roadmap)

이 문서는 프로젝트의 진화 과정, 현재 아키텍처 상태, 그리고 향후 마일스톤에 대한 기록입니다.

---

## 🏗️ 현재 아키텍처: v2.0 (멀티 프로바이더 플랫폼)
**출시일:** 2026년 1월

이 프로젝트는 단일 테넌트 게이트키퍼에서 **역할 기반 접근 제어(RBAC)**를 갖춘 다중 API 서비스를 호스팅할 수 있는 **멀티 프로바이더 플랫폼**으로 진화했습니다.

### 주요 기능
- **데이터베이스**: 확장성과 실시간 기능을 위해 로컬 SQLite를 PostgreSQL (Supabase)로 교체했습니다.
- **인증 및 RBAC**: `Admin` (슈퍼유저)과 `Provider` (서비스 소유자)를 구별하는 Supabase Auth 통합.
- **동적 라우팅**: 미들웨어가 `/gatekeeper/:serviceSlug/resource` 요청을 DB에 등록된 서비스로 동적 연결합니다.
- **셀프 서비스 포털**: 프로바이더가 직접 API를 등록하고, 가격(Wei)을 설정하며, 최소 신용 등급을 정의할 수 있습니다.

### 기술 스택
- **백엔드**: Node.js, Express, `viem` (블록체인), `@supabase/supabase-js`.
- **프론트엔드**: React (Vite), `react-router-dom`, Supabase Auth UI.
- **인프라**: Cronos zkEVM Testnet, Supabase (DB/Auth/Realtime).

---

## ⏳ 변경 기록 (Changelog)


### v3.0 - Hackathon Edition (Official SDK & AI)
**일자**: 2026-01-09
- **[기능] 공식 X402 표준 통합**:
    - **@crypto.com/facilitator-client**: 기존 수동 X402 로직을 폐기하고 크로노스 랩스의 공식 SDK로 전면 교체.
    - **EIP-191 표준화**: 커스텀 서명 방식에서 표준 이더리움 서명 방식으로 전환하여 호환성 확보.
- **[기능] AI 스마트 에이전트**:
    - **@crypto.com/ai-agent-client**: 자연어 명령을 이해하고 시장을 검색/구매하는 `scripts/cdc-agent-demo.ts` 구현.
    - **Agent Economy**: "TTS API 찾아줘" -> 검색 -> 결제 -> 실행의 전 과정을 AI가 수행하는 데모 완성.
- **[기능] MCP (Model Context Protocol) 서버**:
    - **src/mcp-server.ts**: Claude, Cursor 등 외부 AI가 HighStation의 API 마켓 데이터를 직접 조회할 수 있는 표준 인터페이스 제공.
    - `services://list` 리소스 및 `search_services` 도구 노출.

### v2.9.0 - 에이전트 결제 시뮬레이터 (New)

**일자**: 2026-01-09
- **[기능] CLI 시뮬레이터**:
    - `scripts/create-agent.ts` 및 `scripts/run-agent.ts`를 구현하여 종단간(End-to-End) 에이전트 시뮬레이션 지원.
    - 지갑 생성, 서명, 후불 결제(Optimistic Payment) 흐름을 수동으로 검증 가능.
- **[테스트] 통합 테스트**: 후불 결제 및 보안 거절 시나리오를 커버하는 `test/integration/payment-flow.test.ts` 추가.
- **[수정] 데모 모드**: 로컬 테스트 편의를 위해 DB 없이 작동하는 `echo-service` 폴백(Fallback) 기능 검증 완료.

### v2.8 - 보안 및 아키텍처 강화 (레드팀 감사)
- **[보안] SSRF 방어 (DNS Pinning)**:
    - 도메인 검증 시점과 사용 시점의 차이(TOCTOU)를 이용한 취약점 수정.
    - DNS Rebinding 공격을 방지하기 위해 요청 전 IP 주소를 고정(Pinning)하는 사용자 정의 DNS 해석 구현.
- **[보안] 인증 우회 수정**:
    - URL 스푸핑 가능성이 있던 불안정한 "내부 데모 서비스" 확인 로직 제거.
    - 모든 서비스에 대해 DB 기반의 엄격한 검증 상태 확인 강제.
- **[보안] 원자적 리플레이 방지**:
    - 동시 요청 시 Nonce 확인을 우회할 수 있던 `creditGuard`의 경쟁 상태(Race Condition) 수정.
    - DB의 고유 제약 조건(Unique Constraint)을 활용하여 원자적인 Nonce 검증 구현.
- **[보안] 세션 강화 (CSP)**:
    - Helmet을 사용한 엄격한 **콘텐츠 보안 정책(CSP)** 적용.
    - 스크립트 소스를 `'self'` 및 신뢰된 도메인(Supabase)으로 제한하여 LocalStorage 토큰 탈취 XSS 위험 완화.
- **[감사] Vercel/Supabase 아키텍처 리뷰**:
    - ORM 사용 시 SQL 인젝션 벡터 부재 및 커넥션 풀링 안전성 확인.
    - 포괄적인 취약점 보고서(`vulnerability_report.md`) 발행.

### v2.8.2 - 견고한 데모 및 테스트 API (Hotfix)
- **[수정] 데모 서비스 로직**:
    - `serviceResolver`의 "내부 데모" 확인 로직을 개선하여 `localhost`, `127.0.0.1`, `*.vercel.app` 도메인을 안정적으로 처리.
    - Vercel 배포 시 기본 데모 서비스에서 발생하던 "Service Not Verified" 오류 해결.
- **[수정] 소유자 우회 안정성**:
    - 토큰 검증 중 런타임 오류를 방지하기 위해 미들웨어 내 Supabase 클라이언트 초기화 로직 리팩토링.

### v2.8.1 - 테스트 API 및 소유자 우회 수정
- **[수정] 테스트 API 403 오류**:
    - `serviceResolver` 미들웨어에 안전한 **소유자 우회(Owner Bypass)** 구현.
    - 서비스 프로바이더는 "검증 대기 중" 상태라도 대시보드에서 자신의 서비스를 테스트 가능.
    - JWT 검증(`x-provider-token`)을 통해 실제 소유자만 우회할 수 있도록 보장.
- **[수정] 데모 서비스 URL**:
    - `VITE_API_ORIGIN` (Vercel)을 신뢰할 수 있는 내부 소스로 인식하도록 "내부 데모" 확인 로직 완화.

### v2.7.1 - 신원 및 UX 개선 (Hotfix)
- **[인증] GitHub 단독 로그인**:
    - 스팸 계정 방지를 위해 이메일/비밀번호 인증 제거.
    - "Sign in with GitHub"을 유일한 로그인 수단으로 구현.
- **[UX] 포털 스위처**:
    - 헤더에 YouTube Studio 스타일의 "뷰 전환(Switch View)" 드롭다운 추가.
    - "Provider Portal" (API 판매)과 "Developer Portal" (API 구매/신원) 간 원활한 전환.
- **[수정] 개발자 온보딩**:
    - **자동 감지**: Developer Portal 접속 시 세션 메타데이터에서 GitHub 사용자명을 자동 감지.
    - **누락 테이블**: `developers` 및 `wallets` 테이블 누락 문제를 해결하기 위해 `migrations/004_add_developers.sql` 생성.

### v2.7 - 데이터 기반 및 확장된 텔레메트리
- **[기능] 성능 텔레메트리**:
    - **지연 시간 프로파일링**: API 응답 시간을 밀리초 단위로 추적 (`latency_ms`).
    - **응답 크기**: 응답 페이로드 크기 자동 캡처 (`response_size_bytes`).
- **[기능] 데이터 품질 및 무결성**:
    - **성공 무결성**: "가짜 200 OK"를 필터링하기 위한 응답 본문 형식 검증 (`integrity_check`).
    - **콘텐츠 타입 분류**: 데이터 형식 추적 (`content_type`).
- **[전략] 에이전트 경제 준비**:
    - 향후 "서비스 품질(QoS)" 랭킹 알고리즘을 위한 인프라 구축.
- **[DB] 스키마 업데이트**: `requests` 테이블에 텔레메트리 컬럼 추가 (마이그레이션 003).

### v2.6 - 개발자 포털 및 최적화 (최신)
- **[기능] 개발자 포털**:
    - 신원 및 지갑 관리를 위한 `/developer` 포털 런칭.
    - 안전한 프로필 생성을 위한 Supabase Auth 통합.
    - 평판 등급 및 부채 한도(Debt Limit) 시각적 추적.
- **[기능] 신뢰 시드(Trust Seed) 설정**:
    - 프로바이더가 신규 사용자에 대한 "Optimistic Access" 여부 토글 가능.
    - 설정 가능한 "초기 부채 한도(USD)"로 온보딩 가속화.
- **[최적화] 스마트 접근 제어**:
    - `AccessControlEngine`이 이제 실시간 USD-to-Wei 부채 확인 수행.
    - 통합 가격 로직을 위해 2% 슬리피지 보호가 포함된 `FeeSettlementEngine` 통합.
- **[수정] 스키마 및 타입**:
    - `developers` 테이블에 `user_id` 연결 추가.
    - 스택 전반에 걸쳐 부채/수수료 단위 변환 표준화.
- **[품질] 시스템 무결성**:
    - **100% 테스트 커버리지**: 모든 백엔드 유닛 테스트 실패 해결 (Identity, DB, Payment).
    - **모킹 전략**: 네트워크 의존성 없는 결정론적 테스트를 위해 상태 유지(Stateful) Supabase 모의 객체 구현.
    - **입력 검증**: 잘못된 에이전트 ID 및 임계값에 대해 `IdentityService` 강화.

### v2.5 - 가스 포함 수수료 엔진 및 부채 집계
- **[중요 변경] 스마트 컨트랙트 업그레이드 - 동적 수수료 시스템**:
    - `PaymentHandler.pay()`가 `platformFee` 파라미터를 받도록 수정 (기존 1% 하드코딩).
    - 모든 수수료 계산을 오프체인으로 이동 (계산 가스 비용 0).
    - 온체인 컨트랙트는 검증 및 저장만 수행 (최소 ~50k 가스).
    - 백엔드가 해킹되더라도 과도한 수수료를 막기 위한 20% 안전 캡(Safety Cap) 적용.
- **[기능] 가스 포함 수수료 계산기**:
    - **공식**: `platformFee = estimatedGas + (netProfit × marginRate)`
    - 마진은 총 결제액이 아닌 순이익(결제액 - 가스비)에 대해 계산.
    - 등급별 마진율: A=0.2%, B=0.3%, C=0.5%, D=0.75%, E/F=1%.
    - 과소평가를 방지하기 위해 가스 추정치에 20% 안전 버퍼 적용.
    - 플랫폼은 절대 손해를 보지 않음 (가스비 항상 커버 + 마진).
- **[최적화] 부채 집계 및 일괄 정산**:
    - **A등급**: $5.00 CRO 부채 임계값 (최대 500회 호출 일괄 처리, 90% 가스 절감).
    - **B-C등급**: $1.00 CRO 부채 임계값 (최대 100회 호출 일괄 처리).
    - **D-E-F등급**: $0 임계값 (즉시 결제, 신용 없음).
    - 임계값 도달 시에만 정산 트리거 → 막대한 가스 절감.
    - 예: 10회 API 호출 = 10회 가스비 대신 1회 가스비 (90% 감소).
- **[API] 수동 정산(Flush) 엔드포인트**:
    - `POST /api/flush` (헤더: `X-Agent-ID`).
    - 프로바이더/에이전트가 임계값 전이라도 정산을 강제할 수 있음.
    - 사용 사례: 부채 수준과 관계없이 즉시 정산을 원하는 경우.
- **[문서] README 정리**:
    - `.gitignore`에서 PROJECT_HISTORY.md 제거 (투명성).
    - README를 214줄에서 ~110줄로 간소화.
    - 상세 기술 정보는 PROJECT_HISTORY.md로 이동.
    - 모든 참조를 새로운 동적 수수료 시스템에 맞춰 업데이트.

- **[리브랜딩] HighStation**: 프로젝트 명칭을 "X402 Gatekeeper"에서 **HighStation**으로 전면 변경.
    - 모든 문서, UI 컴포넌트, 브랜딩 자산 업데이트.
    - 새로운 아이덴티티: "HighStation - 차세대 에이전트 결제 게이트웨이"
    - GitHub 저장소명을 `JAYW0RLD/HighStation`으로 변경.
- **[보안] 프로바이더 테스트 모드 - JWT 검증**:
    - Supabase JWT 인증을 사용하여 프로바이더를 위한 안전한 무료 테스트 기능 구현.
    - 클라이언트 헤더를 신뢰하는 대신 `x-provider-token`을 검증하여 헤더 스푸핑 공격 방지.
    - 사칭 시도에 대한 공격 탐지 로깅.
    - 서비스 연결성을 확인하기 위한 프로바이더용 제로 비용 API 테스트.
- **[기능] 응답 헤더 표시**: 전체 HTTP 응답 헤더 가시성을 갖춘 테스트 API 콘솔 개선.
    - 응답 표시 구조화: Status → Headers → Body.
    - 모노스페이스 포맷팅이 적용된 스크롤 가능한 헤더 컨테이너.
- **[UI] 설정 탐색 수정**: !important CSS 오버라이드로 활성 상태 가시성 개선.
