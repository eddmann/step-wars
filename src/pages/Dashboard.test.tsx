import { describe, test, expect, setSystemTime } from "bun:test";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { renderAppAsAuthenticated } from "../test/utils";
import { server } from "../test/mocks/server";
import { TEST_BASE_URL } from "../test/global-setup";
import {
  createChallenge,
  createGoals,
  createNotification,
} from "../test/fixtures";
import Dashboard from "./Dashboard";

describe("Dashboard", () => {
  test("loads goals and challenges", async () => {
    renderAppAsAuthenticated(<Dashboard />);

    expect(await screen.findByText(/active challenges/i)).toBeInTheDocument();
    expect(screen.getByText(/weekend warriors/i)).toBeInTheDocument();
  });

  test("logs steps from the modal", async () => {
    const user = userEvent.setup();
    renderAppAsAuthenticated(<Dashboard />);

    await screen.findByText(/log today's steps/i);

    await user.click(
      screen.getByRole("button", { name: /log today's steps/i }),
    );
    const input = screen.getByLabelText(/step count/i);
    await user.clear(input);
    await user.type(input, "5000");

    await user.click(screen.getByRole("button", { name: /^save$/i }));

    expect(await screen.findByText(/steps logged!/i)).toBeInTheDocument();
  });

  test("prefills step count with today's steps", async () => {
    const user = userEvent.setup();
    renderAppAsAuthenticated(<Dashboard />);

    await screen.findByText("42%");

    await user.click(
      screen.getByRole("button", { name: /log today's steps/i }),
    );

    expect(screen.getByLabelText(/step count/i)).toHaveValue(4200);
  });

  test("keeps log modal open when step submission fails", async () => {
    const user = userEvent.setup();
    setupDashboardHandlers({ submitStepsError: "Failed to log steps" });

    renderAppAsAuthenticated(<Dashboard />);

    await screen.findByText(/log today's steps/i);
    await user.click(
      screen.getByRole("button", { name: /log today's steps/i }),
    );

    const input = screen.getByLabelText(/step count/i);
    await user.clear(input);
    await user.type(input, "5000");

    await user.click(screen.getByRole("button", { name: /^save$/i }));

    expect(await screen.findByText(/failed to log steps/i)).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: /log steps/i }),
    ).toBeInTheDocument();
  });

  test("closes log modal when canceled", async () => {
    const user = userEvent.setup();
    renderAppAsAuthenticated(<Dashboard />);

    await screen.findByText(/log today's steps/i);
    await user.click(
      screen.getByRole("button", { name: /log today's steps/i }),
    );

    expect(
      screen.getByRole("heading", { name: /log steps/i }),
    ).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /^cancel$/i }));

    expect(
      screen.queryByRole("heading", { name: /log steps/i }),
    ).not.toBeInTheDocument();
  });

  test("shows empty state when no active challenges", async () => {
    setupDashboardHandlers({ challenges: [] });

    renderAppAsAuthenticated(<Dashboard />);

    expect(
      await screen.findByText(/no active challenges/i),
    ).toBeInTheDocument();
  });

  test("shows notification toasts and marks them read", async () => {
    const notification = createNotification({
      id: 101,
      title: "Daily Winner!",
      message: "You won today",
    });
    let readIds: number[] = [];

    setupDashboardHandlers({
      notifications: [notification],
      onMarkNotificationsRead: (ids) => {
        readIds = ids;
      },
    });

    renderAppAsAuthenticated(<Dashboard />);

    expect(
      await screen.findByText(/daily winner! you won today/i),
    ).toBeInTheDocument();

    await waitFor(() => {
      expect(readIds).toEqual([101]);
    });
  });

  test("shows error toast for invalid step count", async () => {
    const user = userEvent.setup();
    renderAppAsAuthenticated(<Dashboard />);

    await screen.findByText(/log today's steps/i);
    await user.click(
      screen.getByRole("button", { name: /log today's steps/i }),
    );

    const input = screen.getByLabelText(/step count/i);
    await user.clear(input);
    await user.type(input, "-1");

    await user.click(screen.getByRole("button", { name: /^save$/i }));

    expect(
      await screen.findByText(/please enter a valid step count/i),
    ).toBeInTheDocument();
  });

  test("hides yesterday quick button after edit deadline", async () => {
    const user = userEvent.setup();
    const realDateTimeFormat = Intl.DateTimeFormat;
    Intl.DateTimeFormat = function (
      locale?: string | string[],
      options?: Intl.DateTimeFormatOptions,
    ) {
      if (options?.hour) {
        return { format: () => "13" } as Intl.DateTimeFormat;
      }
      return new realDateTimeFormat(locale, options);
    } as typeof Intl.DateTimeFormat;

    try {
      renderAppAsAuthenticated(<Dashboard />);

      await screen.findByText(/log today's steps/i);
      await user.click(
        screen.getByRole("button", { name: /log today's steps/i }),
      );

      expect(
        screen.queryByRole("button", { name: /yesterday/i }),
      ).not.toBeInTheDocument();
    } finally {
      Intl.DateTimeFormat = realDateTimeFormat;
    }
  });

  test("shows error when steps cannot be edited", async () => {
    setSystemTime(new Date("2026-02-03T09:00:00Z"));
    const user = userEvent.setup();

    try {
      renderAppAsAuthenticated(<Dashboard />);

      await screen.findByText(/log today's steps/i);
      await user.click(
        screen.getByRole("button", { name: /log today's steps/i }),
      );
      await user.click(screen.getByRole("button", { name: /yesterday/i }));

      setSystemTime(new Date("2026-02-03T13:00:00Z"));

      const input = screen.getByLabelText(/step count/i);
      await user.clear(input);
      await user.type(input, "1000");

      await user.click(screen.getByRole("button", { name: /^save$/i }));

      expect(
        await screen.findByText(/cannot edit steps for this date/i),
      ).toBeInTheDocument();
    } finally {
      setSystemTime();
    }
  });
});

const BASE_URL = TEST_BASE_URL;

function setupDashboardHandlers(options?: {
  challenges?: ReturnType<typeof createChallenge>[];
  goals?: ReturnType<typeof createGoals>;
  todaySteps?: number;
  weeklySteps?: number;
  dailyProgress?: number;
  weeklyProgress?: number;
  notifications?: ReturnType<typeof createNotification>[];
  submitStepsError?: string;
  onMarkNotificationsRead?: (ids: number[]) => void;
}) {
  const challenges = options?.challenges ?? [createChallenge({ id: 1 })];
  const goals = options?.goals ?? createGoals({ id: 1, user_id: 1 });
  const todaySteps = options?.todaySteps ?? 4200;
  const weeklySteps = options?.weeklySteps ?? 12000;
  const dailyProgress = options?.dailyProgress ?? 42;
  const weeklyProgress = options?.weeklyProgress ?? 17;
  const notifications = options?.notifications ?? [];

  server.use(
    http.get(`${BASE_URL}/api/goals`, () => {
      return HttpResponse.json({
        data: {
          goals,
          today_steps: todaySteps,
          weekly_steps: weeklySteps,
          daily_progress: dailyProgress,
          weekly_progress: weeklyProgress,
          notifications,
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

  if (options?.onMarkNotificationsRead) {
    server.use(
      http.post(
        `${BASE_URL}/api/goals/notifications/read`,
        async ({ request }) => {
          const body = (await request.json()) as { notification_ids: number[] };
          options.onMarkNotificationsRead?.(body.notification_ids);
          return HttpResponse.json({ data: { success: true } });
        },
      ),
    );
  }
}
