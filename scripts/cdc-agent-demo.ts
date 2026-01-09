import { createClient as createAgentClient } from '@crypto.com/ai-agent-client';
import { Facilitator, CronosNetwork } from '@crypto.com/facilitator-client';
import { ethers } from 'ethers';
import * as fs from 'fs';
import * as path from 'path';
import * as readline from 'readline';
import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

// --------------------------------------------------------------------------
// Configuration
// --------------------------------------------------------------------------
const WALLET_FILE = path.join(__dirname, 'agent-wallet.json');
const HIGHSTATION_API = 'http://localhost:3000/api'; // Local or Production URL

// Colors
const RESET = "\x1b[0m";
const CYAN = "\x1b[36m";
const GREEN = "\x1b[32m";
const YELLOW = "\x1b[33m";
const RED = "\x1b[31m";
const DIM = "\x1b[2m";

// --------------------------------------------------------------------------
// Tools for the AI Agent (The "Hands" of the Agent)
// --------------------------------------------------------------------------
const tools = [
    {
        name: "search_services",
        description: "Search for available APIs and services in the HighStation marketplace.",
        parameters: {
            type: "object",
            properties: {
                query: {
                    type: "string",
                    description: "Keywords to search for (e.g., 'text analysis', 'finance', 'weather')"
                }
            },
            required: ["query"]
        },
        handler: async ({ query }: { query: string }) => {
            console.log(`${DIM}🔎 Searching Market for: "${query}"...${RESET}`);
            try {
                const response = await axios.get(`${HIGHSTATION_API}/services`, {
                    params: { q: query, status: 'verified' }
                });
                const services = response.data.services || [];

                if (services.length === 0) return "No services found matching that query.";

                return JSON.stringify(services.map((s: any) => ({
                    id: s.id,
                    name: s.name,
                    price: `${ethers.formatEther(s.price_wei || '0')} CRO`,
                    description: s.description || "No description",
                    endpoint: `${HIGHSTATION_API}/proxy/${s.slug}` // Proxy endpoint via HighStation
                })), null, 2);
            } catch (e: any) {
                return `Error searching services: ${e.message}`;
            }
        }
    },
    {
        name: "call_service",
        description: "Call a specific service API. Handles payment automatically if required.",
        parameters: {
            type: "object",
            properties: {
                serviceId: { type: "string", description: "The ID of the service to call" },
                endpoint: { type: "string", description: "The full URL endpoint to call" },
                method: { type: "string", enum: ["GET", "POST"], description: "HTTP Method" },
                payload: { type: "string", description: "JSON string of the request body (for POST)" }
            },
            required: ["serviceId", "endpoint", "method"]
        },
        handler: async (args: any) => {
            const { serviceId, endpoint, method, payload } = args;
            console.log(`${YELLOW}⚡ Agent Decided to Call Service: ${serviceId}${RESET}`);
            console.log(`${DIM}   URL: ${endpoint}${RESET}`);

            try {
                // 1. Prepare Request
                // We use our Custom AI Agent Runner Logic here because we need X402 support.
                // The standard Agent SDK might not support 402 negotiation out-of-the-box yet,
                // so we wrap it in this tool handler using the Facilitator Client.

                return await executePaidRequest(method, endpoint, payload ? JSON.parse(payload) : {});

            } catch (e: any) {
                return `Service Call Failed: ${e.message}`;
            }
        }
    }
];

// --------------------------------------------------------------------------
// X402 Payment Logic (Powered by @crypto.com/facilitator-client)
// --------------------------------------------------------------------------
let wallet: ethers.Wallet;
let facilitator: Facilitator;

async function executePaidRequest(method: string, url: string, body: any) {
    console.log(`${DIM}📡 Sending initial request...${RESET}`);

    // We need to generate headers for the request.
    // In a real scenario, the Facilitator Client helps generate the Authorization headers.
    // However, the current Facilitator Client is mainly for the SELLER side (verifying).
    // For the BUYER (Agent), we still need to sign the request.

    // Let's use standard EIP-191 signing for identity first.
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const nonce = Math.floor(Math.random() * 1000000).toString();
    const message = `Identify as ${wallet.address} at ${timestamp} with nonce ${nonce}`;
    const signature = await wallet.signMessage(message);

    const headers: any = {
        'Content-Type': 'application/json',
        'x-agent-id': wallet.address,
        'x-auth-timestamp': timestamp,
        'x-auth-nonce': nonce,
        'x-agent-signature': signature
    };

    try {
        const response = await axios({ method, url, data: body, headers });
        return `✅ Success: ${JSON.stringify(response.data)}`;
    } catch (error: any) {
        if (error.response?.status === 402) {
            console.log(`${YELLOW}⛔ 402 Payment Required Detected!${RESET}`);

            // Extract Payment Details
            const authHeader = error.response.headers['www-authenticate'];
            // Example: Token realm="HighStation", receiver="0x...", amount="1000000000000000000"

            let receiver = process.env.PAYMENT_HANDLER_ADDRESS;
            let amount = BigInt(0);

            const amountMatch = error.response.data.debtAmount || (authHeader?.match(/amount="(\d+)"/)?.[1]);
            const receiverMatch = authHeader?.match(/receiver="([^"]+)"/)?.[1];

            if (amountMatch) amount = BigInt(amountMatch);
            if (receiverMatch) receiver = receiverMatch;

            if (!receiver || amount === BigInt(0)) {
                return `❌ Error: Could not parse payment details from 402 response.`;
            }

            console.log(`${CYAN}💸 Paying ${ethers.formatEther(amount)} CRO to ${receiver}...${RESET}`);

            // 1. Send Transaction (On-Chain Settlement)
            const tx = await wallet.sendTransaction({
                to: receiver,
                value: amount
            });
            console.log(`${DIM}   Tx Hash: ${tx.hash}${RESET}`);
            console.log(`${DIM}   Waiting for confirmation...${RESET}`);
            await tx.wait(1);

            // 2. Retry with Proof
            console.log(`${GREEN}✅ Payment Confirmed. Retrying request...${RESET}`);
            headers['Authorization'] = `Token ${tx.hash}`;

            const retryResponse = await axios({ method, url, data: body, headers });
            return `✅ Success (After Payment): ${JSON.stringify(retryResponse.data)}`;

        }
        return `❌ Request Failed: ${error.message}`;
    }
}


// --------------------------------------------------------------------------
// Main Chat Loop
// --------------------------------------------------------------------------
async function main() {
    console.log(`${CYAN}🤖 HighStation Smart Agent (Official SDK Demo)${RESET}`);
    console.log(`${DIM}Powered by Crypto.com AI Agent SDK${RESET}\n`);

    // 1. Initialize Wallet
    if (!fs.existsSync(WALLET_FILE)) {
        console.error(`${RED}❌ Wallet not found! Run 'npx ts-node scripts/create-agent.ts' first.${RESET}`);
        process.exit(1);
    }
    const walletData = JSON.parse(fs.readFileSync(WALLET_FILE, 'utf-8'));
    const provider = new ethers.JsonRpcProvider('https://testnet.cronos.org'); // Public Testnet Endpoint
    wallet = new ethers.Wallet(walletData.privateKey, provider);

    console.log(`🔹 Identity: ${YELLOW}${wallet.address}${RESET}`);

    // 2. Initialize AI Agent
    // Note: Since we don't have a real OPENAI_API_KEY in this mocked environment for the user,
    // we will simulate the "Thinking" process of the Agent Client for the Demo.
    // in a REAL integration, we would create 'new AgentClient()' here.

    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });

    const ask = (q: string) => new Promise<string>(r => rl.question(q, r));

    while (true) {
        const input = await ask(`\n${GREEN}You (User):${RESET} `);
        if (input.toLowerCase() === 'exit') break;

        console.log(`\n${DIM}🤖 Agent is thinking...${RESET}`);

        // --- SIMULATED AI AGENT LOGIC FOR DEMO ---
        // This parses natural language roughly to trigger tools, 
        // mimicking what the LLM would do.

        await new Promise(r => setTimeout(r, 1000)); // Fake latency

        if (input.includes("search") || input.includes("find")) {
            // Extract keyword (dumb parsing)
            const keyword = input.split("for")[1]?.trim() || "all";
            console.log(`${CYAN}🧠 Thought:${RESET} User wants to find services about "${keyword}". Calling 'search_services'...`);
            const result = await tools.find(t => t.name === "search_services")!.handler({ query: keyword });
            console.log(`${CYAN}🗣️ Agent:${RESET} Here is what I found:\n${result}`);
        }
        else if (input.includes("buy") || input.includes("use") || input.includes("call")) {
            // Fake picking the first service or based on context
            console.log(`${CYAN}🧠 Thought:${RESET} User wants to use a service. I'll pick the 'Demo Echo Service' for demonstration.`);
            const services: any = JSON.parse(await tools.find(t => t.name === "search_services")!.handler({ query: "demo" }) as string);

            if (services.length > 0) {
                const target = services[0];
                const result = await (tools.find(t => t.name === "call_service")!.handler as any)({
                    serviceId: target.id,
                    endpoint: target.endpoint,
                    method: "POST",
                    payload: JSON.stringify({ message: "Hello from AI Agent!" })
                });
                console.log(`${CYAN}🗣️ Agent:${RESET} result`);
            } else {
                console.log(`${CYAN}🗣️ Agent:${RESET} I couldn't find a service to call.`);
            }
        }
        else {
            console.log(`${CYAN}🗣️ Agent:${RESET} I can help you [search] for APIs or [buy] access to them using CRO. What would you like to do?`);
        }
    }
}

main().catch(console.error);
