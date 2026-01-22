import { URL } from 'url';
import * as net from 'net';


/**
 * Checks if an IP address is in a blocked range
 * @param ip IPv4 or IPv6 address
 * @returns true if IP is blocked (private/loopback), false if allowed
 */
export function isBlockedIP(ip: string): boolean {
    // Explicit blocklist
    if (['localhost', '127.0.0.1', '::1', '0.0.0.0'].includes(ip)) {
        return true;
    }

    // IPv4 Private Ranges
    // 10.0.0.0/8
    if (ip.startsWith('10.')) return true;

    // 192.168.0.0/16
    if (ip.startsWith('192.168.')) return true;

    // 172.16.0.0/12 (172.16.x.x - 172.31.x.x)
    if (ip.startsWith('172.')) {
        const parts = ip.split('.');
        const second = parseInt(parts[1], 10);
        if (second >= 16 && second <= 31) return true;
    }

    // 169.254.0.0/16 (Link-local / AWS IMDS)
    if (ip.startsWith('169.254.')) return true;

    // 127.0.0.0/8 (Loopback range)
    if (ip.startsWith('127.')) return true;

    // IPv6 loopback and link-local
    if (ip === '::1' || ip.startsWith('fe80:')) return true;

    return false;
}

/**
 * Validates if a URL is safe for upstream proxying (Static/Syntax only).
 * Blocks:
 * - Non-HTTP/HTTPS protocols
 * - Localhost / Loopback
 * - Private IP ranges (10.x, 192.168.x, 172.16-31.x) in hostname
 * 
 * NOTE: This does NOT performing DNS lookups. Use ssrfGuard for network validation.
 * 
 * @param urlString The URL to validate
 * @returns boolean true if syntax/static check passes
 */
export function isSafeUrlSyntax(urlString: string): boolean {
    try {
        const url = new URL(urlString);

        // 1. Protocol Check
        if (!['http:', 'https:'].includes(url.protocol)) {
            console.warn(`[SSRF Protection] Blocked non-HTTP(S) protocol: ${url.protocol}`);
            return false;
        }

        const hostname = url.hostname;

        // 2. Hostname Blocklist (Explicit)
        if (isBlockedIP(hostname)) {
            console.warn(`[SSRF Protection] Blocked explicit hostname: ${hostname}`);
            return false;
        }

        // 3. If hostname is already an IP, check it
        if (net.isIP(hostname)) {
            if (isBlockedIP(hostname)) {
                console.warn(`[SSRF Protection] Blocked IP address: ${hostname}`);
                return false;
            }
            return true;
        }

        // No DNS resolution here. Pure syntax check.
        return true;

    } catch (e) {
        console.error('[SSRF Protection] URL syntax error:', e);
        return false;
    }
}

