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

// 결제/입금 시 평판 업데이트
export async function updateScoreForPayment(
    agentId: string,
    amount: bigint,
    method: 'prepaid' | 'credit' | 'deposit'
): Promise<void> {
    if (!supabase) {
        console.warn('[Reputation] Supabase not initialized');
        return;
    }

    const amountCRO = Number(amount) / 1e18;

    if (method === 'prepaid') {
        // 예치금 결제: +
        await supabase.rpc('add_reputation_score', {
            p_agent_id: agentId,
            p_amount: amountCRO
        });
    }
    else if (method === 'deposit') {
        // 입금: +
        await supabase.rpc('add_deposit_score', {
            p_agent_id: agentId,
            p_amount_cro: amountCRO
        });
    }
    else if (method === 'credit') {
        // 외상 사용: -
        await supabase.rpc('subtract_reputation_score', {
            p_agent_id: agentId,
            p_amount: amountCRO,
            p_min_score: REPUTATION_CONFIG.MIN_SCORE
        });
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
