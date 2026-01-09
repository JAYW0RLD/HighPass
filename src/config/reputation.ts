/**
 * Reputation System Configuration
 * 
 * 쉽게 조정 가능하도록 설정을 중앙화
 */

// 등급 기준 (CRO 단위)
export const GRADE_THRESHOLDS = {
    A: 250,
    B: 150,
    C: 100,
    D: 50,
    E: 10,
    F: 0
} as const;

// 외상 한도 (Wei 단위)
export const DEBT_LIMITS = {
    A: BigInt('5000000000000000000'),   // $5
    B: BigInt('3000000000000000000'),   // $3
    C: BigInt('1000000000000000000'),   // $1
    D: BigInt('500000000000000000'),    // $0.5
    E: BigInt('100000000000000000'),    // $0.1
    F: BigInt('0')                      // 선결제만
} as const;

// 경고 기준
export const WARNING_THRESHOLDS = {
    LOW_BALANCE: BigInt('10000000000000000'),  // 0.01 CRO
    HIGH_DEBT: 0.8,                             // 80%
    LOW_UTILIZATION_PENALTY: 0.5                // 50%
} as const;

// 평판 설정
export const REPUTATION_CONFIG = {
    MIN_SCORE: -1000,              // 최저 점수
    SETTLEMENT_BONUS: 0.003,       // 정산 보너스 (CRO)
    LOW_UTILIZATION_PENALTY: 0.1,  // 50% 미만 페널티 (10%)
    OVERDUE_HALVE_THRESHOLD: 0.5   // 연체 절반 기준 (50%)
} as const;

export type Grade = keyof typeof GRADE_THRESHOLDS;
