import { describe, test, expect } from "bun:test";
import {
  createHttpEnv,
  requestJson,
  registerAndLogin,
  insertChallenge,
  insertParticipant,
  insertStepEntry,
  insertBadge,
} from "./helpers";

function todayUtc(): string {
  return new Date().toISOString().split("T")[0];
}

describe("HTTP /api/profile", () => {
  test("returns user profile with stats", async () => {
    const env = await createHttpEnv();
    const { token, user } = await registerAndLogin(env, {
      email: "profile@test.com",
    });

    const date = todayUtc();
    await insertStepEntry(env, { user_id: user.id, date, step_count: 2500 });
    const challenge = await insertChallenge(env, {
      creator_id: user.id,
      start_date: date,
      end_date: date,
      invite_code: "PROF1",
    });
    await insertParticipant(env, {
      challenge_id: challenge.id,
      user_id: user.id,
    });
    await insertBadge(env, {
      user_id: user.id,
      badge_type: "challenge_winner",
    });

    const { res, body } = await requestJson<{
      data: {
        user: { id: number };
        stats: { total_steps: number; challenges_joined: number };
      };
    }>(env, "/api/profile", {
      headers: { Authorization: `Bearer ${token}` },
    });

    expect(res.status).toBe(200);
    expect(body.data.user.id).toBe(user.id);
    expect(body.data.stats.total_steps).toBeGreaterThan(0);
    expect(body.data.stats.challenges_joined).toBe(1);
  });

  test("updates profile", async () => {
    const env = await createHttpEnv();
    const { token } = await registerAndLogin(env, {
      email: "profile2@test.com",
    });

    const { res, body } = await requestJson<{
      data: { user: { name: string; email: string } };
    }>(env, "/api/profile", {
      method: "PUT",
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        name: "New Name",
        email: "new@example.com",
        timezone: "UTC",
      }),
    });

    expect(res.status).toBe(200);
    expect(body.data.user.name).toBe("New Name");
    expect(body.data.user.email).toBe("new@example.com");
  });

  test("returns badges for current user", async () => {
    const env = await createHttpEnv();
    const { token, user } = await registerAndLogin(env, {
      email: "profile3@test.com",
    });

    await insertBadge(env, { user_id: user.id, badge_type: "daily_winner" });

    const { res, body } = await requestJson<{
      data: { badges: Array<{ badge_type: string }> };
    }>(env, "/api/profile/badges", {
      headers: { Authorization: `Bearer ${token}` },
    });

    expect(res.status).toBe(200);
    expect(body.data.badges.length).toBe(1);
    expect(body.data.badges[0].badge_type).toBe("daily_winner");
  });
});
