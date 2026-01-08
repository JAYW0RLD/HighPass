import express from 'express';
import { initDB } from '../database/db';
import crypto from 'crypto';

const router = express.Router();

/**
 * POST /api/services/:id/generate-token
 * Generate verification token for domain ownership
 */
router.post('/:id/generate-token', async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.headers['x-user-id']; // From Supabase Auth

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
        const userId = req.headers['x-user-id'];

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
        const verificationUrl = `${service.upstream_url}/.well-known/x402-verify.txt`;

        try {
            const response = await fetch(verificationUrl, {
                method: 'GET',
                headers: {
                    'User-Agent': 'x402-gatekeeper-bot/1.0'
                }
            });

            if (!response.ok) {
                return res.status(400).json({
                    error: 'Verification file not found',
                    details: `Could not fetch ${verificationUrl}`,
                    status: response.status
                });
            }

            const content = await response.text();
            const tokenFound = content.includes(service.verification_token);

            if (!tokenFound) {
                return res.status(400).json({
                    error: 'Verification failed',
                    details: 'Token not found in verification file',
                    expected: service.verification_token,
                    received: content.substring(0, 100)
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
            return res.status(400).json({
                error: 'Could not verify domain',
                details: fetchError.message,
                hint: 'Make sure the file is publicly accessible'
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
        let query = db.from('services').select('*');

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
