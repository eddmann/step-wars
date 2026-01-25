-- Make badges global: each badge type can only be earned once per user
-- Previously daily_winner and challenge_winner were tied to challenge_id

-- Step 1: Remove duplicates (keep oldest by lowest id)
DELETE FROM user_badges WHERE id NOT IN (
  SELECT MIN(id) FROM user_badges GROUP BY user_id, badge_type
);

-- Step 2: Drop old partial indexes
DROP INDEX IF EXISTS idx_badges_with_challenge;
DROP INDEX IF EXISTS idx_badges_no_challenge;
DROP INDEX IF EXISTS idx_badges_user;

-- Step 3: Recreate table without challenge_id
CREATE TABLE user_badges_new (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  badge_type TEXT NOT NULL CHECK (badge_type IN (
    'daily_winner', 'challenge_winner',
    'streak_7', 'streak_14', 'streak_30', 'streak_60', 'streak_100'
  )),
  earned_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Copy data (excluding challenge_id)
INSERT INTO user_badges_new (id, user_id, badge_type, earned_at)
SELECT id, user_id, badge_type, earned_at FROM user_badges;

-- Drop old table and rename new one
DROP TABLE user_badges;
ALTER TABLE user_badges_new RENAME TO user_badges;

-- Step 4: Add simple unique constraint (one badge type per user)
CREATE UNIQUE INDEX idx_badges_unique ON user_badges(user_id, badge_type);

-- Recreate the user index for faster lookups
CREATE INDEX idx_badges_user ON user_badges(user_id);
