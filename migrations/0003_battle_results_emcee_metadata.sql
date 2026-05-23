CREATE TABLE IF NOT EXISTS divisions (
  id TEXT PRIMARY KEY NOT NULL,
  league TEXT NOT NULL DEFAULT 'fliptop',
  slug TEXT NOT NULL,
  name TEXT NOT NULL,
  created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
  CHECK (league GLOB '[a-z0-9]*'),
  CHECK (slug GLOB '[a-z0-9]*')
);

CREATE UNIQUE INDEX IF NOT EXISTS divisions_league_slug_key
  ON divisions(league, slug);
CREATE INDEX IF NOT EXISTS idx_divisions_league_name
  ON divisions(league, name);

CREATE TABLE IF NOT EXISTS emcee_divisions (
  emcee_id TEXT NOT NULL REFERENCES emcees(id) ON DELETE CASCADE,
  division_id TEXT NOT NULL REFERENCES divisions(id) ON DELETE CASCADE,
  is_primary INTEGER NOT NULL DEFAULT 0 CHECK (is_primary IN (0, 1)),
  created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
  PRIMARY KEY (emcee_id, division_id)
);

CREATE INDEX IF NOT EXISTS idx_emcee_divisions_division_id
  ON emcee_divisions(division_id);
CREATE UNIQUE INDEX IF NOT EXISTS emcee_divisions_one_primary
  ON emcee_divisions(emcee_id)
  WHERE is_primary = 1;

CREATE TABLE IF NOT EXISTS emcee_hometowns (
  emcee_id TEXT NOT NULL REFERENCES emcees(id) ON DELETE CASCADE,
  hometown TEXT NOT NULL,
  hometown_normalized TEXT NOT NULL,
  country_code TEXT,
  is_primary INTEGER NOT NULL DEFAULT 0 CHECK (is_primary IN (0, 1)),
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
  PRIMARY KEY (emcee_id, hometown_normalized)
);

CREATE INDEX IF NOT EXISTS idx_emcee_hometowns_normalized
  ON emcee_hometowns(hometown_normalized);
CREATE INDEX IF NOT EXISTS idx_emcee_hometowns_country
  ON emcee_hometowns(country_code);
CREATE UNIQUE INDEX IF NOT EXISTS emcee_hometowns_one_primary
  ON emcee_hometowns(emcee_id)
  WHERE is_primary = 1;

CREATE TABLE IF NOT EXISTS titles (
  id TEXT PRIMARY KEY NOT NULL,
  league TEXT NOT NULL DEFAULT 'fliptop',
  slug TEXT NOT NULL,
  name TEXT NOT NULL,
  division_id TEXT REFERENCES divisions(id) ON DELETE SET NULL,
  created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
  CHECK (league GLOB '[a-z0-9]*'),
  CHECK (slug GLOB '[a-z0-9]*')
);

CREATE UNIQUE INDEX IF NOT EXISTS titles_league_slug_key
  ON titles(league, slug);
CREATE INDEX IF NOT EXISTS idx_titles_division_id
  ON titles(division_id);

CREATE TABLE IF NOT EXISTS emcee_titles (
  id TEXT PRIMARY KEY NOT NULL,
  emcee_id TEXT NOT NULL REFERENCES emcees(id) ON DELETE CASCADE,
  title_id TEXT NOT NULL REFERENCES titles(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'current'
    CHECK (status IN ('current', 'former', 'vacated')),
  won_on TEXT,
  lost_on TEXT,
  notes TEXT,
  created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000)
);

CREATE INDEX IF NOT EXISTS idx_emcee_titles_emcee_id
  ON emcee_titles(emcee_id);
CREATE INDEX IF NOT EXISTS idx_emcee_titles_title_id
  ON emcee_titles(title_id);
CREATE INDEX IF NOT EXISTS idx_emcee_titles_status
  ON emcee_titles(status);
CREATE UNIQUE INDEX IF NOT EXISTS emcee_titles_unique_reign
  ON emcee_titles(emcee_id, title_id, won_on);
CREATE UNIQUE INDEX IF NOT EXISTS emcee_titles_one_current_holder
  ON emcee_titles(title_id)
  WHERE status = 'current';

CREATE UNIQUE INDEX IF NOT EXISTS battle_participants_battle_id_id_key
  ON battle_participants(battle_id, id);

CREATE TABLE IF NOT EXISTS battle_results (
  battle_id TEXT PRIMARY KEY NOT NULL REFERENCES battles(id) ON DELETE CASCADE,
  outcome TEXT NOT NULL CHECK (outcome IN ('winner', 'draw', 'no_contest')),
  source TEXT,
  notes TEXT,
  decided_at INTEGER,
  created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000)
);

CREATE INDEX IF NOT EXISTS idx_battle_results_outcome
  ON battle_results(outcome);
CREATE INDEX IF NOT EXISTS idx_battle_results_decided_at
  ON battle_results(decided_at);

CREATE TABLE IF NOT EXISTS battle_result_winners (
  battle_id TEXT NOT NULL,
  participant_id TEXT NOT NULL,
  created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
  PRIMARY KEY (battle_id, participant_id),
  FOREIGN KEY (battle_id) REFERENCES battle_results(battle_id) ON DELETE CASCADE,
  FOREIGN KEY (battle_id, participant_id)
    REFERENCES battle_participants(battle_id, id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_battle_result_winners_participant_id
  ON battle_result_winners(participant_id);

CREATE TRIGGER IF NOT EXISTS battle_result_winners_outcome_insert
BEFORE INSERT ON battle_result_winners
WHEN (
  SELECT outcome
  FROM battle_results
  WHERE battle_id = NEW.battle_id
) <> 'winner'
BEGIN
  SELECT RAISE(ABORT, 'battle_result_winners require battle_results.outcome = winner');
END;

CREATE TRIGGER IF NOT EXISTS battle_result_winners_outcome_update
BEFORE UPDATE ON battle_result_winners
WHEN (
  SELECT outcome
  FROM battle_results
  WHERE battle_id = NEW.battle_id
) <> 'winner'
BEGIN
  SELECT RAISE(ABORT, 'battle_result_winners require battle_results.outcome = winner');
END;

CREATE TRIGGER IF NOT EXISTS battle_results_no_winners_for_non_winner
BEFORE UPDATE OF outcome ON battle_results
WHEN NEW.outcome <> 'winner'
 AND EXISTS (
   SELECT 1
   FROM battle_result_winners
   WHERE battle_id = NEW.battle_id
 )
BEGIN
  SELECT RAISE(ABORT, 'remove battle_result_winners before setting a non-winner outcome');
END;

CREATE TABLE IF NOT EXISTS battle_fan_votes (
  id TEXT PRIMARY KEY NOT NULL,
  battle_id TEXT NOT NULL REFERENCES battles(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  vote_kind TEXT NOT NULL CHECK (vote_kind IN ('participant', 'draw')),
  participant_id TEXT,
  created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
  CHECK (
    (vote_kind = 'draw' AND participant_id IS NULL)
    OR (vote_kind = 'participant' AND participant_id IS NOT NULL)
  ),
  FOREIGN KEY (battle_id, participant_id)
    REFERENCES battle_participants(battle_id, id) ON DELETE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS battle_fan_votes_battle_user_key
  ON battle_fan_votes(battle_id, user_id);
CREATE INDEX IF NOT EXISTS idx_battle_fan_votes_battle_id
  ON battle_fan_votes(battle_id);
CREATE INDEX IF NOT EXISTS idx_battle_fan_votes_user_id
  ON battle_fan_votes(user_id);
CREATE INDEX IF NOT EXISTS idx_battle_fan_votes_participant_id
  ON battle_fan_votes(participant_id);

CREATE VIEW IF NOT EXISTS emcee_result_stats AS
SELECT
  bp.emcee_id,
  COUNT(
    CASE
      WHEN br.outcome IN ('winner', 'draw') THEN 1
    END
  ) AS official_battles,
  COUNT(
    CASE
      WHEN br.outcome = 'winner'
       AND brw.participant_id IS NOT NULL THEN 1
    END
  ) AS wins,
  COUNT(
    CASE
      WHEN br.outcome = 'winner'
       AND brw.participant_id IS NULL THEN 1
    END
  ) AS losses,
  COUNT(
    CASE
      WHEN br.outcome = 'draw' THEN 1
    END
  ) AS draws,
  COUNT(
    CASE
      WHEN br.outcome = 'no_contest' THEN 1
    END
  ) AS no_contests,
  CASE
    WHEN COUNT(CASE WHEN br.outcome IN ('winner', 'draw') THEN 1 END) = 0
      THEN 0.0
    ELSE
      CAST(COUNT(CASE WHEN br.outcome = 'winner' AND brw.participant_id IS NOT NULL THEN 1 END) AS REAL)
      / CAST(COUNT(CASE WHEN br.outcome IN ('winner', 'draw') THEN 1 END) AS REAL)
  END AS win_rate
FROM battle_participants bp
JOIN battle_results br ON br.battle_id = bp.battle_id
LEFT JOIN battle_result_winners brw
  ON brw.battle_id = bp.battle_id
 AND brw.participant_id = bp.id
GROUP BY bp.emcee_id;

CREATE VIEW IF NOT EXISTS battle_fan_vote_totals AS
SELECT
  battle_id,
  vote_kind,
  participant_id,
  COUNT(*) AS vote_count
FROM battle_fan_votes
GROUP BY battle_id, vote_kind, participant_id;
