import { test, expect, type APIRequestContext, type Page } from "@playwright/test";
import { createHmac } from "node:crypto";

/**
 * Scénario 5 (sprint 11.5 Bloc E) — DOWNGRADE Stripe.
 *
 * On teste la chaîne complète : webhook customer.subscription.deleted signé →
 * handler handleSubscriptionDeleted → subscriptions.status=canceled/plan=discovery
 * → RPC current_tier repasse 'discovery' → la carte RE-VERROUILLE (paywall
 * « position approchée », filtres verrouillés). Sprint 77 : le bandeau ne parle
 * plus de « 3 spots par département », un compte gratuit voit tous les spots.
 *
 * Round-trip self-contained sur un compte DÉDIÉ (test_downgrade_29, seed_e2e.sql) :
 *   discovery → (created trialing) local → (deleted) discovery.
 * On ne mute aucun autre compte test.
 *
 * Spec autonome À DESSEIN (login + signature webhook inline) : une refonte de
 * l'auth e2e (storageState / auth.setup.ts) était en cours en parallèle au
 * moment de l'écriture — on évite de dépendre de helpers.ts pendant ce remaniement.
 * Migration possible plus tard : ajouter downgrade29 à ACCOUNTS pour que
 * auth.setup le pré-authentifie, puis remplacer robustLogin par test.use storageState.
 */

const EMAIL = "test_downgrade_29@carnet.test";
const PASSWORD = "test-carnet-2026";
const USER_ID = "d0000000-0000-0000-0000-000000000002";
const PAYWALL = "position approchée";

/** Signature Stripe v1 (HMAC-SHA256 sur `${timestamp}.${payload}`). */
function stripeSignature(payload: string, secret: string): string {
  const ts = Math.floor(Date.now() / 1000);
  const sig = createHmac("sha256", secret).update(`${ts}.${payload}`).digest("hex");
  return `t=${ts},v1=${sig}`;
}

async function postWebhook(request: APIRequestContext, baseURL: string, payload: string) {
  const secret = process.env.STRIPE_TEST_WEBHOOK_SECRET!;
  const res = await request.post(`${baseURL}/api/stripe/webhook`, {
    headers: {
      "content-type": "application/json",
      "stripe-signature": stripeSignature(payload, secret),
    },
    data: payload,
  });
  expect(res.status(), "le webhook simulé doit répondre 200").toBe(200);
}

function createdTrialingPayload(subId: string, priceId: string, now: number): string {
  return JSON.stringify({
    id: `evt_e2e_down_create_${now}`,
    object: "event",
    type: "customer.subscription.created",
    data: {
      object: {
        id: subId,
        object: "subscription",
        customer: "cus_e2e_downgrade",
        status: "trialing",
        cancel_at_period_end: false,
        trial_end: now + 7 * 86_400,
        latest_invoice: null,
        default_payment_method: null,
        metadata: { user_id: USER_ID },
        items: {
          data: [
            { price: { id: priceId }, current_period_start: now, current_period_end: now + 7 * 86_400 },
          ],
        },
      },
    },
  });
}

function deletedPayload(subId: string, priceId: string, now: number): string {
  return JSON.stringify({
    id: `evt_e2e_down_delete_${now}`,
    object: "event",
    type: "customer.subscription.deleted",
    data: {
      object: {
        id: subId,
        object: "subscription",
        customer: "cus_e2e_downgrade",
        status: "canceled",
        cancel_at_period_end: false,
        metadata: { user_id: USER_ID },
        items: { data: [{ price: { id: priceId } }] },
      },
    },
  });
}

/**
 * Login robuste inline (même garde-fou que auth.setup.ts) : attente networkidle
 * avant la saisie + re-vérification des valeurs + retry de tout le flow (toPass),
 * pour survivre à la course pré-hydratation React sous CPU lent (CI).
 */
async function robustLogin(page: Page) {
  await expect(async () => {
    await page.goto("/auth/login");
    await page.waitForLoadState("networkidle");
    const email = page.locator("#signin-email");
    const pw = page.locator("#signin-password");
    await email.fill(EMAIL);
    await pw.fill(PASSWORD);
    await expect(email).toHaveValue(EMAIL);
    await expect(pw).toHaveValue(PASSWORD);
    await page.getByRole("button", { name: "Se connecter" }).click();
    await page.waitForURL(/\/(home|onboarding)/, { timeout: 12_000 });
  }).toPass({ timeout: 90_000 });
}

test("downgrade (subscription.deleted) → current_tier discovery → carte re-verrouillée", async ({
  page,
  request,
  baseURL,
}) => {
  const priceId = process.env.STRIPE_TEST_PRICE_LOCAL_MONTHLY;
  expect(process.env.STRIPE_TEST_WEBHOOK_SECRET, "STRIPE_TEST_WEBHOOK_SECRET requis").toBeTruthy();
  expect(priceId, "STRIPE_TEST_PRICE_LOCAL_MONTHLY requis (même valeur que le build)").toBeTruthy();

  await robustLogin(page);

  // --- Départ : discovery → paywall visible -------------------------------
  await page.goto("/carte");
  await expect(page.getByText(PAYWALL)).toBeVisible();

  const now = Math.floor(Date.now() / 1000);
  const subId = `sub_e2e_down_${now}`;

  // --- Upgrade (essai Local) → plus de paywall ----------------------------
  await postWebhook(request, baseURL!, createdTrialingPayload(subId, priceId!, now));
  await page.goto("/carte");
  await expect(page.getByText(PAYWALL)).toHaveCount(0);

  // --- Downgrade (subscription.deleted) → carte re-verrouillée ------------
  await postWebhook(request, baseURL!, deletedPayload(subId, priceId!, now));
  await page.goto("/carte");
  await expect(page.getByText(PAYWALL)).toBeVisible();
});
