
import { generatePrivateKey, privateKeyToAccount } from 'viem/accounts';
import * as fs from 'fs';
import * as path from 'path';
import * as readline from 'readline';

const WALLET_FILE = path.join(__dirname, 'agent-wallet.json');

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

const ask = (query: string): Promise<string> => {
    return new Promise(resolve => rl.question(query, resolve));
};

async function main() {
    console.log("\n🤖 INITIALIZING NEW AGENT...");
    console.log("===========================");

    // Check if wallet already exists
    if (fs.existsSync(WALLET_FILE)) {
        console.log("\n⚠️  WARNING: agent-wallet.json already exists!");
        console.log("Creating a new wallet will PERMANENTLY DELETE the old one.");
        console.log("(You will LOSE ACCESS to any funds in the old wallet)\n");

        const answer = await ask("Continue and overwrite? (yes/no): ");

        if (answer.toLowerCase() !== 'yes') {
            console.log("\n✅ Cancelled. Existing wallet preserved.");
            console.log(`📂 Location: ${WALLET_FILE}\n`);
            rl.close();
            process.exit(0);
        }

        console.log("\n🔄 Proceeding with new wallet creation...\n");
    }

    // 1. Generate Wallet
    const privateKey = generatePrivateKey();
    const account = privateKeyToAccount(privateKey);
    const agentId = account.address;

    const walletData = {
        privateKey,
        address: agentId,
        createdAt: new Date().toISOString()
    };

    // 2. Save to File
    fs.writeFileSync(WALLET_FILE, JSON.stringify(walletData, null, 2));

    // 3. Output for User
    console.log(`✅ Agent Created Successfully!`);
    console.log(`📂 Saved to: ${WALLET_FILE}`);
    console.log(`\n🆔 AGENT ADDRESS: \x1b[36m${agentId}\x1b[0m`);
    console.log('✅ Agent wallet created successfully!\n');
    console.log('📋 Agent Details:');
    console.log(`   Address: ${account.address}`);
    console.log(`   Private Key: ${privateKey}\n`);
    console.log('⚠️  IMPORTANT: This wallet is Grade F (no credit history):');
    console.log('   - Every API call requires upfront payment (402)');
    console.log('   - Recommended: Deposit prepaid balance for instant calls');
    console.log('   - Command: npx ts-node scripts/deposit.ts 0.1\n');
    console.log('💡 GitHub OAuth Account (Dashboard):');
    console.log('   - Starts at Grade E (reputation 50)');
    console.log('   - Initial credit limit: $0.1');
    console.log('   - Can link multiple wallets (shared debt limit)');
    console.log('   - All linked wallets share global_debt_limit\n');
    console.log('🚀 Next Steps:');
    console.log('   1. Fund with test CRO: https://cronos.org/faucet (zkEVM Testnet)');
    console.log('   2. (Optional) Deposit for instant calls: npx ts-node scripts/deposit.ts 0.1');
    console.log('   3. Test API call: npx ts-node scripts/run-agent.ts\n');

    rl.close();
}

main();
