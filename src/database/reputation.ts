import { query } from '../database/db';
import { REPUTATION_CONFIG } from '../config/reputation';

/**
 * Reputation Management Functions
 * v1.6.0: Dynamic penalty system
 */

// 내부 평판 조회
export async function getInternalReputation(
    agentId: string
): Promise<number | null> {
    try {
        const res = await query('SELECT internal_score FROM reputation_history WHERE agent_id = $1 LIMIT 1', [agentId]);
        return res.rows[0]?.internal_score ?? null;
    } catch (e) {
        console.error('[Reputation] Error fetching score:', e);
        return null;
    }
}

/**
 * Update reputation score based on payment
 * 
 * @param agentId Wallet address
 * @param amountUsd Amount in USD
 */
export async function updateScoreForPayment(
    agentId: string,
    amountUsd: number | bigint
): Promise<void> {
    // Convert to number if bigint
    const usdAmount = typeof amountUsd === 'bigint'
        ? Number(amountUsd) / 1e18  // Assume wei if bigint
        : amountUsd;

    try {
        // Use add_reputation_score function (assuming it's a SQL function)
        await query('SELECT add_reputation_score($1, $2)', [agentId, usdAmount]);
        console.log(`[Reputation] ✓ Added payment score: ${usdAmount} USD for ${agentId}`);
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
    const croAmount = Number(croWei) / 1e18;

    try {
        // Direct SQL update (no dedicated function needed for statistics)
        await query(`
            INSERT INTO reputation_history (agent_id, total_cro_volume)
            VALUES ($1, $2)
            ON CONFLICT (agent_id) DO UPDATE SET total_cro_volume = EXCLUDED.total_cro_volume
        `, [agentId, croAmount]);

        console.log(`[Reputation] ✓ Tracked CRO volume: ${croAmount.toFixed(4)} CRO for ${agentId}`);
    } catch (error) {
        console.warn('[Reputation] CRO tracking error (non-critical):', error);
    }
}

/**
 * v1.7.0: Performance Penalty (Simple Feedback Loop)
 * Deducts points if latency exceeds threshold.
 */
export async function applyPerformancePenalty(
    serviceSlug: string,
    actualLatency: number
): Promise<void> {
    // Simple threshold: 5000ms
    const THRESHOLD = 5000;

    if (actualLatency > THRESHOLD) {
        console.warn(`[Reputation] Performance Penalty triggered for ${serviceSlug}: ${actualLatency}ms > ${THRESHOLD}ms`);

        try {
            // Deduct 5 points from the provider's reputation score linked to this service
            const res = await query('SELECT provider_id FROM services WHERE slug = $1 LIMIT 1', [serviceSlug]);
            const service = res.rows[0];

            if (service?.provider_id) {
                await query('SELECT decrement_reputation_score($1, $2)', [service.provider_id, 5]);
            }
        } catch (e) {
            console.error('[Reputation] Failed to apply penalty:', e);
        }
    }
}
