# 🚀 배포 가이드 (Deployment Guide)

## 필수 사전 요구사항

### 1. 환경 변수 설정
`.env.example` 파일을 복사하여 `.env` 파일 생성 후 실제 값 입력:

```bash
cp .env.example .env
nano .env  # 또는 원하는 에디터 사용
```

**중요:** 모든 필수 환경변수를 반드시 설정해야 합니다. 서버는 시작 시 자동으로 검증합니다.

---

## 📊 데이터베이스 마이그레이션

> **🚨 중요:** V-15 보안 수정사항을 포함한 모든 마이그레이션을 **반드시 순서대로** 적용해야 합니다.

### Supabase 마이그레이션 절차

1. **Supabase 대시보드 접속**
   ```
   https://app.supabase.com/project/YOUR_PROJECT_ID
   ```

2. **SQL Editor로 이동**
   - 좌측 메뉴 > SQL Editor
   - "New Query" 클릭

3. **마이그레이션 파일 순서대로 실행**

#### 001: 도메인 검증
```bash
# migrations/001_add_domain_verification.sql 내용 복사 후 실행
```

#### 002: 정산 시스템
```bash
# migrations/002_add_settlements.sql 내용 복사 후 실행
```

#### 003: 텔레메트리
```bash
# migrations/003_add_telemetry.sql 내용 복사 후 실행
```

#### 004: 개발자 프로필
```bash
# migrations/004_add_developers.sql 내용 복사 후 실행
```

#### 005: 논스 추적 (리플레이 공격 방지)
```bash
# migrations/005_add_nonce_tracking.sql 내용 복사 후 실행
```

#### 006: RLS 보안 강화
```bash
# migrations/006_lockdown_rls.sql 내용 복사 후 실행
```

#### **007: 원자적 부채 연산 (V-05 보안 수정) ⭐**
```bash
# migrations/007_atomic_debt_operations.sql 내용 복사 후 실행
```

**이 마이그레이션은 경쟁 조건(Race Condition) 취약점을 수정합니다.**  
적용하지 않으면 동시 요청 시 부채 한도 우회 공격에 취약합니다!

4. **마이그레이션 검증**
```sql
-- 함수가 정상적으로 생성되었는지 확인
SELECT proname, prosrc 
FROM pg_proc 
WHERE proname = 'atomic_add_debt';
```

예상 결과: 1개 행 반환되어야 함

---

## 🔒 보안 체크리스트

배포 전 반드시 확인:

- [ ] `.env` 파일의 모든 필수 변수 설정
- [ ] `SUPABASE_SERVICE_ROLE_KEY` 사용 (ANON_KEY 아님!)
- [ ] `ALLOWED_ORIGINS`에 프로덕션 도메인 추가
- [ ] 모든 마이그레이션 (001-007) 적용 완료
- [ ] `NODE_ENV=production` 설정
- [ ] `.env` 파일이 `.gitignore`에 포함되어 있음
- [ ] 스마트 컨트랙트 주소가 올바른 네트워크용인지 확인

---

## 🌐 Vercel 배포

### 1. 프로젝트 빌드 테스트
```bash
npm run build
npm run start  # 프로덕션 모드 테스트
```

### 2. Vercel 환경변수 설정

Vercel 대시보드 > Settings > Environment Variables에서 설정:

```
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=ey...
SUPABASE_SERVICE_ROLE_KEY=sbp_service_...
PAYMENT_HANDLER_ADDRESS=0x7a3642780386762391262d0577908D5950882e39
IDENTITY_CONTRACT_ADDRESS=0x...
RPC_URL=https://rpc-t3.cronos-zkevm.org
CHAIN_ID=240
ALLOWED_ORIGINS=https://your-frontend.vercel.app
NODE_ENV=production
```

### 3. 배포
```bash
vercel --prod
```

---

## ✅ 배포 후 검증

### 1. Health Check
```bash
curl https://your-api.vercel.app/health
```

예상 응답:
```json
{
  "status": "ok",
  "timestamp": "2026-01-09T...",
  "environment": "production",
  "services": {
    "database": "connected",
    "oracle": "pyth",
    "blockchain": "cronos-zkevm-testnet"
  }
}
```

### 2. 환경변수 검증 확인
로그에서 다음 메시지 확인:
```
✅ All required environment variables validated
```

오류 발생 시:
```
❌ Environment Variable Validation Failed!
```
→ 누락된 변수를 추가하고 재배포

### 3. 데이터베이스 연결 테스트
```bash
curl https://your-api.vercel.app/api/stats
```

### 4. 마이그레이션 검증
Supabase SQL Editor에서:
```sql
-- atomic_add_debt 함수 존재 확인
SELECT routine_name 
FROM information_schema.routines 
WHERE routine_name = 'atomic_add_debt';
```

---

## 🐛 문제 해결

### "Environment Variable Validation Failed"
- `.env` 파일 또는 Vercel 환경변수 확인
- `.env.example` 파일과 비교하여 누락된 변수 추가

### "Database init failed"
- `SUPABASE_SERVICE_ROLE_KEY` 사용 확인 (ANON_KEY 불가)
- Supabase 프로젝트가 일시 중지되지 않았는지 확인

### "Function atomic_add_debt does not exist"
- `migrations/007_atomic_debt_operations.sql` 재실행
- Supabase 프로젝트의 올바른 스키마(public)에 생성되었는지 확인

### "Payment verification failed"
- `PAYMENT_HANDLER_ADDRESS`가 올바른 네트워크용인지 확인
- 스마트 컨트랙트가 배포되었는지 확인

---

## 📝 롤백 절차

문제 발생 시 이전 버전으로 롤백:

```bash
# Vercel
vercel rollback

# 데이터베이스 (마이그레이션 역순)
# 각 마이그레이션의 DROP 문 실행
```

---

## 🔐 보안 모범 사례

1. **절대로 .env 파일을 Git에 커밋하지 마세요**
2. **프로덕션에서 SUPABASE_SERVICE_ROLE_KEY 사용** (ANON_KEY 사용 금지)
3. **ALLOWED_ORIGINS를 실제 도메인으로 제한**
4. **정기적으로 Supabase 로그 모니터링**
5. **의심스러운 활동 시 즉시 API 키 교체**

---

## 📞 지원

문제가 발생하면:
1. 로그 확인 (Vercel Functions 탭)
2. Supabase 로그 확인 (Logs Explorer)
3. GitHub Issues에 버그 보고
