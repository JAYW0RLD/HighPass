import { createPublicClient, http, parseAbi, Address, defineChain, verifyMessage } from 'viem';
import { foundry } from 'viem/chains';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

const localEnvPath = path.join(__dirname, '../../.env.local');
if (fs.existsSync(localEnvPath)) {
    dotenv.config({ path: localEnvPath, override: true });
}
dotenv.config({ path: path.join(__dirname, '../../.env') });

const CONTRACT_ADDRESS = process.env.IDENTITY_CONTRACT_ADDRESS as Address;
const CHAIN_ID = Number(process.env.CHAIN_ID) || 31337;
const RPC_URL = process.env.RPC_URL || 'http://127.0.0.1:8545';

// Define Cronos if needed, or use generic
const currentChain = defineChain({
    id: CHAIN_ID,
    name: 'Current Chain',
    network: 'current-chain',
    nativeCurrency: { decimals: 18, name: 'Token', symbol: 'TOK' },
    rpcUrls: { default: { http: [RPC_URL] }, public: { http: [RPC_URL] } }
});

const abi = parseAbi([
    'function getReputation(uint256 agentId) external view returns (uint256)',
    'function hasReputation(uint256 agentId) external view returns (bool)'
]);

export class IdentityService {
    public getClient() {
        const CHAIN_ID = Number(process.env.CHAIN_ID) || 31337;
        const RPC_URL = process.env.RPC_URL || 'https://testnet.zkevm.cronos.org';

        const currentChain = defineChain({
            id: CHAIN_ID,
            name: 'Current Chain',
            network: 'current-chain',
            nativeCurrency: { decimals: 18, name: 'Token', symbol: 'TOK' },
            rpcUrls: { default: { http: [RPC_URL] }, public: { http: [RPC_URL] } }
        });

        return createPublicClient({
            chain: currentChain,
            transport: http(RPC_URL)
        });
    }

    async getReputation(agentId: string): Promise<number> {
        // DEMO OVERRIDES FOR ACCESSIBILITY / SIMULATOR
        if (agentId === 'prime-agent') return 95; // Grade A
        if (agentId === 'trusted-agent') return 85; // Grade B
        if (agentId === 'subprime-agent') return 75; // Grade C
        if (agentId === 'risky-agent') return 40; // Grade F

        let idVal: bigint;
        try {
            idVal = BigInt(agentId);
        } catch {
            idVal = BigInt(0);
        }

        const contractAddr = process.env.IDENTITY_CONTRACT_ADDRESS as Address;
        if (!contractAddr) {
            console.warn("IDENTITY_CONTRACT_ADDRESS not set");
            return 0; // Default fail
        }

        const CHAIN_ID = Number(process.env.CHAIN_ID) || 31337;
        const publicClient = this.getClient();

        try {
            let score: bigint = BigInt(0);
            for (let i = 0; i < 3; i++) {
                try {
                    score = await publicClient.readContract({
                        address: contractAddr,
                        abi,
                        functionName: 'getReputation',
                        args: [idVal]
                    });
                    break; // Success
                } catch (e) {
                    if (i === 2) throw e;
                    console.warn(`[IdentityService] Read attempt ${i + 1} failed. Retrying...`);
                    await new Promise(r => setTimeout(r, 1000));
                }
            }
            console.log(`[IdentityService] Checked Agent ${idVal} at ${contractAddr} (Chain ${CHAIN_ID}) -> Score: ${score}`);
            return Number(score);
        } catch (error) {
            console.error("Error reading reputation:", error);
            // On new networks, deployment might fail or not propagate immediately.
            return 0;
        }
    }

    async getCreditGrade(agentId: string): Promise<string> {
        const score = await this.getReputation(agentId);
        if (score >= 90) return 'A';
        if (score >= 80) return 'B';
        if (score >= 70) return 'C';
        if (score >= 60) return 'D';
        if (score >= 50) return 'E';
        return 'F';
    }

    async isTrusted(agentId: string, threshold: number = 70): Promise<boolean> {
        const score = await this.getReputation(agentId);
        return score >= threshold;
    }

    async verifySignature(agentId: string, signature: string, timestamp: string): Promise<boolean> {
        // Message format must match what the client signs
        const message = `Identify as ${agentId} at ${timestamp}`;

        try {
            // Check formatted string is correct address
            if (!agentId.startsWith('0x') || agentId.length !== 42) {
                console.warn(`[Identity] Invalid Agent ID format for address: ${agentId}`);
                // return false; // Fail open for hackathon if using non-address IDs like "prime-agent"?
                // Actually, our demo uses "prime-agent". Viem verifyMessage needs an Address.
                // If agentId is "prime-agent", we can't verify signature against a string unless we map it to an address.
                // For the Hackathon Demo: ALLOW specific demo IDs to bypass signature check 
                // BUT log a warning that this is unsafe.
                if (['prime-agent', 'trusted-agent', 'subprime-agent', 'risky-agent'].includes(agentId)) {
                    console.log(`[Identity] Demo Agent ${agentId} - Skipping signature check.`);
                    return true;
                }
                return false;
            }

            const valid = await verifyMessage({
                address: agentId as `0x${string}`,
                message: message,
                signature: signature as `0x${string}`
            });

            return valid;
        } catch (error) {
            console.error(`[Identity] Signature verification failed:`, error);
            return false;
        }
    }
}
