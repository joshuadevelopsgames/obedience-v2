-- Allow users to set their own category override on profile_limits
-- so any suggestion from the library can be marked hard or soft independently

ALTER TABLE profile_limits
  ADD COLUMN IF NOT EXISTS category text NOT NULL DEFAULT 'soft'
    CHECK (category IN ('hard', 'soft'));

-- Seed existing rows with the library's category
UPDATE profile_limits pl
SET category = ll.category
FROM limits_library ll
WHERE ll.id = pl.limit_id;
