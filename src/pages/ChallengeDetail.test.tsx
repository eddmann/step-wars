import { describe, test, expect } from "bun:test";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { renderRouteAsAuthenticated } from "../test/utils";
import { server } from "../test/mocks/server";
import { TEST_BASE_URL } from "../test/global-setup";
import {
  createChallenge,
  createParticipant,
  createLeaderboardEntry,
} from "../test/fixtures";
import ChallengeDetail from "./ChallengeDetail";

describe("ChallengeDetail", () => {
  test("renders leaderboard details", async () => {
    setupChallengeDetailHandlers();
    renderRouteAsAuthenticated(<ChallengeDetail />, {
      route: "/challenges/1",
      path: "/challenges/:id",
    });

    expect(await screen.findByText(/leaderboard/i)).toBeInTheDocument();
    expect(screen.getByText(/invite code/i)).toBeInTheDocument();
    expect(screen.getByText(/you/i)).toBeInTheDocument();
  });

  test("shows empty leaderboard state", async () => {
    setupChallengeDetailHandlers({ leaderboard: [] });

    renderRouteAsAuthenticated(<ChallengeDetail />, {
      route: "/challenges/1",
      path: "/challenges/:id",
    });

    expect(await screen.findByText(/no entries yet/i)).toBeInTheDocument();
  });

  test("shows Upcoming badge for pending challenges", async () => {
    setupChallengeDetailHandlers({
      challenge: createChallenge({
        id: 1,
        title: "Pending Challenge",
        status: "pending",
        invite_code: "PEND01",
        description: null,
      }),
      participants: [],
      participantCount: 0,
    });

    renderRouteAsAuthenticated(<ChallengeDetail />, {
      route: "/challenges/1",
      path: "/challenges/:id",
    });

    expect(await screen.findByText(/upcoming/i)).toBeInTheDocument();
  });

  test("shows log steps button only for active challenges", async () => {
    setupChallengeDetailHandlers({
      challenge: createChallenge({
        id: 1,
        title: "Active Challenge",
        status: "active",
        invite_code: "ACT123",
        description: null,
      }),
      participants: [],
      participantCount: 0,
    });

    const { unmount } = renderRouteAsAuthenticated(<ChallengeDetail />, {
      route: "/challenges/1",
      path: "/challenges/:id",
    });

    expect(
      await screen.findByRole("button", { name: /log steps from dashboard/i }),
    ).toBeInTheDocument();

    unmount();

    setupChallengeDetailHandlers({
      challenge: createChallenge({
        id: 1,
        title: "Pending Challenge",
        status: "pending",
        invite_code: "PEND01",
        description: null,
      }),
      participants: [],
      participantCount: 0,
    });

    renderRouteAsAuthenticated(<ChallengeDetail />, {
      route: "/challenges/1",
      path: "/challenges/:id",
    });

    await screen.findByText(/upcoming/i);
    expect(
      screen.queryByRole("button", { name: /log steps from dashboard/i }),
    ).not.toBeInTheDocument();
  });

  test("renders podium when leaderboard has top three", async () => {
    setupChallengeDetailHandlers({
      leaderboard: [
        createLeaderboardEntry({
          rank: 1,
          user_id: 11,
          name: "Alpha One",
          total_steps: 15000,
          total_points: 0,
          is_current_user: false,
          last_finalized_steps: 5000,
        }),
        createLeaderboardEntry({
          rank: 2,
          user_id: 12,
          name: "Beta Two",
          total_steps: 12000,
          total_points: 0,
          is_current_user: false,
          last_finalized_steps: 4000,
        }),
        createLeaderboardEntry({
          rank: 3,
          user_id: 13,
          name: "Gamma Three",
          total_steps: 9000,
          total_points: 0,
          is_current_user: false,
          last_finalized_steps: 3000,
        }),
      ],
      lastFinalizedDate: "2026-02-01",
    });

    renderRouteAsAuthenticated(<ChallengeDetail />, {
      route: "/challenges/1",
      path: "/challenges/:id",
    });

    expect(await screen.findByText(/^Alpha$/)).toBeInTheDocument();
    expect(screen.getByText(/^Beta$/)).toBeInTheDocument();
    expect(screen.getByText(/^Gamma$/)).toBeInTheDocument();
  });

  test("copies invite code via button", async () => {
    const user = userEvent.setup();
    const writeText = async () => {};
    const originalClipboard = navigator.clipboard;
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText },
      configurable: true,
    });

    renderRouteAsAuthenticated(<ChallengeDetail />, {
      route: "/challenges/1",
      path: "/challenges/:id",
    });

    await screen.findByText(/invite code/i);
    await user.click(screen.getByRole("button", { name: /copy invite code/i }));

    expect(await screen.findByText(/invite code copied/i)).toBeInTheDocument();

    if (originalClipboard) {
      Object.defineProperty(navigator, "clipboard", {
        value: originalClipboard,
        configurable: true,
      });
    } else {
      delete (navigator as { clipboard?: unknown }).clipboard;
    }
  });

  test("falls back to copy when share fails", async () => {
    const user = userEvent.setup();
    const writeText = async () => {};
    const originalClipboard = navigator.clipboard;
    const originalShare = navigator.share;
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText },
      configurable: true,
    });
    Object.defineProperty(navigator, "share", {
      value: async () => {
        throw new Error("share failed");
      },
      configurable: true,
    });

    renderRouteAsAuthenticated(<ChallengeDetail />, {
      route: "/challenges/1",
      path: "/challenges/:id",
    });

    await screen.findByText(/invite code/i);
    await user.click(screen.getByRole("button", { name: /share challenge/i }));

    expect(await screen.findByText(/invite code copied/i)).toBeInTheDocument();

    if (originalClipboard) {
      Object.defineProperty(navigator, "clipboard", {
        value: originalClipboard,
        configurable: true,
      });
    } else {
      delete (navigator as { clipboard?: unknown }).clipboard;
    }

    if (originalShare) {
      Object.defineProperty(navigator, "share", {
        value: originalShare,
        configurable: true,
      });
    } else {
      delete (navigator as { share?: unknown }).share;
    }
  });
});

const BASE_URL = TEST_BASE_URL;

function setupChallengeDetailHandlers(options?: {
  challenge?: ReturnType<typeof createChallenge>;
  participants?: ReturnType<typeof createParticipant>[];
  participantCount?: number;
  leaderboard?: ReturnType<typeof createLeaderboardEntry>[];
  lastFinalizedDate?: string | null;
}) {
  const challenge = options?.challenge ?? createChallenge({ id: 1 });
  const participants = options?.participants ?? [
    createParticipant({ id: 1, user_id: 1, name: "Test User" }),
  ];
  const participantCount = options?.participantCount ?? participants.length;
  const leaderboard = options?.leaderboard ?? [
    createLeaderboardEntry({
      rank: 1,
      user_id: 1,
      name: "Test User",
      is_current_user: true,
    }),
  ];
  const lastFinalizedDate = options?.lastFinalizedDate ?? null;

  server.use(
    http.get(`${BASE_URL}/api/challenges/1`, () => {
      return HttpResponse.json({
        data: {
          challenge,
          participants,
          participant_count: participantCount,
        },
      });
    }),
    http.get(`${BASE_URL}/api/challenges/1/leaderboard`, () => {
      return HttpResponse.json({
        data: {
          challenge_id: 1,
          mode: challenge.mode,
          leaderboard,
          last_finalized_date: lastFinalizedDate,
        },
      });
    }),
  );
}
