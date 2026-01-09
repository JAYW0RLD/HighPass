
import axios from 'axios';
import { ethers } from 'ethers';
import * as fs from 'fs';
import * as path from 'path';
import * as readline from 'readline';

// --------------------------------------------------------------------------
// Configuration
// --------------------------------------------------------------------------
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
let wallet: ethers.Wallet;
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
    console.log(`   HighStation Agent Simulator v2.7 (Official SDK Edition)`);
    console.log(`${RESET}`);
    console.log(`${DIM}  Real-World Testnet Edition${RESET}\n`);

    let gradeColor = DIM;
    if (currentGrade === 'A') gradeColor = GREEN;
    if (currentGrade === 'B') gradeColor = YELLOW;
    if (currentGrade === 'C') gradeColor = RED;

    console.log(`${YELLOW}⚡ AGENT PROFILE${RESET}`);
    console.log(`   ${DIM}ID:${RESET}      ${wallet ? wallet.address : 'Loading...'}`);
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
    // Cronos Testnet RPC
    const provider = new ethers.JsonRpcProvider('https://evm-t3.cronos.org');
    wallet = new ethers.Wallet(walletData.privateKey, provider);
}

async function fetchBalance() {
    console.log(`\n${DIM}🔄 Fetching balance from Public Cronos EVM Testnet...${RESET}`);
    try {
        const balanceWei = await wallet.provider!.getBalance(wallet.address);
        currentBalance = ethers.formatEther(balanceWei);
    } catch (e: any) {
        currentBalance = "Error: " + e.message;
    }
}

// --------------------------------------------------------------------------
// Core Logic: Executing Paid Requests (Standardized X402)
// --------------------------------------------------------------------------
async function sendRequest() {
    if (!targetUrl || !targetUrl.startsWith('http')) {
        console.log(`\n${RED}❌ Target URL not set! Please set it first.${RESET}`);
        return;
    }

    // 1. CONFIRM METHOD & BODY
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

    // Generate EIP-191 Identity Proof
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const nonce = Math.floor(Math.random() * 1000000).toString();
    const message = `Identify as ${wallet.address} at ${timestamp} with nonce ${nonce}`;

    console.log(`${DIM}   ├─ Nonce:${RESET} ${nonce}`);
    console.log(`${DIM}   ├─ Signing Identity...${RESET}`);
    const signature = await wallet.signMessage(message);

    console.log(`${DIM}   └─ Calling:${RESET} ${targetMethod} ${targetUrl}`);

    const headers: any = {
        'Content-Type': 'application/json',
        'x-agent-id': wallet.address,
        'x-agent-signature': signature,
        'x-auth-timestamp': timestamp,
        'x-auth-nonce': nonce
    };

    try {
        const startTime = Date.now();
        const response = await axios({
            method: targetMethod,
            url: targetUrl,
            data: data,
            headers: headers
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
            const usage = response.headers['x-credit-usage'];
            if (usage) console.log(`${DIM}   Usage:   ${usage}% of Credit Limit${RESET}`);
        } else {
            console.log(`${GREEN}💰 Payment: SETTLED${RESET}`);
        }

    } catch (error: any) {
        // Update Grade even on failure
        if (error.response && error.response.headers['x-agent-grade']) {
            currentGrade = error.response.headers['x-agent-grade'];
        }

        if (error.response && error.response.status === 402) {
            console.log(`\n${YELLOW}⛔ PAYMENT REQUIRED [402]${RESET}`);

            // X402 Negotiation Logic
            const authHeader = error.response.headers['www-authenticate'];
            const jsonData = error.response.data;
            const debtAmountStr = jsonData.debtAmount || jsonData.amount;

            // Parse Receiver from Header or Default
            let receiver = process.env.PAYMENT_HANDLER_ADDRESS;
            if (authHeader && authHeader.includes('receiver="')) {
                receiver = authHeader.split('receiver="')[1].split('"')[0];
            }

            if (debtAmountStr && receiver) {
                const debtAmount = BigInt(debtAmountStr);
                console.log(`\n${CYAN}💳 BILL DETECTED:${RESET}`);
                console.log(`   Amount:   ${ethers.formatEther(debtAmount)} CRO`);
                console.log(`   Receiver: ${receiver}`);

                const payNow = await ask(`\n${GREEN}💸 Settle this bill on-chain now? (Y/n): ${RESET}`);
                if (payNow.toLowerCase() === 'y' || payNow === '') {
                    try {
                        console.log(`\n${YELLOW}⛓️  SENDING TRANSACTION...${RESET}`);
                        const tx = await wallet.sendTransaction({
                            to: receiver,
                            value: debtAmount
                        });
                        console.log(`${GREEN}✔ Tx Sent! Hash: ${tx.hash}${RESET}`);
                        console.log(`${DIM}Waiting for confirmation...${RESET}`);
                        await tx.wait(1);

                        console.log(`\n${YELLOW}🔄 RETRYING REQUEST WITH PAYMENT PROOF...${RESET}`);
                        headers['Authorization'] = `Token ${tx.hash}`;

                        const retryResponse = await axios({
                            method: targetMethod,
                            url: targetUrl,
                            data: data,
                            headers: headers
                        });

                        console.log(`\n${GREEN}✅ PAYMENT ACCEPTED & ACCESS GRANTED!${RESET}`);
                        console.log(`${DIM}────────────────────────────────────────${RESET}`);
                        console.log(retryResponse.data);
                        console.log(`${DIM}────────────────────────────────────────${RESET}`);

                    } catch (payErr: any) {
                        console.log(`${RED}❌ Payment Failed: ${payErr.message}${RESET}`);
                    }
                    return;
                }
            } else {
                console.log(`${YELLOW}💡 Tip: Get test tokens from the Faucet if you have 0 CRO.${RESET}`);
            }
        } else if (error.response) {
            console.log(`\n${RED}⛔ REQUEST FAILED [${error.response.status}]${RESET}`);
            console.log(`${JSON.stringify(error.response.data)}`);
        } else {
            console.log(`\n${RED}⛔ ERROR: ${error.message}${RESET}`);
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
                console.log(`\n🔗 Faucet: https://cronos.org/faucet\n🆔 Address: ${wallet ? wallet.address : 'Loading...'}`);
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

main().catch(console.error);
