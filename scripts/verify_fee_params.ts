
import { createWalletClient, http, publicActions, parseEther } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { defineChain } from 'viem';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';
import * as child_process from 'child_process';
import assert from 'assert';

// Force load .env from root
dotenv.config({ path: path.join(__dirname, '../.env') });

const cronosZkEVMTestnet = defineChain({
    id: 240, // Match the anvil fork chain ID
    name: 'Anvil Local Fork',
    network: 'cronos-zkevm-testnet',
    nativeCurrency: { decimals: 18, name: 'Cronos', symbol: 'TCRO' },
    rpcUrls: { default: { http: ['http://127.0.0.1:8545'] }, public: { http: ['http://127.0.0.1:8545'] } },
    testnet: true,
});

// Use a known anvil private key (Account #0)
const PRIV_KEY = "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80";
const account = privateKeyToAccount(PRIV_KEY);

const client = createWalletClient({
    account,
    chain: cronosZkEVMTestnet,
    transport: http()
}).extend(publicActions);

async function deployContract(name: string, args: any[] = []) {
    console.log(`\nDeploying ${name}...`);
    const artifactPath = path.join(__dirname, `../out/${name}.sol/${name}.json`);

    try {
        console.log("Running forge build...");
        child_process.execSync('forge build', { cwd: path.join(__dirname, '../'), stdio: 'inherit' });
    } catch (e) {
        console.error("Build failed");
        process.exit(1);
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
    return { address: receipt.contractAddress!, abi: artifact.abi };
}

async function verify() {
    console.log(">>> Verifying Flexible Fee Parameters <<<");

    // 1. Deploy
    const { address, abi } = await deployContract('PaymentHandler', [account.address]);

    // Helper to read state
    const read = async (fn: string) => {
        return await client.readContract({
            address, abi, functionName: fn
        });
    }

    // 2. Check Initial Values
    const initialMin = await read('minPayment');
    const initialCap = await read('safetyCapBps');
    console.log(`[Init] MinPayment: ${initialMin}, Cap: ${initialCap}`);

    assert.equal(initialMin, 10000n, "Default min payment mismatch");
    assert.equal(initialCap, 2000n, "Default safety cap mismatch");

    // 3. Test: Update Parameters (Valid)
    console.log("\n[Test] Updating Parameters to: Min=5000, Cap=40% (4000)");
    const hash = await client.writeContract({
        address, abi, functionName: 'setParams', args: [5000n, 4000n]
    });
    await client.waitForTransactionReceipt({ hash });

    const newMin = await read('minPayment');
    const newCap = await read('safetyCapBps');
    assert.equal(newMin, 5000n, "Update failed: MinPayment");
    assert.equal(newCap, 4000n, "Update failed: SafetyCap");
    console.log("✅ Parameters updated successfully");

    // 4. Test: Update Parameters (Invalid - Cap > 50%)
    console.log("\n[Test] Attempting excessive cap (60%)...");
    try {
        await client.writeContract({
            address, abi, functionName: 'setParams', args: [5000n, 6000n]
        });
        console.error("❌ Failed to revert on excessive fee");
        process.exit(1);
    } catch (e) {
        console.log("✅ Reverted as expected (Cap > 50%)");
    }

    // 5. Test: Pay with new limits
    console.log("\n[Test] Making payment with new 40% cap...");
    const paymentAmount = 100000n;
    const fee = 30000n; // 30% (OK since cap is 40%)

    const payHash = await client.writeContract({
        address, abi, functionName: 'pay', args: [123n, fee], value: paymentAmount
    });
    const receipt = await client.waitForTransactionReceipt({ hash: payHash });
    assert.equal(receipt.status, 'success', "Payment failed");
    console.log("✅ Payment successful with adjusted cap");

    // 6. Test: Pay exceeding cap
    console.log("\n[Test] Making payment exceeding 40% cap...");
    const excessiveFee = 45000n; // 45% (Fail)
    try {
        await client.writeContract({
            address, abi, functionName: 'pay', args: [123n, excessiveFee], value: paymentAmount
        });
        console.error("❌ Failed to revert on excessive fee");
        process.exit(1);
    } catch (e) {
        console.log("✅ Reverted as expected (Fee > Cap)");
    }

    console.log("\n🎉 ALL CHECKS PASSED");
}

verify().catch(console.error);
