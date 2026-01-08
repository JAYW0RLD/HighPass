import axios from 'axios';
import { createWalletClient, http, defineChain, publicActions } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '../../.env') });

const cronosZkEVMTestnet = defineChain({
    id: 240,
    name: 'Cronos zkEVM Testnet',
    network: 'cronos-zkevm-testnet',
    nativeCurrency: { decimals: 18, name: 'Cronos', symbol: 'TCRO' },
    rpcUrls: { default: { http: ['https://testnet.zkevm.cronos.org'] }, public: { http: ['https://testnet.zkevm.cronos.org'] } },
    testnet: true,
});

const PRIV_KEY = process.env.PRIVATE_KEY as `0x${string}`;
const PAYMENT_HANDLER = process.env.PAYMENT_HANDLER_ADDRESS as `0x${string}`;

if (!PRIV_KEY || !PAYMENT_HANDLER) {
    console.error("Missing config");
    process.exit(1);
}

const account = privateKeyToAccount(PRIV_KEY);
const client = createWalletClient({
    account,
    chain: cronosZkEVMTestnet,
    transport: http('https://testnet.zkevm.cronos.org')
}).extend(publicActions);

const GATEWAY_URL = 'http://localhost:3000/gatekeeper/resource';
const AGENT_ID = '12399';

async function main() {
    console.log(">>> REAL WORLD SIMULATION (Public Cronos zkEVM) <<<");
    console.log(`Agent: ${account.address}`);

    // 1. Request - Expect 402
    console.log("\n[1] Requesting Resource (Expect 402)...");
    let authParams: any = {};
    try {
        await axios.get(GATEWAY_URL, { headers: { 'X-Agent-ID': AGENT_ID } });
    } catch (error: any) {
        if (error.response?.status === 402) {
            const authHeader = error.response.headers['www-authenticate'];
            console.log(`SUCCESS: 402 Recv. Header: ${authHeader}`);
            authParams = authHeader.split(',').reduce((acc: any, part: string) => {
                const [key, val] = part.trim().split('=');
                if (key && val) acc[key] = val.replace(/"/g, '');
                return acc;
            }, {});
        } else if (error.response?.status === 403) {
            console.log("Got 403. Assuming Reputation is OK (Deployed in prev step?). If logs verify, proceed.");
            // We assume reputation is set or not checked on new contract deployment (wait, new deployment -> empty rep).
            // We need to set reputation first.
            const identityAddr = process.env.IDENTITY_CONTRACT_ADDRESS;
            console.log(`Setting Reputation on ${identityAddr}...`);
            const hash = await client.writeContract({
                address: identityAddr as `0x${string}`,
                abi: [{ name: 'setReputation', type: 'function', inputs: [{ type: 'uint256' }, { type: 'uint256' }], outputs: [], stateMutability: 'nonpayable' }],
                functionName: 'setReputation',
                args: [BigInt(AGENT_ID), BigInt(99)]
            });
            console.log(`Reputation Tx: ${hash}. Waiting...`);
            console.log(`Reputation Tx: ${hash}. Waiting...`);
            await client.waitForTransactionReceipt({ hash });

            // Explicit POLLING: Wait for node to sync
            console.log("Polling for reputation update...");
            for (let i = 0; i < 20; i++) {
                const score = await client.readContract({
                    address: identityAddr as `0x${string}`,
                    abi: [{ name: 'getReputation', type: 'function', inputs: [{ type: 'uint256' }], outputs: [{ type: 'uint256' }], stateMutability: 'view' }],
                    functionName: 'getReputation',
                    args: [BigInt(AGENT_ID)]
                });
                console.log(`Poll ${i + 1}: Score = ${score}`);
                if (Number(score) >= 99) break;
                await new Promise(r => setTimeout(r, 3000));
            }

            // Retry Loop (Handle RPC Latency)
            for (let i = 0; i < 5; i++) {
                try {
                    console.log(`Retry Attempt ${i + 1}...`);
                    await new Promise(r => setTimeout(r, 2000)); // Wait 2s
                    await axios.get(GATEWAY_URL, { headers: { 'X-Agent-ID': AGENT_ID } });
                } catch (e: any) {
                    console.log(`Retry ${i + 1} Error: ${e.response?.status}`);
                    if (e.response?.status === 402) {
                        console.log("SUCCESS: Now 402.");
                        authParams = e.response.headers['www-authenticate'].split(',').reduce((acc: any, part: string) => {
                            const [key, val] = part.trim().split('=');
                            if (key && val) acc[key] = val.replace(/"/g, '');
                            return acc;
                        }, {});
                        break; // Exit loop on success
                    }
                }
            }
        }
    }

    if (!authParams.amount) {
        console.error("Failed to get payment params");
        return;
    }

    // 2. Pay via Contract (Fee Logic)
    console.log(`\n[2] Paying ${authParams.amount} wei to PaymentHandler (${PAYMENT_HANDLER})...`);
    // ABI for pay(uint256 serviceId)
    const txHash = await client.writeContract({
        address: PAYMENT_HANDLER,
        abi: [{ name: 'pay', type: 'function', inputs: [{ type: 'uint256' }], outputs: [], stateMutability: 'payable' }],
        functionName: 'pay',
        args: [BigInt(1)], // Service ID 1
        value: BigInt(authParams.amount)
    });

    console.log(`Payment Tx Sent: ${txHash}. Waiting...`);
    await client.waitForTransactionReceipt({ hash: txHash });
    console.log("Payment Confirmed.");

    // 3. Final Verification
    console.log("\n[3] Accessing Resource with Token...");
    try {
        const res = await axios.get(GATEWAY_URL, {
            headers: {
                'X-Agent-ID': AGENT_ID,
                'Authorization': `Token ${txHash}`
            }
        });
        console.log("SUCCESS: 200 OK");
        console.log(res.data);
    } catch (e: any) {
        console.log("Failed final access:", e.message);
    }

    // 4. Check Stats
    console.log("\n[4] Checking API Stats...");
    const stats = await axios.get('http://localhost:3000/api/stats');
    console.log("DB Stats:", JSON.stringify(stats.data.recent[0], null, 2));
}

main().catch(console.error);
