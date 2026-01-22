import { Router, Request, Response } from 'express';
import { query } from '../database/db';
import { FEE_CONFIG } from '../config/reputation';
import { WithdrawService } from '../services/WithdrawService';

const router = Router();
const withdrawService = new WithdrawService();

// ... (existing routes stay between lines 10 and 260 approximately) ...

// [DELETED] Old /withdraw/request stub removed.
// The real implementation is above at /withdraw

// ... (other routes unchanged)

/**
 * POST /api/provider/withdraw
 * Process a secure withdrawal with strict balance checks
 */
router.post('/withdraw', async (req: Request, res: Response) => {
    try {
        const userId = res.locals.user.id;
        // signature is now required for integrity
        const { amountWei, address, signature } = req.body;

        if (!userId) return res.status(401).json({ error: 'Unauthorized' });
        if (!amountWei || !address || !signature) {
            return res.status(400).json({ error: 'Missing required parameters (amount, address, signature)' });
        }

        const result = await withdrawService.processWithdrawal(userId, address, amountWei, signature);

        res.json({
            success: true,
            data: result
        });
    } catch (error: any) {
        console.error('[Provider API] Withdrawal error:', error);
        // Do not leak internal error details in production, but for now helpful
        res.status(400).json({ error: error.message });
    }
});

/**
 * GET /api/provider/withdrawals
 * Get withdrawal history
 */
router.get('/withdrawals', async (req: Request, res: Response) => {
    try {
        const userId = res.locals.user.id;
        if (!userId) return res.status(401).json({ error: 'Unauthorized' });

        const result = await query('SELECT * FROM withdrawals WHERE provider_id = $1 ORDER BY created_at DESC LIMIT 50', [userId]);
        res.json(result.rows || []);
    } catch (error: any) {
        console.error('[Provider Withdrawals] Error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * GET /api/provider/services
 * Get ALL service details for the authenticated provider
 * Used for "Local DB" mode in frontend (Substituting Supabase SDK)
 */
router.get('/services', async (req: Request, res: Response) => {
    try {
        const userId = res.locals.user.id;
        if (!userId) return res.status(401).json({ error: 'Unauthorized' });

        const result = await query('SELECT * FROM services WHERE provider_id = $1 ORDER BY created_at DESC', [userId]);
        res.json(result.rows || []);
    } catch (error: any) {
        console.error('[Provider Services] Error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * GET /api/provider/stats
 * Get provider-specific statistics (revenue, calls, etc.)
 * Requires x-user-id header from Supabase Auth
 */
router.get('/stats', async (req: Request, res: Response) => {
    try {
        const userId = res.locals.user.id; // Authenticated via authMiddleware

        if (!userId) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        // Get provider's profile (including settlement address)
        const profRes = await query('SELECT settlement_address FROM profiles WHERE id = $1', [userId]);
        const settlementAddress = profRes.rows?.[0]?.settlement_address || 'Assigning...';

        // Get provider's services
        const servRes = await query('SELECT id, slug, name FROM services WHERE provider_id = $1', [userId]);
        const services = servRes.rows;

        if (!services || services.length === 0) {
            return res.json({
                totalCalls: 0,
                totalRevenue: '0',
                netRevenueWei: '0',
                settlementAddress,
                services: []
            });
        }

        // Get slugs for service resolution
        const serviceSlugs = services.map(s => s.slug);

        // SECURITY FIX (V-04): Explicit sanitization defense-in-depth
        // PERFORMANCE FIX (NEW-HIGH-02): Use service_slug instead of endpoint
        // This utilizes FK index for better performance
        const sanitizedSlugs = serviceSlugs
            .filter(slug => /^[a-zA-Z0-9_-]+$/.test(slug));

        if (sanitizedSlugs.length === 0) {
            return res.json({
                totalCalls: 0,
                totalRevenue: '0',
                netRevenueWei: '0',
                protocolFeeWei: '0',
                services: []
            });
        }

        // PERFORMANCE FIX (HIGH-PERF): Use RPC for aggregation to prevent OOM
        // Red Team finding: fetching all requests causes memory exhaustion
        // PERFORMANCE FIX (HIGH-PERF): Use RPC for aggregation to prevent OOM
        // Red Team finding: fetching all requests causes memory exhaustion
        const statsRes = await query('SELECT * FROM calculate_provider_stats($1)', [userId]);
        const stats = statsRes.rows;

        // Calculate statistics
        const totalCalls = stats?.[0]?.total_calls || 0;
        const totalRevenueWei = BigInt(stats?.[0]?.total_revenue_wei || 0);

        // Calculate net revenue (based on centralized platform fee rate)
        const feeMultiplier = BigInt(Math.floor(FEE_CONFIG.PLATFORM_FEE_RATE * 1000)); // 0.05 -> 50
        const protocolFee = (totalRevenueWei * feeMultiplier) / BigInt(1000);
        const netRevenue = totalRevenueWei - protocolFee;

        res.json({
            totalCalls,
            totalRevenueWei: totalRevenueWei.toString(),
            netRevenueWei: netRevenue.toString(),
            protocolFeeWei: protocolFee.toString(),
            settlementAddress,
            services: services.map(s => ({
                id: s.id,
                name: s.name,
                slug: s.slug
            }))
        });

    } catch (error: any) {
        console.error('[Provider Stats] Error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

export default router;

/**
 * GET /api/provider/analytics
 * Get time-series data for provider charts (Real Data)
 * Query Params: ?slug=service-slug
 */
router.get('/analytics', async (req: Request, res: Response) => {
    try {
        const userId = res.locals.user.id;
        const { slug } = req.query;
        if (!userId) return res.status(401).json({ error: 'Unauthorized' });

        let sql = `
            SELECT created_at, status, latency_ms 
            FROM requests 
            WHERE service_slug IN (SELECT slug FROM services WHERE provider_id = $1)
        `;
        const params: any[] = [userId];

        if (slug) {
            sql += ` AND service_slug = $2`;
            params.push(slug);
        }

        sql += ` AND created_at >= $${params.length + 1} ORDER BY created_at ASC`;
        const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
        params.push(oneDayAgo);

        const logRes = await query(sql, params);
        const logs = logRes.rows;

        // Aggregate by hour for chart
        const buckets: Record<string, { time: number, total: number, success: number, latencySum: number }> = {};

        logs?.forEach(log => {
            const time = new Date(log.created_at);
            time.setMinutes(0, 0, 0); // Round to hour
            const key = time.toISOString();

            if (!buckets[key]) {
                buckets[key] = { time: time.getTime() / 1000, total: 0, success: 0, latencySum: 0 };
            }
            buckets[key].total++;
            if (log.status >= 200 && log.status < 300) buckets[key].success++;
            buckets[key].latencySum += (log.latency_ms || 0);
        });

        const sortedData = Object.values(buckets).sort((a, b) => a.time - b.time);

        // Get summary stats for the slug if requested
        let stats = null;
        if (slug) {
            const { getServiceStats } = require('../database/db');
            stats = await getServiceStats(slug as string);
        }

        res.json({
            timeSeries: sortedData,
            stats: stats
        });

    } catch (error: any) {
        console.error('[Provider Analytics] Error:', error);
        res.status(500).json({ error: 'Failed to fetch analytics' });
    }
});

/**
 * POST /api/provider/developer
 * Create or update developer profile
 */
router.post('/developer', async (req, res) => {
    try {
        const userId = res.locals.user.id;
        const { name, email, github_id, avatar_url, reputation_score } = req.body;

        if (!userId) return res.status(401).json({ error: 'Unauthorized' });

        const sql = `
            INSERT INTO developers (id, name, email, github_id, avatar_url, reputation_score, updated_at)
            VALUES ($1, $2, $3, $4, $5, $6, NOW())
            ON CONFLICT (id) DO UPDATE SET
                name = EXCLUDED.name,
                email = EXCLUDED.email,
                github_id = EXCLUDED.github_id,
                avatar_url = EXCLUDED.avatar_url,
                reputation_score = EXCLUDED.reputation_score,
                updated_at = NOW()
            RETURNING *
        `;
        const resDev = await query(sql, [
            userId, name, email, github_id, avatar_url, reputation_score || 0
        ]);

        res.json(resDev.rows[0]);
    } catch (error: any) {
        console.error('[Provider API] Create Developer error:', error);
        res.status(500).json({ error: 'Failed to create developer profile' });
    }
});

/**
 * POST /api/provider/wallets
 * Link a new wallet
 */
router.post('/wallets', async (req, res) => {
    try {
        const userId = res.locals.user.id;
        const { address, label, wallet_type } = req.body;

        if (!userId) return res.status(401).json({ error: 'Unauthorized' });

        const sql = `
            INSERT INTO wallets (developer_id, address, label, wallet_type, is_primary, status)
            VALUES ($1, $2, $3, $4, false, 'Active')
            RETURNING *
        `;
        const wRes = await query(sql, [userId, address, label, wallet_type || 'evm']);

        res.json(wRes.rows[0]);
    } catch (error: any) {
        console.error('[Provider API] Create Wallet error:', error);
        res.status(500).json({ error: 'Failed to link wallet' });
    }
});


