import { createPublicClient, createWalletClient, http, parseAbi } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { foundry } from 'viem/chains';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

dotenv.config();

// SECURITY FIX: Do not hardcode private keys, even for testnet
const PRIV_KEY = process.env.PRIVATE_KEY as `0x${string}`;

if (!PRIV_KEY) {
    console.error("Missing PRIVATE_KEY in .env");
    process.exit(1);
}

const account = privateKeyToAccount(PRIV_KEY);

const client = createWalletClient({
    account,
    chain: foundry,
    transport: http()
});

const publicClient = createPublicClient({
    chain: foundry,
    transport: http()
});

async function main() {
    console.log("Deploying MockERC8004...");

    const artifactPath = path.join(__dirname, '../../out/MockERC8004.sol/MockERC8004.json');
    if (!fs.existsSync(artifactPath)) {
        console.error("Artifact not found at:", artifactPath);
        process.exit(1);
    }

    const artifact = JSON.parse(fs.readFileSync(artifactPath, 'utf8'));
    const abi = artifact.abi;
    const bytecode = artifact.bytecode.object;

    const hash = await client.deployContract({
        abi,
        account,
        bytecode,
    });

    console.log("Transaction Hash:", hash);
    const receipt = await publicClient.waitForTransactionReceipt({ hash });

    if (receipt.contractAddress) {
        console.log("MockERC8004 Deployed at:", receipt.contractAddress);
        // Write to .env
        const envPath = path.join(__dirname, '../../.env');
        fs.writeFileSync(envPath, `IDENTITY_CONTRACT_ADDRESS=${receipt.contractAddress}\nPRIVATE_KEY=${PRIV_KEY}\n`);
    } else {
        console.error("Deployment failed");
    }
}

main().catch(console.error);
