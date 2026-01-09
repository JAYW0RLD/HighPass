import { IdentityService } from '../../../src/services/IdentityService';

// Mock viem
jest.mock('viem', () => ({
    createPublicClient: jest.fn(() => ({
        readContract: jest.fn().mockResolvedValue(BigInt(85)), // Mock reputation of 85
    })),
    http: jest.fn(),
    defineChain: jest.fn((config: any) => config),
    parseAbi: jest.fn(),
    verifyMessage: jest.fn().mockResolvedValue(true),
}));

describe('IdentityService', () => {
    let identityService: IdentityService;

    beforeEach(() => {
        identityService = new IdentityService();
        process.env.IDENTITY_CONTRACT_ADDRESS = '0x1234567890123456789012345678901234567890';
        process.env.RPC_URL = 'http://test-rpc.example.com';
        process.env.CHAIN_ID = '240';
    });

    describe('getReputation', () => {
        it('should return reputation score as number', async () => {
            const reputation = await identityService.getReputation('0x1234567890123456789012345678901234567890');

            expect(typeof reputation).toBe('number');
            expect(reputation).toBeGreaterThanOrEqual(0);
            expect(reputation).toBeLessThanOrEqual(100);
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
            const isTrusted = await identityService.isTrusted('0x1234567890123456789012345678901234567890', 70);

            expect(typeof isTrusted).toBe('boolean');
            expect(isTrusted).toBe(true); // Mock returns 85
        });

        it('should return false for low reputation agent', async () => {
            // Mock low reputation
            const viem = require('viem');
            viem.createPublicClient.mockReturnValueOnce({
                readContract: jest.fn().mockResolvedValue(BigInt(50)),
            });

            const service = new IdentityService();
            const isTrusted = await service.isTrusted('0x1234567890123456789012345678901234567890', 70);

            expect(isTrusted).toBe(false);
        });

        it('should handle threshold parameter correctly', async () => {
            const isTrustedAt80 = await identityService.isTrusted('0x1234567890123456789012345678901234567890', 80);
            const isTrustedAt90 = await identityService.isTrusted('0x1234567890123456789012345678901234567890', 90);

            expect(isTrustedAt80).toBe(true); // 85 >= 80
            expect(isTrustedAt90).toBe(false); // 85 < 90
        });

        it('should throw error for negative threshold', async () => {
            await expect(identityService.isTrusted('0x1234567890123456789012345678901234567890', -1)).rejects.toThrow();
        });

        it('should use default threshold if not provided', async () => {
            const isTrusted = await identityService.isTrusted('0x1234567890123456789012345678901234567890', 80);

            expect(typeof isTrusted).toBe('boolean');
        });
    });

    describe('Error handling and retries', () => {
        it('should retry on RPC failures', async () => {
            const viem = require('viem');
            const mockReadContract = jest
                .fn()
                .mockRejectedValueOnce(new Error('RPC Error'))
                .mockResolvedValueOnce(BigInt(85));

            viem.createPublicClient.mockReturnValueOnce({
                readContract: mockReadContract,
            });

            const service = new IdentityService();

            // Should succeed after retry
            const reputation = await service.getReputation('0x1234567890123456789012345678901234567890');
            expect(reputation).toBe(85);
            expect(mockReadContract).toHaveBeenCalledTimes(2);
        });
    });

    describe('getClient', () => {
        it('should create client with correct configuration', () => {
            const client = identityService.getClient();

            expect(client).toBeDefined();
        });

        it('should use environment variables for configuration', () => {
            process.env.RPC_URL = 'http://custom-rpc.com';
            process.env.CHAIN_ID = '999';

            const service = new IdentityService();
            const client = service.getClient();

            expect(client).toBeDefined();
        });
    });
});
