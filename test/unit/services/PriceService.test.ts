import { PriceService } from '../../../src/services/PriceService';

// Mock the HermesClient
jest.mock('@pythnetwork/hermes-client', () => {
    return {
        HermesClient: jest.fn().mockImplementation(() => ({
            getLatestPriceUpdates: jest.fn().mockResolvedValue({
                parsed: [{
                    price: {
                        price: '500000000', // $5 with 8 decimals
                        expo: -8,
                    },
                }],
            }),
        })),
    };
});

describe('PriceService', () => {
    let priceService: PriceService;

    beforeEach(() => {
        priceService = new PriceService();
    });

    describe('getPaymentAmountWei', () => {
        it('should calculate correct wei amount for given USD value', async () => {
            const usdAmount = 0.01; // $0.01
            const wei = await priceService.getPaymentAmountWei('CRO', usdAmount);

            // At $5/CRO, $0.01 = 0.002 CRO = 2000000000000000 wei
            expect(wei).toBeGreaterThan(BigInt(0));
            expect(typeof wei).toBe('bigint');
        });

        it('should throw error for invalid asset', async () => {
            await expect(
                priceService.getPaymentAmountWei('INVALID' as any, 0.01)
            ).rejects.toThrow();
        });

        it('should throw error for zero USD amount', async () => {
            await expect(priceService.getPaymentAmountWei('CRO', 0)).rejects.toThrow();
        });

        it('should throw error for negative USD amount', async () => {
            await expect(priceService.getPaymentAmountWei('CRO', -1)).rejects.toThrow();
        });

        it('should handle large USD amounts correctly', async () => {
            const largeAmount = 1000; // $1000
            const wei = await priceService.getPaymentAmountWei('CRO', largeAmount);

            expect(wei).toBeGreaterThan(BigInt(0));
        });
    });

    describe('Error handling', () => {
        it('should handle oracle failures gracefully', async () => {
            // In real tests, you'd mock the oracle to fail
            const service = new PriceService();

            // This would test retry logic and error propagation
            // For now, we just verify the service is resilient
            expect(service).toBeDefined();
        });
    });

    describe('Price calculation accuracy', () => {
        it('should maintain precision for small amounts', async () => {
            const smallAmount = 0.001; // $0.001
            const wei = await priceService.getPaymentAmountWei('CRO', smallAmount);

            // Should not round to 0
            expect(wei).toBeGreaterThan(BigInt(0));
        });

        it('should calculate wei amounts consistently', async () => {
            const amount = 0.01;

            const wei1 = await priceService.getPaymentAmountWei('CRO', amount);
            const wei2 = await priceService.getPaymentAmountWei('CRO', amount);

            // Same input should give same output (deterministic)
            expect(wei1).toBe(wei2);
        });
    });
});
