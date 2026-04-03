CREATE INDEX IF NOT EXISTS idx_battles_status ON public.battles (status);

CREATE OR REPLACE FUNCTION public.get_random_valid_line_id(
  allowed_statuses TEXT[] DEFAULT ARRAY['reviewing']
)
RETURNS bigint
LANGUAGE sql
VOLATILE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT l.id
  FROM public.battles b
  JOIN public.lines l ON l.battle_id = b.id
  WHERE b.status::TEXT = ANY (allowed_statuses)
  ORDER BY random()
  LIMIT 1;
$function$;

CREATE OR REPLACE FUNCTION public.get_random_valid_line_ids(
  sample_size integer DEFAULT 6,
  allowed_statuses TEXT[] DEFAULT ARRAY['reviewing']
)
RETURNS TABLE(id bigint)
LANGUAGE sql
VOLATILE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT l.id
  FROM public.battles b
  JOIN public.lines l ON l.battle_id = b.id
  WHERE b.status::TEXT = ANY (allowed_statuses)
  ORDER BY random()
  LIMIT LEAST(GREATEST(sample_size, 1), 12);
$function$;
