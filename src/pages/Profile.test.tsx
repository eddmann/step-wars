import { describe, test, expect } from "bun:test";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { renderAppAsAuthenticated } from "../test/utils";
import { server } from "../test/mocks/server";
import { TEST_BASE_URL } from "../test/global-setup";
import { createBadge, createUser } from "../test/fixtures";
import Profile from "./Profile";

describe("Profile", () => {
  test("opens the edit modal with profile data", async () => {
    const user = userEvent.setup();
    renderAppAsAuthenticated(<Profile />);

    expect(
      screen.getByRole("heading", { name: /profile/i }),
    ).toBeInTheDocument();
    const totalSteps = (12345).toLocaleString();
    await screen.findByText(totalSteps);

    await user.click(screen.getByText(/edit profile/i));

    expect(screen.getByLabelText(/^name$/i)).toHaveValue("Test User");
    expect(screen.getByLabelText(/email/i)).toHaveValue("test@example.com");

    await user.click(screen.getByRole("button", { name: /cancel/i }));

    expect(
      screen.queryByRole("button", { name: /^save$/i }),
    ).not.toBeInTheDocument();
  });

  test("displays stats values", async () => {
    renderAppAsAuthenticated(<Profile />);

    expect(await screen.findByText("12,345")).toBeInTheDocument();
    expect(screen.getByText(/challenges/i)).toBeInTheDocument();
    expect(screen.getByText(/wins/i)).toBeInTheDocument();
  });

  test("toggles theme and persists selection", async () => {
    const user = userEvent.setup();
    renderAppAsAuthenticated(<Profile />);

    await user.click(screen.getByRole("button", { name: /dark/i }));

    await waitFor(() => {
      expect(localStorage.getItem("theme")).toBe("dark");
    });
    expect(document.documentElement).toHaveClass("dark");
  });

  test("logs out and clears auth state", async () => {
    const user = userEvent.setup();
    const { store } = renderAppAsAuthenticated(<Profile />);

    localStorage.setItem("step_wars_token", "test-token");

    await user.click(screen.getByRole("button", { name: /sign out/i }));

    await waitFor(() => {
      expect(store.getState().auth.isAuthenticated).toBe(false);
    });
    expect(localStorage.getItem("step_wars_token")).toBeNull();
  });

  test("shows validation error when name or email missing", async () => {
    const user = userEvent.setup();
    renderAppAsAuthenticated(<Profile />);

    await user.click(screen.getByText(/edit profile/i));

    await user.clear(screen.getByLabelText(/^name$/i));
    await user.clear(screen.getByLabelText(/email/i));
    await user.click(screen.getByRole("button", { name: /^save$/i }));

    expect(
      await screen.findByText(/name and email are required/i),
    ).toBeInTheDocument();
  });

  test("updates profile with new timezone", async () => {
    const user = userEvent.setup();
    type SupportedValuesKey = Parameters<
      NonNullable<typeof Intl.supportedValuesOf>
    >[0];
    const originalSupportedValuesOf = Intl.supportedValuesOf;
    let submittedTimezone: string | undefined;

    Intl.supportedValuesOf = (key: SupportedValuesKey) => {
      if (key === "timeZone") {
        return ["UTC", "America/New_York"];
      }
      return originalSupportedValuesOf ? originalSupportedValuesOf(key) : [];
    };

    setupProfileUpdateHandler({
      onUpdate: (payload) => {
        submittedTimezone = payload.timezone;
      },
    });

    try {
      renderAppAsAuthenticated(<Profile />);

      await user.click(screen.getByText(/edit profile/i));
      await user.clear(screen.getByLabelText(/^name$/i));
      await user.type(screen.getByLabelText(/^name$/i), "Updated User");
      await user.clear(screen.getByLabelText(/email/i));
      await user.type(screen.getByLabelText(/email/i), "updated@example.com");
      await user.selectOptions(
        screen.getByRole("combobox"),
        "America/New_York",
      );

      await user.click(screen.getByRole("button", { name: /^save$/i }));

      expect(await screen.findByText(/profile updated!/i)).toBeInTheDocument();
      expect(submittedTimezone).toBe("America/New_York");
    } finally {
      Intl.supportedValuesOf = originalSupportedValuesOf;
    }
  });

  test("keeps edit modal open when update fails", async () => {
    const user = userEvent.setup();
    setupProfileUpdateHandler({ error: "Failed to update profile" });

    renderAppAsAuthenticated(<Profile />);

    await user.click(screen.getByText(/edit profile/i));
    await user.clear(screen.getByLabelText(/^name$/i));
    await user.type(screen.getByLabelText(/^name$/i), "Updated User");
    await user.click(screen.getByRole("button", { name: /^save$/i }));

    expect(screen.getByRole("button", { name: /^save$/i })).toBeInTheDocument();
    expect(screen.queryByText(/profile updated!/i)).not.toBeInTheDocument();
  });

  test("hides badges section when no badges", async () => {
    setupProfileResponse({
      statsOverrides: {
        total_steps: 0,
        challenges_joined: 0,
        challenges_won: 0,
        badges_earned: 0,
        today_steps: 0,
      },
      badges: [],
    });

    renderAppAsAuthenticated(<Profile />);

    await screen.findByRole("heading", { name: /^profile$/i });
    expect(
      screen.queryByRole("heading", { name: /badges/i }),
    ).not.toBeInTheDocument();
  });
});

const BASE_URL = TEST_BASE_URL;

function setupProfileResponse(options?: {
  userOverrides?: Partial<ReturnType<typeof createUser>>;
  statsOverrides?: {
    total_steps?: number;
    challenges_joined?: number;
    challenges_won?: number;
    badges_earned?: number;
    today_steps?: number;
  };
  badges?: ReturnType<typeof createBadge>[];
}) {
  const user = createUser({ id: 1, ...options?.userOverrides });
  const stats = {
    total_steps: 12345,
    challenges_joined: 3,
    challenges_won: 1,
    badges_earned: 4,
    today_steps: 4200,
    ...options?.statsOverrides,
  };
  const badges = options?.badges ?? [createBadge({ id: 1, user_id: 1 })];

  server.use(
    http.get(`${BASE_URL}/api/profile`, () => {
      return HttpResponse.json({
        data: {
          user,
          stats,
          badges,
        },
      });
    }),
  );
}

function setupProfileUpdateHandler(options?: {
  onUpdate?: (payload: {
    name: string;
    email: string;
    timezone?: string;
  }) => void;
  error?: string;
}) {
  server.use(
    http.put(`${BASE_URL}/api/profile`, async ({ request }) => {
      if (options?.error) {
        return HttpResponse.json({ error: options.error }, { status: 500 });
      }
      const body = (await request.json()) as {
        name: string;
        email: string;
        timezone?: string;
      };
      options?.onUpdate?.(body);
      return HttpResponse.json({
        data: {
          user: {
            id: 1,
            name: body.name,
            email: body.email,
            timezone: body.timezone ?? "UTC",
            created_at: "2026-01-01T00:00:00Z",
            updated_at: "2026-01-01T00:00:00Z",
          },
        },
      });
    }),
  );
}
