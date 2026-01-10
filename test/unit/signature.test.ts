import { createHmac } from 'crypto';

describe('HMAC Signature Verification', () => {
    const SECRET = 'test-secret-123';
    // Simplified verification logic based on PROVIDER_GUIDE_KR.md
    const verify = (signatureHeader: string, timestamp: string, body?: string) => {
        const payload = body ? `${timestamp}.${body}` : timestamp;
        const expected = createHmac('sha256', SECRET).update(payload).digest('hex');
        const received = signatureHeader.split('v1=')[1];
        return expected === received;
    };

    it('should verify a valid signature without body', () => {
        const timestamp = Math.floor(Date.now() / 1000).toString();
        const payload = timestamp;
        const signature = createHmac('sha256', SECRET).update(payload).digest('hex');
        const header = `t=${timestamp},v1=${signature}`;

        expect(verify(header, timestamp)).toBe(true);
    });

    it('should verify a valid signature with body', () => {
        const timestamp = Math.floor(Date.now() / 1000).toString();
        const body = JSON.stringify({ hello: 'world' });
        const payload = `${timestamp}.${body}`;
        const signature = createHmac('sha256', SECRET).update(payload).digest('hex');
        const header = `t=${timestamp},v1=${signature}`;

        expect(verify(header, timestamp, body)).toBe(true);
    });

    it('should reject invalid signature', () => {
        const timestamp = Math.floor(Date.now() / 1000).toString();
        const header = `t=${timestamp},v1=invalid_signature`;
        expect(verify(header, timestamp)).toBe(false);
    });
});
