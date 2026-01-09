import type { Env, User } from "../types";
import { jsonResponse, errorResponse } from "../middleware/cors";
import { updateUser, getUserBadges, getUserStats, getTodaySteps } from "../db/queries";

export async function handleProfile(
  request: Request,
  env: Env,
  user: User,
  path: string
): Promise<Response> {
  // GET /api/profile
  if (path === "/api/profile" && request.method === "GET") {
    const badges = await getUserBadges(env, user.id);
    const stats = await getUserStats(env, user.id);

    // Get today's steps
    const now = new Date();
    const userNow = new Date(
      now.toLocaleString("en-US", { timeZone: user.timezone })
    );
    const today = userNow.toISOString().split("T")[0];
    const todaySteps = await getTodaySteps(env, user.id, today);

    return jsonResponse({
      data: {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          timezone: user.timezone,
          created_at: user.created_at,
        },
        stats: {
          ...stats,
          today_steps: todaySteps,
        },
        badges,
      },
    });
  }

  // PUT /api/profile
  if (path === "/api/profile" && request.method === "PUT") {
    const body = (await request.json()) as {
      name?: string;
      email?: string;
    };

    const name = body.name ?? user.name;
    const email = body.email ?? user.email;

    if (!name || name.length < 2) {
      return errorResponse("Name must be at least 2 characters");
    }

    if (!email || !email.includes("@")) {
      return errorResponse("Valid email is required");
    }

    const updatedUser = await updateUser(env, user.id, name, email.toLowerCase());

    return jsonResponse({
      data: {
        user: {
          id: updatedUser!.id,
          email: updatedUser!.email,
          name: updatedUser!.name,
          timezone: updatedUser!.timezone,
          created_at: updatedUser!.created_at,
        },
      },
    });
  }

  // GET /api/profile/badges
  if (path === "/api/profile/badges" && request.method === "GET") {
    const badges = await getUserBadges(env, user.id);
    return jsonResponse({ data: { badges } });
  }

  return errorResponse("Not found", 404);
}
