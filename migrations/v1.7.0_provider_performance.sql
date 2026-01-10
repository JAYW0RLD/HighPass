-- ============================================================================
-- v1.7.0 PROVIDER PERFORMANCE TRACKING
-- ============================================================================
-- On-Chain Performance Oracle Implementation
-- Security: Sybil Attack Prevention + Sliding Window Metrics
-- ============================================================================

BEGIN;

-- ============================================================================
-- SECTION 1: SCHEMA CHANGES
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1.1 Provider Performance Metrics Table
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS provider_performance_metrics (
    service_slug TEXT PRIMARY KEY REFERENCES services(slug) ON DELETE CASCADE,
    
    -- 전체 누적 지표 (Cumulative Metrics)
    avg_latency_ms NUMERIC NOT NULL DEFAULT 0 CHECK (avg_latency_ms >= 0),
    success_rate NUMERIC NOT NULL DEFAULT 0 CHECK (success_rate BETWEEN 0 AND 100),
    total_requests BIGINT NOT NULL DEFAULT 0 CHECK (total_requests >= 0),
    total_successes BIGINT NOT NULL DEFAULT 0 CHECK (total_successes >= 0),
    
    -- 슬라이딩 윈도우 지표 - 최근 7일 (Sliding Window - 7 Days)
    avg_latency_ms_7d NUMERIC NOT NULL DEFAULT 0 CHECK (avg_latency_ms_7d >= 0),
    success_rate_7d NUMERIC NOT NULL DEFAULT 0 CHECK (success_rate_7d BETWEEN 0 AND 100),
    total_requests_7d BIGINT NOT NULL DEFAULT 0 CHECK (total_requests_7d >= 0),
    
    -- 슬라이딩 윈도우 지표 - 최근 1000건 (Sliding Window - 1000 Requests)
    avg_latency_ms_1k NUMERIC NOT NULL DEFAULT 0 CHECK (avg_latency_ms_1k >= 0),
    success_rate_1k NUMERIC NOT NULL DEFAULT 0 CHECK (success_rate_1k BETWEEN 0 AND 100),
    
    -- Sybil Attack 방지 (Anti-Sybil Protection)
    unique_agent_count BIGINT NOT NULL DEFAULT 0 CHECK (unique_agent_count >= 0),
    
    -- 온체인 동기화 메타데이터 (On-Chain Sync Metadata)
    last_onchain_sync TIMESTAMPTZ,
    onchain_sync_count BIGINT NOT NULL DEFAULT 0 CHECK (onchain_sync_count >= 0),
    
    -- 감사 추적 (Audit Trail)
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE provider_performance_metrics IS 
'Provider API performance metrics with sliding window analysis and Sybil attack prevention';

COMMENT ON COLUMN provider_performance_metrics.avg_latency_ms IS 
'Cumulative average response time in milliseconds';

COMMENT ON COLUMN provider_performance_metrics.avg_latency_ms_7d IS 
'Average response time for requests in the last 7 days (sliding window)';

COMMENT ON COLUMN provider_performance_metrics.avg_latency_ms_1k IS 
'Average response time for the most recent 1000 requests (sliding window)';

COMMENT ON COLUMN provider_performance_metrics.unique_agent_count IS 
'Number of unique agent wallets that have called this service (prevents Sybil attacks)';

COMMENT ON COLUMN provider_performance_metrics.onchain_sync_count IS 
'Number of times metrics have been synced to blockchain (for gas cost tracking)';

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_perf_metrics_service 
ON provider_performance_metrics(service_slug);

CREATE INDEX IF NOT EXISTS idx_perf_metrics_sync_pending 
ON provider_performance_metrics(last_onchain_sync) 
WHERE last_onchain_sync IS NULL OR updated_at > last_onchain_sync;

-- Trigger for updated_at
CREATE TRIGGER set_provider_performance_updated_at
    BEFORE UPDATE ON provider_performance_metrics
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- SECTION 2: HELPER VIEWS (Sliding Window Calculations)
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 2.1 Recent Requests (7 Days)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE VIEW recent_requests_7d AS
SELECT 
    service_slug,
    agent_id,
    status,
    latency_ms,
    created_at
FROM requests
WHERE created_at >= NOW() - INTERVAL '7 days'
  AND service_slug IS NOT NULL;

COMMENT ON VIEW recent_requests_7d IS 
'Requests from the last 7 days for sliding window calculations';

-- ----------------------------------------------------------------------------
-- 2.2 Recent Requests (1000 most recent per service)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE VIEW recent_requests_1k AS
SELECT 
    service_slug,
    agent_id,
    status,
    latency_ms,
    created_at,
    ROW_NUMBER() OVER (PARTITION BY service_slug ORDER BY created_at DESC) as rn
FROM requests
WHERE service_slug IS NOT NULL;

COMMENT ON VIEW recent_requests_1k IS 
'Most recent 1000 requests per service for sliding window calculations';

-- ============================================================================
-- SECTION 3: TRIGGER FUNCTIONS (Real-time Updates)
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 3.1 Update Provider Performance Metrics
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION update_provider_performance()
RETURNS TRIGGER AS $$
DECLARE
    v_unique_agents BIGINT;
    v_avg_7d NUMERIC;
    v_success_rate_7d NUMERIC;
    v_total_7d BIGINT;
    v_avg_1k NUMERIC;
    v_success_rate_1k NUMERIC;
BEGIN
    -- Skip if service_slug is NULL (shouldn't happen with schema constraints)
    IF NEW.service_slug IS NULL THEN
        RETURN NEW;
    END IF;
    
    -- Calculate unique agent count (Sybil Attack prevention)
    SELECT COUNT(DISTINCT agent_id) INTO v_unique_agents
    FROM requests
    WHERE service_slug = NEW.service_slug
      AND agent_id IS NOT NULL;
    
    -- Calculate 7-day sliding window metrics
    SELECT 
        COALESCE(AVG(latency_ms) FILTER (WHERE latency_ms IS NOT NULL), 0),
        COALESCE(
            COUNT(*) FILTER (WHERE status = 200) * 100.0 / NULLIF(COUNT(*), 0),
            0
        ),
        COUNT(*)
    INTO v_avg_7d, v_success_rate_7d, v_total_7d
    FROM recent_requests_7d
    WHERE service_slug = NEW.service_slug;
    
    -- Calculate 1000-request sliding window metrics
    SELECT 
        COALESCE(AVG(latency_ms) FILTER (WHERE latency_ms IS NOT NULL), 0),
        COALESCE(
            COUNT(*) FILTER (WHERE status = 200) * 100.0 / NULLIF(COUNT(*), 0),
            0
        )
    INTO v_avg_1k, v_success_rate_1k
    FROM recent_requests_1k
    WHERE service_slug = NEW.service_slug 
      AND rn <= 1000;
    
    -- Update or insert performance metrics
    IF (NEW.status = 200 AND NEW.latency_ms IS NOT NULL) THEN
        -- Successful request with valid latency
        INSERT INTO provider_performance_metrics (
            service_slug,
            avg_latency_ms,
            success_rate,
            total_requests,
            total_successes,
            avg_latency_ms_7d,
            success_rate_7d,
            total_requests_7d,
            avg_latency_ms_1k,
            success_rate_1k,
            unique_agent_count
        )
        VALUES (
            NEW.service_slug,
            NEW.latency_ms,
            100, -- First request = 100% success
            1,
            1,
            v_avg_7d,
            v_success_rate_7d,
            v_total_7d,
            v_avg_1k,
            v_success_rate_1k,
            v_unique_agents
        )
        ON CONFLICT (service_slug) DO UPDATE SET
            -- Cumulative moving average
            avg_latency_ms = (
                (provider_performance_metrics.avg_latency_ms * provider_performance_metrics.total_requests + NEW.latency_ms)
                / (provider_performance_metrics.total_requests + 1)
            ),
            total_requests = provider_performance_metrics.total_requests + 1,
            total_successes = provider_performance_metrics.total_successes + 1,
            success_rate = (
                (provider_performance_metrics.total_successes + 1) * 100.0
                / (provider_performance_metrics.total_requests + 1)
            ),
            -- Sliding window updates
            avg_latency_ms_7d = v_avg_7d,
            success_rate_7d = v_success_rate_7d,
            total_requests_7d = v_total_7d,
            avg_latency_ms_1k = v_avg_1k,
            success_rate_1k = v_success_rate_1k,
            unique_agent_count = v_unique_agents,
            updated_at = NOW();
    ELSE
        -- Failed request or missing latency
        INSERT INTO provider_performance_metrics (
            service_slug,
            total_requests,
            avg_latency_ms_7d,
            success_rate_7d,
            total_requests_7d,
            avg_latency_ms_1k,
            success_rate_1k,
            unique_agent_count
        )
        VALUES (
            NEW.service_slug, 
            1,
            v_avg_7d,
            v_success_rate_7d,
            v_total_7d,
            v_avg_1k,
            v_success_rate_1k,
            v_unique_agents
        )
        ON CONFLICT (service_slug) DO UPDATE SET
            total_requests = provider_performance_metrics.total_requests + 1,
            success_rate = (
                provider_performance_metrics.total_successes * 100.0
                / (provider_performance_metrics.total_requests + 1)
            ),
            avg_latency_ms_7d = v_avg_7d,
            success_rate_7d = v_success_rate_7d,
            total_requests_7d = v_total_7d,
            avg_latency_ms_1k = v_avg_1k,
            success_rate_1k = v_success_rate_1k,
            unique_agent_count = v_unique_agents,
            updated_at = NOW();
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp;

COMMENT ON FUNCTION update_provider_performance() IS
'Real-time trigger to update provider performance metrics.
Calculates cumulative metrics + 7-day and 1000-request sliding windows.
Tracks unique agents for Sybil attack prevention.';

-- Create trigger on requests table
CREATE TRIGGER on_request_update_performance
    AFTER INSERT ON requests
    FOR EACH ROW
    EXECUTE FUNCTION update_provider_performance();

-- ============================================================================
-- SECTION 4: ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE provider_performance_metrics ENABLE ROW LEVEL SECURITY;

-- Service role full access
CREATE POLICY "service_role_all_perf_metrics" ON provider_performance_metrics
    FOR ALL TO service_role USING (true);

-- Public read (for Discovery Hub leaderboard)
CREATE POLICY "public_read_perf_metrics" ON provider_performance_metrics
    FOR SELECT USING (true);

-- Providers can view only their own metrics
CREATE POLICY "providers_view_own_perf_metrics" ON provider_performance_metrics
    FOR SELECT TO authenticated USING (
        service_slug IN (
            SELECT slug FROM services WHERE provider_id = auth.uid()
        )
    );

-- ============================================================================
-- VALIDATION
-- ============================================================================

DO $$
DECLARE
    v_table_exists BOOLEAN;
    v_view_count INTEGER;
    v_trigger_exists BOOLEAN;
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE 'v1.7.0 PROVIDER PERFORMANCE VALIDATION';
    RAISE NOTICE '========================================';
    
    -- Check table exists
    SELECT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_name = 'provider_performance_metrics'
    ) INTO v_table_exists;
    
    IF v_table_exists THEN
        RAISE NOTICE '✓ provider_performance_metrics table created';
    ELSE
        RAISE WARNING '✗ provider_performance_metrics table missing';
    END IF;
    
    -- Check views
    SELECT COUNT(*) INTO v_view_count
    FROM information_schema.views
    WHERE table_name IN ('recent_requests_7d', 'recent_requests_1k');
    
    RAISE NOTICE '✓ Helper views created: %', v_view_count;
    
    -- Check trigger
    SELECT EXISTS (
        SELECT 1 FROM pg_trigger
        WHERE tgname = 'on_request_update_performance'
    ) INTO v_trigger_exists;
    
    IF v_trigger_exists THEN
        RAISE NOTICE '✓ Performance update trigger installed';
    ELSE
        RAISE WARNING '✗ Performance update trigger missing';
    END IF;
    
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Migration Complete';
    RAISE NOTICE '========================================';
END;
$$;

COMMIT;
