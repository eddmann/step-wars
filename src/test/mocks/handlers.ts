import { http, HttpResponse } from "msw";
import {
  createUser,
  createChallenge,
  createParticipant,
  createStepEntry,
  createGoals,
  createBadge,
  createLeaderboardEntry,
  createDaySummary,
  createDayRanking,
} from "../fixtures";
import type { StepSource } from "../../types";
import { TEST_BASE_URL } from "../global-setup";

const BASE_URL = TEST_BASE_URL;

const defaultUser = createUser({ id: 1, name: "Test User" });
const defaultGoals = createGoals({ user_id: defaultUser.id });
const defaultChallenge = createChallenge({ id: 1, creator_id: defaultUser.id });
const defaultParticipant = createParticipant({
  id: 1,
  user_id: defaultUser.id,
  name: defaultUser.name,
});
const defaultEntry = createStepEntry({ id: 1, user_id: defaultUser.id });
const defaultBadge = createBadge({
  id: 1,
  user_id: defaultUser.id,
  badge_type: "daily_winner",
});
const defaultLeaderboard = [
  createLeaderboardEntry({
    rank: 1,
    user_id: defaultUser.id,
    name: defaultUser.name,
    is_current_user: true,
  }),
];
const defaultDaySummary = createDaySummary({
  rankings: [
    createDayRanking({
      rank: 1,
      user_id: defaultUser.id,
      name: defaultUser.name,
      steps: 12000,
      points: 3,
      is_current_user: true,
    }),
  ],
});

export const handlers = [
  // Auth
  http.post(`${BASE_URL}/api/auth/login`, async ({ request }) => {
    const body = (await request.json()) as { email: string; password: string };
    if (body.password === "invalid") {
      return HttpResponse.json(
        { error: "Invalid email or password" },
        { status: 401 },
      );
    }
    return HttpResponse.json({
      data: {
        user: { ...defaultUser, email: body.email },
        token: "test-token",
      },
    });
  }),

  http.post(`${BASE_URL}/api/auth/register`, async ({ request }) => {
    const body = (await request.json()) as {
      email: string;
      name: string;
      password: string;
      timezone?: string;
    };
    if (body.email === "existing@example.com") {
      return HttpResponse.json(
        { error: "Email already registered" },
        { status: 400 },
      );
    }
    return HttpResponse.json({
      data: {
        user: {
          ...defaultUser,
          email: body.email,
          name: body.name,
          timezone: body.timezone || "UTC",
        },
        token: "test-token",
      },
    });
  }),

  http.get(`${BASE_URL}/api/auth/me`, () => {
    return HttpResponse.json({ data: { user: defaultUser } });
  }),

  http.post(`${BASE_URL}/api/auth/logout`, () => {
    return HttpResponse.json({ data: { success: true } });
  }),

  // Challenges
  http.get(`${BASE_URL}/api/challenges`, () => {
    return HttpResponse.json({
      data: { challenges: [defaultChallenge] },
    });
  }),

  http.post(`${BASE_URL}/api/challenges`, async ({ request }) => {
    const body = (await request.json()) as {
      title: string;
      description?: string;
      start_date: string;
      end_date: string;
      mode: "daily_winner" | "cumulative";
      is_recurring?: boolean;
      recurring_interval?: "weekly" | "monthly" | null;
    };
    const challenge = createChallenge({
      title: body.title,
      description: body.description ?? null,
      start_date: body.start_date,
      end_date: body.end_date,
      mode: body.mode,
      is_recurring: body.is_recurring ?? false,
      recurring_interval: body.recurring_interval ?? null,
    });
    return HttpResponse.json({ data: { challenge } }, { status: 201 });
  }),

  http.post(`${BASE_URL}/api/challenges/join`, async ({ request }) => {
    const body = (await request.json()) as { invite_code: string };
    const challenge = createChallenge({ invite_code: body.invite_code });
    return HttpResponse.json({ data: { challenge } });
  }),

  http.get(`${BASE_URL}/api/challenges/:id`, ({ params }) => {
    const id = Number(params.id);
    const challenge = createChallenge({ id });
    return HttpResponse.json({
      data: {
        challenge,
        participants: [defaultParticipant],
        participant_count: 1,
      },
    });
  }),

  http.get(`${BASE_URL}/api/challenges/:id/leaderboard`, ({ params }) => {
    const id = Number(params.id);
    return HttpResponse.json({
      data: {
        challenge_id: id,
        mode: "cumulative",
        leaderboard: defaultLeaderboard,
        last_finalized_date: null,
      },
    });
  }),

  http.get(`${BASE_URL}/api/challenges/:id/daily-breakdown`, ({ params }) => {
    const id = Number(params.id);
    return HttpResponse.json({
      data: {
        challenge_id: id,
        challenge_title: defaultChallenge.title,
        mode: "daily_winner",
        days: [defaultDaySummary],
      },
    });
  }),

  // Steps
  http.get(`${BASE_URL}/api/steps`, () => {
    return HttpResponse.json({ data: { entries: [defaultEntry] } });
  }),

  http.get(`${BASE_URL}/api/steps/:date`, ({ params }) => {
    const date = String(params.date);
    const entry = createStepEntry({ date });
    return HttpResponse.json({ data: { entry } });
  }),

  http.post(`${BASE_URL}/api/steps`, async ({ request }) => {
    const body = (await request.json()) as {
      date: string;
      step_count: number;
      source?: string;
    };
    const entry = createStepEntry({
      date: body.date,
      step_count: body.step_count,
      source: (body.source ?? "manual") as StepSource,
    });
    return HttpResponse.json({ data: { entry } });
  }),

  // Goals
  http.get(`${BASE_URL}/api/goals`, () => {
    return HttpResponse.json({
      data: {
        goals: defaultGoals,
        today_steps: 4200,
        weekly_steps: 12000,
        daily_progress: 42,
        weekly_progress: 17,
        notifications: [],
      },
    });
  }),

  http.put(`${BASE_URL}/api/goals`, async ({ request }) => {
    const body = (await request.json()) as {
      daily_target?: number;
      weekly_target?: number;
    };
    const updated = createGoals({
      ...defaultGoals,
      daily_target: body.daily_target ?? defaultGoals.daily_target,
      weekly_target: body.weekly_target ?? defaultGoals.weekly_target,
    });
    return HttpResponse.json({ data: { goals: updated } });
  }),

  http.post(`${BASE_URL}/api/goals/pause`, () => {
    const updated = createGoals({ ...defaultGoals, is_paused: true });
    return HttpResponse.json({ data: { goals: updated } });
  }),

  http.post(`${BASE_URL}/api/goals/resume`, () => {
    const updated = createGoals({ ...defaultGoals, is_paused: false });
    return HttpResponse.json({ data: { goals: updated } });
  }),

  http.post(`${BASE_URL}/api/goals/notifications/read`, () => {
    return HttpResponse.json({ data: { success: true } });
  }),

  // Profile
  http.get(`${BASE_URL}/api/profile`, () => {
    return HttpResponse.json({
      data: {
        user: defaultUser,
        stats: {
          total_steps: 12345,
          challenges_joined: 3,
          challenges_won: 1,
          badges_earned: 4,
          today_steps: 4200,
        },
        badges: [defaultBadge],
      },
    });
  }),

  http.put(`${BASE_URL}/api/profile`, async ({ request }) => {
    const body = (await request.json()) as {
      name: string;
      email: string;
      timezone?: string;
    };
    return HttpResponse.json({
      data: {
        user: {
          ...defaultUser,
          name: body.name,
          email: body.email,
          timezone: body.timezone ?? defaultUser.timezone,
        },
      },
    });
  }),

  http.get(`${BASE_URL}/api/profile/badges`, () => {
    return HttpResponse.json({ data: { badges: [defaultBadge] } });
  }),
];
