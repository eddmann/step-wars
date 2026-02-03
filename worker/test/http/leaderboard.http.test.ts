import { describe, test, expect } from "bun:test";
import {
  createHttpEnv,
  requestJson,
  registerAndLogin,
  insertUser,
  insertChallenge,
  insertParticipant,
  insertStepEntry,
  insertDailyPoints,
} from "./helpers";

function todayUtc(): string {
  return new Date().toISOString().split("T")[0];
}

describe("HTTP /api/challenges/:id/leaderboard", () => {
  test("returns leaderboard for challenge", async () => {
    const env = await createHttpEnv();
    const { token, user } = await registerAndLogin(env, {
      email: "leader@test.com",
    });

    const other = await insertUser(env, {
      id: 99,
      email: "other@test.com",
      name: "Other",
    });
    const date = todayUtc();
    const challenge = await insertChallenge(env, {
      creator_id: user.id,
      start_date: date,
      end_date: date,
      invite_code: "LB1",
      status: "active",
      timezone: "UTC",
    });

    await insertParticipant(env, {
      challenge_id: challenge.id,
      user_id: user.id,
    });
    await insertParticipant(env, {
      challenge_id: challenge.id,
      user_id: other.id,
    });

    await insertStepEntry(env, { user_id: user.id, date, step_count: 1000 });
    await insertStepEntry(env, { user_id: other.id, date, step_count: 2000 });
    await insertDailyPoints(env, {
      challenge_id: challenge.id,
      user_id: other.id,
      date,
      points: 3,
    });

    const { res, body } = await requestJson<{
      data: {
        challenge_id: number;
        leaderboard: Array<{ user_id: number; is_current_user: boolean }>;
      };
    }>(env, `/api/challenges/${challenge.id}/leaderboard`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    expect(res.status).toBe(200);
    expect(body.data.challenge_id).toBe(challenge.id);
    expect(body.data.leaderboard.length).toBe(2);
    expect(
      body.data.leaderboard.find((row) => row.user_id === user.id)
        ?.is_current_user,
    ).toBe(true);
  });
});
