import { PriceService } from './PriceService';
import { getDebt } from '../database/db';

export class FeeSettlementEngine {
    private priceService: PriceService;

    constructor() {
        this.priceService = new PriceService();
    }

    /**
     * Calculate Dynamic Fee
     * Formula: (Gas Estimate * Gas Price) + Margin
     * 
     * @param options Configuration for margin and slippage
     * @returns Fee in WEI (BigInt)
     */
    async calculateFee(options: {
        servicePriceWei?: bigint, // Base price of the service
        gasEstimate?: bigint,
        marginPercent?: number // e.g. 0.005 for 0.5%
    } = {}): Promise<{ totalWei: bigint, breakdown: any }> {
        const {
            servicePriceWei = BigInt(0),
            gasEstimate = BigInt(21000), // Standard Transfer
            marginPercent = 0.005 // Default 0.5%
        } = options;

        // Fetch current Gas Price (Mock or Real)
        // In production, use provider.getGasPrice()
        const gasPrice = BigInt(10000000000); // 10 Gwei fixed for now
        const gasCostWei = gasEstimate * gasPrice;

        // Calculate Margin
        // Margin on (Service Price + Gas Cost) to ensure profitability?
        // Or just on Service Price?
        // Prompt says "Dynamic Fee: Gas Fee ... + Margin".
        // Let's apply margin to the whole cost to cover volatility.
        const baseCost = servicePriceWei + gasCostWei;
        const marginWei = BigInt(Math.floor(Number(baseCost) * marginPercent));

        // Slippage Buffer (2%) - Applied via PriceService usually, but if staying in Native Token (WEI),
        // we might not need "Exchange Rate" slippage unless quoting in USD.
        // However, if we demand payment in CRO for a USD-priced service,
        // the conversion happens BEFORE this function usually (usdToWei).
        // Let's assume input `servicePriceWei` already includes conversion slippage if it came from USD.
        // If it's fixed Wei price, we just add margin.

        const totalWei = baseCost + marginWei;

        return {
            totalWei,
            breakdown: {
                servicePriceWei: servicePriceWei.toString(),
                gasCostWei: gasCostWei.toString(),
                marginWei: marginWei.toString(),
                gasEstimate: gasEstimate.toString(),
                gasPrice: gasPrice.toString()
            }
        };
    }

    /**
     * Convert USD Debt Limit to WEI based on current Oracle Price
     * @param usdAmount 
     */
    async usdToWei(usdAmount: number): Promise<bigint> {
        // Slippage Protection: Oracle Price - 2% Buffer?
        // "Slippage Protection: 오라클 가격 대비 2%의 슬리피지 버퍼를 두어 결제 금액 산정."
        // Meaning if Oracle says 1 CRO = $0.10, we behave as if it's $0.098 (safer for receiver).
        // tokensNeeded = USD / (Price * 0.98)

        const priceUsd = await this.priceService.getPrice('CRO');
        const buffer = 0.98; // 2% slippage protection (Lower price = more tokens required)

        const effectivePrice = priceUsd * buffer;
        const tokensNeeded = usdAmount / effectivePrice;

        return BigInt(Math.floor(tokensNeeded * 1e18));
    }
}
