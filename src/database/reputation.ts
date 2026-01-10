import { getSupabase } from '../utils/supabase';
import { REPUTATION_CONFIG } from '../config/reputation';

const supabase = getSupabase();

/**
 * Reputation Management Functions
 * v1.6.0: Dynamic penalty system
 */

// 내부 평판 조회
export async function getInternalReputation(
    agentId: string
): Promise<number | null> {
    if (!supabase) {
        console.warn('[Reputation] Supabase not initialized');
        return null;
    }

    const { data, error } = await supabase
        .from('reputation_history')
        .select('internal_score')
        .eq('agent_id', agentId)
        .single();

    if (error) {
        if (error.code === 'PGRST116') return null; // Not found
        console.error('[Reputation] Error fetching score:', error);
        return null;
    }

    return data?.internal_score ?? null;
}

/**
 * Update reputation score based on payment/deposit
 * v1.6.1: Now accepts USD amount (not CRO)
 * 
 * @param agentId Wallet address
 * @param amountUsd Amount in USD
 * @param method Payment method
 */
export async function updateScoreForPayment(
    agentId: string,
    amountUsd: number | bigint,
    method: 'prepaid' | 'credit' | 'deposit'
): Promise<void> {
    const supabase = getSupabase();
    if (!supabase) {
        throw new Error('Supabase client not initialized');
    }

    // Convert to number if bigint
    const usdAmount = typeof amountUsd === 'bigint'
        ? Number(amountUsd) / 1e18  // Assume wei if bigint
        : amountUsd;

    try {
        if (method === 'deposit') {
            // Use add_deposit_score function
            const { error } = await supabase.rpc('add_deposit_score', {
                p_agent_id: agentId,
                p_amount_cro: usdAmount  // Now USD, but function name kept for compatibility
            });

            if (error) {
                console.error('[Reputation] Error adding deposit score:', error);
                throw error;
            }

            console.log(`[Reputation] ✓ Added deposit score: ${usdAmount} USD for ${agentId}`);
        } else if (method === 'prepaid' || method === 'credit') {
            // Use add_reputation_score function
            const { error } = await supabase.rpc('add_reputation_score', {
                p_agent_id: agentId,
                p_amount: usdAmount
            });

            if (error) {
                console.error('[Reputation] Error adding payment score:', error);
                throw error;
            }

            console.log(`[Reputation] ✓ Added payment score: ${usdAmount} USD for ${agentId} (${method})`);
        }
    } catch (error) {
        console.error('[Reputation] Failed to update score:', error);
        throw error;
    }
}

/**
 * v1.6.1: Track CRO volume for statistics (does not affect score)
 * 
 * @param agentId Wallet address
 * @param croWei CRO amount in wei
 */
export async function trackCroVolume(
    agentId: string,
    croWei: bigint
): Promise<void> {
    const supabase = getSupabase();
    if (!supabase) {
        console.warn('[Reputation] Supabase not initialized, skipping CRO tracking');
        return;
    }

    const croAmount = Number(croWei) / 1e18;

    try {
        // Direct SQL update (no dedicated function needed for statistics)
        const { error } = await supabase
            .from('reputation_history')
            .upsert({
                agent_id: agentId,
                total_cro_volume: croAmount
            }, {
                onConflict: 'agent_id',
                ignoreDuplicates: false
            });

        if (error) {
            console.warn('[Reputation] Failed to track CRO volume:', error);
            // Don't throw - this is non-critical
        } else {
            console.log(`[Reputation] ✓ Tracked CRO volume: ${croAmount.toFixed(4)} CRO for ${agentId}`);
        }
    } catch (error) {
        console.warn('[Reputation] CRO tracking error (non-critical):', error);
    }
}

// 50% 미만 페널티 적용
export async function applyLowUtilizationPenalty(
    agentId: string
): Promise<void> {
    if (!supabase) return;

    const currentScore = await getInternalReputation(agentId);

    if (currentScore && currentScore > 0) {
        const penalty = currentScore * REPUTATION_CONFIG.LOW_UTILIZATION_PENALTY;

        await supabase.rpc('subtract_reputation_score', {
            p_agent_id: agentId,
            p_amount: penalty,
            p_min_score: REPUTATION_CONFIG.MIN_SCORE
        });

        console.log(`[Reputation] Applied 10% penalty to ${agentId}: -${penalty} CRO`);
    }
}

// 연체 페널티 (점수 절반)
export async function halveReputationForOverdue(
    agentId: string
): Promise<void> {
    if (!supabase) return;

    const { error } = await supabase.rpc('halve_reputation', {
        p_agent_id: agentId
    });

    if (error) {
        console.error('[Reputation] Error halving score:', error);
    } else {
        console.log(`[Reputation] Halved score for ${agentId} (overdue penalty)`);
    }
}
