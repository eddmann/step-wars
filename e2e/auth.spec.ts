import { test, expect } from "@playwright/test";

// Helper to register a user
async function registerUser(page: import("@playwright/test").Page, email: string, password: string) {
  await page.goto("/register");
  await page.getByLabel(/name/i).fill("Test User");
  await page.getByLabel(/email/i).fill(email);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByLabel(/confirm password/i).fill(password);
  await page.getByRole("button", { name: /sign up|register|create/i }).click();
}

test.describe("Authentication", () => {
  test("should register a new user", async ({ page }) => {
    const email = `test-${Date.now()}@example.com`;

    await registerUser(page, email, "testpassword123");

    // Should redirect to dashboard
    await expect(page).toHaveURL("/");
    await expect(page.getByText(/good morning|good afternoon|good evening/i)).toBeVisible();
  });

  test("should login an existing user", async ({ page }) => {
    const email = `test-${Date.now()}@example.com`;
    const password = "testpassword123";

    // First register the user
    await registerUser(page, email, password);
    await expect(page).toHaveURL("/");

    // Logout (go to profile and click sign out)
    await page.goto("/profile");
    await page.getByRole("button", { name: /sign out/i }).click();
    await expect(page).toHaveURL("/login");

    // Now login
    await page.getByLabel(/email/i).fill(email);
    await page.getByLabel(/password/i).fill(password);
    await page.getByRole("button", { name: /sign in|login/i }).click();

    // Should be back on dashboard
    await expect(page).toHaveURL("/");
  });

  test("should show error for invalid login", async ({ page }) => {
    await page.goto("/login");

    await page.getByLabel(/email/i).fill("nonexistent@example.com");
    await page.getByLabel(/password/i).fill("wrongpassword");
    await page.getByRole("button", { name: /sign in|login/i }).click();

    // Should show error and stay on login page
    await expect(page.getByText(/invalid|error|incorrect/i)).toBeVisible();
    await expect(page).toHaveURL("/login");
  });

  test("should redirect unauthenticated users to login", async ({ page }) => {
    // Clear any existing session
    await page.context().clearCookies();

    // Try to access protected route
    await page.goto("/");

    // Should redirect to login
    await expect(page).toHaveURL("/login");
  });
});
