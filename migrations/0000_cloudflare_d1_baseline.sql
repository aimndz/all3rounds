PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS emcees (
  id TEXT PRIMARY KEY NOT NULL,
  slug TEXT NOT NULL,
  name TEXT NOT NULL,
  aka_json TEXT NOT NULL DEFAULT '[]',
  battle_count INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000)
);
CREATE UNIQUE INDEX IF NOT EXISTS emcees_slug_key ON emcees(slug);
CREATE INDEX IF NOT EXISTS idx_emcees_name ON emcees(name);

CREATE TABLE IF NOT EXISTS emcee_aliases (
  emcee_id TEXT NOT NULL REFERENCES emcees(id) ON DELETE CASCADE,
  alias TEXT NOT NULL,
  alias_normalized TEXT NOT NULL,
  PRIMARY KEY (emcee_id, alias)
);
CREATE INDEX IF NOT EXISTS idx_emcee_aliases_normalized ON emcee_aliases(alias_normalized);

CREATE TABLE IF NOT EXISTS battles (
  id TEXT PRIMARY KEY NOT NULL,
  league TEXT NOT NULL DEFAULT 'fliptop',
  slug TEXT NOT NULL,
  title TEXT NOT NULL,
  youtube_id TEXT NOT NULL,
  event_name TEXT,
  event_date TEXT,
  status TEXT NOT NULL DEFAULT 'raw'
    CHECK (status IN ('raw', 'arranged', 'reviewing', 'reviewed', 'excluded')),
  created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000)
);
CREATE UNIQUE INDEX IF NOT EXISTS battles_youtube_id_key ON battles(youtube_id);
CREATE UNIQUE INDEX IF NOT EXISTS battles_league_slug_key ON battles(league, slug);
CREATE INDEX IF NOT EXISTS idx_battles_status ON battles(status);
CREATE INDEX IF NOT EXISTS idx_battles_event_date ON battles(event_date);

CREATE TABLE IF NOT EXISTS battle_participants (
  id TEXT PRIMARY KEY NOT NULL,
  battle_id TEXT NOT NULL REFERENCES battles(id) ON DELETE CASCADE,
  emcee_id TEXT NOT NULL REFERENCES emcees(id) ON DELETE CASCADE,
  label TEXT
);
CREATE UNIQUE INDEX IF NOT EXISTS battle_participants_unique_pair
  ON battle_participants(battle_id, emcee_id);
CREATE INDEX IF NOT EXISTS idx_battle_participants_battle_id ON battle_participants(battle_id);
CREATE INDEX IF NOT EXISTS idx_battle_participants_emcee_id ON battle_participants(emcee_id);

CREATE TABLE IF NOT EXISTS lines (
  id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
  battle_id TEXT NOT NULL REFERENCES battles(id) ON DELETE CASCADE,
  emcee_id TEXT REFERENCES emcees(id) ON DELETE SET NULL,
  round_number INTEGER,
  speaker_label TEXT,
  content TEXT NOT NULL,
  start_time REAL NOT NULL,
  end_time REAL NOT NULL,
  created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000)
);
CREATE INDEX IF NOT EXISTS idx_lines_battle_id ON lines(battle_id);
CREATE INDEX IF NOT EXISTS idx_lines_emcee_id ON lines(emcee_id);

CREATE VIRTUAL TABLE IF NOT EXISTS lines_fts USING fts5(
  content,
  content='lines',
  content_rowid='id'
);
CREATE TRIGGER IF NOT EXISTS lines_ai AFTER INSERT ON lines BEGIN
  INSERT INTO lines_fts(rowid, content) VALUES (new.id, new.content);
END;
CREATE TRIGGER IF NOT EXISTS lines_ad AFTER DELETE ON lines BEGIN
  INSERT INTO lines_fts(lines_fts, rowid, content) VALUES('delete', old.id, old.content);
END;
CREATE TRIGGER IF NOT EXISTS lines_au AFTER UPDATE OF content ON lines BEGIN
  INSERT INTO lines_fts(lines_fts, rowid, content) VALUES('delete', old.id, old.content);
  INSERT INTO lines_fts(rowid, content) VALUES (new.id, new.content);
END;

CREATE TABLE IF NOT EXISTS line_speakers (
  line_id INTEGER NOT NULL REFERENCES lines(id) ON DELETE CASCADE,
  emcee_id TEXT NOT NULL REFERENCES emcees(id) ON DELETE CASCADE,
  PRIMARY KEY (line_id, emcee_id)
);
CREATE INDEX IF NOT EXISTS idx_line_speakers_emcee_id ON line_speakers(emcee_id);

CREATE TABLE IF NOT EXISTS edit_history (
  id TEXT PRIMARY KEY NOT NULL,
  line_id INTEGER NOT NULL REFERENCES lines(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  field_changed TEXT NOT NULL,
  old_value TEXT,
  new_value TEXT,
  created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000)
);
CREATE INDEX IF NOT EXISTS idx_edit_history_line_id ON edit_history(line_id);

CREATE TABLE IF NOT EXISTS "user" (
  id TEXT PRIMARY KEY NOT NULL,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  emailVerified INTEGER NOT NULL,
  image TEXT,
  createdAt INTEGER NOT NULL,
  updatedAt INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS "session" (
  id TEXT PRIMARY KEY NOT NULL,
  expiresAt INTEGER NOT NULL,
  token TEXT NOT NULL UNIQUE,
  createdAt INTEGER NOT NULL,
  updatedAt INTEGER NOT NULL,
  ipAddress TEXT,
  userAgent TEXT,
  userId TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS session_userId_idx ON "session"(userId);
CREATE TABLE IF NOT EXISTS "account" (
  id TEXT PRIMARY KEY NOT NULL,
  accountId TEXT NOT NULL,
  providerId TEXT NOT NULL,
  userId TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  accessToken TEXT,
  refreshToken TEXT,
  idToken TEXT,
  accessTokenExpiresAt INTEGER,
  refreshTokenExpiresAt INTEGER,
  scope TEXT,
  password TEXT,
  createdAt INTEGER NOT NULL,
  updatedAt INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS account_userId_idx ON "account"(userId);
CREATE TABLE IF NOT EXISTS "verification" (
  id TEXT PRIMARY KEY NOT NULL,
  identifier TEXT NOT NULL,
  value TEXT NOT NULL,
  expiresAt INTEGER NOT NULL,
  createdAt INTEGER NOT NULL,
  updatedAt INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS verification_identifier_idx ON "verification"(identifier);

CREATE TABLE IF NOT EXISTS user_profiles (
  id TEXT PRIMARY KEY NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'viewer'
    CHECK (role IN ('superadmin', 'admin', 'moderator', 'verified_emcee', 'viewer')),
  trust_level TEXT NOT NULL DEFAULT 'new'
    CHECK (trust_level IN ('new', 'trusted', 'senior')),
  display_name TEXT,
  created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000)
);
CREATE INDEX IF NOT EXISTS idx_user_profiles_role ON user_profiles(role);
CREATE INDEX IF NOT EXISTS idx_user_profiles_trust ON user_profiles(trust_level);

CREATE TABLE IF NOT EXISTS suggestions (
  id TEXT PRIMARY KEY NOT NULL,
  line_id INTEGER NOT NULL REFERENCES lines(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  suggested_content TEXT NOT NULL,
  original_content TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'rejected', 'flagged')),
  reviewed_by TEXT REFERENCES user_profiles(id) ON DELETE SET NULL,
  review_note TEXT,
  created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
  reviewed_at INTEGER
);
CREATE INDEX IF NOT EXISTS idx_suggestions_line_id ON suggestions(line_id);
CREATE INDEX IF NOT EXISTS idx_suggestions_status ON suggestions(status);
CREATE INDEX IF NOT EXISTS idx_suggestions_user_id ON suggestions(user_id);

CREATE TABLE IF NOT EXISTS video_processing_status (
  youtube_id TEXT PRIMARY KEY NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('processing', 'completed', 'failed')),
  worker_id TEXT,
  started_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000)
);
CREATE INDEX IF NOT EXISTS idx_vps_status ON video_processing_status(status);
CREATE INDEX IF NOT EXISTS idx_vps_updated_at ON video_processing_status(updated_at);
