-- Add punishment_preset column to photo_demands
-- Stores a pre-approved punishment when the mistress writes one or approves a Grok preview.
-- If null, expire route calls Grok at time of expiry (existing behaviour).
-- Shape: { title, description, category, difficulty, xp_reward, proof_type, duration_minutes }

ALTER TABLE photo_demands
  ADD COLUMN IF NOT EXISTS punishment_preset JSONB;
