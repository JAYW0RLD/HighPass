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
        if (data.status !== 'verified') {
            // Internal Demo Exception (STRICT)
            // Only allow if upstream URL explicitly references the internal demo handler's exact path
            // And prevent any external manipulation
            const internalDemoUrl = `http://localhost:${process.env.PORT || 3000}/api/demo/echo`;
            if (data.upstream_url !== internalDemoUrl) {
                return res.status(403).json({ error: 'Service Not Verified', message: `Service '${serviceSlug}' has not completed domain verification.`, status: data.status });
            }
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
