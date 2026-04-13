-- Migration 018: Wishlist

CREATE TABLE IF NOT EXISTS wishlist_items (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  pair_id    uuid        NOT NULL REFERENCES pairs(id)    ON DELETE CASCADE,
  added_by   uuid        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  url        text        NOT NULL,
  title      text,
  image_url  text,
  price      text,
  domain     text,
  notes      text,
  status     text        NOT NULL DEFAULT 'wanted'
               CHECK (status IN ('wanted', 'purchased')),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE wishlist_items ENABLE ROW LEVEL SECURITY;

-- Pair members can view
CREATE POLICY "Pair members can view wishlist"
  ON wishlist_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM pairs
      WHERE pairs.id = pair_id
        AND (pairs.mistress_id = auth.uid() OR pairs.slave_id = auth.uid())
        AND pairs.status = 'active'
    )
  );

-- Mistress can insert
CREATE POLICY "Mistress can add wishlist items"
  ON wishlist_items FOR INSERT
  WITH CHECK (
    added_by = auth.uid()
    AND EXISTS (
      SELECT 1 FROM pairs
      WHERE pairs.id = pair_id
        AND pairs.mistress_id = auth.uid()
    )
  );

-- Mistress can update (edit notes/status)
CREATE POLICY "Mistress can update wishlist items"
  ON wishlist_items FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM pairs
      WHERE pairs.id = pair_id
        AND pairs.mistress_id = auth.uid()
    )
  );

-- Slave can mark items as purchased
CREATE POLICY "Slave can mark items purchased"
  ON wishlist_items FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM pairs
      WHERE pairs.id = pair_id
        AND pairs.slave_id = auth.uid()
    )
  );

-- Mistress can delete
CREATE POLICY "Mistress can delete wishlist items"
  ON wishlist_items FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM pairs
      WHERE pairs.id = pair_id
        AND pairs.mistress_id = auth.uid()
    )
  );
