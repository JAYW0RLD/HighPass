-- 10. Developers (Agent Owners)
CREATE TABLE IF NOT EXISTS developers (
    id uuid default gen_random_uuid() primary key,
    user_id uuid references auth.users not null,
    github_id text,
    total_reputation text default 'Grade C', -- Grade A, B, C, D, E, F
    global_debt_limit numeric default 5.0,   -- USD limit before forced settlement
    created_at timestamptz default now(),
    unique(user_id)
);

-- 11. Wallets (Agent Identities)
CREATE TABLE IF NOT EXISTS wallets (
    address text primary key, -- 0x...
    developer_id uuid references developers(id) on delete cascade,
    current_debt numeric default 0,
    status text default 'active', -- active, suspended
    created_at timestamptz default now()
);

-- RLS
ALTER TABLE developers ENABLE ROW LEVEL SECURITY;
ALTER TABLE wallets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own profile" ON developers;
CREATE POLICY "Users can view own profile" ON developers
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own profile" ON developers;
CREATE POLICY "Users can insert own profile" ON developers
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can manage own wallets" ON wallets;
CREATE POLICY "Users can manage own wallets" ON wallets
    USING ( auth.uid() = (select user_id from developers where id = developer_id) )
    WITH CHECK ( auth.uid() = (select user_id from developers where id = developer_id) );
