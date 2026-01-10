# 🏗️ HighStation Infrastructure Vision: The Road to 10k TPS

이 문서는 HighStation이 초기 단계(Vercel/Node.js)를 넘어, **초당 수만 건의 결제(10k TPS)**를 처리하고 **지연 시간(Latency)을 극소화**하기 위한 중장기 엔지니어링 로드맵입니다. 단순한 서버 이전을 넘어, 고성능 분산 처리 시스템으로의 진화를 목표로 합니다.

---

## 1. 인프라 전환: Serverless to Cloud Native
**Goal:** Vercel의 Serverless 오버헤드를 제거하고, **Go 기반의 상시 구동 프로세스**로 전환하여 고동시성(High Concurrency)을 확보합니다.

### 🏛️ Technology Stack
- **Language**: **Go (Golang)**
  - 이유: Goroutine을 활용한 경량 스레드 모델로 수만 개의 동시 연결(C10K)을 효율적으로 처리.
  - 라이브러리: `net/http` (표준) 또는 `fasthttp` (Zero allocation) 활용.
  - 목표: 지연 시간을 마이크로초($\mu s$) 단위로 제어.
- **Infrastructure**: **AWS EKS** (Kubernetes) 또는 **GCP GKE**
  - Pod 오토스케일링(HPA)을 통한 유연한 트래픽 대응.
- **Computing**: 
  - **AWS Fargate**: 서버 관리 없는 순수 컨테이너 환경.
  - **EC2 C7g (Graviton3)**: ARM64 아키텍처 기반의 압도적인 가성비와 성능.
- **Networking (Global Edge)**:
  - **AWS CloudFront** / **GCP Cloud Armor**: 전 세계 에지(Edge)에서 정적 콘텐츠 캐싱 및 DDoS 1차 방어.

---

## 2. 게이트웨이 로직 최적화 (The Go Advantage)
**Goal:** 에이전트와 공급자 사이의 병목을 제거하고 **최단 경로(Critical Path)**를 최적화합니다.

### ⚡ Performance Strategy
**성능 공식:**
$$Total\_Latency = L_{network} + L_{auth} + L_{proxy}$$
HighStation은 **$L_{auth}$ (인증 및 결제 검증)** 시간을 **1ms 미만**으로 단축하는 것을 목표로 합니다.

### 🛠️ Key Implementation
1. **비동기 처리 (Asynchronous Processing)**:
   - **Sync (동기/즉시)**: 결제 검증(Nonce, Balance Check), 라우팅. 에이전트 응답 속도에 직접 영향.
   - **Async (비동기)**: 평판 점수 기록(ERC-8004 Sync), 상세 로그 기록. Go Routine으로 백그라운드 처리하여 사용자 대기 시간 제거.
2. **Zero-Copy Proxying**:
   - `io.Copy`를 활용하여 커널 영역에서 데이터를 바로 전달.
   - User Space 메모리 복사 비용을 줄여 CPU 점유율 최소화.
3. **In-Memory Caching**:
   - Redis를 활용하여 빈번한 데이터(인증 토큰, 서비스 메타데이터)를 캐싱.

---

## 3. 데이터베이스 최적화: 수백만 건의 로그 처리
**Goal:** DB가 시스템의 병목이 되지 않도록 쓰기(Write) 및 조회(Read) 성능을 극한으로 최적화합니다.

### 📦 PostgreSQL / Supabase Tuning
1. **Connection Pooling (PgBouncer)**:
   - Go 서버가 DB와 직접 핸드쉐이크하는 비용 제거.
   - 미리 맺어진 연결을 재사용하여 처리량 극대화.
2. **Table Partitioning (파티셔닝)**:
   - 대상: `requests` 테이블 (가장 데이터가 많이 쌓임).
   - 전략: 날짜별 파티셔닝 (예: `requests_2026_01`, `requests_2026_02`).
   - 효과: 인덱스 깊이(Depth)를 얕게 유지하여 오래된 데이터가 쌓여도 최신 데이터 조회 속도 유지.
3. **Write Aggregation (Buffer)**:
   - **문제**: 매 요청마다 `INSERT` 발생 시 I/O 부하 심각.
   - **해결**: 메모리 버퍼에 로그를 1~5초간 모은 후, `COPY` 명령어로 벌크 인서트(Bulk Insert).

### 🚀 Redis Caching Layer
1. **Trust Seed (신용 한도) 실시간 관리**:
   - DB 트랜잭션 대신 Redis의 Atomic 연산(`DECR`, `INCR`)으로 잔액 관리.
   - 주기적으로 DB에 최종 상태 동기화 (Write-Back).
2. **Rate Limiting**:
   - IP/API 키별 요청 제한을 Redis의 Sliding Window 알고리즘으로 구현.
   - 분산 환경에서도 정확한 카운팅 보장.

---

## 4. 비전 요약
> "HighStation은 초기 데모를 넘어 **초당 수만 건의 에이전트 경제 활동**을 지탱하는 인프라가 될 것입니다. 데이터는 전 세계 에지를 통해 흐르며, 모든 신뢰 지표는 **Go 기반의 고성능 게이트웨이**와 **최적화된 DB**를 통해 지연 시간 없이 투명하게 검증됩니다."
