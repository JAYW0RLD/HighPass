import { Router, Request, Response } from 'express';
import { initDB } from '../database/db';

const router = Router();

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

        const db = await initDB();
        if (!db) {
            return res.status(500).json({ error: 'Database not initialized' });
        }

        // Get provider's services
        const { data: services, error: servicesError } = await db
            .from('services')
            .select('id, slug, name')
            .eq('provider_id', userId);

        if (servicesError) {
            throw servicesError;
        }

        if (!services || services.length === 0) {
            return res.json({
                totalCalls: 0,
                totalRevenue: '0',
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
        const { data: stats, error: statsError } = await db
            .rpc('calculate_provider_stats', { p_provider_id: userId });

        if (statsError) {
            throw statsError;
        }

        // Calculate statistics
        const totalCalls = stats?.[0]?.total_calls || 0;
        const totalRevenueWei = BigInt(stats?.[0]?.total_revenue_wei || 0);

        // Calculate net revenue (after 0.5% protocol fee)
        const protocolFee = (totalRevenueWei * BigInt(5)) / BigInt(1000);
        const netRevenue = totalRevenueWei - protocolFee;

        res.json({
            totalCalls,
            totalRevenueWei: totalRevenueWei.toString(),
            netRevenueWei: netRevenue.toString(),
            protocolFeeWei: protocolFee.toString(),
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
