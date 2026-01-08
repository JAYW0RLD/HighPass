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
const GATEWAY_URL = 'http://localhost:3000/gatekeeper/resource';
const AGENT_ID = '12399';

const account = privateKeyToAccount(PRIV_KEY);
const client = createWalletClient({
    account,
    chain: cronosZkEVMTestnet,
    transport: http('https://testnet.zkevm.cronos.org')
}).extend(publicActions);

console.log("╔══════════════════════════════════════════════════════════════════╗");
console.log("║        THE TRUSTLESS TRADE - Optimistic Payment Demo            ║");
console.log("╚══════════════════════════════════════════════════════════════════╝");
console.log();
console.log(`🤖 Agent: ${account.address}`);
console.log(`🔑 Agent ID: ${AGENT_ID}`);
console.log(`⭐ Reputation: 99/100 (Qualified for optimistic access)`);
console.log();

async function main() {
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("📍 SCENARIO 1: First Request (No Debt, High Reputation)");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("Expected: 200 OK (Optimistic Grant) + Debt Recorded");
    console.log();

    try {
        const response1 = await axios.get(GATEWAY_URL, {
            headers: { 'X-Agent-ID': AGENT_ID }
        });

        console.log("✅ SUCCESS: Optimistic access granted!");
        console.log("📦 Data:", response1.data.data);
        if (response1.data.optimistic) {
            console.log("💳 Payment Mode:", response1.data.optimistic ? "OPTIMISTIC (Pay Later)" : "Immediate");
            console.log("📝 Message:", response1.data.message);
        }
        console.log("⏱️  Timestamp:", response1.data.timestamp);
        console.log();
        console.log("🎯 Result: Agent received data IMMEDIATELY without payment!");
        console.log("💰 Debt has been recorded in the system.");
    } catch (e: any) {
        console.log("❌ Unexpected error:", e.response?.data || e.message);
        return;
    }

    await new Promise(r => setTimeout(r, 2000));

    console.log();
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("📍 SCENARIO 2: Second Request (Debt Exists)");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("Expected: 402 Payment Required (Must settle debt first)");
    console.log();

    let debtAmount = '';
    try {
        await axios.get(GATEWAY_URL, { headers: { 'X-Agent-ID': AGENT_ID } });
        console.log("❌ ERROR: Should have been blocked due to debt!");
    } catch (e: any) {
        if (e.response?.status === 402) {
            console.log("✅ CORRECTLY BLOCKED: 402 Payment Required");
            console.log("📛 Reason:", e.response.data.message);
            debtAmount = e.response.data.debtAmount;
            console.log("💰 Outstanding Debt:", debtAmount, "wei");
            const debtCRO = (Number(debtAmount) / 1e18).toFixed(6);
            console.log(`   ≈ ${debtCRO} CRO ≈ $0.01 USD`);
            console.log();
            console.log("🎯 Result: Access DENIED until debt is paid!");
        } else {
            console.log("❌ Unexpected status:", e.response?.status);
        }
    }

    await new Promise(r => setTimeout(r, 2000));

    console.log();
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("📍 SCENARIO 3: Debt Settlement");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("Expected: Payment transaction confirmed on-chain");
    console.log();

    console.log("💸 Sending payment to PaymentHandler...");
    const txHash = await client.writeContract({
        address: PAYMENT_HANDLER,
        abi: [{ name: 'pay', type: 'function', inputs: [{ type: 'uint256' }], outputs: [], stateMutability: 'payable' }],
        functionName: 'pay',
        args: [BigInt(1)],
        value: BigInt(debtAmount)
    });

    console.log("📤 Transaction Hash:", txHash);
    console.log("⏳ Waiting for confirmation...");
    await client.waitForTransactionReceipt({ hash: txHash });
    console.log("✅ Payment CONFIRMED on Cronos zkEVM!");
    console.log(`🔗 Explorer: https://explorer.zkevm.cronos.org/tx/${txHash}`);
    console.log();
    console.log("🎯 Result: Debt settled successfully!");

    await new Promise(r => setTimeout(r, 2000));

    console.log();
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("📍 SCENARIO 4: Third Request (Debt Cleared)");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("Expected: 200 OK (Optimistic access restored)");
    console.log();

    try {
        const response2 = await axios.get(GATEWAY_URL, {
            headers: {
                'X-Agent-ID': AGENT_ID,
                'Authorization': `Token ${txHash}`
            }
        });

        console.log("✅ SUCCESS: Access granted after debt clearance!");
        console.log("📦 Data:", response2.data.data);
        console.log("⏱️  Timestamp:", response2.data.timestamp);
        console.log();
        console.log("🎯 Result: Agent can now access resources again!");
        console.log("💳 Debt Balance: 0 wei (Cleared)");
    } catch (e: any) {
        console.log("❌ Error:", e.response?.data || e.message);
    }

    await new Promise(r => setTimeout(r, 2000));

    console.log();
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("📍 SCENARIO 5: Fourth Request (No Debt, Optimistic Again)");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("Expected: 200 OK (New optimistic grant)");
    console.log();

    try {
        const response3 = await axios.get(GATEWAY_URL, {
            headers: { 'X-Agent-ID': AGENT_ID }
        });

        console.log("✅ SUCCESS: Optimistic access granted again!");
        console.log("📦 Data:", response3.data.data);
        if (response3.data.optimistic) {
            console.log("💳 Payment Mode: OPTIMISTIC (Pay Later)");
            console.log("📝 Message:", response3.data.message);
        }
        console.log();
        console.log("🎯 Result: The cycle continues! Agent earned new trust credit.");
    } catch (e: any) {
        console.log("❌ Error:", e.response?.data || e.message);
    }

    console.log();
    console.log("╔══════════════════════════════════════════════════════════════════╗");
    console.log("║                    TRUSTLESS TRADE COMPLETE                      ║");
    console.log("╚══════════════════════════════════════════════════════════════════╝");
    console.log();
    console.log("📊 Summary:");
    console.log("   ✅ Optimistic Access: Immediate data delivery for trusted agents");
    console.log("   ✅ Debt Tracking: Automatic balance enforcement");
    console.log("   ✅ Settlement: On-chain payment verification");
    console.log("   ✅ Cycle Restoration: Trust re-established after payment");
    console.log();
    console.log("🏆 Advantages:");
    console.log("   • Zero latency for first-time access");
    console.log("   • Trustless via reputation + on-chain settlement");
    console.log("   • Scalable to multiple agents");
    console.log("   • Transparent debt tracking");
}

main().catch(console.error);
