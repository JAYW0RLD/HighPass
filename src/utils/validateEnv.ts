/**
 * Environment Variable Validator
 * 
 * SECURITY FIX (V-14): Validate all required environment variables at startup
 * to prevent runtime failures and improve debugging experience.
 */

export function validateEnv(): void {
    const required = [
        'SUPABASE_URL',
        'SUPABASE_ANON_KEY',
        'SUPABASE_SERVICE_ROLE_KEY',
        'PAYMENT_HANDLER_ADDRESS',
        'IDENTITY_CONTRACT_ADDRESS',
        'RPC_URL',
        'CHAIN_ID'
    ];

    const missing: string[] = [];
    const invalid: string[] = [];

    for (const key of required) {
        const value = process.env[key];

        if (!value || value.trim() === '') {
            missing.push(key);
            continue;
        }

        // Additional validation for specific variables
        switch (key) {
            case 'SUPABASE_URL':
                if (!value.startsWith('http')) {
                    invalid.push(`${key} (must start with http/https)`);
                }
                break;

            case 'PAYMENT_HANDLER_ADDRESS':
            case 'IDENTITY_CONTRACT_ADDRESS':
                if (!value.startsWith('0x') || value.length !== 42) {
                    invalid.push(`${key} (must be valid Ethereum address)`);
                }
                break;

            case 'CHAIN_ID':
                if (isNaN(Number(value))) {
                    invalid.push(`${key} (must be a number)`);
                }
                break;
        }
    }

    if (missing.length > 0 || invalid.length > 0) {
        console.error('\n❌ Environment Variable Validation Failed!\n');

        if (missing.length > 0) {
            console.error('Missing required variables:');
            missing.forEach(key => console.error(`  - ${key}`));
        }

        if (invalid.length > 0) {
            console.error('\nInvalid variables:');
            invalid.forEach(msg => console.error(`  - ${msg}`));
        }

        console.error('\n📝 Please check your .env file against .env.example\n');

        // In test environment, don't crash the process, just throw an error or warn.
        // This allows unit tests to mock specific env vars without needing ALL of them.
        if (process.env.NODE_ENV === 'test') {
            console.warn('[Test] Skipping process.exit(1) due to test environment.');
            return;
        }
        process.exit(1);
    }

    console.log('✅ All required environment variables validated');
}

/**
 * Optional: Validate environment-specific configurations
 */
export function validateProductionEnv(): void {
    if (process.env.NODE_ENV !== 'production') {
        return;
    }

    const productionChecks = [
        'ALLOWED_ORIGINS'  // Must be set in production
    ];

    const missing = productionChecks.filter(key => !process.env[key]);

    if (missing.length > 0) {
        console.error('\n⚠️  Production Environment Warning!\n');
        console.error('Missing recommended production variables:');
        missing.forEach(key => console.error(`  - ${key}`));
        console.error('\nProceeding anyway, but this may cause issues.\n');
    }
}
