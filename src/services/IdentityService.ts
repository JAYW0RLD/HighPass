import { createPublicClient, http, parseAbi, Address, defineChain, verifyMessage } from 'viem';
import { publicClient } from '../utils/viemClient';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

const localEnvPath = path.join(__dirname, '../../.env.local');
if (fs.existsSync(localEnvPath)) {
    dotenv.config({ path: localEnvPath, override: true });
}
dotenv.config({ path: path.join(__dirname, '../../.env') });

const CHAIN_ID = Number(process.env.CHAIN_ID) || 31337;


// Define Cronos if needed, or use generic


// Removed redundant Chain Definition and RPC_URL
// IdentityService now uses shared publicClient from utils/viemClient


const abi = parseAbi([
    'function getReputation(uint256 agentId) external view returns (uint256)',
    'function hasReputation(uint256 agentId) external view returns (bool)'
]);

export class IdentityService {
    // public getClient() removed - using shared singleton

    async getReputation(agentId: string): Promise<number> {
        if (!agentId) throw new Error("Agent ID cannot be empty");

        // SECURITY FIX (V-07): Removed hardcoded demo agent bypasses
        // All agents must have valid wallet addresses and on-chain reputation
        // Previous code allowed 'prime-agent', 'trusted-agent' etc. to bypass authentication

        // Enforce strict address format
        if (!agentId.startsWith('0x') || agentId.length !== 42) {
            throw new Error(`Invalid wallet address format: ${agentId}. Must be 0x + 40 hex characters.`);
        }

        let idVal: bigint;
        try {
            idVal = BigInt(agentId);
        } catch {
            console.warn(`[IdentityService] Invalid non-numeric ID: ${agentId}`);
            return 0; // Return 0 for invalid addresses
        }

        const contractAddr = process.env.IDENTITY_CONTRACT_ADDRESS as Address;
        if (!contractAddr) {
            console.warn("IDENTITY_CONTRACT_ADDRESS not set");
            return 0; // Default fail
        }

        const CHAIN_ID = Number(process.env.CHAIN_ID) || 31337;
        // Use shared client
        // const publicClient = this.getClient(); 

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
        if (threshold < 0) throw new Error("Threshold cannot be negative");
        const score = await this.getReputation(agentId);
        return score >= threshold;
    }

    async verifySignature(agentId: string, signature: string, timestamp: string, nonce: string): Promise<boolean> {
        // Message format must match what the client signs
        // SECURITY: Nonce included to prevent replay attacks
        const message = `Identify as ${agentId} at ${timestamp} with nonce ${nonce}`;

        try {
            // Check formatted string is correct address
            if (!agentId.startsWith('0x') || agentId.length !== 42) {
                console.warn(`[Identity] Invalid Agent ID format for address: ${agentId}`);
                // return false; // Fail open for hackathon if using non-address IDs like "prime-agent"?
                // Actually, our demo uses "prime-agent". Viem verifyMessage needs an Address.
                // If agentId is "prime-agent", we can't verify signature against a string unless we map it to an address.
                // For the Hackathon Demo: ALLOW specific demo IDs to bypass signature check 
                // BUT log a warning that this is unsafe.
                // Removed insecure demo agent bypass (V-01)
                console.warn(`[Identity] Rejected invalid Agent ID format: ${agentId}`);
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
