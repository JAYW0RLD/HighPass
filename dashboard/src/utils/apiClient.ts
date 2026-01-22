import { createClient } from '@supabase/supabase-js';
import { API_CONFIG } from '../config';

// Load Environment Variables
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase Configuration', { url: !!supabaseUrl, key: !!supabaseKey });
    throw new Error('Supabase Configuration Missing. Please check .env file.');
}

// [DEBUG] Check Configuration Integrity
console.log('[Auth Debug] Config Check:', {
    url: supabaseUrl,
    keyLength: supabaseKey?.length,
    keyHead: supabaseKey?.substring(0, 10) + '...'
});

export const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: {
        flowType: 'pkce',
        detectSessionInUrl: true,
        persistSession: true,
        autoRefreshToken: true,
    },
});

/**
 * Authenticated Fetch Wrapper
 * Attaches the current user's access token to the Authorization header.
 */
export const authenticatedFetch = async (url: string, options: RequestInit = {}) => {
    const headers = new Headers(options.headers);

    const { data: { session } } = await supabase.auth.getSession();

    if (session?.access_token) {
        headers.set('Authorization', `Bearer ${session.access_token}`);
    } else if (import.meta.env.DEV) {
        // [LOCAL ONLY] Fallback to standard developer identity
        console.log('[Auth] Local Dev: Injecting dev-token');
        headers.set('Authorization', 'Bearer dev-token');
    } else {
        console.warn('[Auth] No active session found for request:', url);
    }

    const fullUrl = url.startsWith('http') ? url : `${API_CONFIG.BASE_URL}${url}`;
    return fetch(fullUrl, { ...options, headers });
};
