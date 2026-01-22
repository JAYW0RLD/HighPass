import * as dotenv from 'dotenv';
import * as path from 'path';

// Singleton logic to ensure env is loaded only once
let isLoaded = false;

export function loadEnv() {
    if (isLoaded) return;

    // Resolve root path robustly (works for both src/ and dist/src/)
    const rootDir = process.cwd();

    // Load .env (base) first
    dotenv.config({ path: path.join(rootDir, '.env') });

    // Load .env.local (override)
    const localPath = path.join(rootDir, '.env.local');
    if (require('fs').existsSync(localPath)) {
        dotenv.config({ path: localPath, override: true });
    }

    isLoaded = true;
    console.log('[Env] Environment variables loaded');
}

// Auto-load when imported
loadEnv();
