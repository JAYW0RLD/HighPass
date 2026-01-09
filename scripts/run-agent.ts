
import axios from 'axios';
import { privateKeyToAccount } from 'viem/accounts';
import * as fs from 'fs';
import * as path from 'path';

const WALLET_FILE = path.join(__dirname, 'agent-wallet.json');

// Colors
const RESET = "\x1b[0m";
const CYAN = "\x1b[36m";
const GREEN = "\x1b[32m";
const YELLOW = "\x1b[33m";
const RED = "\x1b[31m";
const DIM = "\x1b[2m";

function logStep(step: string, detail: string) {
    console.log(`${CYAN}➤ ${step}${RESET} ${DIM}${detail}${RESET}`);
}

async function main() {
    console.log(`\n🤖 ${GREEN}AGENT AI ACTIVATED${RESET}`);
    console.log("===============================");

    // 1. Load Wallet
    if (!fs.existsSync(WALLET_FILE)) {
        console.error(`${RED}❌ Wallet not found! Run 'npx ts-node scripts/create-agent.ts' first.${RESET}`);
        process.exit(1);
    }

    const walletData = JSON.parse(fs.readFileSync(WALLET_FILE, 'utf-8'));
    const account = privateKeyToAccount(walletData.privateKey);
    const agentId = account.address;

    logStep("Identity Loaded", agentId);

    // 2. Check Service
    // Support custom URL from CLI: npx ts-node scripts/run-agent.ts [URL]
    const customUrl = process.argv[2];
    const baseUrl = customUrl || 'http://localhost:3000';

    // Ensure URL doesn't end with slash
    const cleanBaseUrl = baseUrl.replace(/\/$/, '');

    const targetService = 'echo-service';
    const endpoint = `${cleanBaseUrl}/gatekeeper/${targetService}/resource`;

    logStep("Target Acquired", endpoint);

    // 3. Prepare Request (Auth)
    const timestamp = Date.now().toString();
    const nonce = Math.floor(Math.random() * 1000000).toString();
    const message = `Identify as ${agentId} at ${timestamp} with nonce ${nonce}`;

    logStep("Generating Proof", `Nonce: ${nonce}`);

    // Sign
    const signature = await account.signMessage({ message });
    logStep("Signing Request", `${YELLOW}${signature.substring(0, 20)}...${RESET}`);

    // 4. Send Request
    console.log(`\n${DIM}📡 Transmitting data to Gatekeeper...${RESET}`);

    try {
        const startTime = Date.now();
        const response = await axios.get(endpoint, {
            headers: {
                'x-agent-id': agentId,
                'x-agent-signature': signature,
                'x-auth-timestamp': timestamp,
                'x-auth-nonce': nonce
            }
        });
        const latency = Date.now() - startTime;

        console.log(`\n${GREEN}✅ ACCESS GRANTED${RESET} (${latency}ms)`);
        console.log("-------------------------------");

        // Print Data
        console.log(`${CYAN}Data Received:${RESET}`, response.data);

        // Check Payment Status
        if (response.data._gatekeeper?.optimistic) {
            console.log(`\n${YELLOW}💳 NOTE: Optimistic Payment Mode${RESET}`);
            console.log("   Your reputation allowed you to pay later (Debt recorded).");
        } else {
            console.log(`\n${GREEN}💰 Payment Settled / Verified${RESET}`);
        }

    } catch (error: any) {
        console.log(`\n${RED}⛔ ACCESS DENIED${RESET}`);
        if (error.response) {
            console.log(`Status: ${error.response.status}`);
            console.log(`Reason: ${JSON.stringify(error.response.data.error || error.response.data)}`);

            if (error.response.status === 402) {
                console.log(`\n${YELLOW}💡 Tip: You need to pay your debt or top up balance!${RESET}`);
            }
        } else {
            console.log(error.message);
        }
    }
    console.log("");
}

main();
