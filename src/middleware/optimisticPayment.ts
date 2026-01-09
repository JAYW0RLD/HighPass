import { Request, Response, NextFunction } from 'express';
import { PriceService } from '../services/PriceService';
import { IdentityService } from '../services/IdentityService';
import { FeeSettlementEngine } from '../services/FeeSettlementEngine';
import { getDebt, addDebt, clearDebt, isTxHashUsed, logRequest } from '../database/db';
import { ServiceConfig } from './serviceResolver';
import { createClient } from '@supabase/supabase-js';
import { parseAbi, decodeEventLog, keccak256, toHex, Log } from 'viem';
import { publicClient } from '../utils/viemClient';

export const optimisticPaymentCheck = async (req: Request, res: Response, next: NextFunction) => {
    const authHeader = req.headers['authorization'];
    const agentId = req.headers['x-agent-id'] as string;

    // Input validation for agent ID
    if (!agentId) {
        res.status(400).json({ error: "Missing X-Agent-ID header" });
        return;
    }

    // RED TEAM FIX [HIGH-01]: Strict EVM Address Validation (DoS Prevention)
    // Previously allowed loose regex which caused DB errors/log spam.
    // Now enforcing strict 40-char hex string (EVM standard).
    if (typeof agentId !== 'string' || !/^0x[a-fA-F0-9]{40}$/.test(agentId)) {
        res.status(400).json({ error: "Invalid X-Agent-ID format. Must be a valid EVM address." });
        return;
    }

    // Dynamic Price Calculation
    const priceService = new PriceService();
    const identityService = new IdentityService();
    // Use FeeSettlementEngine for final fee calculation
    const feeEngine = new FeeSettlementEngine();

    // ---------------------------------------------------------
    // DYNAMIC SERVICE CONFIGURATION
    // ---------------------------------------------------------
    const serviceConfig = res.locals.serviceConfig as ServiceConfig | undefined;
    let requiredWei = BigInt(0);
    let minOptimisticGrade = 'F'; // Default

    // Base Service Price (Wei or USD converted)
    let basePriceWei = BigInt(0);

    if (serviceConfig) {
        // Use Provider-defined settings
        basePriceWei = BigInt(serviceConfig.price_wei || '0');
        minOptimisticGrade = serviceConfig.min_grade || 'F';
    } else {
        // Fallback or Oracle Pricing for legacy routes
        try {
            basePriceWei = await priceService.getPaymentAmountWei('CRO', 0.01);
            minOptimisticGrade = 'B';
        } catch (e) {
            console.error("Failed to get dynamic price", e);
            res.status(500).json({ error: "Oracle Error: Cannot determine price" });
            return;
        }
    }

    // Calculate Final Fee (Gas + Margin + Base Price)
    // Dynamic Fee: Gas Fee (estimateGas) + Margin (0.2~0.5%)
    // Slippage Protection: 2% buffer applied inside calculateFee or usdToWei if needed.
    // Here we wrap basePriceWei with Fee Engine.
    const feeResult = await feeEngine.calculateFee({
        servicePriceWei: basePriceWei,
        marginPercent: 0.005 // 0.5% Margin
    });

    requiredWei = feeResult.totalWei;

    // Store breakdown for debugging/headers?
    res.locals.feeBreakdown = feeResult.breakdown;



    // Check agent's current debt
    const currentDebt = await getDebt(agentId);

    // Get agent's credit grade (Expected to be set by creditGuard middleware)
    const grade = res.locals.creditGrade;
    if (!grade) {
        console.warn(`[Optimistic] Warning: creditGrade not found in res.locals for agent ${agentId}`);
    }

    // X402 STANDARD NEGOTIATION
    if (!authHeader || !authHeader.startsWith('Token ')) {
        const paymentHandlerAddress = process.env.PAYMENT_HANDLER_ADDRESS;

        // RED TEAM FIX [V-RT-04]: Fail Closed if Configuration Missing
        // Prevent accidental burning of funds to Zero Address
        if (!paymentHandlerAddress) {
            console.error("[FATAL] PAYMENT_HANDLER_ADDRESS environment variable is missing");
            res.status(500).json({ error: "Server Configuration Error" });
            return;
        }

        const commonHeaders = `receiver="${paymentHandlerAddress}", asset="CRO", chainId="240", datetime="${new Date().toISOString()}"`;

        // Case 0: Dual-Track / Verified Developer (Priority Check)
        if (res.locals.track === 'TRACK_2') {
            // Already verified by AccessControlEngine (including Max Debt Limit)
            console.log(`[Dual-Track] Agent ${agentId} is Verified (Track 2). Allowing optimistic payment.`);
            await addDebt(agentId, requiredWei);
            res.locals.paymentAmount = requiredWei.toString();
            res.locals.isOptimistic = true;
            next();
            return;
        }

        // Case 1: Outstanding Debt - Check Settlement Threshold
        // Grade-based debt aggregation for gas optimization
        const DEBT_THRESHOLDS = {
            'A': BigInt('50000000000000000000'), // $5.00 @ $0.10/CRO = 50 CRO
            'B': BigInt('10000000000000000000'), // $1.00 = 10 CRO
            'C': BigInt('10000000000000000000'), // $1.00 = 10 CRO
            'D': BigInt(0), // Immediate payment
            'E': BigInt(0), // Immediate payment
            'F': BigInt(0)  // Immediate payment
        };

        const debtThreshold = DEBT_THRESHOLDS[grade as keyof typeof DEBT_THRESHOLDS] || BigInt(0);
        const newDebt = currentDebt + requiredWei;

        // 80% Warning Logic (Soft Demand)
        if (debtThreshold > BigInt(0)) {
            const usagePercent = (newDebt * 100n) / debtThreshold;
            res.set('X-Credit-Usage', usagePercent.toString());

            if (usagePercent >= 80n && usagePercent < 100n) {
                console.log(`[X402] Agent ${agentId}: High Credit Usage (${usagePercent}%). Sending Warning.`);
                res.set('X-Credit-Warning', 'High Usage: Please settle debt to avoid blocking.');
            }
        }

        if (currentDebt > 0 && newDebt >= debtThreshold) {
            // Debt exceeded threshold - demand settlement
            console.log(`[Batch Settlement] Agent ${agentId} (Grade ${grade}): Debt ${currentDebt} + ${requiredWei} >= ${debtThreshold} - triggering settlement`);
            res.locals.paymentAmount = currentDebt.toString();
            res.status(402).set(
                'WWW-Authenticate',
                `Token realm=\"X402-Settlement\", ${commonHeaders}, amount=\"${currentDebt.toString()}\", debt=\"${currentDebt.toString()}\", threshold=\"${debtThreshold.toString()}\"`
            ).json({
                error: "Settlement Required",
                message: "Debt limit exceeded. Please settle outstanding balance to continue.",
                // Machine-readable fields (Standard Extension)
                currency: "CRO",
                debt: currentDebt.toString(),
                limit: debtThreshold.toString(),
                required: currentDebt.toString(), // Must pay full debt to reset? Or just diff? Usually full.
                recommendation: "SETTLE"
            });
            return;
        }



        // Condition: Grade is "Better or Equal" to Min Grade.
        // Since Grade A < Grade B (lexicographically), we check if agentGrade <= minGrade
        // e.g. Agent=A, Min=B -> 'A' <= 'B' (True) -> Allowed
        // e.g. Agent=C, Min=B -> 'C' <= 'B' (False) -> Not Allowed
        const isOptimisticEligible = grade && grade <= minOptimisticGrade;

        if (isOptimisticEligible) {
            // Allow optimistic access - accumulate debt
            console.log(`[X402] Agent ${agentId} (Grade ${grade}): Granting Optimistic Access. Debt: ${currentDebt} → ${newDebt} (Threshold: ${debtThreshold})`);
            await addDebt(agentId, requiredWei);
            res.locals.paymentAmount = requiredWei.toString();
            res.locals.isOptimistic = true;
            next();
            return;
        }

        // Case 3: Subprime / Below Threshold - Demand Upfront Payment
        console.log(`[X402] Agent ${agentId} (Grade ${grade}): Demanding Upfront Payment (Requires ${minOptimisticGrade}+)`);
        res.locals.paymentAmount = requiredWei.toString();
        res.status(402).set(
            'WWW-Authenticate',
            `Token realm="X402", ${commonHeaders}, amount="${requiredWei.toString()}"`
        ).json({
            error: "Payment Required",
            message: `Upfront payment required. Optimistic access requires Grade ${minOptimisticGrade}+.`,
            // Machine-readable fields
            currency: "CRO",
            debt: currentDebt.toString(),
            limit: "0", // No credit limit
            required: requiredWei.toString(),
            recommendation: "PAY_UPFRONT"
        });
        return;
    }

    // Payment proof provided - VERIFY ON-CHAIN
    const token = authHeader.split(' ')[1];

    // Validate transaction hash format
    if (!token || !/^0x[a-fA-F0-9]{64}$/.test(token)) {
        res.status(403).json({ error: "Invalid payment proof format (Expected 64-char hex TxHash)" });
        return;
    }

    // SECURITY FIX (V-NEW-01): Atomic transaction replay prevention
    // Use database unique constraint instead of check-then-insert to prevent TOCTOU
    // The constraint ensures only ONE request can claim each tx_hash atomically
    try {
        await logRequest({
            agentId: agentId,
            status: 0, // Pending verification
            amount: requiredWei.toString(),
            txHash: token,
            endpoint: req.originalUrl,
            error: 'PENDING_VERIFICATION'
        });
    } catch (err: any) {
        // Unique constraint violation (23505) = transaction already used/being processed
        if (err.code === '23505' || err.message?.includes('duplicate') || err.message?.includes('unique')) {
            console.error(`[Security] 🚨 REPLAY ATTACK BLOCKED! TxHash ${token} already claimed. Agent: ${agentId}`);
            res.status(403).json({
                error: "Transaction Already Used",
                message: "This transaction hash has already been used or is being processed. Please submit a new payment."
            });
            return;
        }

        // Other database errors - fail closed
        console.error(`[Security] Database error during tx claim:`, err);
        res.status(500).json({
            error: "Payment Verification Failed",
            message: "Unable to process payment verification. Please try again."
        });
        return;
    }

    // Verify payment on-chain
    try {
        console.log(`[Payment] Agent ${agentId}: Verifying payment ${token}`);

        // Use shared client
        const receipt = await publicClient.getTransactionReceipt({ hash: token as `0x${string}` });

        if (!receipt) {
            res.status(403).json({ error: "Transaction not found on blockchain" });
            return;
        }

        if (receipt.status !== 'success') {
            res.status(403).json({ error: "Transaction failed on blockchain" });
            return;
        }

        // Verify transaction is to PaymentHandler contract
        const paymentHandlerAddress = process.env.PAYMENT_HANDLER_ADDRESS?.toLowerCase();
        if (receipt.to?.toLowerCase() !== paymentHandlerAddress) {
            res.status(403).json({ error: "Payment not sent to correct contract" });
            return;
        }

        // ========================================================================
        // CRITICAL SECURITY FIX (V-03): Verify Payment Event Data
        // ========================================================================
        // Previous implementation only checked tx.to but didn't verify:
        // - Payment amount matches required
        // - Sender matches agent ID
        // - Transaction contains valid PaymentMade event
        // This allowed attackers to reuse small payments for expensive API access

        const paymentAbi = parseAbi([
            'event PaymentMade(address indexed from, address indexed to, uint256 amount, uint256 fee)'
        ]);

        // Calculate expected event signature
        const paymentEventSignature = keccak256(toHex('PaymentMade(address,address,uint256,uint256)'));

        // Find PaymentMade event in transaction logs
        const paymentLog = receipt.logs?.find((log: Log) =>
            log.address?.toLowerCase() === paymentHandlerAddress &&
            log.topics?.[0] === paymentEventSignature
        );

        if (!paymentLog || !paymentLog.topics || !paymentLog.data) {
            console.error(`[Payment] No valid PaymentMade event found in tx ${token}`);
            res.status(403).json({
                error: 'Invalid Payment Transaction',
                message: 'No valid payment event found in transaction logs'
            });
            return;
        }

        // Decode event data to extract amount and sender
        let decoded: any;
        try {
            decoded = decodeEventLog({
                abi: paymentAbi,
                data: paymentLog.data,
                topics: paymentLog.topics
            });
        } catch (decodeError) {
            console.error(`[Payment] Failed to decode payment event:`, decodeError);
            res.status(403).json({
                error: 'Invalid Payment Event',
                message: 'Could not parse payment event data'
            });
            return;
        }

        // Verify sender matches agent ID
        const senderAddress = decoded.args.from?.toLowerCase();
        if (senderAddress !== agentId.toLowerCase()) {
            console.error(`[Payment] 🚨 PAYMENT FRAUD DETECTED! Agent ${agentId} submitted tx from ${senderAddress}`);
            res.status(403).json({
                error: 'Payment Sender Mismatch',
                message: `Payment sender (${senderAddress}) does not match agent ID (${agentId})`
            });
            return;
        }

        // Verify payment amount meets or exceeds requirement
        const paidAmount = BigInt(decoded.args.amount || 0);
        if (paidAmount < requiredWei) {
            console.error(`[Payment] 🚨 INSUFFICIENT PAYMENT! Agent ${agentId} paid ${paidAmount} but required ${requiredWei}`);
            res.status(403).json({
                error: 'Insufficient Payment',
                message: `Payment amount (${paidAmount} wei) is less than required (${requiredWei} wei)`
            });
            return;
        }

        console.log(`[Payment] ✅ Agent ${agentId}: Payment fully verified (Sender: ${senderAddress}, Amount: ${paidAmount} >= ${requiredWei})`);

        // Clear any outstanding debt
        if (currentDebt > 0) {
            await clearDebt(agentId);
            console.log(`[Optimistic] Agent ${agentId}: Debt settled via ${token}`);
        }

        // Update the placeholder record to SUCCESS (status 200 will be set by logger)
        // The logger middleware will overwrite this, but we mark it as verified here
        res.locals.paymentAmount = requiredWei.toString();
        res.locals.txHashVerified = true; // Flag for logger to know it was pre-verified
        next();
    } catch (error) {
        console.error(`[Payment] Verification error:`, error);

        // CLEANUP: Remove the placeholder record if verification failed
        await logRequest({
            agentId: agentId,
            status: 500,
            amount: requiredWei.toString(),
            txHash: token,
            endpoint: req.originalUrl,
            error: `Verification failed: ${(error as Error).message}`
        });

        // SECURITY FIX (V-12): Never leak implementation details in production
        const isProduction = process.env.NODE_ENV === 'production';
        const errorMessage = 'Failed to verify payment';

        // Log full details server-side only
        if (!isProduction) {
            console.error('[Payment] Full error details:', error);
        }

        res.status(500).json({ error: errorMessage });
        return;
    }
};
