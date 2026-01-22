import { createHmac, randomBytes } from 'crypto';
import { applyPerformancePenalty } from '../database/reputation';
import { OpensealVerifier } from '../lib/openseal-verifier';


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

    static async forwardRequest(req: Request, upstreamUrl: string, serviceName: string, subPath: string, signingSecret?: string, opensealRootHash?: string): Promise<ProxyResult> {
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
                forwardHeaders[key] = (req.headers as unknown as Record<string, string | string[] | undefined>)[key] as string;
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

        // [OpenSeal] V-2.0.0 Integrity Challenge
        let wax: string | undefined;
        if (opensealRootHash) {
            wax = randomBytes(16).toString('hex');
            forwardHeaders['X-OpenSeal-Wax'] = wax;
        }

        const startTime = performance.now();

        // [FIX] Use explicit subPath passed from router
        // Append query string if present in original request
        const queryString = (req as any).originalUrl.split('?')[1];
        let finalPath = subPath;
        if (queryString) {
            finalPath += `?${queryString}`;
        }

        // Ensure upstreamUrl doesn't end with slash if subPath starts with one (or handle gracefully)
        // Standardize: upstreamUrl should not end with /, subPath should start with /
        const baseUrl = upstreamUrl.replace(/\/$/, '');
        const relativePath = finalPath.startsWith('/') ? finalPath : `/${finalPath}`;

        const targetUrl = `${baseUrl}${relativePath}`;

        try {
            console.log(`[Proxy] Forwarding to: ${targetUrl} (${req.method})`);
            const response = await fetch(targetUrl, {
                method: req.method,
                headers: forwardHeaders,
                body: requestBody
            });

            const responseText = await response.text();
            let data: any;
            let integrityCheck = false;

            // [OpenSeal] V-2.0.0 Verification Strategy
            let openSealVerified = false;
            let openSealMessage = '';

            // Try to parse JSON first to check for Body Wrapper
            try {
                const parsedBody = JSON.parse(responseText);
                integrityCheck = true;

                // Case A: Body Wrapper (Preferred in v2.0)
                if (parsedBody && parsedBody.openseal && parsedBody.result !== undefined) {
                    console.log(`[OpenSeal] Detected Body Wrapper for ${serviceName}`);
                    if (opensealRootHash && wax) {
                        const resultVerify = await OpensealVerifier.verify(parsedBody, wax, opensealRootHash);
                        openSealVerified = resultVerify.valid;
                        openSealMessage = resultVerify.message;
                    }
                    // Unwrap the actual result for the user
                    data = parsedBody.result;
                }
                // Case B: Header-based (Legacy Fallback)
                else {
                    data = parsedBody;
                    if (opensealRootHash && wax) {
                        const seal = response.headers.get('X-OpenSeal-Seal');
                        if (seal) {
                            try {
                                const sealJson = JSON.parse(seal);
                                const resultVerify = await OpensealVerifier.verify({ result: data, openseal: sealJson }, wax, opensealRootHash);
                                openSealVerified = resultVerify.valid;
                                openSealMessage = resultVerify.message;
                            } catch (e: any) {
                                openSealMessage = `Header Parse Error: ${e.message}`;
                            }
                        } else {
                            openSealMessage = 'Missing Seal (Header/Body)';
                        }
                    }
                }
            } catch (e) {
                // If not JSON, return as plain text (Fallback to header-only verification if root hash exists)
                data = { message: responseText };
                integrityCheck = false;
                console.log(`[Proxy] Upstream returned non-JSON content for ${serviceName}`);

                if (opensealRootHash && wax) {
                    const seal = response.headers.get('X-OpenSeal-Seal');
                    if (seal) {
                        try {
                            const sealJson = JSON.parse(seal);
                            const resultVerify = await OpensealVerifier.verify({ result: responseText, openseal: sealJson }, wax, opensealRootHash);
                            openSealVerified = resultVerify.valid;
                            openSealMessage = resultVerify.message;
                        } catch (e: any) {
                            openSealMessage = `Header Parse Error: ${e.message}`;
                        }
                    } else {
                        openSealMessage = 'Integrity Compromised: Non-JSON response without Seal header';
                    }
                }
            }

            const endTime = performance.now();
            const latencyMs = Math.round(endTime - startTime);
            const contentType = response.headers.get('content-type') || 'unknown';
            const responseSizeBytes = responseText.length;

            const result: ProxyResult = {
                status: response.status,
                data: data,
                telemetry: {
                    latencyMs,
                    responseSizeBytes,
                    contentType,
                    integrityCheck
                }
            };

            // Attach Verification Metadata
            if (opensealRootHash) {
                (result as any).openseal = {
                    verified: openSealVerified,
                    message: openSealMessage
                };
            }

            // [NEW] Feedback Loop: Apply penalty if latency is too high
            // This is a simple implementation of the "Decision Compression" feedback loop.
            // Expansion: Compare against ZK-proven promised latency.
            applyPerformancePenalty(serviceName, result.telemetry.latencyMs).catch(err => {
            });

            return result;

        } catch (error: any) {
            console.error('[ProxyService] Upstream error:', error);
            throw error;
        }
    }
}
