-- [Fix] Explicit RLS Policy for INSERTs on services table
BEGIN;

-- Drop existing policy to avoid conflict
DROP POLICY IF EXISTS "providers_manage_own_services" ON services;

-- Re-create policy with explicit WITH CHECK
CREATE POLICY "providers_manage_own_services" ON services
    FOR ALL TO authenticated
    USING (auth.uid() = provider_id)
    WITH CHECK (auth.uid() = provider_id);

COMMIT;
