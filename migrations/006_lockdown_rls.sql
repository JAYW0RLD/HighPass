-- DATA PRIVACY LOCKDOWN
-- Enable RLS on all remaining tables and restrict permissive policies

-- 1. Requests (Logs)
ALTER TABLE requests ENABLE ROW LEVEL SECURITY;

-- Policy: Only Service Role (Backend) can INSERT/UPDATE requests
-- Policy: Providers can SEE requests for their own services? 
--         This requires joining with services table. Complex for RLS.
--         For now, allow Service Role full access. Providers access logs via API (which uses Service Role).
--         So we DENY direct access to `requests` for Anon/Auth users.
CREATE POLICY "Service Role Full Access Requests" ON requests
    FOR ALL TO service_role USING (true) WITH CHECK (true);


-- 2. Agent Debts
ALTER TABLE agent_debts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service Role Full Access Debts" ON agent_debts
    FOR ALL TO service_role USING (true) WITH CHECK (true);


-- 3. Used Nonces
ALTER TABLE used_nonces ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service Role Full Access Nonces" ON used_nonces
    FOR ALL TO service_role USING (true) WITH CHECK (true);


-- 4. Wallets (Fix "Public read")
-- Drop existing permissive policy
DROP POLICY IF EXISTS "Public read wallets" ON wallets;

-- Restrict to Service Role (and maybe Owner if we link wallet to auth user in future)
-- For Gatekeeper functionality, Backend (Service Role) needs access.
CREATE POLICY "Service Role Full Access Wallets" ON wallets
    FOR ALL TO service_role USING (true) WITH CHECK (true);
    
-- Allow Users to view THEIR OWN linked wallets
-- Logic: Wallet -> Developer -> User
CREATE POLICY "Users view own wallets" ON wallets
    FOR SELECT USING (
        developer_id IN (
            SELECT id FROM developers WHERE user_id = auth.uid()
        )
    );


-- 5. Developers (Fix "Auth read all")
DROP POLICY IF EXISTS "Auth read developers" ON developers;

-- Allow Users to view THEIR OWN developer profile
CREATE POLICY "Users view own developer profile" ON developers
    FOR SELECT USING (auth.uid() = user_id);

-- Service Role access
CREATE POLICY "Service Role Full Access Developers" ON developers
    FOR ALL TO service_role USING (true) WITH CHECK (true);

