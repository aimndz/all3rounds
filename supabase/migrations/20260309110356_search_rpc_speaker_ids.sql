-- Update search_all_hybrid to support speaker_ids array
DROP FUNCTION IF EXISTS search_all_hybrid(search_term TEXT);

CREATE OR REPLACE FUNCTION search_all_hybrid(search_term TEXT)
RETURNS TABLE (
  id BIGINT,
  content TEXT,
  start_time FLOAT,
  end_time FLOAT,
  round_number INT,
  speaker_label TEXT,
  emcee_id UUID,
  emcee_name TEXT,
  speaker_ids UUID[],
  battle_id UUID,
  battle_title TEXT,
  battle_youtube_id TEXT,
  battle_event_name TEXT,
  battle_event_date DATE,
  battle_status text,
  rank FLOAT4
) AS $$
BEGIN
  RETURN QUERY
  WITH matched_lines AS (
    -- 1. Intelligently fetch lines that match content directly (using GIN indexes)
    SELECT l.id,
           (ts_rank_cd(l.search_vector, websearch_to_tsquery('simple', search_term)) * 10.0 +
            CASE WHEN l.content ILIKE search_term THEN 100.0 ELSE 0.0 END +
            similarity(l.content, search_term) * 1.0) AS rank_score
    FROM lines l
    WHERE l.search_vector @@ websearch_to_tsquery('simple', search_term)
       OR l.content % search_term
  ),
  matched_emcees AS (
    -- 2. Fetch emcees matching by name (using GIN index)
    SELECT e.id,
           (CASE WHEN e.name ILIKE search_term THEN 200.0 ELSE 0.0 END +
            similarity(e.name, search_term) * 5.0) AS emcee_score
    FROM emcees e
    WHERE e.name % search_term OR e.name ILIKE search_term
  ),
  matched_battles AS (
    -- 3. Fetch battles matching by title (using GIN index)
    SELECT b.id,
           (CASE WHEN b.title ILIKE search_term THEN 150.0 ELSE 0.0 END +
            similarity(b.title, search_term) * 3.0) AS battle_score
    FROM battles b
    WHERE b.title % search_term OR b.title ILIKE search_term
  ),
  combined_line_ids AS (
    -- 4. Combine all matched line IDs, resolving foreign keys (very fast)
    SELECT ml.id, ml.rank_score AS base_score FROM matched_lines ml
    UNION ALL
    -- Fix: Use BOTH emcee_id and speaker_ids array for emcee matching
    SELECT l.id, me.emcee_score AS base_score 
    FROM lines l 
    JOIN matched_emcees me ON (l.emcee_id = me.id OR l.speaker_ids @> ARRAY[me.id])
    UNION ALL
    SELECT l.id, mb.battle_score AS base_score FROM lines l JOIN matched_battles mb ON l.battle_id = mb.id
  ),
  aggregated_lines AS (
    -- 5. Group by line ID to sum up scores if a line matches multiple ways
    SELECT c.id, SUM(c.base_score) as total_rank
    FROM combined_line_ids c
    GROUP BY c.id
  )
  -- 6. Finally fetch the joined data ONLY for the exact lines we care about
  SELECT 
    l.id, l.content, l.start_time, l.end_time, l.round_number, l.speaker_label,
    e.id as emcee_id, e.name as emcee_name,
    l.speaker_ids,
    b.id as battle_id, b.title as battle_title, b.youtube_id, b.event_name, b.event_date, b.status::text,
    al.total_rank::FLOAT4 as rank
  FROM aggregated_lines al
  JOIN lines l ON al.id = l.id
  LEFT JOIN emcees e ON l.emcee_id = e.id
  LEFT JOIN battles b ON l.battle_id = b.id
  ORDER BY rank DESC
  LIMIT 500;
END;
$$ LANGUAGE plpgsql;
