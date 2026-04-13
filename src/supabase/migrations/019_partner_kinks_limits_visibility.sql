-- ============================================================
-- Allow pair members to view each other's kinks and limits
-- The existing "own" policies only allow auth.uid() = profile_id.
-- These new policies add cross-profile SELECT for active pair partners.
-- ============================================================

-- profile_kinks: allow viewing partner's kinks when in an active pair
DROP POLICY IF EXISTS "Pair members can view partner kinks" ON profile_kinks;
CREATE POLICY "Pair members can view partner kinks" ON profile_kinks
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM pairs
      WHERE status = 'active'
        AND (
          (mistress_id = auth.uid() AND slave_id = profile_id)
          OR (slave_id = auth.uid() AND mistress_id = profile_id)
        )
    )
  );

-- profile_limits: allow viewing partner's limits when in an active pair
DROP POLICY IF EXISTS "Pair members can view partner limits" ON profile_limits;
CREATE POLICY "Pair members can view partner limits" ON profile_limits
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM pairs
      WHERE status = 'active'
        AND (
          (mistress_id = auth.uid() AND slave_id = profile_id)
          OR (slave_id = auth.uid() AND mistress_id = profile_id)
        )
    )
  );
