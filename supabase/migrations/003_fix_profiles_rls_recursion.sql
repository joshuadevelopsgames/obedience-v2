-- ============================================
-- Fix infinite recursion in profiles RLS
-- ============================================
-- The "Users can view partner profile" policy queries profiles
-- from within a policy on profiles, causing infinite recursion.
-- Fix: use a SECURITY DEFINER function to bypass RLS for the lookup.

-- 1. Create a helper that reads paired_with without triggering RLS
CREATE OR REPLACE FUNCTION get_partner_id(uid uuid)
RETURNS uuid AS $$
  SELECT paired_with FROM profiles WHERE id = uid;
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- 2. Drop the recursive policy
DROP POLICY IF EXISTS "Users can view partner profile" ON profiles;

-- 3. Recreate it using the safe helper
CREATE POLICY "Users can view partner profile"
  ON profiles FOR SELECT USING (
    id = get_partner_id(auth.uid())
  );
