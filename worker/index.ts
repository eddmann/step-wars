import { Hono } from "hono";
import { cors } from "hono/cors";
import { HTTPException } from "hono/http-exception";
import { logger } from "hono/logger";
import type { Env, User } from "./types";
import { authMiddleware, getAuthenticatedUser } from "./middleware/auth";
import auth from "./routes/auth";
import steps from "./routes/steps";
import challenges from "./routes/challenges";
import goals from "./routes/goals";
import profile from "./routes/profile";
import { handleLeaderboard } from "./routes/leaderboard";
import { handleDailyBreakdown } from "./routes/dailyBreakdown";
import test from "./routes/test";
import { handleScheduled } from "./scheduled";

type AppBindings = {
  Bindings: Env;
  Variables: { user: User };
};

const app = new Hono<AppBindings>();

// Global error handler
app.onError((err, c) => {
  if (err instanceof HTTPException) {
    return c.json({ error: err.message }, err.status);
  }
  console.error("Unhandled error:", err);
  return c.json({ error: "Internal server error" }, 500);
});

// 404 handler for API routes
app.notFound((c) => {
  return c.json({ error: "Not found" }, 404);
});

// Request logging middleware for API routes
app.use("/api/*", logger());

// CORS middleware for all API routes
app.use(
  "/api/*",
  cors({
    origin: "*",
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization"],
  })
);

// Auth routes (no authentication required)
app.route("/api/auth", auth);

// Test routes (development only, needs optional user context)
app.use("/api/__test__/*", async (c, next) => {
  const user = await getAuthenticatedUser(c.req.raw, c.env);
  if (user) c.set("user", user);
  await next();
});
app.route("/api/__test__", test);

// Leaderboard route (must be registered before authMiddleware applies to /api/*)
// because we need to register it with auth middleware explicitly
app.get("/api/challenges/:id/leaderboard", authMiddleware, handleLeaderboard);
app.get("/api/challenges/:id/daily-breakdown", authMiddleware, handleDailyBreakdown);

// Protected API routes (require authentication)
app.use("/api/*", authMiddleware);
app.route("/api/steps", steps);
app.route("/api/challenges", challenges);
app.route("/api/goals", goals);
app.route("/api/profile", profile);

// Fallback: serve static assets (SPA)
app.all("*", async (c) => {
  if (c.env.ASSETS) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return c.env.ASSETS.fetch(c.req.raw as any) as unknown as Response;
  }
  return c.json({ error: "Not found" }, 404);
});

export default {
  fetch: app.fetch,
  scheduled: handleScheduled,
};
