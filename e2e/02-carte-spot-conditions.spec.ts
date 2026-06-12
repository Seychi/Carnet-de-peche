import { test, expect } from "@playwright/test";
import { login, ACCOUNTS } from "./helpers";

/**
 * Scénario 2 (brief Bloc E) : connexion → carte → fiche spot → conditions
 * visibles. Compte test_local_29 (tier local, dépt 29 — seed_test_accounts).
 *
 * Note d'arbitrage : les assertions carte portent sur l'UI hors-canvas
 * (paywall absent pour un tier payant) — le rendu MapLibre dépend de
 * NEXT_PUBLIC_MAPTILER_KEY, optionnelle en CI. La fiche spot est SSR et
 * porte les vraies assertions conditions (marées/météo Open-Meteo).
 */
test("connexion → carte → fiche spot → conditions visibles", async ({ page }) => {
  await login(page, ACCOUNTS.local29);

  // --- Carte : un tier local ne voit PAS le paywall discovery -------------
  await page.goto("/carte");
  await expect(page.getByText("3 spots par département")).toHaveCount(0);

  // --- Fiche spot (SSR, seed.sql) ------------------------------------------
  await page.goto("/spots/pointe-du-raz");
  await expect(page.getByRole("heading", { name: "Pointe du Raz" })).toBeVisible();

  // Section conditions : marées + météo + vagues (Open-Meteo, appel réel)
  await expect(page.getByText(/Conditions à Pointe du Raz/)).toBeVisible({ timeout: 20_000 });
  await expect(page.getByText(/Source Open-Meteo/)).toBeVisible();

  // Infos pratiques (sidebar) — structure/difficulté/espèces du seed
  await expect(page.getByText("Infos pratiques")).toBeVisible();
});
