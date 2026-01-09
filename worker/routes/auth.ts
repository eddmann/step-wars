import type { Env } from "../types";
import { jsonResponse, errorResponse } from "../middleware/cors";
import {
  hashPassword,
  verifyPassword,
  generateToken,
  getAuthenticatedUser,
} from "../middleware/auth";
import { createUser, getUserByEmail, createSession, deleteSession } from "../db/queries";

export async function handleAuth(
  request: Request,
  env: Env,
  path: string
): Promise<Response> {
  // POST /api/auth/register
  if (path === "/api/auth/register" && request.method === "POST") {
    const body = (await request.json()) as {
      email: string;
      name: string;
      password: string;
      timezone?: string;
    };

    if (!body.email || !body.name || !body.password) {
      return errorResponse("Email, name, and password are required");
    }

    if (body.password.length < 6) {
      return errorResponse("Password must be at least 6 characters");
    }

    // Check if email exists
    const existing = await getUserByEmail(env, body.email.toLowerCase());
    if (existing) {
      return errorResponse("Email already registered");
    }

    const passwordHash = await hashPassword(body.password);
    const timezone = body.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";

    const user = await createUser(
      env,
      body.email.toLowerCase(),
      body.name,
      passwordHash,
      timezone
    );

    const token = generateToken();
    await createSession(env, user.id, token);

    return jsonResponse({
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
  }

  // POST /api/auth/login
  if (path === "/api/auth/login" && request.method === "POST") {
    const body = (await request.json()) as { email: string; password: string };

    if (!body.email || !body.password) {
      return errorResponse("Email and password are required");
    }

    const user = await getUserByEmail(env, body.email.toLowerCase());
    if (!user) {
      return errorResponse("Invalid email or password", 401);
    }

    const valid = await verifyPassword(body.password, user.password_hash);
    if (!valid) {
      return errorResponse("Invalid email or password", 401);
    }

    const token = generateToken();
    await createSession(env, user.id, token);

    return jsonResponse({
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
  }

  // POST /api/auth/logout
  if (path === "/api/auth/logout" && request.method === "POST") {
    const authHeader = request.headers.get("Authorization");
    if (authHeader?.startsWith("Bearer ")) {
      const token = authHeader.slice(7);
      await deleteSession(env, token);
    }
    return jsonResponse({ data: { success: true } });
  }

  // GET /api/auth/me
  if (path === "/api/auth/me" && request.method === "GET") {
    const user = await getAuthenticatedUser(request, env);
    if (!user) {
      return errorResponse("Unauthorized", 401);
    }

    return jsonResponse({
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
  }

  return errorResponse("Not found", 404);
}
