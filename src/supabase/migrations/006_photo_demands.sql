-- Photo demands: mistress can demand a photo from slave within a time window
CREATE TABLE IF NOT EXISTS photo_demands (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pair_id uuid NOT NULL REFERENCES pairs(id) ON DELETE CASCADE,
  mistress_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  slave_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  prompt text NOT NULL DEFAULT 'Send me a photo now',
  window_seconds int NOT NULL DEFAULT 300, -- 5 minutes default
  expires_at timestamp with time zone NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'fulfilled', 'expired', 'cancelled')),
  photo_url text,
  caption text,
  auto_punishment_issued boolean DEFAULT false,
  punishment_id uuid REFERENCES tasks(id) ON DELETE SET NULL,
  created_at timestamp with time zone DEFAULT now(),
  fulfilled_at timestamp with time zone
);

-- Enable RLS
ALTER TABLE photo_demands ENABLE ROW LEVEL SECURITY;

-- Mistress can create and view demands for their pairs
CREATE POLICY "Mistress can manage photo demands" ON photo_demands
  FOR ALL USING (auth.uid() = mistress_id);

-- Slave can view and fulfill demands directed at them
CREATE POLICY "Slave can view and fulfill demands" ON photo_demands
  FOR SELECT USING (auth.uid() = slave_id);

CREATE POLICY "Slave can update demands directed at them" ON photo_demands
  FOR UPDATE USING (auth.uid() = slave_id);

-- Indexes
CREATE INDEX idx_photo_demands_pair_id ON photo_demands(pair_id);
CREATE INDEX idx_photo_demands_slave_id ON photo_demands(slave_id);
CREATE INDEX idx_photo_demands_status ON photo_demands(status);
CREATE INDEX idx_photo_demands_expires_at ON photo_demands(expires_at);
