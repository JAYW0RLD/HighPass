import { Request } from 'express';
import { createHmac } from 'crypto';

export interface ProxyResult {
    status: number;
    data: any;
    telemetry: {
        latencyMs: number;
        responseSizeBytes: number;
        contentType: string;
        integrityCheck: boolean;
    };
}

export class ProxyService {
    // strict header allowlist
    private static readonly SAFE_HEADERS = new Set([
        'accept',
        'accept-encoding',
        'accept-language',
        'content-type',
        'content-length',
        'user-agent',
        'cache-control'
    ]);

    static async forwardRequest(req: Request, upstreamUrl: string, serviceName: string, signingSecret?: string): Promise<ProxyResult> {
        const forwardHeaders: Record<string, string> = {};

        // Header filtering logic
        Object.keys(req.headers).forEach(key => {
            const lowerKey = key.toLowerCase();

            // Block dangerous headers
            if (lowerKey.startsWith('x-forwarded') ||
                lowerKey.startsWith('x-real-ip') ||
                lowerKey.startsWith('x-original') ||
                lowerKey.startsWith('x-rewrite') ||
                lowerKey === 'host' ||
                lowerKey === 'connection') {
                return;
            }

            // Allow safe headers
            if (this.SAFE_HEADERS.has(lowerKey)) {
                forwardHeaders[key] = req.headers[key] as string;
            }
        });

        // Add gatekeeper metadata
        forwardHeaders['x-forwarded-by'] = 'highstation';
        forwardHeaders['x-service-name'] = serviceName;

        // V-1.8.1: HMAC Signature for Provider Verification
        const timestamp = Math.floor(Date.now() / 1000).toString();
        forwardHeaders['x-highstation-time'] = timestamp;

        let requestBody: string | undefined;
        if (['POST', 'PUT', 'PATCH'].includes(req.method)) {
            // Ensure consistent serialization for signing and sending
            requestBody = JSON.stringify(req.body);
        }

        if (signingSecret) {
            // Construct payload: timestamp.body (or just timestamp if no body)
            const payload = requestBody ? `${timestamp}.${requestBody}` : timestamp;
            const signature = createHmac('sha256', signingSecret).update(payload).digest('hex');
            forwardHeaders['x-highstation-signature'] = `t=${timestamp},v1=${signature}`;
        }

        const startTime = performance.now();

        try {
            const response = await fetch(upstreamUrl, {
                method: req.method,
                headers: forwardHeaders,
                body: requestBody
            });

            const endTime = performance.now();
            const latencyMs = Math.round(endTime - startTime);
            const contentType = response.headers.get('content-type') || 'unknown';

            // Parse response
            let data: any;
            let integrityCheck = false;

            // Try to parse JSON
            try {
                data = await response.json();
                integrityCheck = true; // Basic valid JSON check
            } catch (e) {
                // If not JSON, try text or handle error
                // For now, if upstream isn't JSON, we might treat it as opaque data or error depending on contract
                // But HighStation assumes JSON APIs typically. 
                // Let's assume text if JSON fails, but flag integrity false?
                // The original code assumed JSON.
                throw new Error('Upstream response was not valid JSON');
            }

            const responseSizeBytes = JSON.stringify(data).length;

            return {
                status: response.status,
                data: data,
                telemetry: {
                    latencyMs,
                    responseSizeBytes,
                    contentType,
                    integrityCheck
                }
            };
        } catch (error: any) {
            console.error('[ProxyService] Upstream error:', error);
            throw error;
        }
    }
}
