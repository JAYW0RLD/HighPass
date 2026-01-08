
-- 8. Provider Settings (Settlements)
CREATE TABLE IF NOT EXISTS provider_settings (
    provider_id uuid primary key references profiles(id) on delete cascade,
    withdrawal_address text,         -- Wallet address to receive funds
    auto_withdraw_enabled boolean default false,
    min_withdrawal_amount text default '1000000000000000000', -- Default 1 CRO (in Wei)
    updated_at timestamptz default now()
);

-- 9. Withdrawals History
CREATE TABLE IF NOT EXISTS withdrawals (
    id uuid default gen_random_uuid() primary key,
    provider_id uuid references profiles(id) on delete cascade,
    amount_wei text not null,
    to_address text not null,
    tx_hash text,
    status text default 'pending', -- pending | completed | failed
    created_at timestamptz default now()
);

-- RLS for Settings
ALTER TABLE provider_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE withdrawals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage own settings" ON provider_settings;
CREATE POLICY "Users can manage own settings" ON provider_settings
    USING (auth.uid() = provider_id)
    WITH CHECK (auth.uid() = provider_id);

DROP POLICY IF EXISTS "Users can view own withdrawals" ON withdrawals;
CREATE POLICY "Users can view own withdrawals" ON withdrawals
    FOR SELECT USING (auth.uid() = provider_id);
