-- Migration 017: Profile bio field, message reactions, avatars storage bucket

-- Add bio field to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS bio text;

-- ── Message Reactions ──────────────────────────────────────────────────────────
-- pair_id is denormalised here so we can use Supabase Realtime filters efficiently
CREATE TABLE IF NOT EXISTS message_reactions (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id uuid        NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  pair_id    uuid        NOT NULL REFERENCES pairs(id)    ON DELETE CASCADE,
  user_id    uuid        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  emoji      text        NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (message_id, user_id, emoji)
);

ALTER TABLE message_reactions ENABLE ROW LEVEL SECURITY;

-- Pair members can see all reactions in their pair
CREATE POLICY "Pair members can view reactions"
  ON message_reactions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM pairs
      WHERE pairs.id = pair_id
        AND (pairs.mistress_id = auth.uid() OR pairs.slave_id = auth.uid())
        AND pairs.status = 'active'
    )
  );

-- Users can add reactions to messages in their pair
CREATE POLICY "Users can insert own reactions"
  ON message_reactions FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM pairs
      WHERE pairs.id = pair_id
        AND (pairs.mistress_id = auth.uid() OR pairs.slave_id = auth.uid())
        AND pairs.status = 'active'
    )
  );

-- Users can remove their own reactions
CREATE POLICY "Users can delete own reactions"
  ON message_reactions FOR DELETE
  USING (user_id = auth.uid());

-- Enable realtime for reactions
ALTER PUBLICATION supabase_realtime ADD TABLE message_reactions;

-- ── Avatars Storage Bucket ────────────────────────────────────────────────────
-- NOTE: Create the 'avatars' bucket in Supabase Dashboard → Storage first,
--       then run these policies. Bucket should be PUBLIC (for CDN delivery).

-- Allow authenticated users to upload their own avatar
CREATE POLICY "Users can upload own avatar"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Allow authenticated users to update their own avatar
CREATE POLICY "Users can update own avatar"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Public read access (avatars bucket is public)
CREATE POLICY "Public avatar read access"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'avatars');

-- Users can delete their own avatar
CREATE POLICY "Users can delete own avatar"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
