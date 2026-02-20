-- Dataverse: Role-Based Access Control (RBAC)

-- ============================================
-- 1. User Profiles Table
-- ============================================
CREATE TABLE IF NOT EXISTS user_profiles (
  id           UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role         TEXT NOT NULL DEFAULT 'viewer'
               CHECK (role IN ('superadmin', 'admin', 'editor', 'viewer')),
  display_name TEXT,
  created_at   TIMESTAMPTZ DEFAULT now(),
  updated_at   TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- 2. RLS Policies for user_profiles
-- ============================================
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Everyone can read their own profile
CREATE POLICY "Users can read own profile"
  ON user_profiles FOR SELECT
  USING (auth.uid() = id);

-- Superadmins can read all profiles
CREATE POLICY "Superadmins can read all profiles"
  ON user_profiles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role = 'superadmin'
    )
  );

-- Only superadmins can update roles
CREATE POLICY "Superadmins can update profiles"
  ON user_profiles FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role = 'superadmin'
    )
  );

-- ============================================
-- 3. Auto-create profile on signup (trigger)
-- ============================================
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO user_profiles (id, display_name)
  VALUES (
    NEW.id,
    COALESCE(
      NEW.raw_user_meta_data->>'full_name',
      NEW.raw_user_meta_data->>'name',
      split_part(NEW.email, '@', 1)
    )
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop trigger if it exists (safe re-run)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ============================================
-- 4. Backfill profiles for existing users
--    (creates profiles for users who signed up
--     before this migration)
-- ============================================
INSERT INTO user_profiles (id, display_name)
SELECT
  id,
  COALESCE(
    raw_user_meta_data->>'full_name',
    raw_user_meta_data->>'name',
    split_part(email, '@', 1)
  )
FROM auth.users
WHERE id NOT IN (SELECT id FROM user_profiles)
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- 5. Index for fast role lookups
-- ============================================
CREATE INDEX IF NOT EXISTS idx_user_profiles_role ON user_profiles (role);

-- ============================================
-- AFTER RUNNING THIS MIGRATION:
--
-- 1. Find your user ID:
--    SELECT id, email FROM auth.users;
--
-- 2. Make yourself superadmin:
--    UPDATE user_profiles SET role = 'superadmin' WHERE id = 'YOUR_USER_ID_HERE';
--
-- 3. Verify:
--    SELECT id, role, display_name FROM user_profiles;
-- ============================================
