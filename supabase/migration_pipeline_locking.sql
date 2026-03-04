-- Distributed Pipeline Locking for Multi-Account Processing
-- This table ensures that multiple workers (Colab instances) don't process the same video simultaneously.

CREATE TABLE IF NOT EXISTS video_processing_status (
    youtube_id TEXT PRIMARY KEY,
    status     TEXT NOT NULL CHECK (status IN ('processing', 'completed', 'failed')),
    worker_id  TEXT,          -- Identifies the specific machine/account processing it
    started_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS (Service Key will bypass this, but good practice)
ALTER TABLE video_processing_status ENABLE ROW LEVEL SECURITY;

-- Allow public read (for status checking)
CREATE POLICY "Public read video_processing_status" 
ON video_processing_status FOR SELECT 
USING (true);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_vps_status ON video_processing_status (status);
CREATE INDEX IF NOT EXISTS idx_vps_updated_at ON video_processing_status (updated_at);
