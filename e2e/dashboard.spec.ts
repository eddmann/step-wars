import { test, expect } from "@playwright/test";

test.describe("Dashboard", () => {
  // Create a user before each test
  test.beforeEach(async ({ page }) => {
    const email = `test-${Date.now()}@example.com`;
    await page.goto("/register");
    await page.getByLabel(/name/i).fill("Test User");
    await page.getByLabel(/email/i).fill(email);
    await page.getByLabel("Password", { exact: true }).fill("testpassword123");
    await page.getByLabel(/confirm password/i).fill("testpassword123");
    await page.getByRole("button", { name: /sign up|register|create/i }).click();
    await expect(page).toHaveURL("/");
  });

  test("should display greeting and step count", async ({ page }) => {
    // Check greeting
    await expect(
      page.getByText(/good morning|good afternoon|good evening/i)
    ).toBeVisible();

    // Check step count display area exists
    await expect(page.getByText("steps today")).toBeVisible();
  });

  test("should log steps via modal", async ({ page }) => {
    // Click on the log steps button
    await page.getByRole("button", { name: /log.*steps/i }).click();

    // Fill in step count
    await page.getByRole("spinbutton").fill("5000");

    // Save
    await page.getByRole("button", { name: /save/i }).click();

    // Step count should update - wait for it
    await expect(page.getByText("5,000")).toBeVisible({ timeout: 10000 });
  });

  test("should show steps today label", async ({ page }) => {
    // Dashboard should show "steps today" label
    await expect(page.getByText("steps today")).toBeVisible();
  });

  test("should navigate to challenges page", async ({ page }) => {
    // Find and click challenges nav item
    await page.getByRole("link", { name: /challenges/i }).click();

    // Should be on challenges page
    await expect(page).toHaveURL("/challenges");
    await expect(page.getByText(/challenges/i).first()).toBeVisible();
  });

  test("should navigate to profile page", async ({ page }) => {
    // Find and click profile nav item
    await page.getByRole("link", { name: /profile/i }).click();

    // Should be on profile page
    await expect(page).toHaveURL("/profile");
    await expect(page.getByText("Test User")).toBeVisible();
  });
});
