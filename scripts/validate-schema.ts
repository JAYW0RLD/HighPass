#!/usr/bin/env npx tsx

/**
 * Schema Validation Script
 * 
 * Automatically validates database schema against best practices.
 * Run this before every deployment to catch issues early.
 * 
 * Usage:
 *   npm run validate:schema
 *   or
 *   npx tsx scripts/validate-schema.ts
 */

import { createClient } from '@supabase/supabase-js';

interface SchemaIssue {
    severity: 'ERROR' | 'WARNING' | 'INFO';
    category: string;
    table?: string;
    column?: string;
    issue: string;
    fix?: string;
}

const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const db = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function validateSchema(): Promise<SchemaIssue[]> {
    const issues: SchemaIssue[] = [];

    console.log('🔍 Starting schema validation...\n');

    // ========================================================================
    // RULE 1: No TEXT for numeric/monetary columns
    // ========================================================================
    console.log('Checking Rule 1: Numeric types...');

    const { data: textNumericColumns } = await db.rpc('exec_sql', {
        query: `
            SELECT table_name, column_name, data_type
            FROM information_schema.columns
            WHERE table_schema = 'public'
            AND data_type = 'text'
            AND (
                column_name ILIKE '%amount%'
                OR column_name ILIKE '%price%'
                OR column_name ILIKE '%balance%'
                OR column_name ILIKE '%debt%'
                OR column_name ILIKE '%wei%'
                OR column_name ILIKE '%gas%'
                OR column_name ILIKE '%limit%'
            )
        `
    });

    if (textNumericColumns) {
        for (const col of textNumericColumns) {
            issues.push({
                severity: 'ERROR',
                category: 'Type Safety',
                table: col.table_name,
                column: col.column_name,
                issue: 'Monetary/numeric value stored as TEXT instead of NUMERIC',
                fix: `ALTER TABLE ${col.table_name} ALTER COLUMN ${col.column_name} TYPE NUMERIC USING ${col.column_name}::numeric;`
            });
        }
    }

    // ========================================================================
    // RULE 2: All tables must have primary key
    // ========================================================================
    console.log('Checking Rule 2: Primary keys...');

    const { data: tablesWithoutPK } = await db.rpc('exec_sql', {
        query: `
            SELECT tablename
            FROM pg_tables
            WHERE schemaname = 'public'
            AND tablename NOT IN (
                SELECT tablename
                FROM pg_indexes
                WHERE indexname LIKE '%_pkey'
            )
        `
    });

    if (tablesWithoutPK && tablesWithoutPK.length > 0) {
        for (const table of tablesWithoutPK) {
            issues.push({
                severity: 'ERROR',
                category: 'Data Integrity',
                table: table.tablename,
                issue: 'Table has no primary key',
                fix: `ALTER TABLE ${table.tablename} ADD COLUMN id BIGSERIAL PRIMARY KEY;`
            });
        }
    }

    // ========================================================================
    // RULE 3: Address columns must have validation
    // ========================================================================
    console.log('Checking Rule 3: Address validation...');

    const { data: addressColumns } = await db.rpc('exec_sql', {
        query: `
            SELECT c.table_name, c.column_name
            FROM information_schema.columns c
            WHERE c.table_schema = 'public'
            AND (c.column_name ILIKE '%address%' OR c.column_name = 'to_address')
            AND NOT EXISTS (
                SELECT 1
                FROM information_schema.check_constraints cc
                JOIN information_schema.constraint_column_usage ccu
                ON cc.constraint_name = ccu.constraint_name
                WHERE ccu.table_name = c.table_name
                AND ccu.column_name = c.column_name
                AND cc.check_clause LIKE '%0x%'
            )
        `
    });

    if (addressColumns) {
        for (const col of addressColumns) {
            issues.push({
                severity: 'WARNING',
                category: 'Validation',
                table: col.table_name,
                column: col.column_name,
                issue: 'Ethereum address column lacks validation constraint',
                fix: `ALTER TABLE ${col.table_name} ADD CONSTRAINT valid_${col.column_name} CHECK (${col.column_name} ~* '^0x[a-fA-F0-9]{40}$');`
            });
        }
    }

    // ========================================================================
    // RULE 4: Enum-like columns should use ENUM type
    // ========================================================================
    console.log('Checking Rule 4: ENUM types...');

    const { data: enumLikeColumns } = await db.rpc('exec_sql', {
        query: `
            SELECT table_name, column_name
            FROM information_schema.columns
            WHERE table_schema = 'public'
            AND data_type = 'text'
            AND (
                column_name = 'status'
                OR column_name = 'role'
                OR column_name LIKE '%_status'
                OR column_name LIKE '%_grade'
            )
        `
    });

    if (enumLikeColumns) {
        for (const col of enumLikeColumns) {
            issues.push({
                severity: 'WARNING',
                category: 'Type Safety',
                table: col.table_name,
                column: col.column_name,
                issue: 'Enum-like column uses TEXT instead of ENUM type (slower, no type safety)',
                fix: `CREATE TYPE ${col.column_name}_enum AS ENUM (...); ALTER TABLE ${col.table_name} ALTER COLUMN ${col.column_name} TYPE ${col.column_name}_enum;`
            });
        }
    }

    // ========================================================================
    // RULE 5: All foreign keys should have indexes
    // ========================================================================
    console.log('Checking Rule 5: Foreign key indexes...');

    const { data: fkWithoutIndexes } = await db.rpc('exec_sql', {
        query: `
            SELECT 
                tc.table_name,
                kcu.column_name,
                ccu.table_name AS foreign_table_name
            FROM information_schema.table_constraints AS tc
            JOIN information_schema.key_column_usage AS kcu
            ON tc.constraint_name = kcu.constraint_name
            JOIN information_schema.constraint_column_usage AS ccu
            ON ccu.constraint_name = tc.constraint_name
            WHERE tc.constraint_type = 'FOREIGN KEY'
            AND tc.table_schema = 'public'
            AND NOT EXISTS (
                SELECT 1
                FROM pg_indexes
                WHERE schemaname = 'public'
                AND tablename = tc.table_name
                AND indexdef LIKE '%' || kcu.column_name || '%'
            )
        `
    });

    if (fkWithoutIndexes) {
        for (const fk of fkWithoutIndexes) {
            issues.push({
                severity: 'WARNING',
                category: 'Performance',
                table: fk.table_name,
                column: fk.column_name,
                issue: `Foreign key to ${fk.foreign_table_name} lacks index (slow joins)`,
                fix: `CREATE INDEX idx_${fk.table_name}_${fk.column_name} ON ${fk.table_name}(${fk.column_name});`
            });
        }
    }

    // ========================================================================
    // RULE 6: User-facing tables should have RLS
    // ========================================================================
    console.log('Checking Rule 6: RLS policies...');

    const { data: tablesWithoutRLS } = await db.rpc('exec_sql', {
        query: `
            SELECT tablename
            FROM pg_tables
            WHERE schemaname = 'public'
            AND tablename NOT IN ('audit_log', 'used_nonces')
            AND NOT EXISTS (
                SELECT 1
                FROM pg_tables t
                WHERE t.schemaname = 'public'
                AND t.tablename = pg_tables.tablename
                AND t.rowsecurity = true
            )
        `
    });

    if (tablesWithoutRLS && tablesWithoutRLS.length > 0) {
        for (const table of tablesWithoutRLS) {
            issues.push({
                severity: 'ERROR',
                category: 'Security',
                table: table.tablename,
                issue: 'Table has RLS disabled (publicly accessible!)',
                fix: `ALTER TABLE ${table.tablename} ENABLE ROW LEVEL SECURITY; CREATE POLICY ...;`
            });
        }
    }

    // ========================================================================
    // RULE 7: Audit timestamps
    // ========================================================================
    console.log('Checking Rule 7: Audit timestamps...');

    const { data: tablesWithoutTimestamps } = await db.rpc('exec_sql', {
        query: `
            SELECT tablename
            FROM pg_tables
            WHERE schemaname = 'public'
            AND tablename NOT IN (
                SELECT table_name
                FROM information_schema.columns
                WHERE column_name = 'created_at'
                AND table_schema = 'public'
            )
        `
    });

    if (tablesWithoutTimestamps) {
        for (const table of tablesWithoutTimestamps) {
            issues.push({
                severity: 'INFO',
                category: 'Audit Trail',
                table: table.tablename,
                issue: 'Table lacks created_at timestamp',
                fix: `ALTER TABLE ${table.tablename} ADD COLUMN created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();`
            });
        }
    }

    // ========================================================================
    // RULE 8: Critical columns should be NOT NULL
    // ========================================================================
    console.log('Checking Rule 8: NOT NULL constraints...');

    const { data: nullableIdColumns } = await db.rpc('exec_sql', {
        query: `
            SELECT table_name, column_name
            FROM information_schema.columns
            WHERE table_schema = 'public'
            AND is_nullable = 'YES'
            AND (
                column_name IN ('id', 'created_at', 'status')
                OR column_name LIKE '%_id' AND column_name NOT LIKE 'developer_id'
            )
        `
    });

    if (nullableIdColumns) {
        for (const col of nullableIdColumns) {
            issues.push({
                severity: 'WARNING',
                category: 'Data Integrity',
                table: col.table_name,
                column: col.column_name,
                issue: 'Critical column allows NULL (can cause bugs)',
                fix: `ALTER TABLE ${col.table_name} ALTER COLUMN ${col.column_name} SET NOT NULL;`
            });
        }
    }

    return issues;
}

async function main() {
    try {
        const issues = await validateSchema();

        console.log('\n========================================');
        console.log('SCHEMA VALIDATION REPORT');
        console.log('========================================\n');

        const errors = issues.filter(i => i.severity === 'ERROR');
        const warnings = issues.filter(i => i.severity === 'WARNING');
        const infos = issues.filter(i => i.severity === 'INFO');

        console.log(`❌ ERRORS: ${errors.length}`);
        console.log(`⚠️  WARNINGS: ${warnings.length}`);
        console.log(`ℹ️  INFO: ${infos.length}`);
        console.log(`\n📊 TOTAL ISSUES: ${issues.length}\n`);

        if (issues.length === 0) {
            console.log('✅ No issues found! Schema is perfect.\n');
            process.exit(0);
        }

        // Group by category
        const byCategory: Record<string, SchemaIssue[]> = {};
        for (const issue of issues) {
            if (!byCategory[issue.category]) {
                byCategory[issue.category] = [];
            }
            byCategory[issue.category].push(issue);
        }

        // Print issues by category
        for (const [category, categoryIssues] of Object.entries(byCategory)) {
            console.log(`\n📁 ${category}:`);
            console.log('─'.repeat(60));

            for (const issue of categoryIssues) {
                const icon = issue.severity === 'ERROR' ? '❌' : issue.severity === 'WARNING' ? '⚠️' : 'ℹ️';
                const location = issue.table && issue.column
                    ? `${issue.table}.${issue.column}`
                    : issue.table || 'General';

                console.log(`\n${icon} [${issue.severity}] ${location}`);
                console.log(`   ${issue.issue}`);

                if (issue.fix) {
                    console.log(`   💡 Fix: ${issue.fix}`);
                }
            }
        }

        console.log('\n========================================\n');

        if (errors.length > 0) {
            console.log('❌ VALIDATION FAILED: Fix errors before deploying to production!\n');
            process.exit(1);
        } else if (warnings.length > 0) {
            console.log('⚠️  VALIDATION PASSED WITH WARNINGS: Consider fixing before production.\n');
            process.exit(0);
        } else {
            console.log('✅ VALIDATION PASSED: Schema follows best practices!\n');
            process.exit(0);
        }

    } catch (error) {
        console.error('❌ Validation failed with error:', error);
        process.exit(1);
    }
}

main();
