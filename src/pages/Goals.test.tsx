import { describe, test, expect } from "bun:test";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderAppAsAuthenticated } from "../test/utils";
import Goals from "./Goals";

describe("Goals", () => {
  test("updates goals from the edit modal", async () => {
    const user = userEvent.setup();
    renderAppAsAuthenticated(<Goals />);

    await screen.findByText("42%");

    await user.click(screen.getByRole("button", { name: /edit/i }));

    const dailyInput = screen.getByLabelText(/daily step goal/i);
    const weeklyInput = screen.getByLabelText(/weekly step goal/i);

    await user.clear(dailyInput);
    await user.type(dailyInput, "12000");

    await user.clear(weeklyInput);
    await user.type(weeklyInput, "80000");

    await user.click(screen.getByRole("button", { name: /^save$/i }));

    expect(await screen.findByText("12,000")).toBeInTheDocument();
  });

  test("pauses and resumes goals", async () => {
    const user = userEvent.setup();
    renderAppAsAuthenticated(<Goals />);

    await screen.findByRole("heading", { name: /^goals$/i });
    await user.click(screen.getByRole("button", { name: /pause goals/i }));

    expect(await screen.findByText(/resume goals/i)).toBeInTheDocument();
    expect(screen.getByText(/^paused$/i)).toBeInTheDocument();
  });

  test("shows error on invalid goal values", async () => {
    const user = userEvent.setup();
    renderAppAsAuthenticated(<Goals />);

    await screen.findByRole("heading", { name: /^goals$/i });
    await user.click(screen.getByRole("button", { name: /edit/i }));

    const dailyInput = screen.getByLabelText(/daily step goal/i);
    const weeklyInput = screen.getByLabelText(/weekly step goal/i);

    await user.clear(dailyInput);
    await user.clear(weeklyInput);
    await user.click(screen.getByRole("button", { name: /^save$/i }));

    expect(
      await screen.findByText(/please enter valid numbers/i),
    ).toBeInTheDocument();
  });

  test("cancels edits without saving", async () => {
    const user = userEvent.setup();
    renderAppAsAuthenticated(<Goals />);

    await screen.findByRole("heading", { name: /^goals$/i });
    await user.click(screen.getByRole("button", { name: /edit/i }));

    const dailyInput = screen.getByLabelText(/daily step goal/i);
    await user.clear(dailyInput);
    await user.type(dailyInput, "12000");

    await user.click(screen.getByRole("button", { name: /cancel/i }));

    expect(screen.queryByText("12,000")).not.toBeInTheDocument();
    expect(screen.getByText("10,000")).toBeInTheDocument();
  });
});
