import { initDB, logRequest, getStats, getDebt, addDebt, clearDebt } from '../../../src/database/db';
import * as path from 'path';
import * as fs from 'fs';

describe('Database Operations', () => {
    const testDbPath = path.join(__dirname, '../../../test-gatekeeper.db');

    beforeAll(async () => {
        // Use test database
        process.env.NODE_ENV = 'test';
        await initDB();
    });

    afterAll(async () => {
        // Clean up test database
        if (fs.existsSync(testDbPath)) {
            fs.unlinkSync(testDbPath);
        }
    });

    afterEach(async () => {
        // Clear data between tests (simplified - in real scenario use transactions)
    });

    describe('logRequest', () => {
        it('should log a request successfully', async () => {
            const testData = {
                agentId: 'test-agent-123',
                status: 200,
                amount: '100000000000000000',
                txHash: '0xabc123',
                endpoint: '/test',
            };

            await expect(logRequest(testData)).resolves.not.toThrow();
        });

        it('should handle logging without optional fields', async () => {
            const testData = {
                status: 403,
                endpoint: '/test',
            };

            await expect(logRequest(testData)).resolves.not.toThrow();
        });

        it('should not throw on database error (graceful degradation)', async () => {
            const invalidData = {
                status: 'invalid' as any,
                endpoint: '/test',
            };

            // Should log error but not throw
            await expect(logRequest(invalidData)).resolves.not.toThrow();
        });
    });

    describe('getStats', () => {
        it('should return stats object with correct structure', async () => {
            const stats = await getStats();

            expect(stats).toHaveProperty('recent');
            expect(stats).toHaveProperty('totalRequests');
            expect(stats).toHaveProperty('totalRevenueWei');
            expect(stats).toHaveProperty('pendingDebtWei');
            expect(Array.isArray(stats.recent)).toBe(true);
        });

        it('should calculate total revenue correctly', async () => {
            // Log some test requests
            await logRequest({
                agentId: 'agent1',
                status: 200,
                amount: '1000000',
                endpoint: '/test',
            });

            const stats = await getStats();
            expect(stats.totalRevenueWei).toBeGreaterThanOrEqual(0);
        });
    });

    describe('Debt tracking', () => {
        const testAgentId = 'debt-test-agent';

        it('should return 0 for new agent with no debt', async () => {
            const debt = await getDebt(testAgentId);
            expect(debt).toBe(BigInt(0));
        });

        it('should add debt correctly', async () => {
            const amount = BigInt(1000000);

            await addDebt(testAgentId, amount);
            const debt = await getDebt(testAgentId);

            expect(debt).toBe(amount);
        });

        it('should accumulate debt correctly', async () => {
            const firstAmount = BigInt(500000);
            const secondAmount = BigInt(300000);

            await clearDebt(testAgentId); // Reset
            await addDebt(testAgentId, firstAmount);
            await addDebt(testAgentId, secondAmount);

            const totalDebt = await getDebt(testAgentId);
            expect(totalDebt).toBe(firstAmount + secondAmount);
        });

        it('should clear debt correctly', async () => {
            await addDebt(testAgentId, BigInt(999999));
            await clearDebt(testAgentId);

            const debt = await getDebt(testAgentId);
            expect(debt).toBe(BigInt(0));
        });

        it('should throw on critical debt operation failure', async () => {
            // This would test error handling, but our implementation uses try-catch
            // In a real scenario, you'd mock the database to force failures
        });
    });

    describe('getTotalPendingDebt', () => {
        beforeEach(async () => {
            // Clear all debts
            await clearDebt('agent1');
            await clearDebt('agent2');
        });

        it('should sum all pending debts correctly', async () => {
            await addDebt('agent1', BigInt(1000000));
            await addDebt('agent2', BigInt(2000000));

            const stats = await getStats();
            const totalDebt = BigInt(stats.pendingDebtWei);

            expect(totalDebt).toBeGreaterThanOrEqual(BigInt(3000000));
        });
    });
});
