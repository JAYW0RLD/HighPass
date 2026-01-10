import { Request, Response } from 'express';
import { publicClient } from '../utils/viemClient';
import { parseAbi, decodeEventLog } from 'viem';
import { addPrepaidBalance } from '../database/db';
import { updateScoreForPayment } from '../database/reputation';

/**
 * POST /api/deposit
 * 
 * Allows agents to deposit CRO into their prepaid balance
 * for instant API calls without 402 responses
 * 
 * Headers:
 * - X-Agent-ID: Agent wallet address
 * - X-Tx-Hash: On-chain deposit transaction hash
 * 
 * Response:
 * - 200: Deposit successful
 * - 400: Invalid request
 * - 409: Transaction already used
 * - 500: Server error
 */

const PAYMENT_RECEIVED_ABI = parseAbi([
    'event PaymentReceived(address indexed from, uint256 amount)'
]);

export async function depositHandler(req: Request, res: Response) {
    const agentId = req.headers['x-agent-id'] as string;
    const txHash = req.headers['x-tx-hash'] as string;

    // Input validation
    if (!agentId || !txHash) {
        return res.status(400).json({
            error: 'Missing required headers',
            required: ['X-Agent-ID', 'X-Tx-Hash']
        });
    }

    if (!/^0x[a-fA-F0-9]{40}$/.test(agentId)) {
        return res.status(400).json({
            error: 'Invalid X-Agent-ID format',
            message: 'Must be a valid EVM address'
        });
    }

    if (!/^0x[a-fA-F0-9]{64}$/.test(txHash)) {
        return res.status(400).json({
            error: 'Invalid X-Tx-Hash format',
            message: 'Must be a valid transaction hash (0x + 64 hex chars)'
        });
    }

    try {
        // Check if transaction already used
        const { isTxHashUsed } = await import('../database/db');
        const alreadyUsed = await isTxHashUsed(txHash);

        if (alreadyUsed) {
            return res.status(409).json({
                error: 'Transaction already used',
                message: 'This deposit has already been processed'
            });
        }

        // Fetch transaction receipt
        const receipt = await publicClient.waitForTransactionReceipt({
            hash: txHash as `0x${string}`,
            timeout: 30_000
        });

        if (!receipt || receipt.status !== 'success') {
            return res.status(400).json({
                error: 'Transaction failed or not found',
                message: 'The provided transaction is invalid or failed on-chain'
            });
        }

        // Find PaymentReceived event
        const paymentHandlerAddress = process.env.PAYMENT_HANDLER_ADDRESS as `0x${string}`;

        if (!paymentHandlerAddress) {
            console.error('[Deposit] PAYMENT_HANDLER_ADDRESS not configured');
            return res.status(500).json({ error: 'Server configuration error' });
        }

        const paymentEvent = receipt.logs.find((log) => {
            try {
                const decoded = decodeEventLog({
                    abi: PAYMENT_RECEIVED_ABI,
                    data: log.data,
                    topics: log.topics
                });

                return (
                    log.address.toLowerCase() === paymentHandlerAddress.toLowerCase() &&
                    decoded.eventName === 'PaymentReceived' &&
                    decoded.args.from.toLowerCase() === agentId.toLowerCase()
                );
            } catch {
                return false;
            }
        });

        if (!paymentEvent) {
            return res.status(400).json({
                error: 'No valid deposit event found',
                message: 'Transaction does not contain a valid PaymentReceived event from your address'
            });
        }

        // Decode the event to get deposit amount
        const decoded = decodeEventLog({
            abi: PAYMENT_RECEIVED_ABI,
            data: paymentEvent.data,
            topics: paymentEvent.topics
        });

        const depositAmount = decoded.args.amount;

        // v1.6.1: Convert CRO → USD for reputation scoring
        const { PriceService } = await import('../services/PriceService');
        const priceService = new PriceService();

        const depositUsd = await priceService.croToUsd(depositAmount);
        console.log(`[Deposit] ${depositAmount} wei CRO → $${depositUsd.toFixed(4)} USD`);

        // Update prepaid balance (in wei)
        await addPrepaidBalance(agentId, depositAmount);

        // Update reputation score (in USD)
        await updateScoreForPayment(agentId, depositUsd, 'deposit');

        // Track CRO volume (statistics)
        const { trackCroVolume } = await import('../database/reputation');
        await trackCroVolume(agentId, depositAmount);

        // Log the transaction
        const { logRequest } = await import('../database/db');
        await logRequest({
            agentId,
            status: 200,
            amount: depositAmount.toString(),
            txHash,
            endpoint: '/api/deposit'
        });

        console.log(`[Deposit] ✓ Agent ${agentId}: +${depositUsd.toFixed(4)} USD reputation (${depositAmount} wei)`);

        return res.status(200).json({
            success: true,
            message: 'Deposit successful',
            deposit: {
                amountCro: depositAmount.toString(),
                amountUsd: depositUsd.toFixed(4),
                transaction: txHash,
                agent: agentId
            }
        });

    } catch (error) {
        console.error('[Deposit] Error processing deposit:', error);
        return res.status(500).json({
            error: 'Internal server error',
            message: error instanceof Error ? error.message : 'Unknown error'
        });
    }
}
