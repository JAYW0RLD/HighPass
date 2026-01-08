import { Request, Response, NextFunction } from 'express';
import { PriceService } from '../services/PriceService';
import { IdentityService } from '../services/IdentityService';
import { FeeSettlementEngine } from '../services/FeeSettlementEngine';
import { getDebt, addDebt, clearDebt, isTxHashUsed, logRequest } from '../database/db';
import { ServiceConfig } from './serviceResolver';
import { createClient } from '@supabase/supabase-js';

export const optimisticPaymentCheck = async (req: Request, res: Response, next: NextFunction) => {
    const authHeader = req.headers['authorization'];
    const agentId = req.headers['x-agent-id'] as string;

    // Input validation for agent ID
    if (!agentId) {
        res.status(400).json({ error: "Missing X-Agent-ID header" });
        return;
    }

    if (typeof agentId !== 'string' || agentId.length > 100 || !/^[a-zA-Z0-9_-]+$/.test(agentId)) {
        res.status(400).json({ error: "Invalid X-Agent-ID format" });
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

    // ---------------------------------------------------------
    // PROVIDER SELF-TEST BYPASS (SECURE)
    // ---------------------------------------------------------
    // Provider가 자기 서비스를 테스트하는 경우 무료 통과
    // 보안: x-user-id 헤더는 위조 가능하므로, Supabase JWT를 검증해야 함
    const bearerToken = req.headers['x-provider-token'] as string;

    if (bearerToken && serviceConfig) {
        try {
            // Initialize Supabase client for JWT verification
            const supabaseUrl = process.env.SUPABASE_URL;
            const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

            if (!supabaseUrl || !supabaseKey) {
                console.warn('[Security] Supabase credentials missing - cannot verify provider token');
            } else {
                const supabase = createClient(supabaseUrl, supabaseKey);

                // Verify JWT and extract user
                const { data: { user }, error } = await supabase.auth.getUser(bearerToken);

                if (!error && user && user.id === serviceConfig.provider_id) {
                    console.log(`[Test Mode] ✅ Provider ${user.id} verified via JWT - testing own service ${serviceConfig.slug} - bypassing payment`);
                    res.locals.paymentAmount = '0';
                    res.locals.isProviderTest = true;
                    next();
                    return;
                } else if (error) {
                    console.warn(`[Security] ⚠️ Invalid provider token: ${error.message}`);
                } else if (user && user.id !== serviceConfig.provider_id) {
                    console.warn(`[Security] 🚨 ATTACK DETECTED: User ${user.id} tried to impersonate provider ${serviceConfig.provider_id}`);
                }
            }
        } catch (err) {
            console.error('[Security] Provider token verification failed:', err);
        }
    }

    // Check agent's current debt
    const currentDebt = await getDebt(agentId);

    // Get agent's credit grade (Expected to be set by creditGuard middleware)
    const grade = res.locals.creditGrade;
    if (!grade) {
        console.warn(`[Optimistic] Warning: creditGrade not found in res.locals for agent ${agentId}`);
    }

    // X402 STANDARD NEGOTIATION
    if (!authHeader || !authHeader.startsWith('Token ')) {
        const paymentHandlerAddress = process.env.PAYMENT_HANDLER_ADDRESS || "0x0000000000000000000000000000000000000000";
        const commonHeaders = `receiver="${paymentHandlerAddress}", asset="CRO", chainId="240", datetime="${new Date().toISOString()}"`;

        // Case 1: Outstanding Debt - Check Settlement Threshold
        // Grade-based debt aggregation for gas optimization
        const DEBT_THRESHOLDS = {
            'A': BigInt('5000000000000000000'), // $5.00 @ $0.10/CRO = 50 CRO
            'B': BigInt('1000000000000000000'), // $1.00 = 10 CRO
            'C': BigInt('1000000000000000000'), // $1.00 = 10 CRO
            'D': BigInt(0), // Immediate payment
            'E': BigInt(0), // Immediate payment
            'F': BigInt(0)  // Immediate payment
        };

        const debtThreshold = DEBT_THRESHOLDS[grade as keyof typeof DEBT_THRESHOLDS] || BigInt(0);
        const newDebt = currentDebt + requiredWei;

        if (currentDebt > 0 && newDebt >= debtThreshold) {
            // Debt exceeded threshold - demand settlement
            console.log(`[Batch Settlement] Agent ${agentId} (Grade ${grade}): Debt ${currentDebt} + ${requiredWei} >= ${debtThreshold} - triggering settlement`);
            res.locals.paymentAmount = currentDebt.toString();
            res.status(402).set(
                'WWW-Authenticate',
                `Token realm=\"X402-Settlement\", ${commonHeaders}, amount=\"${currentDebt.toString()}\", debt=\"${currentDebt.toString()}\", threshold=\"${debtThreshold.toString()}\"`
            ).json({
                error: "Settlement Required",
                message: `Debt threshold reached. Please settle outstanding balance.`,
                debtAmount: currentDebt.toString(),
                threshold: debtThreshold.toString(),
                grade: grade
            });
            return;
        }

        // Case 2: Check Optimistic Policy (Dynamic)
        // Dual-Track Logic (Track 2 = Verified Developer)
        if (res.locals.track === 'TRACK_2') {
            // Already verified by AccessControlEngine (including Max Debt Limit)
            // Still respected Case 1 (Settlement Threshold) above.
            console.log(`[Dual-Track] Agent ${agentId} is Verified (Track 2). Allowing optimistic payment.`);
            await addDebt(agentId, requiredWei);
            res.locals.paymentAmount = requiredWei.toString();
            res.locals.isOptimistic = true;
            next();
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
            message: `Upfront payment required. Optimistic access requires Grade ${minOptimisticGrade}+.`
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

    // CHECK FOR REPLAY ATTACK (DB Check)
    // CRITICAL FIX: We must atomically mark this transaction as "in-use" BEFORE verification
    // to prevent race condition where two concurrent requests use the same txHash.
    const replayCheck = await isTxHashUsed(token);
    if (replayCheck) {
        console.warn(`[Security] Replay Attack Detected! TxHash ${token} was already used.`);
        res.status(403).json({
            error: "Replay Attack Detected",
            message: "This transaction hash has already been used. Please submit a new payment."
        });
        return;
    }

    // ATOMIC LOCK: Insert a placeholder record immediately to claim this txHash
    // This prevents concurrent requests from passing the replay check
    try {
        await logRequest({
            agentId: agentId,
            status: 0, // Pending verification
            amount: requiredWei.toString(),
            txHash: token,
            endpoint: req.originalUrl,
            error: 'PENDING_VERIFICATION'
        });
    } catch (err) {
        // If insert fails (duplicate key), another request is already processing this txHash
        console.warn(`[Security] Concurrent Replay Attack Detected! TxHash ${token} is being processed.`);
        res.status(409).json({
            error: "Transaction Processing",
            message: "This transaction is already being processed. Please wait."
        });
        return;
    }

    // Verify payment on-chain
    try {
        console.log(`[Payment] Agent ${agentId}: Verifying payment ${token}`);

        const client = identityService.getClient();
        const receipt = await client.getTransactionReceipt({ hash: token as `0x${string}` });

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

        console.log(`[Payment] Agent ${agentId}: Payment verified successfully`);

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

        const isProduction = process.env.NODE_ENV === 'production';
        const errorMessage = isProduction
            ? 'Failed to verify payment'
            : `Verification failed: ${(error as Error).message}`;
        res.status(500).json({ error: errorMessage });
        return;
    }
};
