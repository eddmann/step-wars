const API_BASE = "http://localhost:5173/api";

export interface TestUser {
  id: number;
  email: string;
  name: string;
  token: string;
}

/**
 * Creates a test user and returns their auth token
 */
export async function createTestUser(
  email?: string,
  password?: string,
  name?: string
): Promise<TestUser> {
  const testEmail = email || `test-${Date.now()}@example.com`;
  const testPassword = password || "testpassword123";
  const testName = name || "Test User";

  const response = await fetch(`${API_BASE}/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: testEmail,
      password: testPassword,
      name: testName,
      timezone: "UTC",
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Failed to create test user: ${JSON.stringify(error)}`);
  }

  const json = await response.json();
  const data = json.data;
  return {
    id: data.user.id,
    email: testEmail,
    name: testName,
    token: data.token,
  };
}

/**
 * Makes an authenticated API request
 */
export async function apiRequest(
  method: string,
  path: string,
  token: string,
  body?: unknown
): Promise<Response> {
  const options: RequestInit = {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  };

  if (body) {
    options.body = JSON.stringify(body);
  }

  return fetch(`${API_BASE}${path}`, options);
}

/**
 * Get today's date in YYYY-MM-DD format
 */
export function getToday(): string {
  const now = new Date();
  return now.toISOString().split("T")[0];
}

/**
 * Get yesterday's date in YYYY-MM-DD format
 */
export function getYesterday(): string {
  const now = new Date();
  now.setDate(now.getDate() - 1);
  return now.toISOString().split("T")[0];
}

/**
 * Get a date N days ago in YYYY-MM-DD format
 */
export function getDaysAgo(days: number): string {
  const now = new Date();
  now.setDate(now.getDate() - days);
  return now.toISOString().split("T")[0];
}

/**
 * Get a future date N days from now in YYYY-MM-DD format
 */
export function getDaysFromNow(days: number): string {
  const now = new Date();
  now.setDate(now.getDate() + days);
  return now.toISOString().split("T")[0];
}
