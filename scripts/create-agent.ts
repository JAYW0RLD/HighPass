
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
    console.log(`\n💰 NEXT STEP: Fund this wallet with test tokens.`);
    console.log(`   (Send CRO/ETH to this address on the testnet)`);

    console.log(`\n📊 IMPORTANT: New wallets start at Grade F (0 reputation)`);
    console.log(`   • Grade F = Pay-per-call (402 Payment Required for each API call)`);
    console.log(`   • This means slower execution due to on-chain transactions`);
    console.log(`\n💡 TIP: For faster testing, fund your wallet with sufficient CRO`);
    console.log(`   → Each API call costs ~0.0001-0.1 CRO + gas fees`);
    console.log(`   → Recommended: 1-5 CRO for smooth testing`);

    console.log(`\n🚀 THEN RUN: npx ts-node scripts/run-agent.ts\n`);

    rl.close();
}

main();
