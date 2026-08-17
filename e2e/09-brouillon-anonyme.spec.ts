import { test, expect } from "@playwright/test";
import { ACCOUNTS, storageFor } from "./helpers";

/**
 * ★ SPRINT 86 — « le dernier mètre » du tunnel « loguer une prise sans compte ».
 *
 * Origine : `docs/qa/QA-BROUILLON-ANONYME-2026-08-17.md` (QA menée dans un Chrome
 * réel sur la production). Le tunnel fonctionnait, mais il coûtait un clic de
 * trop, et ce clic de trop était le plus gros : mesuré en production, le bouton
 * « Mettre à jour mon brouillon » faisait 25 783 px² contre 18 861 px² pour
 * « Créer mon carnet », dans le MÊME teal, et c'était le seul des deux à rester
 * à l'écran.
 *
 * ★ Ce que le sprint 86 supprime, c'est le BOUTON, pas le mécanisme. Il y a DEUX
 * brouillons, à ne jamais confondre :
 *   1. `localStorage['carnet:draft-catch']` refait le FORMULAIRE si on revient ;
 *   2. le cookie `pending-catch` est le SEUL support qui survit à la navigation
 *      vers /auth/register, et le seul que `replayPendingDrafts()` sait rejouer.
 * Le n°2 est désormais écrit EN CONTINU, en silence, jamais demandé.
 *
 * Ce fichier est en trois parties :
 *  - A : le parcours anonyme, en UNE action ;
 *  - B : les défauts de la QA, devenus des non-régressions (plus aucun
 *        `test.fail()` : ils décrivaient la cible, elle est atteinte) ;
 *  - C : ★ la preuve que le MODE CONNECTÉ n'a rien vu changer. C'est le risque
 *        principal du sprint, un seul fichier servant les deux modes.
 *
 * Spot : `pointe-du-raz`, celui du seed e2e (cf 02-carte-spot-conditions).
 */

const SPOT = "pointe-du-raz";
const FORM_URL = `/carnet/nouvelle?spot_id=${SPOT}`;
const ACTION = /Créer mon carnet et enregistrer/i;

/** Ouvre le formulaire anonyme et vérifie qu'on n'est pas tombé sur ChoisirUnSpot. */
async function ouvrirLeFormulaire(page: import("@playwright/test").Page) {
  await page.goto(FORM_URL);
  await page.waitForLoadState("networkidle");
  await expect(
    page.getByText("Remplis d’abord, le compte vient après"),
    "le spot du seed doit être public+approved, sinon on tombe sur ChoisirUnSpot",
  ).toBeVisible();
}

/** Remplit le minimum requis (espèce + taille) et rend la main. */
async function remplirLeMinimum(page: import("@playwright/test").Page) {
  await ouvrirLeFormulaire(page);
  await page.getByRole("button", { name: "Bar", exact: true }).click();
  await page.getByLabel(/Taille/i).fill("45");
}

function footerSubmit(page: import("@playwright/test").Page) {
  return page.locator("form div.fixed.bottom-0").getByRole("button");
}

function bloc(page: import("@playwright/test").Page) {
  return page.locator("#catch-pending-wall");
}

// ─────────────────────────────────────────────────────────────────────────────
// PARTIE A — le parcours anonyme, en UNE action
// ─────────────────────────────────────────────────────────────────────────────

test.describe("A — un seul clic pour loguer sans compte", () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test("la promesse est visible AU CHARGEMENT, sans lien ni bouton", async ({ page }) => {
    await ouvrirLeFormulaire(page);

    // Avant toute saisie : le bloc est là. C'était le cœur du défaut n°1 (il
    // n'apparaissait qu'après une première soumission) et du défaut n°0 (il
    // disparaissait à chaque rechargement).
    await expect(bloc(page)).toBeVisible();
    await expect(bloc(page)).toContainText("part dans ton carnet");
    await expect(bloc(page)).toContainText("Rien n’est enregistré pour l’instant");

    // Aucune action dans le bloc : l'action unique est le footer.
    await expect(bloc(page).getByRole("link")).toHaveCount(0);
    await expect(bloc(page).getByRole("button")).toHaveCount(0);
  });

  test("le footer porte l’action unique, et ne parle plus de brouillon", async ({ page }) => {
    await ouvrirLeFormulaire(page);

    await expect(footerSubmit(page)).toHaveText(ACTION);
    await expect(page.locator("form div.fixed.bottom-0")).not.toContainText(/brouillon/i);
    // Une seule action primaire dans toute la page.
    await expect(page.getByRole("button", { name: ACTION })).toHaveCount(1);
  });

  test("★ un clic mène à l’inscription, qui rappelle la prise en attente", async ({ page }) => {
    await remplirLeMinimum(page);
    await footerSubmit(page).click();

    // Le `redirect` porte la fiche du spot : c'est `returnPathForSlug` qui
    // tranchera au rejeu, mais le contexte ne doit pas se perdre en chemin.
    await page.waitForURL(/\/auth\/register\?redirect=/, { timeout: 20_000 });
    expect(page.url()).toContain(encodeURIComponent(`/spots/${SPOT}`));

    // ★ La preuve que le cookie `pending-catch` a bien voyagé : la page
    // d'inscription le lit CÔTÉ SERVEUR et nomme la prise. Si ce texte disparaît,
    // c'est que le sprint a tué le mécanisme au lieu du bouton.
    await expect(page.getByText(/Ta prise de bar à .+ t’attend/)).toBeVisible();
  });

  test("le cookie est écrit EN CONTINU, sans avoir rien cliqué", async ({ page }) => {
    await remplirLeMinimum(page);

    // Débounce d'autosave : 800 ms.
    await expect(async () => {
      const cookies = await page.context().cookies();
      const pending = cookies.find((c) => c.name === "pending-catch");
      expect(pending, "le brouillon doit exister sans le moindre clic").toBeTruthy();
      const draft = JSON.parse(decodeURIComponent(pending!.value));
      expect(draft.species).toBe("bar");
      expect(draft.size_cm).toBe(45);
      expect(draft.spot_slug).toBe(SPOT);
      // Invariant RGPD du sprint 77 : jamais de coordonnée, de photo ni de texte
      // libre dans ce cookie.
      expect(Object.keys(draft).sort()).toEqual(
        ["caught_at", "privacy", "released", "size_cm", "species", "spot_id", "spot_slug"].sort(),
      );
    }).toPass({ timeout: 10_000 });
  });

  test("aucune prise n'est créée en base tant qu'il n'y a pas de compte", async ({ page }) => {
    await remplirLeMinimum(page);

    const ecritures: string[] = [];
    page.on("request", (r) => {
      if (r.method() !== "GET" && /supabase|\/rest\/v1\//i.test(r.url())) ecritures.push(r.url());
    });

    await footerSubmit(page).click();
    await page.waitForURL(/\/auth\/register/, { timeout: 20_000 });

    expect(
      ecritures,
      "le brouillon est un cookie : zéro écriture réseau vers Supabase",
    ).toEqual([]);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// PARTIE B — les défauts de la QA du 17/08, devenus des non-régressions.
// Plus aucun `test.fail()` : ils décrivaient la cible, elle est atteinte.
// ─────────────────────────────────────────────────────────────────────────────

test.describe("B — les défauts de la QA sont fermés", () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test("défaut 0 — revenir sur le formulaire ne perd plus aucun état", async ({ page }) => {
    // Le bug d'origine : `draftState` repartait à 'idle' au montage et le CTA
    // disparaissait à chaque retour. Il est corrigé PAR CONSTRUCTION : le
    // parcours en deux temps n'existe plus, donc il n'y a plus d'état à
    // réhydrater. On le vérifie sur le scénario réel (aller à l'inscription,
    // revenir en arrière pour vérifier sa taille).
    await remplirLeMinimum(page);
    await footerSubmit(page).click();
    await page.waitForURL(/\/auth\/register/, { timeout: 20_000 });

    await page.goBack();
    await page.waitForLoadState("networkidle");

    await expect(bloc(page)).toBeVisible();
    await expect(footerSubmit(page)).toHaveText(ACTION);
    await expect(bloc(page)).not.toContainText(/brouillon/i);
  });

  test("défaut 0bis — un brouillon posé sur un AUTRE spot n’influence pas cette page", async ({
    page,
  }) => {
    await remplirLeMinimum(page);
    await footerSubmit(page).click();
    await page.waitForURL(/\/auth\/register/, { timeout: 20_000 });

    // Autre spot, même navigateur, même cookie : le formulaire ne doit rien
    // afficher de particulier, il repart de sa promesse générique.
    await page.goto("/carnet/nouvelle?spot_id=pointe-du-grand-minou");
    await page.waitForLoadState("networkidle");

    const surAutreSpot = bloc(page);
    if (await surAutreSpot.count()) {
      await expect(surAutreSpot.getByRole("link")).toHaveCount(0);
      await expect(surAutreSpot).toContainText("Rien n’est enregistré pour l’instant");
    }
  });

  test("défaut 1 — il n’existe plus deux actions concurrentes", async ({ page }) => {
    await remplirLeMinimum(page);
    await footerSubmit(page).click();
    await page.waitForURL(/\/auth\/register/, { timeout: 20_000 });

    // Rien à comparer : la seconde action a disparu. On le prouve à l'aller,
    // avant le clic, en comptant les cibles vers l'inscription dans le document.
    await page.goBack();
    await page.waitForLoadState("networkidle");
    await expect(page.locator('a[href*="/auth/register"]')).toHaveCount(0);
  });

  test("défaut 2 — plus de leurre à côté du bouton : le clic emmène, il n’ancre pas", async ({
    page,
  }) => {
    await remplirLeMinimum(page);
    const bouton = footerSubmit(page);
    await bouton.focus();
    await page.keyboard.press("Enter");

    // Au clavier, une seule pression avance. Avant, elle ré-enregistrait le
    // brouillon et le focus restait sur le mauvais bouton.
    await page.waitForURL(/\/auth\/register/, { timeout: 20_000 });
  });

  test("défaut 3 — le bloc est une région d’état annoncée", async ({ page }) => {
    await ouvrirLeFormulaire(page);

    const annonce = await page.evaluate(() => {
      const w = document.getElementById("catch-pending-wall")!;
      return {
        role: w.getAttribute("role"),
        live: w.getAttribute("aria-live"),
        texte: (w.textContent ?? "").trim().length,
      };
    });

    expect(annonce.role).toBe("status");
    expect(annonce.live).toBe("polite");
    expect(annonce.texte).toBeGreaterThan(0);
  });

  test("défaut 5 — la confidentialité fine part repliée, et se déplie au clic", async ({ page }) => {
    await ouvrirLeFormulaire(page);

    const dépliant = page.getByRole("button", { name: /Réglages de confidentialité/i });
    await expect(dépliant).toBeVisible();
    await expect(dépliant).toHaveAttribute("aria-expanded", "false");

    // Les deux arbitrages sur une audience qu'il n'a pas encore sont au repos…
    await expect(page.getByText("Coords précises pour mes abonnés")).toBeHidden();
    await expect(page.getByText("Coords précises publiques")).toBeHidden();

    // …mais on ne cache PAS l'information de confidentialité : le choix de
    // visibilité et la réassurance restent à l'écran (sprint 77, Bloc 8).
    await expect(page.getByText("Qui voit cette prise")).toBeVisible();
    await expect(page.getByText("Ton coin reste ton coin.")).toBeVisible();

    await dépliant.click();
    await expect(page.getByText("Coords précises pour mes abonnés")).toBeVisible();
    await expect(dépliant).toHaveAttribute("aria-expanded", "true");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// ★ PARTIE C — le mode CONNECTÉ n'a rien vu changer.
// Un seul fichier de ~1 900 lignes sert les deux modes : c'est le risque
// principal du sprint, et il se prouve, il ne se suppose pas.
// ─────────────────────────────────────────────────────────────────────────────

test.describe("C — ★ le connecté n’a rien vu changer", () => {
  test.use({ storageState: storageFor(ACCOUNTS.disco29) });

  test("son formulaire est celui d’avant : libellé, notes, confidentialité dépliée", async ({
    page,
  }) => {
    await page.goto(FORM_URL);
    await page.waitForLoadState("networkidle");

    // Le libellé d'un inscrit n'a pas bougé.
    await expect(footerSubmit(page)).toHaveText(/Loguer la prise/);
    await expect(page.getByRole("button", { name: ACTION })).toHaveCount(0);

    // Aucun bloc d'inscription, aucun dépliant de confidentialité.
    await expect(bloc(page)).toHaveCount(0);
    await expect(
      page.getByRole("button", { name: /Réglages de confidentialité/i }),
    ).toHaveCount(0);

    // Section 7 complète et DÉPLIÉE, comme avant le sprint 86.
    await expect(page.getByText("Notes & Confidentialité")).toBeVisible();
    await expect(page.locator("#notes")).toBeVisible();
    await expect(page.getByText("Qui voit cette prise")).toBeVisible();
    await expect(page.getByText("Coords précises pour mes abonnés")).toBeVisible();
    await expect(page.getByText("Coords précises publiques")).toBeVisible();
    await expect(page.getByText("Ton coin reste ton coin.")).toBeVisible();

    // Photo et technique : le mode connecté garde ses champs complets.
    await expect(page.getByText("Photo", { exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "Leurres", exact: true })).toBeVisible();
  });

  test("n’écrit AUCUN cookie de brouillon anonyme, même après saisie", async ({ page }) => {
    await page.goto(FORM_URL);
    await page.waitForLoadState("networkidle");
    await page.getByRole("button", { name: "Bar", exact: true }).click();
    await page.getByLabel(/Taille/i).fill("45");
    // Bien au-delà du débounce d'autosave (800 ms).
    await page.waitForTimeout(2_000);

    const cookies = await page.context().cookies();
    expect(
      cookies.find((c) => c.name === "pending-catch"),
      "le cookie d’inscription différée est réservé aux visiteurs sans compte",
    ).toBeUndefined();
  });

  test("logue toujours une vraie prise, de bout en bout", async ({ page }) => {
    await page.goto(FORM_URL);
    await page.waitForLoadState("networkidle");
    await page.getByRole("button", { name: "Bar", exact: true }).click();
    await page.getByRole("button", { name: "Leurres", exact: true }).click();
    await page.getByLabel(/Taille/i).fill("52");

    await page.getByRole("button", { name: /Loguer la prise/ }).click();
    // Destination habituelle : la fiche de la prise créée (ou la célébration,
    // qui y mène à sa fermeture).
    await page.waitForURL(/\/carnet\/[0-9a-f-]+$/, { timeout: 30_000 });
  });
});
