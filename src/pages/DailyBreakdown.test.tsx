import { describe, test, expect } from "bun:test";
import { screen } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { renderRouteAsAuthenticated } from "../test/utils";
import { server } from "../test/mocks/server";
import { TEST_BASE_URL } from "../test/global-setup";
import { createDaySummary } from "../test/fixtures";
import DailyBreakdown from "./DailyBreakdown";

describe("DailyBreakdown", () => {
  test("shows daily breakdown rows", async () => {
    renderRouteAsAuthenticated(<DailyBreakdown />, {
      route: "/challenges/1/daily-breakdown",
      path: "/challenges/:id/daily-breakdown",
    });

    expect(await screen.findByText(/daily breakdown/i)).toBeInTheDocument();
    expect(screen.getByText(/weekend warriors/i)).toBeInTheDocument();
    expect(screen.getByText(/test user/i)).toBeInTheDocument();
  });

  test("shows empty state when no days", async () => {
    setupDailyBreakdownHandlers({
      days: [],
      mode: "cumulative",
      title: "Empty Challenge",
    });

    renderRouteAsAuthenticated(<DailyBreakdown />, {
      route: "/challenges/1/daily-breakdown",
      path: "/challenges/:id/daily-breakdown",
    });

    expect(await screen.findByText(/no results yet/i)).toBeInTheDocument();
  });

  test("shows pending messaging for daily winner mode", async () => {
    const pendingDay = createDaySummary({
      status: "pending",
      rankings: [
        {
          rank: 1,
          user_id: 1,
          name: "Test User",
          steps: null,
          points: 0,
          is_current_user: true,
        },
      ],
    });

    setupDailyBreakdownHandlers({
      days: [pendingDay],
      mode: "daily_winner",
      title: "Pending Challenge",
    });

    renderRouteAsAuthenticated(<DailyBreakdown />, {
      route: "/challenges/1/daily-breakdown",
      path: "/challenges/:id/daily-breakdown",
    });

    expect(await screen.findByText(/pending challenge/i)).toBeInTheDocument();
    expect(screen.getByText(/points will be awarded/i)).toBeInTheDocument();
  });

  test("shows finalized points for daily winner mode", async () => {
    const finalizedDay = createDaySummary({
      status: "finalized",
      rankings: [
        {
          rank: 1,
          user_id: 1,
          name: "Test User",
          steps: 12000,
          points: 3,
          is_current_user: true,
        },
      ],
    });

    setupDailyBreakdownHandlers({
      days: [finalizedDay],
      mode: "daily_winner",
      title: "Finalized Challenge",
    });

    renderRouteAsAuthenticated(<DailyBreakdown />, {
      route: "/challenges/1/daily-breakdown",
      path: "/challenges/:id/daily-breakdown",
    });

    expect(await screen.findByText(/^Final$/)).toBeInTheDocument();
    expect(screen.getByText(/\+3 pts/i)).toBeInTheDocument();
  });

  test("shows error state when API fails", async () => {
    setupDailyBreakdownHandlers({ error: "Something went wrong" });

    renderRouteAsAuthenticated(<DailyBreakdown />, {
      route: "/challenges/1/daily-breakdown",
      path: "/challenges/:id/daily-breakdown",
    });

    expect(
      await screen.findByText(/something went wrong/i),
    ).toBeInTheDocument();
  });
});

const BASE_URL = TEST_BASE_URL;

function setupDailyBreakdownHandlers(options?: {
  days?: ReturnType<typeof createDaySummary>[];
  mode?: string;
  title?: string;
  error?: string;
}) {
  const days = options?.days ?? [createDaySummary()];
  const mode = options?.mode ?? "cumulative";
  const title = options?.title ?? "Weekend Warriors";
  const error = options?.error;

  server.use(
    http.get(`${BASE_URL}/api/challenges/1/daily-breakdown`, () => {
      if (error) {
        return HttpResponse.json({ error }, { status: 500 });
      }
      return HttpResponse.json({
        data: {
          challenge_id: 1,
          challenge_title: title,
          mode,
          days,
        },
      });
    }),
  );
}
