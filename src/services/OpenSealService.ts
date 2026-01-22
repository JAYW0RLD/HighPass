
import { query } from '../database/db';
import { OpensealVerifier } from '../lib/openseal-verifier';

interface OpenSealManifest {
    version: string;
    identity: {
        root_hash: number[] | string; // Can be array of bytes (serde default) or hex string
        file_count: number;
        mutable_files: string[];
    };
    sealed: boolean;
    timestamp?: string;
    exec?: string;
}

export class OpenSealService {

    /**
     * Resolves the raw user content URL for openseal.json from a GitHub repository URL.
     * Supports:
     * - https://github.com/user/repo -> https://raw.githubusercontent.com/user/repo/main/openseal.json
     * - https://github.com/user/repo/blob/branch/openseal.json -> https://raw.githubusercontent.com/user/repo/branch/openseal.json
     */
    static resolveManifestUrl(repoUrl: string): string {
        // Basic normalization logic
        let rawUrl = repoUrl;

        if (repoUrl.startsWith('https://github.com/')) {
            // Convert to raw.githubusercontent.com
            rawUrl = repoUrl.replace('https://github.com/', 'https://raw.githubusercontent.com/');

            // Handle Release Tags: https://github.com/user/repo/releases/tag/v1.0.0
            // Raw: https://raw.githubusercontent.com/user/repo/v1.0.0/openseal.json
            if (repoUrl.includes('/releases/tag/')) {
                rawUrl = rawUrl.replace('/releases/tag/', '/');
                // Ensure we don't duplicate logic below, just append filename if needed
                if (!rawUrl.endsWith('openseal.json')) {
                    if (rawUrl.endsWith('/')) rawUrl = rawUrl.slice(0, -1);
                    rawUrl += '/openseal.json';
                }
                return rawUrl;
            }

            // If URL points to root of repo, assume main branch and openseal.json
            if (!rawUrl.includes('/blob/')) {
                // Remove trailing slash
                if (rawUrl.endsWith('/')) rawUrl = rawUrl.slice(0, -1);
                rawUrl += '/main/openseal.json'; // Default to main
            } else {
                // If blob url: https://github.com/user/repo/blob/main/openseal.json
                // Raw: https://raw.githubusercontent.com/user/repo/main/openseal.json
                rawUrl = rawUrl.replace('/blob/', '/');
            }
        }

        // Ensure it ends with openseal.json (User might have passed just repo root)
        if (!rawUrl.endsWith('openseal.json')) {
            if (rawUrl.endsWith('/')) rawUrl = rawUrl.slice(0, -1);
            rawUrl += '/openseal.json';
        }

        return rawUrl;
    }

    /**
     * Fetches and validates the OpenSeal Identity Manifest.
     */
    static async fetchManifest(manifestUrl: string): Promise<OpenSealManifest> {
        try {
            console.log(`[OpenSeal] Fetching manifest from ${manifestUrl}`);
            const response = await fetch(manifestUrl, {
                // Add timeout
                signal: AbortSignal.timeout(5000)
            });

            if (!response.ok) {
                throw new Error(`Failed to fetch manifest: ${response.status} ${response.statusText}`);
            }

            const manifest = await response.json() as OpenSealManifest;

            // Validate Schema
            if (!manifest.identity || !manifest.identity.root_hash) {
                throw new Error('Invalid Manifest: Missing identity.root_hash');
            }

            return manifest;
        } catch (error: any) {
            console.error('[OpenSeal] Fetch Error:', error);
            throw new Error(`OpenSeal Manifest Fetch Failed: ${error.message}`);
        }
    }

    /**
     * Registers OpenSeal Identity for a service.
     * v2.0: Accepts direct root hash (A-hash) from the provider.
     * Legacy: Fetches from GitHub if rootHash is not provided.
     */
    static async registerIdentity(serviceId: string, providerId: string, repoUrl: string, rootHash?: string): Promise<any> {
        let rootHashHex = rootHash;

        if (!rootHashHex) {
            console.log(`[OpenSeal] Falling back to legacy GitHub fetch for ${repoUrl}`);
            // 1. Resolve URL
            const manifestUrl = this.resolveManifestUrl(repoUrl);

            // 2. Fetch Manifest
            const manifest = await this.fetchManifest(manifestUrl);

            // 3. Extract Root Hash (Sanitize to Hex String)
            const rawRootHash = manifest.identity.root_hash;

            if (Array.isArray(rawRootHash)) {
                // Convert byte array to hex
                rootHashHex = Buffer.from(rawRootHash).toString('hex');
            } else if (typeof rawRootHash === 'string') {
                rootHashHex = rawRootHash;
            } else {
                throw new Error('Invalid root_hash format in manifest');
            }
        }

        // 4. Update Database
        const sql = `
            UPDATE services
            SET 
                openseal_repo_url = $1,
                openseal_root_hash = $2,
                updated_at = NOW()
            WHERE id = $3 AND provider_id = $4
            RETURNING id, slug, name, openseal_repo_url, openseal_root_hash
        `;

        const result = await query(sql, [repoUrl, rootHashHex, serviceId, providerId]);

        if (result.rows.length === 0) {
            throw new Error('Service not found or unauthorized');
        }

        return {
            service: result.rows[0],
            version: "2.0.0 (Direct)"
        };
    }
}
