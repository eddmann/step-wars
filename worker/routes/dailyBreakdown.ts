import type { Context } from "hono";
import type { AppBindings } from "../types";
import { createD1ChallengeRepository } from "../repositories/d1/challenge.d1";
import { createD1ParticipantRepository } from "../repositories/d1/participant.d1";
import { createD1LeaderboardRepository } from "../repositories/d1/leaderboard.d1";
import { createD1DailyPointsRepository } from "../repositories/d1/daily-points.d1";
import { getDailyBreakdown } from "../usecases/get-daily-breakdown.usecase";
import { errorToHttpStatus, errorToMessage } from "../usecases/errors";

// GET /api/challenges/:id/daily-breakdown
export async function handleDailyBreakdown(c: Context<AppBindings>) {
  const user = c.get("user");
  const challengeId = parseInt(c.req.param("id"), 10);

  const challengeRepository = createD1ChallengeRepository(c.env);
  const participantRepository = createD1ParticipantRepository(c.env);
  const leaderboardRepository = createD1LeaderboardRepository(c.env);
  const dailyPointsRepository = createD1DailyPointsRepository(c.env);

  const result = await getDailyBreakdown(
    {
      challengeRepository,
      participantRepository,
      leaderboardRepository,
      dailyPointsRepository,
    },
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

export default handleDailyBreakdown;
