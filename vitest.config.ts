import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // API tests run against real dev server
    include: ["tests/**/*.test.ts"],
    // Global setup to start the dev server
    globalSetup: "./tests/setup.ts",
    // Test timeout (API calls may take time)
    testTimeout: 10000,
    // Run tests sequentially to avoid conflicts with shared database
    fileParallelism: false,
    isolate: false,
  },
});
