import { Request, Response, NextFunction } from 'express';
import { initDB } from '../database/db';
import { isValidUpstreamUrl } from '../utils/validators';

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

        if (!adminDb) {
            console.error('[ServiceResolver] Database connection failed');
            return res.status(500).json({ error: 'Internal Server Error' });
        }

        // Fetch service config from Supabase
        const { data, error } = await adminDb
            .from('services')
            .select('*')
            .eq('slug', serviceSlug)
            .single();

        if (error || !data) {
            // Check for legacy static route fallback if needed?
            // For now, strict dynamic mode:
            // But wait, user might still be using old demo?
            // "resource" was the old path. If serviceSlug == 'resource', it might conflict 
            // if we defined route as /gatekeeper/:serviceSlug/resource.
            // Actually, previously it was /gatekeeper/resource.
            // New route: /gatekeeper/:serviceSlug/resource
            // So calling /gatekeeper/my-api/resource -> serviceSlug = 'my-api'.
            // Calling /gatekeeper/resource -> 404/No match on that pattern? 
            // Express routing: /gatekeeper/:serviceSlug/resource
            return res.status(404).json({ error: 'Service Not Found', message: `Service '${serviceSlug}' does not exist.` });
        }

        // DOMAIN VERIFICATION CHECK
        // DOMAIN VERIFICATION CHECK
        // Allow Bypass if:
        // 1. Service is verified
        // 2. OR Service is the "Internal Demo" (Strictly checked against API Origin)
        // 3. OR Requester is the Service Owner (Owner Bypass for Testing/Debugging)

        let isVerifiedOrBypassed = data.status === 'verified';

        // Check 2: Internal Demo Exception
        if (!isVerifiedOrBypassed) {
            const apiOrigin = process.env.VITE_API_ORIGIN || `http://localhost:${process.env.PORT || 3000}`;
            // Allow if path is exact match to our demo handler AND host matches our deployment
            // We compare the full upstream_url to what we expect our demo URL to be
            const expectedDemoUrl = `${apiOrigin}/api/demo/echo`;
            // Also allow localhost fallback for local dev
            const localDemoUrl = `http://localhost:${process.env.PORT || 3000}/api/demo/echo`;

            if (data.upstream_url === expectedDemoUrl || data.upstream_url === localDemoUrl) {
                isVerifiedOrBypassed = true;
            }
        }

        // Check 3: Owner Bypass (Secure)
        if (!isVerifiedOrBypassed) {
            const providerToken = req.headers['x-provider-token'] as string;
            if (providerToken && data.provider_id) {
                try {
                    const { createClient } = require('@supabase/supabase-js');
                    const supabase = createClient(
                        process.env.SUPABASE_URL!,
                        process.env.SUPABASE_SERVICE_ROLE_KEY!
                    );
                    const { data: { user }, error } = await supabase.auth.getUser(providerToken);

                    if (!error && user && user.id === data.provider_id) {
                        console.log(`[ServiceResolver] 🔓 Owner Bypass: Allowing unverified service access for owner ${user.id}`);
                        isVerifiedOrBypassed = true;
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
        if (!(await isValidUpstreamUrl(data.upstream_url))) {
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
