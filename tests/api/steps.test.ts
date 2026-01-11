import { describe, it, expect, beforeAll } from "vitest";
import { createTestUser, apiRequest, getToday, type TestUser } from "../helpers";

describe("Steps API", () => {
  let user: TestUser;

  beforeAll(async () => {
    user = await createTestUser();
  });

  describe("POST /api/steps", () => {
    it("should log steps for today", async () => {
      const today = getToday();
      const response = await apiRequest("POST", "/steps", user.token, {
        date: today,
        step_count: 5000,
      });

      expect(response.ok).toBe(true);
      const json = await response.json();
      expect(json.data.entry).toBeDefined();
      expect(json.data.entry.step_count).toBe(5000);
      expect(json.data.entry.date).toBe(today);
    });

    it("should update steps for same date", async () => {
      const today = getToday();

      // Log initial steps
      await apiRequest("POST", "/steps", user.token, {
        date: today,
        step_count: 5000,
      });

      // Update steps
      const response = await apiRequest("POST", "/steps", user.token, {
        date: today,
        step_count: 8000,
      });

      expect(response.ok).toBe(true);
      const json = await response.json();
      expect(json.data.entry.step_count).toBe(8000);
    });

    it("should reject negative step counts", async () => {
      const today = getToday();
      const response = await apiRequest("POST", "/steps", user.token, {
        date: today,
        step_count: -100,
      });

      expect(response.ok).toBe(false);
      expect(response.status).toBe(400);
    });

    it("should reject steps without authentication", async () => {
      const response = await fetch("http://localhost:5173/api/steps", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date: getToday(), step_count: 1000 }),
      });

      expect(response.status).toBe(401);
    });
  });

  describe("GET /api/steps", () => {
    it("should return step history", async () => {
      const response = await apiRequest("GET", "/steps", user.token);

      expect(response.ok).toBe(true);
      const json = await response.json();
      expect(json.data.entries).toBeDefined();
      expect(Array.isArray(json.data.entries)).toBe(true);
    });

    it("should include previously logged steps", async () => {
      const today = getToday();

      // Log some steps
      await apiRequest("POST", "/steps", user.token, {
        date: today,
        step_count: 7500,
      });

      // Fetch history
      const response = await apiRequest("GET", "/steps", user.token);
      const json = await response.json();

      const todayEntry = json.data.entries.find(
        (e: { date: string }) => e.date === today
      );
      expect(todayEntry).toBeDefined();
      expect(todayEntry.step_count).toBe(7500);
    });
  });
});
