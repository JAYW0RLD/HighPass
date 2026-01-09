import request from 'supertest';
import { generatePrivateKey, privateKeyToAccount } from 'viem/accounts';

// Set Env vars BEFORE importing server/authMiddleware
process.env.SUPABASE_URL = 'https://mock.supabase.co';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'mock';
process.env.SUPABASE_ANON_KEY = 'mock';

const { initDB } = require('../../src/database/db');
const app = require('../../src/server').default;
const { IdentityService } = require('../../src/services/IdentityService');

// Mock IdentityService to avoid real blockchain calls for Reputation
jest.mock('../../src/services/IdentityService', () => {
    const originalModule = jest.requireActual('../../src/services/IdentityService');
    return {
        ...originalModule,
        IdentityService: jest.fn().mockImplementation(() => {
            return {
                verifySignature: originalModule.IdentityService.prototype.verifySignature,
                getCreditGrade: jest.fn().mockResolvedValue('A'),
                getReputation: jest.fn().mockResolvedValue(100),
                getClient: jest.fn()
            };
        })
    };
});

describe('Agent Payment Simulation (Integration)', () => {
    const agentPrivateKey = generatePrivateKey();
    const agentAccount = privateKeyToAccount(agentPrivateKey);
    const agentId = agentAccount.address;

    console.log(`[Test] 🤖 Spawning Virtual Agent: ${agentId}`);

    beforeAll(async () => {
        process.env.NODE_ENV = 'test';
        process.env.SUPABASE_URL = 'https://mock.supabase.co';
        process.env.SUPABASE_SERVICE_ROLE_KEY = 'mock';
        await initDB();
    });

    it('should allow an Agent to perform an Optimistic Payment (Pay Later)', async () => {
        const timestamp = Date.now().toString();
        const nonce = Math.floor(Math.random() * 1000000).toString();
        const message = `Identify as ${agentId} at ${timestamp} with nonce ${nonce}`;
        const signature = await agentAccount.signMessage({ message });

        // TARGET ECHO SERVICE (Hit ServiceResolver Fallback)
        const response = await request(app)
            .get('/gatekeeper/echo-service/resource')
            .set('x-agent-id', agentId)
            .set('x-agent-signature', signature)
            .set('x-auth-timestamp', timestamp)
            .set('x-auth-nonce', nonce);

        console.log('[Test] 📡 Response Status:', response.status);
        if (response.status !== 200) {
            console.error('[Test] ❌ Error:', response.body);
        }

        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('_gatekeeper');
        expect(response.body._gatekeeper.optimistic).toBe(true);
    });
});
