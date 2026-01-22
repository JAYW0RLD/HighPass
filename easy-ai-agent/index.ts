import { createWalletClient, http, formatEther, defineChain } from 'viem';
import { privateKeyToAccount, generatePrivateKey } from 'viem/accounts';
import { Facilitator, CronosNetwork } from '@crypto.com/facilitator-client';
import axios from 'axios';
import Enquirer from 'enquirer';
import chalk from 'chalk';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

// Load Environment & Config
dotenv.config();
const configPath = path.join(__dirname, 'config_default.json');
let fileConfig: any = {};
if (fs.existsSync(configPath)) {
    try {
        fileConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    } catch (e) {
        console.error(chalk.red('⚠️  Failed to parse config_default.json'));
    }
}

// Configuration (Priority: Env > Config File > Default)
const API_BASE = process.env.API_BASE_URL || fileConfig.API_BASE_URL || 'http://localhost:3000';
const DEFAULT_CHAIN_ID = Number(process.env.DEFAULT_CHAIN_ID || fileConfig.DEFAULT_CHAIN_ID || 338);

// Custom Chain Definition (Dynamic fallback)
const cronosTestnet = defineChain({
    id: 338,
    name: 'Cronos Testnet',
    nativeCurrency: { decimals: 18, name: 'CRO', symbol: 'TCRO' },
    rpcUrls: {
        default: { http: ['https://evm-t3.cronos.org'] },
    },
});

async function main() {
    console.clear();
    console.log(chalk.cyanBright.bold('🤖 Easy AI Agent (HighStation Protocol)'));
    console.log(chalk.gray('----------------------------------------'));

    // ---------------------------------------------------------
    // PHASE 1: Identity & Wallet
    // ---------------------------------------------------------
    let privateKey = process.env.AGENT_PRIVATE_KEY || fileConfig.AGENT_PRIVATE_KEY;
    if (!privateKey) {
        console.log(chalk.yellow('⚠️  No private key found in .env or config_default.json'));
        console.log(chalk.blue('🎲 Generating new ephemeral wallet...'));
        privateKey = generatePrivateKey();
    }

    const account = privateKeyToAccount(privateKey as `0x${string}`);
    const walletClient = createWalletClient({
        account,
        chain: cronosTestnet,
        transport: http()
    });

    console.log(chalk.green(`✅ Identity Established`));
    console.log(chalk.white(`   Address: `) + chalk.bold.yellow(account.address));
    console.log(chalk.gray(`   (Private Key: ${privateKey}) - Keep this safe!`)); // Demo only

    // Helper: Balance Check (USDC.e)
    const USDC_CONTRACT = '0xc01efAaF7C5C61bEbFAeb358E1161b537b8bC0e0';

    const checkBalance = async () => {
        process.stdout.write(chalk.gray('⏳ Checking USDC.e balance... '));
        try {
            // Encode 'balanceOf(address)' -> 0x70a08231 + padded address
            const paddedAddress = account.address.slice(2).padStart(64, '0');
            const data = `0x70a08231${paddedAddress}`;

            const rpcRes = await axios.post(cronosTestnet.rpcUrls.default.http[0], {
                jsonrpc: "2.0",
                method: "eth_call",
                params: [{ to: USDC_CONTRACT, data }, "latest"],
                id: 1
            });

            const balanceHex = (rpcRes.data as any).result;
            const balanceWei = BigInt(balanceHex);
            const balanceUsdc = Number(balanceWei) / 1_000_000; // USDC has 6 decimals

            if (balanceUsdc > 0) {
                console.log(chalk.green(`OK! Balance: ${balanceUsdc.toFixed(2)} USDC.e`));
                return true;
            } else {
                console.log(chalk.red(`\n❌ USDC.e Balance is 0.`));
                return false;
            }
        } catch (e: any) {
            console.log(chalk.red(`RPC Error: ${e.message}`));
            return false;
        }
    };

    // Faucet Guide
    console.log(chalk.gray('\n----------------------------------------'));
    console.log(chalk.white.bold('💰 Funding Requirement'));
    console.log(chalk.white(`   Please ensure this wallet has **Testnet USDC.e** for payments.`));
    console.log(chalk.blueBright(`   Faucet: https://faucet.cronos.org/ (Select 'USDC' token)`));

    // Balance Check Loop
    while (true) {
        const { confirm } = await Enquirer.prompt<{ confirm: boolean }>({
            type: 'confirm',
            name: 'confirm',
            message: 'Have you funded the wallet? (Press Enter to check balance)',
            initial: true
        });

        if (!confirm) {
            console.log(chalk.red('❌ Operation aborted by user.'));
            process.exit(0);
        }

        const hasFunds = await checkBalance();
        if (hasFunds) break;

        const { ignore } = await Enquirer.prompt<{ ignore: boolean }>({
            type: 'confirm',
            name: 'ignore',
            message: 'Proceed anyway? (Debug Mode - Signatures may still work)',
            initial: false
        });
        if (ignore) break;
    }

    // ---------------------------------------------------------
    // PHASE 2: MCP Connection (Discovery)
    // ---------------------------------------------------------
    console.log(chalk.gray('\n----------------------------------------'));
    console.log(chalk.cyan('📡 Connecting to HighStation Gatekeeper (MCP)...'));

    // MCP Client Implementation (SSE + JSON-RPC)
    let mcpSessionId: string = '';
    const pendingRequests = new Map<number, (res: any) => void>();
    let mcpCallId = 1; // [FIX] Incremental ID to prevent collisions

    // 1. Start SSE Stream
    try {
        const stream = await axios.get(`${API_BASE}/mcp/sse`, { responseType: 'stream' });
        let buffer = '';

        (stream.data as any).on('data', (chunk: Buffer) => {
            buffer += chunk.toString();
            const messages = buffer.split('\n\n');
            buffer = messages.pop() || ''; // Keep incomplete part

            for (const msg of messages) {
                // Parse Event lines
                const lines = msg.split('\n');
                let eventType = 'message';
                let dataStr = '';

                for (const line of lines) {
                    if (line.startsWith('event: ')) eventType = line.substring(7).trim();
                    if (line.startsWith('data: ')) dataStr = line.substring(6).trim();
                }

                if (!dataStr) continue;

                // Handle Handshake
                if (eventType === 'endpoint') {
                    const matches = dataStr.match(/sessionId=([a-zA-Z0-9-]+)/);
                    if (matches && matches[1]) mcpSessionId = matches[1];
                    continue;
                }

                // Handle JSON-RPC Responses
                try {
                    const json = JSON.parse(dataStr);
                    if (json.id && pendingRequests.has(json.id)) {
                        const resolve = pendingRequests.get(json.id);
                        if (resolve) resolve(json);
                        pendingRequests.delete(json.id);
                    }
                } catch (e) {
                    // Ignore parse errors for non-json data
                }
            }
        });

        // [FIX] Error handler for stream failures
        (stream.data as any).on('error', (err: Error) => {
            console.log(chalk.red(`\n❌ Stream Error: ${err.message}`));
            console.log(chalk.yellow('💡 MCP connection lost. Please restart the agent.'));
            process.exit(1);
        });

        // [FIX] End handler for clean disconnections
        (stream.data as any).on('end', () => {
            console.log(chalk.yellow('\n⚠️ Server closed the connection.'));
            console.log(chalk.gray('This may happen during server maintenance.'));
            process.exit(0);
        });

        // Wait for session info
        process.stdout.write(chalk.gray('⏳ Handshaking... '));
        let retries = 0;
        while (!mcpSessionId && retries < 20) {
            await new Promise(r => setTimeout(r, 500));
            retries++;
        }

        if (!mcpSessionId) throw new Error("MCP Handshake Timeout");
        console.log(chalk.green(`Connected! (Session: ${mcpSessionId.slice(0, 8)}...)`));

    } catch (e: any) {
        console.log(chalk.red(`\n❌ MCP Connection Failed: ${e.message}`));
        console.log(chalk.gray(`Is the server running at ${API_BASE}?`));
        process.exit(1);
    }

    // Helper: Call MCP Tool
    const callMcpTool = async (name: string, args: any = {}) => {
        const id = mcpCallId++; // [FIX] Use incremental ID instead of random

        // Create Promise for result
        const p = new Promise<any>((resolve, reject) => {
            // Set timeout
            const timeout = setTimeout(() => {
                pendingRequests.delete(id);
                reject(new Error("MCP Call Timeout"));
            }, 10000);

            pendingRequests.set(id, (val) => {
                clearTimeout(timeout);
                resolve(val);
            });
        });

        // Send Request (Fire and Forget HTTP, Wait for SSE)
        await axios.post(`${API_BASE}/mcp/message?sessionId=${mcpSessionId}`, {
            jsonrpc: "2.0",
            method: "tools/call",
            params: { name, arguments: args },
            id
        });

        const res = await p;

        if (res.error) throw new Error(res.error.message);
        if (!res.result) throw new Error("No result in MCP response: " + JSON.stringify(res));

        // MCP SDK Spec: result.content is array of { type: 'text', text: '...' }
        return res.result.content[0].text;
    };

    // 2. Dynamic Config (get_payment_info)
    console.log(chalk.gray('⏳ Fetching Network Configuration...'));
    const paymentInfoJson = await callMcpTool('get_payment_info');
    const paymentInfo = JSON.parse(paymentInfoJson);
    console.log(chalk.green(`✅ Configuration Sync: ${paymentInfo.network.name} (${paymentInfo.protocol})`));
    console.log(chalk.gray(`💬 Instructions: ${paymentInfo.instructions}`));

    // MAIN INTERACTION LOOP
    while (true) {
        await new Promise(r => setTimeout(r, 500)); // Delay to clear buffer
        console.log(chalk.gray('----------------------------------------'));

        // 3. Search Services
        console.log(chalk.gray('⏳ Discovering API Services (Structured)...'));
        // [FIX] Explicit 'all' parameter for clarity + Pass userId for personalization
        const platformUserId = process.env.PLATFORM_USER_ID || '';
        const searchResultRaw = await callMcpTool('search_services', {
            query: '',
            all: true,
            userId: platformUserId
        });

        let services = [];
        try {
            const parsed = JSON.parse(searchResultRaw);
            services = parsed.results || [];
        } catch (e) {
            console.log(chalk.red('⚠️ Failed to parse structured service data, attempting legacy fallback...'));
            // Standard fallback logic (Optional, for transitions)
            const lines = searchResultRaw.split('\n');
            let currentService: any = {};
            for (const line of lines) {
                if (line.includes('- Name:')) currentService.name = line.split('- Name:')[1].trim();
                if (line.includes('Slug:')) currentService.slug = line.split('Slug:')[1].trim();
                if (line.includes('Price:')) currentService.price = line.split('Price:')[1].trim();
                if (line.includes('Capabilities:')) {
                    try { currentService.capabilities = JSON.parse(line.split('Capabilities:')[1].trim()); } catch (e) { }
                }
                if (line.includes('Description:')) {
                    currentService.description = line.split('Description:')[1].trim();
                    if (currentService.name && currentService.slug) services.push(currentService);
                    currentService = {};
                }
            }
        }

        if (services.length === 0) {
            console.log(chalk.red('❌ No services found via MCP.'));
            // If no services, maybe retry loop?
        } else {
            // ---------------------------------------------------------
            // PHASE 3: User Interaction
            // ---------------------------------------------------------
            console.log(chalk.blueBright.bold('👇 Select a Service to Execute'));

            const { selectedServiceIndex } = await Enquirer.prompt<{ selectedServiceIndex: string }>({
                type: 'select',
                name: 'selectedServiceIndex',
                message: 'Available APIs:',
                choices: services.map((s: any, idx: number) => ({
                    name: idx.toString(),
                    message: `${chalk.bold(s.name)} | ${chalk.yellow(s.price)} | ${chalk.gray(s.description || '')}`,
                    value: idx.toString()
                }))
            });

            const targetService = services[parseInt(selectedServiceIndex)];
            console.log(chalk.cyan(`\n🔹 Selected: ${targetService.name} (${targetService.slug})`));

            // [NEW] Endpoint Selection
            let subPath = '';
            let inputTemplate = '{}';
            const endpoints = targetService.capabilities?.endpoints || [];

            if (endpoints.length > 0) {
                console.log(chalk.blueBright('📋 Select an Endpoint (Capability):'));
                const { selectedEndpointIndex } = await Enquirer.prompt<{ selectedEndpointIndex: string }>({
                    type: 'select',
                    name: 'selectedEndpointIndex',
                    message: 'Available Endpoints:',
                    choices: endpoints.map((e: any, idx: number) => ({
                        name: idx.toString(),
                        message: `${chalk.bold(e.path)} - ${chalk.gray(e.description || 'No description')}`,
                        value: idx.toString()
                    }))
                });
                const selectedEndpoint = endpoints[parseInt(selectedEndpointIndex)];
                subPath = selectedEndpoint.path;
                inputTemplate = selectedEndpoint.input_template || '{}';
                console.log(chalk.green(`   Endpoint set to: /${subPath}`));
            }

            // Inquiry Payload
            console.log(chalk.yellow('\n📝 Input Schema / Template:'));
            console.log(chalk.gray(inputTemplate));

            let { payloadStr } = await Enquirer.prompt<{ payloadStr: string }>({
                type: 'input',
                name: 'payloadStr',
                message: 'Enter Request Body (JSON):',
                initial: inputTemplate.split('\n')[0].includes('#') ? '{}' : inputTemplate // Only use as initial if no comments
            });

            let payload = {};
            let isValidJson = false;

            // [FIX] Retry loop for invalid JSON
            while (!isValidJson) {
                try {
                    // Strip comments before parsing if any
                    const cleanJson = payloadStr.replace(/#.*$/gm, '');
                    payload = JSON.parse(cleanJson);
                    isValidJson = true;
                } catch (e: any) {
                    console.log(chalk.red(`⚠️ Invalid JSON: ${e.message}`));

                    const { retry } = await Enquirer.prompt<{ retry: boolean }>({
                        type: 'confirm',
                        name: 'retry',
                        message: 'Try again?',
                        initial: true
                    });

                    if (!retry) {
                        console.log(chalk.yellow('Using empty object {}'));
                        payload = {};
                        isValidJson = true;
                    } else {
                        // Re-prompt for input
                        const { payloadStr: newPayloadStr } = await Enquirer.prompt<{ payloadStr: string }>({
                            type: 'input',
                            name: 'payloadStr',
                            message: 'Enter Request Body (JSON):',
                            initial: inputTemplate.split('\n')[0].includes('#') ? '{}' : inputTemplate
                        });
                        payloadStr = newPayloadStr;
                    }
                }
            }

            // ---------------------------------------------------------
            // PHASE 4: Payment & Execution (with Retry + Backoff)
            // ---------------------------------------------------------
            console.log(chalk.gray('\n----------------------------------------'));
            console.log(chalk.magenta('⚙️  Processing Request...'));

            const resourceUrl = subPath
                ? `${API_BASE}/gatekeeper/${targetService.slug}/resource/${subPath}`
                : `${API_BASE}/gatekeeper/${targetService.slug}/resource`;

            // [FIX] Retry with Exponential Backoff
            const MAX_RETRIES = 3;
            const BASE_DELAY = 1000; // 1 second
            let attempt = 1;
            let success = false;

            while (attempt <= MAX_RETRIES && !success) {
                try {
                    if (attempt > 1) {
                        const delay = BASE_DELAY * Math.pow(2, attempt - 2);
                        console.log(chalk.gray(`   Waiting ${delay / 1000}s before retry...`));
                        await new Promise(r => setTimeout(r, delay));
                    }

                    process.stdout.write(chalk.gray(`   Calling API (Attempt ${attempt}/${MAX_RETRIES}) ... `));
                    const apiRes = await axios.post(resourceUrl, payload);
                    console.log(chalk.green('OK!'));
                    console.log(chalk.gray('----------------------------------------'));
                    console.log(chalk.greenBright.bold('✅ RESPONSE DATA:'));
                    console.log(JSON.stringify(apiRes.data, null, 2));
                    success = true;

                } catch (error: any) {
                    if (error.response?.status === 402) {
                        console.log(chalk.yellow('402 Payment Required!'));

                        const reqs = error.response.data.requirements;
                        const priceWei = BigInt(reqs.maxAmountRequired || reqs.value || 0);

                        console.log(chalk.gray(`   Required: ${formatEther(priceWei)} CRO`));
                        console.log(chalk.gray(`   Pay To: ${reqs.payTo}`));

                        process.stdout.write(chalk.yellow('   ✍️  Signing Payment... '));

                        try {
                            const network = (paymentInfo.network.chainId === 338) ? CronosNetwork.CronosTestnet : CronosNetwork.CronosMainnet;
                            const facilitator = new Facilitator({ network });

                            const paymentHeader = await facilitator.generatePaymentHeader({
                                to: reqs.payTo,
                                value: priceWei.toString(),
                                signer: {
                                    getAddress: async () => account.address,
                                    signMessage: async (msg: string | { raw: `0x${string}` }) => {
                                        if (typeof msg === 'string') {
                                            return walletClient.signMessage({ account, message: msg });
                                        } else {
                                            return walletClient.signMessage({ account, message: { raw: msg.raw } });
                                        }
                                    },
                                    signTypedData: async (domain: any, types: any, value: any) => {
                                        const { EIP712Domain, ...validTypes } = types;
                                        return walletClient.signTypedData({
                                            account,
                                            domain,
                                            types: validTypes,
                                            primaryType: Object.keys(validTypes)[0],
                                            message: value
                                        });
                                    }
                                } as any
                            });
                            console.log(chalk.green('Signed!'));

                            process.stdout.write(chalk.magenta('   🚀 sending Premium Request... '));
                            const finalRes = await axios.post(resourceUrl, payload, {
                                headers: { 'Authorization': `Bearer ${paymentHeader}` }
                            });

                            console.log(chalk.green('Success! 200 OK'));
                            console.log(chalk.gray('----------------------------------------'));
                            console.log(chalk.greenBright.bold('✅ RESPONSE DATA:'));
                            console.log(JSON.stringify(finalRes.data, null, 2));
                            success = true;

                        } catch (payErr: any) {
                            console.log(chalk.red('\n❌ Payment Generation Failed'));
                            console.log(chalk.red(`   Reason: ${payErr.message}`));
                            break;
                        }
                    } else {
                        console.log(chalk.red(`\n❌ API Error: ${error.message}`));
                        if (error.response) console.log(error.response.data);
                        if (attempt < MAX_RETRIES && (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT')) {
                            attempt++;
                        } else {
                            break;
                        }
                    }
                }
                if (!success && attempt < MAX_RETRIES) attempt++;
            }
            if (!success) {
                console.log(chalk.red('\n❌ All retry attempts failed.'));
            }
        } // End if services.length > 0

        // ---------------------------------------------------------
        // POST-EXECUTION MENU
        // ---------------------------------------------------------
        console.log(chalk.gray('\n----------------------------------------'));
        const { action } = await Enquirer.prompt<{ action: string }>({
            type: 'select',
            name: 'action',
            message: 'What would you like to do next?',
            choices: [
                'Call Another Service (Main Menu)',
                'Check Wallet Balance',
                'Exit'
            ]
        });

        if (action === 'Exit') {
            console.log(chalk.gray('Bye! 👋'));
            break;
        }

        if (action === 'Check Wallet Balance') {
            await checkBalance();
            // After checking balance, loop continues to Discovery/Main Menu
        }

        // Loop repeats for 'Call Another Service'
    }
}

main().catch(console.error);
