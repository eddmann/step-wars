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
import Login from "./Login";

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
        <MemoryRouter initialEntries={["/login"]}>
          <ToastProvider>
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/" element={<div>Dashboard Home</div>} />
            </Routes>
          </ToastProvider>
        </MemoryRouter>
      </ThemeProvider>
    </Provider>,
  );
}

describe("Login", () => {
  test("displays email, password inputs and sign in button", () => {
    renderApp(<Login />);

    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^password$/i)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /sign in/i }),
    ).toBeInTheDocument();
  });

  test("displays error on invalid credentials", async () => {
    const user = userEvent.setup();

    renderApp(<Login />);
    await user.type(screen.getByLabelText(/email/i), "user@example.com");
    await user.type(screen.getByLabelText(/^password$/i), "invalid");
    await user.click(screen.getByRole("button", { name: /sign in/i }));

    expect(
      await screen.findByText(/invalid email or password/i),
    ).toBeInTheDocument();
  });

  test("marks email and password as required", () => {
    renderApp(<Login />);

    expect(screen.getByLabelText(/email/i)).toBeRequired();
    expect(screen.getByLabelText(/^password$/i)).toBeRequired();
  });

  test("toggles password visibility", async () => {
    const user = userEvent.setup();
    renderApp(<Login />);

    const passwordInput = screen.getByLabelText(/^password$/i);
    expect(passwordInput).toHaveAttribute("type", "password");

    await user.click(screen.getByRole("button", { name: /show password/i }));
    expect(passwordInput).toHaveAttribute("type", "text");

    await user.click(screen.getByRole("button", { name: /hide password/i }));
    expect(passwordInput).toHaveAttribute("type", "password");
  });

  test("shows network error on API failure", async () => {
    const user = userEvent.setup();
    server.use(
      http.post(`${TEST_BASE_URL}/api/auth/login`, () => {
        return HttpResponse.error();
      }),
    );

    renderApp(<Login />);
    await user.type(screen.getByLabelText(/email/i), "test@example.com");
    await user.type(screen.getByLabelText(/^password$/i), "password123");
    await user.click(screen.getByRole("button", { name: /sign in/i }));

    await waitFor(() => {
      expect(screen.getByText(/network error/i)).toBeInTheDocument();
    });
  });

  test("redirects to dashboard when already authenticated", async () => {
    renderAuthenticatedRoute();

    expect(await screen.findByText(/dashboard home/i)).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /sign in/i }),
    ).not.toBeInTheDocument();
  });
});
