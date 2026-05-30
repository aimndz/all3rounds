UPDATE user_profiles
SET username = 'user_' || substr(replace(id, '-', ''), 1, 8)
WHERE username IS NULL;
