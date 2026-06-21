import { test, expect } from "@playwright/test";
import { fillStable, ACCOUNTS, storageFor } from "./helpers";

/**
 * Scénario 4 (brief Bloc E, nouveau) : poster sur le fil en `discovery` →
 * visible cross-session. Vérifie le Bloc 0 du sprint 10 (social 100% gratuit,
 * migration 022) : un compte SANS abonnement peut écrire sur le fil, et son
 * post est lu par un AUTRE compte dans une session navigateur distincte.
 *
 * Sessions injectées (storageState) : page = test_disco_29 (auteur),
 * contexte B = test_local_29 (lecteur). Aucun login UI.
 */
test.use({ storageState: storageFor(ACCOUNTS.disco29) });

test("post sur le fil en discovery → visible depuis une autre session", async ({
  browser,
  page,
}) => {
  const message = `Sortie bar ce matin — test E2E ${Date.now()}`;

  // --- Session A : test_disco_29 (tier discovery) poste sur /fil/29 --------
  await page.goto("/fil/29");
  const composer = page.getByPlaceholder("Quoi de neuf sur le bord ?");
  await expect(composer).toBeVisible();
  await fillStable(composer, message);
  await page.getByRole("button", { name: "Publier" }).click();
  await expect(page.getByText("Posté !")).toBeVisible();
  await expect(page.getByText(message)).toBeVisible();

  // --- Session B : test_local_29 (contexte isolé, sa propre session) lit ---
  const contextB = await browser.newContext({
    storageState: storageFor(ACCOUNTS.local29),
  });
  const pageB = await contextB.newPage();
  try {
    await pageB.goto("/fil/29");
    await expect(pageB.getByText(message)).toBeVisible({ timeout: 15_000 });
  } finally {
    await contextB.close();
  }
});
