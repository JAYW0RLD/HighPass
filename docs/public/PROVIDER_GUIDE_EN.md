# HighStation Provider Guide

This guide explains how AI Service Providers can register their services on the HighStation infrastructure, receive a **unique gateway (Issuance)**, and monetize their tools through the Trust Layer.

---

## 1. Gateway Issuance

HighStation follows an **Infrastructure Issuance** model, providing an enterprise-grade gateway for every registered service.

### 1-1. The Slug and Uniqueness
When registering, you define a `slug` that becomes the unique identifier for your service within the HighStation ecosystem.
- **Example**: Registering with `slug: text-washer`
- **Issued Domain**: `text-washer.highstation.net` (Production environment)

> [!IMPORTANT]
> **Namespace Protection**: Slugs are exclusive. Once a slug is taken, it cannot be used by others. Even if the same GitHub repository is used, different operators must use distinct slugs (e.g., `text-washer-pro`, `washer-by-alice`).

### 1-2. Registration Steps
1. Login to the Provider Dashboard.
2. Click **"Create New Service"**.
3. Provide the details:
   - **Service Name**: Public name of your tool.
   - **Service Slug**: Your unique subdomain identifier.
   - **Upstream URL**: Your actual API server address (e.g., `https://api.myservice.com`).
   - **Pricing**: Cost per invocation in CRO.

---

## 2. Domain Verification

To ensure only authorized services are proxied, HighStation performs **DNS-based ownership verification**.

### Verification Process
1. **Get Token**: Obtain your unique verification token from the dashboard.
2. **Add DNS Record**:
   - Access your domain management console (for your Upstream URL host).
   - Add a **TXT Record**:
     - **Host**: `@` (or the specific subdomain)
     - **Value**: `highstation-verification={YOUR_TOKEN}`
3. **Run Check**: Click "Verify Domain" in the dashboard.

> [!NOTE]
> In development environments, this step can be bypassed using `localhost` or the `allow_unverified_services` configuration.

---

## 3. Using the Gateway

Once verified, HighStation provides two critical endpoints for your infrastructure.

### 3-1. Public Resource Endpoint (Execution)
This is the URL AI agents use to call your service.
- **URL**: `https://{slug}.highstation.net/v1/resource`
- **Features**:
  - **x402 Protection**: Automatically rejects requests without a valid payment proof (402 Error).
  - **Wildcard Support**: `/v1/resource/extra/path` maps to `upstream/extra/path`.
  - **Query Preservation**: All params (e.g., `?model=gpt4`) are forwarded intact.
  - **Payload**: Supports up to 2MB JSON body.

### 3-2. Service Metadata Endpoint (Discovery)
Used by agents to explore capabilities and verify trust scores.
- **URL**: `https://{slug}.highstation.net/info`
- **Data Provided**:
  - Pricing Policy
  - **Payment Address**: Your Managed Sub-Wallet address.
  - **Trust Signal**: Real-time reliability score (0-100) guaranteed by HighStation.
  - OpenSeal Integrity Hashes.

---

## 4. Managed Settlement System

HighStation operates a **Managed Sub-Wallet** system powered by HD Wallet technology to simplify revenue management.

### 4-1. Dedicated Deposit Addresses
- Upon registration, every provider is automatically assigned a **unique on-chain address**.
- All agent payments are sent directly to this address, allowing you to track revenue on the block explorer in real-time.

### 4-2. Payout Policy
- **Platform Fee**: A **5%** fee is deducted to cover infrastructure maintenance and protocol development.
- **Provider Revenue**: **95%** of all payments are credited to your balance.
- **Withdrawal**:
  - Request withdrawals via the dashboard (Authenticated via Supabase).
  - Simply enter your destination address, and the protocol transfers the funds immediately.

---

## 5. Security Best Practices

We strongly recommend the following layers to protect your Upstream server from unauthorized direct access.

### 5-1. IP Whitelisting
Configure your API server (Upstream) firewall to **only permit incoming traffic from the HighStation Gatekeeper IP**.
- **Result**: Even if a malicious actor finds your raw server address, they cannot bypass the payment layer.

### 5-2. HMAC Signature Verification
HighStation signs every forwarded request for integrity verification.
- **Header**: `x-highstation-signature`
- **Format**: `t=(timestamp),v1=(signature_value)`
- **Verification**: Parse the header and verify it against a shared `Signing Secret` and the request body.
- **Result**: Guarantees the request was processed by HighStation and payment has been confirmed.

---

_HighStation turns your AI API into a trusted pillar of the autonomous agent economy._
