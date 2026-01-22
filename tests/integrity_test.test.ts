
import { describe, it, expect, jest } from '@jest/globals';
import { ProxyService } from '../src/services/ProxyService';

// Mock dependencies
jest.mock('crypto', () => ({
    createHmac: () => ({ update: () => ({ digest: () => 'signature' }) }),
    randomBytes: () => ({ toString: () => 'wax' })
}));

jest.mock('../src/lib/openseal-verifier', () => ({
    OpensealVerifier: {
        // @ts-ignore
        verify: jest.fn().mockResolvedValue({ valid: true })
    }
}));

describe('ProxyService Integrity', () => {

    it('should correctly construct target URL with clean subPath', async () => {
        const req: any = { headers: {}, originalUrl: '/gatekeeper/slug/resource/v1/api' };
        // upstream: https://api.example.com
        // subPath: v1/api

        // Mock fetch to capture URL
        const fetchSpy = jest.spyOn(global, 'fetch').mockImplementation(async (url: any) => ({
            status: 200,
            headers: { get: () => null },
            text: async () => '{}'
        } as any));

        await ProxyService.forwardRequest(req, 'https://api.example.com', 'test', 'v1/api');

        expect(fetchSpy).toHaveBeenCalledWith('https://api.example.com/v1/api', expect.anything());
    });

    it('should correctly construct target URL with subPath containing "resource"', async () => {
        // This is the regression test for the "split" bug
        const req: any = { headers: {}, originalUrl: '/gatekeeper/slug/resource/my/resource/path' };

        const fetchSpy = jest.spyOn(global, 'fetch').mockImplementation(async (url: any) => ({
            status: 200,
            headers: { get: () => null },
            text: async () => '{}'
        } as any));

        // Router captures "my/resource/path"
        await ProxyService.forwardRequest(req, 'https://api.example.com', 'test', 'my/resource/path');

        expect(fetchSpy).toHaveBeenCalledWith('https://api.example.com/my/resource/path', expect.anything());
    });

    it('should preserve query parameters', async () => {
        const req: any = { headers: {}, originalUrl: '/gatekeeper/slug/resource/search?q=hello&filter=resource' };

        const fetchSpy = jest.spyOn(global, 'fetch').mockImplementation(async (url: any) => ({
            status: 200,
            headers: { get: () => null },
            text: async () => '{}'
        } as any));

        await ProxyService.forwardRequest(req, 'https://api.example.com', 'test', 'search');

        expect(fetchSpy).toHaveBeenCalledWith('https://api.example.com/search?q=hello&filter=resource', expect.anything());
    });
});
