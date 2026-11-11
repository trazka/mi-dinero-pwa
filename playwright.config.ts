import { defineConfig, devices } from "@playwright/test";
export default defineConfig({
  testDir: "tests",
  workers: 1,
  use: {
    baseURL: "http://localhost:4173/mi-dinero-pwa/",
    ...devices["iPhone 13"],
    defaultBrowserType: "chromium",
    launchOptions: {
      executablePath: process.env.PLAYWRIGHT_USE_BUNDLED_BROWSER
        ? undefined
        : process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH ||
          "/usr/bin/chromium",
      args: ["--no-sandbox"],
    },
  },
  webServer: {
    command: "npm run preview -- --port 4173",
    url: "http://localhost:4173/mi-dinero-pwa/",
    reuseExistingServer: !process.env.CI,
  },
});
