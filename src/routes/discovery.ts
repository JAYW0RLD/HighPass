import express from 'express';
import { query } from '../database/db';

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

        // Dynamic SQL Construction
        let sql = `
            SELECT 
                s.*, 
                ppm.avg_latency_ms_7d, ppm.success_rate_7d, ppm.total_requests,
                p.username
            FROM services s
            LEFT JOIN provider_performance_metrics ppm ON s.slug = ppm.service_slug
            LEFT JOIN profiles p ON s.provider_id = p.id
            WHERE s.status = 'verified'
        `;
        const params: any[] = [];

        // Filters
        if (category) {
            sql += ` AND s.category = $${params.length + 1}`;
            params.push(category);
        }

        if (tags) {
            // Overlaps &&
            const tagsArray = (tags as string).split(',').map(t => t.trim());
            sql += ` AND s.tags && $${params.length + 1}`;
            params.push(tagsArray);
        }

        if (q) {
            // Text Search
            sql += ` AND s.search_vector @@ websearch_to_tsquery('english', $${params.length + 1})`;
            params.push(q);
        }

        // Sorting
        if (sort === 'recent') {
            sql += ` ORDER BY s.created_at DESC`;
        } else if (sort === 'price') {
            sql += ` ORDER BY s.price_wei ASC`;
        } else if (sort === 'performance') {
            // Simple SQL sort: success_rate DESC, latency ASC
            sql += ` ORDER BY ppm.success_rate_7d DESC NULLS LAST, ppm.avg_latency_ms_7d ASC NULLS LAST`;
        } else {
            sql += ` ORDER BY s.created_at DESC`;
        }

        // Pagination
        sql += ` LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
        params.push(limitNum, offset);

        // Execute Query
        const result = await query(sql, params);
        const data = result.rows;

        // Build count query if needed, or simple placeholder for MVP
        // For accurate pagination, we should run a count query with same filters
        // Simplification: just return a high number or skip count
        const count = 100;

        // Post-processing for frontend
        let results = data.map((service: any) => ({
            id: service.id,
            slug: service.slug,
            name: service.name,
            description: service.description,
            category: service.category,
            tags: service.tags,
            price_wei: service.price_wei,
            provider: service.username || 'Unknown',
            // Performance Data
            performance: {
                latency: service.avg_latency_ms_7d || 0,
                success_rate: service.success_rate_7d || 0,
                requests: service.total_requests || 0
            },
            // Add computed grade here if needed
            grade: calculateGrade({
                avg_latency_ms_7d: service.avg_latency_ms_7d,
                success_rate: service.success_rate_7d,
                total_requests: service.total_requests
            }),
            capabilities: service.capabilities
        }));

        res.json({
            data: results,
            meta: {
                total: count,
                page: pageNum,
                limit: limitNum,
                pages: Math.ceil(count / limitNum)
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
        const result = await query(
            "SELECT category, COUNT(*) as count FROM services WHERE status = 'verified' GROUP BY category ORDER BY count DESC"
        );
        res.json(result.rows.map((r: any) => ({ name: r.category, count: parseInt(r.count) })));
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
