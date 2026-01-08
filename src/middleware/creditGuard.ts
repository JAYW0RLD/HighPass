import { Request, Response, NextFunction } from 'express';
import { IdentityService } from '../services/IdentityService';

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

    // 1. Enforce headers (Except for specific demo/legacy agents if needed, but stricter is better)
    // For Hackathon Demo: If ID is "prime-agent" etc., IdentityService allows bypass. 
    // But we still need to check if we should reject requests missing headers entirely.
    // Let's require them unless it's a known demo agent ID format (simple strings vs hex).

    // Strict Mode: All agents must sign.
    if (!signature || !timestamp) {
        // Allow legacy demo agents to pass without sig IF IdentityService permits
        // But IdentityService.verifySignature handles the "prime-agent" allowlist.
        // So we should try to verify. If args missing, we can't verify.

        // Exception for Demo Strings:
        const isDemoAgent = ['prime-agent', 'trusted-agent', 'subprime-agent', 'risky-agent'].includes(agentId);

        if (!isDemoAgent) {
            res.status(401).json({ error: "Missing Identity Headers: X-Agent-Signature, X-Auth-Timestamp" });
            return;
        }
    }

    // 2. Check Replay prevention (Time window)
    if (timestamp) {
        const reqTime = parseInt(timestamp, 10);
        const now = Date.now();
        if (Math.abs(now - reqTime) > 5 * 60 * 1000) { // 5 minutes tolerance
            res.status(401).json({ error: "Auth Timestamp expired (Clock skew > 5min)" });
            return;
        }
    }

    // 3. Verify Signature
    // CHEAT MODE (For Testing Only)
    // If TEST_CHEAT_KEY is set in env, and matches header, we bypass signature and force Grade A.
    const isProduction = process.env.NODE_ENV === 'production';
    const envCheatKey = process.env.TEST_CHEAT_KEY;
    const reqCheatKey = req.headers['x-test-cheat-key'] as string;
    let isCheatMode = false;

    // SECURITY: Disable cheat mode in production OR enforce minimum key length (32+ chars)
    if (!isProduction && envCheatKey && envCheatKey.length >= 32 && reqCheatKey === envCheatKey) {
        console.warn(`[Security] ⚠️ CHEAT MODE ACTIVE: Bypassing signature check for Agent ${agentId}`);
        isCheatMode = true;
    } else if (isProduction && reqCheatKey) {
        console.error(`[Security] 🚨 ATTACK DETECTED: Cheat mode header sent in PRODUCTION by Agent ${agentId}`);
        res.status(403).json({ error: "Forbidden: Invalid authentication method" });
        return;
    }

    // Strict Mode: All agents must provide valid signature (unless Cheat Mode is active)
    if (!isCheatMode) {
        const isValid = await identityService.verifySignature(agentId, signature, timestamp);
        if (!isValid) {
            res.status(403).json({ error: "Invalid Identity Signature" });
            return;
        }
    }

    try {
        let grade;
        if (isCheatMode) {
            // Force Grade A for testing
            grade = 'A';
            console.warn(`[Security] ⚠️ CHEAT MODE: Forcing Grade A for Agent ${agentId}`);
        } else {
            grade = await identityService.getCreditGrade(agentId);
        }

        res.locals.creditGrade = grade;

        console.log(`[CreditGuard] Agent ${agentId} assigned Grade: ${grade}`);

        // Logic moved to optimisticPayment (Policy engine)

        next();
    } catch (error) {
        console.error('[CreditGuard] Error checking reputation:', error);
        res.status(500).json({ error: "Failed to verify credit status" });
    }
};
