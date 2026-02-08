-- ============================================
-- Talasalita: FlipTop Directory
-- Supabase Migration
-- ============================================

-- Enable extensions
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- ============================================
-- 1. Emcees
-- ============================================
CREATE TABLE IF NOT EXISTS emcees (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name       TEXT NOT NULL UNIQUE,
  aka        TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- 2. Battles
-- ============================================
CREATE TABLE IF NOT EXISTS battles (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title      TEXT NOT NULL,
  youtube_id TEXT NOT NULL UNIQUE,
  event_name TEXT,
  event_date DATE,
  url        TEXT GENERATED ALWAYS AS ('https://www.youtube.com/watch?v=' || youtube_id) STORED,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- 3. Battle Participants (Join Table)
-- ============================================
CREATE TABLE IF NOT EXISTS battle_participants (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  battle_id  UUID NOT NULL REFERENCES battles(id) ON DELETE CASCADE,
  emcee_id   UUID NOT NULL REFERENCES emcees(id) ON DELETE CASCADE,
  label      TEXT,  -- e.g. "SPEAKER_00" from diarization
  UNIQUE(battle_id, emcee_id)
);

-- ============================================
-- 4. Lines (The Searchable Core)
-- ============================================
CREATE TABLE IF NOT EXISTS lines (
  id             BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  battle_id      UUID NOT NULL REFERENCES battles(id) ON DELETE CASCADE,
  emcee_id       UUID REFERENCES emcees(id) ON DELETE SET NULL,
  round_number   INT,
  speaker_label  TEXT,       -- Raw diarization output e.g. "SPEAKER_00"
  content        TEXT NOT NULL,
  start_time     FLOAT NOT NULL,
  end_time       FLOAT NOT NULL,
  search_vector  TSVECTOR GENERATED ALWAYS AS (to_tsvector('simple', content)) STORED,
  created_at     TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- 5. Edit History (Community Edits)
-- ============================================
CREATE TABLE IF NOT EXISTS edit_history (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  line_id       BIGINT NOT NULL REFERENCES lines(id) ON DELETE CASCADE,
  user_id       UUID NOT NULL,  -- references auth.users
  field_changed TEXT NOT NULL,  -- "content", "emcee_id", "round_number"
  old_value     TEXT,
  new_value     TEXT,
  created_at    TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- Indexes
-- ============================================

-- Full-text search index on lines
CREATE INDEX IF NOT EXISTS idx_lines_search ON lines USING GIN (search_vector);

-- Trigram index for fuzzy / ILIKE search
CREATE INDEX IF NOT EXISTS idx_lines_content_trgm ON lines USING GIN (content gin_trgm_ops);

-- Foreign key lookups
CREATE INDEX IF NOT EXISTS idx_lines_battle_id ON lines (battle_id);
CREATE INDEX IF NOT EXISTS idx_lines_emcee_id ON lines (emcee_id);
CREATE INDEX IF NOT EXISTS idx_battle_participants_battle_id ON battle_participants (battle_id);
CREATE INDEX IF NOT EXISTS idx_edit_history_line_id ON edit_history (line_id);

-- ============================================
-- Row Level Security (RLS)
-- ============================================

-- Lines: Everyone can read, nobody can write directly from client
ALTER TABLE lines ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Lines are publicly readable"
  ON lines FOR SELECT
  USING (true);

-- Edit History: Logged-in users can insert. Everyone can read.
ALTER TABLE edit_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Edit history is publicly readable"
  ON edit_history FOR SELECT
  USING (true);

CREATE POLICY "Logged-in users can insert edit history"
  ON edit_history FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Emcees: Public read
ALTER TABLE emcees ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Emcees are publicly readable"
  ON emcees FOR SELECT
  USING (true);

-- Battles: Public read
ALTER TABLE battles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Battles are publicly readable"
  ON battles FOR SELECT
  USING (true);

-- Battle Participants: Public read
ALTER TABLE battle_participants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Battle participants are publicly readable"
  ON battle_participants FOR SELECT
  USING (true);

-- ============================================
-- Seed Data (Example - Remove in production)
-- ============================================

-- INSERT INTO emcees (name, aka) VALUES
--   ('Loonie', ARRAY['Luni', 'L']),
--   ('Abra', ARRAY['Abrakadabra']);

-- INSERT INTO battles (title, youtube_id, event_name, event_date) VALUES
--   ('FlipTop - Loonie vs Abra', 'dQw4w9WgXcQ', 'Ahon 13', '2024-06-15');
