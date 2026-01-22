import { Request, Response, NextFunction } from 'express';
import { query } from '../database/db';

/**
 * Domain-based Service Resolver Middleware
 * 
 * Identifies services based on Host header, supporting:
 * 1. Custom Domains (example.com) → services.custom_domain
 * 2. Slug Subdomains (myapi.highstation.net) → services.slug
 * 3. Legacy Paths (/gatekeeper/:slug) → backward compatibility
 * 
 * This replaces the complex URL-based routing with simple domain-based identification,
 * similar to Cloudflare's approach.
 */
export async function domainResolver(req: Request, res: Response, next: NextFunction) {
    try {
        // Skip internal routes (API, MCP, Health, etc.)
        if (req.path.startsWith('/api') ||
            req.path.startsWith('/mcp') ||
            req.path.startsWith('/health') ||
            req.path.startsWith('/debug')) {
            return next();
        }

        const host = req.headers.host || '';
        const hostname = host.split(':')[0]; // Remove port if present

        console.log(`[DomainResolver] Processing request from host: ${hostname}, path: ${req.path}`);

        // Priority 1: Custom Domain Lookup
        // Example: user owns "api.example.com" and set it as custom_domain
        const customDomainResult = await query(
            'SELECT * FROM services WHERE custom_domain = $1 AND status = $2 LIMIT 1',
            [hostname, 'verified']
        );

        if (customDomainResult.rows.length > 0) {
            res.locals.serviceConfig = customDomainResult.rows[0];
            res.locals.serviceSource = 'custom_domain';
            console.log(`[DomainResolver] Matched custom domain: ${hostname} → ${customDomainResult.rows[0].slug}`);
            return next();
        }

        // Priority 2: Subdomain Lookup (slug.highstation.net)
        // Extract first part of subdomain
        const parts = hostname.split('.');
        if (parts.length >= 2) {
            const subdomain = parts[0];

            // Check if it's a HighStation subdomain pattern
            const isHighStationDomain = hostname.endsWith('.highstation.net') ||
                hostname.endsWith('.highstation.localhost');

            if (isHighStationDomain && subdomain !== 'www') {
                const subdomainResult = await query(
                    'SELECT * FROM services WHERE slug = $1 AND status = $2 LIMIT 1',
                    [subdomain, 'verified']
                );

                if (subdomainResult.rows.length > 0) {
                    res.locals.serviceConfig = subdomainResult.rows[0];
                    res.locals.serviceSource = 'subdomain';
                    console.log(`[DomainResolver] Matched subdomain: ${subdomain} → ${subdomainResult.rows[0].name}`);
                    return next();
                }
            }
        }

        // Priority 3: Legacy Path Support (/gatekeeper/:slug/*)
        // Maintains backward compatibility with existing integrations
        const legacyMatch = req.path.match(/^\/gatekeeper\/([^\/]+)/);
        if (legacyMatch) {
            const slug = legacyMatch[1];

            // Skip if it's just the info endpoint (handled separately)
            if (slug === 'resource' || req.path.includes('/info')) {
                return next();
            }

            const legacyResult = await query(
                'SELECT * FROM services WHERE slug = $1 AND status = $2 LIMIT 1',
                [slug, 'verified']
            );

            if (legacyResult.rows.length > 0) {
                res.locals.serviceConfig = legacyResult.rows[0];
                res.locals.serviceSource = 'legacy_path';

                // Strip /gatekeeper/:slug from path for upstream forwarding
                const pathWithoutGatekeeper = req.path.replace(/^\/gatekeeper\/[^\/]+/, '') || '/';
                res.locals.strippedPath = pathWithoutGatekeeper;

                console.log(`[DomainResolver] Matched legacy path: ${slug} → ${legacyResult.rows[0].name}`);
                return next();
            }
        }

        // No service found - let it pass to next handler (static files, 404, etc.)
        console.log(`[DomainResolver] No service matched for ${hostname}${req.path}`);
        next();

    } catch (error: any) {
        console.error('[DomainResolver] Error:', error);
        // Don't block the request, just pass to next handler
        next();
    }
}

/**
 * Service Resolver Middleware (Wrapper for backward compatibility)
 * This maintains compatibility with existing serviceResolver middleware usage
 */
export async function serviceResolver(req: Request, res: Response, next: NextFunction) {
    // If already resolved by domainResolver, skip
    if (res.locals.serviceConfig) {
        return next();
    }

    // Try to resolve from path parameters (legacy support)
    const serviceSlug = req.params.serviceSlug || req.params[0];
    if (!serviceSlug) {
        return res.status(400).json({ error: 'Service identifier missing' });
    }

    try {
        const result = await query(
            'SELECT * FROM services WHERE slug = $1 LIMIT 1',
            [serviceSlug]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Service not found' });
        }

        res.locals.serviceConfig = result.rows[0];
        res.locals.serviceSource = 'param';
        next();

    } catch (error: any) {
        console.error('[ServiceResolver] Error:', error);
        res.status(500).json({ error: 'Service resolution failed' });
    }
}
