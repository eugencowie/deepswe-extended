import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "e2e",
  projects: [{ name: "chromium", use: devices["Desktop Chrome"] }],
  reporter: [["html", { open: "never" }]],
  use: { baseURL: "http://127.0.0.1:4173/e2e/" },
  webServer: {
    command: "vp preview --base /e2e/ --host 127.0.0.1 --port 4173 --strictPort",
    url: "http://127.0.0.1:4173/e2e/",
    // Playwright recommends `!process.env.CI`, but `preview:tailnet` also uses
    // port 4173 and serves base `/`. Reusing that server would run the smoke
    // against the wrong base or a stale build, so always start fresh.
    reuseExistingServer: false,
  },
});
