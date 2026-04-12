-- RLS Hardening: ensure no user can see another pair's data
-- The original "Users can view partner profile" policy used profiles.paired_with
-- which is a user-writable column — a user could set it to any UUID and view
-- any other profile. Replace it with a pairs-table-based check instead.

-- Drop the weak policy
DROP POLICY IF EXISTS "Users can view partner profile" ON profiles;

-- Replace with a pairs-table-based policy:
-- You can see a profile only if you are in an active pair with that person.
-- This is authoritative — it reads from the pairs table which users cannot
-- directly manipulate to point at arbitrary profiles.
CREATE POLICY "Users can view active pair partner profile"
  ON profiles FOR SELECT USING (
    id IN (
      SELECT CASE
        WHEN mistress_id = auth.uid() THEN slave_id
        WHEN slave_id = auth.uid() THEN mistress_id
      END
      FROM pairs
      WHERE (mistress_id = auth.uid() OR slave_id = auth.uid())
        AND status = 'active'
    )
  );

-- Also lock down profile updates so users cannot write paired_with directly.
-- Pairing must go through the pairs table workflow.
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (
    auth.uid() = id
    -- Prevent users from self-assigning paired_with to an arbitrary UUID.
    -- paired_with must either remain unchanged OR match an active pair partner.
    AND (
      paired_with IS NULL
      OR paired_with IN (
        SELECT CASE
          WHEN mistress_id = auth.uid() THEN slave_id
          WHEN slave_id = auth.uid() THEN mistress_id
        END
        FROM pairs
        WHERE (mistress_id = auth.uid() OR slave_id = auth.uid())
          AND status = 'active'
      )
    )
  );
