import { mock } from "bun:test";

let mockStepCount = 8500;
let mockIsAvailable = true;
let mockAuthSuccess = true;
let mockQueryError: Error | null = null;

mock.module("../lib/pwakit", () => ({
  isPWAKit: true,
  initHealthKit: async () => {
    if (!mockIsAvailable) return false;
    if (!mockAuthSuccess) return false;
    return true;
  },
  queryStepsForDate: async () => {
    if (mockQueryError) throw mockQueryError;
    return mockStepCount;
  },
  isStepReminderScheduled: async () => false,
  scheduleStepReminder: async () => true,
  cancelStepReminder: async () => {},
  triggerSyncHaptic: async () => {},
}));

import { describe, test, expect, beforeEach, setSystemTime } from "bun:test";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { renderAppAsAuthenticated } from "../test/utils";
import { server } from "../test/mocks/server";
import { TEST_BASE_URL } from "../test/global-setup";
import { createChallenge, createGoals } from "../test/fixtures";
import Dashboard from "./Dashboard";

const BASE_URL = TEST_BASE_URL;

function setupDashboardHandlers(options?: {
  challenges?: ReturnType<typeof createChallenge>[];
  goals?: ReturnType<typeof createGoals>;
  todaySteps?: number;
  weeklySteps?: number;
  dailyProgress?: number;
  weeklyProgress?: number;
  submitStepsError?: string;
}) {
  const challenges = options?.challenges ?? [createChallenge({ id: 1 })];
  const goals = options?.goals ?? createGoals({ id: 1, user_id: 1 });
  const todaySteps = options?.todaySteps ?? 4200;
  const weeklySteps = options?.weeklySteps ?? 12000;
  const dailyProgress = options?.dailyProgress ?? 42;
  const weeklyProgress = options?.weeklyProgress ?? 17;

  server.use(
    http.get(`${BASE_URL}/api/goals`, () => {
      return HttpResponse.json({
        data: {
          goals,
          today_steps: todaySteps,
          weekly_steps: weeklySteps,
          daily_progress: dailyProgress,
          weekly_progress: weeklyProgress,
          notifications: [],
        },
      });
    }),
    http.get(`${BASE_URL}/api/challenges`, () => {
      return HttpResponse.json({ data: { challenges } });
    }),
  );

  if (options?.submitStepsError) {
    server.use(
      http.post(`${BASE_URL}/api/steps`, () => {
        return HttpResponse.json(
          { error: options.submitStepsError },
          { status: 500 },
        );
      }),
    );
  }
}

describe("Dashboard Sync", () => {
  beforeEach(() => {
    mockStepCount = 8500;
    mockIsAvailable = true;
    mockAuthSuccess = true;
    mockQueryError = null;
  });

  test("auto-syncs steps from HealthKit on mount", async () => {
    setSystemTime(new Date("2026-02-03T09:00:00Z"));
    let submittedSteps: { date: string; step_count: number; source: string }[] =
      [];

    setupDashboardHandlers();
    server.use(
      http.post(`${BASE_URL}/api/steps`, async ({ request }) => {
        const body = (await request.json()) as {
          date: string;
          step_count: number;
          source: string;
        };
        submittedSteps.push(body);
        return HttpResponse.json({
          data: {
            entry: {
              id: 1,
              user_id: 1,
              date: body.date,
              step_count: body.step_count,
              source: body.source,
              created_at: "2026-01-01T00:00:00Z",
              updated_at: "2026-01-01T00:00:00Z",
            },
          },
        });
      }),
    );

    try {
      renderAppAsAuthenticated(<Dashboard />);

      await waitFor(() => {
        expect(submittedSteps.length).toBeGreaterThanOrEqual(1);
      });

      const todaySubmission = submittedSteps.find(
        (s) => s.date === "2026-02-03",
      );
      expect(todaySubmission).toBeDefined();
      expect(todaySubmission!.step_count).toBe(8500);
      expect(todaySubmission!.source).toBe("healthkit");
    } finally {
      setSystemTime();
    }
  });

  test("syncs yesterday when within edit window", async () => {
    setSystemTime(new Date("2026-02-03T09:00:00Z"));
    let submittedDates: string[] = [];

    setupDashboardHandlers();
    server.use(
      http.post(`${BASE_URL}/api/steps`, async ({ request }) => {
        const body = (await request.json()) as {
          date: string;
          step_count: number;
          source: string;
        };
        submittedDates.push(body.date);
        return HttpResponse.json({
          data: {
            entry: {
              id: 1,
              user_id: 1,
              date: body.date,
              step_count: body.step_count,
              source: body.source,
              created_at: "2026-01-01T00:00:00Z",
              updated_at: "2026-01-01T00:00:00Z",
            },
          },
        });
      }),
    );

    try {
      renderAppAsAuthenticated(<Dashboard />);

      await waitFor(() => {
        expect(submittedDates.length).toBe(2);
      });

      expect(submittedDates).toContain("2026-02-03");
      expect(submittedDates).toContain("2026-02-02");
    } finally {
      setSystemTime();
    }
  });

  test("does not sync yesterday after edit deadline", async () => {
    setSystemTime(new Date("2026-02-03T13:00:00Z"));
    let submittedDates: string[] = [];

    setupDashboardHandlers();
    server.use(
      http.post(`${BASE_URL}/api/steps`, async ({ request }) => {
        const body = (await request.json()) as {
          date: string;
          step_count: number;
          source: string;
        };
        submittedDates.push(body.date);
        return HttpResponse.json({
          data: {
            entry: {
              id: 1,
              user_id: 1,
              date: body.date,
              step_count: body.step_count,
              source: body.source,
              created_at: "2026-01-01T00:00:00Z",
              updated_at: "2026-01-01T00:00:00Z",
            },
          },
        });
      }),
    );

    try {
      renderAppAsAuthenticated(<Dashboard />);

      await waitFor(() => {
        expect(submittedDates.length).toBe(1);
      });

      expect(submittedDates).toContain("2026-02-03");
      expect(submittedDates).not.toContain("2026-02-02");
    } finally {
      setSystemTime();
    }
  });

  test("shows Sync from Health button", async () => {
    renderAppAsAuthenticated(<Dashboard />);

    expect(
      await screen.findByRole("button", { name: /sync from health/i }),
    ).toBeInTheDocument();
  });

  test("manual sync shows success toast with step count", async () => {
    setSystemTime(new Date("2026-02-03T13:00:00Z"));
    const user = userEvent.setup();
    mockStepCount = 12345;

    setupDashboardHandlers();
    server.use(
      http.post(`${BASE_URL}/api/steps`, async ({ request }) => {
        const body = (await request.json()) as {
          date: string;
          step_count: number;
          source: string;
        };
        return HttpResponse.json({
          data: {
            entry: {
              id: 1,
              user_id: 1,
              date: body.date,
              step_count: body.step_count,
              source: body.source,
              created_at: "2026-01-01T00:00:00Z",
              updated_at: "2026-01-01T00:00:00Z",
            },
          },
        });
      }),
    );

    try {
      renderAppAsAuthenticated(<Dashboard />);

      const syncButton = await screen.findByRole("button", {
        name: /sync from health/i,
      });

      // Wait for auto-sync to complete first
      await waitFor(() => {
        expect(syncButton).toBeEnabled();
      });

      await user.click(syncButton);

      expect(
        await screen.findByText(/synced 12,345 steps from health/i),
      ).toBeInTheDocument();
    } finally {
      setSystemTime();
    }
  });

  test("manual sync shows error toast on failure", async () => {
    setSystemTime(new Date("2026-02-03T13:00:00Z"));
    const user = userEvent.setup();

    setupDashboardHandlers();
    server.use(
      http.post(`${BASE_URL}/api/steps`, async ({ request }) => {
        const body = (await request.json()) as {
          date: string;
          step_count: number;
          source: string;
        };
        return HttpResponse.json({
          data: {
            entry: {
              id: 1,
              user_id: 1,
              date: body.date,
              step_count: body.step_count,
              source: body.source,
              created_at: "2026-01-01T00:00:00Z",
              updated_at: "2026-01-01T00:00:00Z",
            },
          },
        });
      }),
    );

    try {
      renderAppAsAuthenticated(<Dashboard />);

      const syncButton = await screen.findByRole("button", {
        name: /sync from health/i,
      });

      // Wait for auto-sync to complete
      await waitFor(() => {
        expect(syncButton).toBeEnabled();
      });

      // Now make queryStepsForDate throw for the manual sync
      mockQueryError = new Error("HealthKit unavailable");

      await user.click(syncButton);

      expect(
        await screen.findByText(/failed to sync from health/i),
      ).toBeInTheDocument();
    } finally {
      setSystemTime();
    }
  });

  test("skips sync when HealthKit not authorized", async () => {
    setSystemTime(new Date("2026-02-03T09:00:00Z"));
    mockAuthSuccess = false;
    let stepSubmissions = 0;

    setupDashboardHandlers();
    server.use(
      http.post(`${BASE_URL}/api/steps`, async () => {
        stepSubmissions++;
        return HttpResponse.json({
          data: {
            entry: {
              id: 1,
              user_id: 1,
              date: "2026-02-03",
              step_count: 0,
              source: "healthkit",
              created_at: "2026-01-01T00:00:00Z",
              updated_at: "2026-01-01T00:00:00Z",
            },
          },
        });
      }),
    );

    try {
      renderAppAsAuthenticated(<Dashboard />);

      await screen.findByText(/active challenges/i);
      await new Promise((r) => setTimeout(r, 200));

      expect(stepSubmissions).toBe(0);
    } finally {
      setSystemTime();
    }
  });

  test("skips sync when HealthKit not available", async () => {
    setSystemTime(new Date("2026-02-03T09:00:00Z"));
    mockIsAvailable = false;
    let stepSubmissions = 0;

    setupDashboardHandlers();
    server.use(
      http.post(`${BASE_URL}/api/steps`, async () => {
        stepSubmissions++;
        return HttpResponse.json({
          data: {
            entry: {
              id: 1,
              user_id: 1,
              date: "2026-02-03",
              step_count: 0,
              source: "healthkit",
              created_at: "2026-01-01T00:00:00Z",
              updated_at: "2026-01-01T00:00:00Z",
            },
          },
        });
      }),
    );

    try {
      renderAppAsAuthenticated(<Dashboard />);

      await screen.findByText(/active challenges/i);
      await new Promise((r) => setTimeout(r, 200));

      expect(stepSubmissions).toBe(0);
    } finally {
      setSystemTime();
    }
  });
});
