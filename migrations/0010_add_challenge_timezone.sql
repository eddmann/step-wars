-- Add timezone field to challenges table
-- Each challenge operates in its own timezone for fair daily calculations
ALTER TABLE challenges ADD COLUMN timezone TEXT NOT NULL DEFAULT 'UTC';
