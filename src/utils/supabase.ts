import { createClient, SupabaseClient } from '@supabase/supabase-js';
import './env';

let supabaseInstance: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient | null {
    if (supabaseInstance) return supabaseInstance;

    const SUPABASE_URL = process.env.SUPABASE_URL;
    const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY || SUPABASE_URL.includes('YOUR_SUPABASE')) {
        console.warn('[Supabase] Credential missing or invalid. DB features disabled.');
        return null;
    }

    try {
        supabaseInstance = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
            auth: {
                persistSession: false,
                autoRefreshToken: false,
            }
        });
        console.log(`[Supabase] Connected to ${SUPABASE_URL}`);
    } catch (error) {
        console.error('[Supabase] Initialization failed:', error);
        return null;
    }

    return supabaseInstance;
}
