import { IdentityService } from '../../../src/services/IdentityService';

// Mock the shared viem client
const mockPublicClient = {
    readContract: jest.fn().mockResolvedValue(BigInt(85)), // Mock reputation of 85
    getTransactionReceipt: jest.fn(),
    getGasPrice: jest.fn(),
    getBlockNumber: jest.fn()
};

jest.mock('../../../src/utils/viemClient', () => ({
    publicClient: mockPublicClient
}));

// Mock other viem exports if needed
jest.mock('viem', () => ({
    ...jest.requireActual('viem'),
    verifyMessage: jest.fn().mockResolvedValue(true),
}));

describe('IdentityService', () => {
    let identityService: IdentityService;

    beforeEach(() => {
        identityService = new IdentityService();
        process.env.IDENTITY_CONTRACT_ADDRESS = '0x1234567890123456789012345678901234567890';
        process.env.RPC_URL = 'http://test-rpc.example.com';
        process.env.CHAIN_ID = '240';
        jest.clearAllMocks(); // clear mocks between tests
    });

    describe('getReputation', () => {
        it('should return reputation score as number', async () => {
            mockPublicClient.readContract.mockResolvedValue(BigInt(85));
            const reputation = await identityService.getReputation('0x1234567890123456789012345678901234567890');

            expect(typeof reputation).toBe('number');
            expect(reputation).toBeGreaterThanOrEqual(0);
            expect(reputation).toBeLessThanOrEqual(100);
            expect(mockPublicClient.readContract).toHaveBeenCalled();
        });

        it('should handle agent ID as string', async () => {
            const reputation = await identityService.getReputation('0x1234567890123456789012345678901234567890');
            expect(reputation).toBeDefined();
        });

        it('should throw error for invalid agent ID format', async () => {
            await expect(identityService.getReputation('invalid')).rejects.toThrow();
        });

        it('should throw error for empty agent ID', async () => {
            await expect(identityService.getReputation('')).rejects.toThrow();
        });
    });

    describe('isTrusted', () => {
        it('should return true for high reputation agent', async () => {
            mockPublicClient.readContract.mockResolvedValue(BigInt(85));
            const isTrusted = await identityService.isTrusted('0x1234567890123456789012345678901234567890', 70);

            expect(typeof isTrusted).toBe('boolean');
            expect(isTrusted).toBe(true);
        });

        it('should return false for low reputation agent', async () => {
            mockPublicClient.readContract.mockResolvedValue(BigInt(50));
            const isTrusted = await identityService.isTrusted('0x1234567890123456789012345678901234567890', 70);
            expect(isTrusted).toBe(false);
        });

        it('should handle threshold parameter correctly', async () => {
            mockPublicClient.readContract.mockResolvedValue(BigInt(85));
            const isTrustedAt80 = await identityService.isTrusted('0x1234567890123456789012345678901234567890', 80);
            const isTrustedAt90 = await identityService.isTrusted('0x1234567890123456789012345678901234567890', 90);

            expect(isTrustedAt80).toBe(true); // 85 >= 80
            expect(isTrustedAt90).toBe(false); // 85 < 90
        });

        it('should throw error for negative threshold', async () => {
            await expect(identityService.isTrusted('0x1234567890123456789012345678901234567890', -1)).rejects.toThrow();
        });
    });

    describe('Error handling and retries', () => {
        it('should retry on RPC failures', async () => {
            mockPublicClient.readContract
                .mockRejectedValueOnce(new Error('RPC Error'))
                .mockResolvedValueOnce(BigInt(85));

            // Should succeed after retry
            const reputation = await identityService.getReputation('0x1234567890123456789012345678901234567890');
            expect(reputation).toBe(85);
            expect(mockPublicClient.readContract).toHaveBeenCalledTimes(2);
        });
    });
});
