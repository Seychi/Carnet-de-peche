import { test, expect } from "@playwright/test";
import { ACCOUNTS, storageFor, fillStable } from "./helpers";

// Sprint 35 / WS A : loguer une prise au CLAVIER (sans GPS) via l'autocomplétion ville.
// Avant le fix, taper une ville ne renseignait jamais les coordonnées → « Position
// requise » au submit. On utilise un compte onboardé (disco29) et on MOCKE l'API BAN
// pour un test déterministe (pas de dépendance réseau à api-adresse.data.gouv.fr).
test.use({ storageState: storageFor(ACCOUNTS.disco29) });

test("nouvelle prise : ville → suggestion → submit (sans saisir de coords)", async ({ page }) => {
  // Mock BAN : « Camaret » → une commune avec coords (Camaret-sur-Mer, Finistère).
  await page.route("**/api-adresse.data.gouv.fr/**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        type: "FeatureCollection",
        features: [
          {
            type: "Feature",
            geometry: { type: "Point", coordinates: [-4.5944, 48.2766] }, // [lng, lat]
            properties: {
              label: "Camaret-sur-Mer",
              citycode: "29022",
              context: "29, Finistère, Bretagne",
            },
          },
        ],
      }),
    });
  });

  await page.goto("/carnet/nouvelle");
  await expect(page.getByText("Nouvelle prise")).toBeVisible();

  // Espèce + technique
  await page.getByRole("button", { name: "Bar", exact: true }).click();
  await page.getByRole("button", { name: "Leurres", exact: true }).click();

  // Lieu par VILLE (mode GPS par défaut, sans cliquer GPS ni « Saisir manuellement »).
  await fillStable(page.getByPlaceholder("Ville (ex : Camaret-sur-Mer)"), "Camaret");

  // La suggestion mockée apparaît → on la choisit (renseigne lat/lng en interne).
  const option = page.getByRole("option", { name: /Camaret-sur-Mer/ });
  await expect(option).toBeVisible();
  await option.click();

  // Submit : aucune coordonnée saisie à la main.
  await page.getByRole("button", { name: "Loguer la prise" }).click();
  await page.waitForURL(/\/carnet\/[0-9a-f-]+$/, { timeout: 30_000 });

  // La prise existe dans le carnet.
  await page.goto("/carnet");
  await expect(page.getByText("Bar").first()).toBeVisible();
});
