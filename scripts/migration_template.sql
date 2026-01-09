-- ============================================================================
-- Migration XXX: [TITLE - Brief description of what this migration does]
-- ============================================================================
-- Author: [Your Name]
-- Date: [YYYY-MM-DD]
-- Related Issue: #[Issue Number] (if applicable)
--
-- ============================ PURPOSE ============================
-- [Explain WHY this migration is needed. What problem does it solve?]
--
-- ============================ CHANGES ============================
-- High-level summary of changes:
-- - [Change 1: e.g., "Add email_verified column to users table"]
-- - [Change 2: e.g., "Create index on users.email for faster lookups"]
-- - [Change 3: ...]
--
-- ============================ ROLLBACK ============================
-- How to undo this migration if needed:
-- [SQL commands to revert changes, or "Not reversible - requires manual cleanup"]
--
-- ============================ NOTES ============================
-- - [Any important notes, dependencies, or warnings]
-- - [Estimated runtime for large tables]
-- - [Breaking changes or required application updates]
-- ============================================================================

BEGIN;

-- ============================================================================
-- SECTION 1: [e.g., "Table Creation" or "Add Columns"]
-- ============================================================================

-- Example: Create new table
CREATE TABLE IF NOT EXISTS my_new_table (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    amount NUMERIC NOT NULL CHECK (amount >= 0),  -- NOT TEXT!
    status my_status_enum NOT NULL DEFAULT 'pending',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ
);

-- Add comments for documentation
COMMENT ON TABLE my_new_table IS 'Brief description of table purpose';
COMMENT ON COLUMN my_new_table.amount IS 'Description of what this amount represents (in Wei, USD, etc)';

-- ============================================================================
-- SECTION 2: [e.g., "Constraints and Validation"]
-- ============================================================================

-- Add constraints
ALTER TABLE my_new_table
DROP CONSTRAINT IF EXISTS valid_email,  -- Idempotent: drop if exists
ADD CONSTRAINT valid_email CHECK (email ~* '^.+@.+\..+$');

-- ============================================================================
-- SECTION 3: [e.g., "Indexes for Performance"]
-- ============================================================================

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_my_new_table_user_id 
ON my_new_table(user_id);

CREATE INDEX IF NOT EXISTS idx_my_new_table_created_at 
ON my_new_table(created_at DESC);  -- DESC if you query recent items first

-- Partial index for active items (faster than full index)
CREATE INDEX IF NOT EXISTS idx_my_new_table_active 
ON my_new_table(user_id, created_at) 
WHERE status = 'active';

-- ============================================================================
-- SECTION 4: [e.g., "Row Level Security (RLS)"]
-- ============================================================================

-- Enable RLS
ALTER TABLE my_new_table ENABLE ROW LEVEL SECURITY;

-- Drop old policies (idempotent)
DROP POLICY IF EXISTS "Users can view own records" ON my_new_table;
DROP POLICY IF EXISTS "Users can insert own records" ON my_new_table;

-- Create policies
CREATE POLICY "Users can view own records" ON my_new_table
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own records" ON my_new_table
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own records" ON my_new_table
    FOR UPDATE USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Service role full access (backend)
CREATE POLICY "Service role full access" ON my_new_table
    FOR ALL TO service_role USING (true);

-- ============================================================================
-- SECTION 5: [e.g., "Functions and Triggers"]
-- ============================================================================

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_my_new_table_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_my_new_table_updated_at ON my_new_table;
CREATE TRIGGER set_my_new_table_updated_at
    BEFORE UPDATE ON my_new_table
    FOR EACH ROW
    EXECUTE FUNCTION update_my_new_table_updated_at();

-- ============================================================================
-- SECTION 6: [e.g., "Data Migration" - if updating existing data]
-- ============================================================================

-- Example: Migrate existing data
-- UPDATE old_table SET new_column = CAST(old_column AS NUMERIC) WHERE new_column IS NULL;

-- ============================================================================
-- VALIDATION
-- ============================================================================

-- Verify migration succeeded
DO $$
DECLARE
    v_table_exists BOOLEAN;
    v_column_exists BOOLEAN;
    v_index_exists BOOLEAN;
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Migration XXX Validation';
    RAISE NOTICE '========================================';
    
    -- Check table exists
    SELECT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'my_new_table'
    ) INTO v_table_exists;
    
    IF NOT v_table_exists THEN
        RAISE EXCEPTION 'VALIDATION FAILED: Table my_new_table not created';
    END IF;
    RAISE NOTICE '✓ Table my_new_table exists';
    
    -- Check column exists and has correct type
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'my_new_table' 
        AND column_name = 'amount'
        AND data_type = 'numeric'
    ) INTO v_column_exists;
    
    IF NOT v_column_exists THEN
        RAISE EXCEPTION 'VALIDATION FAILED: Column amount not found or wrong type';
    END IF;
    RAISE NOTICE '✓ Column amount exists with type NUMERIC';
    
    -- Check index exists
    SELECT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE indexname = 'idx_my_new_table_user_id'
    ) INTO v_index_exists;
    
    IF NOT v_index_exists THEN
        RAISE WARNING 'Index idx_my_new_table_user_id not found (non-fatal)';
    ELSE
        RAISE NOTICE '✓ Index idx_my_new_table_user_id exists';
    END IF;
    
    -- Check RLS enabled
    IF NOT EXISTS (
        SELECT 1 FROM pg_tables 
        WHERE schemaname = 'public' 
        AND tablename = 'my_new_table' 
        AND rowsecurity = true
    ) THEN
        RAISE WARNING 'RLS not enabled on my_new_table';
    ELSE
        RAISE NOTICE '✓ RLS enabled on my_new_table';
    END IF;
    
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Migration XXX completed successfully ✓';
    RAISE NOTICE '========================================';
END $$;

COMMIT;

-- ============================================================================
-- POST-DEPLOYMENT VERIFICATION
-- ============================================================================

-- Run these commands manually after deploying to verify:
--
-- 1. Check table structure:
--    \d+ my_new_table
--
-- 2. Check indexes:
--    \di my_new_table*
--
-- 3. Check RLS policies:
--    \dp my_new_table
--
-- 4. Test insert:
--    INSERT INTO my_new_table (user_id, amount) VALUES (auth.uid(), 100);
--
-- 5. Test RLS:
--    SET ROLE authenticated;
--    SELECT * FROM my_new_table;  -- Should only see own records
--    RESET ROLE;
--
-- ============================================================================
