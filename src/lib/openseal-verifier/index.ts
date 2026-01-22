
import { blake3 } from '@noble/hashes/blake3.js';
import * as ed from '@noble/ed25519';
import { bytesToHex, hexToBytes } from '@noble/hashes/utils.js';
import { spawnSync } from 'child_process';
import path from 'path';
import fs from 'fs';

export interface OpenSealResponse {
    result: any;
    openseal: {
        signature: string;
        pub_key: string;
        a_hash: string;
        b_hash: string;
    };
}

export interface VerificationResult {
    valid: boolean;
    signatureVerified: boolean;
    identityVerified: boolean;
    message: string;
}

export class OpensealVerifier {
    /**
     * Verifies the OpenSeal response.
     * v2.0: Primarily uses the OpenSeal CLI binary for verification.
     * Fallback: Uses native TS implementation if binary is missing.
     */
    static async verify(
        response: OpenSealResponse,
        wax: string,
        expectedRootHash?: string
    ): Promise<VerificationResult> {
        // [NEW] Use CLI Binary if available (The Latest Truth)
        const binaryPath = path.join(process.cwd(), 'bin', 'openseal');
        if (fs.existsSync(binaryPath)) {
            return this.verifyWithCli(binaryPath, response, wax, expectedRootHash);
        }

        console.warn('[OpenSeal] CLI binary not found at', binaryPath, '- Falling back to native TS verifier.');
        return this.verifyNative(response, wax, expectedRootHash);
    }

    /**
     * Internal implementation using OpenSeal CLI binary
     */
    private static verifyWithCli(
        binaryPath: string,
        response: OpenSealResponse,
        wax: string,
        expectedRootHash?: string
    ): VerificationResult {
        const tempFilePath = path.join(process.cwd(), `temp_response_${Date.now()}.json`);
        try {
            const inputJson = JSON.stringify(response);
            fs.writeFileSync(tempFilePath, inputJson);

            const args = ['verify', '--response', tempFilePath, '--wax', wax];
            if (expectedRootHash) {
                args.push('--root-hash', expectedRootHash);
            }

            const result = spawnSync(binaryPath, args, {
                encoding: 'utf-8'
            });

            const output = result.stdout;
            const error = result.stderr;
            const success = result.status === 0;

            // Cleanup
            if (fs.existsSync(tempFilePath)) fs.unlinkSync(tempFilePath);

            if (success) {
                return {
                    valid: true,
                    signatureVerified: true,
                    identityVerified: true,
                    message: "✅ SEAL VALID (CLI Verified)"
                };
            } else {
                // Extract result message from output
                const resultMatch = output.match(/Result: (.*)/);
                const message = resultMatch ? resultMatch[1] : (output + error || "Verification failed (CLI)");

                return {
                    valid: false,
                    signatureVerified: output.includes("Signature Valid: ✅"),
                    identityVerified: output.includes("Identity Valid:  ✅"),
                    message: `CLI Error: ${message}`
                };
            }
        } catch (e: any) {
            if (fs.existsSync(tempFilePath)) fs.unlinkSync(tempFilePath);
            return {
                valid: false,
                signatureVerified: false,
                identityVerified: false,
                message: `CLI Spawn Error: ${e.message}`
            };
        }
    }

    /**
     * Native TypeScript implementation (Legacy/Fallback)
     */
    static async verifyNative(
        response: OpenSealResponse,
        wax: string,
        expectedRootHash?: string
    ): Promise<VerificationResult> {
        try {
            const { openseal, result } = response;
            if (!openseal || !result) {
                return { valid: false, signatureVerified: false, identityVerified: false, message: "Missing openseal or result fields" };
            }

            const { signature, pub_key, a_hash, b_hash } = openseal;
            if (!signature || !pub_key || !a_hash || !b_hash) {
                return { valid: false, signatureVerified: false, identityVerified: false, message: "Incomplete openseal metadata" };
            }

            // 1. Reconstruct Result Hash (Blake3Hex)
            let resultStr: string;
            if (typeof result === 'string') {
                resultStr = result;
            } else {
                resultStr = JSON.stringify(result);
            }

            const resultBytes = new TextEncoder().encode(resultStr);
            const resultHashBytes = blake3(resultBytes);
            const resultHashHex = bytesToHex(resultHashBytes);

            // 2. Reconstruct Payload
            const payloadString = `${wax}${a_hash}${b_hash}${resultHashHex}`;
            const payloadBytes = new TextEncoder().encode(payloadString);

            // 3. Verify Signature
            const signatureBytes = hexToBytes(signature);
            const pubKeyBytes = hexToBytes(pub_key);

            const isValidSignature = await ed.verifyAsync(signatureBytes, payloadBytes, pubKeyBytes);

            if (!isValidSignature) {
                return {
                    valid: false,
                    signatureVerified: false,
                    identityVerified: false,
                    message: "Signature verification failed"
                };
            }

            // 4. Verify Identity (A-Hash)
            let isIdentityValid = true;
            if (expectedRootHash) {
                const calculatedAHash = this.computeAHash(expectedRootHash, wax);
                if (calculatedAHash !== a_hash) {
                    isIdentityValid = false;
                }
            }

            if (expectedRootHash && !isIdentityValid) {
                return {
                    valid: false,
                    signatureVerified: true,
                    identityVerified: false,
                    message: "Identity Mismatch: Code execution identity does not match expected root hash (Native)."
                };
            }

            return {
                valid: true,
                signatureVerified: true,
                identityVerified: true,
                message: "✅ SEAL VALID (Native)"
            };

        } catch (e: any) {
            return {
                valid: false,
                signatureVerified: false,
                identityVerified: false,
                message: `Native Verification Error: ${e.message}`
            };
        }
    }

    /**
     * Computes the Blinded Identity (A-Hash).
     * A = Blake3("OPENSEAL_BLINDED_IDENTITY" || RootHashBytes || WaxBytes)
     */
    static computeAHash(rootHashHex: string, wax: string): string {
        const rootHashBytes = hexToBytes(rootHashHex);
        const waxBytes = new TextEncoder().encode(wax);
        const prefixBytes = new TextEncoder().encode("OPENSEAL_BLINDED_IDENTITY");

        const hasher = blake3.create({});
        hasher.update(prefixBytes);
        hasher.update(rootHashBytes);
        hasher.update(waxBytes);

        return bytesToHex(hasher.digest());
    }
}
