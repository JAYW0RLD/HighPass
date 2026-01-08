import request from 'supertest';
import express from 'express';
import { optimisticPaymentCheck } from '../../../src/middleware/optimisticPayment';
import * as db from '../../../src/database/db';

// Mock dependencies
jest.mock('../../../src/database/db');
jest.mock('../../../src/services/IdentityService');
jest.mock('../../../src/services/PriceService');
jest.mock('../../../src/services/FeeSettlementEngine');

describe('Optimistic Payment Middleware', () => {
    let app: express.Application;

    beforeEach(() => {
        app = express();

        // Middleware to simulate CreditGuard & AccessControlEngine results
        app.use((req, res, next) => {
            // Default mock values
            res.locals.creditGrade = req.header('X-Mock-Grade') || 'A';
            if (req.header('X-Mock-Track')) {
                res.locals.track = req.header('X-Mock-Track');
            }
            next();
        });

        app.get('/test', optimisticPaymentCheck, (req, res) => {
            res.status(200).json({ success: true });
        });

        // Default mocks
        (db.getDebt as jest.Mock).mockResolvedValue(BigInt(0));
        (db.addDebt as jest.Mock).mockResolvedValue(undefined);
        (db.clearDebt as jest.Mock).mockResolvedValue(undefined);

        // Mock IdentityService
        const { IdentityService } = require('../../../src/services/IdentityService');
        IdentityService.mockImplementation(() => ({
            getReputation: jest.fn().mockResolvedValue(85),
            getClient: jest.fn().mockReturnValue({
                getTransactionReceipt: jest.fn().mockResolvedValue({
                    status: 'success',
                    to: process.env.PAYMENT_HANDLER_ADDRESS,
                }),
            }),
        }));

        // Mock PriceService
        const { PriceService } = require('../../../src/services/PriceService');
        PriceService.mockImplementation(() => ({
            getPaymentAmountWei: jest.fn().mockResolvedValue(BigInt(100000000000000000)),
        }));

        // Mock FeeSettlementEngine
        const { FeeSettlementEngine } = require('../../../src/services/FeeSettlementEngine');
        FeeSettlementEngine.mockImplementation(() => ({
            calculateFee: jest.fn().mockResolvedValue({
                totalWei: BigInt(100000000000000000),
                breakdown: {}
            })
        }));
    });

    describe('Input validation', () => {
        it('should return 400 if X-Agent-ID header is missing', async () => {
            const response = await request(app).get('/test');

            expect(response.status).toBe(400);
            expect(response.body.error).toContain('Missing X-Agent-ID');
        });

        it('should return 400 for invalid agent ID format', async () => {
            const response = await request(app).get('/test').set('X-Agent-ID', '../../../etc/passwd');

            expect(response.status).toBe(400);
            expect(response.body.error).toContain('Invalid X-Agent-ID format');
        });

        it('should accept valid alphanumeric agent IDs', async () => {
            const response = await request(app)
                .get('/test')
                .set('X-Agent-ID', 'valid-agent-123');

            expect(response.status).not.toBe(400);
        });
    });

    describe('Optimistic payment logic', () => {
        it('should grant optimistic access for high reputation agent with no debt', async () => {
            const response = await request(app)
                .get('/test')
                .set('X-Agent-ID', 'high-rep-agent');

            expect(response.status).toBe(200);
            expect(db.addDebt).toHaveBeenCalled();
        });

        it('should block agent with outstanding debt', async () => {
            (db.getDebt as jest.Mock).mockResolvedValue(BigInt(50000));

            const response = await request(app)
                .get('/test')
                .set('X-Agent-ID', 'debtor-agent')
                .set('X-Mock-Grade', 'F'); // Force low threshold

            expect(response.status).toBe(402);
            expect(response.body.error).toContain('Settlement Required');
        });

        it('should require upfront payment for low reputation agent', async () => {
            const { IdentityService } = require('../../../src/services/IdentityService');
            IdentityService.mockImplementation(() => ({
                getReputation: jest.fn().mockResolvedValue(50), // Low reputation
            }));

            const response = await request(app)
                .get('/test')
                .set('X-Agent-ID', 'low-rep-agent')
                .set('X-Mock-Grade', 'F');

            expect(response.status).toBe(402);
        });

        it('should allow Track 2 (Verified) agent regardless of grade', async () => {
            // Mock low reputation (usually blocked) BUT set Track 2
            const response = await request(app)
                .get('/test')
                .set('X-Agent-ID', 'verified-agent')
                .set('X-Mock-Grade', 'F') // Should fail normally
                .set('X-Mock-Track', 'TRACK_2'); // Should pass

            expect(response.status).toBe(200);
            expect(db.addDebt).toHaveBeenCalled();
        });
    });

    describe('Payment verification', () => {
        it('should verify valid transaction hash', async () => {
            const response = await request(app)
                .get('/test')
                .set('X-Agent-ID', 'paying-agent')
                .set('Authorization', 'Token 0x' + '1'.repeat(64));

            expect(response.status).toBe(200);
        });

        it('should reject invalid transaction hash format', async () => {
            const response = await request(app)
                .get('/test')
                .set('X-Agent-ID', 'agent')
                .set('Authorization', 'Token 0xinvalid');

            expect(response.status).toBe(403);
            expect(response.body.error).toContain('Invalid payment proof format');
        });

        it('should clear debt when valid payment is provided', async () => {
            (db.getDebt as jest.Mock).mockResolvedValue(BigInt(1000000));

            const response = await request(app)
                .get('/test')
                .set('X-Agent-ID', 'agent-with-debt')
                .set('Authorization', 'Token 0x' + '1'.repeat(64));

            expect(response.status).toBe(200);
            expect(db.clearDebt).toHaveBeenCalled();
        });

        it('should reject transaction to wrong contract', async () => {
            const { IdentityService } = require('../../../src/services/IdentityService');
            IdentityService.mockImplementation(() => ({
                getClient: jest.fn().mockReturnValue({
                    getTransactionReceipt: jest.fn().mockResolvedValue({
                        status: 'success',
                        to: '0xWrongAddress',
                    }),
                }),
                getReputation: jest.fn().mockResolvedValue(85),
            }));

            const response = await request(app)
                .get('/test')
                .set('X-Agent-ID', 'agent')
                .set('Authorization', 'Token 0x' + '1'.repeat(64));

            expect(response.status).toBe(403);
        });

        it('should reject failed transaction', async () => {
            const { IdentityService } = require('../../../src/services/IdentityService');
            IdentityService.mockImplementation(() => ({
                getClient: jest.fn().mockReturnValue({
                    getTransactionReceipt: jest.fn().mockResolvedValue({
                        status: 'reverted',
                        to: process.env.PAYMENT_HANDLER_ADDRESS,
                    }),
                }),
                getReputation: jest.fn().mockResolvedValue(85),
            }));

            const response = await request(app)
                .get('/test')
                .set('X-Agent-ID', 'agent')
                .set('Authorization', 'Token 0x' + '1'.repeat(64));

            expect(response.status).toBe(403);
        });
    });

    describe('Error handling', () => {
        it('should return 500 on price oracle failure', async () => {
            const { PriceService } = require('../../../src/services/PriceService');
            PriceService.mockImplementation(() => ({
                getPaymentAmountWei: jest.fn().mockRejectedValue(new Error('Oracle error')),
            }));

            const response = await request(app)
                .get('/test')
                .set('X-Agent-ID', 'agent');

            expect(response.status).toBe(500);
            expect(response.body.error).toContain('Oracle Error');
        });

        it('should handle database errors gracefully', async () => {
            (db.addDebt as jest.Mock).mockRejectedValue(new Error('DB error'));

            const response = await request(app)
                .get('/test')
                .set('X-Agent-ID', 'agent');

            // Should handle error without crashing
            expect(response.status).toBeGreaterThanOrEqual(500);
        });
    });
});
