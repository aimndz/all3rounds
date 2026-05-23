ALTER TABLE battles
ADD COLUMN public_visible INTEGER NOT NULL DEFAULT 1
  CHECK (public_visible IN (0, 1));

CREATE INDEX IF NOT EXISTS idx_battles_public_status_event_date
  ON battles(public_visible, status, event_date);

CREATE INDEX IF NOT EXISTS idx_battles_public_league_status_event_date
  ON battles(public_visible, league, status, event_date);

CREATE INDEX IF NOT EXISTS idx_battles_public_event_name_event_date
  ON battles(public_visible, event_name, event_date);
