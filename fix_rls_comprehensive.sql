-- [Security Fix] RLS Policy Hardening (v1.8.4)
-- Explicitly adding WITH CHECK clauses to all UPDATE/INSERT policies

BEGIN;

-- 1. Profiles (Update Own)
DROP POLICY IF EXISTS "users_update_own_profile" ON profiles;
CREATE POLICY "users_update_own_profile" ON profiles
    FOR UPDATE TO authenticated
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

-- 2. Developers (Update Own)
DROP POLICY IF EXISTS "users_update_own_developer" ON developers;
CREATE POLICY "users_update_own_developer" ON developers
    FOR UPDATE TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- 3. Wallets (Update Own)
DROP POLICY IF EXISTS "developers_update_own_wallets" ON wallets;
CREATE POLICY "developers_update_own_wallets" ON wallets
    FOR UPDATE TO authenticated
    USING (developer_id IN (SELECT id FROM developers WHERE user_id = auth.uid()))
    WITH CHECK (developer_id IN (SELECT id FROM developers WHERE user_id = auth.uid()));

-- 4. Provider Settings (Manage Own)
DROP POLICY IF EXISTS "providers_manage_own_settings" ON provider_settings;
CREATE POLICY "providers_manage_own_settings" ON provider_settings
    FOR ALL TO authenticated
    USING (auth.uid() = provider_id)
    WITH CHECK (auth.uid() = provider_id);

-- 5. Services (Manage Own) - Already fixed but ensuring consistency
DROP POLICY IF EXISTS "providers_manage_own_services" ON services;
CREATE POLICY "providers_manage_own_services" ON services
    FOR ALL TO authenticated
    USING (auth.uid() = provider_id)
    WITH CHECK (auth.uid() = provider_id);

COMMIT;
