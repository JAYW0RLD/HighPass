-- ============================================================================
-- Migration: v1.8.0_discovery_features
-- Description: Add categories, tags, and search capabilities for Discovery Hub
-- Security: GIN indexes for performance, Check constraints for inputs
-- ============================================================================

-- 1. Add Metadata Columns
ALTER TABLE services 
    ADD COLUMN IF NOT EXISTS category TEXT CHECK (length(category) <= 50),
    ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}'::TEXT[],
    ADD COLUMN IF NOT EXISTS description TEXT CHECK (length(description) <= 1000),
    -- MCP Support Infrastructure (JSON-LD / JSON Schema)
    ADD COLUMN IF NOT EXISTS capabilities JSONB DEFAULT '{}'::JSONB,
    -- Full Text Search Vector
    ADD COLUMN IF NOT EXISTS search_vector TSVECTOR;

-- 2. Add Comments
COMMENT ON COLUMN services.category IS 'Broad categorization (e.g., DeFi, AI, Infra)';
COMMENT ON COLUMN services.tags IS 'Specific feature tags for filtering';
COMMENT ON COLUMN services.description IS 'Human readable service description';
COMMENT ON COLUMN services.capabilities IS 'Machine-readable capabilities for MCP support';
COMMENT ON COLUMN services.search_vector IS 'Pre-computed lexemes for full-text search';

-- 3. Create Indexes for Search Performance
-- Index for Category Filtering
CREATE INDEX IF NOT EXISTS idx_services_category ON services(category);

-- GIN Index for Tag Filtering (Fast Array Contains check)
CREATE INDEX IF NOT EXISTS idx_services_tags ON services USING GIN(tags);

-- GIN Index for Full Text Search
CREATE INDEX IF NOT EXISTS idx_services_search ON services USING GIN(search_vector);

-- 4. Create Trigger for Auto-Updating Search Vector
-- Combines name, category, tags, and description for unified search
CREATE OR REPLACE FUNCTION services_search_vector_update()
RETURNS TRIGGER AS $$
BEGIN
    NEW.search_vector :=
        setweight(to_tsvector('english', COALESCE(NEW.name, '')), 'A') ||
        setweight(to_tsvector('english', COALESCE(NEW.category, '')), 'B') ||
        setweight(to_tsvector('english', array_to_string(NEW.tags, ' ')), 'C') ||
        setweight(to_tsvector('english', COALESCE(NEW.description, '')), 'D');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tsvector_update_services ON services;
CREATE TRIGGER tsvector_update_services
    BEFORE INSERT OR UPDATE ON services
    FOR EACH ROW
    EXECUTE FUNCTION services_search_vector_update();

-- 5. Force update existing rows to populate search_vector
UPDATE services SET id = id;
