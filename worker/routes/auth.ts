import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import type { AppBindings } from "../types";
import {
  hashPassword,
  verifyPassword,
  generateToken,
  getAuthenticatedUser,
} from "../middleware/auth";
import { createUser, getUserByEmail, createSession, deleteSession } from "../db/queries";

const auth = new Hono<AppBindings>();

// Validation schemas
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

// POST /register
auth.post("/register", zValidator("json", registerSchema), async (c) => {
  const body = c.req.valid("json");

  // Check if email exists
  const existing = await getUserByEmail(c.env, body.email.toLowerCase());
  if (existing) {
    return c.json({ error: "Email already registered" }, 400);
  }

  const passwordHash = await hashPassword(body.password);
  const timezone = body.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";

  const user = await createUser(
    c.env,
    body.email.toLowerCase(),
    body.name,
    passwordHash,
    timezone
  );

  const token = generateToken();
  await createSession(c.env, user.id, token);

  return c.json({
    data: {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        timezone: user.timezone,
        created_at: user.created_at,
      },
      token,
    },
  });
});

// POST /login
auth.post("/login", zValidator("json", loginSchema), async (c) => {
  const body = c.req.valid("json");

  const user = await getUserByEmail(c.env, body.email.toLowerCase());
  if (!user) {
    return c.json({ error: "Invalid email or password" }, 401);
  }

  const valid = await verifyPassword(body.password, user.password_hash);
  if (!valid) {
    return c.json({ error: "Invalid email or password" }, 401);
  }

  const token = generateToken();
  await createSession(c.env, user.id, token);

  return c.json({
    data: {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        timezone: user.timezone,
        created_at: user.created_at,
      },
      token,
    },
  });
});

// POST /logout
auth.post("/logout", async (c) => {
  const authHeader = c.req.header("Authorization");
  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.slice(7);
    await deleteSession(c.env, token);
  }
  return c.json({ data: { success: true } });
});

// GET /me
auth.get("/me", async (c) => {
  const user = await getAuthenticatedUser(c.req.raw, c.env);
  if (!user) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  return c.json({
    data: {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        timezone: user.timezone,
        created_at: user.created_at,
      },
    },
  });
});

export default auth;
