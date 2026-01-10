-- Step entries table (global - one entry per user per day)
DROP TABLE IF EXISTS step_entries;

CREATE TABLE step_entries (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  date TEXT NOT NULL,
  step_count INTEGER NOT NULL CHECK (step_count >= 0 AND step_count <= 100000),
  source TEXT NOT NULL DEFAULT 'manual' CHECK (source IN ('manual', 'healthkit', 'google_fit', 'garmin', 'strava')),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(user_id, date)
);

CREATE INDEX IF NOT EXISTS idx_entries_user_date ON step_entries(user_id, date);
