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

// 평판 설정
export const REPUTATION_CONFIG = {
    MIN_SCORE: -1000,              // 최저 점수
    SETTLEMENT_BONUS: 0.003,       // 정산 보너스 (CRO)
} as const;

// Payment Flow Settings (v1.6.0)
// x402 기반 정산 시스템 설정
export const PAYMENT_FLOW_CONFIG = {
    // 등급 강등 시 즉시 차단 여부
    BLOCK_ON_DOWNGRADE: true,

    // 경고 메시지 포함 여부
    INCLUDE_WARNINGS: true
} as const;

// Platform Fee Settings (v1.6.1)
// USD 과금 / CRO 수수료 분리
export const FEE_CONFIG = {
    // Platform fees (CRO-denominated)
    PLATFORM_FEE_RATE: 0.05,        // 5% (중앙 집중화된 표준 수수료율)
    MIN_PLATFORM_FEE_CRO: 0.01,     // 0.01 CRO minimum

    // Settlement fees (CRO flat)
    SETTLEMENT_FEE_CRO: 0.1,        // 0.1 CRO per settlement

    // Gas Margin for x402 Price Calculation
    GAS_MARGIN_PERCENT: 0.005       // 0.5% (가스비 변동 대비 마진)
} as const;

// Grade-Based Platform Fees (v1.6.1)
// A등급 = 낮은 수수료 (우대), F등급 = 높은 수수료
export const GRADE_BASED_FEES = {
    A: 0.02,  // 2% (가장 낮음)
    B: 0.03,  // 3%
    C: 0.04,  // 4%
    D: 0.05,  // 5%
    E: 0.06,  // 6%
    F: 0.08   // 8% (가장 높음)
} as const;

export type Grade = keyof typeof GRADE_THRESHOLDS;
