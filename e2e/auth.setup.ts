import { test as setup, expect } from "@playwright/test";
import { mkdirSync } from "node:fs";
import { ACCOUNTS, TEST_PASSWORD, AUTH_DIR, storageFor } from "./helpers";

/**
 * Authentification PROGRAMMATIQUE (sprint 11 Bloc E) — pattern Playwright
 * "setup project + storageState".
 *
 * Pourquoi : piloter le formulaire de login dans CHAQUE test est fragile sous
 * CPU lent (CI). React 19 ré-initialise les champs d'un <form action> non
 * stabilisé pendant que Playwright les remplit → champs vidés au submit. On
 * connecte donc chaque compte UNE fois ici, de façon robuste (attente
 * networkidle + re-vérification des valeurs + retry de TOUT le flow via
 * toPass), puis on sauvegarde la session. Les scénarios 02/03/04 réutilisent
 * cette session injectée (test.use storageState) sans jamais toucher au form.
 */

mkdirSync(AUTH_DIR, { recursive: true });

for (const [key, email] of Object.entries(ACCOUNTS)) {
  setup(`authentifie ${key} (${email})`, async ({ page }) => {
    await expect(async () => {
      await page.goto("/auth/login");
      // Laisse l'hydratation / les navigations RSC se terminer AVANT de saisir
      // (c'est leur course avec le fill qui déclenche le reset du form).
      await page.waitForLoadState("networkidle");

      const emailInput = page.locator("#signin-email");
      const pwInput = page.locator("#signin-password");
      await emailInput.fill(email);
      await pwInput.fill(TEST_PASSWORD);
      // Garde-fou : les deux champs tiennent leur valeur juste avant le submit.
      await expect(emailInput).toHaveValue(email);
      await expect(pwInput).toHaveValue(TEST_PASSWORD);

      await page.getByRole("button", { name: "Se connecter" }).click();
      // Succès = le middleware route le compte onboardé vers /home.
      await page.waitForURL(/\/(home|onboarding)/, { timeout: 12_000 });
    }).toPass({ timeout: 90_000 });

    await page.context().storageState({ path: storageFor(email) });
  });
}
