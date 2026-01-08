import { createWalletClient, http, publicActions } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { defineChain } from 'viem';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';
import * as child_process from 'child_process';

// Force load .env from root
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
const ADMIN_ADDR = process.env.ADMIN_WALLET_ADDRESS as `0x${string}`;

if (!PRIV_KEY || !ADMIN_ADDR) {
    console.error("Missing PRIVATE_KEY or ADMIN_WALLET_ADDRESS in .env");
    process.exit(1);
}

const account = privateKeyToAccount(PRIV_KEY);

const client = createWalletClient({
    account,
    chain: cronosZkEVMTestnet,
    transport: http()
}).extend(publicActions);

async function deployContract(name: string, args: any[] = []) {
    console.log(`\nDeploying ${name}...`);
    const artifactPath = path.join(__dirname, `../../out/${name}.sol/${name}.json`);

    if (!fs.existsSync(artifactPath)) {
        console.error(`Artifact not found: ${artifactPath}. Running forge build...`);
        child_process.execSync('forge build', { cwd: path.join(__dirname, '../../') });
    }

    const artifact = JSON.parse(fs.readFileSync(artifactPath, 'utf8'));
    const hash = await client.deployContract({
        abi: artifact.abi,
        account,
        bytecode: artifact.bytecode.object,
        args
    });

    console.log(`Tx Sent: ${hash}. Waiting...`);
    const receipt = await client.waitForTransactionReceipt({ hash });
    console.log(`${name} Deployed at: ${receipt.contractAddress}`);
    return receipt.contractAddress;
}

async function main() {
    console.log(`>>> Deploying to Cronos zkEVM Public Testnet (ChainID: 240) <<<`);
    console.log(`Deployer: ${account.address}`);

    // 1. Deploy MockERC8004
    const identityAddress = await deployContract('MockERC8004');

    // 2. Deploy PaymentHandler (Fee Logic)
    const paymentAddress = await deployContract('PaymentHandler', [ADMIN_ADDR]);

    // 3. Update .env
    const envPath = path.join(__dirname, '../../.env');
    let envContent = fs.readFileSync(envPath, 'utf8');

    const updateEnv = (key: string, val: string) => {
        const regex = new RegExp(`${key}=.*`);
        if (envContent.match(regex)) {
            envContent = envContent.replace(regex, `${key}=${val}`);
        } else {
            envContent += `\n${key}=${val}`;
        }
    };

    updateEnv('IDENTITY_CONTRACT_ADDRESS', identityAddress!);
    updateEnv('PAYMENT_HANDLER_ADDRESS', paymentAddress!);

    fs.writeFileSync(envPath, envContent);
    console.log("\n>>> Deployment Complete. .env updated.");
}

main().catch(console.error);
