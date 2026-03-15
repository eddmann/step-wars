import { describe, test, expect } from "bun:test";
import {
  createHttpEnv,
  requestJson,
  registerAndLogin,
  insertUser,
  insertChallenge,
  insertParticipant,
} from "./helpers";

describe("HTTP /api/challenges/:id/reactions", () => {
  test("toggles a reaction on and off", async () => {
    const env = await createHttpEnv();
    const { token, user } = await registerAndLogin(env, {
      email: "reactor@test.com",
    });

    const target = await insertUser(env, {
      id: 99,
      email: "target@test.com",
      name: "Target",
    });

    const challenge = await insertChallenge(env, {
      creator_id: user.id,
      start_date: "2026-01-01",
      end_date: "2026-01-31",
      invite_code: "RX1",
      status: "active",
      timezone: "UTC",
    });

    await insertParticipant(env, {
      challenge_id: challenge.id,
      user_id: user.id,
    });
    await insertParticipant(env, {
      challenge_id: challenge.id,
      user_id: target.id,
    });

    // Toggle on
    const { res, body } = await requestJson<{
      data: { added: boolean };
    }>(env, `/api/challenges/${challenge.id}/reactions`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        target_user_id: target.id,
        date: "2026-01-01",
        reaction_type: "fire",
      }),
    });

    expect(res.status).toBe(200);
    expect(body.data.added).toBe(true);

    // Toggle off
    const { res: res2, body: body2 } = await requestJson<{
      data: { added: boolean };
    }>(env, `/api/challenges/${challenge.id}/reactions`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        target_user_id: target.id,
        date: "2026-01-01",
        reaction_type: "fire",
      }),
    });

    expect(res2.status).toBe(200);
    expect(body2.data.added).toBe(false);
  });

  test("returns 403 for non-participants", async () => {
    const env = await createHttpEnv();
    const { token } = await registerAndLogin(env, {
      email: "outsider@test.com",
    });

    const target = await insertUser(env, {
      id: 99,
      email: "target@test.com",
      name: "Target",
    });

    const challenge = await insertChallenge(env, {
      creator_id: target.id,
      start_date: "2026-01-01",
      end_date: "2026-01-31",
      invite_code: "RX2",
      status: "active",
      timezone: "UTC",
    });

    await insertParticipant(env, {
      challenge_id: challenge.id,
      user_id: target.id,
    });

    const { res } = await requestJson(
      env,
      `/api/challenges/${challenge.id}/reactions`,
      {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          target_user_id: target.id,
          date: "2026-01-01",
          reaction_type: "fire",
        }),
      },
    );

    expect(res.status).toBe(403);
  });

  test("returns 400 for invalid reaction type", async () => {
    const env = await createHttpEnv();
    const { token, user } = await registerAndLogin(env, {
      email: "reactor@test.com",
    });

    const target = await insertUser(env, {
      id: 99,
      email: "target@test.com",
      name: "Target",
    });

    const challenge = await insertChallenge(env, {
      creator_id: user.id,
      start_date: "2026-01-01",
      end_date: "2026-01-31",
      invite_code: "RX3",
      status: "active",
      timezone: "UTC",
    });

    await insertParticipant(env, {
      challenge_id: challenge.id,
      user_id: user.id,
    });
    await insertParticipant(env, {
      challenge_id: challenge.id,
      user_id: target.id,
    });

    const { res } = await requestJson(
      env,
      `/api/challenges/${challenge.id}/reactions`,
      {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          target_user_id: target.id,
          date: "2026-01-01",
          reaction_type: "invalid_type",
        }),
      },
    );

    expect(res.status).toBe(400);
  });
});
