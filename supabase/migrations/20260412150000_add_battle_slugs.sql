CREATE OR REPLACE FUNCTION public.slugify_battle_value(input_value TEXT)
RETURNS TEXT
LANGUAGE sql
STABLE
AS $$
  SELECT COALESCE(
    NULLIF(
      TRIM(
        BOTH '-'
        FROM REGEXP_REPLACE(
          REGEXP_REPLACE(
            REGEXP_REPLACE(
              REGEXP_REPLACE(
                LOWER(unaccent(COALESCE(input_value, ''))),
                '\$',
                's',
                'g'
              ),
              '@',
              'a',
              'g'
            ),
            '[._/\s+-]+',
            '-',
            'g'
          ),
          '[^a-z0-9-]+',
          '',
          'g'
        )
      ),
      ''
    ),
    'battle'
  );
$$;

ALTER TABLE public.battles
ADD COLUMN IF NOT EXISTS league TEXT;

ALTER TABLE public.battles
ADD COLUMN IF NOT EXISTS slug TEXT;

UPDATE public.battles
SET league = 'fliptop'
WHERE league IS NULL OR league = '';

CREATE OR REPLACE FUNCTION public.assign_battle_route_fields()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  normalized_league TEXT;
  base_slug TEXT;
  candidate_slug TEXT;
BEGIN
  IF TG_OP = 'UPDATE'
     AND NEW.title IS NOT DISTINCT FROM OLD.title
     AND NEW.league IS NOT DISTINCT FROM OLD.league
     AND COALESCE(NEW.slug, '') <> ''
  THEN
    RETURN NEW;
  END IF;

  normalized_league := public.slugify_battle_value(COALESCE(NEW.league, 'fliptop'));
  base_slug := public.slugify_battle_value(NEW.title);

  NEW.league := normalized_league;

  PERFORM pg_advisory_xact_lock(
    hashtextextended(normalized_league || ':' || base_slug, 0)
  );

  SELECT
    CASE
      WHEN COUNT(*) FILTER (WHERE slug = base_slug) = 0 THEN base_slug
      ELSE base_slug || '-' || (COALESCE(MAX(
        CASE
          WHEN slug = base_slug THEN 1
          WHEN slug ~ ('^' || base_slug || '-[0-9]+$') THEN
            SUBSTRING(slug FROM ('^' || base_slug || '-([0-9]+)$'))::INT
          ELSE NULL
        END
      ), 1) + 1)
    END
  INTO candidate_slug
  FROM public.battles
  WHERE id IS DISTINCT FROM NEW.id
    AND league = normalized_league
    AND (slug = base_slug OR slug LIKE base_slug || '-%');

  NEW.slug := candidate_slug;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tr_assign_battle_route_fields ON public.battles;
CREATE TRIGGER tr_assign_battle_route_fields
BEFORE INSERT OR UPDATE OF title, league
ON public.battles
FOR EACH ROW
EXECUTE FUNCTION public.assign_battle_route_fields();

UPDATE public.battles
SET league = 'fliptop',
    slug = NULL,
    title = title;

ALTER TABLE public.battles
ALTER COLUMN league SET NOT NULL;

ALTER TABLE public.battles
ALTER COLUMN slug SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'battles_league_format_check'
      AND conrelid = 'public.battles'::regclass
  ) THEN
    ALTER TABLE public.battles
    ADD CONSTRAINT battles_league_format_check
    CHECK (league ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$');
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'battles_slug_format_check'
      AND conrelid = 'public.battles'::regclass
  ) THEN
    ALTER TABLE public.battles
    ADD CONSTRAINT battles_slug_format_check
    CHECK (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$');
  END IF;
END;
$$;

CREATE UNIQUE INDEX IF NOT EXISTS battles_league_slug_key
ON public.battles (league, slug);
