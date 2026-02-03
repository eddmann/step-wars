import { describe, test, expect } from "bun:test";
import {
  createHttpEnv,
  requestJson,
  registerAndLogin,
  insertChallenge,
  insertParticipant,
} from "./helpers";

function todayUtc(): string {
  return new Date().toISOString().split("T")[0];
}

function tomorrowUtc(): string {
  const date = new Date();
  date.setDate(date.getDate() + 1);
  return date.toISOString().split("T")[0];
}

describe("HTTP /api/challenges", () => {
  test("returns 401 when not authenticated", async () => {
    const env = await createHttpEnv();

    const { res, body } = await requestJson<{ error: string }>(
      env,
      "/api/challenges",
    );

    expect(res.status).toBe(401);
    expect(body.error).toBe("Unauthorized");
  });

  test("creates a challenge", async () => {
    const env = await createHttpEnv();
    const { token } = await registerAndLogin(env, {
      email: "challenge@test.com",
    });

    const { res, body } = await requestJson<{
      data: { challenge: { id: number; title: string; invite_code: string } };
    }>(env, "/api/challenges", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        title: "January Challenge",
        start_date: todayUtc(),
        end_date: tomorrowUtc(),
        mode: "daily_winner",
      }),
    });

    expect(res.status).toBe(201);
    expect(body.data.challenge.title).toBe("January Challenge");
    expect(body.data.challenge.invite_code.length).toBeGreaterThan(0);
  });

  test("lists challenges for current user", async () => {
    const env = await createHttpEnv();
    const { token, user } = await registerAndLogin(env, {
      email: "challenge2@test.com",
    });

    const challenge = await insertChallenge(env, {
      creator_id: user.id,
      start_date: todayUtc(),
      end_date: tomorrowUtc(),
      invite_code: "LIST1",
    });
    await insertParticipant(env, {
      challenge_id: challenge.id,
      user_id: user.id,
    });

    const { res, body } = await requestJson<{
      data: { challenges: Array<{ id: number }> };
    }>(env, "/api/challenges", {
      headers: { Authorization: `Bearer ${token}` },
    });

    expect(res.status).toBe(200);
    expect(body.data.challenges.length).toBe(1);
    expect(body.data.challenges[0].id).toBe(challenge.id);
  });

  test("joins a challenge by invite code", async () => {
    const env = await createHttpEnv();
    const { token, user } = await registerAndLogin(env, {
      email: "challenge3@test.com",
    });

    const challenge = await insertChallenge(env, {
      creator_id: user.id,
      start_date: todayUtc(),
      end_date: tomorrowUtc(),
      invite_code: "JOIN1",
    });

    const { res, body } = await requestJson<{
      data: { challenge: { id: number; invite_code: string } };
    }>(env, "/api/challenges/join", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify({ invite_code: "JOIN1" }),
    });

    expect(res.status).toBe(200);
    expect(body.data.challenge.id).toBe(challenge.id);
    expect(body.data.challenge.invite_code).toBe("JOIN1");
  });

  test("returns challenge details with participants", async () => {
    const env = await createHttpEnv();
    const { token, user } = await registerAndLogin(env, {
      email: "challenge4@test.com",
    });

    const challenge = await insertChallenge(env, {
      creator_id: user.id,
      start_date: todayUtc(),
      end_date: tomorrowUtc(),
      invite_code: "DETAIL1",
    });
    await insertParticipant(env, {
      challenge_id: challenge.id,
      user_id: user.id,
    });

    const { res, body } = await requestJson<{
      data: { challenge: { id: number }; participant_count: number };
    }>(env, `/api/challenges/${challenge.id}`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    expect(res.status).toBe(200);
    expect(body.data.challenge.id).toBe(challenge.id);
    expect(body.data.participant_count).toBe(1);
  });
});
