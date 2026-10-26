import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "tests/e2e",
  fullyParallel: false,
  workers: 1,
  use: {
    baseURL: process.env.BASE_URL || "http://localhost:3000",
    channel: process.env.CI ? undefined : "chrome",
    screenshot: "only-on-failure",
  },
  reporter: "list",
  timeout: 45000,
});
