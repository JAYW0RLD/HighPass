import express from 'express';
import { query } from '../database/db';
import { isBlockedIP } from '../utils/validators';
import crypto from 'crypto';
import * as dns from 'dns/promises';
import { DomainVerificationService } from '../services/DomainVerificationService';
import * as net from 'net';
import { URL } from 'url';

import { OpenSealService } from '../services/OpenSealService';
const router = express.Router();

/**
 * POST /api/services
 * Create a new service (Authenticated Provider)
 * Bypasses RLS by using Backend Admin Client
 */
router.post('/', async (req, res) => {
    try {
        const userId = res.locals.user.id;
        const { name, slug, upstream_url, price_wei, access_requirements, openseal_repo_url, category, tags, description, capabilities, custom_domain } = req.body;

        if (!userId) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        // Basic Validation
        if (!name || !slug || !upstream_url) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        // SECURITY: Enforce HTTPS in Production
        // In local development (NODE_ENV != 'production'), allow http/localhost
        // EXCEPTION: Allow specific demo domains (Hackathon)
        const isProduction = process.env.NODE_ENV === 'production';
        const isDemo = upstream_url.includes('crypto-price-oracle-demo.duckdns.org');

        if (isProduction && !upstream_url.startsWith('https://') && !isDemo) {
            return res.status(400).json({
                error: 'Security Policy Violation',
                message: 'Production services must use HTTPS'
            });
        }

        // Slug Validation: Only allow a-z, 0-9, and hyphens
        if (!/^[a-z0-9-]+$/.test(slug)) {
            return res.status(400).json({
                error: 'Invalid Input',
                message: 'Slug must contain only lowercase letters, numbers, and hyphens (e.g., my-service-123).'
            });
        }

        try {
            const sql = `
                INSERT INTO services (
                    provider_id, name, slug, upstream_url, 
                    price_wei, access_requirements, min_grade, status,
                    openseal_repo_url, openseal_root_hash,
                    category, tags, description, capabilities, custom_domain
                )
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
                RETURNING *
            `;

            // Standard Hybrid Logic: Extract min_grade from JSON or default to 'F'
            const requirements = access_requirements || {};
            const minGrade = requirements.min_grade || 'F';


            // MANDATORY GITHUB FETCH (V-15):
            // We ignore any 'openseal_root_hash' sent by the user.
            // We only populate it if 'openseal_repo_url' is provided and valid.
            let validRootHash: string | null = null;
            if (openseal_repo_url) {
                try {
                    console.log(`[Services API] Fetching OpenSeal Manifest for ${openseal_repo_url}`);
                    const manifestUrl = OpenSealService.resolveManifestUrl(openseal_repo_url);
                    const manifest = await OpenSealService.fetchManifest(manifestUrl);

                    // Extract Hash
                    const rawHash = manifest.identity.root_hash;
                    if (Array.isArray(rawHash)) {
                        validRootHash = Buffer.from(rawHash).toString('hex');
                    } else {
                        validRootHash = String(rawHash);
                    }
                } catch (osErr: any) {
                    return res.status(400).json({
                        error: 'OpenSeal Verification Failed',
                        details: osErr.message,
                        hint: 'Ensure your repo has a valid openseal.json in the main branch.'
                    });
                }
            }

            const values = [
                userId, name, slug, upstream_url,
                price_wei || '0',
                requirements, // JSONB
                minGrade,     // Explicit Column
                'pending',
                openseal_repo_url || null, validRootHash, // Use the fetched hash
                category || 'General',
                tags || [],
                description || '',
                capabilities || {},
                custom_domain || null
            ];

            const result = await query(sql, values);
            const data = result.rows[0];
            res.status(201).json(data);

        } catch (error: any) {
            console.error('[Services API] Insert error:', error);
            // Handle unique constraint violation (slug)
            if (error.code === '23505') {
                return res.status(409).json({ error: 'Service slug already exists' });
            }
            throw error;
        }

    } catch (error: any) {
        console.error('[Services API] Create Service error:', error);
        res.status(500).json({
            error: 'Failed to create service',
            details: error.message || error,
            code: error.code
        });
    }
});

/**
 * POST /api/services/utils/test-connection
 * Real-time probing of upstream URL with SSRF protection
 */
router.post('/utils/test-connection', async (req, res) => {
    try {
        const { url } = req.body;
        if (!url) return res.status(400).json({ error: 'URL required' });

        // 1. Syntax Check
        const { isSafeUrlSyntax, isBlockedIP } = require('../utils/validators');
        if (!isSafeUrlSyntax(url)) {
            return res.status(400).json({ error: 'Invalid or unsafe URL format' });
        }

        const urlObj = new URL(url);
        const hostname = urlObj.hostname;

        // 2. DNS Resolution & SSRF Check
        let resolvedIP: string;
        try {
            const addresses = await dns.resolve4(hostname);
            resolvedIP = addresses[0];
        } catch (e) {
            if (net.isIP(hostname)) {
                resolvedIP = hostname;
            } else {
                return res.status(400).json({ error: 'DNS resolution failed' });
            }
        }

        if (isBlockedIP(resolvedIP)) {
            return res.status(400).json({ error: 'Access to private network blocked' });
        }

        // 3. Real Probing (Latency measurement)
        const start = Date.now();
        const { testPath } = req.body;

        let lastStatus = 0;
        let successResult: any = null;

        // Paths to try in order (OpenSeal Standard First)
        const endpointsToTry = [];

        // PRIORITY 1: OpenSeal Standard Identity Endpoint
        endpointsToTry.push(new URL('/.openseal/identity', urlObj.origin).toString());

        // PRIORITY 2: User-defined test path
        if (testPath) {
            const normalizedPath = testPath.startsWith('/') ? testPath : `/${testPath}`;
            endpointsToTry.push(new URL(normalizedPath, urlObj.origin).toString());
        }

        // PRIORITY 3: Fallback to common health check paths
        endpointsToTry.push(url); // Original root
        endpointsToTry.push(new URL('/health', urlObj.origin).toString());
        endpointsToTry.push(new URL('/api/health', urlObj.origin).toString());

        // De-duplicate while preserving order
        const uniqueEndpoints = [...new Set(endpointsToTry)];

        for (const probeUrl of uniqueEndpoints) {
            try {
                const probeRes = await fetch(probeUrl, {
                    method: 'GET',
                    signal: AbortSignal.timeout(5000),
                    headers: {
                        'Accept': 'application/json',
                        'User-Agent': 'highstation-probe/1.0'
                    }
                });

                lastStatus = probeRes.status;
                const latency = Date.now() - start;

                if (probeRes.ok) {
                    let openSealIdentity: any = null;

                    // Peek for OpenSeal in Headers
                    const sealHeader = probeRes.headers.get('X-OpenSeal-Seal');
                    if (sealHeader) {
                        try {
                            const parsed = JSON.parse(sealHeader);
                            if (parsed.a_hash) openSealIdentity = { a_hash: parsed.a_hash, source: 'header' };
                        } catch (e) { }
                    }

                    // Peek for OpenSeal in Body if JSON
                    const contentType = probeRes.headers.get('content-type') || '';
                    if (!openSealIdentity && contentType.includes('application/json')) {
                        try {
                            const text = await probeRes.text();
                            const body = JSON.parse(text);

                            // Format 1: OpenSeal Standard Identity Endpoint
                            if (body && body.identity && body.identity.a_hash) {
                                openSealIdentity = { a_hash: body.identity.a_hash, source: 'openseal-identity' };
                            }
                            // Format 2: Wrapped OpenSeal response
                            else if (body && body.openseal && body.openseal.a_hash) {
                                openSealIdentity = { a_hash: body.openseal.a_hash, source: 'body' };
                            }
                            // Format 3: Direct root hash
                            else if (body && (body.a_hash || body.root_hash)) {
                                openSealIdentity = { a_hash: body.a_hash || body.root_hash, source: 'body-root' };
                            }
                        } catch (e) { }
                    }

                    successResult = {
                        success: true,
                        status: probeRes.status,
                        latency,
                        ip: resolvedIP,
                        openseal: openSealIdentity,
                        probe_path: new URL(probeUrl).pathname
                    };
                    break;
                }
            } catch (err) {
                console.warn(`[Probe] Failed ${probeUrl}:`, err instanceof Error ? err.message : err);
            }
        }

        if (successResult) {
            return res.json(successResult);
        }

        res.json({
            success: false,
            status: lastStatus || 500,
            error: lastStatus === 404 ? 'Target path not found (404)' : `Connection failed (Status: ${lastStatus})`,
            ip: resolvedIP
        });
    } catch (error: any) {
        res.status(500).json({ error: 'Probing failed' });
    }
});

/**
 * GET /api/services/utils/playground-bot-info
 * Returns the address and real USDC.e balance of the demo bot.
 */
router.get('/utils/playground-bot-info', async (req, res) => {
    try {
        const { CHAIN_CONFIG } = require('../config/chain');
        const { privateKeyToAccount } = require('viem/accounts');
        const botPrivateKey = process.env.DEPLOYER_PRIVATE_KEY;

        if (!botPrivateKey) {
            return res.status(500).json({ error: 'Bot private key not configured' });
        }

        const account = privateKeyToAccount(botPrivateKey);
        const USDC_CONTRACT = '0xc01efAaF7C5C61bEbFAeb358E1161b537b8bC0e0';

        // Real balance check via RPC
        const fetch = require('node-fetch');
        const rpcUrl = CHAIN_CONFIG.rpcUrls.default.http[0]; // Fix: Access the array
        const paddedAddress = account.address.slice(2).padStart(64, '0');
        const data = `0x70a08231${paddedAddress}`;

        const rpcRes = await fetch(rpcUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                jsonrpc: "2.0",
                method: "eth_call",
                params: [{ to: USDC_CONTRACT, data }, "latest"],
                id: 1
            })
        });

        const rpcJson = await rpcRes.json();
        const balanceHex = rpcJson.result || '0x0';
        const balanceWei = BigInt(balanceHex);
        const balanceUsdc = Number(balanceWei) / 1_000_000;

        res.json({
            address: account.address,
            balance: balanceUsdc,
            network: CHAIN_CONFIG.name,
            faucet: 'https://faucet.cronos.org/'
        });
    } catch (error: any) {
        console.error('[Playground Bot Info] Error:', error);
        res.status(500).json({ error: 'Failed to fetch bot info', details: error.message });
    }
});

/**
 * POST /api/services/utils/playground-run
 * Real execution of a service call, acting as the "Easy AI Agent".
 * This handles 402 Payment Challenges automatically using the Demo Bot account.
 */
router.post('/utils/playground-run', async (req, res) => {
    try {
        const { serviceId, subPath = '', payload = {} } = req.body;
        if (!serviceId) return res.status(400).json({ error: 'serviceId required' });

        // 1. Resolve Service
        const serviceRes = await query('SELECT * FROM services WHERE id = $1 LIMIT 1', [serviceId]);
        const service = serviceRes.rows[0];
        if (!service) return res.status(404).json({ error: 'Service not found' });

        console.log(`[Playground] Running Agent Task for ${service.name} /${subPath}`);

        const { ProxyService } = require('../services/ProxyService');
        const { Facilitator } = require('@crypto.com/facilitator-client');
        const { CronosNetwork } = require('@crypto.com/facilitator-client/dist/integrations/facilitator.interface');
        const { privateKeyToAccount } = require('viem/accounts');
        const { createWalletClient, http } = require('viem');
        const { CHAIN_CONFIG } = require('../config/chain');

        // 2. Initial Forwarding Attempt (Acting as Agent)
        // We simulate the agent's logic here.
        let finalResult: any;
        const botPrivateKey = process.env.DEPLOYER_PRIVATE_KEY; // Using Deployer as Demo Bot

        try {
            // First call - Expect 402 or 200
            const initialResult = await ProxyService.forwardRequest(
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: payload
                } as any,
                service.upstream_url,
                service.name,
                subPath,
                service.signing_secret,
                service.openseal_root_hash
            );

            // If 200, return immediately
            if (initialResult.status !== 402) {
                return res.json({
                    success: initialResult.status === 200,
                    status: initialResult.status,
                    data: initialResult.data,
                    telemetry: initialResult.telemetry,
                    openseal: (initialResult as any).openseal
                });
            }

            // [DEMO MODE] Handle 402 Payment Required
            console.log(`[Playground] 402 Detected. Generating Payment...`);

            if (!botPrivateKey) {
                throw new Error("DEMO_BOT_PRIVATE_KEY not configured in server env");
            }

            const account = privateKeyToAccount(botPrivateKey);
            const walletClient = createWalletClient({
                account,
                chain: { id: CHAIN_CONFIG.id, name: CHAIN_CONFIG.name, rpcUrls: { default: { http: [CHAIN_CONFIG.rpcUrls.default] } } }, // Simplified
                transport: http()
            });

            const facilitator = new Facilitator({ network: CronosNetwork.CronosTestnet });

            // Generate Requirements (Replicating strictPaymentGuard logic for info providing)
            // Wait, the ProxyService doesn't return the requirements object, it just hits the service.
            // In a real flow, the agent would catch the 402 from the gatekeeper.
            // Since we are IN the gatekeeper server but acting as a "Proxy for the Agent", 
            // we'll actually hit the LOKAL handle of the gatekeeper or just calculate it.

            // Actually, let's just use the same logic in ProxyService but with an Authorization header.
            const requiredUnits = BigInt(1000000000000000); // 0.001 CRO / 1000000 USDC.e demo
            const USDC_CONTRACT = '0xc01efAaF7C5C61bEbFAeb358E1161b537b8bC0e0';

            const requirements = facilitator.generatePaymentRequirements({
                payTo: service.settlement_address || CHAIN_CONFIG.contracts.paymentHandler,
                description: `Playground Demo: ${service.name}`,
                maxAmountRequired: requiredUnits.toString(),
                resource: `/gatekeeper/${service.slug}/resource/${subPath}`,
                asset: USDC_CONTRACT
            });

            const paymentHeader = await facilitator.generatePaymentHeader({
                to: requirements.payTo,
                value: requirements.maxAmountRequired,
                signer: {
                    getAddress: async () => account.address,
                    signMessage: async (msg: any) => walletClient.signMessage({ account, message: typeof msg === 'string' ? msg : { raw: msg.raw } }),
                    signTypedData: async (domain: any, types: any, value: any) => {
                        const { EIP712Domain, ...validTypes } = types;
                        return walletClient.signTypedData({ account, domain, types: validTypes, primaryType: Object.keys(validTypes)[0], message: value });
                    }
                } as any
            });

            // Second call - With Authorization
            finalResult = await ProxyService.forwardRequest(
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${paymentHeader}`
                    },
                    body: payload
                } as any,
                service.upstream_url,
                service.name,
                subPath,
                service.signing_secret,
                service.openseal_root_hash
            );

            res.json({
                success: finalResult.status === 200,
                status: finalResult.status,
                data: finalResult.data,
                telemetry: finalResult.telemetry,
                openseal: (finalResult as any).openseal,
                agent_log: [
                    "Initialized ephemeral wallet: " + account.address,
                    "Detected 402 Payment Required",
                    "Signed x402 Payment Header (EIP-3009)",
                    "Payment settled on Cronos Testnet",
                    "Access Granted by Gatekeeper"
                ]
            });

        } catch (forwardErr: any) {
            console.error('[Playground Agent] Forward error:', forwardErr);
            res.status(502).json({ error: 'Upstream connection failed', details: forwardErr.message });
        }

    } catch (error: any) {
        console.error('[Playground API] Error:', error);
        res.status(500).json({ error: 'Agent execution failed' });
    }
});

/**
 * POST /api/services/utils/verify-repo
 * Real-time OpenSeal manifest fetching and hash extraction
 */
router.post('/utils/verify-repo', async (req, res) => {
    try {
        const { repo_url } = req.body;
        if (!repo_url) return res.status(400).json({ error: 'Repository URL required' });

        const { OpenSealService } = require('../services/OpenSealService');
        const manifestUrl = OpenSealService.resolveManifestUrl(repo_url);
        const manifest = await OpenSealService.fetchManifest(manifestUrl);

        let rootHashHex: string;
        const rawRootHash = manifest.identity.root_hash;
        if (Array.isArray(rawRootHash)) {
            rootHashHex = Buffer.from(rawRootHash).toString('hex');
        } else {
            rootHashHex = String(rawRootHash);
        }

        res.json({
            success: true,
            root_hash: rootHashHex,
            version: manifest.version,
            manifest_url: manifestUrl
        });
    } catch (error: any) {
        res.status(400).json({
            success: false,
            error: 'OpenSeal verification failed',
            details: error.message
        });
    }
});

/**
 * POST /api/services/:id/generate-token
 * Generate verification token for domain ownership
 */
router.post('/:id/generate-token', async (req, res) => {
    try {
        const { id } = req.params;
        const userId = res.locals.user.id; // From Auth Middleware

        if (!userId) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        // Generate random verification token
        const verificationToken = `x402-${crypto.randomBytes(16).toString('hex')}`;

        // Update service with token
        const sql = `
            UPDATE services 
            SET verification_token = $1, status = 'pending'
            WHERE id = $2 AND provider_id = $3
            RETURNING *
        `;
        const result = await query(sql, [verificationToken, id, userId]);
        const data = result.rows[0];

        if (!data) {
            return res.status(404).json({ error: 'Service not found or unauthorized' });
        }

        res.json({
            token: verificationToken,
            instructions: {
                http: {
                    step1: 'Create a file at your API:',
                    path: `${data.upstream_url}/.well-known/x402-verify.txt`,
                    content: verificationToken
                },
                dns: {
                    step1: 'Add a TXT record to your domain:',
                    host: '@',
                    value: `highstation-verification=${verificationToken}`
                },
                step2: 'Click "Verify HTTP" or "Verify DNS" button to confirm ownership'
            }
        });
    } catch (error: any) {
        console.error('[Services API] Error generating token:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * POST /api/services/:id/verify
 * Verify domain ownership by checking .well-known file
 */
router.post('/:id/verify', async (req, res) => {
    try {
        const { id } = req.params;
        const userId = res.locals.user.id;

        if (!userId) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        // Get service details
        const result = await query(
            'SELECT * FROM services WHERE id = $1 AND provider_id = $2 LIMIT 1',
            [id, userId]
        );
        const service = result.rows[0];

        if (!service) {
            return res.status(404).json({ error: 'Service not found' });
        }

        if (!service.verification_token) {
            return res.status(400).json({
                error: 'No verification token. Generate one first.'
            });
        }

        // Verify domain ownership
        // SSRF PROTECTION (V-03-FIXED): Prevent TOCTOU by pinning DNS resolution

        // 1. Parse URL
        let urlObj: URL;
        try {
            urlObj = new URL(service.upstream_url);
        } catch (e) {
            return res.status(400).json({ error: 'Invalid URL format' });
        }

        const hostname = urlObj.hostname;

        // 2. Resolve DNS (IPv4 first) to get specific IP "Pin"
        let resolvedIP: string;
        try {
            const addresses = await dns.resolve4(hostname);
            if (!addresses || addresses.length === 0) {
                throw new Error('No DNS records found');
            }
            resolvedIP = addresses[0]; // Pick first IP
        } catch (dnsErr) {
            // If resolve4 fails, maybe it's an IP literal or IPv6?
            if (net.isIP(hostname)) {
                resolvedIP = hostname;
            } else {
                // Try IPv6? For now, fail safe.
                console.error('[Verification] DNS Resolution failed:', dnsErr);
                return res.status(400).json({ error: 'Verification failed', details: 'DNS resolution error' });
            }
        }

        // 3. Validate the Resolved IP (Not the hostname)
        // We need to import isBlockedIP from validators.ts
        if (isBlockedIP(resolvedIP)) {
            console.warn(`[Verification] Blocked unsafe IP: ${resolvedIP} (from ${hostname})`);
            return res.status(400).json({
                error: 'Invalid Upstream',
                message: 'The service resolves to a restricted network address.'
            });
        }

        // 4. Construct Safe URL using IP
        // http://1.2.3.4:80/.well-known/x402-verify.txt
        const verificationUrl = `${urlObj.protocol}//${resolvedIP}${urlObj.port ? ':' + urlObj.port : ''}/.well-known/x402-verify.txt`;

        try {
            const response = await fetch(verificationUrl, {
                method: 'GET',
                headers: {
                    'User-Agent': 'highstation-bot/1.0',
                    'Host': hostname // CRITICAL: Preserve original Host header for virtual hosts
                },
                // Add explicit timeout to prevent hanging
                signal: AbortSignal.timeout(5000)
            });

            if (!response.ok) {
                // SANITIZED ERROR: Do not return status text or details
                return res.status(400).json({
                    error: 'Verification file not found or inaccessible',
                    status: response.status
                });
            }

            const content = await response.text();
            const tokenFound = content.includes(service.verification_token);

            if (!tokenFound) {
                return res.status(400).json({
                    error: 'Verification failed',
                    details: 'Token not found in verification file'
                });
            }

            // Success! Update service status
            // Success! Update service status
            const updateSql = `
                UPDATE services 
                SET status = 'verified', verified_at = NOW()
                WHERE id = $1
                RETURNING *
            `;
            const updateRes = await query(updateSql, [id]);
            const updated = updateRes.rows[0];

            res.json({
                success: true,
                message: 'Domain ownership verified!',
                service: updated,
                verifiedAt: updated.verified_at
            });

        } catch (fetchError: any) {
            console.error('[Verification] Fetch error:', fetchError);
            // SANITIZED ERROR
            return res.status(400).json({
                error: 'Could not verify domain',
                message: 'Connection failed or timeout. Please check your firewall and URL.'
            });
        }
    } catch (error: any) {
        console.error('[Services API] Verification error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * POST /api/services/:id/verify-dns
 * Verify domain ownership by checking DNS TXT record
 */
router.post('/:id/verify-dns', async (req, res) => {
    try {
        const { id } = req.params;
        const userId = res.locals.user.id;

        if (!userId) return res.status(401).json({ error: 'Unauthorized' });

        const result = await query(
            'SELECT * FROM services WHERE id = $1 AND provider_id = $2 LIMIT 1',
            [id, userId]
        );
        const service = result.rows[0];

        if (!service) return res.status(404).json({ error: 'Service not found' });
        if (!service.verification_token) return res.status(400).json({ error: 'No verification token' });

        let urlObj: URL;
        try {
            urlObj = new URL(service.upstream_url);
        } catch (e) {
            return res.status(400).json({ error: 'Invalid URL format' });
        }

        const hostname = urlObj.hostname;
        const isVerified = await DomainVerificationService.verifyViaDNS(hostname, service.verification_token);

        if (!isVerified) {
            return res.status(400).json({
                error: 'Verification failed',
                message: `Could not find TXT record for ${hostname} with required token.`
            });
        }

        await DomainVerificationService.updateVerificationStatus(id, true);

        res.json({
            success: true,
            message: 'Domain ownership verified via DNS!',
            verifiedAt: new Date().toISOString()
        });

    } catch (error: any) {
        console.error('[Services API] DNS Verification error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * GET /api/services
 * List all services (filtered by verification status)
 */
router.get('/', async (req, res) => {
    try {
        const { status } = req.query;

        // SECURITY FIX (V-10): Remove provider_id from public response
        let sql = 'SELECT id, slug, name, price_wei, access_requirements, status, created_at FROM services';
        const params: any[] = [];

        if (status) {
            sql += ' WHERE status = $1';
            params.push(status);
        }

        sql += ' ORDER BY created_at DESC';

        const result = await query(sql, params);
        res.json({ services: result.rows || [] });

    } catch (error: any) {
        console.error('[Services API] Error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

router.patch('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const userId = res.locals.user.id;
        const updates = req.body;

        if (!userId) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        if (Object.keys(updates).length === 0) {
            return res.status(400).json({ error: 'No updates provided' });
        }

        // SECURITY FIX (V-12): Strict key filtering for dynamic UPDATE
        const keys = Object.keys(updates);
        const allowedKeys = ['name', 'slug', 'upstream_url', 'price_wei', 'access_requirements', 'status', 'category', 'tags', 'description', 'capabilities', 'trust_seed_enabled', 'openseal_repo_url', 'custom_domain'];
        const sanitizedUpdates: any = {};

        keys.forEach((k: string) => {
            if (allowedKeys.includes(k)) {
                sanitizedUpdates[k] = (updates as any)[k];
            }
        });

        if (Object.keys(sanitizedUpdates).length === 0) {
            return res.status(400).json({ error: 'No valid updates provided' });
        }

        // OpenSeal Identity Update Logic
        if (sanitizedUpdates.openseal_repo_url) {
            // If repo URL is updated, re-fetch and re-verify the root hash from source (Security check)
            try {
                const osResult = await OpenSealService.registerIdentity(id, userId, sanitizedUpdates.openseal_repo_url);
                sanitizedUpdates.openseal_root_hash = osResult.service.openseal_root_hash;
                console.log(`[Services PATCH] OpenSeal Re-verified via Repo for ${id}: ${sanitizedUpdates.openseal_root_hash}`);
            } catch (osErr: any) {
                return res.status(400).json({ error: 'OpenSeal Verification Failed', message: osErr.message });
            }
        }

        const filteredKeys = Object.keys(sanitizedUpdates);

        // [STANDARD HYBRID SYNC] Update min_grade column if access_requirements changes
        if (sanitizedUpdates.access_requirements) {
            const reqs = sanitizedUpdates.access_requirements;
            if (reqs && typeof reqs.min_grade === 'string') {
                sanitizedUpdates.min_grade = reqs.min_grade;
            }
        }

        const finalKeys = Object.keys(sanitizedUpdates);
        if (finalKeys.length === 0) {
            return res.status(400).json({ error: 'No valid updates provided' });
        }

        const setClause = finalKeys.map((key, index) => `${key} = $${index + 3}`).join(', ');
        const sql = `
            UPDATE services 
            SET ${setClause}
            WHERE id = $1 AND provider_id = $2
            RETURNING *
        `;

        const values = [id, userId, ...Object.values(sanitizedUpdates)];

        try {
            const result = await query(sql, values);
            const data = result.rows[0];

            if (!data) return res.status(404).json({ error: 'Service not found or unauthorized' });

            res.json(data);
        } catch (dbErr: any) {
            console.error('[Services API] Update DB error:', dbErr);
            return res.status(500).json({ error: 'Database error during update' });
        }

    } catch (error: any) {
        console.error('[Services API] Update error:', error);
        res.status(500).json({ error: 'Failed to update service' });
    }
});

router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const userId = res.locals.user.id;

        if (!userId) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        const result = await query(
            'DELETE FROM services WHERE id = $1 AND provider_id = $2',
            [id, userId]
        );

        if (result.rowCount === 0) {
            return res.status(404).json({ error: 'Service not found or unauthorized' });
        }

        res.json({ success: true });
    } catch (error: any) {
        console.error('[Services API] Delete error:', error);
        res.status(500).json({ error: 'Failed to delete service' });
    }
});

/**
 * POST /api/services/:id/openseal
 * Register/Update OpenSeal Identity for a service
 */
router.post('/:id/openseal', async (req, res) => {
    try {
        const { id } = req.params;
        const { repo_url, root_hash } = req.body;
        const userId = res.locals.user.id;

        if (!userId) return res.status(401).json({ error: 'Unauthorized' });
        if (!repo_url && !root_hash) return res.status(400).json({ error: 'Missing repo_url or root_hash' });

        // Service Import (Late binding to avoid circular deps if any)
        const { OpenSealService } = require('../services/OpenSealService');

        const result = await OpenSealService.registerIdentity(id, userId, repo_url, root_hash);

        res.json({
            success: true,
            message: 'OpenSeal Identity Registered Successfully',
            data: result
        });

    } catch (error: any) {
        console.error('[Services API] OpenSeal Registration Error:', error);
        res.status(500).json({
            error: 'OpenSeal Registration Failed',
            details: error.message
        });
    }
});

export default router;
