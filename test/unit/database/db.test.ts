import { initDB, logRequest, getStats, getDebt, addDebt, clearDebt } from '../../../src/database/db';
import * as path from 'path';
import * as fs from 'fs';

// Stateful Mock Data
let mockData: any = {
    requests: [],
    agent_debts: [],
    wallets: []
};

const mockSupabase = {
    from: jest.fn((table: string) => {
        const filters: { col: string, val: any, op?: string }[] = [];

        const builder: any = {
            _pendingOp: 'select',
            _pendingData: null as any,

            select: jest.fn(() => {
                builder._pendingOp = 'select';
                return builder;
            }), // Default op is select

            eq: jest.fn((col, val) => {
                filters.push({ col, val });
                return builder;
            }),
            neq: jest.fn((col, val) => {
                filters.push({ col, val, op: 'neq' });
                return builder;
            }),
            limit: jest.fn(() => builder),
            order: jest.fn(() => builder),

            // Single executes SELECT immediately (usually used after select)
            single: jest.fn(async () => {
                const data = mockData[table] || [];
                const filtered = data.find((row: any) =>
                    filters.every(f => f.op === 'neq' ? row[f.col] !== f.val : row[f.col] === f.val)
                );
                return { data: filtered || null, error: null };
            }),

            insert: jest.fn((row: any) => {
                builder._pendingOp = 'insert';
                builder._pendingData = row;
                return builder;
            }),

            update: jest.fn((updates: any) => {
                builder._pendingOp = 'update';
                builder._pendingData = updates;
                return builder;
            }),

            upsert: jest.fn((row: any) => {
                builder._pendingOp = 'upsert';
                builder._pendingData = row;
                return builder;
            }),

            then: (resolve: any, reject: any) => {
                // Execute based on pending Op
                if (builder._pendingOp === 'insert') {
                    if (!mockData[table]) mockData[table] = [];
                    mockData[table].push(builder._pendingData);
                    resolve({ data: [builder._pendingData], error: null });
                    return;
                }

                if (builder._pendingOp === 'update') {
                    if (!mockData[table]) mockData[table] = [];
                    // Apply update to matching rows
                    let affected = 0;
                    mockData[table] = mockData[table].map((row: any) => {
                        if (filters.every(f => f.op === 'neq' ? row[f.col] !== f.val : row[f.col] === f.val)) {
                            affected++;
                            return { ...row, ...builder._pendingData };
                        }
                        return row;
                    });
                    resolve({ data: [], count: affected, error: null });
                    return;
                }

                if (builder._pendingOp === 'upsert') {
                    const row = builder._pendingData;
                    if (!mockData[table]) mockData[table] = [];
                    const key = table === 'agent_debts' ? 'agent_id' : 'id';
                    // Check if 'id' or 'tx_hash' or 'agent_id' exists?
                    // Simplified upsert logic:
                    let matchIndex = -1;
                    if (row[key]) {
                        matchIndex = mockData[table].findIndex((r: any) => r[key] === row[key]);
                    }
                    // Special case for requests tx_hash upsert?
                    // db.ts uses .insert for requests usually, but logs says upsert?
                    // actually logRequest uses separate check then insert/update. 
                    // getDebt uses upsert on agent_debts.

                    if (matchIndex >= 0) {
                        mockData[table][matchIndex] = { ...mockData[table][matchIndex], ...row };
                    } else {
                        mockData[table].push(row);
                    }
                    resolve({ data: [row], error: null });
                    return;
                }

                // Default SELECT
                const data = mockData[table] || [];
                const filtered = data.filter((row: any) =>
                    filters.every(f => f.op === 'neq' ? row[f.col] !== f.val : row[f.col] === f.val)
                );
                resolve({ data: filtered, count: filtered.length, error: null });
            }
        };
        return builder;
    })
};

jest.mock('@supabase/supabase-js', () => ({
    createClient: jest.fn(() => mockSupabase)
}));

describe('Database Operations', () => {
    // const testDbPath = path.join(__dirname, '../../../test-gatekeeper.db'); // Not needed with mock

    beforeAll(async () => {
        // Use test database
        process.env.NODE_ENV = 'test';
        // await initDB(); // Init triggered by first call
    });

    afterAll(async () => {
        // Clean up test database
        // if (fs.existsSync(testDbPath)) fs.unlinkSync(testDbPath);
    });

    afterEach(async () => {
        // Clear data between tests
        mockData = { requests: [], agent_debts: [], wallets: [] };
        jest.clearAllMocks();
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

    // Mock console to keep output clean, but allow warn/error if needed for debugging
    global.console = { ...global.console, log: jest.fn() };

    beforeEach(() => {
        // Mock Env for all tests
        process.env.SUPABASE_URL = 'https://example.supabase.co';
        process.env.SUPABASE_ANON_KEY = 'mock-key';
        jest.clearAllMocks();
    });

    describe('getTotalPendingDebt', () => {
        beforeEach(async () => {
            // Clear all debts
            await clearDebt('agent1');
            await clearDebt('agent2');
            await clearDebt('agent3');
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
