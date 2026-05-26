-- Add is_submitted column to daily_logs
ALTER TABLE daily_logs ADD COLUMN is_submitted INTEGER NOT NULL DEFAULT 0;

-- Backfill: Mark all existing logs that have a performance score > 0 or xp_gained > 0 as submitted
UPDATE daily_logs SET is_submitted = 1 WHERE performance_score > 0 OR xp_gained > 0;
