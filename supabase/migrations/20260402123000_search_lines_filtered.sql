-- Filter-aware search for transcript lines.
-- Keeps the default broad search_fast() flow intact while allowing
-- structured filters like emcee:, battle:, and event: to narrow results.

CREATE OR REPLACE FUNCTION public.search_lines_filtered(
  search_term TEXT DEFAULT NULL,
  p_emcee_name TEXT DEFAULT NULL,
  p_battle_term TEXT DEFAULT NULL,
  p_event_term TEXT DEFAULT NULL
)
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
  battle_status TEXT,
  rank FLOAT4
) AS $$
BEGIN
  PERFORM set_config('statement_timeout', '3000', true);
  PERFORM set_config('pg_trgm.similarity_threshold', '0.4', true);

  RETURN QUERY
  WITH normalized_inputs AS (
    SELECT
      NULLIF(trim(search_term), '') AS search_term,
      NULLIF(trim(p_emcee_name), '') AS emcee_name,
      NULLIF(trim(p_battle_term), '') AS battle_term,
      NULLIF(trim(p_event_term), '') AS event_term
  ),
  matched_emcees AS (
    SELECT e.id
    FROM public.emcees e
    CROSS JOIN normalized_inputs i
    WHERE i.emcee_name IS NOT NULL
      AND lower(regexp_replace(trim(e.name), '\s+', ' ', 'g')) =
          lower(i.emcee_name)
  ),
  filtered_battles AS (
    SELECT b.id
    FROM public.battles b
    CROSS JOIN normalized_inputs i
    WHERE (i.battle_term IS NOT NULL OR i.event_term IS NOT NULL)
      AND (
        i.battle_term IS NULL
        OR lower(regexp_replace(trim(b.title), '\s+', ' ', 'g')) =
           lower(i.battle_term)
      )
      AND (
        i.event_term IS NULL
        OR lower(regexp_replace(trim(COALESCE(b.event_name, '')), '\s+', ' ', 'g')) =
           lower(i.event_term)
      )
  ),
  text_matches AS (
    SELECT
      l.id,
      (
        ts_rank_cd(
          l.search_vector,
          websearch_to_tsquery('simple', i.search_term)
        ) * 10.0
        + CASE
            WHEN l.content ILIKE '%' || i.search_term || '%' THEN 100.0
            ELSE 0.0
          END
      )::FLOAT4 AS rank_score
    FROM public.lines l
    CROSS JOIN normalized_inputs i
    WHERE i.search_term IS NOT NULL
      AND (
        l.search_vector @@ websearch_to_tsquery('simple', i.search_term)
        OR l.content ILIKE '%' || i.search_term || '%'
      )
    ORDER BY rank_score DESC, l.id DESC
    LIMIT 2000
  ),
  emcee_filtered_lines AS (
    SELECT DISTINCT l.id
    FROM public.lines l
    JOIN matched_emcees me
      ON l.emcee_id = me.id
      OR l.speaker_ids @> ARRAY[me.id]::UUID[]
  ),
  battle_filtered_lines AS (
    SELECT l.id
    FROM public.lines l
    JOIN filtered_battles fb ON fb.id = l.battle_id
  ),
  base_candidates AS (
    -- When we have text, start from the text match set because it is index-backed
    -- and much smaller than broad emcee or battle filter matches.
    SELECT tm.id, tm.rank_score
    FROM text_matches tm
    CROSS JOIN normalized_inputs i
    WHERE i.search_term IS NOT NULL

    UNION ALL

    -- Filter-only: emcee-only
    SELECT efl.id, 0::FLOAT4 AS rank_score
    FROM emcee_filtered_lines efl
    CROSS JOIN normalized_inputs i
    WHERE i.search_term IS NULL
      AND i.emcee_name IS NOT NULL
      AND i.battle_term IS NULL
      AND i.event_term IS NULL

    UNION ALL

    -- Filter-only: battle/event only
    SELECT bfl.id, 0::FLOAT4 AS rank_score
    FROM battle_filtered_lines bfl
    CROSS JOIN normalized_inputs i
    WHERE i.search_term IS NULL
      AND i.emcee_name IS NULL
      AND (i.battle_term IS NOT NULL OR i.event_term IS NOT NULL)

    UNION ALL

    -- Filter-only: emcee plus battle/event
    SELECT efl.id, 0::FLOAT4 AS rank_score
    FROM emcee_filtered_lines efl
    JOIN battle_filtered_lines bfl ON bfl.id = efl.id
    CROSS JOIN normalized_inputs i
    WHERE i.search_term IS NULL
      AND i.emcee_name IS NOT NULL
      AND (i.battle_term IS NOT NULL OR i.event_term IS NOT NULL)
  ),
  filtered_candidates AS (
    SELECT bc.id, bc.rank_score
    FROM base_candidates bc
    CROSS JOIN normalized_inputs i
    WHERE (
      i.emcee_name IS NULL
      OR EXISTS (
        SELECT 1
        FROM emcee_filtered_lines efl
        WHERE efl.id = bc.id
      )
    )
      AND (
        (i.battle_term IS NULL AND i.event_term IS NULL)
        OR EXISTS (
          SELECT 1
          FROM battle_filtered_lines bfl
          WHERE bfl.id = bc.id
        )
      )
  ),
  ranked_lines AS (
    SELECT fc.id, MAX(fc.rank_score) AS rank_score
    FROM filtered_candidates fc
    GROUP BY fc.id
  )
  SELECT
    l.id,
    l.content,
    l.start_time,
    l.end_time,
    l.round_number,
    l.speaker_label,
    e.id AS emcee_id,
    e.name AS emcee_name,
    l.speaker_ids,
    b.id AS battle_id,
    b.title AS battle_title,
    b.youtube_id AS battle_youtube_id,
    b.event_name AS battle_event_name,
    b.event_date AS battle_event_date,
    b.status::TEXT AS battle_status,
    rl.rank_score AS rank
  FROM ranked_lines rl
  JOIN public.lines l ON rl.id = l.id
  LEFT JOIN public.emcees e ON l.emcee_id = e.id
  LEFT JOIN public.battles b ON l.battle_id = b.id
  ORDER BY
    CASE WHEN rl.rank_score > 0 THEN 0 ELSE 1 END,
    rl.rank_score DESC,
    b.event_date DESC NULLS LAST,
    l.id DESC
  LIMIT 500;
END;
$$ LANGUAGE plpgsql;
