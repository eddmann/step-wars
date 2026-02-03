import { describe, test, expect } from "bun:test";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { renderAppAsAuthenticated } from "../test/utils";
import { server } from "../test/mocks/server";
import { TEST_BASE_URL } from "../test/global-setup";
import Challenges from "./Challenges";

describe("Challenges", () => {
  test("shows existing challenges", async () => {
    renderAppAsAuthenticated(<Challenges />);

    expect(await screen.findByText(/challenges/i)).toBeInTheDocument();
    expect(screen.getByText(/weekend warriors/i)).toBeInTheDocument();
  });

  test("joins a challenge with an invite code", async () => {
    const user = userEvent.setup();
    renderAppAsAuthenticated(<Challenges />);

    await screen.findByText(/challenges/i);

    await user.click(screen.getByRole("button", { name: /^join$/i }));
    await user.type(screen.getByLabelText(/invite code/i), "abc123");

    const joinButtons = screen.getAllByRole("button", { name: /^join$/i });
    await user.click(joinButtons[joinButtons.length - 1]);

    expect(await screen.findByText(/joined challenge!/i)).toBeInTheDocument();
  });

  test("shows empty state when no challenges", async () => {
    setupChallengesList([]);

    renderAppAsAuthenticated(<Challenges />);

    expect(await screen.findByText(/no challenges yet/i)).toBeInTheDocument();
  });

  test("creates a challenge from empty state", async () => {
    const user = userEvent.setup();
    setupChallengesList([]);

    renderAppAsAuthenticated(<Challenges />);

    await screen.findByText(/no challenges yet/i);
    await user.click(screen.getByRole("button", { name: /create challenge/i }));

    await user.type(
      screen.getByLabelText(/challenge name/i),
      "My New Challenge",
    );
    await user.type(screen.getByLabelText(/end date/i), "2026-02-10");

    await user.click(screen.getByRole("button", { name: /^create$/i }));

    expect(await screen.findByText(/challenge created!/i)).toBeInTheDocument();
    expect(screen.getByText(/my new challenge/i)).toBeInTheDocument();
  });

  test("shows error when create challenge fails", async () => {
    const user = userEvent.setup();
    setupChallengesList([]);
    setupCreateChallengeError("Failed to create challenge");

    renderAppAsAuthenticated(<Challenges />);

    await screen.findByText(/no challenges yet/i);
    await user.click(screen.getByRole("button", { name: /create challenge/i }));

    await user.type(
      screen.getByLabelText(/challenge name/i),
      "Broken Challenge",
    );
    await user.type(screen.getByLabelText(/end date/i), "2026-02-10");

    await user.click(screen.getByRole("button", { name: /^create$/i }));

    expect(
      await screen.findByText(/failed to create challenge/i),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: /create challenge/i }),
    ).toBeInTheDocument();
  });

  test("toggles recurring challenge and interval", async () => {
    const user = userEvent.setup();
    setupChallengesList([]);

    renderAppAsAuthenticated(<Challenges />);

    await screen.findByText(/no challenges yet/i);
    await user.click(screen.getByRole("button", { name: /create challenge/i }));

    await user.click(screen.getByRole("button", { name: /one-time/i }));

    expect(screen.getByText(/recurring/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /weekly/i })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /monthly/i }));
    expect(
      screen.getByRole("button", { name: /monthly/i }),
    ).toBeInTheDocument();
  });

  test("validates create challenge form", async () => {
    const user = userEvent.setup();
    setupChallengesList([]);

    renderAppAsAuthenticated(<Challenges />);

    await screen.findByText(/no challenges yet/i);
    await user.click(screen.getByRole("button", { name: /create challenge/i }));
    await user.click(screen.getByRole("button", { name: /^create$/i }));

    expect(
      await screen.findByText(/please fill in all required fields/i),
    ).toBeInTheDocument();
  });

  test("validates join challenge invite code", async () => {
    const user = userEvent.setup();
    renderAppAsAuthenticated(<Challenges />);

    await screen.findByText(/challenges/i);
    await user.click(screen.getByRole("button", { name: /^join$/i }));
    await user.click(screen.getAllByRole("button", { name: /^join$/i })[1]);

    expect(
      await screen.findByText(/please enter an invite code/i),
    ).toBeInTheDocument();
  });

  test("shows error when join challenge fails", async () => {
    const user = userEvent.setup();
    setupJoinChallengeError("Invalid invite code");

    renderAppAsAuthenticated(<Challenges />);

    await user.click(screen.getByRole("button", { name: /^join$/i }));
    await user.type(screen.getByLabelText(/invite code/i), "BAD999");
    await user.click(screen.getAllByRole("button", { name: /^join$/i })[1]);

    expect(await screen.findByText(/invalid invite code/i)).toBeInTheDocument();
  });
});

const BASE_URL = TEST_BASE_URL;

function setupChallengesList(challenges: unknown[]) {
  server.use(
    http.get(`${BASE_URL}/api/challenges`, () => {
      return HttpResponse.json({ data: { challenges } });
    }),
  );
}

function setupCreateChallengeError(message: string) {
  server.use(
    http.post(`${BASE_URL}/api/challenges`, () => {
      return HttpResponse.json({ error: message }, { status: 500 });
    }),
  );
}

function setupJoinChallengeError(message: string) {
  server.use(
    http.post(`${BASE_URL}/api/challenges/join`, () => {
      return HttpResponse.json({ error: message }, { status: 400 });
    }),
  );
}
