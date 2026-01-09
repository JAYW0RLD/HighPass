import { Request, Response } from 'express';
import { getDebt, clearDebt, recordNonce } from '../database/db';
import { IdentityService } from '../services/IdentityService';

/**
 * Manual Settlement (Flush) Endpoint
 * 
 * Allows providers or agents to manually trigger debt settlement
 * even if threshold has not been reached yet.
 * 
 * SECURITY (V-01 FIX): Now requires proper authentication via signature
 * to prevent unauthorized debt queries and information disclosure.
 * 
 * Use Cases:
 * - Provider wants immediate payout
 * - Agent wants to clear debt before threshold
 * - Emergency settlement
 */
export const flushDebt = async (req: Request, res: Response) => {
    const agentId = req.headers['x-agent-id'] as string;
    const signature = req.headers['x-agent-signature'] as string;
    const timestamp = req.headers['x-auth-timestamp'] as string;
    const nonce = req.headers['x-auth-nonce'] as string;

    // 1. Validate all required headers
    if (!agentId) {
        res.status(400).json({ error: 'Missing X-Agent-ID header' });
        return;
    }

    if (!signature || !timestamp || !nonce) {
        res.status(401).json({
            error: 'Missing authentication headers',
            required: ['X-Agent-Signature', 'X-Auth-Timestamp', 'X-Auth-Nonce']
        });
        return;
    }

    // 2. Validate agent ID format
    if (typeof agentId !== 'string' || agentId.length > 100 || !/^[a-zA-Z0-9_-]+$/.test(agentId)) {
        res.status(400).json({ error: 'Invalid X-Agent-ID format' });
        return;
    }

    // 3. Validate timestamp (prevent old replay attacks)
    const reqTime = parseInt(timestamp, 10);
    const now = Date.now();
    if (Math.abs(now - reqTime) > 5 * 60 * 1000) {
        res.status(401).json({ error: 'Auth Timestamp expired (Clock skew > 5min)' });
        return;
    }

    // 4. Verify nonce (prevent replay attacks)
    try {
        await recordNonce(nonce, agentId);
    } catch (err: any) {
        if (err.message === 'Nonce already used' || err.code === '23505') {
            console.error(`[Flush] 🚨 REPLAY ATTACK DETECTED! Nonce ${nonce} already used by agent ${agentId}`);
            res.status(403).json({
                error: 'Replay Attack Detected',
                message: 'This nonce has already been used'
            });
            return;
        }
        console.error(`[Flush] Failed to record nonce:`, err);
        res.status(500).json({ error: 'Internal Server Error' });
        return;
    }

    // 5. Verify signature
    const identityService = new IdentityService();
    const isValid = await identityService.verifySignature(agentId, signature, timestamp, nonce);

    if (!isValid) {
        console.warn(`[Flush] Invalid signature from agent ${agentId}`);
        res.status(403).json({ error: 'Invalid Identity Signature' });
        return;
    }

    // 6. Now that authentication is verified, process flush request
    try {
        // Check current debt
        const currentDebt = await getDebt(agentId);

        if (currentDebt === BigInt(0)) {
            res.status(200).json({
                message: 'No outstanding debt',
                debtAmount: '0'
            });
            return;
        }

        // Return payment request
        if (!process.env.PAYMENT_HANDLER_ADDRESS) {
            console.error('[Flush] PAYMENT_HANDLER_ADDRESS is not set');
            return res.status(500).json({ error: 'Server misconfiguration: missing payment handler' });
        }
        const paymentHandlerAddress = process.env.PAYMENT_HANDLER_ADDRESS;
        const commonHeaders = `receiver="${paymentHandlerAddress}", asset="CRO", chainId="240", datetime="${new Date().toISOString()}"`;

        res.status(402).set(
            'WWW-Authenticate',
            `Token realm="X402-Flush", ${commonHeaders}, amount="${currentDebt.toString()}", debt="${currentDebt.toString()}"`
        ).json({
            error: 'Manual Settlement Requested',
            message: 'Please settle current debt balance',
            debtAmount: currentDebt.toString(),
            manual: true
        });
    } catch (error) {
        console.error('[Flush] Error:', error);
        res.status(500).json({ error: 'Failed to process flush request' });
    }
};
