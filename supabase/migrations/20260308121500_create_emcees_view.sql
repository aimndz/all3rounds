-- Create a view for emcees with battle counts to allow server-side filtering and sorting by count
CREATE OR REPLACE VIEW public.emcees_view AS
SELECT 
    e.id,
    e.name,
    e.aka,
    COUNT(bp.id) as battle_count
FROM 
    public.emcees e
LEFT JOIN 
    public.battle_participants bp ON e.id = bp.emcee_id
LEFT JOIN 
    public.battles b ON bp.battle_id = b.id AND b.status != 'excluded'
GROUP BY 
    e.id, e.name, e.aka;
