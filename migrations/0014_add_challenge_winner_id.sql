-- Add winner_id column to track challenge winners directly
ALTER TABLE challenges ADD COLUMN winner_id INTEGER REFERENCES users(id) ON DELETE SET NULL;
CREATE INDEX idx_challenges_winner_id ON challenges(winner_id);

-- Backfill cumulative mode winners
UPDATE challenges SET winner_id = (
  SELECT cp.user_id
  FROM challenge_participants cp
  LEFT JOIN step_entries se ON se.user_id = cp.user_id
    AND se.date >= challenges.start_date AND se.date <= challenges.end_date
  WHERE cp.challenge_id = challenges.id
  GROUP BY cp.user_id
  HAVING COALESCE(SUM(se.step_count), 0) > 0
  ORDER BY COALESCE(SUM(se.step_count), 0) DESC
  LIMIT 1
)
WHERE status = 'completed' AND mode = 'cumulative';

-- Backfill daily_winner mode winners
UPDATE challenges SET winner_id = (
  SELECT cp.user_id
  FROM challenge_participants cp
  LEFT JOIN daily_points dp ON dp.user_id = cp.user_id AND dp.challenge_id = challenges.id
  WHERE cp.challenge_id = challenges.id
  GROUP BY cp.user_id
  HAVING COALESCE(SUM(dp.points), 0) > 0
  ORDER BY COALESCE(SUM(dp.points), 0) DESC
  LIMIT 1
)
WHERE status = 'completed' AND mode = 'daily_winner';
