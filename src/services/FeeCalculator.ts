import { createPublicClient, http, parseGwei } from 'viem';
import { cronoszkEVMTestnet } from 'viem/chains';
import { GRADE_BASED_FEES, type Grade } from '../config/reputation';

/**
 * FeeCalculator: Gas-Inclusive Dynamic Fee Engine
 * 
 * Mission: Guarantee platform profit regardless of gas price fluctuations
 * Formula: platformFee = estimatedGas + ((paymentAmount - estimatedGas) × feeRate)
 * 
 * v1.6.1: Uses GRADE_BASED_FEES for differential pricing
 */
export class FeeCalculator {
    private client;

    // v1.6.1: Fee rates now come from config/reputation.ts
    // A: 2%, B: 3%, C: 4%, D: 5%, E: 6%, F: 8%
    private static readonly MARGIN_RATES = {
        'A': 200,   // 2% (200 basis points) - VIP agents
        'B': 300,   // 3%
        'C': 400,   // 4%
        'D': 500,   // 5% - Standard
        'E': 600,   // 6%
        'F': 800    // 8% - Highest
    };

    // Safety margin multiplier for gas estimation (prevents underestimation)
    private static readonly GAS_SAFETY_BUFFER = 1.2; // 20% buffer

    constructor() {
        const rpcUrl = process.env.RPC_URL || 'https://testnet.zkevm.cronos.org';
        this.client = createPublicClient({
            chain: cronoszkEVMTestnet,
            transport: http(rpcUrl)
        });
    }

    /**
     * Calculate platform fee with gas cost consideration
     * Formula: platformFee = estimatedGas + ((paymentAmount - estimatedGas) × feeRate)
     * 
     * @param paymentAmount Total payment in wei
     * @param agentGrade  Credit grade (A-F)
     * @param paymentHandlerAddress Contract address for gas estimation
     * @returns Platform fee in wei (gas + margin on NET profit)
     */
    async calculatePlatformFee(
        paymentAmount: bigint,
        agentGrade: string = 'F',
        paymentHandlerAddress: string
    ): Promise<{
        platformFee: bigint;
        breakdown: {
            paymentAmount: string;
            estimatedGas: string;
            netProfit: string;
            marginRate: number;
            marginWei: string;
        };
    }> {
        // Step 1: Estimate gas cost
        const estimatedGas = await this.estimateGasCost(paymentHandlerAddress);

        // Step 2: Calculate NET profit (Payment - Gas)
        const netProfit = paymentAmount - estimatedGas;

        if (netProfit <= BigInt(0)) {
            console.warn('[FeeCalculator] Payment amount does not cover gas. Using minimum fee.');
            return {
                platformFee: estimatedGas,
                breakdown: {
                    paymentAmount: paymentAmount.toString(),
                    estimatedGas: estimatedGas.toString(),
                    netProfit: '0',
                    marginRate: 0,
                    marginWei: '0'
                }
            };
        }

        // Step 3: Get margin rate for this grade (in basis points)
        const marginRateBp = this.getMarginRateBasisPoints(agentGrade);

        // Step 4: Calculate margin on NET profit
        const marginWei = (netProfit * BigInt(marginRateBp)) / BigInt(10000);

        // Step 5: Platform fee = Gas + Margin
        let platformFee = estimatedGas + marginWei;

        // SAFETY: Cap at 20% of total payment (prevents abuse)
        const maxFee = (paymentAmount * BigInt(2000)) / BigInt(10000); // 20%
        if (platformFee > maxFee) {
            console.warn(`[FeeCalculator] Calculated fee exceeds 20% cap. Capping.`);
            return {
                platformFee: maxFee,
                breakdown: {
                    paymentAmount: paymentAmount.toString(),
                    estimatedGas: estimatedGas.toString(),
                    netProfit: netProfit.toString(),
                    marginRate: marginRateBp,
                    marginWei: (maxFee - estimatedGas).toString()
                }
            };
        }

        return {
            platformFee,
            breakdown: {
                paymentAmount: paymentAmount.toString(),
                estimatedGas: estimatedGas.toString(),
                netProfit: netProfit.toString(),
                marginRate: marginRateBp,
                marginWei: marginWei.toString()
            }
        };
    }

    /**
     * Estimate gas cost for PaymentHandler transaction
     */
    private async estimateGasCost(paymentHandlerAddress: string): Promise<bigint> {
        try {
            const gasPrice = await this.client.getGasPrice();
            const gasUnits = BigInt(100000); // Conservative estimate for processPayment()

            const gasCost = gasPrice * gasUnits;
            const bufferedGasCost = (gasCost * BigInt(Math.floor(FeeCalculator.GAS_SAFETY_BUFFER * 100))) / BigInt(100);

            console.log(`[FeeCalculator] Gas estimation:`, {
                gasPrice: gasPrice.toString(),
                gasUnits: gasUnits.toString(),
                gasCost: gasCost.toString(),
                buffered: bufferedGasCost.toString()
            });

            return bufferedGasCost;
        } catch (error) {
            console.error('[FeeCalculator] Gas estimation failed:', error);
            // Fallback: Use conservative default (0.001 CRO = 1e15 wei)
            return BigInt('1000000000000000');
        }
    }

    /**
     * Get margin rate in basis points (1 basis point = 0.01%)
     * v1.6.1: Now uses GRADE_BASED_FEES from config
     * 
     * @param grade Credit grade (A-F)
     * @returns Margin rate in basis points
     */
    private getMarginRateBasisPoints(grade: string): number {
        const normalizedGrade = grade.toUpperCase();

        // v1.6.1: Use GRADE_BASED_FEES from config
        // Convert percentage to basis points (e.g., 0.02 = 2% = 200 bp)
        if (normalizedGrade in GRADE_BASED_FEES) {
            const feePercentage = GRADE_BASED_FEES[normalizedGrade as Grade];
            return Math.floor(feePercentage * 10000); // 0.02 * 10000 = 200 bp
        }

        // Fallback to hardcoded for backward compatibility
        return FeeCalculator.MARGIN_RATES[normalizedGrade as keyof typeof FeeCalculator.MARGIN_RATES] || 800;
    }

    /**
     * Format fee breakdown for HTTP 402 response
     */
    formatFeeResponse(platformFee: bigint, breakdown: any): string {
        return JSON.stringify({
            platformFee: platformFee.toString(),
            breakdown
        });
    }
}
