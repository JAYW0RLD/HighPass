-- Domain Verification Migration
-- Add verification columns to services table

ALTER TABLE services ADD COLUMN IF NOT EXISTS status text DEFAULT 'pending';
ALTER TABLE services ADD COLUMN IF NOT EXISTS verification_token text;
ALTER TABLE services ADD COLUMN IF NOT EXISTS verified_at timestamptz;

-- Create index for faster status lookups
CREATE INDEX IF NOT EXISTS idx_services_status ON services(status);

-- Comment for clarity
COMMENT ON COLUMN services.status IS 'Service verification status: pending | verified | rejected';
COMMENT ON COLUMN services.verification_token IS 'Random token for .well-known file verification';
COMMENT ON COLUMN services.verified_at IS 'Timestamp when domain ownership was verified';
