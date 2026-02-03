import type { Context } from "hono";
import type { AppBindings } from "../types";
import { createD1ChallengeRepository } from "../repositories/d1/challenge.d1";
import { createD1ParticipantRepository } from "../repositories/d1/participant.d1";
import { createD1LeaderboardRepository } from "../repositories/d1/leaderboard.d1";
import { getLeaderboard } from "../usecases/get-leaderboard.usecase";
import { errorToHttpStatus, errorToMessage } from "../usecases/errors";

// GET /api/challenges/:id/leaderboard
export async function handleLeaderboard(c: Context<AppBindings>) {
  const user = c.get("user");
  const challengeId = parseInt(c.req.param("id"), 10);

  const challengeRepository = createD1ChallengeRepository(c.env);
  const participantRepository = createD1ParticipantRepository(c.env);
  const leaderboardRepository = createD1LeaderboardRepository(c.env);

  const result = await getLeaderboard(
    { challengeRepository, participantRepository, leaderboardRepository },
    { userId: user.id, challengeId },
  );

  if (!result.ok) {
    return c.json(
      { error: errorToMessage(result.error) },
      errorToHttpStatus(result.error),
    );
  }

  return c.json({ data: result.value });
}

export default handleLeaderboard;
