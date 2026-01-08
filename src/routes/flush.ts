import { Request, Response } from 'express';
import { getDebt, clearDebt } from '../database/db';

/**
 * Manual Settlement (Flush) Endpoint
 * 
 * Allows providers or agents to manually trigger debt settlement
 * even if threshold has not been reached yet.
 * 
 * Use Cases:
 * - Provider wants immediate payout
 * - Agent wants to clear debt before threshold
 * - Emergency settlement
 */
export const flushDebt = async (req: Request, res: Response) => {
    const agentId = req.headers['x-agent-id'] as string;

    if (!agentId) {
        res.status(400).json({ error: 'Missing X-Agent-ID header' });
        return;
    }

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
        const paymentHandlerAddress = process.env.PAYMENT_HANDLER_ADDRESS || '0x0000000000000000000000000000000000000000';
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
