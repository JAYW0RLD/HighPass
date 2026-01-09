
import { generatePrivateKey, privateKeyToAccount } from 'viem/accounts';
import * as fs from 'fs';
import * as path from 'path';

const WALLET_FILE = path.join(__dirname, 'agent-wallet.json');

async function main() {
    console.log("\n🤖 INITIALIZING NEW AGENT...");
    console.log("===========================");

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
    console.log(`\n🚀 THEN RUN: npx ts-node scripts/run-agent.ts`);
}

main();
