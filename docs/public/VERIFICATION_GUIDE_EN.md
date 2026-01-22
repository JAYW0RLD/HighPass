# Service Verification Guide (Using Easy AI Agent)

The fastest and easiest way to verify HighStation's core values (Service Discovery, x402 Payments, and Integrity Verification) is by using the **Easy AI Agent**.

## 🤖 What is Easy AI Agent?
It is a lightweight agent client that implements the HighStation protocol (MCP + x402). You can demonstrate real agent behavior without complex server configurations.

---

## 🏗️ Preparation for Verification

### 1. Wallet and Asset Preparation
- The agent requires **Cronos Testnet USDC.e** for payments.
- **Faucet**: [https://faucet.cronos.org/](https://faucet.cronos.org/) (Select 'USDC' token)

### 2. Run the Agent
Run the following commands in the agent directory.
```bash
cd easy-ai-agent
npm install
npm run start
```

---

## 🧪 Verification Scenario (Step-by-Step)

### Step 1: Service Discovery
- Once the agent is running, it connects to the HighStation Gateway via MCP (Model Context Protocol).
- The list of currently available API services is synchronized with the dashboard and displayed in real-time.

### Step 2: Select Service and Endpoint
- Choose a service to test from the list (e.g., `crypto-price-oracle`).
- Select a specific functionality (Endpoint) provided by the service.

### Step 3: x402 Payment Demonstration
- Upon making an API call, the server returns a `402 Payment Required` response.
- The agent detects this, **automatically generates a payment signature**, and resends the request.
- You can verify that the wallet balance is deducted and real-time settlement logic is triggered.

### Step 4: Verify Results
- Review the final response data, which includes a cryptographic signature (Ed25519).
- Experience the **Trust Score** and data integrity guaranteed by the platform.

---

## 💡 Key Verification Points
- **Payment Automation**: A seamless flow where the AI agent pays and calls the API autonomously.
- **Standard Interface**: Standardized service discovery and integration using MCP.
- **Technical Integrity**: Security and reliability guaranteed throughout the communication process.

> [!TIP]
> For more detailed technical architecture, please refer to the [Technical Architecture](../public/ARCHITECTURE_EN.md).
