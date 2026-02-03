import { describe, test, expect } from "bun:test";
import { createHttpEnv, requestJson, registerAndLogin } from "./helpers";

describe("HTTP /api/auth", () => {
  test("registers and logs in", async () => {
    const env = await createHttpEnv();

    const register = await requestJson<{
      data: {
        user: { id: number; email: string; name: string };
        token: string;
      };
    }>(env, "/api/auth/register", {
      method: "POST",
      body: JSON.stringify({
        email: "test@example.com",
        name: "Test User",
        password: "password123",
        timezone: "UTC",
      }),
    });

    expect(register.res.status).toBe(200);
    expect(register.body.data.user.email).toBe("test@example.com");
    expect(register.body.data.token.length).toBeGreaterThan(0);

    const login = await requestJson<{
      data: {
        user: { id: number; email: string; name: string };
        token: string;
      };
    }>(env, "/api/auth/login", {
      method: "POST",
      body: JSON.stringify({
        email: "test@example.com",
        password: "password123",
      }),
    });

    expect(login.res.status).toBe(200);
    expect(login.body.data.user.email).toBe("test@example.com");
    expect(login.body.data.token.length).toBeGreaterThan(0);
  });

  test("returns current user via /me", async () => {
    const env = await createHttpEnv();
    const { token, user } = await registerAndLogin(env);

    const me = await requestJson<{
      data: { user: { id: number; email: string } };
    }>(env, "/api/auth/me", {
      headers: { Authorization: `Bearer ${token}` },
    });

    expect(me.res.status).toBe(200);
    expect(me.body.data.user.id).toBe(user.id);
    expect(me.body.data.user.email).toBe(user.email);
  });

  test("logs out successfully", async () => {
    const env = await createHttpEnv();
    const { token } = await registerAndLogin(env);

    const logout = await requestJson<{ data: { success: boolean } }>(
      env,
      "/api/auth/logout",
      {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      },
    );

    expect(logout.res.status).toBe(200);
    expect(logout.body.data.success).toBe(true);
  });
});
