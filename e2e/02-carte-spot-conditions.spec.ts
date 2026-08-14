import { test, expect } from "@playwright/test";
import { ACCOUNTS, storageFor } from "./helpers";

/**
 * Scénario 2 (brief Bloc E) : carte → fiche spot → conditions visibles, en
 * tant que test_local_29 (tier local). Session injectée via storageState
 * (auth.setup.ts) — pas de login UI.
 *
 * Note d'arbitrage : les assertions carte portent sur l'UI hors-canvas
 * (paywall absent pour un tier payant) — le rendu MapLibre dépend de
 * NEXT_PUBLIC_MAPTILER_KEY, optionnelle en CI. La fiche spot est SSR et
 * porte les vraies assertions conditions (marées/météo Open-Meteo).
 */
test.use({ storageState: storageFor(ACCOUNTS.local29) });

test("connexion → carte → fiche spot → conditions visibles", async ({ page }) => {
  // --- Carte : un tier local ne voit PAS le paywall discovery -------------
  await page.goto("/carte");
  await expect(page.getByText("position approchée")).toHaveCount(0);

  // --- Fiche spot (SSR, seed.sql) ------------------------------------------
  await page.goto("/spots/pointe-du-raz");
  await expect(page.getByRole("heading", { name: "Pointe du Raz", level: 1 })).toBeVisible();

  // Section conditions : marées + météo + vagues (Open-Meteo, appel réel)
  await expect(page.getByText(/Conditions à Pointe du Raz/)).toBeVisible({ timeout: 20_000 });
  await expect(page.getByText(/Source Open-Meteo/)).toBeVisible();

  // Infos pratiques (sidebar) — structure/difficulté/espèces du seed
  await expect(page.getByText("Infos pratiques")).toBeVisible();
});
