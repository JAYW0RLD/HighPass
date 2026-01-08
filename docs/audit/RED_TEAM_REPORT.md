# 🚩 Red Team Audit Report
**Date:** 2026-01-08
**Auditor:** Antigravity (Red Team)
**Target:** x402-gatekeeper (v2.0.2)

## 🚨 Critical Vulnerabilities

### 1. Replay Attack / Double Spending (Race Condition)
- **Severity:** **CRITICAL**
- **Location:** `src/middleware/optimisticPayment.ts` & `src/middleware/logger.ts`
- **Description:** 
  The system relies on `isTxHashUsed(token)` to prevent replay attacks. However, this function checks the `requests` table, which is only populated **asynchronously** after the request completes (via `res.on('finish')` in `logger.ts`).
- **Exploit Scenario:**
  1. Attacker sends **Request A** with valid Payment Token X.
  2. `optimisticPaymentCheck` checks DB: Token X not found (Valid).
  3. Processing continues.
  4. Attacker immediately sends **Request B** with same Token X (simultaneously).
  5. `optimisticPaymentCheck` checks DB: Token X *still* not found (Request A hasn't finished logging yet).
  6. Request B is also accepted.
  7. Attacker gets double credit/access for single payment.

### 2. Sensitive Information Leakage (SSRF / Info Disclosure)
- **Severity:** **HIGH**
- **Location:** `src/server.ts` (Line 99)
- **Description:**
  The `serviceResolver` middleware fetches the `upstream_url` (the hidden API URL). However, `server.ts` explicitly returns this URL to the client in the JSON response:
  ```typescript
  target: config?.upstream_url || "Local",
  ```
- **Impact:** 
  If the `upstream_url` contains secrets (e.g., `https://api.openai.com/v1?key=sk-...`) or points to an internal network address (e.g., `http://10.0.0.5:8080`), this information is leaked to every user.

## ⚠️ High/Medium Risks

### 3. "Safe" Cheat Mode Backend
- **Severity:** **HIGH**
- **Location:** `src/middleware/creditGuard.ts`
- **Description:**
  Authentication logic contains a backdoor activated by `TEST_CHEAT_KEY`.
  ```typescript
  if (req.headers['x-test-cheat-key'] === process.env.TEST_CHEAT_KEY) ...
  ```
  If this key is weak, leaked, or set to a default value in production, any attacker can bypass signature verification and gain "Grade A" access.

### 4. RLS Bypass & Privilege Escalation
- **Severity:** **MEDIUM**
- **Location:** `src/middleware/serviceResolver.ts`
- **Description:**
  The `serviceResolver` creates a Supabase client using `SUPABASE_SERVICE_ROLE_KEY` to read service configurations.
  ```typescript
  const adminDb = createClient(..., process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY);
  ```
  It blindly trusts code execution context. While required for the proxy to work, relying on this "God Mode" client for read operations increases the blast radius if the server is compromised (SSRF/RCE).

### 5. Weak Secret Fallback
- **Severity:** **MEDIUM**
- **Location:** `src/database/db.ts`
- **Description:**
  If `SUPABASE_SERVICE_ROLE_KEY` is missing, the code falls back to `SUPABASE_ANON_KEY`.
  ```typescript
  const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || SUPABASE_ANON_KEY;
  ```
  This is dangerous. The anonymity key usually has restricted RLS permissions. If the app silently runs with lower privileges, it might fail in unexpected ways or, conversely, if the ANON key has too *much* power (misconfigured RLS), it exposes the DB to public users.

---

## 🛡️ Recommended Fixes

1.  **Fix Replay Attack:** Implement an atomic `insert` or `set` operation in Redis or DB *before* verifying/processing the payment. Do NOT rely on the logger.
2.  **Stop Leaking Upstream URLs:** Remove `target: config?.upstream_url` from the API response in `server.ts`.
3.  **Harden Cheat Mode:** Ensure `TEST_CHEAT_KEY` is checked against a high-entropy value and potentially disabled entirely in `NODE_ENV=production`.
4.  **Enforce Key Requirements:** Fail startup if `SERVICE_ROLE_KEY` is missing; do not fallback to `ANON_KEY`.
