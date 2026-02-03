import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import type { AppBindings } from "../types";
import { createD1UserRepository } from "../repositories/d1/user.d1";
import { createD1SessionRepository } from "../repositories/d1/session.d1";
import { registerUser } from "../usecases/register-user.usecase";
import { login } from "../usecases/login.usecase";
import { logout } from "../usecases/logout.usecase";
import { getMe } from "../usecases/get-me.usecase";
import { errorToHttpStatus, errorToMessage } from "../usecases/errors";

const auth = new Hono<AppBindings>();

const registerSchema = z.object({
  email: z.string().email("Invalid email address"),
  name: z.string().min(1, "Name is required"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  timezone: z.string().optional(),
});

const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

const BEARER_PREFIX = "Bearer ";

function getBearerToken(authHeader?: string | null): string | null {
  if (!authHeader?.startsWith(BEARER_PREFIX)) return null;
  const token = authHeader.slice(BEARER_PREFIX.length);
  return token || null;
}

// POST /register
auth.post("/register", zValidator("json", registerSchema), async (c) => {
  const body = c.req.valid("json");

  const userRepository = createD1UserRepository(c.env);
  const sessionRepository = createD1SessionRepository(c.env);

  const timezone =
    body.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";

  const result = await registerUser(
    { userRepository, sessionRepository },
    {
      email: body.email,
      name: body.name,
      password: body.password,
      timezone,
    },
  );

  if (!result.ok) {
    return c.json(
      { error: errorToMessage(result.error) },
      errorToHttpStatus(result.error),
    );
  }

  return c.json({
    data: {
      user: {
        id: result.value.user.id,
        email: result.value.user.email,
        name: result.value.user.name,
        timezone: result.value.user.timezone,
        created_at: result.value.user.created_at,
      },
      token: result.value.token,
    },
  });
});

// POST /login
auth.post("/login", zValidator("json", loginSchema), async (c) => {
  const body = c.req.valid("json");

  const userRepository = createD1UserRepository(c.env);
  const sessionRepository = createD1SessionRepository(c.env);

  const result = await login(
    { userRepository, sessionRepository },
    { email: body.email, password: body.password },
  );

  if (!result.ok) {
    return c.json(
      { error: errorToMessage(result.error) },
      errorToHttpStatus(result.error),
    );
  }

  return c.json({
    data: {
      user: {
        id: result.value.user.id,
        email: result.value.user.email,
        name: result.value.user.name,
        timezone: result.value.user.timezone,
        created_at: result.value.user.created_at,
      },
      token: result.value.token,
    },
  });
});

// POST /logout
auth.post("/logout", async (c) => {
  const token = getBearerToken(c.req.header("Authorization"));
  const sessionRepository = createD1SessionRepository(c.env);

  await logout({ sessionRepository }, { token });

  return c.json({ data: { success: true } });
});

// GET /me
auth.get("/me", async (c) => {
  const token = getBearerToken(c.req.header("Authorization"));
  const userRepository = createD1UserRepository(c.env);
  const sessionRepository = createD1SessionRepository(c.env);

  const result = await getMe({ userRepository, sessionRepository }, { token });

  if (!result.ok) {
    return c.json(
      { error: errorToMessage(result.error) },
      errorToHttpStatus(result.error),
    );
  }

  return c.json({
    data: {
      user: {
        id: result.value.id,
        email: result.value.email,
        name: result.value.name,
        timezone: result.value.timezone,
        created_at: result.value.created_at,
      },
    },
  });
});

export default auth;
