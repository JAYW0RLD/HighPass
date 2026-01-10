-- [Final Fix] Missing INSERT policies for Developer Portal
BEGIN;

-- Developers (Create Profile)
DROP POLICY IF EXISTS "users_create_own_developer" ON developers;
CREATE POLICY "users_create_own_developer" ON developers
    FOR INSERT TO authenticated
    WITH CHECK (auth.uid() = user_id);

-- Wallets (Add Wallet)
DROP POLICY IF EXISTS "developers_add_own_wallets" ON wallets;
CREATE POLICY "developers_add_own_wallets" ON wallets
    FOR INSERT TO authenticated
    WITH CHECK (
        developer_id IN (SELECT id FROM developers WHERE user_id = auth.uid())
    );

COMMIT;
