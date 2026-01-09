import express from 'express';
import { initDB } from '../database/db';
import { isBlockedIP } from '../utils/validators';
import crypto from 'crypto';
import * as dns from 'dns/promises';
import * as net from 'net';
import { URL } from 'url';

const router = express.Router();

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
        const db = await initDB();
        if (!db) {
            return res.status(500).json({ error: 'Database not initialized' });
        }
        const { data, error } = await db
            .from('services')
            .update({
                verification_token: verificationToken,
                status: 'pending'
            })
            .eq('id', id)
            .eq('provider_id', userId) // Ensure user owns this service
            .select()
            .single();

        if (error || !data) {
            return res.status(404).json({ error: 'Service not found or unauthorized' });
        }

        res.json({
            token: verificationToken,
            instructions: {
                step1: 'Create a file at your API:',
                path: `${data.upstream_url}/.well-known/x402-verify.txt`,
                content: verificationToken,
                step2: 'Click "Verify" button to confirm ownership'
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

        // Initialize DB
        const db = await initDB();
        if (!db) {
            return res.status(500).json({ error: 'Database not initialized' });
        }

        // Get service details
        const { data: service, error: fetchError } = await db
            .from('services')
            .select('*')
            .eq('id', id)
            .eq('provider_id', userId)
            .single();

        if (fetchError || !service) {
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
            const { data: updated, error: updateError } = await db
                .from('services')
                .update({
                    status: 'verified',
                    verified_at: new Date().toISOString()
                })
                .eq('id', id)
                .select()
                .single();

            if (updateError) {
                throw updateError;
            }

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
 * GET /api/services
 * List all services (filtered by verification status)
 */
router.get('/', async (req, res) => {
    try {
        const { status } = req.query;

        const db = await initDB();
        if (!db) return res.status(500).json({ error: 'Database error' });


        // SECURITY FIX (V-10): Remove provider_id from public response
        // to prevent provider enumeration and competitive intelligence gathering
        let query = db.from('services').select('id, slug, name, price_wei, min_grade, status, created_at');

        if (status) {
            query = query.eq('status', status);
        }

        const { data, error } = await query.order('created_at', { ascending: false });

        if (error) {
            throw error;
        }

        res.json({ services: data || [] });

    } catch (error: any) {
        console.error('[Services API] Error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

export default router;
