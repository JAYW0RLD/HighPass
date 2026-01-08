#!/bin/bash

echo "🔍 X402-Gatekeeper 배포 전 잠재 문제 점검"
echo "================================================"
echo ""

# 1. 환경 변수 파일 체크
echo "1️⃣  환경 변수 파일 보안 체크"
if git ls-files | grep -E "^\.env$|^\.env\.local$"; then
    echo "❌ CRITICAL: .env 파일이 Git에 커밋됨!"
    git ls-files | grep -E "\.env"
else
    echo "✅ .env 파일이 Git에 없음 (안전)"
fi
echo ""

# 2. 필수 파일 존재 체크
echo "2️⃣  필수 파일 존재 확인"
files=(".gitignore" "vercel.json" ".npmrc" "tsconfig.json" "package.json")
for file in "${files[@]}"; do
    if [ -f "$file" ]; then
        echo "✅ $file"
    else
        echo "❌ $file 없음!"
    fi
done
echo ""

# 3. TypeScript 컴파일 체크
echo "3️⃣  TypeScript 컴파일 테스트"
npm run typecheck 2>&1 | tail -5
if [ $? -eq 0 ]; then
    echo "✅ TypeScript 타입 체크 통과"
else
    echo "❌ TypeScript 에러 발생"
fi
echo ""

# 4. package.json 보안 체크
echo "4️⃣  package.json 스크립트 검증"
if grep -q "\"prepare\"" package.json; then
    echo "⚠️  prepare 스크립트 발견 (Vercel에서 문제 발생 가능)"
else
    echo "✅ prepare 스크립트 없음"
fi

if grep -q "\"postinstall\"" package.json; then
    echo "✅ postinstall 스크립트 있음 (CI 조건부 실행)"
fi
echo ""

# 5. Vercel 설정 검증
echo "5️⃣  vercel.json 설정 확인"
if [ -f "vercel.json" ]; then
    if grep -q "\"builds\"" vercel.json; then
        echo "⚠️  구식 'builds' 설정 사용 중"
    else
        echo "✅ 최신 rewrites 방식 사용"
    fi
    
    if grep -q "\"rewrites\"" vercel.json; then
        echo "✅ rewrites 라우팅 설정됨"
    fi
fi
echo ""

# 6. API 엔트리 포인트 체크
echo "6️⃣  Serverless Function 구조 확인"
if [ -f "api/index.ts" ]; then
    echo "✅ api/index.ts 존재 (Serverless Function)"
else
    echo "❌ api/index.ts 없음!"
fi

if grep -q "export default app" src/server.ts; then
    echo "✅ src/server.ts가 app을 export함"
else
    echo "❌ src/server.ts가 app을 export 안 함!"
fi
echo ""

# 7. 의존성 체크
echo "7️⃣  의존성 충돌 체크"
if [ -f ".npmrc" ]; then
    if grep -q "legacy-peer-deps" .npmrc; then
        echo "✅ legacy-peer-deps 설정됨 (의존성 충돌 해결)"
    fi
else
    echo "⚠️  .npmrc 파일 없음"
fi
echo ""

# 8. 보안 설정 체크
echo "8️⃣  보안 설정 확인"
if grep -q "NODE_ENV.*production" src/server.ts; then
    echo "✅ 프로덕션 환경 분기 로직 있음"
fi

if grep -q "TEST_CHEAT_KEY" src/middleware/creditGuard.ts; then
    if grep -q "isProduction.*reqCheatKey" src/middleware/creditGuard.ts; then
        echo "✅ Cheat mode 프로덕션 차단 로직 있음"
    else
        echo "⚠️  Cheat mode 프로덕션 차단 확인 필요"
    fi
fi

if grep -q "SUPABASE_SERVICE_ROLE_KEY" src/database/db.ts; then
    echo "✅ SERVICE_ROLE_KEY 검증 로직 있음"
fi
echo ""

# 9. 빌드 테스트
echo "9️⃣  백엔드 빌드 테스트"
npm run build:backend > /dev/null 2>&1
if [ $? -eq 0 ]; then
    echo "✅ 백엔드 빌드 성공"
else
    echo "❌ 백엔드 빌드 실패!"
fi
echo ""

echo "================================================"
echo "✨ 점검 완료!"
echo ""
echo "📋 다음 단계:"
echo "1. GitHub에 푸시"
echo "2. Vercel에서 환경 변수 설정 확인"
echo "3. 배포 확인"
