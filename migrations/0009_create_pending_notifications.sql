-- Pending notifications table for toast messages
-- These are shown to users when they open the app after winning daily/challenge

CREATE TABLE IF NOT EXISTS pending_notifications (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('badge_earned', 'daily_win', 'challenge_won')),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  badge_type TEXT,
  challenge_id INTEGER REFERENCES challenges(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  read_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_pending_notif_user ON pending_notifications(user_id, read_at);
