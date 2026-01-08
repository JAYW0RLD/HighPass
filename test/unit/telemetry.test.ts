import { loggerMiddleware } from '../../src/middleware/logger';
import { logRequest } from '../../src/database/db';
import { Request, Response } from 'express';

// Mock database module
jest.mock('../../src/database/db', () => ({
    logRequest: jest.fn().mockResolvedValue(true)
}));

describe('Telemetry Middleware Integration', () => {
    let mockReq: Partial<Request>;
    let mockRes: Partial<Response>;
    let nextFunction: jest.Mock;

    beforeEach(() => {
        jest.clearAllMocks();
        mockReq = {
            originalUrl: '/test/endpoint',
            headers: { 'x-agent-id': 'test-agent' }
        };
        mockRes = {
            statusCode: 200,
            on: jest.fn(),
            locals: {
                paymentAmount: '100',
                creditGrade: 'A',
                telemetry: {
                    latencyMs: 150,
                    responseSizeBytes: 500,
                    gasUsed: '21000',
                    contentType: 'application/json',
                    integrityCheck: true
                }
            }
        };
        nextFunction = jest.fn();
    });

    it('should pass telemetry data to logRequest', (done) => {
        // Mock res.on implementation to trigger callback immediately
        (mockRes.on as jest.Mock).mockImplementation((event, callback) => {
            if (event === 'finish') {
                callback();
            }
            return mockRes;
        });

        loggerMiddleware(mockReq as Request, mockRes as Response, nextFunction);

        // Expect next() to be called
        expect(nextFunction).toHaveBeenCalled();

        // Expect logRequest to be called with telemetry data
        expect(logRequest).toHaveBeenCalledWith(expect.objectContaining({
            endpoint: '/test/endpoint',
            status: 200,
            agentId: 'test-agent',
            latencyMs: 150,
            responseSizeBytes: 500,
            gasUsed: '21000',
            contentType: 'application/json',
            integrityCheck: true
        }));

        done();
    });

    it('should handle missing telemetry gracefully', (done) => {
        // Clear telemetry
        mockRes.locals!.telemetry = undefined;

        (mockRes.on as jest.Mock).mockImplementation((event, callback) => {
            if (event === 'finish') {
                callback();
            }
            return mockRes;
        });

        loggerMiddleware(mockReq as Request, mockRes as Response, nextFunction);

        expect(logRequest).toHaveBeenCalledWith(expect.objectContaining({
            latencyMs: undefined,
            responseSizeBytes: undefined
        }));
        done();
    });
});
