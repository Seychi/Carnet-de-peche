import { test, expect } from "@playwright/test";
import { ACCOUNTS, storageFor, UPGRADE_USER_ID, sendTrialCreatedWebhook } from "./helpers";

/**
 * Scénario 3 (brief Bloc E, mis à jour post-pivot) : essai Local → tier
 * upgradé → carte complète accessible.
 *
 * Arbitrage (cf e2e/README.md) : on ne passe pas par le Checkout hébergé
 * Stripe (QA manuelle LIVE faite au sprint 9). On POST l'event
 * customer.subscription.created signé avec le secret webhook TEST — ça teste
 * NOTRE chaîne complète : vérif signature → handler → upsert subscriptions →
 * RPC current_tier → gating UI carte. Compte dédié test_upgrade_29
 * (seed_e2e.sql) pour ne pas muter les autres comptes test.
 */
// Session test_upgrade_29 injectée (démarre en discovery ; le tier vient de la
// DB via current_tier, pas du cookie — le webhook le fera passer en local).
test.use({ storageState: storageFor(ACCOUNTS.upgrade29) });

test("essai Local (webhook signé) → tier upgradé → carte complète", async ({
  page,
  request,
  baseURL,
}) => {
  // --- Avant : discovery → paywall visible sur la carte --------------------
  await page.goto("/carte");
  await expect(page.getByText("position approchée")).toBeVisible();

  // --- Webhook Stripe simulé : essai 7j Local mensuel ----------------------
  await sendTrialCreatedWebhook(request, baseURL!, UPGRADE_USER_ID);

  // --- Après : tier local → carte complète, plus de paywall ----------------
  await page.goto("/carte");
  await expect(page.getByText("position approchée")).toHaveCount(0);
});
