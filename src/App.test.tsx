import { describe, test, expect } from "bun:test";
import { screen, waitFor, render } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { Provider } from "react-redux";
import { MemoryRouter } from "react-router";
import { configureStore } from "@reduxjs/toolkit";
import authReducer from "./store/slices/authSlice";
import challengesReducer from "./store/slices/challengesSlice";
import goalsReducer from "./store/slices/goalsSlice";
import profileReducer from "./store/slices/profileSlice";
import stepsReducer from "./store/slices/stepsSlice";
import { ThemeProvider } from "./components/ThemeProvider";
import { ToastProvider } from "./components/ui/Toast";
import App from "./App";
import { server } from "./test/mocks/server";
import { TEST_BASE_URL } from "./test/global-setup";

function renderApp(
  route: string,
  authState?: {
    isLoading?: boolean;
    isAuthenticated?: boolean;
    token?: string | null;
  },
) {
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
        user: null,
        token: authState?.token ?? null,
        isAuthenticated: authState?.isAuthenticated ?? false,
        isLoading: authState?.isLoading ?? false,
        error: null,
      },
    },
  });

  return {
    store,
    ...render(
      <Provider store={store}>
        <ThemeProvider>
          <MemoryRouter initialEntries={[route]}>
            <ToastProvider>
              <App />
            </ToastProvider>
          </MemoryRouter>
        </ThemeProvider>
      </Provider>,
    ),
  };
}

describe("App Route Guards", () => {
  describe("AuthGuard", () => {
    test("redirects to login when unauthenticated", async () => {
      renderApp("/");

      await waitFor(() => {
        expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
      });
      expect(
        screen.getByRole("button", { name: /sign in/i }),
      ).toBeInTheDocument();
    });

    test("shows loading spinner while checking auth", async () => {
      renderApp("/", {
        isLoading: true,
        token: "test-token",
      });

      expect(screen.getByTestId("loading-spinner")).toBeInTheDocument();
    });

    test("fetches current user when token is present", async () => {
      server.use(
        http.get(`${TEST_BASE_URL}/api/auth/me`, () => {
          return HttpResponse.json({
            data: {
              user: {
                id: 1,
                name: "Test User",
                email: "test@example.com",
                timezone: "UTC",
                created_at: "2026-01-01T00:00:00Z",
                updated_at: "2026-01-01T00:00:00Z",
              },
            },
          });
        }),
      );

      renderApp("/", {
        token: "test-token",
        isAuthenticated: false,
        isLoading: false,
      });

      expect(await screen.findByText(/log today's steps/i)).toBeInTheDocument();
    });

    test("redirects to login when token is invalid", async () => {
      server.use(
        http.get(`${TEST_BASE_URL}/api/auth/me`, () => {
          return HttpResponse.json({ error: "Unauthorized" }, { status: 401 });
        }),
      );

      renderApp("/", {
        token: "bad-token",
        isAuthenticated: false,
        isLoading: false,
      });

      expect(await screen.findByText(/sign in/i)).toBeInTheDocument();
    });
  });

  describe("Public Routes", () => {
    test("login page is accessible without authentication", async () => {
      renderApp("/login");

      await waitFor(() => {
        expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
      });
      expect(screen.getByLabelText(/^password$/i)).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: /sign in/i }),
      ).toBeInTheDocument();
    });

    test("register page is accessible without authentication", async () => {
      renderApp("/register");

      await waitFor(() => {
        expect(screen.getByLabelText(/^name$/i)).toBeInTheDocument();
      });
      expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: /create account/i }),
      ).toBeInTheDocument();
    });

    test("login navigates to dashboard on success", async () => {
      const user = userEvent.setup();
      renderApp("/login");

      await user.type(screen.getByLabelText(/email/i), "test@example.com");
      await user.type(screen.getByLabelText(/^password$/i), "password123");
      await user.click(screen.getByRole("button", { name: /sign in/i }));

      expect(await screen.findByText(/log today's steps/i)).toBeInTheDocument();
    });
  });
});
