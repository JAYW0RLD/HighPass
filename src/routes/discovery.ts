import express from 'express';
import { getSupabase } from '../utils/supabase'; // Fixed import

const router = express.Router();

/**
 * @route   GET /api/discovery/search
 * @desc    Search services with filters, sorting, and pagination
 * @access  Public
 * @query   q (optional) - Full text search query
 * @query   category (optional) - Filter by category
 * @query   tags (optional) - Filter by tag (comma separated)
 * @query   minGrade (optional) - Minimum provider grade (default: F)
 * @query   sort (optional) - recent, performance, price
 * @query   page (optional) - Page number (default: 1)
 * @query   limit (optional) - Items per page (default: 20)
 */
router.get('/search', async (req, res) => {
    try {
        const {
            q,
            category,
            tags,
            minGrade,
            sort = 'performance',
            page = '1',
            limit = '20'
        } = req.query;

        const pageNum = parseInt(page as string) || 1;
        const limitNum = Math.min(parseInt(limit as string) || 20, 50); // Max 50 per page
        const offset = (pageNum - 1) * limitNum;

        // Base Query
        let query = getSupabase()
            .from('services')
            .select(`
                *,
                provider_performance_metrics!left (
                    avg_latency_ms_7d,
                    success_rate_7d,
                    total_requests
                ),
                profiles!inner (
                    username
                )
            `, { count: 'exact' });

        // Apply Filters
        query = query.eq('status', 'verified'); // Only verified services

        if (category) {
            query = query.eq('category', category);
        }

        if (tags) {
            // "tags" column is TEXT[], we check if array contains the input tag
            // Input: "fast,crypto" -> Search services having at least one of these? Or all?
            // Use 'cs' (contains) for AND logic, or 'ov' (overlaps) for OR logic.
            // Let's assume OR logic for user friendliness: services having ANY of the tags.
            const tagsArray = (tags as string).split(',').map(t => t.trim());
            query = query.overlaps('tags', tagsArray);
        }

        if (q) {
            // Full Text Search using the pre-computed 'search_vector' column
            // websearch_to_tsquery is safe and user-friendly (handles quotes, +/- etc)
            query = query.textSearch('search_vector', q as string, {
                type: 'websearch',
                config: 'english'
            });
        }

        // Sorting
        // Note: For performance sort, we might need to join simply to sort.
        // Supabase JS Sort syntax:
        // .order('column', { ascending: false })

        if (sort === 'recent') {
            query = query.order('created_at', { ascending: false });
        } else if (sort === 'price') {
            query = query.order('price_wei', { ascending: true });
        } else if (sort === 'performance') {
            // Sort by Foreign Table Column is tricky in simple Supabase query builder if 1:1 isn't strictly enforced or joined perfectly.
            // But we can try sorting by the joined column syntax if supported, 
            // or we might need to rely on the primary table order index or do client side sort if dataset small (not ideal).
            // Better approach for scaling: Add a 'score' column to services that is periodically updated via cron, 
            // OR use a RPC function for complex search.

            // For MVP, if we can't sort by foreign table easily in one query via JS SDK joined sort:
            // "It is not possible to order by a foreign table column" in current PostgREST/Supabase JS versions usually.
            // Workaround: We will fetch recent/relevant items and sort in memory for MVP (limit 50 is small),
            // OR use the RPC function approach.

            // Let's use RPC for complex search if standard query fails, but for MVP standard query is safer/simpler to debug.
            // Falling back to 'created_at' for default sort in DB, then re-sorting in memory for 'performance' is acceptable for MVP with pagination constraints.
            // Actually, let's just default to created_at for DB query stability.
            query = query.order('created_at', { ascending: false });
        }

        // Pagination
        const { data, error, count } = await query.range(offset, offset + limitNum - 1);

        if (error) throw error;

        // Post-processing for frontend
        let results = data.map(service => {
            const metrics = service.provider_performance_metrics || {
                avg_latency_ms_7d: 0,
                success_rate_7d: 0,
                total_requests: 0
            };

            return {
                id: service.id,
                slug: service.slug,
                name: service.name,
                description: service.description,
                category: service.category,
                tags: service.tags,
                price_wei: service.price_wei,
                provider: service.profiles?.username || 'Unknown',
                // Performance Data
                performance: {
                    latency: metrics.avg_latency_ms_7d,
                    success_rate: metrics.success_rate_7d,
                    requests: metrics.total_requests
                },
                // Add computed grade here if needed
                grade: calculateGrade(metrics)
            };
        });

        // In-memory sort for Performance (Temporary MVP solution)
        if (sort === 'performance') {
            results.sort((a, b) => {
                // Rank by grade (A is better than F) then latency
                // Simple score: Success Rate / Latency (Higher is better)
                const scoreA = (a.performance.success_rate || 0) / (Math.max(a.performance.latency, 1));
                const scoreB = (b.performance.success_rate || 0) / (Math.max(b.performance.latency, 1));
                return scoreB - scoreA;
            });
        }

        res.json({
            data: results,
            meta: {
                total: count,
                page: pageNum,
                limit: limitNum,
                pages: Math.ceil((count || 0) / limitNum)
            }
        });

    } catch (err: any) {
        console.error('Search API Error:', err);
        res.status(500).json({ error: 'Search failed' });
    }
});

/**
 * @route   GET /api/discovery/categories
 * @desc    Get list of used categories with counts
 * @access  Public
 */
router.get('/categories', async (req, res) => {
    try {
        // Use RPC or distinct query. Simple distinct on verified services.
        const { data, error } = await getSupabase()
            .from('services')
            .select('category')
            .eq('status', 'verified')
            .not('category', 'is', null);

        if (error) throw error;

        // Aggregation in memory for MVP (or use .rpc if heavy)
        const counts: Record<string, number> = {};
        data.forEach((item: any) => {
            if (item.category) counts[item.category] = (counts[item.category] || 0) + 1;
        });

        const sortedCategories = Object.entries(counts)
            .map(([name, count]) => ({ name, count }))
            .sort((a, b) => b.count - a.count);

        res.json(sortedCategories);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch categories' });
    }
});

/**
 * Helper: simple grade calculation for UI display
 * Should match src/config/providerGrades.ts logic roughly
 */
function calculateGrade(metrics: any): string {
    const latency = Number(metrics.avg_latency_ms_7d) || 0;
    const success = Number(metrics.success_rate_7d) || 0;
    const count = Number(metrics.total_requests) || 0;

    if (count < 10) return 'C'; // New
    if (latency <= 200 && success >= 98) return 'A';
    if (latency <= 500 && success >= 95) return 'B';
    if (latency <= 1000 && success >= 90) return 'C';
    if (latency <= 2000 && success >= 80) return 'D';
    if (latency <= 5000 && success >= 70) return 'E';
    return 'F';
}

export default router;
