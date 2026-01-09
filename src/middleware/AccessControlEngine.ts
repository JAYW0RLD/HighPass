import { Request, Response, NextFunction } from 'express';
import { initDB } from '../database/db';
import { getAddress, isAddress } from 'viem';

export const accessControlEngine = async (req: Request, res: Response, next: NextFunction) => {
    try {
        // Use agentId (verified by previous middleware) or header
        const agentId = (res.locals.agentId || req.headers['x-agent-id']) as string;

        // Track 1 (Anonymous) Default
        // If no agentId provided, we assume anonymous 
        if (!agentId) {
            console.log('[AccessControl] No Agent ID provided. Assigning Track 1 (Anonymous).');
            res.locals.track = 'TRACK_1';
            res.locals.isVerified = false;
            return next();
        }

        // SECURITY FIX (DB-CRIT-03): Normalize address to checksum format
        let normalizedAgentId = agentId;
        try {
            if (isAddress(agentId)) {
                normalizedAgentId = getAddress(agentId);
                console.log(`[AccessControl] Normalized address: ${agentId} -> ${normalizedAgentId}`);
            } else {
                console.warn(`[AccessControl] Invalid address format: ${agentId}`);
                res.locals.track = 'TRACK_1';
                res.locals.isVerified = false;
                return next();
            }
        } catch (e) {
            console.warn(`[AccessControl] Address normalization failed: ${agentId}`);
            res.locals.track = 'TRACK_1';
            res.locals.isVerified = false;
            return next();
        }

        const db = await initDB();
        if (!db) {
            console.error('[AccessControl] Database connection failed');
            return res.status(500).json({ error: 'Internal Server Error' });
        }

        // Check if wallet exists and is linked to a developer
        // Use case-insensitive comparison as additional safety
        const { data: wallet, error } = await db
            .from('wallets')
            .select(`
                status,
                current_debt,
                developers (
                    id,
                    global_debt_limit,
                    total_reputation
                )
            `)
            .ilike('address', normalizedAgentId)
            .single();

        if (error || !wallet || !wallet.developers) {
            console.log(`[AccessControl] Wallet ${normalizedAgentId} not verified. Assigning Track 1 (Anonymous).`);

            res.locals.track = 'TRACK_1';
            res.locals.isVerified = false;
            return next();
        }

        // Track 2 (Verified) Logic
        // Equal to AccessControlEngine.ts:46
        const developer = Array.isArray(wallet.developers) ? wallet.developers[0] : wallet.developers;

        if (!developer) {
            console.log(`[AccessControl] Wallet ${agentId} has no linked developer profile. Assigning Track 1.`);
            res.locals.track = 'TRACK_1';
            res.locals.isVerified = false;
            return next();
        }

        // IMPORTANT: wallets.current_debt is stored in USD (Decimal)
        // We need to convert it to Wei for comparison with the limit
        const currentDebtUsd = parseFloat(wallet.current_debt || '0');

        // Check Debt Limit
        // Both values should be in the same unit for comparison
        const debtLimitUsd = parseFloat(developer.global_debt_limit || '0.1');

        if (currentDebtUsd >= debtLimitUsd) {
            console.warn(`[AccessControl] Wallet ${agentId} verified but debt limit exceeded ($${currentDebtUsd} >= $${debtLimitUsd}). Downgrading to Track 1.`);
            // Fallback to Track 1 (Pay-as-you-go) if debt limit reached? 
            // Or deny? Prompt says "Optimistic Access ... Check limit". 
            // If fail, usually we prompt for payment (Track 1).
            res.locals.track = 'TRACK_1';
            res.locals.isVerified = true; // Still verified, just capped.
            res.locals.reason = 'DEBT_LIMIT_EXCEEDED';
        } else {
            console.log(`[AccessControl] Wallet ${agentId} verified. Debt: $${currentDebtUsd}/$${debtLimitUsd}. Assigning Track 2 (Optimistic).`);
            res.locals.track = 'TRACK_2';
            res.locals.isVerified = true;
            res.locals.developerId = developer.id;
            res.locals.walletAddress = agentId;
        }

        next();

    } catch (err) {
        console.error('[AccessControl] Error:', err);
        // Fail safe to Track 1
        res.locals.track = 'TRACK_1';
        next();
    }
};
