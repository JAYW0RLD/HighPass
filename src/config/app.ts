
export const APP_CONFIG = {
    // Server
    PORT: process.env.PORT || 3000,
    NODE_ENV: process.env.NODE_ENV || 'development',
    IS_PRODUCTION: process.env.NODE_ENV === 'production',

    // Security
    ALLOWED_ORIGINS: (process.env.ALLOWED_ORIGINS || '').split(',').map(o => o.trim()),
    HMAC_SECRET: process.env.HMAC_SECRET,
    DEPLOYER_PRIVATE_KEY: process.env.DEPLOYER_PRIVATE_KEY,
    ADMIN_WALLET_ADDRESS: process.env.ADMIN_WALLET_ADDRESS,

    // Supabase
    SUPABASE: {
        URL: process.env.SUPABASE_URL,
        ANON_KEY: process.env.SUPABASE_ANON_KEY,
        SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY
    },

    // App Info
    INFO: {
        NAME: 'HighStation',
        VERSION: '0.4.1',
        CURRENCY: 'CRO'
    },

    // Development / Debug
    ALLOW_UNVERIFIED_SERVICES: process.env.ALLOW_UNVERIFIED_SERVICES === 'true'
} as const;

// Helper to validate critical secrets
export function validateAppConfig() {
    const missing = [];
    if (!APP_CONFIG.SUPABASE.URL) missing.push('SUPABASE_URL');
    if (!APP_CONFIG.SUPABASE.SERVICE_ROLE_KEY) missing.push('SUPABASE_SERVICE_ROLE_KEY');

    if (APP_CONFIG.IS_PRODUCTION) {
        if (!APP_CONFIG.HMAC_SECRET) missing.push('HMAC_SECRET');
        // Add other critical production keys
    }

    if (missing.length > 0) {
        throw new Error(`Missing critical configuration: ${missing.join(', ')}`);
    }
}
