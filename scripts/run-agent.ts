
import axios from 'axios';
import { privateKeyToAccount } from 'viem/accounts';
import { createPublicClient, http, formatEther } from 'viem';
import { cronosTestnet } from 'viem/chains';
import * as fs from 'fs';
import * as path from 'path';
import * as readline from 'readline';

const WALLET_FILE = path.join(__dirname, 'agent-wallet.json');

// Colors
const RESET = "\x1b[0m";
const CYAN = "\x1b[36m";
const GREEN = "\x1b[32m";
const YELLOW = "\x1b[33m";
const RED = "\x1b[31m";
const DIM = "\x1b[2m";
const BOLD = "\x1b[1m";

// State
let agentAccount: any;
let targetUrl: string = 'http://localhost:3000';
let currentBalance: string = 'Unknown';

// Setup Readline
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

const ask = (query: string): Promise<string> => {
    return new Promise(resolve => rl.question(query, resolve));
};

function clearScreen() {
    console.clear();
}

function printHeader() {
    clearScreen();
    console.log(`${CYAN}${BOLD}`);
    console.log(`   ▄▄▄       ▄▄ • ▄▄▄ . ▐ ▄ ▄▄▄▄▄`);
    console.log(`  ▀▄ █·▪     ▐█ ▀ ▪▀▄.▀·•█▌▐█•██  `);
    console.log(`  ▐▀▀▄  ▄█▀▄ ▄█ ▀█▄▐▀▀▪▄▐█▐▐▌ ▐█.▪`);
    console.log(`  ▐█•█▌▐█▌.▐▌▐█▄▪▐█▐█▄▄▌██▐█▌ ▐█▌·`);
    console.log(`  .▀  ▀ ▀█▄▀▪·▀▀▀▀  ▀b▀ ▀▀ █▪ ▀▀▀ `);
    console.log(`${RESET}`);
    console.log(`${DIM}  HighStation Agent Simulator v2.0${RESET}\n`);

    console.log(`${YELLOW}⚡ AGENT PROFILE${RESET}`);
    console.log(`   ${DIM}ID:${RESET}      ${agentAccount.address}`);
    console.log(`   ${DIM}Balance:${RESET} ${currentBalance === 'Unknown' ? DIM + currentBalance : GREEN + currentBalance + ' CRO'}${RESET}`);
    console.log(`   ${DIM}Target:${RESET}  ${targetUrl}`);
    console.log(`   ${DIM}Status:${RESET}  ${GREEN}ONLINE${RESET}`);
    console.log("----------------------------------------");
}

async function loadWallet() {
    if (!fs.existsSync(WALLET_FILE)) {
        console.error(`${RED}❌ Wallet not found!${RESET}`);
        console.error("Please run: npx ts-node scripts/create-agent.ts");
        process.exit(1);
    }
    const walletData = JSON.parse(fs.readFileSync(WALLET_FILE, 'utf-8'));
    agentAccount = privateKeyToAccount(walletData.privateKey);
}

async function fetchBalance() {
    console.log(`\n${DIM}🔄 Fetching balance from Cronos Testnet...${RESET}`);
    try {
        const client = createPublicClient({
            chain: cronosTestnet,
            transport: http()
        });
        const balanceWei = await client.getBalance({ address: agentAccount.address });
        currentBalance = formatEther(balanceWei);
    } catch (e) {
        currentBalance = "Error fetching";
    }
}

async function sendRequest() {
    console.log(`\n${YELLOW}📡 INITIATING API REQUEST SEQUENCE...${RESET}`);

    // Auth Headers
    const timestamp = Date.now().toString();
    const nonce = Math.floor(Math.random() * 1000000).toString();
    const message = `Identify as ${agentAccount.address} at ${timestamp} with nonce ${nonce}`;

    console.log(`${DIM}   ├─ Gen Nonce:${RESET} ${nonce}`);
    console.log(`${DIM}   ├─ Signing...${RESET}`);
    const signature = await agentAccount.signMessage({ message });

    const cleanBaseUrl = targetUrl.replace(/\/$/, '');
    const endpoint = `${cleanBaseUrl}/gatekeeper/echo-service/resource`;

    console.log(`${DIM}   └─ Sending to:${RESET} ${endpoint}`);

    try {
        const startTime = Date.now();
        const response = await axios.get(endpoint, {
            headers: {
                'x-agent-id': agentAccount.address,
                'x-agent-signature': signature,
                'x-auth-timestamp': timestamp,
                'x-auth-nonce': nonce
            }
        });
        const latency = Date.now() - startTime;

        console.log(`\n${GREEN}✅ ACCESS GRANTED${RESET} ${DIM}(${latency}ms)${RESET}`);
        console.log(`${DIM}────────────────────────────────────────${RESET}`);
        console.log(response.data);
        console.log(`${DIM}────────────────────────────────────────${RESET}`);

        if (response.data._gatekeeper?.optimistic) {
            console.log(`${YELLOW}💳 Payment: POSTPAID (Optimistic Mode)${RESET}`);
        } else {
            console.log(`${GREEN}💰 Payment: SETTLED${RESET}`);
        }

    } catch (error: any) {
        console.log(`\n${RED}⛔ REQUEST FAILED${RESET}`);
        if (error.response) {
            console.log(`${RED}[${error.response.status}] ${JSON.stringify(error.response.data.error || error.response.data)}${RESET}`);
            if (error.response.status === 402) console.log(`${YELLOW}💡 Reason: Payment Required (Insufficient Info/Funds)${RESET}`);
        } else {
            console.log(`${RED}${error.message}${RESET}`);
        }
    }
}

async function main() {
    await loadWallet();

    // Parse Initial Args
    if (process.argv[2]) {
        targetUrl = process.argv[2];
    }

    while (true) {
        printHeader();
        console.log(`\n${BOLD}COMMANDS:${RESET}`);
        console.log(`  ${CYAN}[1]${RESET} 💰 Check Wallet Balance`);
        console.log(`  ${CYAN}[2]${RESET} 📡 Send API Request`);
        console.log(`  ${CYAN}[3]${RESET} ⚙️  Set Target URL`);
        console.log(`  ${CYAN}[4]${RESET} 🚪 Exit`);

        const choice = await ask(`\n${GREEN}agent@highstation:~${RESET}$ `);

        switch (choice.trim()) {
            case '1':
                await fetchBalance();
                await ask(`\n${DIM}Press ENTER to continue...${RESET}`);
                break;
            case '2':
                await sendRequest();
                await ask(`\n${DIM}Press ENTER to continue...${RESET}`);
                break;
            case '3':
                const newUrl = await ask(`\nEnter new base URL (current: ${targetUrl}): `);
                if (newUrl) targetUrl = newUrl;
                break;
            case '4':
                console.log(`\n${GREEN}👋 Agent shutting down. Goodbye!${RESET}`);
                process.exit(0);
                break;
            default:
                // Just refresh
                break;
        }
    }
}

main();
