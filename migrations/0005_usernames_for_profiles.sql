ALTER TABLE user_profiles
ADD COLUMN username TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS user_profiles_username_key
  ON user_profiles(username)
  WHERE username IS NOT NULL;
