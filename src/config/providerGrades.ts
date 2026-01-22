/**
 * Provider Performance Grading System
 * 
 * Grades: A (Excellent) -> F (Poor)
 * New providers start at: C (Average)
 * 
 * Off-chain calculation based on 7-day sliding window metrics
 */

export interface ProviderGradeCriteria {
    maxLatency: number;      // Maximum average latency (ms)
    minSuccessRate: number;  // Minimum success rate (%)
    minRequests: number;     // Minimum total requests
}

export const PROVIDER_GRADE_CRITERIA: Record<string, ProviderGradeCriteria> = {
    A: { // Excellent - Premium tier
        maxLatency: 200,
        minSuccessRate: 98.0,
        minRequests: 1000
    },
    B: { // Good - Above average
        maxLatency: 500,
        minSuccessRate: 95.0,
        minRequests: 100
    },
    C: { // Average - Default for new providers
        maxLatency: 1000,
        minSuccessRate: 90.0,
        minRequests: 10
    },
    D: { // Below Average
        maxLatency: 2000,
        minSuccessRate: 80.0,
        minRequests: 10
    },
    E: { // Poor
        maxLatency: 5000,
        minSuccessRate: 70.0,
        minRequests: 10
    },
    F: { // Very Poor - Default minimum
        maxLatency: Infinity,
        minSuccessRate: 0,
        minRequests: 0
    }
};

/**
 * Calculate provider grade based on performance metrics
 * Uses 7-day sliding window for current state assessment
 * 
 * @param metrics Performance data from database
 * @returns Grade (A-F) and qualification details
 */
export function calculateProviderGrade(metrics: {
    avg_latency_ms_7d: number;
    success_rate_7d: number;
    total_requests: number;
}): {
    grade: string;
    qualified: boolean;
    reason?: string;
} {
    // Default to C for new providers with insufficient data
    if (metrics.total_requests < 10) {
        return {
            grade: 'C',
            qualified: false,
            reason: 'Insufficient data (< 10 requests)'
        };
    }

    // Check from highest to lowest grade
    const grades = ['A', 'B', 'C', 'D', 'E', 'F'] as const;

    for (const grade of grades) {
        const criteria = PROVIDER_GRADE_CRITERIA[grade];

        const meetsLatency = metrics.avg_latency_ms_7d <= criteria.maxLatency;
        const meetsSuccessRate = metrics.success_rate_7d >= criteria.minSuccessRate;
        const meetsMinRequests = metrics.total_requests >= criteria.minRequests;

        if (meetsLatency && meetsSuccessRate && meetsMinRequests) {
            return {
                grade,
                qualified: true
            };
        }
    }

    // Fallback to F if no criteria met
    return {
        grade: 'F',
        qualified: true,
        reason: 'Does not meet minimum performance standards'
    };
}

/**
 * Get grade display information
 */
export function getProviderGradeInfo(grade: string): {
    name: string;
    color: string;
    description: string;
} {
    const gradeInfo: Record<string, { name: string; color: string; description: string }> = {
        A: {
            name: 'Excellent',
            color: '#10b981', // green-500
            description: 'Premium tier - Ultra-fast and highly reliable'
        },
        B: {
            name: 'Good',
            color: '#3b82f6', // blue-500
            description: 'Above average performance'
        },
        C: {
            name: 'Average',
            color: '#f59e0b', // amber-500
            description: 'Standard performance'
        },
        D: {
            name: 'Below Average',
            color: '#f97316', // orange-500
            description: 'Slower response times'
        },
        E: {
            name: 'Poor',
            color: '#ef4444', // red-500
            description: 'Significant performance issues'
        },
        F: {
            name: 'Very Poor',
            color: '#991b1b', // red-900
            description: 'Severe performance issues'
        }
    };

    return gradeInfo[grade] || gradeInfo.F;
}

/**
 * Provider Fee Discount based on Grade
 * Higher grades get lower platform fees as reward
 */
export const PROVIDER_GRADE_FEE_DISCOUNT: Record<string, number> = {
    A: 0.30,  // 30% discount (best)
    B: 0.20,  // 20% discount
    C: 0.00,  // No discount (baseline)
    D: -0.10, // 10% surcharge
    E: -0.20, // 20% surcharge
    F: -0.30  // 30% surcharge (worst)
};

/**
 * Calculate adjusted platform fee based on provider grade
 * 
 * @param baseFeeCro Base platform fee in CRO
 * @param providerGrade Provider's current grade
 * @returns Adjusted fee in CRO
 */
export function calculateProviderFee(baseFeeCro: number, providerGrade: string): number {
    const discount = PROVIDER_GRADE_FEE_DISCOUNT[providerGrade] || 0;
    const adjustedFee = baseFeeCro * (1 + discount);

    // Ensure fee doesn't go negative
    return Math.max(0, adjustedFee);
}
