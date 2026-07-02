# 📒 Sprint 9 — Paiements Stripe · RÉCAP

> Branche `sprint-9`. Première monétisation : Stripe Checkout + Customer Portal +
> webhooks idempotents, essai 7 jours avec CB, Stripe Tax FR, gating réel des tiers.
> Brief : `docs/sprint-9/brief-sprint-9.md`.

## Décisions (bloc 0, validées par John 2026-05-21)
- Pricing **4,90 € / 9,90 €** TTC (`tax_behavior: inclusive`), annuel **49 € / 99 €** (-17 %).
- Essai **7 jours avec CB** (`trial_period_days: 7`, CB capturée d'emblée).
- **EUR + FR métropole** uniquement ; **DOM-TOM bloqués** (`is_eligible_for_paid_tier`).
- **Stripe Tax FR ON** dès la création des produits.

## Livré

**Bloc B — DB (migration 021, appliquée en prod)**
- Colonnes Stripe sur `subscriptions` (`stripe_price_id`, `current_period_start`,
  `latest_invoice_id`, `default_payment_method`) + index uniques partiels.
- Helpers SQL `current_tier(uid)` (source de vérité tier en lecture) et
  `is_eligible_for_paid_tier(uid)` (bloque DOM-TOM). Types regénérés.

**Bloc C — Lib Stripe + refactor tier**
- `lib/env.ts` étendu (14 vars Stripe, fail-fast selon `VERCEL_ENV`), `vitest.setup.ts`.
- `lib/stripe/client.ts` (server-only, test/live auto), `pricing.ts` (mapping price_id↔plan
  + libellés), `events.ts` (handlers webhook idempotents), `checkout.ts` (customer + session),
  `lib/supabase/service-role.ts`.
- `lib/auth/tier.ts` refactoré (1 round-trip via RPC), `lib/auth/eligibility.ts`.

**Bloc D — Routes API**
- `/api/stripe/checkout` (POST → 303, gardes auth 401 / DOM-TOM 403 / déjà abonné → portal).
- `/api/stripe/webhook` (constructEvent + dispatch, runtime nodejs, GET → 405).
- `/api/stripe/portal` (Customer Portal FR → 303).

**Bloc E — UI**
- `/tarifs` : CTAs selon 4 états (anon / discovery FR / abonné / DOM-TOM), form POST, TrialBadge.
- `/compte/abonnement` : 6 états (trial/active/cancel_scheduled/past_due/canceled/empty),
  TrialCountdown, Customer Portal, 5 dernières factures. Pages success / cancel.
- Bandeau « essai bientôt fini » (J-3) dans le layout `(app)`, dismissible 24h.

**Bloc F — Emails (rédigés, non envoyés)**
- 4 templates React Email (`welcome-trial`, `trial-day-5`, `payment-failed`,
  `subscription-canceled`) + shell de marque. Envoi = sprint 11 (Resend).

**Bloc G — Tests**
- `pricing.test.ts` (8), `events.test.ts` (14), `webhook-route.test.ts` (6), `emails/render` (4).
- Docs `stripe-cli-playbook.md` + `stripe-environments.md`.
- **215 tests verts** (183 base + 32 nouveaux).

**Bloc H — Transition seed → Stripe**
- Garde-fou `current_tier` post-seed dans `seed_test_accounts.sql`.
- Section « Seed test accounts — JAMAIS en prod » + requête anti-traîne dans `supabase/README.md`.

## Findings notables
- **API Stripe `2026-04-22.dahlia`** (SDK 22.x) : `current_period_start/end` migré sur les
  `SubscriptionItem` (plus sur la Subscription) ; `Invoice.subscription` → `invoice.parent.subscription_details.subscription`.
  Handlers écrits avec les bons chemins.
- **`main` == `sprint-8`** : sprint 8 déjà sur main (pré-requis satisfait).
- **Anti-traîne H3** : 2 comptes QA (`redkps4+local`, `redkps4+itinerant`) en tier payant
  sans Stripe dans le projet cloud → à arbitrer avant mise en prod (cf `supabase/README.md`).

## Reste à faire (manuel John)
- Dérouler le playbook Stripe CLI E2E (✅ flow Checkout validé en test le 2026-05-21).
- Cocher la QA `docs/sprint-9/qa-checklist.md` + captures écran des états d'abonnement.
- Renseigner les vars **LIVE** dans Vercel (Production) + créer l'endpoint webhook prod.
- Arbitrer les 2 comptes seed payés (H3) avant le merge.
- Lint : dette préexistante (~360 `react/no-unescaped-entities`) toujours reportée.

## Backlog post-sprint 9 (cf ROADMAP)
- Coupon `BETA2026` (avant sprint 11), cron de réconciliation Stripe→DB (sprint 11),
  envoi emails Resend (sprint 11), Sentry alertes webhook 5xx (sprint 11),
  A/B test pricing (sprint 22), Stripe Connect marketplace (phase 2).
