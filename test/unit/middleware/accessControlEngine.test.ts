import request from 'supertest';
import express from 'express';
import { accessControlEngine } from '../../../src/middleware/AccessControlEngine';
import * as db from '../../../src/database/db';

// Mock dependencies
const mockUsdToWei = jest.fn();
jest.mock('../../../src/services/FeeSettlementEngine', () => {
    return {
        FeeSettlementEngine: jest.fn().mockImplementation(() => {
            return {
                usdToWei: mockUsdToWei
            };
        })
    };
});
jest.mock('../../../src/database/db');

describe('AccessControlEngine Middleware', () => {
    let app: express.Application;
    let mockSupabase: any;

    beforeEach(() => {
        app = express();
        // Middleware chain
        app.use((req, res, next) => {
            // Mock previous middleware setting agentId
            if (req.headers['x-agent-id']) {
                // emulate creditGuard
                // res.locals.agentId is not set by creditGuard in our current mock flow unless we add middleware
                // AccessControlEngine checks res.locals.agentId OR headers['x-agent-id']
            }
            next();
        });

        app.get('/test', accessControlEngine, (req, res) => {
            res.status(200).json({
                track: res.locals.track,
                isVerified: res.locals.isVerified,
                reason: res.locals.reason
            });
        });

        // Mock Supabase Client
        mockSupabase = {
            from: jest.fn().mockReturnThis(),
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            single: jest.fn()
        };
        (db.initDB as jest.Mock).mockResolvedValue(mockSupabase);

        // Default mock for usdToWei: 1 USD = 1000 Wei for simple testing.
        mockUsdToWei.mockImplementation((usd: number) => {
            return BigInt(Math.floor(usd * 1000));
        });
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('Track Logic', () => {
        it('should assign Track 1 if no Agent ID is provided', async () => {
            const response = await request(app).get('/test');
            expect(response.body.track).toBe('TRACK_1');
            expect(response.body.isVerified).toBe(false);
        });

        it('should assign Track 1 if wallet is not found in DB', async () => {
            mockSupabase.single.mockResolvedValue({ data: null, error: { message: 'Not found' } });

            const response = await request(app).get('/test').set('X-Agent-ID', 'unknown-agent');

            expect(response.body.track).toBe('TRACK_1');
            expect(response.body.isVerified).toBe(false);
            expect(mockSupabase.from).toHaveBeenCalledWith('wallets');
        });

        it('should assign Track 1 if wallet exists but has no developer profile', async () => {
            mockSupabase.single.mockResolvedValue({
                data: {
                    status: 'Active',
                    current_debt: 0,
                    developers: null
                },
                error: null
            });

            const response = await request(app).get('/test').set('X-Agent-ID', 'wallet-no-dev');

            expect(response.body.track).toBe('TRACK_1');
            expect(mockSupabase.from).toHaveBeenCalledWith('wallets');
        });

        it('should downgrade to Track 1 if Verified but Debt Limit exceeded', async () => {
            // Mock request and response objects for direct middleware testing
            const req: any = { headers: {} };
            const res: any = { locals: {} };
            const next = jest.fn();

            req.headers['x-agent-id'] = '0x123';

            // limit = 0.1 USD. Mock usdToWei(0.1) -> 100 Wei.
            // current_debt = 150 Wei. => Exceeded.

            mockSupabase.single.mockResolvedValue({
                data: {
                    status: 'Active',
                    current_debt: 150,
                    developers: {
                        id: 'dev-123',
                        global_debt_limit: 0.1,
                        total_reputation: 'Grade B'
                    }
                },
                error: null
            });

            await accessControlEngine(req, res, next);

            expect(res.locals.track).toBe('TRACK_1');
            expect(res.locals.isVerified).toBe(true);
            expect(res.locals.reason).toBe('DEBT_LIMIT_EXCEEDED');
            expect(next).toHaveBeenCalled();
            expect(res.locals.developerId).toBeUndefined(); // Should not set dev ID if downgraded? ACTUALLY existing code logic:
            // Existing logic: if (overLimit) { track=1; isVerified=true; reason=... } else { track=2 ... devId=... }
            // So devId is NOT set if downgraded. Correct.
        });

        it('should assign Track 2 if verified and under debt limit', async () => {
            mockSupabase.single.mockResolvedValue({
                data: {
                    status: 'Active',
                    current_debt: 0,
                    developers: { id: 'dev-1', global_debt_limit: 0.1, total_reputation: 'Grade A' }
                },
                error: null
            });

            const response = await request(app).get('/test').set('X-Agent-ID', 'verified-agent');

            expect(response.body.track).toBe('TRACK_2');
            expect(response.body.isVerified).toBe(true);
        });

        it('should assign Track 1 if verified but over debt limit', async () => {
            mockSupabase.single.mockResolvedValue({
                data: {
                    status: 'Active',
                    current_debt: 200, // 200 Wei > 100 Wei (which is 0.1 USD mock)
                    developers: { id: 'dev-1', global_debt_limit: 0.1, total_reputation: 'Grade A' }
                },
                error: null
            });

            const response = await request(app).get('/test').set('X-Agent-ID', 'over-limit-agent');

            expect(response.body.track).toBe('TRACK_1');
            expect(response.body.reason).toBe('DEBT_LIMIT_EXCEEDED');
        });
    });
});
