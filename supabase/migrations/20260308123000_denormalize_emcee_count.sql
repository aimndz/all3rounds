-- 1. Add battle_count column to emcees
ALTER TABLE public.emcees ADD COLUMN IF NOT EXISTS battle_count INT DEFAULT 0;

-- 2. Initial populate of battle_count
UPDATE public.emcees e
SET battle_count = (
    SELECT count(*)
    FROM public.battle_participants bp
    JOIN public.battles b ON bp.battle_id = b.id
    WHERE bp.emcee_id = e.id AND b.status != 'excluded'
);

-- 3. Create a function to update the count
CREATE OR REPLACE FUNCTION public.sync_emcee_battle_count()
RETURNS TRIGGER AS $$
BEGIN
    IF (TG_OP = 'INSERT') THEN
        UPDATE public.emcees SET battle_count = battle_count + 1 WHERE id = NEW.emcee_id;
    ELSIF (TG_OP = 'DELETE') THEN
        UPDATE public.emcees SET battle_count = battle_count - 1 WHERE id = OLD.emcee_id;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- 4. Create the trigger
DROP TRIGGER IF EXISTS tr_sync_emcee_battle_count ON public.battle_participants;
CREATE TRIGGER tr_sync_emcee_battle_count
AFTER INSERT OR DELETE ON public.battle_participants
FOR EACH ROW EXECUTE FUNCTION public.sync_emcee_battle_count();

-- 5. Cleanup the view (as it's no longer needed)
DROP VIEW IF EXISTS public.emcees_view;
