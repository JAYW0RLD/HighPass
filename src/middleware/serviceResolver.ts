import { Request, Response, NextFunction } from 'express';
import { initDB } from '../database/db';

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

        // Use ADMIN Privilege (Service Role) to bypass RLS and read upstream_url
        // Standard `initDB` uses ANON key, which is now restricted by RLS (can't see upstream_url).
        // We create a one-off admin client or check if db exports one.
        // For simplicity:
        const { createClient } = require('@supabase/supabase-js');
        const adminDb = createClient(
            process.env.SUPABASE_URL,
            process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY
        );

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
            return res.status(403).json({ error: 'Service Not Verified', message: `Service '${serviceSlug}' has not completed domain verification.`, status: data.status });
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
