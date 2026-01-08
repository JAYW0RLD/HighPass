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
        const userId = req.headers['x-user-id'];

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

        // Query requests table for these services
        // endpoint format: /gatekeeper/{slug}/resource
        const { data: requests, error: requestsError } = await db
            .from('requests')
            .select('amount, status, endpoint')
            .in('endpoint', serviceSlugs.map(slug => `/gatekeeper/${slug}/resource`));

        if (requestsError) {
            throw requestsError;
        }

        // Calculate statistics
        const totalCalls = requests?.length || 0;

        // Sum revenue from successful calls (status 200)
        let totalRevenueWei = 0;
        if (requests) {
            totalRevenueWei = requests
                .filter(r => r.status === 200)
                .reduce((sum, r) => sum + Number(r.amount || 0), 0);
        }

        // Calculate net revenue (after 0.5% protocol fee)
        const protocolFee = Math.floor(totalRevenueWei * 0.005);
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
