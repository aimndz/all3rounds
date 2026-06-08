-- Disable foreign keys check temporarily to make table modification safe
PRAGMA foreign_keys=OFF;

-- Create temporary table with modified CHECK constraint on value
CREATE TABLE annotation_votes_new (
  id TEXT PRIMARY KEY NOT NULL,
  annotation_id TEXT NOT NULL REFERENCES annotations(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  value INTEGER NOT NULL DEFAULT 1 CHECK (value = 1 OR value = -1),
  created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000)
);

-- Copy data from old table
INSERT INTO annotation_votes_new (id, annotation_id, user_id, value, created_at)
SELECT id, annotation_id, user_id, value, created_at FROM annotation_votes;

-- Drop old table
DROP TABLE annotation_votes;

-- Rename new table
ALTER TABLE annotation_votes_new RENAME TO annotation_votes;

-- Recreate indexes
CREATE UNIQUE INDEX IF NOT EXISTS annotation_votes_annotation_user_key
  ON annotation_votes(annotation_id, user_id);
CREATE INDEX IF NOT EXISTS idx_annotation_votes_annotation_id
  ON annotation_votes(annotation_id);
CREATE INDEX IF NOT EXISTS idx_annotation_votes_user_id
  ON annotation_votes(user_id);

-- Re-enable foreign keys
PRAGMA foreign_keys=ON;
