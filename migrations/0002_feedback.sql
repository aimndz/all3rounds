CREATE TABLE IF NOT EXISTS feedback (
  id TEXT PRIMARY KEY NOT NULL,
  user_id TEXT REFERENCES user_profiles(id) ON DELETE SET NULL,
  category TEXT NOT NULL
    CHECK (category IN ('bug', 'content', 'feature', 'data', 'account', 'other')),
  message TEXT NOT NULL,
  contact_email TEXT,
  page_url TEXT,
  user_agent TEXT,
  status TEXT NOT NULL DEFAULT 'new'
    CHECK (status IN ('new', 'reviewed', 'closed')),
  created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
  reviewed_at INTEGER
);

CREATE INDEX IF NOT EXISTS idx_feedback_category ON feedback(category);
CREATE INDEX IF NOT EXISTS idx_feedback_status_created_at ON feedback(status, created_at);
CREATE INDEX IF NOT EXISTS idx_feedback_user_id ON feedback(user_id);
