CREATE EXTENSION IF NOT EXISTS unaccent;

CREATE OR REPLACE FUNCTION public.slugify_emcee_name(input_name TEXT)
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
                REGEXP_REPLACE(
                  LOWER(unaccent(COALESCE(input_name, ''))),
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
          ),
          '[^a-z0-9]+',
          '-',
          'g'
        )
      ),
      ''
    ),
    'emcee'
  );
$$;

ALTER TABLE public.emcees
ADD COLUMN IF NOT EXISTS slug TEXT;

CREATE OR REPLACE FUNCTION public.assign_emcee_slug()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  base_slug TEXT;
  candidate_slug TEXT;
BEGIN
  IF TG_OP = 'UPDATE'
     AND NEW.name IS NOT DISTINCT FROM OLD.name
     AND COALESCE(NEW.slug, '') <> ''
  THEN
    RETURN NEW;
  END IF;

  base_slug := public.slugify_emcee_name(NEW.name);

  PERFORM pg_advisory_xact_lock(hashtextextended(base_slug, 0));

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
  FROM public.emcees
  WHERE id IS DISTINCT FROM NEW.id
    AND (slug = base_slug OR slug LIKE base_slug || '-%');

  NEW.slug := candidate_slug;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tr_assign_emcee_slug ON public.emcees;
CREATE TRIGGER tr_assign_emcee_slug
BEFORE INSERT OR UPDATE OF name
ON public.emcees
FOR EACH ROW
EXECUTE FUNCTION public.assign_emcee_slug();

UPDATE public.emcees
SET name = name
WHERE slug IS NULL OR slug = '';

ALTER TABLE public.emcees
ALTER COLUMN slug SET NOT NULL;

ALTER TABLE public.emcees
DROP CONSTRAINT IF EXISTS emcees_name_key;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'emcees_slug_format_check'
      AND conrelid = 'public.emcees'::regclass
  ) THEN
    ALTER TABLE public.emcees
    ADD CONSTRAINT emcees_slug_format_check
    CHECK (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$');
  END IF;
END;
$$;

CREATE UNIQUE INDEX IF NOT EXISTS emcees_slug_key ON public.emcees (slug);
