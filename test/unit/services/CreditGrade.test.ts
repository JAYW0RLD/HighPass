import { IdentityService } from '../../../src/services/IdentityService';

const mockReadContract = jest.fn();

// Mock viem
jest.mock('viem', () => ({
    createPublicClient: jest.fn(() => ({
        readContract: mockReadContract,
    })),
    http: jest.fn(),
    defineChain: jest.fn((config: any) => config),
    parseAbi: jest.fn((abi: any) => abi),
}));

describe('IdentityService - getCreditGrade', () => {
    let identityService: IdentityService;

    beforeEach(() => {
        identityService = new IdentityService();
        mockReadContract.mockClear();
        process.env.IDENTITY_CONTRACT_ADDRESS = '0x1234567890123456789012345678901234567890';
    });

    const testGrade = async (score: number, expectedGrade: string) => {
        mockReadContract.mockResolvedValueOnce(BigInt(score));
        const grade = await identityService.getCreditGrade('123');
        expect(grade).toBe(expectedGrade);
    };

    it('should return Grade A for score 90-100', async () => {
        await testGrade(100, 'A');
        await testGrade(95, 'A');
        await testGrade(90, 'A');
    });

    it('should return Grade B for score 80-89', async () => {
        await testGrade(89, 'B');
        await testGrade(85, 'B');
        await testGrade(80, 'B');
    });

    it('should return Grade C for score 70-79', async () => {
        await testGrade(79, 'C');
        await testGrade(75, 'C');
        await testGrade(70, 'C');
    });

    it('should return Grade D for score 60-69', async () => {
        await testGrade(69, 'D');
        await testGrade(65, 'D');
        await testGrade(60, 'D');
    });

    it('should return Grade E for score 50-59', async () => {
        await testGrade(59, 'E');
        await testGrade(55, 'E');
        await testGrade(50, 'E');
    });

    it('should return Grade F for score below 50', async () => {
        await testGrade(49, 'F');
        await testGrade(25, 'F');
        await testGrade(0, 'F');
    });
});
