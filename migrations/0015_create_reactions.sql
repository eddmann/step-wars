CREATE TABLE reactions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  reactor_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  target_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  challenge_id INTEGER NOT NULL REFERENCES challenges(id) ON DELETE CASCADE,
  date TEXT NOT NULL,
  reaction_type TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(reactor_user_id, target_user_id, challenge_id, date, reaction_type)
);
CREATE INDEX idx_reactions_target ON reactions(target_user_id, challenge_id, date);
CREATE INDEX idx_reactions_challenge_date ON reactions(challenge_id, date);
