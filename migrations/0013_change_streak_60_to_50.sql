-- Change streak_60 badge milestone to streak_50
-- Remove CHECK constraint on badge_type (enforced in application code)

UPDATE user_badges SET badge_type = 'streak_50' WHERE badge_type = 'streak_60';

CREATE TABLE user_badges_new (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  badge_type TEXT NOT NULL,
  earned_at TEXT NOT NULL DEFAULT (datetime('now'))
);

INSERT INTO user_badges_new (id, user_id, badge_type, earned_at)
SELECT id, user_id, badge_type, earned_at FROM user_badges;

DROP TABLE user_badges;
ALTER TABLE user_badges_new RENAME TO user_badges;

CREATE UNIQUE INDEX idx_badges_unique ON user_badges(user_id, badge_type);
CREATE INDEX idx_badges_user ON user_badges(user_id);
