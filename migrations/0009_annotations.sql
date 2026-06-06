ALTER TABLE lines ADD COLUMN content_version INTEGER NOT NULL DEFAULT 1;

CREATE TRIGGER IF NOT EXISTS lines_content_version_update
AFTER UPDATE OF content ON lines
WHEN NEW.content <> OLD.content
BEGIN
  UPDATE lines
  SET content_version = OLD.content_version + 1
  WHERE id = NEW.id;
END;

CREATE TABLE IF NOT EXISTS annotations (
  id TEXT PRIMARY KEY NOT NULL,
  battle_id TEXT NOT NULL REFERENCES battles(id) ON DELETE CASCADE,
  author_id TEXT NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  body_json TEXT NOT NULL,
  body_text TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'published' CHECK (status IN ('draft', 'published', 'hidden', 'deleted')),
  score INTEGER NOT NULL DEFAULT 0,
  quality_state TEXT NOT NULL DEFAULT 'normal' CHECK (quality_state IN ('normal', 'trusted', 'verified', 'flagged', 'needs_review')),
  created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
  deleted_at INTEGER
);

CREATE INDEX IF NOT EXISTS idx_annotations_battle_status_score
  ON annotations(battle_id, status, score);
CREATE INDEX IF NOT EXISTS idx_annotations_author_id
  ON annotations(author_id);
CREATE INDEX IF NOT EXISTS idx_annotations_status
  ON annotations(status);

CREATE TABLE IF NOT EXISTS annotation_line_ranges (
  id TEXT PRIMARY KEY NOT NULL,
  annotation_id TEXT NOT NULL REFERENCES annotations(id) ON DELETE CASCADE,
  battle_id TEXT NOT NULL REFERENCES battles(id) ON DELETE CASCADE,
  start_line_id INTEGER REFERENCES lines(id) ON DELETE SET NULL,
  end_line_id INTEGER REFERENCES lines(id) ON DELETE SET NULL,
  start_line_sort REAL NOT NULL,
  end_line_sort REAL NOT NULL,
  start_text_offset INTEGER,
  end_text_offset INTEGER,
  selected_text TEXT,
  line_snapshot_json TEXT NOT NULL,
  created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000)
);

CREATE INDEX IF NOT EXISTS idx_annotation_line_ranges_annotation_id
  ON annotation_line_ranges(annotation_id);
CREATE INDEX IF NOT EXISTS idx_annotation_line_ranges_overlap
  ON annotation_line_ranges(battle_id, start_line_sort, end_line_sort);

CREATE TABLE IF NOT EXISTS annotation_line_references (
  id TEXT PRIMARY KEY NOT NULL,
  annotation_id TEXT NOT NULL REFERENCES annotations(id) ON DELETE CASCADE,
  battle_id TEXT NOT NULL REFERENCES battles(id) ON DELETE CASCADE,
  line_id INTEGER REFERENCES lines(id) ON DELETE SET NULL,
  line_sort REAL NOT NULL,
  label TEXT NOT NULL,
  created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000)
);

CREATE INDEX IF NOT EXISTS idx_annotation_line_refs_annotation_id
  ON annotation_line_references(annotation_id);
CREATE INDEX IF NOT EXISTS idx_annotation_line_refs_line_id
  ON annotation_line_references(line_id);

CREATE TABLE IF NOT EXISTS annotation_votes (
  id TEXT PRIMARY KEY NOT NULL,
  annotation_id TEXT NOT NULL REFERENCES annotations(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  value INTEGER NOT NULL DEFAULT 1 CHECK (value = 1),
  created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000)
);

CREATE UNIQUE INDEX IF NOT EXISTS annotation_votes_annotation_user_key
  ON annotation_votes(annotation_id, user_id);
CREATE INDEX IF NOT EXISTS idx_annotation_votes_annotation_id
  ON annotation_votes(annotation_id);
CREATE INDEX IF NOT EXISTS idx_annotation_votes_user_id
  ON annotation_votes(user_id);

CREATE TABLE IF NOT EXISTS user_points (
  user_id TEXT PRIMARY KEY NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  annotation_points INTEGER NOT NULL DEFAULT 0,
  transcript_points INTEGER NOT NULL DEFAULT 0,
  total_points INTEGER NOT NULL DEFAULT 0,
  updated_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000)
);

CREATE TABLE IF NOT EXISTS annotation_reports (
  id TEXT PRIMARY KEY NOT NULL,
  annotation_id TEXT NOT NULL REFERENCES annotations(id) ON DELETE CASCADE,
  reporter_id TEXT NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  reason TEXT NOT NULL,
  details TEXT,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'reviewed', 'dismissed')),
  created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
  reviewed_by TEXT REFERENCES user_profiles(id) ON DELETE SET NULL,
  reviewed_at INTEGER
);

CREATE UNIQUE INDEX IF NOT EXISTS annotation_reports_annotation_reporter_key
  ON annotation_reports(annotation_id, reporter_id);
CREATE INDEX IF NOT EXISTS idx_annotation_reports_annotation_id
  ON annotation_reports(annotation_id);
CREATE INDEX IF NOT EXISTS idx_annotation_reports_status
  ON annotation_reports(status);
