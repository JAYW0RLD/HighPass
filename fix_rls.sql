-- ==========================================
-- FIX: Missing RLS Policy for 'services' table
-- ==========================================
-- Run this in your Supabase SQL Editor to allow providers 
-- to view (SELECT) the services they created.
-- Without this, fetching services or inserting with .select() fails.

-- 1. Check if policy exists and drop it to be safe (idempotent)
DROP POLICY IF EXISTS "Providers can view own services" ON services;

-- 2. Create the missing SELECT policy
CREATE POLICY "Providers can view own services" ON services
    FOR SELECT USING (auth.uid() = provider_id);

-- 3. Verify it worked (Optional check)
-- SELECT * FROM pg_policies WHERE tablename = 'services';
