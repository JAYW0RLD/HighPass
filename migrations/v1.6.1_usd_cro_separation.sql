-- ============================================================================
-- v1.6.1 USD/CRO CURRENCY SEPARATION
-- ============================================================================
-- Breaking Change: Rename CRO columns to USD
-- Rationale: Usage fees in USD, Platform fees in CRO
--
-- CHANGES:
-- - total_deposits_cro → total_deposits_usd
-- - total_payments_cro → total_payments_usd
-- + total_cro_volume (tracking only)
-- ============================================================================

BEGIN;

-- ============================================================================
-- SECTION 1: COLUMN RENAMING (Breaking Change)
-- ============================================================================

-- Rename deposits column
ALTER TABLE reputation_history 
  RENAME COLUMN total_deposits_cro TO total_deposits_usd;

-- Rename payments column
ALTER TABLE reputation_history 
  RENAME COLUMN total_payments_cro TO total_payments_usd;

-- Update comments
COMMENT ON COLUMN reputation_history.total_deposits_usd IS 
  'Total deposits in USD (converted from CRO at deposit time)';

COMMENT ON COLUMN reputation_history.total_payments_usd IS 
  'Total successful payments in USD (converted from CRO)';

-- ============================================================================
-- SECTION 2: ADD CRO TRACKING (Statistics)
-- ============================================================================

-- Add CRO volume column for statistics
ALTER TABLE reputation_history 
  ADD COLUMN IF NOT EXISTS total_cro_volume NUMERIC NOT NULL DEFAULT 0 
  CHECK (total_cro_volume >= 0);

COMMENT ON COLUMN reputation_history.total_cro_volume IS 
  'Total CRO volume (deposits + payments) for statistics. Does not affect score.';

-- ============================================================================
-- SECTION 3: UPDATE INTERNAL SCORE COMMENT
-- ============================================================================

COMMENT ON COLUMN reputation_history.internal_score IS 
  'Reputation score in USD (not CRO). Formula: deposits + payments - credit_used. Range: -1000 to unlimited.';

-- ============================================================================
-- SECTION 4: DATA MIGRATION (if existing data)
-- ============================================================================

-- Note: No data conversion needed if starting fresh
-- If you have existing data in production, you would need to:
-- UPDATE reputation_history 
-- SET total_deposits_usd = total_deposits_usd * <current_cro_price>
-- WHERE total_deposits_usd > 0;

-- ============================================================================
-- VALIDATION
-- ============================================================================

DO $$
DECLARE
    v_deposits_exists BOOLEAN;
    v_payments_exists BOOLEAN;
    v_volume_exists BOOLEAN;
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE 'v1.6.1 USD/CRO SEPARATION VALIDATION';
    RAISE NOTICE '========================================';

    -- Check total_deposits_usd column
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'reputation_history' 
        AND column_name = 'total_deposits_usd'
    ) INTO v_deposits_exists;
    
    IF v_deposits_exists THEN
        RAISE NOTICE '✓ total_deposits_usd column exists';
    ELSE
        RAISE WARNING '✗ total_deposits_usd column missing';
    END IF;

    -- Check total_payments_usd column
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'reputation_history' 
        AND column_name = 'total_payments_usd'
    ) INTO v_payments_exists;
    
    IF v_payments_exists THEN
        RAISE NOTICE '✓ total_payments_usd column exists';
    ELSE
        RAISE WARNING '✗ total_payments_usd column missing';
    END IF;

    -- Check total_cro_volume column
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'reputation_history' 
        AND column_name = 'total_cro_volume'
    ) INTO v_volume_exists;
    
    IF v_volume_exists THEN
        RAISE NOTICE '✓ total_cro_volume column added';
    ELSE
        RAISE WARNING '✗ total_cro_volume column missing';
    END IF;

    -- Check for old columns (should not exist)
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'reputation_history' 
        AND column_name = 'total_deposits_cro'
    ) THEN
        RAISE WARNING '✗ Old column total_deposits_cro still exists (migration incomplete)';
    ELSE
        RAISE NOTICE '✓ Old column total_deposits_cro removed';
    END IF;

    RAISE NOTICE '========================================';
    RAISE NOTICE 'Migration Complete';
    RAISE NOTICE '========================================';
END;
$$;

COMMIT;
