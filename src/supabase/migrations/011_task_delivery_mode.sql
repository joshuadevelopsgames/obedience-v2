-- Add delivery_mode to tasks: 'online' (default) or 'in_person'
-- Controls what kinds of proof and tasks are available when assigning protocols.
ALTER TABLE tasks
  ADD COLUMN IF NOT EXISTS delivery_mode text NOT NULL DEFAULT 'online'
  CHECK (delivery_mode IN ('online', 'in_person'));
