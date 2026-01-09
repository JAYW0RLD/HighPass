-- Nonce Tracking for Replay Attack Prevention
-- This table stores used nonces with TTL for automatic cleanup

CREATE TABLE IF NOT EXISTS used_nonces (
    nonce text primary key,
    agent_id text not null,
    created_at timestamptz default now()
);

-- Index for TTL-based cleanup queries
CREATE INDEX IF NOT EXISTS idx_nonces_created_at ON used_nonces(created_at);

-- Optional: Automatic cleanup function (runs periodically via cron or trigger)
-- Deletes nonces older than 5 minutes
CREATE OR REPLACE FUNCTION cleanup_expired_nonces()
RETURNS void AS $$
BEGIN
    DELETE FROM used_nonces 
    WHERE created_at < NOW() - INTERVAL '5 minutes';
END;
$$ LANGUAGE plpgsql;

-- Comments
COMMENT ON TABLE used_nonces IS 'Tracks used authentication nonces to prevent replay attacks. Nonces expire after 5 minutes.';
COMMENT ON COLUMN used_nonces.nonce IS 'Unique nonce (UUID v4) used in signature authentication';
COMMENT ON COLUMN used_nonces.agent_id IS 'Agent ID that used this nonce';
COMMENT ON COLUMN used_nonces.created_at IS 'Timestamp when nonce was first used';
