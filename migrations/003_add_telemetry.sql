-- Migration: Add Telemetry Columns (Enhanced)
-- Description: Adds latency, response size, gas tracking, content type, and integrity check to requests table.

ALTER TABLE requests
ADD COLUMN IF NOT EXISTS latency_ms INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS response_size_bytes INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS gas_used TEXT,
ADD COLUMN IF NOT EXISTS content_type TEXT,
ADD COLUMN IF NOT EXISTS integrity_check BOOLEAN DEFAULT FALSE;

COMMENT ON COLUMN requests.latency_ms IS 'Time in milliseconds from request receipt to response finish';
COMMENT ON COLUMN requests.response_size_bytes IS 'Size of the response body in bytes';
COMMENT ON COLUMN requests.gas_used IS 'Estimated gas used for the transaction if applicable';
COMMENT ON COLUMN requests.content_type IS 'MIME type of the response (e.g. application/json)';
COMMENT ON COLUMN requests.integrity_check IS 'True if response body was valid JSON (Success Integrity)';
