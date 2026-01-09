-- User badges and achievements
CREATE TABLE IF NOT EXISTS user_badges (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  badge_type TEXT NOT NULL CHECK (badge_type IN (
    'daily_winner', 'challenge_winner',
    'streak_7', 'streak_14', 'streak_30', 'streak_60', 'streak_100'
  )),
  challenge_id INTEGER REFERENCES challenges(id) ON DELETE SET NULL,
  earned_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(user_id, badge_type, challenge_id)
);

CREATE INDEX IF NOT EXISTS idx_badges_user ON user_badges(user_id);
