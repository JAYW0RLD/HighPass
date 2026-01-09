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


    // Strict Mode: All agents must sign UNLESS it's the Service Owner testing their own service.
    // -------------------------------------------------------------
    // OWNER BYPASS (SECURE SIMULATION)
    // -------------------------------------------------------------
    const providerToken = req.headers['x-provider-token'] as string;
    const serviceConfig = res.locals.serviceConfig; // From serviceResolver

    let isOwnerBypass = false;

    if (providerToken && serviceConfig && serviceConfig.provider_id) {
        try {
            // We need to verify the token. 
            // Ideally we shouldn't init Supabase client on every request here if possible, 
            // but for auth verifiction it's necessary.
            // We can reuse the initDB client or a fresh auth client.
            const { createClient } = require('@supabase/supabase-js');
            const supabase = createClient(
                process.env.SUPABASE_URL!,
                process.env.SUPABASE_SERVICE_ROLE_KEY!
            );

            const { data: { user }, error } = await supabase.auth.getUser(providerToken);

            if (!error && user && user.id === serviceConfig.provider_id) {
                console.log(`[CreditGuard] Owner Bypass: Provider ${user.id} accessing own service ${serviceConfig.slug}`);
                isOwnerBypass = true;
            }
        } catch (e) {
            console.error("[CreditGuard] Owner Bypass Check Failed", e);
        }
    }

    if (!isOwnerBypass && (!signature || !timestamp || !nonce)) {
        // Exception for Demo Agents (Securely Gated):
        const isDemoAgent = ['prime-agent', 'trusted-agent', 'subprime-agent', 'risky-agent'].includes(agentId);

        if (process.env.ENABLE_DEMO_AGENTS === 'true' && isDemoAgent) {
            // Pass through to verification logic (checks flag again)
        } else {
            res.status(401).json({ error: "Missing Identity Headers: X-Agent-Signature, X-Auth-Timestamp, X-Auth-Nonce" });
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

    // Exception for Demo Agents:
    // SECURITY FIX: Prevent external impersonation.
    // "Demo Agents" (prime-agent) are only allowed if the request is authenticated by the Service Owner (Owner Bypass).
    // This allows Providers to test their own services using simulated profiles,
    // but prevents attackers from just sending "X-Agent-ID: prime-agent" to bypass security.
    const isDemoAgent = ['prime-agent', 'trusted-agent', 'subprime-agent', 'risky-agent'].includes(agentId);

    // We do NOT set allowDemo based purely on env var + ID anymore.
    // Simulating an agent is a privilege of the Owner.
    // So, if isOwnerBypass is true, we implicitly allow the "simulation" (skipping signature).
    // But we need to ensure we don't block on "Missing Headers" if it is Owner Bypass.
    // (Logic above: "if (!isOwnerBypass && ...)" handles the check)

    // So actually, if isOwnerBypass is TRUE, we already skip:
    // 1. Missing Header check
    // 2. Nonce Check
    // 3. Signature Verify

    // The only remaining issue is: Does IdentityService crash on "prime-agent"?
    // Yes, because it expects BigInt. 
    // We need to handle that in IdentityService or catch it here.

    // Revert the insecure "allowDemo" logic.
    // We rely SOLELY on isOwnerBypass for simulation.

    // 1. Enforce headers (Strict Mode)
    // Only check if NOT Owner.
    if (!isOwnerBypass && (!signature || !timestamp || !nonce)) {
        res.status(401).json({ error: "Missing Identity Headers: X-Agent-Signature, X-Auth-Timestamp, X-Auth-Nonce" });
        return;
    }

    // ...

    // 3. Nonce & 4. Signature
    // Checks are guarded by `!isOwnerBypass`.
    // So if Owner, we skip them. Safe.

    // What if `ENABLE_DEMO_AGENTS` is needed for public demo?
    // If we want public to use `prime-agent` on `Demo Echo Service`, we need a specific exception for THAT service, not global.
    // But for now, let's assume secure default: No public spoofing.


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
    if (!isOwnerBypass && nonce) {
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
    if (!isOwnerBypass) {
        const isValid = await identityService.verifySignature(agentId, signature || '', timestamp || '', nonce || '');
        if (!isValid) {
            res.status(403).json({ error: "Invalid Identity Signature" });
            return;
        }
    } else if (isOwnerBypass && isDemoAgent) {
        console.log(`[CreditGuard] ⚠️ OWNER SIMULATION: ${agentId} bypassed verification.`);
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
