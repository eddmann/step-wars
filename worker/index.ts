import type { Env } from "./types";
import { handleCors, errorResponse } from "./middleware/cors";
import { getAuthenticatedUser } from "./middleware/auth";
import { handleAuth } from "./routes/auth";
import { handleChallenges } from "./routes/challenges";
import { handleLeaderboard } from "./routes/leaderboard";
import { handleGoals } from "./routes/goals";
import { handleProfile } from "./routes/profile";
import { handleSteps } from "./routes/steps";
import { handleTestRoutes } from "./routes/test";
import { handleScheduled } from "./scheduled";

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    // Handle CORS preflight
    const corsResponse = handleCors(request);
    if (corsResponse) {
      return corsResponse;
    }

    const url = new URL(request.url);
    const path = url.pathname;

    try {
      // Auth routes (no authentication required)
      if (path.startsWith("/api/auth/")) {
        return await handleAuth(request, env, path);
      }

      // Test-only routes (development only)
      if (path.startsWith("/api/__test__/")) {
        const user = await getAuthenticatedUser(request, env);
        return await handleTestRoutes(request, env, user, path);
      }

      // All other API routes require authentication
      if (path.startsWith("/api/")) {
        const user = await getAuthenticatedUser(request, env);
        if (!user) {
          return errorResponse("Unauthorized", 401);
        }

        // Steps routes (global step entry)
        if (path.startsWith("/api/steps")) {
          return await handleSteps(request, env, user, path);
        }

        // Challenges routes
        if (path.startsWith("/api/challenges")) {
          // Check for leaderboard route first
          if (path.includes("/leaderboard")) {
            return await handleLeaderboard(request, env, user, path);
          }
          // Challenge CRUD routes
          return await handleChallenges(request, env, user, path);
        }

        // Goals routes
        if (path.startsWith("/api/goals")) {
          return await handleGoals(request, env, user, path);
        }

        // Profile routes
        if (path.startsWith("/api/profile")) {
          return await handleProfile(request, env, user, path);
        }

        return errorResponse("Not found", 404);
      }

      // Non-API routes: serve static assets (SPA)
      if (env.ASSETS) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return env.ASSETS.fetch(request as any) as unknown as Response;
      }

      // In development without ASSETS binding, return 404
      return errorResponse("Not found", 404);
    } catch (error) {
      console.error("Error handling request:", error);
      return errorResponse("Internal server error", 500);
    }
  },

  // Scheduled handler for cron job (runs at noon UTC daily)
  scheduled: handleScheduled,
};
