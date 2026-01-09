-- Challenge participants join table
CREATE TABLE IF NOT EXISTS challenge_participants (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  challenge_id INTEGER NOT NULL REFERENCES challenges(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  joined_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(challenge_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_participants_challenge ON challenge_participants(challenge_id);
CREATE INDEX IF NOT EXISTS idx_participants_user ON challenge_participants(user_id);
