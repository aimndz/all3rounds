-- ============================================
-- Migration: Update roles from 4-role to 5-role system
-- 
-- Old roles: superadmin, admin, editor, viewer
-- New roles: superadmin, admin, moderator, verified_emcee, viewer
--
-- Run this on existing databases to migrate.
-- ============================================

-- 1. Migrate existing 'editor' users to 'moderator' (safe default)
UPDATE user_profiles SET role = 'moderator' WHERE role = 'editor';

-- 2. Drop old CHECK constraint and add new one
ALTER TABLE user_profiles DROP CONSTRAINT IF EXISTS user_profiles_role_check;
ALTER TABLE user_profiles ADD CONSTRAINT user_profiles_role_check
  CHECK (role IN ('superadmin', 'admin', 'moderator', 'verified_emcee', 'viewer'));

-- 3. Add RLS policy for admins to read all profiles (for managing moderators)
CREATE POLICY "Admins can read all profiles"
  ON user_profiles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role IN ('superadmin', 'admin')
    )
  );

-- ============================================
-- AFTER RUNNING THIS MIGRATION:
--
-- 1. Verify no users have the old 'editor' role:
--    SELECT id, role FROM user_profiles WHERE role = 'editor';
--
-- 2. Reassign any users that should be 'verified_emcee' instead of 'moderator':
--    UPDATE user_profiles SET role = 'verified_emcee' WHERE id = 'EMCEE_USER_ID';
--
-- 3. Review the updated roles:
--    SELECT id, role, display_name FROM user_profiles ORDER BY role;
-- ============================================
