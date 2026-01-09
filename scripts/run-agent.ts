
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
let targetUrl: string = '';
let targetMethod: string = 'GET';
let currentBalance: string = 'Unknown';
let currentGrade: string = 'Checking...';

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

function parseTarget(input: string) {
    const parts = input.trim().split(' ');
    if (parts.length >= 2) {
        // e.g. "POST https://..."
        const potentialMethod = parts[0].toUpperCase();
        if (['GET', 'POST', 'PUT', 'DELETE'].includes(potentialMethod)) {
            targetMethod = potentialMethod;
            targetUrl = parts[1];
        } else {
            targetMethod = 'GET';
            targetUrl = parts[0];
        }
    } else {
        targetMethod = 'GET';
        targetUrl = parts[0];
    }
}

function printHeader() {
    clearScreen();
    console.log(`${CYAN}${BOLD}`);
    console.log(`   HighStation Agent Simulator v2.6`);
    console.log(`${RESET}`);
    console.log(`${DIM}  Real-World Testnet Edition${RESET}\n`);

    let gradeColor = DIM;
    if (currentGrade === 'A') gradeColor = GREEN;
    if (currentGrade === 'B') gradeColor = YELLOW;
    if (currentGrade === 'C') gradeColor = RED;

    console.log(`${YELLOW}⚡ AGENT PROFILE${RESET}`);
    console.log(`   ${DIM}ID:${RESET}      ${agentAccount.address}`);
    console.log(`   ${DIM}Grade:${RESET}   ${gradeColor}${currentGrade}${RESET}`);
    console.log(`   ${DIM}Balance:${RESET} ${currentBalance === 'Unknown' ? DIM + currentBalance : GREEN + currentBalance + ' CRO'}${RESET}`);

    const methodColor = targetMethod === 'POST' ? CYAN : GREEN;
    console.log(`   ${DIM}Target:${RESET}  ${methodColor}[${targetMethod}]${RESET} ${targetUrl || RED + 'Not Set' + RESET}`);
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
    console.log(`\n${DIM}🔄 Fetching balance from Public Cronos zkEVM Testnet...${RESET}`);
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
    if (!targetUrl || !targetUrl.startsWith('http')) {
        console.log(`\n${RED}❌ Target URL not set! Please set it first.${RESET}`);
        return;
    }

    // 1. CONFIRM METHOD & BODY
    // If Method is POST/PUT/PATCH, ask for Body
    let data = {};
    if (['POST', 'PUT', 'PATCH'].includes(targetMethod)) {
        console.log(`\n${CYAN}📦 REQUEST BODY for ${targetMethod}:${RESET}`);
        console.log(`${DIM}(Press ENTER to send empty JSON '{}')${RESET}`);
        const jsonInput = await ask(`JSON Payload: `);
        try {
            data = jsonInput.trim() ? JSON.parse(jsonInput) : {};
        } catch (e) {
            console.log(`${RED}❌ Invalid JSON! Sending empty body.${RESET}`);
            data = {};
        }
    }

    console.log(`\n${YELLOW}📡 INITIATING API REQUEST SEQUENCE...${RESET}`);

    const timestamp = Date.now().toString();
    const nonce = Math.floor(Math.random() * 1000000).toString();
    const message = `Identify as ${agentAccount.address} at ${timestamp} with nonce ${nonce}`;

    console.log(`${DIM}   ├─ Nonce:${RESET} ${nonce}`);
    console.log(`${DIM}   ├─ Signing Identity...${RESET}`);
    const signature = await agentAccount.signMessage({ message });

    console.log(`${DIM}   └─ Calling:${RESET} ${targetMethod} ${targetUrl}`);

    try {
        const startTime = Date.now();
        const response = await axios({
            method: targetMethod,
            url: targetUrl,
            data: data,
            headers: {
                'Content-Type': 'application/json',
                'x-agent-id': agentAccount.address,
                'x-agent-signature': signature,
                'x-auth-timestamp': timestamp,
                'x-auth-nonce': nonce
            }
        });
        const latency = Date.now() - startTime;

        if (response.headers['x-agent-grade']) {
            currentGrade = response.headers['x-agent-grade'];
        }

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

        if (error.response && error.response.headers['x-agent-grade']) {
            currentGrade = error.response.headers['x-agent-grade'];
        }

        if (error.response) {
            console.log(`${RED}[${error.response.status}]${RESET} ${JSON.stringify(error.response.data)}`);
            if (error.response.status === 402) {
                console.log(`${YELLOW}💡 Payment Required.${RESET}`);
                console.log(`   Insufficient funds or credit.`);
            } else if (error.response.status === 404) {
                console.log(`${YELLOW}💡 Check your URL. It must be the FULL API Endpoint.${RESET}`);
            }
        } else {
            console.log(`${RED}${error.message}${RESET}`);
        }
    }
}

async function main() {
    await loadWallet();

    if (process.argv[2]) {
        parseTarget(process.argv.slice(2).join(' '));
    } else {
        console.log(`\n${YELLOW}👋 Welcome to HighStation Agent Simulator!${RESET}`);
        console.log(`Enter the ${BOLD}Method + URL${RESET} of the Service you want to test.`);
        console.log(`${DIM}(Example: POST https://highstation-demo.vercel.app/api/resource)${RESET}`);

        const input = await ask(`\n👉 Enter Target: `);
        parseTarget(input);
    }

    while (true) {
        printHeader();
        console.log(`\n${BOLD}COMMANDS:${RESET}`);
        console.log(`  ${CYAN}[1]${RESET} 💰 Check Wallet Balance`);
        console.log(`  ${CYAN}[2]${RESET} 📡 Send API Request`);
        console.log(`  ${CYAN}[3]${RESET} ⚙️  Set Target URL`);
        console.log(`  ${CYAN}[4]${RESET} 🚰 Get Test Tokens (Faucet)`);
        console.log(`  ${CYAN}[5]${RESET} ♻️  Reset Agent Identity`);
        console.log(`  ${CYAN}[6]${RESET} 🚪 Exit`);

        const choice = await ask(`\n${GREEN}agent@highstation:~${RESET}$ `);

        switch (choice.trim()) {
            case '1': await fetchBalance(); await ask(`\n${DIM}Press ENTER...${RESET}`); break;
            case '2': await sendRequest(); await ask(`\n${DIM}Press ENTER...${RESET}`); break;
            case '3':
                const input = await ask(`\nEnter new Target (e.g. "POST https://..."): `);
                if (input.trim()) parseTarget(input);
                break;
            case '4':
                console.log(`\n🔗 Faucet: https://cronos.org/faucet\n🆔 Address: ${agentAccount.address}`);
                await ask(`\n${DIM}Press ENTER...${RESET}`); break;
            case '5':
                if ((await ask(`Reset Identity? (y/N): `)).toLowerCase() === 'y') {
                    fs.unlinkSync(WALLET_FILE);
                    process.exit(0);
                }
                break;
            case '6': process.exit(0); break;
        }
    }
}

main();
