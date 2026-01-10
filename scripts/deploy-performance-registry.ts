import { createPublicClient, createWalletClient, http, parseAbi } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { cronosTestnet } from 'viem/chains';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Deploy ProviderPerformanceRegistry.sol to Cronos Testnet
 * 
 * Usage:
 *   npm run deploy:performance-registry
 * 
 * Environment Variables:
 *   DEPLOYER_PRIVATE_KEY - Private key for deploying (must be owner)
 *   CRONOS_RPC_URL - RPC endpoint (default: Cronos Testnet)
 */

async function main() {
    // Validate environment
    const privateKey = process.env.DEPLOYER_PRIVATE_KEY;
    if (!privateKey) {
        throw new Error('DEPLOYER_PRIVATE_KEY not set in environment');
    }

    const rpcUrl = process.env.CRONOS_RPC_URL || 'https://evm-t3.cronos.org';

    console.log('\n========================================');
    console.log('ProviderPerformanceRegistry Deployment');
    console.log('========================================\n');
    console.log('Network:', 'Cronos zkEVM Testnet');
    console.log('RPC:', rpcUrl);

    // Setup wallet
    const account = privateKeyToAccount(privateKey as `0x${string}`);
    const walletClient = createWalletClient({
        account,
        chain: cronosTestnet,
        transport: http(rpcUrl)
    });

    console.log('Deployer:', account.address);
    console.log('\n========================================\n');

    // Read contract bytecode and ABI
    const artifactPath = path.join(__dirname, '../../out/ProviderPerformanceRegistry.sol/ProviderPerformanceRegistry.json');

    if (!fs.existsSync(artifactPath)) {
        console.error('❌ Contract artifact not found!');
        console.error('  Path:', artifactPath);
        console.error('\nPlease compile the contract first:');
        console.error('  forge build');
        process.exit(1);
    }

    const artifact = JSON.parse(fs.readFileSync(artifactPath, 'utf8'));
    const bytecode = artifact.bytecode.object as `0x${string}`;
    const abi = artifact.abi;

    console.log('📄 Contract artifact loaded');
    console.log('   Bytecode size:', Math.floor(bytecode.length / 2), 'bytes');
    console.log('\n⏳ Deploying contract...\n');

    try {
        // Deploy contract
        const hash = await walletClient.deployContract({
            abi,
            bytecode,
            args: [] // Constructor has no arguments
        });

        console.log('✅ Transaction submitted:', hash);
        console.log('⏳ Waiting for confirmation...\n');

        // Wait for transaction receipt
        const publicClient = createPublicClient({
            chain: cronosTestnet,
            transport: http(rpcUrl)
        });

        const receipt = await publicClient.waitForTransactionReceipt({ hash });

        if (receipt.status === 'success' && receipt.contractAddress) {
            console.log('========================================');
            console.log('✅ DEPLOYMENT SUCCESSFUL!');
            console.log('========================================\n');
            console.log('Contract Address:', receipt.contractAddress);
            console.log('Transaction Hash:', receipt.transactionHash);
            console.log('Block Number:', receipt.blockNumber);
            console.log('Gas Used:', receipt.gasUsed.toString());
            console.log('\n========================================');
            console.log('NEXT STEPS:');
            console.log('========================================\n');
            console.log('1. Add to .env:');
            console.log(`   PERFORMANCE_REGISTRY_ADDRESS=${receipt.contractAddress}\n`);
            console.log('2. Verify on Explorer:');
            console.log(`   https://testnet.cronoscan.com/address/${receipt.contractAddress}\n`);
            console.log('3. Run DB migration:');
            console.log('   psql $DATABASE_URL -f migrations/v1.7.0_provider_performance.sql\n');
            console.log('4. Start cron job:');
            console.log('   npm run start:cron\n');
            console.log('========================================\n');

            // Save deployment info
            const deploymentInfo = {
                network: 'cronos-testnet',
                contractAddress: receipt.contractAddress,
                transactionHash: receipt.transactionHash,
                blockNumber: Number(receipt.blockNumber),
                gasUsed: receipt.gasUsed.toString(),
                deployer: account.address,
                timestamp: new Date().toISOString()
            };

            const deploymentPath = path.join(__dirname, '../../deployments/performance-registry.json');
            fs.mkdirSync(path.dirname(deploymentPath), { recursive: true });
            fs.writeFileSync(deploymentPath, JSON.stringify(deploymentInfo, null, 2));

            console.log('📝 Deployment info saved to:', deploymentPath);

        } else {
            console.error('❌ Deployment failed');
            process.exit(1);
        }

    } catch (error) {
        console.error('\n❌ Deployment error:', error);
        process.exit(1);
    }
}

main().catch(console.error);
