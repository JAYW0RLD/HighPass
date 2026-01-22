import { Request, Response, NextFunction } from 'express';
import { query } from '../database/db';
import { validateUpstreamNetwork } from '../utils/ssrfGuard';
import { createClient } from '@supabase/supabase-js';

export interface ServiceConfig {
    id: string;
    slug: string;
    upstream_url: string;
    price_wei: string;
    access_requirements: {
        min_grade: string;
        requires_openseal?: boolean;
        requires_zk_proof?: boolean;
        [key: string]: any;
    };
    provider_id: string;
    signing_secret?: string;
    openseal_repo_url?: string;
    openseal_root_hash?: string;
    settlement_address?: string;
}

export const serviceResolver = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { serviceSlug } = req.params;
        if (!serviceSlug) {
            return res.status(404).json({ error: 'Service Not Found', message: 'No service specified in path' });
        }

        // RED TEAM FIX: Path Traversal / Injection Prevention
        if (!/^[a-zA-Z0-9_-]+$/.test(serviceSlug)) {
            return res.status(400).json({ error: 'Invalid Request', message: 'Invalid service slug format' });
        }

        let data: any;
        let error: any;

        try {
            const result = await query(
                `SELECT s.*, p.settlement_address 
                 FROM services s 
                 LEFT JOIN profiles p ON s.provider_id = p.id 
                 WHERE s.slug = $1 LIMIT 1`,
                [serviceSlug]
            );
            data = result.rows[0];
        } catch (err: any) {
            console.warn('[ServiceResolver] Database lookup failed:', err);
            error = err;
        }

        if (error || !data) {
            return res.status(404).json({ error: 'Service Not Found', message: `Service '${serviceSlug}' does not exist.` });
        }

        // DOMAIN VERIFICATION CHECK
        let isVerifiedOrBypassed = data.status === 'verified';

        if (!isVerifiedOrBypassed) {
            // Check if URL ends with any known demo path
            const upstreamUrl = data.upstream_url || '';
            const isDemoPath = upstreamUrl.endsWith('/api/demo/echo') ||
                upstreamUrl.endsWith('/api/demo/animals') ||
                data.upstream_url.endsWith('/api/demo/fruits') ||
                data.upstream_url.endsWith('/api/demo/colors');

            if (isDemoPath) {
                const urlObj = new URL(data.upstream_url);
                const hostname = urlObj.hostname;
                const apiOrigin = process.env.VITE_API_ORIGIN ? new URL(process.env.VITE_API_ORIGIN).hostname : null;

                // Allow localhost in non-prod
                if (hostname === 'localhost' || hostname === '127.0.0.1') {
                    if (process.env.NODE_ENV !== 'production') {
                        isVerifiedOrBypassed = true;
                    }
                } else if (apiOrigin && hostname === apiOrigin) {
                    isVerifiedOrBypassed = true;
                }
            }
        }

        // DEVELOPMENT BYPASS: Allow unverified services in non-prod if configured
        if (!isVerifiedOrBypassed && process.env.NODE_ENV !== 'production') {
            const { APP_CONFIG } = require('../config/app');
            if (APP_CONFIG.ALLOW_UNVERIFIED_SERVICES) {
                console.warn(`[ServiceResolver] Bypassing verification for '${serviceSlug}' (ALLOW_UNVERIFIED_SERVICES=true)`);
                isVerifiedOrBypassed = true;
            }
        }

        // Owner Bypass
        if (!isVerifiedOrBypassed) {
            const providerToken = req.headers['x-provider-token'] as string;
            if (providerToken && data.provider_id) {
                try {
                    const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
                    const { data: { user }, error } = await supabase.auth.getUser(providerToken);
                    if (!error && user && user.id === data.provider_id) {
                        isVerifiedOrBypassed = true;
                    }
                } catch (e) {
                    console.error('[ServiceResolver] Owner Bypass Failed:', e);
                }
            }
        }

        if (!isVerifiedOrBypassed) {
            return res.status(403).json({ error: 'Service Not Verified', message: `Service '${serviceSlug}' has not completed domain verification.`, status: data.status });
        }

        // SSRF PROTECTION
        const isSafeInternalEndpoint = (urlStr: string) => {
            try {
                const u = new URL(urlStr.trim());
                // Allow any path starting with /api/demo/
                return u.pathname.startsWith('/api/demo/');
            } catch (e) {
                return false;
            }
        };

        const isInternalSafe = isSafeInternalEndpoint(data.upstream_url || '');

        if (!isInternalSafe && !(await validateUpstreamNetwork(data.upstream_url || ''))) {
            console.warn(`[ServiceResolver] Blocked unsafe upstream: ${data.upstream_url}`);
            return res.status(502).json({ error: 'Bad Gateway', message: 'Upstream service configuration is unsafe.' });
        }

        res.locals.serviceConfig = data as ServiceConfig;
        next();

    } catch (err) {
        console.error('[ServiceResolver] Error:', err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};
