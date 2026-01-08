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

async function main() {
    const account = privateKeyToAccount(PRIV_KEY);
    const client = createWalletClient({
        account,
        chain: cronosZkEVMTestnet,
        transport: http('https://testnet.zkevm.cronos.org')
    }).extend(publicActions);

    console.log(`Testing PaymentHandler at ${PAYMENT_HANDLER}`);
    console.log(`Payer: ${account.address}`);

    // Pay 1 TCRO (1e18 wei)
    const amount = BigInt(10 ** 18);
    const fee = (amount * BigInt(50)) / BigInt(10000); // Expect 0.005 TCRO fee
    console.log(`Sending 1 TCRO. Expect Fee: ${fee} wei`);

    const hash = await client.writeContract({
        address: PAYMENT_HANDLER,
        abi: [{ name: 'pay', type: 'function', inputs: [{ type: 'uint256' }], outputs: [], stateMutability: 'payable' }],
        functionName: 'pay',
        args: [BigInt(999)], // Service ID 999
        value: amount
    });

    console.log(`Transaction Sent: ${hash}`);
    await client.waitForTransactionReceipt({ hash });
    console.log("Transaction Confirmed!");
}

main().catch(console.error);
