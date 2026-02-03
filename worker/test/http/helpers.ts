import worker from "../../index";
import type { ExecutionContext } from "@cloudflare/workers-types";
import type {
  Env,
  User,
  Challenge,
  ChallengeParticipant,
  StepEntry,
  DailyPoints,
  UserGoals,
  UserBadge,
  PendingNotification,
} from "../../types";
import { createTestD1Env, clearD1Tables } from "../d1-setup";
import {
  createUser,
  createChallenge,
  createParticipant,
  createStepEntry,
  createDailyPoints,
  createUserGoals,
  createUserBadge,
  createNotification,
  resetAllFixtureCounters,
} from "../fixtures";

export async function createHttpEnv(): Promise<Env> {
  resetAllFixtureCounters();
  const env = await createTestD1Env();
  await clearD1Tables(env);

  if (!env.ASSETS) {
    env.ASSETS = {
      fetch: async () => new Response("Not found", { status: 404 }),
    };
  }

  return env;
}

export async function request(
  env: Env,
  path: string,
  init?: RequestInit,
): Promise<Response> {
  const url = new URL(path, "http://localhost");
  const req = new Request(url, init);
  const ctx: ExecutionContext = {
    waitUntil(_promise: Promise<unknown>) {
      void _promise;
    },
    passThroughOnException() {},
  };
  return worker.fetch(req, env, ctx);
}

export async function requestJson<T = unknown>(
  env: Env,
  path: string,
  init: RequestInit = {},
): Promise<{ res: Response; body: T }> {
  const headers = new Headers(init.headers);
  if (init.body) {
    headers.set("Content-Type", "application/json");
  }
  const res = await request(env, path, { ...init, headers });
  const body = (await res.json()) as T;
  return { res, body };
}

export async function registerAndLogin(
  env: Env,
  options: {
    email?: string;
    name?: string;
    password?: string;
    timezone?: string;
  } = {},
): Promise<{
  token: string;
  user: { id: number; email: string; name: string; timezone: string };
}> {
  const email = options.email ?? "user@test.com";
  const name = options.name ?? "Test User";
  const password = options.password ?? "password123";
  const timezone = options.timezone ?? "UTC";

  await requestJson(env, "/api/auth/register", {
    method: "POST",
    body: JSON.stringify({ email, name, password, timezone }),
  });

  const login = await requestJson<{
    data: {
      user: { id: number; email: string; name: string; timezone: string };
      token: string;
    };
  }>(env, "/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });

  return {
    token: login.body.data.token,
    user: login.body.data.user,
  };
}

export async function insertUser(
  env: Env,
  options?: Parameters<typeof createUser>[0],
): Promise<User> {
  const user = createUser(options);
  await env.DB.prepare(
    "INSERT INTO users (id, email, name, password_hash, timezone, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
  )
    .bind(
      user.id,
      user.email,
      user.name,
      user.password_hash,
      user.timezone,
      user.created_at,
      user.updated_at,
    )
    .run();
  return user;
}

export async function insertChallenge(
  env: Env,
  options?: Parameters<typeof createChallenge>[0],
): Promise<Challenge> {
  const challenge = createChallenge(options);
  await env.DB.prepare(
    `INSERT INTO challenges (id, title, description, creator_id, start_date, end_date, mode, invite_code, status, timezone, is_recurring, recurring_interval, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  )
    .bind(
      challenge.id,
      challenge.title,
      challenge.description,
      challenge.creator_id,
      challenge.start_date,
      challenge.end_date,
      challenge.mode,
      challenge.invite_code,
      challenge.status,
      challenge.timezone,
      challenge.is_recurring,
      challenge.recurring_interval,
      challenge.created_at,
      challenge.updated_at,
    )
    .run();
  return challenge;
}

export async function insertParticipant(
  env: Env,
  options?: Parameters<typeof createParticipant>[0],
): Promise<ChallengeParticipant> {
  const participant = createParticipant(options);
  await env.DB.prepare(
    "INSERT INTO challenge_participants (id, challenge_id, user_id, joined_at) VALUES (?, ?, ?, ?)",
  )
    .bind(
      participant.id,
      participant.challenge_id,
      participant.user_id,
      participant.joined_at,
    )
    .run();
  return participant;
}

export async function insertStepEntry(
  env: Env,
  options?: Parameters<typeof createStepEntry>[0],
): Promise<StepEntry> {
  const entry = createStepEntry(options);
  await env.DB.prepare(
    "INSERT INTO step_entries (id, user_id, date, step_count, source, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
  )
    .bind(
      entry.id,
      entry.user_id,
      entry.date,
      entry.step_count,
      entry.source,
      entry.created_at,
      entry.updated_at,
    )
    .run();
  return entry;
}

export async function insertDailyPoints(
  env: Env,
  options?: Parameters<typeof createDailyPoints>[0],
): Promise<DailyPoints> {
  const points = createDailyPoints(options);
  await env.DB.prepare(
    "INSERT INTO daily_points (id, challenge_id, user_id, date, points) VALUES (?, ?, ?, ?, ?)",
  )
    .bind(
      points.id,
      points.challenge_id,
      points.user_id,
      points.date,
      points.points,
    )
    .run();
  return points;
}

export async function insertUserGoals(
  env: Env,
  options?: Parameters<typeof createUserGoals>[0],
): Promise<UserGoals> {
  const goals = createUserGoals(options);
  await env.DB.prepare(
    `INSERT INTO user_goals (id, user_id, daily_target, weekly_target, is_paused, paused_at, current_streak, longest_streak, last_achieved_date, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  )
    .bind(
      goals.id,
      goals.user_id,
      goals.daily_target,
      goals.weekly_target,
      goals.is_paused,
      goals.paused_at,
      goals.current_streak,
      goals.longest_streak,
      goals.last_achieved_date,
      goals.created_at,
      goals.updated_at,
    )
    .run();
  return goals;
}

export async function insertBadge(
  env: Env,
  options?: Parameters<typeof createUserBadge>[0],
): Promise<UserBadge> {
  const badge = createUserBadge(options);
  await env.DB.prepare(
    "INSERT INTO user_badges (id, user_id, badge_type, earned_at) VALUES (?, ?, ?, ?)",
  )
    .bind(badge.id, badge.user_id, badge.badge_type, badge.earned_at)
    .run();
  return badge;
}

export async function insertNotification(
  env: Env,
  options?: Parameters<typeof createNotification>[0],
): Promise<PendingNotification> {
  const notification = createNotification(options);
  await env.DB.prepare(
    `INSERT INTO pending_notifications (id, user_id, type, title, message, badge_type, challenge_id, created_at, read_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  )
    .bind(
      notification.id,
      notification.user_id,
      notification.type,
      notification.title,
      notification.message,
      notification.badge_type,
      notification.challenge_id,
      notification.created_at,
      notification.read_at,
    )
    .run();
  return notification;
}
