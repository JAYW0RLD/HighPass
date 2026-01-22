# Custom Domain 설정 가이드

## 개요

HighStation은 **Cloudflare 방식**의 Custom Domain을 지원합니다. 사용자는 자신의 도메인(예: `api.example.com`)을 그대로 사용하면서 HighStation의 신뢰 레이어(OpenSeal 검증, x402 결제)를 투명하게 적용할 수 있습니다.

---

## 🎯 지원 방식

### 1. Custom Domain (사용자 도메인)
```
api.example.com → CNAME → highstation.net
```

**장점**:
- 브랜드 일관성 유지
- 기존 클라이언트 코드 수정 불필요
- SEO 친화적

### 2. Subdomain (HighStation 서브도메인)
```
myservice.highstation.net
```

**장점**:
- DNS 설정 불필요
- 즉시 사용 가능
- 테스트용으로 이상적

### 3. Legacy Path (기존 방식)
```
highstation.net/gatekeeper/:slug/resource/*
```

**호환성**: 기존 통합을 위한 하위 호환성 지원

---

## 📋 Custom Domain 설정 단계

### Step 1: 서비스 등록

HighStation Dashboard에서 서비스를 등록합니다.

```json
{
  "name": "My API Service",
  "slug": "myapi",
  "upstream_url": "https://origin-api.example.com",
  "custom_domain": "api.example.com"
}
```

### Step 2: DNS 설정

도메인 DNS 관리 페이지에서 CNAME 레코드를 추가합니다.

**Cloudflare 예시:**
```dns
Type: CNAME
Name: api (또는 @)
Target: highstation.net
Proxy Status: DNS only (프록시 비활성화)
TTL: Auto
```

**기타 DNS 제공자:**
- Name.com, Namecheap, GoDaddy 등 모두 동일한 방식

### Step 3: 도메인 검증

HighStation이 자동으로 DNS 레코드를 확인합니다.

```bash
# DNS 전파 확인 (1-5분 소요)
dig api.example.com CNAME

# 예상 출력:
# api.example.com.  300  IN  CNAME  highstation.net.
```

### Step 4: 테스트

```bash
curl -H "Authorization: Bearer $PAYMENT_TOKEN" \
     https://api.example.com/endpoint
```

**응답 예시:**
```json
{
  "result": "...",
  "_gatekeeper": {
    "service": "My API Service",
    "mode": "Domain-based x402",
    "source": "custom_domain",
    "telemetry": {
      "latency_ms": 45
    }
  }
}
```

---

## 🔧 로컬 개발 환경 설정

로컬에서 Custom Domain을 테스트하려면 `/etc/hosts`를 수정합니다.

```bash
sudo nano /etc/hosts
```

추가할 내용:
```
127.0.0.1  api.example.local
```

테스트:
```bash
curl -H "Host: api.example.local" \
     -H "Authorization: Bearer $TOKEN" \
     http://localhost:3000/endpoint
```

---

## 🛡️ 보안 고려사항

### HTTPS 필수
프로덕션 환경에서는 **반드시 HTTPS**를 사용해야 합니다.

```javascript
// HighStation은 자동으로 HTTPS 강제
if (process.env.NODE_ENV === 'production' && req.protocol !== 'https') {
    res.redirect(301, `https://${req.headers.host}${req.url}`);
}
```

### SSL/TLS 인증서
Custom Domain 사용 시 SSL 인증서는 **사용자가 직접 관리**하거나 Cloudflare Proxy를 활성화하세요.

**옵션 1: Let's Encrypt (무료)**
```bash
certbot certonly --dns-route53 -d api.example.com
```

**옵션 2: Cloudflare Proxy 활성화**
- DNS 설정에서 "Proxy Status: Proxied" 선택
- 무료 SSL 자동 적용

---

## 🚨 문제 해결

### DNS 전파 지연
**증상**: `NXDOMAIN` 또는 연결 실패

**해결**:
```bash
# DNS 캐시 플러시
sudo systemd-resolve --flush-caches  # Linux
dscacheutil -flushcache              # macOS

# 전파 확인 (최대 24시간 소요)
dig api.example.com +trace
```

### 404 Not Found
**증상**: HighStation이 서비스를 찾지 못함

**해결**:
1. Dashboard에서 `custom_domain` 필드 확인
2. 서비스 상태가 `verified`인지 확인
3. 로그 확인:
```bash
docker logs highstation_server | grep DomainResolver
```

### OpenSeal 검증 실패
**증상**: `openseal.verified: false`

**해결**:
1. `openseal_root_hash`가 올바르게 등록되었는지 확인
2. upstream 서버가 OpenSeal Runtime을 사용하는지 확인
3. `X-OpenSeal-Seal` 헤더가 포함되어 있는지 확인

---

## 💡 Best Practices

### 1. 스테이징 환경 사용
```
staging-api.example.com → CNAME → highstation.net
```

### 2. 모니터링 설정
```javascript
// 텔레메트리 활성화
const response = await fetch('https://api.example.com/data');
const telemetry = response.headers.get('x-highstation-telemetry');
console.log(JSON.parse(telemetry));
```

### 3. Fallback 구성
```javascript
// Custom Domain 실패 시 Legacy Path로 fallback
const endpoints = [
    'https://api.example.com',
    'https://highstation.net/gatekeeper/myapi/resource'
];
```

---

## 📊 비교표

| 항목 | Custom Domain | Subdomain | Legacy Path |
|------|--------------|-----------|-------------|
| **DNS 설정** | 필요 | 불필요 | 불필요 |
| **브랜딩** | ✅ 최상 | ⚠️ HighStation 포함 | ❌ 경로 노출 |
| **즉시 사용** | ❌ DNS 전파 대기 | ✅ 즉시 | ✅ 즉시 |
| **SSL 관리** | 사용자 | HighStation | HighStation |
| **추천 용도** | 프로덕션 | 개발/테스트 | 레거시 호환 |

---

## 🔗 관련 문서

- [Provider Guide](./PROVIDER_GUIDE_KR.md)
- [OpenSeal Integration](./OPENSEAL_INTEGRITY_GUIDE_KR.md)
- [Architecture](./ARCHITECTURE_KR.md)
