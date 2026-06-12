import { defineConfig, devices } from "@playwright/test";

/**
 * E2E sprint 11 Bloc E — 4 scénarios contre un build de prod local
 * + stack Supabase LOCALE (supabase start, Docker requis — cf e2e/README.md).
 * Ne JAMAIS pointer ces tests vers le projet cloud : ils créent des comptes
 * et des posts (signup, fil, webhook simulé).
 */
export default defineConfig({
  testDir: "./e2e",
  timeout: 90_000,
  expect: { timeout: 10_000 },
  // Workers = 1 : les scénarios partagent la même DB seedée (comptes test) —
  // la déterminisme prime sur la vitesse (4 specs, ~2-3 min au total).
  workers: 1,
  fullyParallel: false,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI
    ? [["github"], ["html", { open: "never" }]]
    : [["list"]],
  use: {
    baseURL: process.env.E2E_BASE_URL ?? "http://localhost:3000",
    locale: "fr-FR",
    timezoneId: "Europe/Paris",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: "pnpm start",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
