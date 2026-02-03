import { describe, test, expect } from "bun:test";
import {
  createHttpEnv,
  requestJson,
  registerAndLogin,
  insertStepEntry,
} from "./helpers";

function todayUtc(): string {
  return new Date().toISOString().split("T")[0];
}

describe("HTTP /api/steps", () => {
  test("returns 401 when not authenticated", async () => {
    const env = await createHttpEnv();

    const { res, body } = await requestJson<{ error: string }>(
      env,
      "/api/steps",
    );

    expect(res.status).toBe(401);
    expect(body.error).toBe("Unauthorized");
  });

  test("lists step entries for current user", async () => {
    const env = await createHttpEnv();
    const { token, user } = await registerAndLogin(env, {
      email: "steps@test.com",
    });

    const date = todayUtc();
    await insertStepEntry(env, { user_id: user.id, date, step_count: 1234 });

    const { res, body } = await requestJson<{
      data: { entries: Array<{ date: string }> };
    }>(env, "/api/steps", { headers: { Authorization: `Bearer ${token}` } });

    expect(res.status).toBe(200);
    expect(body.data.entries.length).toBe(1);
    expect(body.data.entries[0].date).toBe(date);
  });

  test("returns entry for specific date", async () => {
    const env = await createHttpEnv();
    const { token, user } = await registerAndLogin(env, {
      email: "steps2@test.com",
    });

    const date = todayUtc();
    await insertStepEntry(env, { user_id: user.id, date, step_count: 4321 });

    const { res, body } = await requestJson<{
      data: { entry: { date: string; step_count: number } };
    }>(env, `/api/steps/${date}`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    expect(res.status).toBe(200);
    expect(body.data.entry.date).toBe(date);
    expect(body.data.entry.step_count).toBe(4321);
  });

  test("upserts steps for today", async () => {
    const env = await createHttpEnv();
    const { token } = await registerAndLogin(env, {
      email: "steps3@test.com",
      timezone: "UTC",
    });

    const date = todayUtc();
    const { res, body } = await requestJson<{
      data: { entry: { date: string; step_count: number } };
    }>(env, "/api/steps", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify({ date, step_count: 2000, source: "manual" }),
    });

    expect(res.status).toBe(200);
    expect(body.data.entry.date).toBe(date);
    expect(body.data.entry.step_count).toBe(2000);
  });
});
