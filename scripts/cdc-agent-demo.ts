
import { createWalletClient, http, formatEther, createPublicClient } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { cronosTestnet } from 'viem/chains';
import axios from 'axios';
import * as fs from 'fs';
import * as path from 'path';

// --------------------------------------------------------------------------
// MOCK: Crypto.com AI Agent SDK Structure
// This simulates how a developer using the CDC SDK would integrate HighStation
// --------------------------------------------------------------------------

const WALLET_FILE = path.join(__dirname, 'agent-wallet.json');

// Colors for Demo Output
const RESET = "\x1b[0m";
const CYAN = "\x1b[36m";
const GREEN = "\x1b[32m";
const YELLOW = "\x1b[33m";
const RED = "\x1b[31m";
const DIM = "\x1b[2m";

async function main() {
    console.log(`${CYAN}🤖 Crypto.com AI Agent x HighStation Integration Demo${RESET}`);
    console.log(`${DIM}---------------------------------------------------${RESET}`);

    // 1. Load Agent Identity (CDC SDK Wallet Standard)
    if (!fs.existsSync(WALLET_FILE)) {
        console.error(`${RED}❌ Wallet not found! Run 'npx ts-node scripts/create-agent.ts' first.${RESET}`);
        process.exit(1);
    }
    const walletData = JSON.parse(fs.readFileSync(WALLET_FILE, 'utf-8'));
    const account = privateKeyToAccount(walletData.privateKey);
    console.log(`🔹 Agent Identity: ${YELLOW}${account.address}${RESET}`);

    // Create Viem Clients (Standard EVM Tooling used by CDC SDK)
    const walletClient = createWalletClient({ account, chain: cronosTestnet, transport: http() });
    const publicClient = createPublicClient({ chain: cronosTestnet, transport: http() });

    // 2. Define HighStation-Enabled Capability
    // This function wraps the SDK's standard HTTP call with X402 capabilities
    const callPaidService = async (method: string, url: string, body: any = {}) => {
        const timestamp = Date.now().toString();
        const nonce = Math.floor(Math.random() * 1000000).toString();

        // Identity Proof (EIP-191)
        const message = `Identify as ${account.address} at ${timestamp} with nonce ${nonce}`;
        const signature = await account.signMessage({ message });

        const headers: any = {
            'Content-Type': 'application/json',
            'x-agent-id': account.address,
            'x-auth-timestamp': timestamp,
            'x-auth-nonce': nonce,
            'x-agent-signature': signature
        };

        console.log(`\n📡 Calling [${method}] ${url}...`);

        try {
            const response = await axios({ method, url, data: body, headers });
            return response; // Success (200 OK)
        } catch (error: any) {
            // 3. Handle X402 Payment Flow
            if (error.response?.status === 402) {
                console.log(`${YELLOW}⛔ 402 Payment Required intercepted by CDC Agent SDK Plugin${RESET}`);

                const authHeader = error.response.headers['www-authenticate'];
                const debtAmount = BigInt(error.response.data.debtAmount || '0');

                // Parse Receiver
                let receiver = process.env.PAYMENT_HANDLER_ADDRESS;
                if (authHeader && authHeader.includes('receiver="')) {
                    receiver = authHeader.split('receiver="')[1].split('"')[0];
                }

                if (!debtAmount || !receiver) throw new Error("Invalid 402 Response");

                console.log(`${CYAN}💸 Auto-Settling ${formatEther(debtAmount)} CRO to ${receiver}...${RESET}`);

                // Execute On-Chain Transaction (Native CDC Chain Function)
                const hash = await walletClient.sendTransaction({
                    account,
                    to: receiver as `0x${string}`,
                    value: debtAmount
                });
                console.log(`✔ Tx Sent: ${DIM}${hash}${RESET}`);

                console.log(`⏳ Waiting for block confirmation...`);
                await publicClient.waitForTransactionReceipt({ hash });

                // Retry with Proof
                console.log(`🔄 Retrying with Payment Proof (Token ${hash.slice(0, 10)}...)...`);
                headers['Authorization'] = `Token ${hash}`;

                const retryResponse = await axios({ method, url, data: body, headers });
                console.log(`${GREEN}✅ Payment Verified! Access Granted.${RESET}`);
                return retryResponse;
            }
            throw error;
        }
    };

    // 4. Run the Demo Scenario
    // Target: HighStation Demo Echo Service
    const TARGET_URL = 'https://high-pass-ashy.vercel.app/gatekeeper/demo-vy09vs/resource';

    try {
        const result = await callPaidService('POST', TARGET_URL, {
            message: "Hello from Crypto.com Agent SDK!"
        });

        console.log(`${DIM}---------------------------------------------------${RESET}`);
        console.log(`${GREEN}RESPONSE:${RESET}`, result.data);
        console.log(`${CYAN}✨ Demo Scenario Complete!${RESET}`);

    } catch (e: any) {
        console.error(`${RED}❌ Demo Failed:${RESET}`, e.message);
        if (e.response) console.error(e.response.data);
    }
}

main();
