# 📜 Project History & Roadmap

This document serves as the single source of truth for the project's evolution, current architectural state, and future milestones.

---

## 🏗️ Current Architecture: v2.0 (Multi-Provider Platform)
**Released:** January 2026

The project has evolved from a single-tenant gatekeeper into a **Multi-Provider Platform** capable of hosting multiple API services with Role-Based Access Control (RBAC).

### Key Features
- **Database**: PostgreSQL (Supabase) replaces local SQLite for scalability and realtime capabilities.
- **Auth & RBAC**: Supabase Auth integration distinguishing between `Admin` (Superuser) and `Provider` (Service Owner).
- **Dynamic Routing**: Middleware dynamically resolves `/gatekeeper/:serviceSlug/resource` to registered services in the DB.
- **Self-Service Portal**: Providers can register APIs, set prices (Wei), and define minimum credit grades.

### Tech Stack
- **Backend**: Node.js, Express, `viem` (Blockchain), `@supabase/supabase-js`.
- **Frontend**: React (Vite), `react-router-dom`, Supabase Auth UI.
- **Infrastructure**: Cronos zkEVM Testnet, Supabase (DB/Auth/Realtime).

---

## ⏳ Changelog

### v2.0.3 - Critical Security Fixes (Latest)
- **[SECURITY] Replay Attack Fixed**: Implemented atomic transaction hash locking to prevent double-spending race condition.
    - Added UNIQUE constraint on `tx_hash` in database schema.
    - Modified `logRequest()` to support UPSERT for atomic claiming.
    - Returns HTTP 409 if concurrent duplicate transaction detected.
- **[SECURITY] Information Leakage Fixed**: Removed `upstream_url` exposure from API responses.
- **[SECURITY] Cheat Mode Hardening**: 
    - Completely disabled in production environments.
    - Enforced 32+ character minimum key length.
    - Added attack detection logging for production cheat attempts.
- **[SECURITY] Weak Secret Fallback Removed**: Server now fails to start if `SUPABASE_SERVICE_ROLE_KEY` is missing.
- **[AUDIT] Security Rating**: Improved from 4/10 to 9/10 (Production Ready).

### v2.0.2 - Red Team & Testability
- **[FEATURE] Safe Cheat Mode**: Implemented secure testing capability via `TEST_CHEAT_KEY` env var.
    - **Purpose**: Allows testing "Grade A" behaviors without complex on-chain verification setup.
    - **Security**: Strictly controlled by server-side env var; inactive by default.
    - **Header**: `X-Test-Cheat-Key: <YOUR_KEY>`
- **[FIX] Service Resolver Hardening**: Patch for potential Path Traversal vulnerability in service slugs.
- **[AUDIT] Race Condition Discovered**: Identified "Double Spending" vector in replay protection (Fix Scheduled).
- **[SECURITY] Backdoor Removal**: Removed all hardcoded "Demo Agent" logic from codebase.

### v2.0.1 - Security Hardening (Red Team Audit)
- **[FIX] Replay Attack**: Implemented duplicate transaction hash detection in `optimisticPayment.ts`.
- **[FIX] Identity Spoofing**: Implemented `X-Agent-Signature` verification using `viem`.
- **[FIX] Service Enumeration**: Restricted public access to sensitive service data using DB Views.
- **[DOCS] Security Report**: Detailed findings available in `docs/audit/FINAL_REVIEW.md`.

### v2.0 - Role-Based Multi-Provider Upgrade
- **[NEW] Multi-Tenancy**: Added `profiles` and `services` tables to support multiple providers.
- **[NEW] Dynamic Middleware**: `serviceResolver` middleware replaces static routing, enabling runtime service configuration.
- **[NEW] Provider Portal**: Dedicated dashboard for providers to manage their APIs and view metrics.
- **[NEW] Admin Dashboard**: Global view of protocol fees and overall ecosystem health.
- **[SECURITY] RLS Policies**: Row Level Security enabled to isolate provider data.

### v1.2 - Supabase Migration
- **[MIGRATION] PostgreSQL**: Migrated from SQLite to Supabase.
- **[NEW] Realtime Activity**: Dashboard now uses Supabase Realtime for instant request logging.
- **[FIX] Persistence**: Solved issue where credit grades and debts were lost on server restart.

### v1.1 - Agent Credit Rating System
- **[NEW] Credit Scoring**: Implemented `IdentityService` to map reputation scores to A-F grades.
- **[NEW] Access Policies**:
    - **Grade A/B**: Optimistic Access (Pay Later).
    - **Grade C**: Upfront Payment Required.
    - **Grade F**: Access Denied.
- **[DEV] Local Anvil Fork**: Integrated local testnet fork for rapid development.

### v1.0 - Initial Release (X402 Gatekeeper)
- **[CORE] PaymentHandler**: Basic ERC-20 payment verification.
- **[CORE] Dashboard**: Simple React dashboard polling for logs.
- **[CORE] SQLite**: Local file-based storage.

---

## 🚀 Roadmap (Upcoming Updates)

### v2.1 - Revenue & Integration (In Progress)
- **[UI] Revenue Dashboard**: Visual breakdown of Protocol Fees (0.5%) vs Provider Revenue.
- **[DX] Integration Guide**: "Agent Builder" tab in Provider Portal with auto-generated code snippets (TypeScript/Python) for connecting to services.
- **[SMART CONTRACT] Split Payment**: Implement automated fee splitting on-chain (currently logic-based).

### v2.2 - Production Hardening (Planned)
- **[OPS] Docker Compose**: Full containerization for easy deployment.
- **[OPS] CI/CD Pipeline**: Automated testing and deployment workflows.
- **[SECURITY] Rate Limiting**: Per-service/Per-tier rate limiting updates.
