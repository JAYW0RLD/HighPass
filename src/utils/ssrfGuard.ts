import * as dns from 'dns/promises';
import { isBlockedIP } from './validators';
import { URL } from 'url';

/**
 * Performs network-level validation to prevent SSRF against DNS Rebinding.
 * This function performs DNS lookups and is therefore asynchronous and network-bound.
 */
export async function validateUpstreamNetwork(urlString: string): Promise<boolean> {
    try {
        const url = new URL(urlString);
        const hostname = url.hostname;

        // Offline check first (redundant but safe)
        if (isBlockedIP(hostname)) {
            console.warn(`[SSRF Guard] Blocked explicit hostname: ${hostname}`);
            return false;
        }

        // Perform DNS Resolution
        try {
            const addresses = await dns.resolve(hostname);

            if (!addresses || addresses.length === 0) {
                console.warn(`[SSRF Guard] DNS resolution failed/empty for: ${hostname}`);
                return false;
            }

            // Check all resolved IPs against blocklist
            for (const ip of addresses) {
                if (isBlockedIP(ip)) {
                    console.warn(`[SSRF Guard] 🚨 DNS Rebinding Detected! ${hostname} resolves to blocked IP: ${ip}`);
                    return false;
                }
            }

            console.log(`[SSRF Guard] ✅ DNS validated: ${hostname} -> ${addresses.join(', ')}`);
            return true;

        } catch (dnsError) {
            // DNS lookup failed - fail closed
            console.error(`[SSRF Guard] DNS lookup error for ${hostname}:`, dnsError);
            return false;
        }

    } catch (e) {
        console.error('[SSRF Guard] Network validation error:', e);
        return false;
    }
}
