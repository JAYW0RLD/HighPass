import { Request, Response, NextFunction } from 'express';
import { IdentityService } from '../services/IdentityService';
import { isNonceUsed, recordNonce } from '../database/db';

const identityService = new IdentityService();

export const creditGuard = async (req: Request, res: Response, next: NextFunction) => {
    const agentId = req.headers['x-agent-id'] as string;

    if (!agentId) {
        res.status(400).json({ error: "Missing X-Agent-ID header" });
        return;
    }

    // Validate agent ID format
    if (typeof agentId !== 'string' || agentId.length > 100 || !/^[a-zA-Z0-9_-]+$/.test(agentId)) {
        res.status(400).json({ error: "Invalid X-Agent-ID format" });
        return;
    }

    // -------------------------------------------------------------
    // SECURITY: IDENTITY VERIFICATION (Fixing Identity Spoofing)
    // -------------------------------------------------------------
    const signature = req.headers['x-agent-signature'] as string;
    const timestamp = req.headers['x-auth-timestamp'] as string;
    const nonce = req.headers['x-auth-nonce'] as string; // NEW: Nonce for replay protection

    // 1. Enforce headers (Except for specific demo/legacy agents if needed, but stricter is better)
    // For Hackathon Demo: If ID is "prime-agent" etc., IdentityService allows bypass. 
    // But we still need to check if we should reject requests missing headers entirely.
    // Let's require them unless it's a known demo agent ID format (simple strings vs hex).


    // -------------------------------------------------------------
    // STRICT MODE: NO BYPASS, NO EXCEPTIONS
    // -------------------------------------------------------------

    // 1. Enforce headers (Strict Mode)
    // All requests must be properly signed.
    if (!signature || !timestamp || !nonce) {
        res.status(401).json({ error: "Missing Identity Headers: X-Agent-Signature, X-Auth-Timestamp, X-Auth-Nonce" });
        return;
    }


    // 2. Check Replay prevention (Time window)
    if (timestamp) {
        // ... (Keep existing logic)
        const reqTime = parseInt(timestamp, 10);
        const now = Date.now();
        if (Math.abs(now - reqTime) > 5 * 60 * 1000) {
            res.status(401).json({ error: "Auth Timestamp expired (Clock skew > 5min)" });
            return;
        }
    }

    // 3. NONCE VALIDATION (NEW - Replay Attack Prevention)
    if (nonce) {
        // ATOMIC NONCE CHECK (V-04-FIXED): 
        // We removed the separate `isNonceUsed` check to prevent Race Conditions (TOCTOU).
        // We rely on the Database Unique Constraint in `recordNonce` to fail if nonce exists.

        try {
            await recordNonce(nonce, agentId);
        } catch (err: any) {
            if (err.message === 'Nonce already used' || err.code === '23505') {
                console.error(`[CreditGuard] 🚨 REPLAY ATTACK DETECTED! Nonce ${nonce} already used by agent ${agentId}`);
                res.status(403).json({ error: "Replay Attack Detected", message: "This nonce has already been used" });
                return;
            }

            console.error(`[CreditGuard] Failed to record nonce:`, err);
            res.status(500).json({ error: "Internal Server Error" });
            return;
        }
    }

    // 4. Verify Signature
    const isValid = await identityService.verifySignature(agentId, signature || '', timestamp || '', nonce || '');
    if (!isValid) {
        res.status(403).json({ error: "Invalid Identity Signature" });
        return;
    }

    try {
        const grade = await identityService.getCreditGrade(agentId);

        res.locals.creditGrade = grade;

        console.log(`[CreditGuard] Agent ${agentId} assigned Grade: ${grade}`);

        // Logic moved to optimisticPayment (Policy engine)

        next();
    } catch (error) {
        console.error('[CreditGuard] Error checking reputation:', error);
        res.status(500).json({ error: "Failed to verify credit status" });
    }
};
