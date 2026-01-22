# SQL 디렉토리 관리 가이드

## 📌 현재 구조 (Hybrid Architecture)

현재 HighStation은 **하이브리드 아키텍처**를 사용합니다.
- **인증 (Auth)**: Supabase Cloud (Data 저장 안 함)
- **데이터 (Data)**: Local N100 PostgreSQL (모든 스키마 및 데이터)

따라서 `sql/n100` 디렉토리의 파일만 유효합니다.

```
sql/
├── README.md                    # 이 파일
├── n100/                        # ✅ Active: 로컬 DB 스키마
│   ├── 00_auth_schema.sql      # 1. Auth Sync Schema (필수)
│   └── schema.sql              # 2. 메인 스키마 (테이블 생성)
└── archive/                     # 🗄️ Archived: 이전 버전 및 레거시
    ├── supabase_legacy/        # 이전 Supabase 전용 설정
    └── ...
```

## 🚀 초기화 방법

로컬 PostgreSQL 컨테이너를 초기화할 때는 다음 순서로 실행합니다:

```bash
# 1. Auth 스키마 (Supabase 동기화용)
docker exec -i highstation_postgres psql -U postgres -d highstation < sql/n100/00_auth_schema.sql

# 2. 메인 스키마
docker exec -i highstation_postgres psql -U postgres -d highstation < sql/n100/schema.sql
```

## ⚠️ 주의사항

- `sql/archive/` 내부의 파일은 **참고용**이며 실제 배포에는 사용되지 않습니다.
- Supabase 대시보드의 SQL Editor는 사용하지 **않습니다**.
