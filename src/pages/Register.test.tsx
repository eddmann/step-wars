import { describe, test, expect } from "bun:test";
import { screen, waitFor, render } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { Provider } from "react-redux";
import { MemoryRouter, Route, Routes } from "react-router";
import { configureStore } from "@reduxjs/toolkit";
import authReducer from "../store/slices/authSlice";
import challengesReducer from "../store/slices/challengesSlice";
import goalsReducer from "../store/slices/goalsSlice";
import profileReducer from "../store/slices/profileSlice";
import stepsReducer from "../store/slices/stepsSlice";
import { ThemeProvider } from "../components/ThemeProvider";
import { ToastProvider } from "../components/ui/Toast";
import { renderApp } from "../test/utils";
import { server } from "../test/mocks/server";
import { TEST_BASE_URL } from "../test/global-setup";
import { createUser } from "../test/fixtures";
import Register from "./Register";

function renderAuthenticatedRoute() {
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

  return render(
    <Provider store={store}>
      <ThemeProvider>
        <MemoryRouter initialEntries={["/register"]}>
          <ToastProvider>
            <Routes>
              <Route path="/register" element={<Register />} />
              <Route path="/" element={<div>Dashboard Home</div>} />
            </Routes>
          </ToastProvider>
        </MemoryRouter>
      </ThemeProvider>
    </Provider>,
  );
}

describe("Register", () => {
  test("displays name, email, password, confirm inputs", () => {
    renderApp(<Register />);

    expect(screen.getByLabelText(/^name$/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^password$/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/confirm password/i)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /create account/i }),
    ).toBeInTheDocument();
  });

  test("validates password match", async () => {
    const user = userEvent.setup();

    renderApp(<Register />);
    await user.type(screen.getByLabelText(/^name$/i), "Taylor");
    await user.type(screen.getByLabelText(/email/i), "taylor@example.com");
    await user.type(screen.getByLabelText(/^password$/i), "secret123");
    await user.type(screen.getByLabelText(/confirm password/i), "nope");
    await user.click(screen.getByRole("button", { name: /create account/i }));

    expect(
      await screen.findByText(/passwords don't match/i),
    ).toBeInTheDocument();
  });

  test("validates password length", async () => {
    const user = userEvent.setup();

    renderApp(<Register />);
    await user.type(screen.getByLabelText(/^name$/i), "Taylor");
    await user.type(screen.getByLabelText(/email/i), "taylor@example.com");
    await user.type(screen.getByLabelText(/^password$/i), "short");
    await user.type(screen.getByLabelText(/confirm password/i), "short");
    await user.click(screen.getByRole("button", { name: /create account/i }));

    expect(
      await screen.findByText(/at least 6 characters/i),
    ).toBeInTheDocument();
  });

  test("marks all form fields as required", () => {
    renderApp(<Register />);

    expect(screen.getByLabelText(/^name$/i)).toBeRequired();
    expect(screen.getByLabelText(/email/i)).toBeRequired();
    expect(screen.getByLabelText(/^password$/i)).toBeRequired();
    expect(screen.getByLabelText(/confirm password/i)).toBeRequired();
  });

  test("toggles password visibility", async () => {
    const user = userEvent.setup();
    renderApp(<Register />);

    const passwordInput = screen.getByLabelText(/^password$/i);
    expect(passwordInput).toHaveAttribute("type", "password");

    await user.click(screen.getByRole("button", { name: /show password/i }));
    expect(passwordInput).toHaveAttribute("type", "text");

    await user.click(screen.getByRole("button", { name: /hide password/i }));
    expect(passwordInput).toHaveAttribute("type", "password");
  });

  test("shows API error for existing email", async () => {
    const user = userEvent.setup();
    server.use(
      http.post(`${TEST_BASE_URL}/api/auth/register`, () => {
        return HttpResponse.json(
          { error: "Email already registered" },
          { status: 400 },
        );
      }),
    );

    renderApp(<Register />);
    await user.type(screen.getByLabelText(/^name$/i), "Taylor");
    await user.type(screen.getByLabelText(/email/i), "existing@example.com");
    await user.type(screen.getByLabelText(/^password$/i), "password123");
    await user.type(screen.getByLabelText(/confirm password/i), "password123");
    await user.click(screen.getByRole("button", { name: /create account/i }));

    expect(
      await screen.findByText(/email already registered/i),
    ).toBeInTheDocument();
  });

  test("sets authenticated state on successful register", async () => {
    const user = userEvent.setup();
    const { store } = renderApp(<Register />);

    await user.type(screen.getByLabelText(/^name$/i), "Taylor");
    await user.type(screen.getByLabelText(/email/i), "taylor@example.com");
    await user.type(screen.getByLabelText(/^password$/i), "password123");
    await user.type(screen.getByLabelText(/confirm password/i), "password123");
    await user.click(screen.getByRole("button", { name: /create account/i }));

    await waitFor(() => {
      expect(store.getState().auth.isAuthenticated).toBe(true);
    });
  });

  test("redirects to dashboard when already authenticated", async () => {
    renderAuthenticatedRoute();

    expect(await screen.findByText(/dashboard home/i)).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /create account/i }),
    ).not.toBeInTheDocument();
  });
});
