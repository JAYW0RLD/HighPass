#!/usr/bin/env ts-node
/**
 * Development Database Seed Script
 * 
 * Populates Supabase with sample data for local development
 * Safe to run multiple times (idempotent)
 * 
 * Usage:
 *   npx ts-node scripts/seed-dev.ts
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env.local'), override: true });
dotenv.config({ path: path.join(__dirname, '../.env') });

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
    console.error('Please configure .env or .env.local with Supabase credentials');
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function seedServices() {
    console.log('[Seed] Seeding services...');

    const services = [
        {
            slug: 'demo-service',
            name: 'Demo Broadcasting Service',
            upstream_url: 'http://localhost:3000/api/demo/service',
            price_wei: '100000000000000000', // 0.1 CRO
            min_grade: 'F',
            status: 'verified',
            provider_id: null // Will be set after providers are created
        },
        {
            slug: 'echo-service',
            name: 'Echo Test API',
            upstream_url: 'http://localhost:3000/api/demo/echo',
            price_wei: '1000000000000000', // 0.001 CRO
            min_grade: 'F',
            status: 'verified',
            provider_id: null
        }
    ];

    for (const service of services) {
        const { error } = await supabase
            .from('services')
            .upsert({ ...service }, { onConflict: 'slug' });

        if (error) {
            console.error(`❌ Failed to seed service ${service.slug}:`, error.message);
        } else {
            console.log(`✅ Seeded service: ${service.slug}`);
        }
    }
}

async function seedDevelopers() {
    console.log('[Seed] Seeding developers...');

    // Note: These would typically be created via GitHub OAuth in production
    // For dev purposes, we create sample records
    const developers = [
        {
            id: 'dev-sample-001',
            username: 'alice_dev',
            email: 'alice@example.com'
        },
        {
            id: 'dev-sample-002',
            username: 'bob_builder',
            email: 'bob@example.com'
        }
    ];

    for (const dev of developers) {
        const { error } = await supabase
            .from('developers')
            .upsert(dev, { onConflict: 'id' });

        if (error) {
            console.error(`❌ Failed to seed developer ${dev.username}:`, error.message);
        } else {
            console.log(`✅ Seeded developer: ${dev.username}`);
        }
    }
}

async function seedWallets() {
    console.log('[Seed] Seeding wallets...');

    const wallets = [
        {
            address: '0x1111111111111111111111111111111111111111',
            developer_id: 'dev-sample-001',
            verified: true,
            debt_limit_usd: 5.0,
            current_debt_wei: '0'
        },
        {
            address: '0x2222222222222222222222222222222222222222',
            developer_id: 'dev-sample-002',
            verified: true,
            debt_limit_usd: 1.0,
            current_debt_wei: '0'
        },
        {
            address: '0x3333333333333333333333333333333333333333',
            developer_id: null,
            verified: false,
            debt_limit_usd: 0,
            current_debt_wei: '0'
        }
    ];

    for (const wallet of wallets) {
        const { error } = await supabase
            .from('wallets')
            .upsert(wallet, { onConflict: 'address' });

        if (error) {
            console.error(`❌ Failed to seed wallet ${wallet.address}:`, error.message);
        } else {
            console.log(`✅ Seeded wallet: ${wallet.address}`);
        }
    }
}

async function main() {
    console.log('🌱 HighStation Development Database Seeder\n');
    console.log(`📡 Target: ${SUPABASE_URL}\n`);

    try {
        await seedDevelopers();
        await seedWallets();
        await seedServices();

        console.log('\n✅ Database seeding completed successfully!');
        console.log('\n💡 You can now start the development server:');
        console.log('   npm run dev\n');
    } catch (error) {
        console.error('\n❌ Seeding failed:', error);
        process.exit(1);
    }
}

main();
