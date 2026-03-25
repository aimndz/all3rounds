-- Aggregate admin review stats in SQL to avoid per-request JS loops over suggestions.
CREATE OR REPLACE FUNCTION public.get_admin_review_stats()
RETURNS TABLE (
  reviewed_by uuid,
  display_name text,
  role text,
  approved bigint,
  rejected bigint,
  total bigint,
  last_review timestamptz,
  total_approved bigint,
  total_rejected bigint,
  total_reviews bigint
)
LANGUAGE sql
STABLE
AS $$
  WITH overview AS (
    SELECT
      COUNT(*) FILTER (WHERE s.status = 'approved')::bigint AS total_approved,
      COUNT(*) FILTER (WHERE s.status = 'rejected')::bigint AS total_rejected,
      COUNT(*) FILTER (WHERE s.status IN ('approved', 'rejected'))::bigint AS total_reviews
    FROM public.suggestions s
  ),
  by_moderator AS (
    SELECT
      s.reviewed_by,
      COALESCE(up.display_name, 'Unknown') AS display_name,
      COALESCE(up.role, 'unknown') AS role,
      COUNT(*) FILTER (WHERE s.status = 'approved')::bigint AS approved,
      COUNT(*) FILTER (WHERE s.status = 'rejected')::bigint AS rejected,
      COUNT(*)::bigint AS total,
      MAX(s.reviewed_at) AS last_review
    FROM public.suggestions s
    LEFT JOIN public.user_profiles up ON up.id = s.reviewed_by
    WHERE s.status IN ('approved', 'rejected')
      AND s.reviewed_by IS NOT NULL
    GROUP BY s.reviewed_by, up.display_name, up.role
  )
  SELECT
    m.reviewed_by,
    m.display_name,
    m.role,
    m.approved,
    m.rejected,
    m.total,
    m.last_review,
    o.total_approved,
    o.total_rejected,
    o.total_reviews
  FROM by_moderator m
  CROSS JOIN overview o
  ORDER BY m.total DESC;
$$;
