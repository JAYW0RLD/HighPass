import request from 'supertest';

describe('Security: API Authentication', () => {
    let app: any;
    let mockGetUser: jest.Mock;

    beforeAll(() => {
        process.env.NODE_ENV = 'test';
        jest.resetModules();

        mockGetUser = jest.fn();

        // Mock Supabase before importing app
        jest.doMock('@supabase/supabase-js', () => ({
            createClient: jest.fn(() => ({
                auth: {
                    getUser: mockGetUser
                }
            }))
        }));

        // Import app dynamically
        app = require('../../src/server').default;
    });

    beforeEach(() => {
        mockGetUser.mockReset();
    });

    it('should reject unauthenticated requests to /api/provider/stats', async () => {
        const res = await request(app).get('/api/provider/stats');
        expect(res.status).toBe(401);
        expect(res.body.error).toBe('Missing Authorization header');
    });

    it('should reject invalid tokens', async () => {
        mockGetUser.mockResolvedValue({ data: { user: null }, error: { message: 'Invalid token' } });

        const res = await request(app)
            .get('/api/provider/stats')
            .set('Authorization', 'Bearer invalid-token');

        expect(res.status).toBe(401);
        expect(res.body.error).toBe('Invalid or expired token');
    });

    it('should accept valid tokens', async () => {
        mockGetUser.mockResolvedValue({ data: { user: { id: 'user-123' } }, error: null });

        const res = await request(app)
            .get('/api/provider/stats')
            .set('Authorization', 'Bearer valid-token');

        // We expect 500 because DB init will fail (we only mocked AUTH part of Supabase)
        // Check server.ts/provider.ts: verify Auth runs BEFORE DB init
        // provider/stats calls initDB inside the route logic.
        // So middleware should pass, then route handler runs, then initDB fails.
        // If it got to initDB, it passed Auth.
        expect(res.status).not.toBe(401);
    });
});
