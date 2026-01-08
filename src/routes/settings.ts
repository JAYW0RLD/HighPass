import express from 'express';
import { initDB } from '../database/db';

const router = express.Router();

// GET /api/settings - Get provider settings
router.get('/', async (req, res) => {
    try {
        const userId = req.headers['x-user-id'];
        if (!userId) return res.status(401).json({ error: 'Unauthorized' });

        const db = await initDB();
        if (!db) return res.status(500).json({ error: 'Database error' });

        const { data, error } = await db
            .from('provider_settings')
            .select('*')
            .eq('provider_id', userId)
            .single();

        if (error && error.code !== 'PGRST116') { // PGRST116 is "not found"
            console.error('Settings fetch error:', error);
            return res.status(500).json({ error: 'Failed to fetch settings' });
        }

        // Return default if not found
        res.json(data || {
            withdrawal_address: '',
            auto_withdraw_enabled: false,
            min_withdrawal_amount: '1000000000000000000' // 1 CRO
        });

    } catch (error) {
        console.error('Settings API error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// PUT /api/settings - Update settings
router.put('/', async (req, res) => {
    try {
        const userId = req.headers['x-user-id'];
        if (!userId) return res.status(401).json({ error: 'Unauthorized' });

        const { withdrawal_address, auto_withdraw_enabled, min_withdrawal_amount } = req.body;

        // Validation
        if (withdrawal_address && !withdrawal_address.startsWith('0x')) {
            return res.status(400).json({ error: 'Invalid wallet address' });
        }

        const db = await initDB();
        if (!db) return res.status(500).json({ error: 'Database error' });

        const { data, error } = await db
            .from('provider_settings')
            .upsert({
                provider_id: userId,
                withdrawal_address,
                auto_withdraw_enabled,
                min_withdrawal_amount,
                updated_at: new Date().toISOString()
            })
            .select()
            .single();

        if (error) {
            console.error('Settings update error:', error);
            throw error;
        }

        res.json({ success: true, settings: data });

    } catch (error) {
        console.error('Settings Update error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// GET /api/settings/withdrawals - Get withdrawal history
router.get('/withdrawals', async (req, res) => {
    try {
        const userId = req.headers['x-user-id'];
        if (!userId) return res.status(401).json({ error: 'Unauthorized' });

        const db = await initDB();
        if (!db) return res.status(500).json({ error: 'Database error' });

        const { data, error } = await db
            .from('withdrawals')
            .select('*')
            .eq('provider_id', userId)
            .order('created_at', { ascending: false });

        if (error) throw error;

        res.json({ withdrawals: data || [] });

    } catch (error) {
        console.error('Withdrawals history error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

export default router;
