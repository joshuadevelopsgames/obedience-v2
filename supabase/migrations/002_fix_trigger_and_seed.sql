-- ============================================
-- 1. Fix the handle_new_user trigger
-- ============================================

-- Drop existing trigger and function
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS handle_new_user();

-- Recreate with explicit type casting
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO profiles (id, role, display_name)
  VALUES (
    new.id,
    COALESCE(
      NULLIF(new.raw_user_meta_data->>'role', '')::user_role,
      'slave'::user_role
    ),
    COALESCE(
      NULLIF(new.raw_user_meta_data->>'display_name', ''),
      split_part(new.email, '@', 1)
    )
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ============================================
-- 2. Add must_change_password column
-- ============================================

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS must_change_password boolean DEFAULT false;

-- Allow profiles to update their own must_change_password
CREATE POLICY "Users update own must_change_password"
  ON profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);
