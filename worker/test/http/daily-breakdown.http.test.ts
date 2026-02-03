import { describe, test, expect } from "bun:test";
import {
  createHttpEnv,
  requestJson,
  registerAndLogin,
  insertUser,
  insertChallenge,
  insertParticipant,
  insertStepEntry,
} from "./helpers";

function todayUtc(): string {
  return new Date().toISOString().split("T")[0];
}

describe("HTTP /api/challenges/:id/daily-breakdown", () => {
  test("returns daily breakdown for challenge", async () => {
    const env = await createHttpEnv();
    const { token, user } = await registerAndLogin(env, {
      email: "breakdown@test.com",
    });

    const other = await insertUser(env, {
      id: 120,
      email: "other2@test.com",
      name: "Other2",
    });
    const date = todayUtc();
    const challenge = await insertChallenge(env, {
      creator_id: user.id,
      start_date: date,
      end_date: date,
      invite_code: "BD1",
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

    await insertStepEntry(env, { user_id: user.id, date, step_count: 1500 });
    await insertStepEntry(env, { user_id: other.id, date, step_count: 2000 });

    const { res, body } = await requestJson<{
      data: {
        challenge_id: number;
        days: Array<{
          date: string;
          rankings: Array<{ user_id: number; is_current_user: boolean }>;
        }>;
      };
    }>(env, `/api/challenges/${challenge.id}/daily-breakdown`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    expect(res.status).toBe(200);
    expect(body.data.challenge_id).toBe(challenge.id);
    expect(body.data.days.length).toBe(1);
    expect(body.data.days[0].date).toBe(date);
    expect(body.data.days[0].rankings.length).toBe(2);
    expect(
      body.data.days[0].rankings.find((row) => row.user_id === user.id)
        ?.is_current_user,
    ).toBe(true);
  });
});
