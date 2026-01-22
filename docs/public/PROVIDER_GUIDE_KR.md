# HighStation Provider 가이드

이 가이드는 AI 서비스 공급자(Provider)가 HighStation 인프라에 서비스를 등록하고, **고유 게이트웨이를 발급(Issuance)**받아 수익화하는 전체 과정을 설명합니다.

---

## 1. 서비스 등록 및 게이트웨이 발급 (Gateway Issuance)

HighStation은 단순한 API 중개가 아닌, **인프라 도메인 발급(Issuance)** 모델을 따릅니다.

### 1-1. 슬러그(Slug)와 고유성
서비스 등록 시 입력하는 `slug`는 HighStation 생태계 내에서 귀하의 서비스가 독점적으로 사용할 **고유 식별자**가 됩니다.
- **예시**: `slug`를 `text-washer`로 등록 시
- **발급 도메인**: `text-washer.highstation.net` (프로덕션 기준)

> [!IMPORTANT]
> **중복 등록 불가**: 이미 누군가 선점한 슬러그는 사용할 수 없습니다. 동일한 깃허브 레포지토리라 하더라도, 운영자가 다르면 다른 슬러그(예: `text-washer-pro`, `washer-by-alice`)를 통해 별도의 인프라를 발급받아야 합니다.

### 1-2. 등록 절차
1. 대시보드 로그인
2. **"Create New Service"** 클릭
3. 정보 입력:
   - **Service Name**: 서비스 표시 이름
   - **Service Slug**: 고유 식별자 (URL에 사용됨)
   - **Upstream URL**: 실제 API 서버 주소 (예: `https://api.myservice.com`)
   - **Pricing**: 호출당 가격 (CRO 단위)

---

## 2. 도메인 검증 (Domain Verification)

HighStation은 신뢰할 수 있는 서비스만 중개하기 위해 **DNS 기반 소유권 검증**을 수행합니다.

### 검증 단계
1. **검증 토큰 확인**: 대시보드 또는 API를 통해 고유 검증 토큰을 확인합니다.
2. **DNS 레코드 추가**:
   - 귀하의 도메인(Upstream URL의 호스트) 관리 페이지 접속
   - **TXT 레코드** 추가:
     - **Host**: `@` (또는 서브도메인)
     - **Value**: `highstation-verification={YOUR_TOKEN}`
3. **검증 실행**: 대시보드에서 "Verify Domain" 버튼 클릭

> [!NOTE]
> 개발 환경(Development)에서는 `localhost` 또는 `allow_unverified_services` 설정을 통해 이 단계를 건너뛸 수 있습니다.

---

## 3. 게이트웨이 활용 (Using the Gateway)

서비스가 등록되고 검증되면, HighStation은 두 가지 핵심 엔드포인트를 제공합니다.

### 3-1. Public Resource Endpoint (실제 호출용)
에이전트가 서비스를 호출할 때 사용하는 주소입니다.
- **URL**: `https://{slug}.highstation.net/v1/resource`
- **기능**:
  - **x402 결제 방어**: 유효한 결제 증명이 없으면 402 에러 반환
  - **와일드카드 지원**: `/v1/resource/extra/path` → `upstream/extra/path`로 자동 매핑
  - **쿼리 파라미터 보존**: `?model=gpt4&temperature=0.7` 등 모든 파라미터 전달
  - **페이로드**: 최대 2MB JSON 지원

### 3-2. Service Metadata Endpoint (정보 조회용)
에이전트가 서비스를 탐색하고 신뢰도를 확인할 때 사용합니다.
- **URL**: `https://{slug}.highstation.net/info`
- **제공 정보**:
  - 가격 정책 (Pricing)
  - **Payment Address**: 공급자별 고유 관리형 지갑 주소 (Managed Sub-Wallet)
  - **Trust Signal**: HighStation이 보증하는 신뢰 점수 (0~100)
  - OpenSeal 무결성 해시

---

## 4. 수수료 및 정산 시스템 (Managed Settlement)

HighStation은 공급자의 편의성과 투명한 정산을 위해 **관리형 서브 지갑(Managed Sub-Wallet)** 시스템을 운영합니다.

### 4-1. 전용 입금 주소 할당
- 서비스 등록 시, 각 공급자에게는 HD Wallet 기술로 파생된 **고유한 온체인 주소**가 자동으로 할당됩니다.
- 에이전트의 모든 결제 대금은 이 주소로 직접 전송되며, 공급자는 블록 익스플로러에서 실시간으로 수익을 확인할 수 있습니다.

### 4-2. 수수료 및 정산 정책
- **플랫폼 수수료**: 모든 결제 대금의 **5%**는 인프라 운영 및 플랫폼 유지보수를 위해 공제됩니다.
- **공급자 수익**: 나머지 **95%**는 공급자의 순수익으로 적립됩니다.
- **출금 방식**:
  - 대시보드에서 출금 신청 시, 별도의 지갑 서명이 필요하지 않습니다 (Supabase 세션 인증 활용).
  - 출금 버튼 클릭 후 목적지 주소만 입력하면, 플랫폼이 징수 수수료를 제외한 금액을 즉시 온체인으로 전송합니다.

---

## 5. 서비스 관리 및 삭제

### 서비스 삭제
대시보드의 **Gateway Issuance** 섹션 또는 설정 탭에서 서비스를 삭제할 수 있습니다.
- **주의**: 서비스를 삭제하면 발급된 슬러그는 즉시 해제되며, 다른 사용자가 해당 슬러그를 선점할 수 있게 됩니다.
- 연결된 모든 결제 및 통계 데이터는 보존되지 않을 수 있습니다.

---

## 6. 업스트림 보안 보안 권장 사항 (Security Best Practices)

공급자 서버를 외부의 무단 호출로부터 보호하기 위해 다음 두 가지 보안 계층을 반드시 적용할 것을 강력히 권장합니다.

### 6-1. IP 화이트리스트 (IP Whitelisting)
가장 간단하고 확실한 방어 수단입니다. 귀하의 API 서버(Upstream) 설정에서 **HighStation Gatekeeper 서버의 IP 주소만 접근을 허용**하도록 방화벽(ACL)을 구성하십시오.
- **효과**: 외부 에이전트가 귀하의 서버 주소를 알아내더라도 직접 호출하는 것이 물리적으로 차단됩니다.

### 6-2. HMAC 서명 검증 (HMAC Signature Verification)
HighStation은 모든 요청을 전달할 때 고유한 서명을 포함합니다.
- **헤더**: `x-highstation-signature`
- **검증 방식**: `t=(타임스탬프),v1=(서명값)` 형태의 헤더를 파싱하여, 미리 공유된 `Signing Secret`과 요청 본문을 조합해 서명이 유효한지 확인합니다.
- **효과**: 요청이 변조되지 않았으며, 반드시 HighStation Gatekeeper를 통해 결제가 완료된 요청임을 보장합니다.

---

_HighStation은 귀하의 AI 서비스를 자율 경제의 핵심 인프라로 만들어 드립니다._
