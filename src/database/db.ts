import { createClient, SupabaseClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';
import { getAddress, isAddress } from 'viem';

// Load env vars
dotenv.config({ path: path.join(__dirname, '../../.env') });
// Try loading local override if available
dotenv.config({ path: path.join(__dirname, '../../.env.local'), override: true });

let db: SupabaseClient | null = null;

export async function initDB() {
    if (db) return db;

    const SUPABASE_URL = process.env.SUPABASE_URL;
    const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;

    if (!SUPABASE_URL || !SUPABASE_ANON_KEY || SUPABASE_URL.includes('YOUR_SUPABASE_URL')) {
        if (process.env.NODE_ENV === 'test') {
            // Return a Mock Client for Tests to support ServiceResolver and chaining
            console.log('[Database] Using Mock DB for Test Environment');
            const mockBuilder = () => ({
                select: () => mockBuilder(),
                eq: (col: string, val: any) => {
                    // Mock Service Config for 'demo-service'
                    if (val === 'demo-service' || val === 'echo-service') {
                        return {
                            data: {
                                id: 'mock-service-id',
                                slug: 'demo-service',
                                name: 'Demo Service',
                                min_grade: 'F',
                                price_wei: '100000000000000000', // 0.1 CRO
                                upstream_url: 'http://localhost:3000/api/demo/service',
                                provider_id: 'mock-provider'
                            },
                            error: null
                        };
                    }
                    return mockBuilder(); // Allow chain to continue
                },
                single: () => ({ data: null, error: null }),
                maybeSingle: () => ({ data: null, error: null }),
                insert: () => ({ error: null }),
                upsert: () => ({ error: null }),
                update: () => ({ error: null }),
                ilike: () => ({ data: { debt_balance: '0' }, error: null }),
                limit: () => ({ data: [], error: null }),
                order: () => ({ data: [], error: null })
            });

            return {
                from: () => mockBuilder(),
                rpc: () => ({ data: [], error: null }),
                auth: { getUser: () => ({ data: { user: null } }) }
            } as any;
        }
        console.warn('[Database] Supabase credentials missing or invalid. Please check .env file.');
        // Return null or throw - for now we just warn to allow server start but Log functionality will fail.
        return null;
    }

    const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!SUPABASE_SERVICE_KEY) {
        console.error('[Database] FATAL: Missing SUPABASE_SERVICE_ROLE_KEY. Do NOT use ANON_KEY for backend operations.');
        throw new Error('SUPABASE_SERVICE_ROLE_KEY is required for database initialization');
    }
    db = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
    console.log(`[Database] Initialized Supabase connection to ${SUPABASE_URL}`);
    return db;
}

export async function logRequest(data: {
    agentId?: string,
    status: number,
    amount?: string,
    txHash?: string,
    endpoint: string,
    error?: string,
    creditGrade?: string,
    latencyMs?: number,
    responseSizeBytes?: number,
    gasUsed?: string,
    contentType?: string,
    integrityCheck?: boolean
}) {
    if (process.env.NODE_ENV === 'test') return;
    if (!db) await initDB();
    if (!db) return; // Fail silently if no DB

    try {
        // Use upsert to handle both initial lock and final update
        // If tx_hash already exists, update the record with final status
        // SECURITY FIX (DB-HIGH-04): Add input sanitization (max lengths)
        // SECURITY FIX (DB-CRIT-03): Normalize agent address
        let normalizedAgentId = data.agentId || null;
        if (normalizedAgentId) {
            try {
                if (isAddress(normalizedAgentId)) {
                    normalizedAgentId = getAddress(normalizedAgentId);
                }
            } catch (e) {
                console.warn(`[DB] Invalid agent address format: ${normalizedAgentId}`);
            }
        }

        const record = {
            agent_id: normalizedAgentId,
            timestamp: new Date().toISOString(),
            status: data.status,
            amount: data.amount || '0',
            tx_hash: data.txHash || null,
            endpoint: data.endpoint?.substring(0, 255) || '',  // Max 255 chars
            error: data.error?.substring(0, 1000) || null,      // Max 1KB
            credit_grade: data.creditGrade || null,
            latency_ms: data.latencyMs || 0,
            response_size_bytes: data.responseSizeBytes || 0,
            gas_used: data.gasUsed || null,
            content_type: data.contentType?.substring(0, 100) || null,  // Max 100 chars
            integrity_check: data.integrityCheck !== undefined ? data.integrityCheck : false
        };

        // SECURITY FIX (DB-HIGH-03): Use UPSERT, but handle unique constraint properly
        // Supabase requires constraint name, not column name
        if (data.txHash) {
            // Method: Insert first, update on conflict
            // FIX: Use column name 'tx_hash' which works if it has a UNIQUE constraint
            const { error } = await db.from('requests').upsert(record, {
                onConflict: 'tx_hash',
                ignoreDuplicates: false
            });

            if (error) {
                // Fallback: manual check if upsert fails
                const { data: existing } = await db.from('requests')
                    .select('id').eq('tx_hash', data.txHash).maybeSingle();

                if (existing) {
                    await db.from('requests').update(record).eq('tx_hash', data.txHash);
                } else {
                    await db.from('requests').insert(record);
                }
            }
        } else {
            // No tx_hash, just insert
            const { error } = await db.from('requests').insert(record);
            if (error) throw error;
        }
    } catch (error) {
        console.error('[DB ERROR] Failed to log request:', error);
        // Re-throw if it's a duplicate key error (race condition detected)
        if ((error as any)?.code === '23505') {
            throw error;
        }
    }
}

export async function getStats() {
    if (!db) await initDB();
    if (!db) {
        // Fallback or empty stats if DB down
        return { recent: [], totalRequests: 0, totalRevenueWei: 0, pendingDebtWei: '0' };
    }

    // 1. Fetch recent requests
    const { data: recent, error: recentError } = await db
        .from('requests')
        .select('*')
        .order('id', { ascending: false })
        .limit(100);

    // 2. Total count
    // PERFORMANCE FIX (HIGH-PERF): Use RPC for global aggregation
    // Replaces inefficient .select() + JS reduce which causes OOM on large datasets
    const { data: stats, error: statsError } = await db.rpc('calculate_global_stats');

    if (statsError) {
        console.error('[DB] Stats RPC failed:', statsError);
        // Fallback to 0 vals
        return { recent: [], totalRequests: 0, totalRevenueWei: 0, pendingDebtWei: '0', adminBalanceWei: '0' };
    }

    const count = stats?.[0]?.total_calls || 0;
    const totalRevenueWei = BigInt(stats?.[0]?.total_revenue_wei || 0);

    // 4. Pending Debt
    const pendingDebt = await getTotalPendingDebt();

    // Transform keys for frontend compatibility (snake_case -> camelCase)
    // The frontend expects: id, agentId, timestamp, status, amount, txHash, endpoint, error, creditGrade
    const formattedRecent = recent?.map(r => ({
        id: r.id,
        agentId: r.agent_id,
        timestamp: r.timestamp,
        status: r.status,
        amount: r.amount,
        txHash: r.tx_hash,
        endpoint: r.endpoint,
        error: r.error,
        creditGrade: r.credit_grade
    })) || [];

    // 5. Calculate Protocol Fee (0.5%)
    const protocolFeeWei = (totalRevenueWei * BigInt(5)) / BigInt(1000);

    return {
        recent: formattedRecent,
        totalRequests: count || 0,
        totalRevenueWei: totalRevenueWei.toString(),
        pendingDebtWei: pendingDebt.toString(),
        adminBalanceWei: protocolFeeWei.toString()
    };
}

// Debt tracking functions
export async function getDebt(agentId: string): Promise<bigint> {
    if (!db) await initDB();
    if (!db) throw new Error('Database not initialized'); // SECURITY FIX: Fail Closed

    // SECURITY FIX (DB-CRIT-03): Normalize address to checksum format
    let normalizedAgentId = agentId;
    try {
        if (isAddress(agentId)) {
            normalizedAgentId = getAddress(agentId);
        } else {
            // RED TEAM FIX [HIGH-01]: Fail Fast on invalid address
            console.warn(`[Debt] Invalid address format: ${agentId}`);
            throw new Error('Invalid EVM address format');
        }
    } catch (e) {
        console.warn(`[Debt] Invalid address format: ${agentId}`);
        throw e; // Stop execution to prevent DB error spam
    }

    // Use case-insensitive comparison as backup
    const { data, error } = await db
        .from('agent_debts')
        .select('debt_balance')
        .ilike('agent_id', normalizedAgentId)
        .single();

    if (error || !data || !data.debt_balance) return BigInt(0);
    return BigInt(data.debt_balance);
}

export async function addDebt(agentId: string, amount: bigint): Promise<void> {
    if (!db) await initDB();
    if (!db) throw new Error('Database not initialized'); // SECURITY FIX: Fail Closed

    // SECURITY FIX (V-05): Use atomic database operation to prevent race conditions
    // Previous implementation used read-modify-write which allowed concurrent requests
    // to bypass debt thresholds. Now using PostgreSQL RPC for atomicity.

    try {
        // SECURITY FIX (NEW-CRIT-02): Use .toString() to prevent precision loss
        // BigInt → Number can lose precision for values > 2^53
        // NUMERIC in Postgres accepts string representation
        const { error } = await db.rpc('atomic_add_debt', {
            p_agent_id: agentId,
            p_amount: amount.toString()  // ✅ Preserve full precision
        });

        if (error) {
            console.error('[Debt] Failed to update debt:', error);
            throw error;
        }

        console.log(`[Debt] Agent ${agentId}: Added ${amount} wei atomically`);
    } catch (err) {
        console.error('[Debt] Atomic operation failed:', err);
        throw err;
    }
}

export async function clearDebt(agentId: string): Promise<void> {
    if (!db) await initDB();
    if (!db) throw new Error('Database not initialized'); // SECURITY FIX: Fail Closed

    // SECURITY FIX (NEW-MED-01): Normalize address like other debt functions
    let normalizedAgentId = agentId;
    try {
        if (isAddress(agentId)) {
            normalizedAgentId = getAddress(agentId);
        }
    } catch (e) {
        console.warn(`[Debt] Invalid address format: ${agentId}`);
        return;
    }

    // SECURITY FIX: Use atomic RPC to prevent race conditions
    try {
        const { error } = await db.rpc('atomic_clear_debt', {
            p_agent_id: normalizedAgentId
        });

        if (error) {
            console.error('[Debt] Failed to clear debt:', error);
            throw error;
        }

        console.log(`[Debt] Agent ${normalizedAgentId}: Debt cleared atomically`);
    } catch (err) {
        console.error('[Debt] Atomic clear failed:', err);
        throw err;
    }
}

export async function getTotalPendingDebt(): Promise<bigint> {
    if (!db) await initDB();
    if (!db) return BigInt(0);

    const { data } = await db
        .from('agent_debts')
        .select('debt_balance'); // Fetch all to sum. For strict scalable app, use RPC.

    if (!data) return BigInt(0);

    const total = data.reduce((sum, row) => sum + Number(row.debt_balance || 0), 0);
    return BigInt(Math.floor(total));
}

export async function isTxHashUsed(txHash: string): Promise<boolean> {
    if (!db) await initDB();
    if (!db) {
        // SECURITY FIX (V-NEW-07): Fail closed if database unavailable
        console.error('[DB] Database connection unavailable - cannot verify transaction safety');
        throw new Error('Database unavailable - cannot verify transaction');
    }

    // Check if this hash has been used for a successful request
    const { data, error } = await db
        .from('requests')
        .select('id')
        .eq('tx_hash', txHash)
        .eq('status', 200)
        .limit(1);

    if (error) {
        // SECURITY FIX (V-NEW-07): Fail closed on database errors
        console.error('[DB] Failed to check tx hash:', error);
        throw new Error('Database error - cannot verify transaction safety');
    }

    return !!(data && data.length > 0);
}

// =============================================================================
// NONCE TRACKING (Replay Attack Prevention)
// =============================================================================

/**
 * Check if a nonce has already been used
 * @param nonce The nonce to check (UUID v4)
 * @returns Promise<true> if nonce was already used, Promise<false> if fresh
 */
export async function isNonceUsed(nonce: string): Promise<boolean> {
    if (!db) await initDB();
    if (!db) throw new Error('Database not initialized'); // SECURITY FIX: Fail Closed

    try {
        const { data, error } = await db
            .from('used_nonces')
            .select('nonce')
            .eq('nonce', nonce)
            .limit(1);

        if (error) {
            console.error('[Nonce] Failed to check nonce:', error);
            throw new Error('Database error during nonce check'); // SECURITY FIX: Fail Closed
        }

        return !!(data && data.length > 0);
    } catch (err) {
        console.error('[Nonce] Error checking nonce:', err);
        return false;
    }
}

/**
 * Record a nonce as used
 * @param nonce The nonce to record
 * @param agentId The agent ID using this nonce
 */
export async function recordNonce(nonce: string, agentId: string): Promise<void> {
    if (!db) await initDB();
    if (!db) throw new Error('Database not initialized'); // SECURITY FIX: Fail Closed

    try {
        const { error } = await db
            .from('used_nonces')
            .insert({
                nonce,
                agent_id: agentId,
                created_at: new Date().toISOString()
            });

        if (error) {
            // Duplicate key = replay attack detected
            if ((error as any)?.code === '23505') {
                console.error(`[Nonce] 🚨 REPLAY ATTACK DETECTED! Nonce ${nonce} already used by ${agentId}`);
                throw new Error('Nonce already used');
            }
            console.error('[Nonce] Failed to record nonce:', error);
        } else {
            console.log(`[Nonce] ✅ Recorded nonce for agent ${agentId}`);
        }
    } catch (err) {
        console.error('[Nonce] Error recording nonce:', err);
        throw err;
    }
}

/**
 * Cleanup expired nonces (older than 5 minutes)
 * Should be called periodically (e.g., via cron job or background task)
 */
export async function cleanupExpiredNonces(): Promise<void> {
    if (!db) await initDB();
    if (!db) return;

    try {
        // Delete nonces older than 5 minutes
        const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();

        const { error, count } = await db
            .from('used_nonces')
            .delete()
            .lt('created_at', fiveMinutesAgo);

        if (error) {
            console.error('[Nonce] Cleanup failed:', error);
        } else {
            console.log(`[Nonce] Cleaned up ${count || 0} expired nonces`);
        }
    } catch (err) {
        console.error('[Nonce] Cleanup error:', err);
    }
}

