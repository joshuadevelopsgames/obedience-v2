-- Create kinks table
CREATE TABLE IF NOT EXISTS kinks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  description text NOT NULL,
  category text NOT NULL,
  is_custom boolean DEFAULT false,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamp with time zone DEFAULT now()
);

-- Create profile_kinks junction table
CREATE TABLE IF NOT EXISTS profile_kinks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  kink_id uuid NOT NULL REFERENCES kinks(id) ON DELETE CASCADE,
  created_at timestamp with time zone DEFAULT now(),
  UNIQUE(profile_id, kink_id)
);

-- Enable RLS
ALTER TABLE kinks ENABLE ROW LEVEL SECURITY;
ALTER TABLE profile_kinks ENABLE ROW LEVEL SECURITY;

-- RLS Policies for kinks (public read)
CREATE POLICY "Kinks are publicly readable" ON kinks
  FOR SELECT USING (true);

CREATE POLICY "Authenticated users can insert custom kinks" ON kinks
  FOR INSERT WITH CHECK (auth.role() = 'authenticated' AND created_by = auth.uid());

-- RLS Policies for profile_kinks
CREATE POLICY "Users can view their own kink selections" ON profile_kinks
  FOR SELECT USING (auth.uid() = profile_id);

CREATE POLICY "Users can insert their own kink selections" ON profile_kinks
  FOR INSERT WITH CHECK (auth.uid() = profile_id);

CREATE POLICY "Users can delete their own kink selections" ON profile_kinks
  FOR DELETE USING (auth.uid() = profile_id);

-- Seed 124 kinks across 8 categories
INSERT INTO kinks (name, description, category, is_custom, created_by) VALUES
-- RESTRAINT (1-15)
('Bondage', 'Being bound with rope, cuffs, or other restraints', 'restraint', false, NULL),
('Rope Play', 'Using rope for both binding and sensation', 'restraint', false, NULL),
('Handcuffs', 'Metal cuffs for wrist or ankle restraint', 'restraint', false, NULL),
('Suspension', 'Being suspended in the air using restraints', 'restraint', false, NULL),
('Spreader Bars', 'Bars that hold limbs apart during restraint', 'restraint', false, NULL),
('Collar', 'Wearing a collar as a symbol of submission', 'restraint', false, NULL),
('Chains', 'Metal chains for binding', 'restraint', false, NULL),
('Cages', 'Confinement in a small cage', 'restraint', false, NULL),
('Straitjacket', 'Full-body restraint garment', 'restraint', false, NULL),
('Hogtie', 'Binding wrists and ankles together behind the back', 'restraint', false, NULL),
('Mummification', 'Being wrapped completely to restrict movement', 'restraint', false, NULL),
('Predicament Bondage', 'Restraint positions that become painful if not maintained', 'restraint', false, NULL),
('Shibari', 'Japanese rope bondage art form', 'restraint', false, NULL),
('Latex Bondage', 'Using latex or rubber for restraint', 'restraint', false, NULL),
('Chastity', 'Restricting sexual access using a device', 'restraint', false, NULL),

-- IMPACT (16-30)
('Spanking', 'Hitting the buttocks for pleasure or punishment', 'impact', false, NULL),
('Paddling', 'Using a paddle for impact play', 'impact', false, NULL),
('Whipping', 'Using a whip for impact and sensation', 'impact', false, NULL),
('Caning', 'Using a cane or stick for striking', 'impact', false, NULL),
('Flogging', 'Using a flogger or whip for multiple strikes', 'impact', false, NULL),
('Cropping', 'Using a crop (riding whip) for impact', 'impact', false, NULL),
('Slapping', 'Using hands for face or body slapping', 'impact', false, NULL),
('Punching', 'Delivering closed-fist strikes', 'impact', false, NULL),
('Fisting', 'Inserting a fist into orifices', 'impact', false, NULL),
('Trampling', 'Being walked on or stood upon', 'impact', false, NULL),
('Sensation Play', 'Playing with various textures and sensations', 'impact', false, NULL),
('Ice Play', 'Using ice for temperature sensation', 'impact', false, NULL),
('Wax Play', 'Dripping hot wax on skin', 'impact', false, NULL),
('Fire Play', 'Using controlled fire for sensation', 'impact', false, NULL),
('Electrical Play', 'Using electrical stimulation for sensation', 'impact', false, NULL),

-- POWER EXCHANGE (31-45)
('Humiliation', 'Being degraded or embarrassed for pleasure', 'power_exchange', false, NULL),
('Verbal Humiliation', 'Degradation through words and insults', 'power_exchange', false, NULL),
('Public Humiliation', 'Being humiliated in front of others', 'power_exchange', false, NULL),
('Name-calling', 'Being called degrading names', 'power_exchange', false, NULL),
('Forced Feminization', 'Being forced to dress or act feminine', 'power_exchange', false, NULL),
('Forced Masculinization', 'Being forced to dress or act masculine', 'power_exchange', false, NULL),
('Pet Play', 'Roleplaying as an animal with an owner', 'power_exchange', false, NULL),
('Master/Slave', 'Power exchange with master and slave roles', 'power_exchange', false, NULL),
('Sir/Miss Dynamic', 'Respectful power exchange with titles', 'power_exchange', false, NULL),
('Ownership', 'Symbolic or full-time ownership dynamic', 'power_exchange', false, NULL),
('Service Submission', 'Deriving pleasure from serving', 'power_exchange', false, NULL),
('Financial Domination', 'Giving money or control to the dominant', 'power_exchange', false, NULL),
('Chores and Tasks', 'Being assigned household duties', 'power_exchange', false, NULL),
('Orgasm Control', 'Controlling when someone can orgasm', 'power_exchange', false, NULL),
('Obedience Training', 'Training a submissive to obey commands', 'power_exchange', false, NULL),

-- ROLEPLAY (46-60)
('Teacher/Student', 'Academic authority play', 'roleplay', false, NULL),
('Boss/Employee', 'Workplace power dynamic', 'roleplay', false, NULL),
('Doctor/Patient', 'Medical professional authority play', 'roleplay', false, NULL),
('Cop/Criminal', 'Law enforcement roleplay', 'roleplay', false, NULL),
('Interrogation', 'Aggressive questioning and authority', 'roleplay', false, NULL),
('Military', 'Military rank and authority play', 'roleplay', false, NULL),
('Maid/Employer', 'Service industry roleplay', 'roleplay', false, NULL),
('Slave Auction', 'Roleplay of being bought and sold', 'roleplay', false, NULL),
('Kidnapping', 'Non-consensual fantasy scenarios', 'roleplay', false, NULL),
('Rape Fantasy', 'Consensual simulated assault', 'roleplay', false, NULL),
('Age Play', 'Playing different ages in safe scenarios', 'roleplay', false, NULL),
('Incest Roleplay', 'Family-related fictional scenarios', 'roleplay', false, NULL),
('Gorean', 'Master/slave lifestyle inspired by Gor novels', 'roleplay', false, NULL),
('Fantasy Roleplay', 'Magical or fantasy-themed scenarios', 'roleplay', false, NULL),
('Zombie/Monster', 'Horror or sci-fi creature roleplay', 'roleplay', false, NULL),

-- FETISH (61-75)
('Foot Fetish', 'Sexual attraction to feet', 'fetish', false, NULL),
('Shoe Fetish', 'Sexual attraction to shoes', 'fetish', false, NULL),
('Leather Fetish', 'Arousal from leather clothing or material', 'fetish', false, NULL),
('Latex/Rubber Fetish', 'Arousal from latex or rubber', 'fetish', false, NULL),
('Silk/Satin Fetish', 'Arousal from smooth fabrics', 'fetish', false, NULL),
('Corset Fetish', 'Arousal from corsets', 'fetish', false, NULL),
('High Heels', 'Sexual arousal from heels', 'fetish', false, NULL),
('Stockings/Hosiery', 'Arousal from stockings or pantyhose', 'fetish', false, NULL),
('Underwear Fetish', 'Sexual interest in underwear', 'fetish', false, NULL),
('Lingerie Fetish', 'Arousal from lingerie', 'fetish', false, NULL),
('Pantie Fetish', 'Sexual interest in panties', 'fetish', false, NULL),
('Cum Play', 'Playing with semen', 'fetish', false, NULL),
('Urine Play', 'Sexual play involving urine', 'fetish', false, NULL),
('Scat Play', 'Sexual play involving feces', 'fetish', false, NULL),
('Object Insertion', 'Inserting objects into orifices', 'fetish', false, NULL),

-- OTHER (76-100)
('Dirty Talk', 'Sexually explicit conversation', 'other', false, NULL),
('Exhibitionism', 'Pleasure from being seen naked or having sex', 'other', false, NULL),
('Voyeurism', 'Pleasure from watching others', 'other', false, NULL),
('Cuckolding', 'Partner having sex with another while you watch', 'other', false, NULL),
('Gang Bang', 'Multiple partners at once', 'other', false, NULL),
('Group Sex', 'Sex with more than two people', 'other', false, NULL),
('Orgy', 'Large group sexual gathering', 'other', false, NULL),
('Multiple Partners', 'Simultaneous partners', 'other', false, NULL),
('Kissing', 'Mouth-to-mouth contact', 'other', false, NULL),
('Oral Sex', 'Mouth-genital contact', 'other', false, NULL),
('Anal Sex', 'Penetration of the anus', 'other', false, NULL),
('Fingering', 'Digital penetration', 'other', false, NULL),
('Cock Ring', 'Wearing a ring around the penis', 'other', false, NULL),
('Vibrators', 'Using vibrating toys', 'other', false, NULL),
('Dildos', 'Using penetrative toys', 'other', false, NULL),
('Butt Plugs', 'Anal insertion toys', 'other', false, NULL),
('Prostate Play', 'Stimulating the prostate', 'other', false, NULL),
('G-Spot Play', 'Stimulating the G-spot', 'other', false, NULL),
('Squirting', 'Female ejaculation', 'other', false, NULL),
('Creampie', 'Ejaculation inside partner', 'other', false, NULL),
('Edging', 'Approaching orgasm without cumming', 'other', false, NULL),
('Ruined Orgasm', 'Orgasm that is interrupted or made less pleasurable', 'other', false, NULL),
('Multiple Orgasms', 'Having several orgasms', 'other', false, NULL),
('Tantric Sex', 'Spiritual connected sexuality', 'other', false, NULL),
('Sensory Deprivation', 'Removing one or more senses', 'other', false, NULL),

-- FLUID (101-109)
('Breath Play', 'Restricting oxygen intake', 'fluid', false, NULL),
('Erotic Asphyxiation', 'Choking for sexual pleasure', 'fluid', false, NULL),
('Choking', 'Throat restriction for pleasure', 'fluid', false, NULL),
('Hair Pulling', 'Pulling hair during sex', 'fluid', false, NULL),
('Scratching', 'Using nails to mark or draw blood', 'fluid', false, NULL),
('Biting', 'Using teeth during sexual activity', 'fluid', false, NULL),
('Blood Play', 'Incorporating blood in sexual activity', 'fluid', false, NULL),
('Cupping', 'Creating suction marks on skin', 'fluid', false, NULL),
('Hickeys', 'Leaving bruises through suction', 'fluid', false, NULL),

-- EXTREME (110-115)
('Suspension Bondage', 'Being hung by restraints', 'extreme', false, NULL),
('Impact Breathplay', 'Combining impact play with breath restriction', 'extreme', false, NULL),
('CNC (Consensual Non-Consent)', 'Simulated non-consensual scenarios', 'extreme', false, NULL),
('Extreme Pain Play', 'High-intensity pain for pleasure', 'extreme', false, NULL),
('Extreme Humiliation', 'Intense degradation scenarios', 'extreme', false, NULL),
('Long-Term Anal Training', 'Extended anal stretching and training', 'extreme', false, NULL);

-- Create indexes for performance
CREATE INDEX idx_profile_kinks_profile_id ON profile_kinks(profile_id);
CREATE INDEX idx_profile_kinks_kink_id ON profile_kinks(kink_id);
CREATE INDEX idx_kinks_category ON kinks(category);
