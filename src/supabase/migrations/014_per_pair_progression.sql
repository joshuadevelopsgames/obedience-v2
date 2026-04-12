-- Per-pair slave progression
-- XP and level are now tracked per pair, not globally on profiles

ALTER TABLE pairs
  ADD COLUMN IF NOT EXISTS slave_xp     integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS slave_level  integer NOT NULL DEFAULT 1;

-- Seed existing pairs: copy the slave's current global XP/level into each pair
UPDATE pairs p
SET
  slave_xp    = COALESCE(prof.xp,    0),
  slave_level = COALESCE(prof.level, 1)
FROM profiles prof
WHERE prof.id = p.slave_id
  AND p.status = 'active';
