CREATE INDEX IF NOT EXISTS idx_battles_status_event_date
  ON battles(status, event_date);

CREATE INDEX IF NOT EXISTS idx_battles_event_name_event_date
  ON battles(event_name, event_date);

CREATE INDEX IF NOT EXISTS idx_battles_status_event_name_event_date
  ON battles(status, event_name, event_date);

CREATE INDEX IF NOT EXISTS idx_lines_battle_start
  ON lines(battle_id, start_time);

CREATE INDEX IF NOT EXISTS idx_line_speakers_line_id
  ON line_speakers(line_id);

CREATE INDEX IF NOT EXISTS idx_suggestions_status_reviewed_at
  ON suggestions(status, reviewed_at);

CREATE INDEX IF NOT EXISTS idx_edit_history_created_at
  ON edit_history(created_at);
