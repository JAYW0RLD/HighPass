/**
 * Reputation System Configuration
 * 
 * 쉽게 조정 가능하도록 설정을 중앙화
 * v1.6.0: Payment flow settings added
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
    LOW_BALANCE: BigInt('10000000000000000'),  // 0.01 CRO (약 5회분)
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

// Payment Flow Settings (v1.6.0)
// 이 값들을 조정하여 시스템 동작 변경 가능
export const PAYMENT_FLOW_CONFIG = {
    // 예치금 우선 사용 여부
    PREPAID_FIRST: true,

    // 50% 미만 페널티 적용 여부
    APPLY_LOW_UTILIZATION_PENALTY: true,

    // 등급 강등 시 즉시 차단 여부
    BLOCK_ON_DOWNGRADE: true,

    // 경고 메시지 포함 여부
    INCLUDE_WARNINGS: true
} as const;

// Platform Fee Settings (v1.6.1)
// USD 과금 / CRO 수수료 분리
export const FEE_CONFIG = {
    // Platform fees (CRO-denominated)
    PLATFORM_FEE_RATE: 0.05,        // 5%
    MIN_PLATFORM_FEE_CRO: 0.01,     // 0.01 CRO minimum

    // Settlement fees (CRO flat)
    SETTLEMENT_FEE_CRO: 0.1,        // 0.1 CRO per settlement
} as const;

export type Grade = keyof typeof GRADE_THRESHOLDS;
