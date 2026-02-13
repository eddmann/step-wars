import { mock } from "bun:test";

let mockReminderScheduled = false;
let mockScheduleResult = true;
let mockScheduleError: Error | null = null;
let mockCancelError: Error | null = null;
let scheduleCalls = 0;
let cancelCalls = 0;

mock.module("../lib/pwakit", () => ({
  isPWAKit: true,
  isStepReminderScheduled: async () => mockReminderScheduled,
  scheduleStepReminder: async () => {
    scheduleCalls++;
    if (mockScheduleError) throw mockScheduleError;
    return mockScheduleResult;
  },
  cancelStepReminder: async () => {
    cancelCalls++;
    if (mockCancelError) throw mockCancelError;
  },
}));

import { describe, test, expect, beforeEach } from "bun:test";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { renderAppAsAuthenticated } from "../test/utils";
import { server } from "../test/mocks/server";
import { TEST_BASE_URL } from "../test/global-setup";
import { createUser, createBadge } from "../test/fixtures";
import Profile from "./Profile";

const BASE_URL = TEST_BASE_URL;

function setupProfileHandlers() {
  const user = createUser({ id: 1 });
  server.use(
    http.get(`${BASE_URL}/api/profile`, () => {
      return HttpResponse.json({
        data: {
          user,
          stats: {
            total_steps: 12345,
            challenges_joined: 3,
            challenges_won: 1,
            badges_earned: 1,
            today_steps: 4200,
          },
          badges: [createBadge({ id: 1, user_id: 1 })],
        },
      });
    }),
  );
}

describe("Profile Daily Reminder", () => {
  beforeEach(() => {
    mockReminderScheduled = false;
    mockScheduleResult = true;
    mockScheduleError = null;
    mockCancelError = null;
    scheduleCalls = 0;
    cancelCalls = 0;
  });

  test("shows daily reminder toggle", async () => {
    setupProfileHandlers();
    renderAppAsAuthenticated(<Profile />);

    expect(
      await screen.findByRole("switch", { name: /daily step reminder/i }),
    ).toBeInTheDocument();
    expect(screen.getByText(/daily reminder/i)).toBeInTheDocument();
    expect(
      screen.getByText(/get notified at 8am to sync steps/i),
    ).toBeInTheDocument();
  });

  test("switch is off when no reminder is scheduled", async () => {
    mockReminderScheduled = false;
    setupProfileHandlers();
    renderAppAsAuthenticated(<Profile />);

    const toggle = await screen.findByRole("switch", {
      name: /daily step reminder/i,
    });

    await waitFor(() => {
      expect(toggle).not.toBeChecked();
    });
  });

  test("switch is on when reminder is already scheduled", async () => {
    mockReminderScheduled = true;
    setupProfileHandlers();
    renderAppAsAuthenticated(<Profile />);

    const toggle = await screen.findByRole("switch", {
      name: /daily step reminder/i,
    });

    await waitFor(() => {
      expect(toggle).toBeChecked();
    });
  });

  test("toggling on schedules the reminder", async () => {
    mockReminderScheduled = false;
    const user = userEvent.setup();
    setupProfileHandlers();
    renderAppAsAuthenticated(<Profile />);

    const toggle = await screen.findByRole("switch", {
      name: /daily step reminder/i,
    });

    await user.click(toggle);

    await waitFor(() => {
      expect(toggle).toBeChecked();
    });
    expect(scheduleCalls).toBe(1);
  });

  test("toggling off cancels the reminder", async () => {
    mockReminderScheduled = true;
    const user = userEvent.setup();
    setupProfileHandlers();
    renderAppAsAuthenticated(<Profile />);

    const toggle = await screen.findByRole("switch", {
      name: /daily step reminder/i,
    });

    await waitFor(() => {
      expect(toggle).toBeChecked();
    });

    await user.click(toggle);

    await waitFor(() => {
      expect(toggle).not.toBeChecked();
    });
    expect(cancelCalls).toBe(1);
  });

  test("shows error toast when notification permission denied", async () => {
    mockReminderScheduled = false;
    mockScheduleResult = false;
    const user = userEvent.setup();
    setupProfileHandlers();
    renderAppAsAuthenticated(<Profile />);

    const toggle = await screen.findByRole("switch", {
      name: /daily step reminder/i,
    });

    await user.click(toggle);

    expect(
      await screen.findByText(/notification permission was denied/i),
    ).toBeInTheDocument();
    expect(toggle).not.toBeChecked();
  });

  test("shows error toast when scheduling fails", async () => {
    mockReminderScheduled = false;
    mockScheduleError = new Error("Failed to schedule notification");
    const user = userEvent.setup();
    setupProfileHandlers();
    renderAppAsAuthenticated(<Profile />);

    const toggle = await screen.findByRole("switch", {
      name: /daily step reminder/i,
    });

    await user.click(toggle);

    expect(
      await screen.findByText(/failed to update reminder/i),
    ).toBeInTheDocument();
    expect(toggle).not.toBeChecked();
  });

  test("shows error toast when cancelling fails", async () => {
    mockReminderScheduled = true;
    mockCancelError = new Error("Failed to cancel notification");
    const user = userEvent.setup();
    setupProfileHandlers();
    renderAppAsAuthenticated(<Profile />);

    const toggle = await screen.findByRole("switch", {
      name: /daily step reminder/i,
    });

    await waitFor(() => {
      expect(toggle).toBeChecked();
    });

    await user.click(toggle);

    expect(
      await screen.findByText(/failed to update reminder/i),
    ).toBeInTheDocument();
    // Should remain on since cancel failed
    expect(toggle).toBeChecked();
  });
});
