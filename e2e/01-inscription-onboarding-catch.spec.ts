import { test, expect } from "@playwright/test";
import { fillStable, fillFormStable } from "./helpers";

// Scénario d'inscription : démarre déconnecté (pas de session injectée).
test.use({ storageState: { cookies: [], origins: [] } });

/**
 * Scénario 1 (brief Bloc E) : inscription → onboarding 6 étapes → première
 * catch loguée. Stack locale : autoconfirm email actif (config.toml), donc le
 * signup pose directement la session — l'écran « Confirme ton adresse »
 * s'affiche quand même (UI normale), on navigue ensuite vers l'onboarding.
 */
test("inscription → onboarding 6 étapes → première catch loguée", async ({ page }) => {
  const email = `e2e-signup-${Date.now()}@carnet.test`;
  const password = "e2e-carnet-2026";
  const username = `e2e_user_${Date.now().toString().slice(-8)}`;

  // --- Inscription -------------------------------------------------------
  await page.goto("/auth/login?tab=register");
  await page.waitForLoadState("networkidle");
  await fillFormStable(page, [
    ["#signup-email", email],
    ["#signup-password", password],
    ["#signup-confirm", password],
  ]);
  await page.getByRole("button", { name: "Créer mon carnet" }).click();
  await expect(page.getByText("Confirme ton adresse")).toBeVisible();

  // Autoconfirm local → session déjà posée. Le middleware doit nous laisser
  // entrer dans l'onboarding (sinon : redirect login = échec attendu du test).
  await page.goto("/onboarding/1");
  await expect(page.getByText("Choisis ton pseudo")).toBeVisible();

  // --- Étape 1 : pseudo (validation temps réel) --------------------------
  await fillStable(page.getByLabel("Ton pseudo"), username);
  await expect(page.getByText("Pseudo disponible")).toBeVisible();
  await page.getByRole("button", { name: "Continuer" }).click();

  // --- Étape 2 : ville + département -------------------------------------
  await expect(page.getByText("D'où tu pêches ?")).toBeVisible();
  await fillStable(page.getByLabel("Ta ville"), "Brest");
  // Select natif département : on cible par valeur '29' (Finistère).
  await page.locator("select").selectOption("29");
  await page.getByRole("button", { name: "Continuer" }).click();

  // --- Étape 3 : techniques ----------------------------------------------
  await expect(page.getByText("Tes techniques")).toBeVisible();
  await page.getByRole("button", { name: "Leurres", exact: true }).click();
  await page.getByRole("button", { name: "Continuer" }).click();

  // --- Étape 4 : espèces --------------------------------------------------
  await expect(page.getByText("Tes espèces favorites")).toBeVisible();
  await page.getByRole("button", { name: "Bar", exact: true }).click();
  await page.getByRole("button", { name: "Continuer" }).click();

  // --- Étape 5 : niveau ----------------------------------------------------
  await expect(page.getByText("Ton niveau")).toBeVisible();
  await page.getByRole("button", { name: /Débutant/ }).click();
  await page.getByRole("button", { name: "Continuer" }).click();

  // --- Étape 6 : fréquence + années ----------------------------------------
  await expect(page.getByText("Ta fréquence de pêche")).toBeVisible();
  await page.getByRole("button", { name: /Toutes les semaines/ }).click();
  await fillStable(page.getByPlaceholder("ex. 5"), "5");
  await page.getByRole("button", { name: "Créer mon carnet" }).click();

  // --- Écran final ----------------------------------------------------------
  await page.waitForURL(/\/onboarding\/fini/, { timeout: 15_000 });
  await expect(page.getByText("Ton carnet est prêt.")).toBeVisible();
  await page.getByRole("link", { name: /LOGUER MA PREMIÈRE PRISE/i }).click();

  // --- Première catch --------------------------------------------------------
  await page.waitForURL(/\/carnet\/nouvelle/);
  await expect(page.getByText("Nouvelle prise")).toBeVisible();

  // Espèce + technique (sections distinctes, mêmes libellés que l'onboarding)
  await page.getByRole("button", { name: "Bar", exact: true }).click();
  await page.getByRole("button", { name: "Leurres", exact: true }).click();

  // Lieu : saisie manuelle (pas de GPS en headless) — Pointe du Raz
  await page.getByText("Saisir manuellement").click();
  await fillStable(page.getByPlaceholder("ex : 48.2744"), "48.0381");
  await fillStable(page.getByPlaceholder("ex : -4.5765"), "-4.7361");

  // Soumission : l'appel conditions Open-Meteo est réel (réseau requis en CI)
  await page.getByRole("button", { name: "Loguer la prise" }).click();
  await page.waitForURL(/\/carnet\/[0-9a-f-]+$/, { timeout: 30_000 });

  // La prise existe dans le carnet
  await page.goto("/carnet");
  await expect(page.getByText("Bar").first()).toBeVisible();
});
