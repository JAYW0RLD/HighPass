import express from 'express';
import { query } from '../database/db';
import { isAddress, getAddress } from 'viem';

const router = express.Router();

// GET /api/settings - Get provider settings
router.get('/', async (req, res) => {
    try {
        const userId = res.locals.user.id;
        if (!userId) return res.status(401).json({ error: 'Unauthorized' });

        const sql = `SELECT * FROM provider_settings WHERE provider_id = $1 LIMIT 1`;
        const { rows } = await query(sql, [userId]);
        const data = rows[0];

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
        const userId = res.locals.user.id;
        if (!userId) return res.status(401).json({ error: 'Unauthorized' });

        const { withdrawal_address, auto_withdraw_enabled, min_withdrawal_amount } = req.body;

        // SECURITY FIX (V-06): Strict wallet address validation
        let validatedWithdrawalAddress = withdrawal_address;
        if (withdrawal_address) {
            // Validate address format (checksum, length, format)
            if (!isAddress(withdrawal_address)) {
                return res.status(400).json({
                    error: 'Invalid wallet address',
                    details: 'Address must be a valid EVM address (0x + 40 hex chars with valid checksum)'
                });
            }
            // Normalize to checksummed address
            validatedWithdrawalAddress = getAddress(withdrawal_address);
        }

        const sql = `
            INSERT INTO provider_settings (provider_id, withdrawal_address, auto_withdraw_enabled, min_withdrawal_amount, updated_at)
            VALUES ($1, $2, $3, $4, NOW())
            ON CONFLICT (provider_id) 
            DO UPDATE SET 
                withdrawal_address = EXCLUDED.withdrawal_address,
                auto_withdraw_enabled = EXCLUDED.auto_withdraw_enabled,
                min_withdrawal_amount = EXCLUDED.min_withdrawal_amount,
                updated_at = NOW()
            RETURNING *
        `;

        const { rows } = await query(sql, [
            userId,
            validatedWithdrawalAddress,
            auto_withdraw_enabled,
            min_withdrawal_amount
        ]);
        const data = rows[0];

        res.json({ success: true, settings: data });

    } catch (error) {
        console.error('Settings Update error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// GET /api/settings/withdrawals - Get withdrawal history
router.get('/withdrawals', async (req, res) => {
    try {
        const userId = res.locals.user.id;
        if (!userId) return res.status(401).json({ error: 'Unauthorized' });

        const sql = `SELECT * FROM withdrawals WHERE provider_id = $1 ORDER BY created_at DESC`;
        const { rows } = await query(sql, [userId]);

        res.json({ withdrawals: rows || [] });

    } catch (error) {
        console.error('Withdrawals history error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

export default router;
