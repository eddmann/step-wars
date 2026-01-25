-- Fix badge uniqueness: SQLite UNIQUE constraints don't work with NULL values
-- This migration creates partial indexes to properly prevent duplicate badges

-- Step 1: Remove any existing duplicate streak badges (keep oldest by lowest id)
DELETE FROM user_badges
WHERE id NOT IN (
  SELECT MIN(id)
  FROM user_badges
  WHERE challenge_id IS NULL
  GROUP BY user_id, badge_type
)
AND challenge_id IS NULL;

-- Step 2: Remove any existing duplicate challenge badges (keep oldest by lowest id)
DELETE FROM user_badges
WHERE id NOT IN (
  SELECT MIN(id)
  FROM user_badges
  WHERE challenge_id IS NOT NULL
  GROUP BY user_id, badge_type, challenge_id
)
AND challenge_id IS NOT NULL;

-- Step 3: Drop the old constraint by recreating the table
-- SQLite doesn't support DROP CONSTRAINT, so we need to recreate
CREATE TABLE user_badges_new (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  badge_type TEXT NOT NULL CHECK (badge_type IN (
    'daily_winner', 'challenge_winner',
    'streak_7', 'streak_14', 'streak_30', 'streak_60', 'streak_100'
  )),
  challenge_id INTEGER REFERENCES challenges(id) ON DELETE SET NULL,
  earned_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Copy data
INSERT INTO user_badges_new (id, user_id, badge_type, challenge_id, earned_at)
SELECT id, user_id, badge_type, challenge_id, earned_at FROM user_badges;

-- Drop old table and rename new one
DROP TABLE user_badges;
ALTER TABLE user_badges_new RENAME TO user_badges;

-- Step 4: Create partial unique indexes
-- For badges WITH challenge_id (daily_winner, challenge_winner)
CREATE UNIQUE INDEX idx_badges_with_challenge
ON user_badges(user_id, badge_type, challenge_id)
WHERE challenge_id IS NOT NULL;

-- For badges WITHOUT challenge_id (streak badges)
CREATE UNIQUE INDEX idx_badges_no_challenge
ON user_badges(user_id, badge_type)
WHERE challenge_id IS NULL;

-- Recreate the user index
CREATE INDEX idx_badges_user ON user_badges(user_id);
