-- Enable pg_trgm extension for fuzzy search
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Create GIN indexes on title and event_name for fast trigram similarity searches
CREATE INDEX IF NOT EXISTS idx_battles_title_trgm ON battles USING GIN (title gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_battles_event_name_trgm ON battles USING GIN (event_name gin_trgm_ops);

-- Create RPC function for fuzzy searching battles
CREATE OR REPLACE FUNCTION search_battles_fuzzy(
  search_query text,
  status_filter text DEFAULT 'all',
  year_filter text DEFAULT 'all',
  sort_order text DEFAULT 'latest',
  page_size int DEFAULT 24,
  page_offset int DEFAULT 0
) RETURNS TABLE (
  id uuid,
  title text,
  youtube_id text,
  event_name text,
  event_date date,
  status battle_status,
  url text,
  total_count bigint
) AS $$
DECLARE
  base_query text;
  count_query text;
  where_clause text;
  order_clause text;
  safe_query text;
BEGIN
  -- We don't want to exclude explicitly excluded battles
  where_clause := 'WHERE status != ''excluded''';

  -- Apply status filter
  IF status_filter != 'all' THEN
    where_clause := where_clause || format(' AND status = %L', status_filter);
  END IF;

  -- Apply year filter
  IF year_filter != 'all' THEN
    where_clause := where_clause || format(' AND event_date >= %L AND event_date <= %L', 
                                           year_filter || '-01-01', 
                                           year_filter || '-12-31');
  END IF;

  -- Apply search condition
  IF search_query != '' THEN
    -- Escape % and _ to treat them literally if present, else just pass query to trigram
    safe_query := search_query;
    where_clause := where_clause || format(' AND (
      title ILIKE %L OR 
      event_name ILIKE %L OR
      similarity(title, %L) > 0.15 OR 
      similarity(event_name, %L) > 0.15
    )', '%' || safe_query || '%', '%' || safe_query || '%', search_query, search_query);
  END IF;

  -- Apply sorting
  IF sort_order = 'oldest' THEN
    order_clause := 'ORDER BY event_date ASC NULLS LAST';
  ELSIF search_query != '' THEN
    -- If searching, order by similarity first, then date
    order_clause := format('ORDER BY GREATEST(similarity(title, %L), similarity(event_name, %L)) DESC, event_date DESC NULLS LAST', search_query, search_query);
  ELSE
    order_clause := 'ORDER BY event_date DESC NULLS LAST';
  END IF;

  -- Construct final queries
  count_query := 'SELECT count(*) FROM battles ' || where_clause;
  
  base_query := 'SELECT id, title, youtube_id, event_name, event_date, status, url, (' || count_query || ') as total_count FROM battles ' || 
                where_clause || ' ' || 
                order_clause || 
                format(' LIMIT %s OFFSET %s', page_size, page_offset);

  RETURN QUERY EXECUTE base_query;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
