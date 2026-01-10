```typescript
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
     * Formula: platformFee = estimatedGas + ((paymentAmount - estimatedGas) × marginRate)
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
            estimatedGas: bigint;
            netProfit: bigint;
            margin: bigint;
            marginRate: number;
        };
    }> {
        // Step 1: Estimate gas cost
        const estimatedGas = await this.estimateGasCost(paymentHandlerAddress, paymentAmount);

        // Step 2: Calculate NET profit (payment - gas)
        if (paymentAmount <= estimatedGas) {
            throw new Error('Payment amount too low to cover gas cost');
        }
        const netProfit = paymentAmount - estimatedGas;

        // Step 3: Calculate margin on NET profit based on grade
        const marginRate = this.getMarginRate(agentGrade);
        const margin = (netProfit * BigInt(marginRate)) / BigInt(10000);

        // Step 4: Total platform fee = gas + margin
        const platformFee = estimatedGas + margin;

        // Validation: Fee should not exceed 20% (contract safety cap)
        const maxFee = (paymentAmount * BigInt(2000)) / BigInt(10000); // 20%
        if (platformFee > maxFee) {
            console.warn(`[FeeCalculator] Calculated fee ${ platformFee } exceeds 20 % cap ${ maxFee }.Capping.`);
            return {
                platformFee: maxFee,
                breakdown: {
                    estimatedGas,
                    netProfit,
                    margin: maxFee - estimatedGas,
                    marginRate
                }
            };
        }

        return {
            platformFee,
            breakdown: {
                estimatedGas,
                netProfit,
                margin,
                marginRate
            }
        };
    }

    /**
     * Estimate gas cost for payment transaction
     */
    private async estimateGasCost(
        paymentHandlerAddress: string,
        paymentAmount: bigint
    ): Promise<bigint> {
        try {
            // Get current gas price
            const gasPrice = await this.client.getGasPrice();

            // Estimate gas units for pay() transaction
            // Typical pay() uses ~50,000-80,000 gas
            // We use 100,000 as conservative estimate
            const estimatedGasUnits = BigInt(100000);

            // Calculate gas cost in wei
            const gasCost = gasPrice * estimatedGasUnits;

            // Apply safety buffer (20% extra)
            const bufferedGasCost = (gasCost * BigInt(Math.floor(FeeCalculator.GAS_SAFETY_BUFFER * 100))) / BigInt(100);

            console.log(`[FeeCalculator] Gas estimation: `, {
                gasPrice: gasPrice.toString(),
                units: estimatedGasUnits.toString(),
                cost: gasCost.toString(),
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
    formatFeeBreakdown(breakdown: {
        estimatedGas: bigint;
        netProfit: bigint;
        margin: bigint;
        marginRate: number;
    }): {
        estimatedGas_wei: string;
        netProfit_wei: string;
        margin_wei: string;
        marginRate_bps: number;
        total_wei: string;
    } {
        return {
            estimatedGas_wei: breakdown.estimatedGas.toString(),
            netProfit_wei: breakdown.netProfit.toString(),
            margin_wei: breakdown.margin.toString(),
            marginRate_bps: breakdown.marginRate,
            total_wei: (breakdown.estimatedGas + breakdown.margin).toString()
        };
    }
}
