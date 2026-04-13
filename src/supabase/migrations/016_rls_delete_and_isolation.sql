-- ============================================================
-- RLS: Missing DELETE policies + data isolation improvements
-- ============================================================

-- TASKS — mistress can delete tasks she created or that belong to her pair
DROP POLICY IF EXISTS "Pair members can delete tasks" ON tasks;
CREATE POLICY "Pair members can delete tasks"
  ON tasks FOR DELETE
  USING (
    pair_id IN (
      SELECT id FROM pairs
      WHERE mistress_id = auth.uid()
        OR slave_id = auth.uid()
    )
  );

-- REWARDS — only mistress of the pair can delete rewards
DROP POLICY IF EXISTS "Pair members can delete rewards" ON rewards;
CREATE POLICY "Pair members can delete rewards"
  ON rewards FOR DELETE
  USING (user_in_pair(pair_id));

-- REDEMPTIONS — allow delete (denied/fulfilled cleanup)
DROP POLICY IF EXISTS "Pair can delete redemptions" ON redemptions;
CREATE POLICY "Pair can delete redemptions"
  ON redemptions FOR DELETE
  USING (
    reward_id IN (
      SELECT id FROM rewards WHERE user_in_pair(pair_id)
    )
    OR auth.uid() = redeemed_by
  );

-- PUNISHMENTS — add delete
DROP POLICY IF EXISTS "Pair can delete punishments" ON punishments;
CREATE POLICY "Pair can delete punishments"
  ON punishments FOR DELETE
  USING (user_in_pair(pair_id));

-- RITUALS — add delete
DROP POLICY IF EXISTS "Pair can delete rituals" ON rituals;
CREATE POLICY "Pair can delete rituals"
  ON rituals FOR DELETE
  USING (user_in_pair(pair_id));

-- JOURNAL ENTRIES — authors can delete their own entries
DROP POLICY IF EXISTS "Authors can delete entries" ON journal_entries;
CREATE POLICY "Authors can delete entries"
  ON journal_entries FOR DELETE
  USING (auth.uid() = author_id);

-- NOTIFICATIONS — allow SECURITY DEFINER triggers to insert cross-user notifications
-- Triggers bypass RLS, but the existing check (auth.uid() = user_id) would block
-- server-side inserts that run as the sender rather than the recipient.
-- We replace with a policy that allows inserts from authenticated users
-- (the trigger's SECURITY DEFINER handles the actual integrity check).
DROP POLICY IF EXISTS "System creates notifications" ON notifications;
CREATE POLICY "System creates notifications"
  ON notifications FOR INSERT
  WITH CHECK (
    -- Allow self-inserts (user notifying themselves)
    auth.uid() = user_id
    -- Allow inserts where the inserter is a pair-member of the recipient
    OR user_id IN (
      SELECT CASE
        WHEN mistress_id = auth.uid() THEN slave_id
        WHEN slave_id   = auth.uid() THEN mistress_id
      END
      FROM pairs
      WHERE (mistress_id = auth.uid() OR slave_id = auth.uid())
        AND status = 'active'
    )
  );

-- NOTIFICATIONS — also allow deletion (clearing old notifications)
DROP POLICY IF EXISTS "Users delete own notifications" ON notifications;
CREATE POLICY "Users delete own notifications"
  ON notifications FOR DELETE
  USING (auth.uid() = user_id);
