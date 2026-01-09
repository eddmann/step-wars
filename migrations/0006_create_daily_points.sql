-- Daily points for daily_winner mode
CREATE TABLE IF NOT EXISTS daily_points (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  challenge_id INTEGER NOT NULL REFERENCES challenges(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  date TEXT NOT NULL,
  points INTEGER NOT NULL DEFAULT 0,
  UNIQUE(challenge_id, user_id, date)
);

CREATE INDEX IF NOT EXISTS idx_daily_points_challenge ON daily_points(challenge_id, date);
