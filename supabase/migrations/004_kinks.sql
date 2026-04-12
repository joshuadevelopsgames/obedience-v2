-- ─────────────────────────────────────────────
-- 004_kinks.sql
-- Kink library + profile kink selections
-- ─────────────────────────────────────────────

-- Global kink library
CREATE TABLE IF NOT EXISTS kinks (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  description TEXT,
  category    TEXT NOT NULL DEFAULT 'other',
  is_custom   BOOLEAN NOT NULL DEFAULT FALSE,
  created_by  UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Per-profile kink selections (one row per profile+kink)
CREATE TABLE IF NOT EXISTS profile_kinks (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id  UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  kink_id     UUID NOT NULL REFERENCES kinks(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (profile_id, kink_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS profile_kinks_profile_id_idx ON profile_kinks(profile_id);
CREATE INDEX IF NOT EXISTS profile_kinks_kink_id_idx    ON profile_kinks(kink_id);

-- RLS
ALTER TABLE kinks          ENABLE ROW LEVEL SECURITY;
ALTER TABLE profile_kinks  ENABLE ROW LEVEL SECURITY;

-- kinks: everyone can read; authenticated users can insert custom kinks
CREATE POLICY "kinks_read"   ON kinks FOR SELECT USING (TRUE);
CREATE POLICY "kinks_insert" ON kinks FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "kinks_delete_own_custom" ON kinks FOR DELETE USING (created_by = auth.uid() AND is_custom = TRUE);

-- profile_kinks: own rows only
CREATE POLICY "profile_kinks_select" ON profile_kinks FOR SELECT USING (profile_id = auth.uid());
CREATE POLICY "profile_kinks_insert" ON profile_kinks FOR INSERT WITH CHECK (profile_id = auth.uid());
CREATE POLICY "profile_kinks_delete" ON profile_kinks FOR DELETE USING (profile_id = auth.uid());

-- ─────────────────────────────────────────────
-- Seed data — 124 kinks
-- ─────────────────────────────────────────────
INSERT INTO kinks (name, description, category) VALUES
-- Restraint & Bondage (1–15)
('Bondage',             'Restraining a partner with ropes, cuffs, scarves, etc.',                          'restraint'),
('Blindfolds',          'Covering the eyes to heighten other senses or vulnerability.',                    'restraint'),
('Shibari / Rope Bondage','Artistic or restrictive Japanese-style rope tying.',                            'restraint'),
('Suspension',          'Being lifted or hung in ropes. Requires expertise and safety precautions.',       'restraint'),
('Confinement / Caging','Locking someone in a small space like a cage.',                                   'restraint'),
('Handcuffs / Restraints','Quick, everyday restraint play with cuffs or similar.',                        'restraint'),
('Mummification',       'Wrapping the body tightly in materials like plastic wrap or bandages.',           'restraint'),
('Sensory Deprivation', 'Blocking sight, sound, or touch using hoods, earplugs, or other means.',         'restraint'),
('Sensory Overload',    'Bombarding the senses with multiple stimuli simultaneously.',                     'restraint'),
('Chastity',            'Locking genitals in a device to control orgasm access.',                          'restraint'),
('Orgasm Control / Denial','Edging, delaying, or forbidding climax entirely.',                            'restraint'),
('Tease and Denial',    'Building arousal without allowing release.',                                      'restraint'),
('Breath Play',         'Controlled restriction of breathing. High risk — requires training and caution.', 'restraint'),
('Gags',                'Placing something in the mouth to restrict speech.',                              'restraint'),
('Hoods / Masks',       'Full head covering for anonymity or sensory control.',                            'restraint'),

-- Impact, Pain & Sensation (16–30)
('Spanking',            'Striking the buttocks with hand or implements.',                                  'impact'),
('Flogging',            'Using a multi-tailed whip or flogger on the body.',                              'impact'),
('Caning',              'Striking with a thin rod, often on buttocks or thighs.',                         'impact'),
('Paddling',            'Using a flat paddle for impact play.',                                            'impact'),
('Impact Play',         'Any consensual striking or beating with hands or implements.',                    'impact'),
('Wax Play',            'Dripping hot candle wax on skin for sensation.',                                 'impact'),
('Ice Play',            'Using ice cubes for cold sensation contrast.',                                    'impact'),
('Needle Play',         'Temporary piercing or play with needles. Requires sterile technique.',            'impact'),
('Electro Play',        'Using safe electrical stimulation devices (e-stim) on the body.',                'impact'),
('Temperature Play',    'Hot/cold sensations using wax, ice, metal, or other materials.',                  'impact'),
('CBT (Cock & Ball Torture)','Genital-focused pain or pressure play on the penis and testicles.',         'impact'),
('Ballbusting',         'Kicking, slapping, or squeezing testicles consensually.',                        'impact'),
('Nipple Play / Torture','Clamps, pinching, or twisting nipples for sensation or pain.',                  'impact'),
('Scratching / Biting', 'Leaving marks with nails or teeth during play.',                                 'impact'),
('Hair Pulling',        'Gripping and tugging hair during sex or play.',                                   'impact'),

-- Dominance, Submission & Power Exchange (31–45)
('D/s Dynamic',         'One partner leads (dominant), the other yields control (submissive).',            'power_exchange'),
('Sadism',              'Deriving pleasure from consensually inflicting pain on a partner.',               'power_exchange'),
('Masochism',           'Deriving pleasure from consensually receiving pain.',                             'power_exchange'),
('Master / Slave',      'Intense, often 24/7 power exchange dynamic.',                                    'power_exchange'),
('Pet Play',            'Acting as or treating a partner like an animal (pup, kitten, etc.).',            'power_exchange'),
('Age Play',            'Role-playing as a different age, e.g. caregiver/little dynamic.',                'power_exchange'),
('Degradation / Humiliation','Verbal or physical belittling of a submissive, done consensually.',        'power_exchange'),
('Praise Kink',         'Being complimented, affirmed, or called "good girl/boy" as a reward.',           'power_exchange'),
('Brat Play',           'Playfully resisting or "bratting" to provoke discipline from a dominant.',       'power_exchange'),
('Protocol',            'Following specific rules, rituals, or behaviors within a dynamic.',              'power_exchange'),
('Collaring',           'Wearing a collar as a symbol of ownership or submission.',                       'power_exchange'),
('Service Submission',  'Pleasing a dominant through acts of service, chores, or tasks.',                 'power_exchange'),
('Financial Domination','Giving a dominant control over money or spending (findom).',                     'power_exchange'),
('Cuckolding',          'Watching a partner have sex with someone else while deriving arousal.',           'power_exchange'),
('Hotwifing',           'Similar to cuckolding but often with enthusiastic consent from both parties.',   'power_exchange'),

-- Role Play & Fantasy (46–60)
('Role Play',           'Acting out characters or scenarios for erotic or dramatic effect.',               'roleplay'),
('Medical Play',        'Medical-themed exams or procedures; doctor/nurse dynamic.',                      'roleplay'),
('Teacher / Student',   'Authority figure and subordinate educational dynamic.',                          'roleplay'),
('Boss / Secretary',    'Workplace power fantasy between authority and subordinate.',                     'roleplay'),
('Uniform Play',        'Dressing in specific uniforms such as police, military, or maid outfits.',       'roleplay'),
('Cross-Dressing',      'Wearing clothing associated with another gender.',                               'roleplay'),
('Lingerie / Fetish Wear','Latex, leather, PVC, heels, and other fetish clothing.',                      'roleplay'),
('Giantess / Macrophilia','Fantasy involving a giant partner or being tiny in comparison.',               'roleplay'),
('Vore',                'Fantasy of being eaten or consuming someone (usually non-graphic).',             'roleplay'),
('Tentacle Play',       'Fantasy involving tentacles, often anime/hentai-inspired.',                      'roleplay'),
('Monster / Creature Fantasy','Non-human creature or monster sex fantasies.',                            'roleplay'),
('Public / Semi-Public','Sex or play in public or semi-public settings for the thrill of being seen.',   'roleplay'),
('Exhibitionism',       'Arousal from showing off one''s body or acts to others.',                        'roleplay'),
('Voyeurism',           'Arousal from watching others have sex or engage in acts (consensual).',          'roleplay'),
('Group Sex',           'Three or more people engaging in sexual activity simultaneously.',               'roleplay'),

-- Body & Object Fetishes (61–75)
('Foot Fetish / Worship','Intense focus on feet, toes, and soles — kissing, massaging, licking.',        'fetish'),
('Shoe / Heel Fetish',  'Arousal from footwear, particularly heels.',                                    'fetish'),
('Stockings / Pantyhose','Arousal from sheer legwear.',                                                  'fetish'),
('Latex / Rubber',      'Wearing or touching shiny latex or rubber clothing.',                            'fetish'),
('Leather',             'Arousal from leather garments, smell, or texture.',                              'fetish'),
('Body Worship',        'Lavishing focused attention on specific body parts.',                            'fetish'),
('Armpit Fetish',       'Focus on armpits including scent or licking.',                                   'fetish'),
('Hair Fetish',         'Arousal from hair — cutting, pulling, styling, or scent.',                       'fetish'),
('Breeding / Impregnation Fantasy','Belly, breeding, or pregnancy-themed fantasies.',                    'fetish'),
('Lactation / Milk Play','Breast milk or nursing-related play.',                                          'fetish'),
('Inflation',           'Body inflation fantasy involving air or fluid.',                                 'fetish'),
('Food Play',           'Using food in sexual contexts — whipped cream, chocolate, etc.',                 'fetish'),
('Object Insertion',    'Inserting non-sexual objects safely into the body.',                             'fetish'),
('Sounding',            'Inserting medical-grade rods into the urethra for stimulation.',                 'fetish'),
('Fisting',             'Hand insertion into the vagina or anus.',                                        'fetish'),

-- Other (76–100)
('Dirty Talk',          'Explicit verbal communication during sex to heighten arousal.',                  'other'),
('Pegging',             'A person using a strap-on to penetrate a partner anally.',                      'other'),
('Anal Play',           'General focus on anal stimulation with fingers, toys, or other means.',          'other'),
('Double Penetration',  'Simultaneous penetration in two orifices.',                                     'other'),
('Face Sitting / Queening','Sitting on a partner''s face for oral stimulation.',                         'other'),
('Smothering',          'Breath control variant of face sitting with additional pressure.',               'other'),
('Watersports / Golden Showers','Urine play — urinating on or with a partner.',                          'other'),
('Scat Play',           'Feces-related play. Rarer and higher risk due to hygiene concerns.',             'other'),
('Erotic Asphyxiation', 'Breath restriction for erotic sensation. Extremely high risk.',                  'other'),
('Tickling',            'Laughter mixed with arousal or torment through tickling.',                       'other'),
('Wrestling / Sex Fighting','Physical struggle or sex fights as erotic play.',                           'other'),
('Edging',              'Bringing someone to the brink of orgasm repeatedly without release.',            'other'),
('Ruined Orgasms',      'Allowing orgasm to begin then removing stimulation for an unsatisfying climax.','other'),
('Cum Play / Facials',  'Focused play involving semen — on the face, body, or in the mouth.',            'other'),
('Bukkake',             'Multiple people ejaculating on one person.',                                    'other'),
('Gangbang',            'One person engaging sexually with multiple partners simultaneously.',            'other'),
('Swinging / Partner Swapping','Exchanging partners with other couples with mutual consent.',            'other'),
('Polyamory / Open Relationship','Ethical non-monogamy and multiple-partner relationship fantasies.',    'other'),
('JOI / Cybersex',      'Jerk Off Instruction or guided online/virtual masturbation sessions.',          'other'),
('Phone Sex / Sexting',  'Verbal or text-based erotic play over phone or messages.',                     'other'),
('Feminization / Sissification','Gender role reversal or forced femininity play.',                      'other'),
('Forced Orgasm',       'Making someone climax against simulated "resistance".',                          'other'),
('CNC (Consensual Non-Consent)','Simulated resistance or "rape" fantasy with full prior consent.',       'other'),
('Knife Play / Blood Play','Edge play using blades or light cutting. Extremely high risk.',              'other'),
('Aftercare Focus',     'Dedicated time for cuddling, reassurance, and decompression after intense scenes.','other'),

-- Fluid & Bathroom Play (101–109)
('Drinking Urine',      'Swallowing or tasting urine. Combined with golden showers for intensity.',       'fluid'),
('Wetting / Desperation','Holding urine until desperate, then wetting clothes or being "forced" to go.','fluid'),
('Bathroom Control / Denial','Dominant controls when the submissive is permitted to use the bathroom.', 'fluid'),
('Human Toilet',        'Using a partner as a toilet — urinating on them or into their mouth.',           'fluid'),
('Enemas',              'Receiving or giving enemas for cleaning, sensation, pressure, or control.',      'fluid'),
('Enema Torture / Retention','Holding a large enema for an extended time as punishment or play.',       'fluid'),
('Toilet Worship',      'Licking or servicing a toilet, or cleaning after use as humiliation play.',     'fluid'),
('Pee Desperation Games','Controlled or competitive holding contests with rewards or punishments.',      'fluid'),
('Piss Enema',          'Combining watersports with anal by filling the rectum with urine.',              'fluid'),

-- Extreme Anal (110–124)
('Anal Fisting',        'Inserting a hand into the anus — can be slow and sensual or intense.',           'extreme'),
('Double Anal Fisting', 'Two hands or extreme stretching with multiple insertions.',                     'extreme'),
('Anal Prolapse / Rosebud','Heavy play causing the rectal lining to push out. High injury risk.',        'extreme'),
('Anal Gaping',         'Training the anus to stay open/wide after toy or fist removal.',                'extreme'),
('Anal Stretching / Training','Progressive use of larger plugs, dildos, or fists to increase capacity.','extreme'),
('Extreme Toy Insertion','Using oversized dildos or objects with extreme caution.',                      'extreme'),
('Double Anal Penetration (DAP)','Two penises, toys, or combinations in the anus simultaneously.',      'extreme'),
('Anal Sounding',       'Deep rectal insertions alongside standard anal play.',                          'extreme'),
('Prolapse Play',       'Manipulating, licking, or engaging with a prolapsed rosebud.',                  'extreme'),
('Long-Term Anal Training','Ongoing sessions aimed at permanently altering anus capacity.',              'extreme'),
('Ass to Mouth (ATM)',  'Moving from anal to oral. High infection risk — strict hygiene required.',      'extreme'),
('Belly Bulging / Deep Anal','Visible stomach bulge from very deep or large insertions.',               'extreme'),
('Fisting + Prolapse Combo','Reaching prolapse during or after fisting sessions.',                      'extreme'),
('Speculum Play (Anal)','Using a medical speculum to open and inspect the inside of the anus.',         'extreme'),
('Piss Enema / Anal Fluid Play','Filling the rectum with urine combined with anal play.',               'extreme')

ON CONFLICT DO NOTHING;
