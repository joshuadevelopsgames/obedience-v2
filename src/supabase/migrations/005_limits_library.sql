-- Create limits_library table (master data, similar to kinks)
CREATE TABLE IF NOT EXISTS limits_library (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  description text NOT NULL,
  category text NOT NULL, -- 'hard' or 'soft'
  is_custom boolean DEFAULT false,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamp with time zone DEFAULT now()
);

-- Create profile_limits junction table (similar to profile_kinks)
CREATE TABLE IF NOT EXISTS profile_limits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  limit_id uuid NOT NULL REFERENCES limits_library(id) ON DELETE CASCADE,
  pair_id uuid NOT NULL REFERENCES pairs(id) ON DELETE CASCADE,
  created_at timestamp with time zone DEFAULT now(),
  UNIQUE(profile_id, limit_id, pair_id)
);

-- Enable RLS
ALTER TABLE limits_library ENABLE ROW LEVEL SECURITY;
ALTER TABLE profile_limits ENABLE ROW LEVEL SECURITY;

-- RLS Policies for limits_library (public read)
CREATE POLICY "Limits are publicly readable" ON limits_library
  FOR SELECT USING (true);

CREATE POLICY "Authenticated users can insert custom limits" ON limits_library
  FOR INSERT WITH CHECK (auth.role() = 'authenticated' AND created_by = auth.uid());

-- RLS Policies for profile_limits
CREATE POLICY "Users can view their own limit selections" ON profile_limits
  FOR SELECT USING (auth.uid() = profile_id);

CREATE POLICY "Users can insert their own limit selections" ON profile_limits
  FOR INSERT WITH CHECK (auth.uid() = profile_id);

CREATE POLICY "Users can delete their own limit selections" ON profile_limits
  FOR DELETE USING (auth.uid() = profile_id);

-- Seed common limits across hard and soft categories
INSERT INTO limits_library (name, description, category, is_custom, created_by) VALUES
-- HARD LIMITS (things that are completely off-table)
('No Blood Play', 'Absolutely no activities involving blood', 'hard', false, NULL),
('No Breath Play', 'Absolutely no breath restriction or asphyxiation', 'hard', false, NULL),
('No Fire Play', 'Absolutely no activities involving fire or flame', 'hard', false, NULL),
('No Needle Play', 'Absolutely no needle, piercing, or sharp object play', 'hard', false, NULL),
('No Anal Play', 'Absolutely no anal penetration or play', 'hard', false, NULL),
('No Genital Torture', 'Absolutely no pain or torture directed at genitals', 'hard', false, NULL),
('No Scar Making', 'Absolutely no activities that leave permanent marks or scars', 'hard', false, NULL),
('No Electrical Play', 'Absolutely no electrical or electronic stimulation', 'hard', false, NULL),
('No Bone Breaking', 'Absolutely no activities that could break bones', 'hard', false, NULL),
('No Permanent Marks', 'Absolutely no activities that leave permanent or long-lasting marks', 'hard', false, NULL),
('No Public Humiliation', 'No humiliation or degradation in public or with witnesses', 'hard', false, NULL),
('No Scat Play', 'Absolutely no feces-related activities', 'hard', false, NULL),
('No Urine Play', 'Absolutely no urine-related activities', 'hard', false, NULL),
('No Face Slapping', 'No striking, slapping, or impact to the face', 'hard', false, NULL),
('No Choking', 'No pressure on throat or neck that restricts breathing', 'hard', false, NULL),

-- SOFT LIMITS (things to be cautious with, build up slowly, or use safewords)
('Go Slow With Suspension', 'Suspension bondage OK but go very slowly and use caution', 'soft', false, NULL),
('Careful With Impact', 'Impact play OK but keep it moderate and communicative', 'soft', false, NULL),
('Limit Wax Temperature', 'Wax play OK but keep temperature carefully controlled', 'soft', false, NULL),
('Go Easy On Humiliation', 'Humiliation OK but keep it moderate, not extreme', 'soft', false, NULL),
('Careful Stretching', 'Anal stretching OK but take it very slowly', 'soft', false, NULL),
('Limited Duration Bondage', 'Bondage OK but limit duration and check circulation frequently', 'soft', false, NULL),
('Careful With Orgasm Control', 'Orgasm control OK but not for extended periods', 'soft', false, NULL),
('Light Impact Only', 'Impact play OK but keep it light and controlled', 'soft', false, NULL),
('Check In Frequently', 'Activity is OK but requires frequent check-ins and communication', 'soft', false, NULL),
('Safeword Always Ready', 'Activity OK but safeword must be readily accessible and usable', 'soft', false, NULL),
('Limit Duration', 'Activity OK but limit total duration or intensity', 'soft', false, NULL),
('Warm Up Slowly', 'Activity OK but requires thorough warm-up beforehand', 'soft', false, NULL),
('Watch Circulation', 'Restriction activities OK but must carefully monitor blood flow', 'soft', false, NULL),
('No Marks On Face', 'Can mark body but no visible marks on face for work/social reasons', 'soft', false, NULL),
('Avoid Before Work', 'Activity OK but avoid before work/important events', 'soft', false, NULL);

-- Create indexes for performance
CREATE INDEX idx_profile_limits_profile_id ON profile_limits(profile_id);
CREATE INDEX idx_profile_limits_limit_id ON profile_limits(limit_id);
CREATE INDEX idx_profile_limits_pair_id ON profile_limits(pair_id);
CREATE INDEX idx_limits_library_category ON limits_library(category);
