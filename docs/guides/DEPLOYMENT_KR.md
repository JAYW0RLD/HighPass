# 🚀 Vercel + Supabase 배포 가이드 (한국어)

**x402-gatekeeper를 프로덕션에 배포하는 완벽한 한글 가이드입니다.**

> **예상 소요 시간**: 20분  
> **필요한 것**: GitHub 계정, Vercel 계정, Supabase 계정

---

## 📋 배포 흐름도

```
GitHub 저장소
    ↓
Vercel (백엔드 + 프론트엔드)
    ↓
Supabase (PostgreSQL + 인증)
    ↓
Cronos zkEVM 테스트넷
```

---

## 🗄️ 1단계: Supabase 데이터베이스 설정

### 1.1 프로젝트 생성하기

1. [Supabase 대시보드](https://app.supabase.com) 접속
2. **"New Project"** 클릭
3. 프로젝트 정보 입력:
   - **이름**: `x402-gatekeeper` (또는 원하는 이름)
   - **데이터베이스 비밀번호**: 강력한 비밀번호 입력 (꼭 저장하세요!)
   - **지역**: 가장 가까운 지역 선택 (예: Seoul, Tokyo)
4. **"Create new project"** 클릭 (2-3분 소요)

### 1.2 데이터베이스 스키마 적용하기

프로젝트 생성이 완료되면:

1. 왼쪽 메뉴에서 **"SQL Editor"** 클릭
2. **"New query"** 클릭
3. 프로젝트의 `supabase_schema.sql` 파일 내용 전체 복사
4. SQL 에디터에 붙여넣기
5. 오른쪽 상단의 **Run** 버튼 클릭 (또는 Ctrl/Cmd + Enter)

**확인하기:**
```sql
-- SQL Editor에서 실행하여 테이블 확인
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public';
```

생성되어야 할 테이블 목록:
- `requests` - 요청 로그
- `agent_debts` - 에이전트 부채 관리
- `profiles` - 사용자 프로필
- `services` - 등록된 서비스
- `public_services` - 공개 서비스 뷰

### 1.3 API 키 복사하기

1. 왼쪽 메뉴 → **"Settings"** → **"API"**
2. 다음 값들을 메모장에 복사해두세요:

```bash
# Project URL (프로젝트 URL)
SUPABASE_URL=https://xxxxxxxxxxxxx.supabase.co

# Anon Key (익명 키 - 프론트엔드용)
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Service Role Key (서비스 역할 키 - 백엔드용, 절대 노출 금지!)
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

⚠️ **중요**: `SERVICE_ROLE_KEY`는 절대로 프론트엔드 코드나 GitHub에 올리면 안 됩니다!

---

## 📦 2단계: GitHub 저장소 준비

### 2.1 민감한 파일 확인

`.gitignore` 파일에 다음 내용이 포함되어 있는지 확인:

```bash
# 환경 변수 (절대 올리면 안 됨!)
.env
.env.local
.env.production

# 의존성
node_modules/
dashboard/node_modules/

# 빌드 결과물
dist/
dashboard/dist/
.vercel/
```

### 2.2 GitHub에 업로드

```bash
# 현재 상태 확인
git status

# .env 파일이 추가되지 않았는지 다시 한번 확인!
git diff

# 커밋 & 푸시
git add .
git commit -m "배포 준비: v2.0.3 보안 강화 완료"
git push origin main
```

⚠️ **보안 체크**: `.env` 파일이 업로드되지 않았는지 반드시 확인!

```bash
# GitHub에 .env가 없는지 확인 (아무것도 안 나와야 정상)
git ls-files | grep "\.env$"
```

---

## ☁️ 3단계: Vercel 배포하기

### 3.1 프로젝트 가져오기

1. [Vercel 대시보드](https://vercel.com/dashboard) 접속
2. 오른쪽 상단 **"Add New..."** → **"Project"** 클릭
3. GitHub 저장소 검색해서 선택
4. **"Import"** 클릭

### 3.2 빌드 설정

**Framework Preset**: `Other` (자동 감지됨)

**빌드 설정 (자동):**
```bash
# 빌드 명령어
npm run build

# 출력 디렉토리
dist

# 설치 명령어
npm install
```

### 3.3 환경 변수 설정 (가장 중요!)

**Environment Variables** 섹션에서 아래 변수들을 하나씩 추가:

#### 필수 백엔드 변수

| 변수 이름 | 값 | 설명 |
|----------|-------|------|
| `NODE_ENV` | `production` | 프로덕션 모드 |
| `SUPABASE_URL` | `https://xxx.supabase.co` | Supabase에서 복사한 URL |
| `SUPABASE_ANON_KEY` | `eyJhbG...` | Supabase Anon Key |
| `SUPABASE_SERVICE_ROLE_KEY` | `eyJhbG...` | ⚠️ Service Role Key (필수!) |
| `RPC_URL` | `https://rpc-t3.cronos-zkevm.org` | 크로노스 RPC |
| `CHAIN_ID` | `240` | 크로노스 체인 ID |
| `PAYMENT_HANDLER_ADDRESS` | `0x7a3642...` | 배포한 컨트랙트 주소 |
| `IDENTITY_CONTRACT_ADDRESS` | `0xf79354...` | Identity 컨트랙트 주소 |

#### 프론트엔드 변수 (대시보드용)

| 변수 이름 | 값 | 설명 |
|----------|-------|------|
| `VITE_SUPABASE_URL` | `https://xxx.supabase.co` | 프론트엔드용 (위와 동일) |
| `VITE_SUPABASE_ANON_KEY` | `eyJhbG...` | 프론트엔드용 (Anon Key만!) |

#### 추가 옵션 (필요시)

| 변수 이름 | 값 | 설명 |
|----------|-------|------|
| `PRIVATE_KEY` | `0x...` | 관리자 지갑 개인키 (읽기만 할 경우 불필요) |
| `ALLOWED_ORIGINS` | `https://your-domain.vercel.app` | CORS 허용 도메인 |

### 3.4 배포 실행!

1. 아래 **"Deploy"** 버튼 클릭
2. 빌드 로그 확인하며 대기 (2-3분)
3. ✅ 성공 시 배포 URL 제공: `https://your-project.vercel.app`

---

## ✅ 4단계: 배포 확인하기

### 4.1 서버 상태 확인

터미널에서 실행:
```bash
curl https://your-project.vercel.app/health
```

**정상 응답:**
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

### 4.2 대시보드 접속

브라우저에서 `https://your-project.vercel.app` 접속

✅ 체크리스트:
- [ ] 로그인/회원가입 화면이 보임
- [ ] Supabase 인증이 작동함
- [ ] 페이지가 깨지지 않고 정상 표시

### 4.3 API 테스트

```bash
# 통계 API 테스트
curl https://your-project.vercel.app/api/stats

# Gatekeeper 테스트 (402 응답 예상)
curl -H "X-Agent-ID: test-agent" \
     https://your-project.vercel.app/gatekeeper/my-service/resource
```

---

## 🔧 5단계: 추가 설정 (선택사항)

### 5.1 커스텀 도메인 연결

1. Vercel Dashboard → 프로젝트 선택
2. **Settings** → **Domains**
3. 원하는 도메인 추가 (예: `api.myservice.com`)
4. DNS 설정 따라하기

### 5.2 Supabase 인증 URL 설정

1. Supabase Dashboard → **Authentication** → **URL Configuration**
2. **Site URL**: `https://your-domain.vercel.app` 입력
3. **Redirect URLs** 추가:
   ```
   https://your-domain.vercel.app/*
   https://your-domain.vercel.app/dashboard/*
   ```

### 5.3 CORS 업데이트

Vercel 환경 변수에서 `ALLOWED_ORIGINS` 수정:

```bash
ALLOWED_ORIGINS=https://my-production-domain.com
```

**주의**: 환경 변수 변경 후 **Redeploy** 필요!

---

## 🔄 데이터베이스 스키마 변경하기

나중에 테이블 구조를 바꿔야 할 때:

### 방법 1: SQL Editor 사용 (간단한 변경)

```sql
-- 예시: 새로운 컬럼 추가
ALTER TABLE services ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT true;

-- 인덱스 추가
CREATE INDEX IF NOT EXISTS idx_services_provider ON services(provider_id);
```

### 방법 2: Supabase CLI 사용 (권장)

```bash
# 1. CLI 설치
npm install -g supabase

# 2. 로그인
supabase login

# 3. 프로젝트 연결
supabase link --project-ref your-project-id

# 4. 마이그레이션 파일 생성
supabase migration new add_analytics_table

# 5. 파일 편집 후 적용
supabase db push
```

---

## 🐛 자주 발생하는 문제 해결

### 문제 1: "Cannot connect to database" 에러

**원인**: `SUPABASE_SERVICE_ROLE_KEY`가 설정 안 됨

**해결**:
1. Vercel → Settings → Environment Variables
2. `SUPABASE_SERVICE_ROLE_KEY` 추가 (Anon Key 아님!)
3. **Redeploy** 클릭

### 문제 2: CORS 에러 발생

**증상**: 브라우저 콘솔에 `Access-Control-Allow-Origin` 에러

**해결**:
```bash
# Vercel 환경 변수 확인
ALLOWED_ORIGINS=https://정확한도메인.vercel.app
```

재배포 후 테스트!

### 문제 3: 빌드 실패

**증상**: `Module not found` 에러

**해결**:
```bash
# 로컬에서 먼저 빌드 테스트
npm install
npm run build

# 성공하면 다시 푸시
git add .
git commit -m "빌드 수정"
git push
```

### 문제 4: 환경 변수가 적용 안 됨

**원인**: Vercel은 환경 변수 변경 시 자동 재배포 안 됨

**해결**:
1. Vercel Dashboard → **Deployments** 탭
2. 최신 배포 선택
3. 오른쪽 메뉴 → **"Redeploy"** 클릭

---

## 📊 로그 확인 방법

### Vercel 로그

```bash
# Vercel CLI 설치
npm install -g vercel

# 실시간 로그 보기
vercel logs your-project-url --follow
```

### Supabase 로그

1. Supabase Dashboard → **Logs** 탭
2. **Database**: SQL 쿼리 확인
3. **API**: RLS 정책 위반 확인

---

## 🔐 배포 전 보안 체크리스트

반드시 확인하세요!

- [ ] `.env` 파일이 GitHub에 업로드 안 됨
- [ ] `NODE_ENV=production` 설정됨
- [ ] `SUPABASE_SERVICE_ROLE_KEY` 설정됨 (ANON_KEY 아님!)
- [ ] `TEST_CHEAT_KEY` 환경 변수 **제거됨** (프로덕션에서 비활성화)
- [ ] CORS가 실제 도메인으로만 제한됨
- [ ] Supabase RLS 정책 활성화됨
- [ ] 데이터베이스 백업 활성화 (Supabase Settings)

---

## 🎉 배포 완료!

축하합니다! 프로덕션 배포가 완료되었습니다.

**배포 URL**: `https://your-project.vercel.app`

**다음 단계:**
1. ✅ 스마트 컨트랙트 배포 (Cronos zkEVM)
2. ✅ Provider 계정 생성
3. ✅ 첫 번째 서비스 등록
4. ✅ 모니터링 설정

**도움이 필요하면:**
- [보안 감사 문서](../audit/EXECUTIVE_SUMMARY.md)
- [프로덕션 체크리스트](../audit/DEPLOYMENT_CHECKLIST.md)
- [문제 해결 가이드](#-자주-발생하는-문제-해결)

---

**마지막 업데이트**: 2026-01-08  
**작성**: Antigravity 개발팀
