import { describe, test, expect } from "bun:test";
import {
  createHttpEnv,
  requestJson,
  registerAndLogin,
  insertNotification,
} from "./helpers";

describe("HTTP /api/goals", () => {
  test("returns goals for current user", async () => {
    const env = await createHttpEnv();
    const { token, user } = await registerAndLogin(env, {
      email: "goals@test.com",
    });

    const { res, body } = await requestJson<{
      data: { goals: { user_id: number } };
    }>(env, "/api/goals", {
      headers: { Authorization: `Bearer ${token}` },
    });

    expect(res.status).toBe(200);
    expect(body.data.goals.user_id).toBe(user.id);
  });

  test("updates goals", async () => {
    const env = await createHttpEnv();
    const { token } = await registerAndLogin(env, { email: "goals2@test.com" });

    const { res, body } = await requestJson<{
      data: { goals: { daily_target: number; weekly_target: number } };
    }>(env, "/api/goals", {
      method: "PUT",
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify({ daily_target: 12000, weekly_target: 80000 }),
    });

    expect(res.status).toBe(200);
    expect(body.data.goals.daily_target).toBe(12000);
    expect(body.data.goals.weekly_target).toBe(80000);
  });

  test("pauses and resumes goals", async () => {
    const env = await createHttpEnv();
    const { token } = await registerAndLogin(env, { email: "goals3@test.com" });

    const paused = await requestJson<{
      data: { goals: { is_paused: boolean } };
    }>(env, "/api/goals/pause", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    });

    expect(paused.res.status).toBe(200);
    expect(paused.body.data.goals.is_paused).toBe(true);

    const resumed = await requestJson<{
      data: { goals: { is_paused: boolean } };
    }>(env, "/api/goals/resume", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    });

    expect(resumed.res.status).toBe(200);
    expect(resumed.body.data.goals.is_paused).toBe(false);
  });

  test("marks notifications as read", async () => {
    const env = await createHttpEnv();
    const { token, user } = await registerAndLogin(env, {
      email: "goals4@test.com",
    });

    const notification = await insertNotification(env, {
      user_id: user.id,
      type: "daily_win",
    });

    const mark = await requestJson<{ data: { success: boolean } }>(
      env,
      "/api/goals/notifications/read",
      {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify({ notification_ids: [notification.id] }),
      },
    );

    expect(mark.res.status).toBe(200);
    expect(mark.body.data.success).toBe(true);

    const { body } = await requestJson<{
      data: { notifications: Array<unknown> };
    }>(env, "/api/goals", {
      headers: { Authorization: `Bearer ${token}` },
    });

    expect(body.data.notifications.length).toBe(0);
  });
});
