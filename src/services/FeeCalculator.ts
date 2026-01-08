import { createPublicClient, http, parseGwei } from 'viem';
import { cronoszkEVMTestnet } from 'viem/chains';

/**
 * FeeCalculator: Gas-Inclusive Dynamic Fee Engine
 * 
 * Mission: Guarantee platform profit regardless of gas price fluctuations
 * Formula: platformFee = estimatedGas + ((paymentAmount - estimatedGas) × marginRate)
 * 
 * Key Point: Margin is calculated on NET PROFIT (after deducting gas cost)
 */
export class FeeCalculator {
    private client;

    // Margin rates by credit grade (applied to NET profit)
    private static readonly MARGIN_RATES = {
        'A': 20,   // 0.2% (20 basis points) - Premium agents
        'B': 30,   // 0.3%
        'C': 50,   // 0.5% - Standard
        'D': 75,   // 0.75%
        'E': 100,  // 1%
        'F': 100   // 1% - Minimum grade
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
            console.warn(`[FeeCalculator] Calculated fee ${platformFee} exceeds 20% cap ${maxFee}. Capping.`);
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

            console.log(`[FeeCalculator] Gas estimation:`, {
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
     * Get margin rate by credit grade
     */
    private getMarginRate(grade: string): number {
        const normalizedGrade = grade.toUpperCase();
        return FeeCalculator.MARGIN_RATES[normalizedGrade as keyof typeof FeeCalculator.MARGIN_RATES] || 100;
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
