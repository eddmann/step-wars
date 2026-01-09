-- User goals for personal tracking
CREATE TABLE IF NOT EXISTS user_goals (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  daily_target INTEGER NOT NULL DEFAULT 10000,
  weekly_target INTEGER NOT NULL DEFAULT 70000,
  is_paused INTEGER NOT NULL DEFAULT 0,
  paused_at TEXT,
  current_streak INTEGER NOT NULL DEFAULT 0,
  longest_streak INTEGER NOT NULL DEFAULT 0,
  last_achieved_date TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
