import * as dotenv from 'dotenv';
import * as path from 'path';

// Singleton logic to ensure env is loaded only once
let isLoaded = false;

export function loadEnv() {
    if (isLoaded) return;

    // Load .env.local first (override)
    dotenv.config({ path: path.join(__dirname, '../../.env.local'), override: true });

    // Load .env (base)
    dotenv.config({ path: path.join(__dirname, '../../.env') });

    isLoaded = true;
    console.log('[Env] Environment variables loaded');
}

// Auto-load when imported
loadEnv();
