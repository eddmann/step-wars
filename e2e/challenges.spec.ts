import { test, expect } from "@playwright/test";

// Helper to register and get to dashboard
async function registerAndLogin(page: import("@playwright/test").Page) {
  const email = `test-${Date.now()}@example.com`;
  await page.goto("/register");
  await page.getByLabel(/name/i).fill("Test User");
  await page.getByLabel(/email/i).fill(email);
  await page.getByLabel("Password", { exact: true }).fill("testpassword123");
  await page.getByLabel(/confirm password/i).fill("testpassword123");
  await page.getByRole("button", { name: /sign up|register|create/i }).click();
  await expect(page).toHaveURL("/");
  return email;
}

test.describe("Challenges", () => {
  test("should create a new challenge", async ({ page }) => {
    await registerAndLogin(page);

    // Navigate to challenges
    await page.getByRole("link", { name: /challenges/i }).click();
    await expect(page).toHaveURL("/challenges");

    // Click create challenge button (the one in the header/list, not in a form)
    await page.getByRole("button", { name: "Create Challenge" }).click();

    // Fill challenge form
    await page.getByLabel(/title|name/i).fill("Test Challenge");

    // Set dates - look for date inputs
    const today = new Date().toISOString().split("T")[0];
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + 7);
    const endDateStr = endDate.toISOString().split("T")[0];

    // Fill start and end dates
    const dateInputs = page.locator('input[type="date"]');
    await dateInputs.first().fill(today);
    await dateInputs.last().fill(endDateStr);

    // Submit the form (the exact "Create" button inside the modal/form)
    await page.getByRole("button", { name: "Create", exact: true }).click();

    // Should see the challenge created (either redirected to detail or shown in list)
    await expect(page.getByText("Test Challenge")).toBeVisible({ timeout: 10000 });
  });

  test("should view challenge leaderboard", async ({ page }) => {
    await registerAndLogin(page);

    // Navigate to challenges
    await page.getByRole("link", { name: /challenges/i }).click();
    await expect(page).toHaveURL("/challenges");

    // Create a challenge first
    await page.getByRole("button", { name: "Create Challenge" }).click();
    await page.getByLabel(/title|name/i).fill("Leaderboard Test");

    const today = new Date().toISOString().split("T")[0];
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + 7);
    const endDateStr = endDate.toISOString().split("T")[0];

    const dateInputs = page.locator('input[type="date"]');
    await dateInputs.first().fill(today);
    await dateInputs.last().fill(endDateStr);

    await page.getByRole("button", { name: "Create", exact: true }).click();

    // Wait for challenge to appear and click on it
    await expect(page.getByText("Leaderboard Test")).toBeVisible({ timeout: 10000 });
    await page.getByText("Leaderboard Test").click();

    // Should see leaderboard elements
    await expect(page.getByText(/leaderboard|ranking|standings/i)).toBeVisible({ timeout: 5000 });
  });

  test("should join challenge via invite code", async ({ browser }) => {
    // Create two browser contexts for two different users
    const context1 = await browser.newContext();
    const context2 = await browser.newContext();
    const page1 = await context1.newPage();
    const page2 = await context2.newPage();

    try {
      // User 1: Create a challenge
      await registerAndLogin(page1);
      await page1.getByRole("link", { name: /challenges/i }).click();
      await page1.getByRole("button", { name: "Create Challenge" }).click();
      await page1.getByLabel(/title|name/i).fill("Join Test Challenge");

      const today = new Date().toISOString().split("T")[0];
      const endDate = new Date();
      endDate.setDate(endDate.getDate() + 7);
      const endDateStr = endDate.toISOString().split("T")[0];

      const dateInputs = page1.locator('input[type="date"]');
      await dateInputs.first().fill(today);
      await dateInputs.last().fill(endDateStr);

      await page1.getByRole("button", { name: "Create", exact: true }).click();

      // Navigate to challenge detail to get invite code
      await expect(page1.getByText("Join Test Challenge")).toBeVisible({ timeout: 10000 });
      await page1.getByText("Join Test Challenge").click();

      // Find the invite code (it's in a monospace font after "Invite Code" label)
      await page1.waitForTimeout(1000); // Wait for page to load
      // The invite code is displayed in a span with font-mono class
      const inviteCodeElement = page1.locator('.font-mono').first();
      const inviteCode = await inviteCodeElement.textContent() || "";

      // User 2: Join using invite code
      await registerAndLogin(page2);
      await page2.getByRole("link", { name: /challenges/i }).click();

      // Look for join button in header (just "Join")
      await page2.getByRole("button", { name: "Join", exact: true }).click();

      // Enter invite code (placeholder is "ABC123")
      await page2.getByPlaceholder("ABC123").fill(inviteCode.trim());

      // Click Join button in modal (there will be Cancel and Join)
      await page2.locator('button:has-text("Join")').last().click();

      // Should see the challenge
      await expect(page2.getByText("Join Test Challenge")).toBeVisible({ timeout: 10000 });
    } finally {
      await context1.close();
      await context2.close();
    }
  });
});
