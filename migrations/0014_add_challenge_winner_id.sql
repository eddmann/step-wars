-- Add winner_id to challenges so wins can be counted directly
ALTER TABLE challenges ADD COLUMN winner_id INTEGER REFERENCES users(id) ON DELETE SET NULL;
CREATE INDEX idx_challenges_winner ON challenges(winner_id);
