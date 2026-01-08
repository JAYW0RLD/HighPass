# ⚡ 배포 빠른 참조 카드

**5분 안에 배포하기 - 필수 명령어만 모음**

---

## 🎯 전제 조건

```bash
✅ GitHub 저장소 생성됨
✅ Vercel 계정 있음
✅ Supabase 계정 있음
```

---

## 📝 Supabase 설정 (3분)

### 1. 프로젝트 생성
```
https://app.supabase.com → New Project
```

### 2. SQL 실행
```sql
-- supabase_schema.sql 내용 전체 복사 후 SQL Editor에서 실행
-- Run 버튼 클릭 (Cmd/Ctrl + Enter)
```

### 3. API 키 복사
```
Settings → API → 다음 3개 복사:
- SUPABASE_URL
- SUPABASE_ANON_KEY  
- SUPABASE_SERVICE_ROLE_KEY ⚠️
```

---

## 🚀 Vercel 배포 (2분)

### 1. Import
```
https://vercel.com/new → GitHub 저장소 선택
```

### 2. 환경 변수 설정
```bash
# 필수 (7개)
NODE_ENV=production
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...  # 절대 노출 금지!
RPC_URL=https://rpc-t3.cronos-zkevm.org
CHAIN_ID=240
PAYMENT_HANDLER_ADDRESS=0x...

# 프론트엔드 (2개)
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...

# 추가 (선택)
IDENTITY_CONTRACT_ADDRESS=0x...
ALLOWED_ORIGINS=https://your-domain.vercel.app
```

### 3. Deploy!
```
Deploy 버튼 클릭 → 2-3분 대기 → 완료!
```

---

## ✅ 배포 확인

```bash
# Health check
curl https://your-project.vercel.app/health

# 예상 결과
{"status":"ok","environment":"production"}
```

---

## 🐛 문제 해결

### "Cannot connect to database"
```
원인: SERVICE_ROLE_KEY 누락
해결: Vercel → Settings → Environment Variables 추가 → Redeploy
```

### CORS 에러
```
원인: ALLOWED_ORIGINS 미설정
해결: ALLOWED_ORIGINS=https://정확한도메인.vercel.app → Redeploy
```

### 환경 변수 적용 안 됨
```
원인: Vercel은 env 변경 시 자동 재배포 안 됨
해결: Deployments → Redeploy 클릭
```

---

## 🔐 보안 체크리스트

```bash
# GitHub에 .env 업로드 안 됐는지 확인
git ls-files | grep "\.env$"
# (아무것도 안 나와야 정상)

# Vercel에 SERVICE_ROLE_KEY 설정됐는지 확인
Vercel → Settings → Environment Variables → 확인

# TEST_CHEAT_KEY 제거됐는지 확인
Vercel → Environment Variables → TEST_CHEAT_KEY 없어야 함
```

---

## 📚 자세한 가이드

- 영문: [docs/guides/DEPLOYMENT.md](./DEPLOYMENT.md)
- 한글: [docs/guides/DEPLOYMENT_KR.md](./DEPLOYMENT_KR.md)

---

**긴급 문제?** [트러블슈팅 섹션](./DEPLOYMENT.md#-트러블슈팅) 참조
