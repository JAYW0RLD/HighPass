# 🚀 Vercel + Supabase 배포 가이드

**x402-gatekeeper를 프로덕션에 배포하는 완벽한 가이드입니다.**

> **예상 소요 시간**: 20분  
> **전제 조건**: GitHub 계정, Vercel 계정, Supabase 계정

---

## 📋 배포 개요

```
GitHub Repository
    ↓
Vercel (Backend + Frontend)
    ↓
Supabase (PostgreSQL + Auth)
    ↓
Cronos zkEVM Testnet
```

---

## 🗄️ STEP 1: Supabase 데이터베이스 설정

### 1.1 프로젝트 생성

1. [Supabase Dashboard](https://app.supabase.com) 접속
2. **"New Project"** 클릭
3. 프로젝트 정보 입력:
   - **Name**: `x402-gatekeeper` (또는 원하는 이름)
   - **Database Password**: 강력한 비밀번호 (저장 필수!)
   - **Region**: 가장 가까운 지역 선택 (예: Seoul, Tokyo)
4. **"Create new project"** 클릭 (2-3분 소요)

### 1.2 데이터베이스 스키마 적용

프로젝트가 생성되면:

1. 좌측 메뉴 → **"SQL Editor"** 클릭
2. **"New query"** 클릭
3. 프로젝트의 `supabase_schema.sql` 파일 내용 전체 복사
4. SQL 에디터에 붙여넣기
5. **Run** 버튼 클릭 (Ctrl/Cmd + Enter)

**확인사항:**
```sql
-- SQL Editor에서 실행하여 테이블 확인
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public';
```

예상 테이블 목록:
- `requests`
- `agent_debts`
- `profiles`
- `services`
- `public_services` (View)

### 1.3 환경 변수 수집

1. 좌측 메뉴 → **"Settings"** → **"API"**
2. 다음 값들을 복사해두세요:

```bash
# Project URL
SUPABASE_URL=https://xxxxxxxxxxxxx.supabase.co

# Project API keys
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

⚠️ **중요**: `SERVICE_ROLE_KEY`는 절대 클라이언트에 노출하지 마세요!

---

## 📦 STEP 2: GitHub 저장소 준비

### 2.1 .gitignore 확인

다음 파일들이 `.gitignore`에 포함되어 있는지 확인:

```bash
# Environment variables (CRITICAL!)
.env
.env.local
.env.production

# Dependencies
node_modules/
dashboard/node_modules/

# Build outputs
dist/
dashboard/dist/
.vercel/
```

### 2.2 GitHub에 푸시

```bash
# 현재 상태 확인
git status

# 민감한 파일이 추가되지 않았는지 재확인
git diff

# 커밋 & 푸시
git add .
git commit -m "feat: v2.0.3 security hardening + deployment ready"
git push origin main
```

⚠️ **보안 체크**: `.env` 파일이 푸시되지 않았는지 반드시 확인!

```bash
# GitHub에 .env가 없는지 확인
git ls-files | grep "\.env$"
# 아무것도 출력되지 않아야 정상!
```

---

## ☁️ STEP 3: Vercel 배포

### 3.1 프로젝트 Import

1. [Vercel Dashboard](https://vercel.com/dashboard) 접속
2. **"Add New..."** → **"Project"** 클릭
3. GitHub 저장소 선택
4. **"Import"** 클릭

### 3.2 빌드 설정

**Framework Preset**: `Other` (자동 감지됨)

**Build Settings:**
```bash
# Build Command (자동 감지, 필요시 수정)
npm run build

# Output Directory (자동 감지)
dist

# Install Command (자동 감지)
npm install
```

### 3.3 환경 변수 설정

**Environment Variables** 섹션에서 다음 변수들을 추가:

#### 필수 변수 (Backend)

| Variable | Value | Note |
|----------|-------|------|
| `NODE_ENV` | `production` | 프로덕션 모드 활성화 |
| `SUPABASE_URL` | `https://xxx.supabase.co` | Supabase에서 복사 |
| `SUPABASE_ANON_KEY` | `eyJhbG...` | Supabase Anon Key |
| `SUPABASE_SERVICE_ROLE_KEY` | `eyJhbG...` | ⚠️ Service Role Key (필수!) |
| `RPC_URL` | `https://rpc-t3.cronos-zkevm.org` | Cronos zkEVM RPC |
| `CHAIN_ID` | `240` | Cronos zkEVM Testnet |
| `PAYMENT_HANDLER_ADDRESS` | `0x7a3642...` | 배포된 컨트랙트 주소 |
| `IDENTITY_CONTRACT_ADDRESS` | `0xf79354...` | Identity 컨트랙트 주소 |

#### 선택 변수 (프라이빗 키는 백엔드에서만 필요할 경우)

| Variable | Value | Note |
|----------|-------|------|
| `PRIVATE_KEY` | `0x...` | Admin 운영용 (읽기만 하는 경우 불필요) |
| `ALLOWED_ORIGINS` | `https://your-domain.vercel.app` | CORS 설정 |

#### Frontend 변수 (Dashboard용)

| Variable | Value | Note |
|----------|-------|------|
| `VITE_SUPABASE_URL` | `https://xxx.supabase.co` | Frontend에서 사용 |
| `VITE_SUPABASE_ANON_KEY` | `eyJhbG...` | Frontend에서 사용 (Anon만!) |

### 3.4 배포 실행

1. **"Deploy"** 버튼 클릭
2. 빌드 로그 확인 (2-3분 소요)
3. 성공 시 배포 URL 제공됨: `https://your-project.vercel.app`

---

## ✅ STEP 4: 배포 검증

### 4.1 Health Check

```bash
curl https://your-project.vercel.app/health
```

**예상 응답:**
```json
{
  "status": "ok",
  "timestamp": "2026-01-08T11:00:00.000Z",
  "environment": "production",
  "services": {
    "database": "connected",
    "oracle": "pyth",
    "blockchain": "cronos-zkevm-testnet"
  }
}
```

### 4.2 Dashboard 접속

브라우저에서 `https://your-project.vercel.app` 접속

- ✅ 로그인/회원가입 화면 표시
- ✅ Supabase Auth 작동
- ✅ 레이아웃 정상 렌더링

### 4.3 API 테스트

```bash
# 서비스 목록 조회 (Public View)
curl https://your-project.vercel.app/api/stats

# gatekeeper 엔드포인트 테스트 (402 예상)
curl -H "X-Agent-ID: test-agent" \
     https://your-project.vercel.app/gatekeeper/my-service/resource
```

---

## � STEP 5: 프로덕션 최적화

### 5.1 Custom Domain 설정 (선택)

1. Vercel Dashboard → 프로젝트 선택
2. **Settings** → **Domains**
3. 도메인 추가 및 DNS 설정

### 5.2 Supabase Auth 설정

1. Supabase Dashboard → **Authentication** → **URL Configuration**
2. **Site URL**: `https://your-domain.vercel.app` 입력
3. **Redirect URLs**: 추가
   ```
   https://your-domain.vercel.app/*
   https://your-domain.vercel.app/dashboard/*
   ```

### 5.3 CORS 업데이트

Vercel 환경 변수에서 `ALLOWED_ORIGINS` 수정:

```bash
ALLOWED_ORIGINS=https://your-production-domain.com,https://your-project.vercel.app
```

재배포 필요: Vercel은 환경 변수 변경 시 자동 재배포되지 않으므로:
- **Deployments** 탭 → 최신 배포 → **"Redeploy"** 클릭

---

## 🔄 데이터베이스 마이그레이션 (스키마 변경 시)

### 방법 1: SQL Editor (간단한 변경)

```sql
-- 예: 새로운 컬럼 추가
ALTER TABLE services ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT true;

-- 인덱스 추가
CREATE INDEX IF NOT EXISTS idx_services_provider ON services(provider_id);
```

### 방법 2: Supabase CLI (권장)

#### 설치 & 초기화
```bash
# CLI 설치
npm install -g supabase

# Supabase 로그인
supabase login

# 프로젝트 링크
supabase link --project-ref your-project-id
```

#### 마이그레이션 생성
```bash
# 마이그레이션 파일 생성
supabase migration new add_analytics_table

# supabase/migrations/20260108120000_add_analytics_table.sql 편집
# vi supabase/migrations/20260108120000_add_analytics_table.sql
```

```sql
-- 마이그레이션 내용 작성
CREATE TABLE IF NOT EXISTS analytics (
    id bigint generated by default as identity primary key,
    service_id uuid references services(id),
    requests_count bigint default 0,
    created_at timestamptz default now()
);
```

#### 적용
```bash
# Local 테스트 (선택)
supabase start
supabase db push --local

# Production 적용
supabase db push
```

---

## 🐛 트러블슈팅

### 문제 1: "Cannot connect to database"

**원인**: `SUPABASE_SERVICE_ROLE_KEY`가 설정되지 않음

**해결**:
1. Vercel → Settings → Environment Variables
2. `SUPABASE_SERVICE_ROLE_KEY` 추가
3. Redeploy

### 문제 2: CORS 에러

**증상**: Browser에서 `Access-Control-Allow-Origin` 에러

**해결**:
```bash
# Vercel 환경 변수 확인
ALLOWED_ORIGINS=https://your-exact-domain.vercel.app

# server.ts CORS 설정 확인
app.use(cors({
    origin: process.env.ALLOWED_ORIGINS?.split(','),
    credentials: true
}));
```

### 문제 3: Build 실패

**증상**: `Module not found` 에러

**해결**:
```bash
# 로컬에서 빌드 테스트
npm run build

# package.json 확인
{
  "scripts": {
    "build": "tsc"
  }
}
```

### 문제 4: 환경 변수가 적용 안 됨

**원인**: Vercel은 환경 변수 변경 시 자동 재배포 안 됨

**해결**:
1. Deployments 탭 이동
2. 최신 배포 선택
3. **"Redeploy"** 클릭

---

## 📊 모니터링 & 로깅

### Vercel 로그 확인

```bash
# Vercel CLI 설치
npm install -g vercel

# 로그인
vercel login

# 실시간 로그 확인
vercel logs your-project-url --follow
```

### Supabase 로그 확인

1. Supabase Dashboard → **Logs**
2. **Database Logs**: SQL 쿼리 확인
3. **API Logs**: RLS 정책 위반 확인

### 권장 모니터링 도구

- **Sentry**: 에러 추적
- **DataDog**: APM
- **LogRocket**: 세션 리플레이

---

## 🔐 보안 체크리스트

배포 전 필수 확인사항:

- [ ] `.env` 파일이 `.gitignore`에 포함됨
- [ ] GitHub에 secret이 푸시되지 않음
- [ ] `NODE_ENV=production` 설정됨
- [ ] `SUPABASE_SERVICE_ROLE_KEY` 설정됨 (ANON_KEY 아님!)
- [ ] `TEST_CHEAT_KEY` 환경 변수 **제거됨**
- [ ] CORS `ALLOWED_ORIGINS`가 프로덕션 도메인으로 제한됨
- [ ] Supabase RLS 정책 활성화됨
- [ ] 데이터베이스 백업 활성화 (Supabase Pro)

---

## 📚 참고 자료

- [Vercel 공식 문서](https://vercel.com/docs)
- [Supabase 공식 문서](https://supabase.com/docs)
- [프로젝트 보안 감사](../audit/EXECUTIVE_SUMMARY.md)
- [프로덕션 체크리스트](../audit/DEPLOYMENT_CHECKLIST.md)

---

## 🎉 배포 완료!

축하합니다! 이제 프로덕션 환경에서 x402-gatekeeper가 실행 중입니다.

**다음 단계:**
1. 스마트 컨트랙트 배포 (Cronos zkEVM)
2. Provider 계정 생성 및 서비스 등록
3. 모니터링 설정
4. 사용자 초대

**문제가 발생하면:**
- GitHub Issues: `https://github.com/your-repo/issues`
- [트러블슈팅 가이드](#-트러블슈팅) 참조

---

**마지막 업데이트**: 2026-01-08  
**작성자**: Antigravity Development Team
