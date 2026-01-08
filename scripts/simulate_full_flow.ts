import { createWalletClient, http, parseAbi, encodeFunctionData, createPublicClient } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { foundry } from 'viem/chains';
import axios from 'axios';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '../../.env') });

const CONTRACT_ADDRESS = process.env.IDENTITY_CONTRACT_ADDRESS;
const PRIV_KEY = '0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d'; // Account #1 (Buyer)
const account = privateKeyToAccount(PRIV_KEY);

const client = createWalletClient({
    account,
    chain: foundry,
    transport: http('http://127.0.0.1:8545')
});

const publicClient = createPublicClient({
    chain: foundry,
    transport: http('http://127.0.0.1:8545')
});

const GATEWAY_URL = 'http://localhost:3000/gatekeeper/resource';
const AGENT_ID = '12345'; // Arbitrary ID for this agent

async function main() {
    console.log(">>> STARTING SELF-LOOP VERIFICATION <<<");
    console.log(`Agent Account: ${account.address}`);
    console.log(`Identity Contract: ${CONTRACT_ADDRESS}`);

    // Scenario 1: Access without reputation
    console.log("\n[Scenario 1] Accessing without reputation...");
    try {
        await axios.get(GATEWAY_URL, {
            headers: { 'X-Agent-ID': AGENT_ID }
        });
        console.error("FAILED: Should have been rejected (403)");
    } catch (error: any) {
        if (error.response?.status === 403) {
            console.log("SUCCESS: Received 403 Forbidden as expected.");
        } else {
            console.error(`FAILED: Unexpected status ${error.response?.status}`);
            console.error(error.message);
        }
    }

    // Scenario 2: Increase Reputation -> Expect 402
    console.log("\n[Scenario 2] Increasing reputation...");
    const abi = parseAbi(['function setReputation(uint256 agentId, uint256 score) external']);

    try {
        const hash = await client.writeContract({
            address: CONTRACT_ADDRESS as `0x${string}`,
            abi,
            functionName: 'setReputation',
            args: [BigInt(AGENT_ID), BigInt(80)]
        });
        console.log(`Transaction sent: ${hash}`);
        await publicClient.waitForTransactionReceipt({ hash });
        console.log("Reputation set to 80.");

        console.log("Accessing again (High Reputation, No Payment)...");
        await axios.get(GATEWAY_URL, {
            headers: { 'X-Agent-ID': AGENT_ID }
        });
        console.error("FAILED: Should have been 402");
    } catch (error: any) {
        if (error.response?.status === 402) {
            console.log("SUCCESS: Received 402 Payment Required as expected.");
            const authHeader = error.response.headers['www-authenticate'];
            console.log(`Header: ${authHeader}`);
        } else {
            console.error(`FAILED: Unexpected status ${error.response?.status}`);
            console.error(error.response?.data);
        }
    }

    // Scenario 3: Provide Payment Proof -> Expect 200
    console.log("\n[Scenario 3] Generating Payment Proof...");
    // Mocking the payment proof as per our middleware expectation 'Token <sig>'
    const proof = "Token 0xSignedPaymentProofStoredHere1234567890";

    try {
        const res = await axios.get(GATEWAY_URL, {
            headers: {
                'X-Agent-ID': AGENT_ID,
                'Authorization': proof
            }
        });

        if (res.status === 200) {
            console.log("SUCCESS: Received 200 OK.");
            console.log("Data:", res.data);
        } else {
            console.error(`FAILED: Unexpected status ${res.status}`);
        }
    } catch (error: any) {
        console.error("FAILED: Request errored even with payment.");
        console.error(error.response?.data);
    }
}

main();
