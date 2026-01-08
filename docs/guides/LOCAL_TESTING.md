# How to Run Local Testing (Anvil Fork Mode)

Anvil Fork mode allows you to run a local copy of the Cronos zkEVM Testnet. This is useful for testing without spending real TCRO and with faster response times.

## Prerequisites
- No additional setup required if you have `anvil` installed (included with Foundry).

## Step 1: Start the Local Fork
Open a new terminal and run:
```bash
npm run test:node
```
This will start an Anvil instance on `http://127.0.0.1:8545` that forks the Cronos Testnet.

## Step 2: Configure the Gatekeeper
The system is configured to automatically load `.env.local` if it exists. 
The provided `.env.local` already points to the local node:
```env
RPC_URL=http://127.0.0.1:8545
CHAIN_ID=240
```

## Step 3: Run the Server
Restart the Gatekeeper API:
```bash
npm run start
```
You should see: `[Server] Loaded local environment configuration`.

## Step 4: Verify
1. Check the health endpoint: `http://localhost:3000/health`
2. Perform requests as usual. The Gatekeeper will now communicate with your local Anvil node instead of the public RPC.

## Benefits
- **Speed:** Local RPC calls are near-instant.
- **Cost:** Zero TCRO consumed.
- **State:** All existing contracts on testnet are discoverable on your local fork.
