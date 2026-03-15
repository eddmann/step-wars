-- Recreate pending_notifications without the CHECK constraint on type
CREATE TABLE pending_notifications_new (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  badge_type TEXT,
  challenge_id INTEGER REFERENCES challenges(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  read_at TEXT
);

INSERT INTO pending_notifications_new (id, user_id, type, title, message, badge_type, challenge_id, created_at, read_at)
  SELECT id, user_id, type, title, message, badge_type, challenge_id, created_at, read_at FROM pending_notifications;

DROP TABLE pending_notifications;

ALTER TABLE pending_notifications_new RENAME TO pending_notifications;

CREATE INDEX idx_pending_notif_user ON pending_notifications(user_id, read_at);
