-- Remove junction table if it exists
DROP TABLE IF EXISTS line_speakers CASCADE;

-- Add speaker_ids array column to lines table
ALTER TABLE lines 
ADD COLUMN IF NOT EXISTS speaker_ids UUID[] DEFAULT '{}';

-- Remove the old redundant emcee_ids column if it accidentally got created
ALTER TABLE lines DROP COLUMN IF EXISTS emcee_ids;

-- Backfill existing data
UPDATE lines 
SET speaker_ids = ARRAY[emcee_id] 
WHERE emcee_id IS NOT NULL AND speaker_ids = '{}';

-- Create an index for the array column to allow fast searching
CREATE INDEX IF NOT EXISTS idx_lines_speaker_ids ON lines USING GIN (speaker_ids);
