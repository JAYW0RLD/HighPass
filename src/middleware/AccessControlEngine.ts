import { Request, Response, NextFunction } from 'express';
import { initDB } from '../database/db';
import { FeeSettlementEngine } from '../services/FeeSettlementEngine';

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

        const db = await initDB();
        if (!db) {
            console.error('[AccessControl] Database connection failed');
            return res.status(500).json({ error: 'Internal Server Error' });
        }

        // Check if wallet exists and is linked to a developer
        // We assume agentId IS the wallet address
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
            .eq('address', agentId)
            .single();

        if (error || !wallet || !wallet.developers) {
            console.log(`[AccessControl] Wallet ${agentId} not verified. Assigning Track 1 (Anonymous).`);

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

        const currentDebt = BigInt(wallet.current_debt || 0);
        // This is in USD usually, need to align units.
        // Assuming schemas use consistent units (e.g. USD string or same numbering).
        // Prompt says global_debt_limit (Decimal, default: 0.1).

        // Check Debt Limit
        // Convert GLOBAL_DEBT_LIMIT (USD) to Wei using FeeSettlementEngine (with slippage protection)
        const feeEngine = new FeeSettlementEngine();
        const debtLimitUsd = parseFloat(developer.global_debt_limit || '0.1');

        let debtLimitWei = BigInt(0);
        try {
            debtLimitWei = await feeEngine.usdToWei(debtLimitUsd);
        } catch (e) {
            console.error("Failed to convert debt limit to Wei, falling back to safe default", e);
            // Fallback: 0.1 USD approx 1 CRO (for testnet) 
            // Better to fail closed or open?
            // Fail safe: Low limit so they don't rack up debt if oracle fails.
            debtLimitWei = BigInt(0);
        }

        if (currentDebt >= debtLimitWei) {
            console.warn(`[AccessControl] Wallet ${agentId} verified but debt limit exceeded (${currentDebt} >= ${debtLimitWei}). Downgrading to Track 1.`);
            // Fallback to Track 1 (Pay-as-you-go) if debt limit reached? 
            // Or deny? Prompt says "Optimistic Access ... Check limit". 
            // If fail, usually we prompt for payment (Track 1).
            res.locals.track = 'TRACK_1';
            res.locals.isVerified = true; // Still verified, just capped.
            res.locals.reason = 'DEBT_LIMIT_EXCEEDED';
        } else {
            console.log(`[AccessControl] Wallet ${agentId} verified. Assigning Track 2 (Optimistic).`);
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
