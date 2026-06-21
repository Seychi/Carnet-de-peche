import { test, expect } from "@playwright/test";
import { login, fillStable, ACCOUNTS } from "./helpers";

/**
 * Scénario 4 (brief Bloc E, nouveau) : poster sur le fil en `discovery` →
 * visible cross-session. Vérifie le Bloc 0 du sprint 10 (social 100% gratuit,
 * migration 022) : un compte SANS abonnement peut écrire sur le fil, et son
 * post est lu par un AUTRE compte dans une session navigateur distincte.
 */
test("post sur le fil en discovery → visible depuis une autre session", async ({
  browser,
  page,
}) => {
  const message = `Sortie bar ce matin — test E2E ${Date.now()}`;

  // --- Session A : test_disco_29 (tier discovery) poste sur /fil/29 --------
  await login(page, ACCOUNTS.disco29);
  await page.goto("/fil/29");
  const composer = page.getByPlaceholder("Quoi de neuf sur le bord ?");
  await expect(composer).toBeVisible();
  await fillStable(composer, message);
  await page.getByRole("button", { name: "Publier" }).click();
  await expect(page.getByText("Posté !")).toBeVisible();
  await expect(page.getByText(message)).toBeVisible();

  // --- Session B (contexte isolé = cookies vierges) : test_local_29 lit ----
  const contextB = await browser.newContext();
  const pageB = await contextB.newPage();
  try {
    await login(pageB, ACCOUNTS.local29);
    await pageB.goto("/fil/29");
    await expect(pageB.getByText(message)).toBeVisible({ timeout: 15_000 });
  } finally {
    await contextB.close();
  }
});
