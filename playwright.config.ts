import { defineConfig, devices } from "@playwright/test";

// Smoke for the base-at-deploy-time convention (ADR 0001): build at a
// sentinel base, serve it, and fail on any root-absolute URL that 404s.
// `vp run ready` builds with --base /sentinel-base/ before this runs.
export default defineConfig({
  testDir: "e2e",
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  use: { baseURL: "http://127.0.0.1:4173/sentinel-base/" },
  webServer: {
    command: "vp preview --base /sentinel-base/ --host 127.0.0.1 --port 4173 --strictPort",
    url: "http://127.0.0.1:4173/sentinel-base/",
    reuseExistingServer: false,
  },
});
