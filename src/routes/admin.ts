import { Router, Request, Response } from 'express';
import { query } from '../database/db';
import { WithdrawalService } from '../services/WithdrawalService';

const router = Router();

/**
 * Middleware: Verify Admin Role
 */
const adminOnly = async (req: Request, res: Response, next: any) => {
    const userId = res.locals.user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const resDb = await query('SELECT role FROM profiles WHERE id = $1 LIMIT 1', [userId]);
    const profile = resDb.rows[0];

    if (profile?.role !== 'admin') {
        return res.status(403).json({ error: 'Forbidden: Admin access only' });
    }

    next();
};

/**
 * GET /api/admin/withdrawals
 * List all withdrawal requests
 */
router.get('/withdrawals', adminOnly, async (req: Request, res: Response) => {
    try {
        // Join profiles to get email
        const sql = `
            SELECT w.*, p.email 
            FROM withdrawals w
            LEFT JOIN profiles p ON w.provider_id = p.id
            ORDER BY w.created_at DESC
        `;
        const result = await query(sql);
        const data = result.rows.map((row: any) => ({
            ...row,
            profiles: { email: row.email } // Match expected format
        }));
        res.json({ withdrawals: data });
    } catch (error: any) {
        console.error('[Admin API] Fetch withdrawals error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * POST /api/admin/withdrawals/:id/approve
 */
router.post('/withdrawals/:id/approve', adminOnly, async (req: Request, res: Response) => {
    try {
        const adminId = res.locals.user.id;
        const withdrawalId = req.params.id;

        const result = await WithdrawalService.approveRequest(withdrawalId, adminId);
        res.json(result);
    } catch (error: any) {
        console.error('[Admin API] Approve withdrawal error:', error);
        res.status(400).json({ error: error.message });
    }
});

/**
 * POST /api/admin/withdrawals/:id/reject
 */
router.post('/withdrawals/:id/reject', adminOnly, async (req: Request, res: Response) => {
    try {
        const adminId = res.locals.user.id;
        const withdrawalId = req.params.id;
        const { reason } = req.body;

        if (!reason) return res.status(400).json({ error: 'Rejection reason is required' });

        const result = await WithdrawalService.rejectRequest(withdrawalId, adminId, reason);
        res.json(result);
    } catch (error: any) {
        console.error('[Admin API] Reject withdrawal error:', error);
        res.status(400).json({ error: error.message });
    }
});

export default router;
