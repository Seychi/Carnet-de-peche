# Stripe — stratégie test / live (sprint 9)

Référence : brief sprint 9, bloc A3.

## Principe

Le choix des clés Stripe se fait **automatiquement** selon `process.env.VERCEL_ENV` :

| Environnement | `VERCEL_ENV` | Clés utilisées | Webhook |
|---|---|---|---|
| Local dev (`pnpm dev`) | `undefined` | **TEST** (`sk_test_…`) | Stripe CLI (`stripe listen`) |
| Preview Vercel | `preview` | **TEST** | endpoint test (optionnel) ou CLI |
| Production | `production` | **LIVE** (`sk_live_…`) | endpoint Live `…/api/stripe/webhook` |

La sélection est implémentée dans :
- [`lib/stripe/client.ts`](../../lib/stripe/client.ts) — `isProd ? STRIPE_SECRET_KEY : STRIPE_TEST_SECRET_KEY` (idem publishable + webhook secret)
- [`lib/stripe/pricing.ts`](../../lib/stripe/pricing.ts) — `isProd ? STRIPE_PRICE_* : STRIPE_TEST_PRICE_*`

**Pas de fallback silencieux** : si la clé attendue pour l'environnement manque, `lib/env.ts`
fait échouer le démarrage (fail-fast). En prod, le build Vercel échoue si une var LIVE manque.

## Variables d'environnement

Voir [`.env.example`](../../.env.example) pour la liste complète. Résumé :

- **LIVE** (Vercel → Production) : `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`,
  `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`, + 4 `STRIPE_PRICE_*`.
- **TEST** (local `.env.local` + Vercel Preview/Development) : `STRIPE_TEST_SECRET_KEY`,
  `STRIPE_TEST_WEBHOOK_SECRET`, `NEXT_PUBLIC_STRIPE_TEST_PUBLISHABLE_KEY`, + 4 `STRIPE_TEST_PRICE_*`.

⚠️ `sk_…` et `whsec_…` sont **serveur uniquement** — jamais préfixés `NEXT_PUBLIC_`.
Seule la publishable (`pk_…`) peut être exposée au navigateur.

## Webhook secret selon l'environnement

- **Local** : fourni par `stripe listen` (cf [stripe-cli-playbook.md](./stripe-cli-playbook.md)).
  Change à chaque session CLI → recopier dans `.env.local`.
- **Prod** : Dashboard → Developers → Webhooks → endpoint `…/api/stripe/webhook` → « Signing secret ».

## Installation Stripe CLI

```powershell
winget install Stripe.StripeCLI   # Windows
# puis, dans un terminal neuf :
stripe --version
stripe login
```
