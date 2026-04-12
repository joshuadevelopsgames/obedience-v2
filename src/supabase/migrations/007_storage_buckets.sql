-- Create the proofs storage bucket (private, not public)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'proofs',
  'proofs',
  false, -- private: requires signed URLs to view
  10485760, -- 10MB file size limit
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'video/mp4', 'video/quicktime']
)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload to their own folder (userId/filename)
CREATE POLICY "Users can upload their own proofs"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'proofs' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

-- Allow users to read their own uploaded files
CREATE POLICY "Users can view their own proofs"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'proofs' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

-- Allow the mistress to read proofs from their paired slave
-- This is done via a helper: we check pairs table to see if viewer is mistress of uploader
CREATE POLICY "Mistress can view paired slave proofs"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'proofs' AND
    EXISTS (
      SELECT 1 FROM pairs
      WHERE pairs.mistress_id = auth.uid()
      AND pairs.slave_id::text = (storage.foldername(name))[1]
      AND pairs.status = 'active'
    )
  );

-- Allow users to delete their own files
CREATE POLICY "Users can delete their own proofs"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'proofs' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );
