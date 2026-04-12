-- Fix: allow users to always read their own profile.
-- Migration 009_rls_hardening replaced the partner-view SELECT policy but
-- never ensured a self-view policy existed. Without this, unpaired users
-- (new accounts, demo accounts) get null back from any profile query —
-- causing infinite spinners or "Couldn't load profile" errors on onboard.

DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);
