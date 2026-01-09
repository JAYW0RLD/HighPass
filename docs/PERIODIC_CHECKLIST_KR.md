# 정기 점검 가이드 (Periodic Health & Security Check)

본 문서는 HighStation 프로젝트의 무결성, 보안, 코드 품질을 유지하기 위해 수행해야 하는 정기 점검 절차를 정의합니다.
개발팀 및 보안팀은 주기적으로(예: 매 스프린트 종료 시 또는 월 1회) 이 가이드를 따라 점검을 수행해야 합니다.

---

## 1. 레드팀 보안 점검 (Red Team Security Check)

공격자의 관점에서 시스템의 취약점을 탐색합니다.

### 🛡 데이터베이스 및 인프라
- [ ] **SQL Injection**: `serviceResolver.ts` 및 DB 쿼리 로직에 사용자 입력이 직접 연결되는지 확인 (ORM 사용 강력 권장).
- [ ] **RLS 정책 검증**: Supabase 대시보드에서 `services`, `users` 등의 테이블 RLS 정책이 의도치 않게 데이터를 노출 (`public` access)하고 있는지 확인.
- [ ] **환경 변수 노출**: `.env` 파일이 git에 커밋되었거나, 클라이언트 사이드 번들(`public` 디렉토리 등)에 포함되었는지 확인.

### ⛓ 스마트 컨트랙트 및 네트워크
- [ ] **RPC 엔드포인트**: `viemClient.ts` 등에서 설정된 RPC URL이 공개된 공용 노드인지, 안전한 사설 노드인지 점검.
- [ ] **가스비 및 비용**: 트랜잭션 수수료 로직(`FeeSettlementEngine`)이 최신 네트워크 상황(가스비 급등 등)을 반영하는지 확인.
- [ ] **주소 하드코딩**: `0x`로 시작하는 주소들이 코드에 직접 박혀있는지 확인 (`grep "0x" -r src`).

### 🌐 네트워크 및 SSRF
- [ ] **SSRF 방어**: `validateUpstreamNetwork` (SSRF Guard)가 우회 가능한지 파악. (DNS Rebinding 테스트).
- [ ] **DNS 유출**: 불필요한 DNS 조회가 발생하는 로직이 있는지 확인.

---

## 2. 누락 파일 및 로직 점검 (Files & Logic Audit)

코드베이스의 정합성을 확인하고 좀비 코드를 제거합니다.

- [ ] **전체 파일 스캔**: `src` 폴더 내 모든 파일을 열어보며 다음을 확인:
    - 사용하지 않는 `import` 구문 제거.
    - 더 이상 사용되지 않는 "Feature Flag"나 "Legacy Code" 제거.
    - 주석과 실제 코드가 일치하는지 확인.
- [ ] **숨겨진 로직(Hidden Features) 발굴**:
    - "Test Mode", "Debug Mode", "Bypass" 등의 키워드로 검색하여 프로덕션에 남아있는 백도어성 로직 제거.
    - 예: `if (user === 'admin_bypass') ...`
- [ ] **에러 처리 누락**: `catch (e) { console.log(e) }`와 같이 에러를 삼키고 넘어가는 로직이 없는지 확인. (Fail-Closed 원칙 준수).

---

## 3. 하드코딩 점검 (Hardcoding Inspection)

유연성을 저해하고 보안 위험을 초래하는 하드코딩 값을 찾습니다.

다음 정규식/키워드로 전체 검색을 수행하십시오:

- `http://` : HTTPS가 아닌 비보안 연결 사용 여부 (로컬호스트 제외).
- `TODO`, `FIXME`, `XXX` : 해결되지 않은 기술 부채.
- `console.log` : 민감한 정보(토큰, PII)가 로그에 남는지 확인.
- `process.env` 미사용 : 설정값(Timeout, URL, Limit 등)이 코드에 직접 적혀있는지(`Magic Number`/`String`) 확인.
    - 예: `rateLimit({ max: 100 })` -> 100이 적절한가? 환경변수로 빼야 하는가?

---

## ✅ 점검 로그 기록

점검 수행 후 아래와 같은 형식으로 이슈 트래커나 `AUDIT_LOG.md`에 기록을 남기십시오.

- **점검일**: YYYY-MM-DD
- **수행자**: 홍길동
- **발견된 이슈**: 3건
    1. [Critical] `server.ts`에 하드코딩된 테스트용 토큰 발견 -> 제거함.
    2. [Low] `IdentityService.ts` 미사용 import 존재 -> 정리함.
