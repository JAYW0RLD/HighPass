# 🎬 Quick Demo Guide

## 간단한 데모 방법 (추천!)

### 1. 준비
```bash
# 대시보드 열기
http://localhost:5174
```

### 2. 요청 보내기
```bash
# 간단하게 요청 - 대시보드에서 실시간 확인!
npm run request
```

**예상 결과:**
- 평판이 높으면 → ✅ 200 OK (OPTIMISTIC) - 즉시 데이터 제공
- 빚이 있으면 → ⚠️ 402 PAYMENT REQUIRED
- 평판이 낮으면 → 🚫 403 FORBIDDEN

### 3. 여러 번 실행해보기
```bash
npm run request  # 첫 요청 - Optimistic 승인
npm run request  # 두 번째 - 빚 때문에 차단
npm run request  # 세 번째 - 계속 차단
```

**대시보드에서 실시간으로 확인:**
- Status badge 변화 (`OPTIMISTIC` → `DEBT DUE`)
- Pending Debt 증가
- Activity Log 업데이트
- 알림 팝업

---

## 고급 데모 (온체인 포함)

테스트넷 자금이 있을 때만 사용:

```bash
# 1. 초기화
npm run demo:setup

# 2. 전체 자동 데모
npm run demo
```

---

## 데모 시나리오 예시

### 시나리오 1: Optimistic Payment Flow
```bash
# 1. 첫 요청 (평판 99, 빚 없음)
npm run request
# → 200 OK (OPTIMISTIC)
# → 대시보드: "Identity Verified: Instant Access Granted" 알림

# 2. 두 번째 요청 (빚 있음)
npm run request
# → 402 PAYMENT REQUIRED
# → 대시보드: "DEBT DUE" 배지 표시
```

### 시나리오 2: 수동 curl 사용
```bash
# 직접 curl로 요청
curl -H "X-Agent-ID: 12399" http://localhost:3000/gatekeeper/resource
```

---

## 화면 녹화 팁

1. **Split Screen:**
   - 왼쪽: 터미널 (`npm run request`)
   - 오른쪽: 대시보드 (`localhost:5174`)

2. **연출 순서:**
   ```bash
   npm run request  # 1초 대기 - 대시보드 확인
   npm run request  # 1초 대기 - 대시보드 확인
   npm run request  # 최종 확인
   ```

3. **강조 포인트:**
   - Status badge 색상 변화
   - Pending Debt 숫자 증가
   - 알림 팝업 애니메이션
   - Transaction hash 링크

---

## 트러블슈팅

**Q: 403 Forbidden이 계속 나와요**
```bash
# 평판을 99로 설정 (테스트넷 자금 필요)
npm run verify:cronos
```

**Q: 대시보드가 업데이트 안 돼요**
- 새로고침 (F5)
- 서버 재시작: `npm run start`

**Q: 빚을 초기화하고 싶어요**
```bash
npm run demo:setup
```
