import { Request, Response, NextFunction } from 'express';
import { initDB } from '../database/db';
import { isValidUpstreamUrl } from '../utils/validators';
import { createClient } from '@supabase/supabase-js';

export interface ServiceConfig {
    id: string;
    slug: string;
    upstream_url: string;
    price_wei: string;
    min_grade: string;
    provider_id: string;
}

export const serviceResolver = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { serviceSlug } = req.params;
        if (!serviceSlug) {
            return res.status(404).json({ error: 'Service Not Found', message: 'No service specified in path' });
        }

        // RED TEAM FIX: Path Traversal / Injection Prevention
        // Ensure slug contains only safe characters (alphanumeric, hyphens, underscores)
        if (!/^[a-zA-Z0-9_-]+$/.test(serviceSlug)) {
            return res.status(400).json({ error: 'Invalid Request', message: 'Invalid service slug format' });
        }

        // Use ADMIN Privilege (Service Role) via shared initDB
        const adminDb = await initDB();

        let data: any;
        let error: any;

        if (adminDb) {
            // Fetch service config from Supabase
            const result = await adminDb
                .from('services')
                .select('*')
                .eq('slug', serviceSlug)
                .single();
            data = result.data;
            error = result.error;
        } else {
            console.warn('[ServiceResolver] Database connection failed or refused - attempting fallback');
        }

        if (error || !data) {
            // FALLBACK FOR DEMO: If DB is down or service missing, allow "echo-service"
            if (serviceSlug === 'echo-service') {
                console.log(`[ServiceResolver] ⚠️ Using Static Config for 'echo-service' (DB Fallback)`);
                data = {
                    id: '00000000-0000-0000-0000-000000000000',
                    slug: 'echo-service',
                    name: 'Demo Echo API',
                    upstream_url: 'http://localhost:3000/api/demo/echo',
                    price_wei: '1000000000000000', // 0.001 Token
                    min_grade: 'F', // Open to all
                    provider_id: '00000000-0000-0000-0000-000000000000',
                    status: 'verified' // Auto-verified
                };
            } else {
                return res.status(404).json({ error: 'Service Not Found', message: `Service '${serviceSlug}' does not exist.` });
            }
        }

        // DOMAIN VERIFICATION CHECK
        // DOMAIN VERIFICATION CHECK
        // Allow Bypass if:
        // 1. Service is verified
        // 2. OR Service is the "Internal Demo" (Strictly checked against API Origin)
        // 3. OR Requester is the Service Owner (Owner Bypass for Testing/Debugging)

        let isVerifiedOrBypassed = data.status === 'verified';

        // Check 2: Internal Demo Exception (Robust)
        if (!isVerifiedOrBypassed) {
            // Check if URL ends with our known demo path
            if (data.upstream_url.endsWith('/api/demo/echo')) {
                // Additional safety: Check if it's a known safe host
                const urlObj = new URL(data.upstream_url);
                const hostname = urlObj.hostname;

                // Check if it's the configured API Origin (Internal Demo)
                const apiOrigin = process.env.VITE_API_ORIGIN ? new URL(process.env.VITE_API_ORIGIN).hostname : null;

                // SECURITY FIX (V-11): Strict origin check for demo service
                // Removed loose check for *.vercel.app which allowed bypass
                if (hostname === 'localhost' || hostname === '127.0.0.1') {
                    isVerifiedOrBypassed = true;
                } else if (apiOrigin && hostname === apiOrigin) {
                    console.log('[ServiceResolver] Allowed Internal Demo Service:', hostname);
                    isVerifiedOrBypassed = true;
                }
            }
        }

        // Check 3: Owner Bypass (Secure)
        if (!isVerifiedOrBypassed) {
            const providerToken = req.headers['x-provider-token'] as string;
            // Check if token exists AND if the service has a provider_id
            if (providerToken && data.provider_id) {
                try {
                    // Use top-level import
                    const supabase = createClient(
                        process.env.SUPABASE_URL!,
                        process.env.SUPABASE_SERVICE_ROLE_KEY!
                    );
                    const { data: { user }, error } = await supabase.auth.getUser(providerToken);

                    if (!error && user && user.id === data.provider_id) {
                        console.log(`[ServiceResolver] 🔓 Owner Bypass: Allowing unverified service access for owner ${user.id}`);
                        isVerifiedOrBypassed = true;
                    } else if (error) {
                        console.warn(`[ServiceResolver] Owner Bypass Token Invalid: ${error.message}`);
                    }
                } catch (e) {
                    console.error('[ServiceResolver] Owner Bypass Check Failed:', e);
                }
            }
        }

        if (!isVerifiedOrBypassed) {
            return res.status(403).json({ error: 'Service Not Verified', message: `Service '${serviceSlug}' has not completed domain verification.`, status: data.status });
        }

        // SSRF PROTECTION (Defense in Depth)
        // Fix: Removed unsafe slug-based bypass (echo-service)

        // Define Safe Internal Endpoints
        // We only allow localhost/internal hits if they match specific safe paths
        const isSafeInternalEndpoint = (url: string) => {
            return url.endsWith('/api/demo/echo');
        };

        const isInternalSafe = isSafeInternalEndpoint(data.upstream_url);

        if (!isInternalSafe && !(await isValidUpstreamUrl(data.upstream_url))) {
            console.error(`[ServiceResolver] Blocked unsafe upstream URL: ${data.upstream_url}`);
            return res.status(502).json({ error: 'Bad Gateway', message: 'Upstream service configuration is unsafe.' });
        }

        // Attach config to locals
        res.locals.serviceConfig = data as ServiceConfig;

        // Log service context
        console.log(`[ServiceResolver] Resolved '${serviceSlug}' -> Target: ${data.upstream_url}, Price: ${data.price_wei} wei`);

        next();
    } catch (err) {
        console.error('[ServiceResolver] Error:', err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};
