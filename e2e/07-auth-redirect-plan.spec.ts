import { test, expect } from "@playwright/test";
import { fillStable, ACCOUNTS, TEST_PASSWORD } from "./helpers";

/**
 * Scénario 7 (sprint 11.6 WS-G) — flux d'auth :
 *   BUG-11 : une route protégée ouverte en déconnecté renvoie vers
 *            /auth/login?redirect=<chemin encodé>, et après connexion on
 *            atterrit sur la cible demandée (plus de perte de destination).
 *   BUG-10 : le CTA « Essayer 7 jours » (Local) conserve le contexte `plan`
 *            à travers la redirection /auth/register → /auth/login.
 *
 * Tests DÉCONNECTÉS → on force une session vide (aucun storageState injecté).
 * Stack Supabase LOCALE (autoconfirm), jamais la prod. Compte seedé : disco29.
 */
test.use({ storageState: { cookies: [], origins: [] } });

test.describe("auth — redirection & contexte plan (sprint 11.6)", () => {
  test("BUG-11 : /fil/29 déconnecté → login?redirect=%2Ffil%2F29 → retour /fil/29", async ({
    page,
  }) => {
    await page.goto("/fil/29");
    await expect(page).toHaveURL(/\/auth\/login\?redirect=%2Ffil%2F29/);

    // Le formulaire connexion embarque le hidden input redirect (lu depuis l'URL).
    await fillStable(page.locator("#signin-email"), ACCOUNTS.disco29);
    await fillStable(page.locator("#signin-password"), TEST_PASSWORD);
    await page.getByRole("button", { name: "Se connecter" }).click();

    // disco29 est onboardé + social 100% gratuit → /fil/29 accessible.
    await expect(page).toHaveURL(/\/fil\/29/, { timeout: 15_000 });
  });

  test("BUG-10 : « Essayer 7 jours » Local → plan=local conservé jusqu'à /auth/login", async ({
    page,
  }) => {
    await page.goto("/tarifs");

    // CTA « Essayer 7 jours » de la carte Local (1er lien de ce libellé).
    const cta = page.getByRole("link", { name: /Essayer 7 jours/i }).first();
    await expect(cta).toBeVisible();
    await cta.click();

    // /auth/register?...plan=local... → 307 → /auth/login?...plan=local...
    await expect(page).toHaveURL(/\/auth\/login\?.*plan=local/, { timeout: 15_000 });

    // Le contexte plan survit en hidden input dans le formulaire (onglet inscription).
    await expect(page.locator('input[name="plan"][value="local"]')).toHaveCount(1);
  });
});
