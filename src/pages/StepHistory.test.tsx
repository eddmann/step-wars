import { describe, test, expect } from "bun:test";
import { screen, render } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { Provider } from "react-redux";
import { MemoryRouter, Route, Routes, useLocation } from "react-router";
import { configureStore } from "@reduxjs/toolkit";
import authReducer from "../store/slices/authSlice";
import challengesReducer from "../store/slices/challengesSlice";
import goalsReducer from "../store/slices/goalsSlice";
import profileReducer from "../store/slices/profileSlice";
import stepsReducer from "../store/slices/stepsSlice";
import { ThemeProvider } from "../components/ThemeProvider";
import { ToastProvider } from "../components/ui/Toast";
import { renderAppAsAuthenticated } from "../test/utils";
import { server } from "../test/mocks/server";
import { TEST_BASE_URL } from "../test/global-setup";
import { createStepEntry, createUser } from "../test/fixtures";
import StepHistory from "./StepHistory";

describe("StepHistory", () => {
  test("shows loading skeleton while fetching history", async () => {
    setupStepsListWithDelay([], 50);

    renderAppAsAuthenticated(<StepHistory />);

    expect(
      await screen.findByTestId("step-history-loading"),
    ).toBeInTheDocument();

    expect(await screen.findByText(/no steps logged yet/i)).toBeInTheDocument();
  });

  test("shows entries and allows editing", async () => {
    const user = userEvent.setup();
    renderAppAsAuthenticated(<StepHistory />);

    expect(await screen.findByText(/total entries/i)).toBeInTheDocument();

    await user.click(screen.getByLabelText(/edit entry/i));

    const stepInput = screen.getByLabelText(/step count/i);
    await user.clear(stepInput);
    await user.type(stepInput, "15000");

    await user.click(screen.getByRole("button", { name: /^save$/i }));

    expect(await screen.findByText(/steps updated!/i)).toBeInTheDocument();
  });

  test("shows empty state when no entries", async () => {
    setupStepsList([]);

    renderAppAsAuthenticated(<StepHistory />);

    expect(await screen.findByText(/no steps logged yet/i)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /go to dashboard/i }),
    ).toBeInTheDocument();
  });

  test("navigates to dashboard from empty state CTA", async () => {
    const user = userEvent.setup();
    setupStepsList([]);

    renderWithRoutes();

    await screen.findByText(/no steps logged yet/i);
    await user.click(screen.getByRole("button", { name: /go to dashboard/i }));

    expect(await screen.findByText(/dashboard home/i)).toBeInTheDocument();
    expect(screen.getByTestId("location")).toHaveTextContent("/");
  });

  test("shows error toast for invalid step value", async () => {
    const user = userEvent.setup();
    renderAppAsAuthenticated(<StepHistory />);

    expect(await screen.findByText(/total entries/i)).toBeInTheDocument();
    await user.click(screen.getByLabelText(/edit entry/i));

    const stepInput = screen.getByLabelText(/step count/i);
    await user.clear(stepInput);
    await user.click(screen.getByRole("button", { name: /^save$/i }));

    expect(
      await screen.findByText(/please enter a valid step count/i),
    ).toBeInTheDocument();
  });

  test("hides edit action for non-editable entries", async () => {
    const entry = createStepEntry({ date: "2025-01-01" });
    setupStepsList([entry]);

    renderAppAsAuthenticated(<StepHistory />);

    expect(await screen.findByText(/total entries/i)).toBeInTheDocument();
    expect(screen.queryByLabelText(/edit entry/i)).not.toBeInTheDocument();
  });
});

const BASE_URL = TEST_BASE_URL;

function setupStepsList(entries: ReturnType<typeof createStepEntry>[]) {
  server.use(
    http.get(`${BASE_URL}/api/steps`, () => {
      return HttpResponse.json({ data: { entries } });
    }),
  );
}

function setupStepsListWithDelay(
  entries: ReturnType<typeof createStepEntry>[],
  delayMs: number,
) {
  server.use(
    http.get(`${BASE_URL}/api/steps`, async () => {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
      return HttpResponse.json({ data: { entries } });
    }),
  );
}

function renderWithRoutes() {
  const store = configureStore({
    reducer: {
      auth: authReducer,
      challenges: challengesReducer,
      goals: goalsReducer,
      profile: profileReducer,
      steps: stepsReducer,
    },
    preloadedState: {
      auth: {
        user: createUser(),
        token: "test-token",
        isAuthenticated: true,
        isLoading: false,
        error: null,
      },
    },
  });

  function LocationDisplay() {
    const location = useLocation();
    return <div data-testid="location">{location.pathname}</div>;
  }

  return render(
    <Provider store={store}>
      <ThemeProvider>
        <MemoryRouter initialEntries={["/history"]}>
          <ToastProvider>
            <Routes>
              <Route path="/history" element={<StepHistory />} />
              <Route path="/" element={<div>Dashboard Home</div>} />
            </Routes>
            <LocationDisplay />
          </ToastProvider>
        </MemoryRouter>
      </ThemeProvider>
    </Provider>,
  );
}
