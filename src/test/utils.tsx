import React from "react";
import { render } from "@testing-library/react";
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
import { createUser } from "./fixtures";
import type { User } from "../types";

function createTestStore(
  preloadedState?: Parameters<typeof configureStore>[0]["preloadedState"],
) {
  return configureStore({
    reducer: {
      auth: authReducer,
      challenges: challengesReducer,
      goals: goalsReducer,
      profile: profileReducer,
      steps: stepsReducer,
    },
    preloadedState,
  });
}

type Store = ReturnType<typeof createTestStore>;

type RenderAppResult = ReturnType<typeof render> & { store: Store };

type RenderAuthenticatedResult = ReturnType<typeof render> & {
  store: Store;
  user: User;
};

type RenderRouteOptions = {
  route?: string;
  path?: string;
};

type RenderRouteResult = ReturnType<typeof render> & { store: Store };

type RenderRouteAuthenticatedResult = ReturnType<typeof render> & {
  store: Store;
  user: User;
};

export function renderApp(ui: React.ReactElement): RenderAppResult {
  const store = createTestStore();

  function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <Provider store={store}>
        <ThemeProvider>
          <MemoryRouter initialEntries={["/"]}>
            <ToastProvider>{children}</ToastProvider>
          </MemoryRouter>
        </ThemeProvider>
      </Provider>
    );
  }

  const result = render(ui, { wrapper: Wrapper });
  return Object.assign(result, { store });
}

export function renderRoute(
  ui: React.ReactElement,
  { route = "/", path = "/" }: RenderRouteOptions = {},
): RenderRouteResult {
  const store = createTestStore();

  function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <Provider store={store}>
        <ThemeProvider>
          <MemoryRouter initialEntries={[route]}>
            <ToastProvider>{children}</ToastProvider>
          </MemoryRouter>
        </ThemeProvider>
      </Provider>
    );
  }

  const result = render(
    <Routes>
      <Route path={path} element={ui} />
    </Routes>,
    { wrapper: Wrapper },
  );

  return Object.assign(result, { store });
}

export function renderAppAsAuthenticated(
  ui: React.ReactElement,
  userOverrides?: Partial<User>,
): RenderAuthenticatedResult {
  const user = createUser(userOverrides);

  const store = createTestStore({
    auth: {
      user,
      token: "test-token",
      isAuthenticated: true,
      isLoading: false,
      error: null,
    },
  });

  function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <Provider store={store}>
        <ThemeProvider>
          <MemoryRouter initialEntries={["/"]}>
            <ToastProvider>{children}</ToastProvider>
          </MemoryRouter>
        </ThemeProvider>
      </Provider>
    );
  }

  const result = render(ui, { wrapper: Wrapper });
  return Object.assign(result, { store, user });
}

export function renderRouteAsAuthenticated(
  ui: React.ReactElement,
  { route = "/", path = "/" }: RenderRouteOptions = {},
  userOverrides?: Partial<User>,
): RenderRouteAuthenticatedResult {
  const user = createUser(userOverrides);

  const store = createTestStore({
    auth: {
      user,
      token: "test-token",
      isAuthenticated: true,
      isLoading: false,
      error: null,
    },
  });

  function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <Provider store={store}>
        <ThemeProvider>
          <MemoryRouter initialEntries={[route]}>
            <ToastProvider>{children}</ToastProvider>
          </MemoryRouter>
        </ThemeProvider>
      </Provider>
    );
  }

  const result = render(
    <Routes>
      <Route path={path} element={ui} />
    </Routes>,
    { wrapper: Wrapper },
  );

  return Object.assign(result, { store, user });
}

export * from "@testing-library/react";
export { default as userEvent } from "@testing-library/user-event";
