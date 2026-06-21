import { createHmac } from "node:crypto";
import { expect, type Page, type Locator, type APIRequestContext } from "@playwright/test";

/**
 * Helpers partagés des 4 scénarios E2E (sprint 11 Bloc E).
 * Comptes test : seedés par supabase/seed_test_accounts.sql + seed_e2e.sql
 * sur la stack LOCALE uniquement (mot de passe commun).
 */

export const TEST_PASSWORD = "test-carnet-2026";

export const ACCOUNTS = {
  /** discovery, dépt 29 — scénario 04 (poste sur le fil) */
  disco29: "test_disco_29@carnet.test",
  /** local, dépt 29 — scénarios 02 (carte/fiche spot) et 04 (lecteur cross-session) */
  local29: "test_local_29@carnet.test",
  /** discovery, dépt 29 — scénario 03 UNIQUEMENT (muté discovery → local) */
  upgrade29: "test_upgrade_29@carnet.test",
} as const;

/** UUID fixe de test_upgrade_29 (cf supabase/seed_e2e.sql). */
export const UPGRADE_USER_ID = "d0000000-0000-0000-0000-000000000001";

/**
 * Remplit un champ et VÉRIFIE que la valeur tient. Garde-fou contre la course
 * pré-hydratation React : sur un build de prod, Playwright peut remplir un input
 * non-contrôlé AVANT que React n'ait hydraté la page — la valeur est alors jetée
 * à l'hydratation et le formulaire part vide (FormData vide → validation client
 * « champ requis » → submit bloqué). `toPass` ré-exécute fill + assertion
 * jusqu'à ce que la valeur persiste réellement (ou échoue avec un message clair
 * pointant le champ fautif). À utiliser pour TOUTE saisie de champ texte.
 */
export async function fillStable(locator: Locator, value: string) {
  await expect(async () => {
    await locator.fill(value);
    await expect(locator).toHaveValue(value, { timeout: 1_000 });
  }).toPass({ timeout: 15_000 });
}

/** Connexion email/password via l'UI (onglet Connexion de /auth/login). */
export async function login(page: Page, email: string, password = TEST_PASSWORD) {
  await page.goto("/auth/login");
  await fillStable(page.locator("#signin-email"), email);
  await fillStable(page.locator("#signin-password"), password);
  await page.getByRole("button", { name: "Se connecter" }).click();
  // Le middleware route les connectés onboardés vers /home.
  await page.waitForURL(/\/(home|onboarding)/, { timeout: 15_000 });
}

/**
 * Signature Stripe v1 (HMAC-SHA256 sur `${timestamp}.${payload}`) — identique
 * à ce que vérifie stripe.webhooks.constructEvent. Permet de simuler un
 * webhook sans passer par l'infra Stripe (arbitrage Bloc E : le Checkout
 * hébergé a été QA manuellement en LIVE au sprint 9, ici on teste NOTRE
 * chaîne webhook → DB → current_tier → gating UI).
 */
export function stripeSignatureHeader(payload: string, secret: string): string {
  const timestamp = Math.floor(Date.now() / 1000);
  const signature = createHmac("sha256", secret)
    .update(`${timestamp}.${payload}`)
    .digest("hex");
  return `t=${timestamp},v1=${signature}`;
}

/**
 * Simule l'event customer.subscription.created (essai 7j Local mensuel) pour
 * un user donné, signé avec le secret webhook TEST de l'app.
 */
export async function sendTrialCreatedWebhook(
  request: APIRequestContext,
  baseURL: string,
  userId: string
) {
  const secret = process.env.STRIPE_TEST_WEBHOOK_SECRET;
  const priceId = process.env.STRIPE_TEST_PRICE_LOCAL_MONTHLY;
  expect(secret, "STRIPE_TEST_WEBHOOK_SECRET requis pour signer le webhook E2E").toBeTruthy();
  expect(priceId, "STRIPE_TEST_PRICE_LOCAL_MONTHLY requis (même valeur que le build)").toBeTruthy();

  const now = Math.floor(Date.now() / 1000);
  const payload = JSON.stringify({
    id: `evt_e2e_${now}`,
    object: "event",
    type: "customer.subscription.created",
    data: {
      object: {
        id: `sub_e2e_${now}`,
        object: "subscription",
        customer: "cus_e2e_upgrade",
        status: "trialing",
        cancel_at_period_end: false,
        trial_end: now + 7 * 86_400,
        latest_invoice: null,
        default_payment_method: null,
        metadata: { user_id: userId },
        items: {
          data: [
            {
              price: { id: priceId },
              current_period_start: now,
              current_period_end: now + 7 * 86_400,
            },
          ],
        },
      },
    },
  });

  const response = await request.post(`${baseURL}/api/stripe/webhook`, {
    headers: {
      "content-type": "application/json",
      "stripe-signature": stripeSignatureHeader(payload, secret!),
    },
    data: payload,
  });
  expect(response.status(), "le webhook simulé doit répondre 200").toBe(200);
}
