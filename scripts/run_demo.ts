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
const IDENTITY_CONTRACT = process.env.IDENTITY_CONTRACT_ADDRESS as `0x${string}`;
const GATEWAY_URL = 'http://localhost:3000/gatekeeper/resource';
const AGENT_ID = '12399';

const account = privateKeyToAccount(PRIV_KEY);
const client = createWalletClient({
    account,
    chain: cronosZkEVMTestnet,
    transport: http('https://testnet.zkevm.cronos.org')
}).extend(publicActions);

function banner(text: string) {
    console.log('\n' + '═'.repeat(80));
    console.log(`  ${text}`);
    console.log('═'.repeat(80) + '\n');
}

function step(num: number, title: string) {
    console.log(`\n${'━'.repeat(80)}`);
    console.log(`  STEP ${num}: ${title}`);
    console.log('━'.repeat(80) + '\n');
}

async function delay(ms: number, message?: string) {
    if (message) console.log(`⏳ ${message}...`);
    await new Promise(r => setTimeout(r, ms));
}

async function main() {
    banner('X402 GATEKEEPER - COMPLETE DEMONSTRATION');
    console.log(`Agent: ${account.address}`);
    console.log(`Agent ID: ${AGENT_ID}`);
    console.log(`📊 Watch the dashboard at http://localhost:5174\n`);

    await delay(3000, 'Preparing demonstration');

    // STEP 1: Set low reputation (will be blocked)
    step(1, 'Agent with LOW reputation (< 70) attempts access');
    console.log('Expected: 403 FORBIDDEN (Reputation too low)');
    console.log(`Setting reputation to 50...`);

    const hash1 = await client.writeContract({
        address: IDENTITY_CONTRACT,
        abi: [{ name: 'setReputation', type: 'function', inputs: [{ type: 'uint256' }, { type: 'uint256' }], outputs: [], stateMutability: 'nonpayable' }],
        functionName: 'setReputation',
        args: [BigInt(AGENT_ID), BigInt(50)]
    });
    await client.waitForTransactionReceipt({ hash: hash1 });
    console.log(`✅ Reputation set to 50`);

    await delay(2000);

    try {
        await axios.get(GATEWAY_URL, { headers: { 'X-Agent-ID': AGENT_ID } });
        console.log('❌ ERROR: Should have been blocked!');
    } catch (e: any) {
        if (e.response?.status === 403) {
            console.log('✅ SUCCESS: Access DENIED (403 Forbidden)');
            console.log(`   Reason: ${e.response.data.message}`);
        }
    }

    await delay(5000, 'Moving to next step');

    // STEP 2: Increase reputation to qualify for optimistic access
    step(2, 'Reputation UPGRADED to 99 (High Trust)');
    console.log('Expected: Agent now qualifies for optim istic payments');
    console.log(`Upgrading reputation to 99...`);

    const hash2 = await client.writeContract({
        address: IDENTITY_CONTRACT,
        abi: [{ name: 'setReputation', type: 'function', inputs: [{ type: 'uint256' }, { type: 'uint256' }], outputs: [], stateMutability: 'nonpayable' }],
        functionName: 'setReputation',
        args: [BigInt(AGENT_ID), BigInt(99)]
    });
    await client.waitForTransactionReceipt({ hash: hash2 });
    console.log(`✅ Reputation upgraded to 99`);

    await delay(5000, 'Waiting for blockchain sync');

    // STEP 3: First optimistic access
    step(3, 'First access attempt (No debt, High reputation)');
    console.log('Expected: 200 OK IMMEDIATELY (Optimistic Grant)');
    console.log(`➡️  Requesting protected resource...`);

    try {
        const response = await axios.get(GATEWAY_URL, { headers: { 'X-Agent-ID': AGENT_ID } });
        console.log('✅ SUCCESS: INSTANT ACCESS GRANTED');
        console.log(`   Data: ${response.data.data}`);
        if (response.data.optimistic) {
            console.log(`   💳 Payment Mode: OPTIMISTIC (Pay Later)`);
            console.log(`   📝 Message: ${response.data.message}`);
        }
        console.log(`\n   🎯 Result: Agent received data WITHOUT payment!`);
        console.log(`   💰 Debt has been recorded in the system.`);
    } catch (e: any) {
        console.log('❌ Unexpected error:', e.response?.data || e.message);
    }

    await delay(7000, 'Check dashboard - Notice "OPTIMISTIC" status badge & pending debt');

    // STEP 4: Second access attempt (debt exists)
    step(4, 'Second access attempt (Outstanding debt exists)');
    console.log('Expected: 402 PAYMENT REQUIRED (Must settle debt first)');
    console.log(`➡️  Requesting protected resource again...`);

    let debtAmount = '';
    try {
        await axios.get(GATEWAY_URL, { headers: { 'X-Agent-ID': AGENT_ID } });
        console.log('❌ ERROR: Should have been blocked!');
    } catch (e: any) {
        if (e.response?.status === 402) {
            console.log('✅ SUCCESS: Access BLOCKED (402 Payment Required)');
            console.log(`   📛 Reason: ${e.response.data.message}`);
            debtAmount = e.response.data.debtAmount;
            const debtCRO = (Number(debtAmount) / 1e18).toFixed(6);
            console.log(`   💰 Outstanding Debt: ${debtCRO} CRO`);
            console.log(`\n   🎯 Result: Access DENIED until debt is paid!`);
        }
    }

    await delay(7000, 'Check dashboard - Notice "DEBT DUE" status badge');

    // STEP 5: Continue simulation without payment (just show the concept)
    step(5, 'Demonstration Complete');
    console.log('✅ Successfully demonstrated:');
    console.log('   1. Low reputation → Access DENIED');
    console.log('   2. High reputation → INSTANT optimistic access');
    console.log('   3. Debt enforcement → Access BLOCKED until payment');
    console.log();
    console.log('💡 Key Innovation:');
    console.log('   • Zero latency for trusted agents (immediate data delivery)');
    console.log('   • Automatic debt tracking (no manual accounting)');
    console.log('   • Trustless via on-chain reputation + settlement');
    console.log();
    console.log('📊 Check the dashboard to see real-time status updates!');
    console.log('🔗 Dashboard: http://localhost:5174');

    banner('DEMONSTRATION END');
}

main().catch(console.error);
