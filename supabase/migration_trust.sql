-- ============================================
-- Migration: Trust & Probation System
-- ============================================

-- 1. Add trust_level to user_profiles
ALTER TABLE user_profiles 
  ADD COLUMN IF NOT EXISTS trust_level TEXT DEFAULT 'new' 
  CHECK (trust_level IN ('new', 'trusted', 'senior'));

-- 2. Backfill existing staff as 'trusted'
UPDATE user_profiles 
SET trust_level = 'trusted' 
WHERE role IN ('superadmin', 'admin', 'moderator');

-- 3. Add 'flagged' to the allowed statuses for suggestions
ALTER TABLE suggestions DROP CONSTRAINT IF EXISTS suggestions_status_check;
ALTER TABLE suggestions ADD CONSTRAINT suggestions_status_check 
  CHECK (status IN ('pending', 'approved', 'rejected', 'flagged'));

-- 4. Index on trust_level
CREATE INDEX IF NOT EXISTS idx_user_profiles_trust ON user_profiles(trust_level);

-- ============================================
-- AFTER RUNNING THIS:
-- New moderators will default to 'new' trust_level
-- and their approvals will become 'flagged' instead 
-- of immediately updating the lines table.
-- ============================================
