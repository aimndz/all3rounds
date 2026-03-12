-- RPC function to replace an emcee UUID inside speaker_ids arrays.
-- Used during emcee merges to update multi-speaker line references.
CREATE OR REPLACE FUNCTION merge_speaker_ids(old_emcee_id UUID, new_emcee_id UUID)
RETURNS void
LANGUAGE sql
AS $$
  UPDATE lines
  SET speaker_ids = array_replace(speaker_ids, old_emcee_id, new_emcee_id)
  WHERE speaker_ids @> ARRAY[old_emcee_id];
$$;
