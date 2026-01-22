import { Request, Response, NextFunction } from 'express';
import { Facilitator } from '@crypto.com/facilitator-client';
import { CronosNetwork } from '@crypto.com/facilitator-client/dist/integrations/facilitator.interface';
import { logRequest } from '../database/db';
import { FeeSettlementEngine } from '../services/FeeSettlementEngine';
import { FEE_CONFIG } from '../config/reputation';
import { CHAIN_CONFIG } from '../config/chain';

/**
 * StrictPaymentGuard (SDK Version)
 * 
 * Uses standard @crypto.com/facilitator-client for x402 verification.
 * Flow:
 * 1. Server defines PaymentRequirements (Price, Receiver)
 * 2. Client provides Signed Header (EIP-3009)
 * 3. SDK verifies Header vs Requirements
 * 4. SDK settles payment on-chain
 * 5. Access Granted
 */
export const strictPaymentGuard = async (req: Request, res: Response, next: NextFunction) => {
    const authHeader = req.headers['authorization'];

    // SDK Init
    const facilitator = new Facilitator({
        network: CronosNetwork.CronosTestnet, // ChainId 338
    });

    // 1. Calculate Price
    let requiredUnits = BigInt(0);
    try {
        const feeEngine = new FeeSettlementEngine();
        const serviceConfig = res.locals.serviceConfig;

        // [DYNAMIC] Determine Base Price
        // Priority: 1. Endpoint specific price, 2. Service price_wei (if USD), 3. Default $0.01
        let servicePriceUsd = 0.01;

        // Find if current subpath has a specific price in capabilities
        const splat = req.params.splat || '';
        const capabilities = serviceConfig?.capabilities;
        if (capabilities && capabilities.endpoints) {
            const endpoint = capabilities.endpoints.find((e: any) => e.path === splat);
            if (endpoint && endpoint.price_usd) {
                servicePriceUsd = parseFloat(endpoint.price_usd);
                console.log(`[Payment SDK] Using endpoint-specific price: $${servicePriceUsd}`);
            } else if (serviceConfig.price_usd) {
                // If service has a global USD price (we'll assume price_wei is used as USD for demo if needed, or add price_usd column)
                // Let's check for a price_wei field and assume it's in small USD units for simplicity in this demo environment
                servicePriceUsd = parseFloat(serviceConfig.price_wei) || 0.01;
            }
        }

        const feeResult = await feeEngine.calculateFee({
            servicePriceUsd: servicePriceUsd,
            marginPercent: FEE_CONFIG.GAS_MARGIN_PERCENT
        });
        requiredUnits = feeResult.totalUnits;
        res.locals.paymentAmount = requiredUnits.toString();
    } catch (e) {
        console.error("Price calculation failed", e);
        res.status(500).json({ error: "Pricing Error" });
        return;
    }

    const paymentHandlerAddress = CHAIN_CONFIG.contracts.paymentHandler;
    if (!paymentHandlerAddress) {
        console.error("PAYMENT_HANDLER_ADDRESS missing");
        res.status(500).json({ error: "Server Configuration Error" });
        return;
    }

    // 2. Define Requirements (Dynamic payTo based on provider)
    const providerAddress = res.locals.serviceConfig?.settlement_address || paymentHandlerAddress;
    console.log(`[Payment SDK] Routing payment to: ${providerAddress}`);

    // DevUSDCe Contract
    const USDC_CONTRACT = '0xc01efAaF7C5C61bEbFAeb358E1161b537b8bC0e0';

    const requirements = facilitator.generatePaymentRequirements({
        payTo: providerAddress,
        description: `Access to ${req.originalUrl} via HighStation Managed Wallet`,
        maxAmountRequired: requiredUnits.toString(),
        resource: req.originalUrl,
        asset: USDC_CONTRACT as any // Force override (or use Enum if available)
    });

    // 3. Challenge (402) if no header
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        const commonHeaders = `receiver="${providerAddress}", asset="USDC", chainId="${CHAIN_CONFIG.id}", amount="${requiredUnits.toString()}"`;
        res.status(402).set('WWW-Authenticate', `Token realm="X402", ${commonHeaders}`).json({
            error: "Payment Required",
            message: "Please provide a valid x402 payment header.",
            requirements: requirements,
            recommendation: "USE_AGENT_SDK"
        });
        return;
    }

    const paymentHeader = authHeader.split(' ')[1]; // The Base64 Header

    // 4. Verify & Settle
    try {


        console.log(`[Payment SDK] Verifying header...`);

        // Build Verify Body
        const verifyBody = facilitator.buildVerifyRequest(paymentHeader, requirements);

        // Verify
        const verification = await facilitator.verifyPayment(verifyBody);

        if (!verification.isValid) {
            throw new Error(verification.invalidReason || "Invalid Header or Conditions");
        }

        console.log(`[Payment SDK] Header Valid! Settling...`);

        // Settle (Broadcast Tx)
        const settlement = await facilitator.settlePayment(verifyBody);

        if (!settlement.txHash) {
            throw new Error("Settlement failed to return TxHash");
        }

        console.log(`[Payment SDK] Settlement Success: ${settlement.txHash}`);

        // Log to DB
        await logRequest({
            agentId: settlement.from || "anonymous",
            status: 1, // Success
            amount: requiredUnits.toString(),
            txHash: settlement.txHash,
            endpoint: req.originalUrl,
            error: undefined
        });

        res.locals.txHashVerified = true;
        next();

    } catch (error: any) {
        console.error(`[Payment SDK] Error: ${error.message}`);

        await logRequest({
            agentId: "unknown",
            status: 403,
            amount: requiredUnits.toString(),
            txHash: "failed_settlement",
            endpoint: req.originalUrl,
            error: error.message
        });

        res.status(403).json({ error: "Payment Verification Failed", details: error.message });
    }
};
