# 🤖 Easy AI Agent: HighStation Protocol Demonstration Tool

This tool is a CLI agent designed to help you quickly and easily experience the **Trust Layer** of the HighStation platform. You can witness the process of exchanging cryptographically verified data in real-time without complex MCP setup.

## ✨ Key Features
- **Automatic Wallet Generation**: Instantly test by creating a temporary ephemeral wallet.
- **MCP Service Discovery**: Automatically discover various AI tools registered on HighStation.
- **x402 Payment Demo**: Step-by-step visualization of the testnet USDC.e payment and signing process upon request.
- **Trust Verification**: Demonstrates ZK (Zero-Knowledge) and OpenSeal verification results provided along with server response data.

## 🚀 Getting Started

### 1. Prerequisites
- **Node.js**: v18 or later must be installed.
- **Testnet Funds**: Cronos Testnet USDC.e is required for test payments.
  - Receive 'USDC' to your wallet address from the [Cronos Faucet](https://faucet.cronos.org/).

### 2. Installation & Execution
```bash
# Install dependencies
npm install

# Run the agent
npm start
```

## 🛠️ Configuration (Optional)
You can customize the following settings by creating a `.env` file:
- `API_BASE_URL`: HighStation gateway address (Default: http://localhost:3000)
- `AGENT_PRIVATE_KEY`: Enter your private key if you want to use an existing wallet.

---
**Note**: This tool is designed for demonstration and learning purposes. For production environments, we recommend using a security-hardened agent wallet or direct SDK integration.
