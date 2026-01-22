/**
 * Environment Variable Validator
 * 
 * SECURITY FIX (V-14): Validate all required environment variables at startup
 * to prevent runtime failures and improve debugging experience.
 */

export function validateEnv(): void {
    const required = [
        'DATABASE_URL',
        'RPC_URL',
        'CHAIN_ID',
        'SUPABASE_URL',
        'SUPABASE_SERVICE_ROLE_KEY',
        'PAYMENT_HANDLER_ADDRESS',
        'IDENTITY_CONTRACT_ADDRESS',
        'PERFORMANCE_REGISTRY_ADDRESS',
        'REPUTATION_REGISTRY_ADDRESS'
    ];

    const missing: string[] = [];
    const invalid: string[] = [];

    for (const key of required) {
        if (key === 'DATABASE_URL') {
            const hasIndividual = (process.env.DB_HOST || (process.env.POSTGRES_USER && process.env.POSTGRES_PASSWORD && process.env.POSTGRES_DB));
            if (!process.env.DATABASE_URL && !hasIndividual) {
                missing.push('DATABASE_URL (or individual POSTGRES_* / DB_* variables)');
            }
            continue;
        }

        const value = process.env[key];

        if (!value || value.trim() === '') {
            missing.push(key);
            continue;
        }

        // Additional validation for specific variables
        switch (key) {
            case 'PAYMENT_HANDLER_ADDRESS':
                if (value && (!value.startsWith('0x') || value.length !== 42)) {
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
