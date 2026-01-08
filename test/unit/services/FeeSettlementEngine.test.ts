import { FeeSettlementEngine } from '../../../src/services/FeeSettlementEngine';

describe('FeeSettlementEngine', () => {
    let feeEngine: FeeSettlementEngine;

    beforeEach(() => {
        feeEngine = new FeeSettlementEngine();
    });

    it('should calculate fee with default margin', async () => {
        const result = await feeEngine.calculateFee({
            servicePriceWei: BigInt(1000000000000000000), // 1 ETH (example)
            gasEstimate: BigInt(21000)
        });

        // Gas Cost = 21000 * 10 Gwei = 210,000 * 10^9 = 2.1 * 10^14 Wei
        // Margin = 0.5% of Cost
        // Total should be Service + Gas + Margin
        
        const gasCost = BigInt(21000) * BigInt(10000000000);
        const baseCost = BigInt(1000000000000000000) + gasCost;
        const margin = BigInt(Math.floor(Number(baseCost) * 0.005));
        const expected = baseCost + margin;

        expect(result.totalWei).toBe(expected);
        expect(result.breakdown.marginWei).toBe(margin.toString());
    });
});
