# 🟢 Brief Sprint 9 — Paiements Stripe

> **Durée** : 2 semaines (cf ROADMAP, fenêtre 2026-06-11 → 2026-06-24)
> **Type** : sprint feature majeur — première monétisation réelle du produit
> **Objectif** : remplacer le gating tier seedé en base (sprint 8) par du vrai paiement Stripe Checkout + Customer Portal + webhooks idempotents. Essai 7 jours **avec CB** (décision verrouillée sprint 7.5). Stripe Tax FR activé d'office.
> **Pré-requis** : sprint 8 mergé sur `main`, audits Cowork + Claude in Chrome traités (P0 corrigés), CI verte, pas de fuite GPS résiduelle.
> **Référence roadmap** : `docs/ROADMAP.md` § "Sprint 9 — Paiements Stripe"

---

## Comment lire ce brief

Même format que `docs/sprint-8/brief-sprint-8.md` :

- Tâches numérotées, autonomes à l'intérieur d'un bloc, **ordonnées par bloc** (0 → A → B → C → D → E → F → G → H → I).
- Chaque tâche : fichier(s) cible(s), critère d'acceptation testable, coût estimé.
- Mode d'opération : Conventional Commits, branche `sprint-9` recommandée (gros sprint avec webhooks + secrets + refactor tier — pas de commit direct `main`), tutoiement, copy FR.
- **Tests** : Stripe CLI obligatoire pour rejouer les webhooks en local. Au minimum 20 tests Vitest nouveaux + tests d'intégration Stripe (rejeu webhook signé).

> ⚠️ **Règle d'or sprint 9** : Stripe = source de vérité de l'abonnement. **Aucune écriture dans `subscriptions` ne doit se faire en dehors du webhook handler** (sauf seed dev/preview-only, et trial start côté Checkout success). Toute autre voie = risque de désync. Cf risque #1 du ROADMAP §9.

> 🔐 **Sécurité secrets** : `STRIPE_SECRET_KEY` et `STRIPE_WEBHOOK_SECRET` ne touchent JAMAIS le navigateur. Dans `lib/env.ts`, marqués required en serveur, jamais préfixés `NEXT_PUBLIC_`. Test : `grep -r "STRIPE_SECRET" --include "*.ts" --include "*.tsx" app/ components/` ne doit retourner que des usages côté Server Actions / API routes / `/lib/stripe/`.

---

# Bloc 0 — Décisions à verrouiller AVANT de coder (15 min, à valider par John)

Le ROADMAP §9 pose 4 décisions. Le brief propose les recommandations par défaut. **John doit lire et trancher** avant le Bloc A.

> ✅ **VALIDÉ par John le 2026-05-21** — les 4 recommandations sont retenues telles quelles :
> - **0.1** Pricing 4,90 € / 9,90 € TTC, annuel -17 % (49 € / 99 €), `tax_behavior: inclusive`
> - **0.2** Essai 7 jours **avec CB** (confirmé, cf sprint 7.5)
> - **0.3** EUR + FR métropole uniquement, DOM-TOM (971/972/973/974/976) bloqués via `is_eligible_for_paid_tier`
> - **0.4** Stripe Tax FR **ON** dès la création des produits

## 0.1 — Pricing exact côté Stripe

**Recommandation** : valider les 3 plans déjà encodés dans `app/(marketing)/tarifs/pricing-cards.tsx` :

| Produit Stripe | Prix mensuel TTC | Prix annuel TTC | Economy annuel |
|---|---|---|---|
| Carnet de Pêche · Local | 4,90 € | 49 € (= 4,08 €/mois équivalent) | -17 % |
| Carnet de Pêche · Itinérant | 9,90 € | 99 € (= 8,25 €/mois équivalent) | -17 % |

⚠️ **TTC ou HT ?** Avec Stripe Tax FR activé, on saisit le prix **TTC** dans Stripe (`tax_behavior: inclusive`). C'est la pratique B2C FR — cohérent avec ce que voient les utilisateurs sur `/tarifs`. Décision : **inclusive**.

## 0.2 — Essai 7 jours **avec CB** (verrouillé sprint 7.5)

**Décision déjà prise** (cf CLAUDE.md §2 sprint 7.5 bloc A — "essai aligné 7 jours avec CB (décision verrouillée)"). Stripe Subscription créée avec `trial_period_days: 7`. La CB est capturée immédiatement, aucune charge avant J+8.

**Conséquences** :
- Pas de fake trial DB-only. Pas de champ `trial_until` séparé — on lit `subscription.trial_end` venu de Stripe.
- Bouton "Essayer 7 jours" sur `/tarifs` → redirige direct vers Checkout Stripe.
- L'utilisateur peut annuler à tout moment via Customer Portal avant J+7 → pas de charge.

> ✅ **Confirmé par John le 2026-05-21** : on garde le 7j AVEC CB. Suite du brief OK.

## 0.3 — Devise + zone géo

**Recommandation** : **EUR uniquement**, **FR métropolitaine uniquement** en v1. Bloquer les souscriptions depuis IP DOM-TOM (`971`/`972`/`973`/`974`/`976`) au niveau Checkout (`allowed_countries: ['FR']` + check côté serveur du `home_department` pour exclure DOM).

**Pourquoi** : Stripe Tax FR métropole = simple (TVA 20 % forfaitaire). DOM-TOM = TVA spécifique par territoire, surcomplication v1.

**Action** : ajouter en migration 021 une fonction `is_eligible_for_paid_tier(uid uuid)` qui retourne `false` si `profiles.home_department` est dans la liste DOM-TOM. La page `/tarifs` affiche un encart "Outre-mer bientôt" pour ces users.

## 0.4 — Stripe Tax ON dès le départ

**Recommandation** : oui, **Stripe Tax activé** dès la création des produits.

**Coût** : 0,5 % du transactionnel — sur 50 abonnés à 4,90 € c'est 1,2 €/mois. Vs la dette technique d'ajouter Tax après 1 000 abonnés (refonte facturation + obligation de re-facturer = inacceptable).

**Action** : activer Stripe Tax FR dans Dashboard avant de créer les produits (A1).

---

# Bloc A — Stripe Dashboard + secrets (2-3h)

## A1 — Setup compte Stripe production + test (1h)

> ⚠️ **John uniquement** (Claude Code ne peut pas créer le compte Stripe). À faire en amont du sprint si pas déjà fait.

Checklist Stripe Dashboard :

1. **Compte Stripe** créé en `Production` (vérification IBAN + KYC entreprise individuelle, peut prendre 24-48h)
2. **Stripe Tax** activé en **France métropolitaine**
3. **Customer Portal** configuré :
   - Annulation libre activée (à effet fin de période)
   - Update CB activé
   - Update plan activé (changement Local ↔ Itinérant)
   - Update billing details activé
   - Pas de remboursement self-service (refunds = manuel John)
4. **Branding** : logo (carnet-de-peche.svg), couleur primaire `#0A2F3D`
5. **2 produits créés** :
   - "Carnet de Pêche · Local" — id à noter
   - "Carnet de Pêche · Itinérant" — id à noter
6. **4 prix actifs par produit** (mode `inclusive` Tax) :
   - Local mensuel : 4,90 € recurring/month
   - Local annuel : 49,00 € recurring/year
   - Itinérant mensuel : 9,90 € recurring/month
   - Itinérant annuel : 99,00 € recurring/year
7. **Webhook endpoint** créé pointant vers `https://www.carnet-de-peche.com/api/stripe/webhook`, événements souscrits :
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `customer.subscription.trial_will_end`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`

**Bonus prod** : créer un coupon `BETA2026` (50 invités × 6 mois Itinérant gratuit, cf sprint 11). À garder en backlog si pas le temps, créable avant la beta.

**Critère d'acceptation**
- 1 compte Stripe `Live` actif
- 2 produits × 4 prix = 8 price_ids notés dans un doc privé (pas committé en clair)
- Webhook endpoint affiche "Listening" en Live mode

## A2 — Renseigner les env vars dans Vercel + `.env.local` (15 min)

Variables à ajouter (Vercel : Production + Preview + Development pour les `NEXT_PUBLIC_*`) :

```bash
# Stripe — Live (production seulement)
STRIPE_SECRET_KEY=sk_live_...                 # serveur, jamais public
STRIPE_WEBHOOK_SECRET=whsec_...               # serveur
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_... # client OK

# Stripe — Test (preview + dev)
STRIPE_TEST_SECRET_KEY=sk_test_...
STRIPE_TEST_WEBHOOK_SECRET=whsec_test_...
NEXT_PUBLIC_STRIPE_TEST_PUBLISHABLE_KEY=pk_test_...

# Price IDs (mappés vers tier dans lib/stripe/pricing.ts)
STRIPE_PRICE_LOCAL_MONTHLY=price_...
STRIPE_PRICE_LOCAL_ANNUAL=price_...
STRIPE_PRICE_ITINERANT_MONTHLY=price_...
STRIPE_PRICE_ITINERANT_ANNUAL=price_...
# Idem _TEST_ pour preview/dev
```

**Critère** : `lib/env.ts` (à étendre dans C1) parse toutes ces vars avec validation zod. En prod, build échoue si une var Stripe manque.

## A3 — Documenter la stratégie test/live (15 min)

Créer `docs/sprint-9/stripe-environments.md` :

- **Local dev** : Stripe **Test mode** + Stripe CLI pour rejeu webhook (`stripe listen --forward-to localhost:3000/api/stripe/webhook`)
- **Preview Vercel** : Stripe **Test mode** (mêmes clés que dev)
- **Production** : Stripe **Live mode**, secrets séparés

Le client Stripe `lib/stripe/client.ts` lit `process.env.VERCEL_ENV === 'production' ? sk_live : sk_test`. **Pas de fallback** si la clé attendue manque (fail-fast).

**Critère** : doc créée, lue par John. Stripe CLI installée localement (`brew install stripe/stripe-cli/stripe`).

---

# Bloc B — DB : migration 021 (2h)

## B1 — `supabase/migrations/021_subscriptions_stripe_columns.sql` (1h)

> 💡 La table `subscriptions` existe déjà (cf migration 001) avec : `user_id`, `plan`, `stripe_customer_id`, `stripe_subscription_id`, `status`, `current_period_end`, `cancel_at_period_end`, `trial_end`. **Il manque** : `stripe_price_id`, `current_period_start`, et un index sur `stripe_subscription_id`. **Pas de refactor brutal**, juste ajouts.

```sql
-- ============================================================
-- Migration 021 — Sprint 9 : Stripe columns + indexes
-- ============================================================

-- 1) Colonnes manquantes
alter table public.subscriptions
  add column if not exists stripe_price_id text,
  add column if not exists current_period_start timestamptz,
  add column if not exists latest_invoice_id text,        -- pour reconciliation
  add column if not exists default_payment_method text;   -- pmt method id (pour Customer Portal pre-fill)

-- 2) Index pour lookup par webhook
create unique index if not exists subscriptions_stripe_subscription_id_uidx
  on public.subscriptions(stripe_subscription_id)
  where stripe_subscription_id is not null;

create unique index if not exists subscriptions_stripe_customer_id_uidx
  on public.subscriptions(stripe_customer_id)
  where stripe_customer_id is not null;

-- 3) RLS : confirmer policies existantes (lecture user sur son row, écriture jamais)
drop policy if exists "subscriptions_select_own" on public.subscriptions;
drop policy if exists "subscriptions_no_user_write" on public.subscriptions;

create policy "subscriptions_select_own"
  on public.subscriptions for select
  using (user_id = auth.uid());

-- Pas de policy INSERT/UPDATE/DELETE → seul service_role peut écrire (webhook + seed dev).
-- (RLS bloque l'écriture côté authenticated par défaut.)

-- 4) Helper : is_eligible_for_paid_tier
create or replace function public.is_eligible_for_paid_tier(uid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select case
    when (select home_department from public.profiles where id = uid)
         in ('971','972','973','974','976')
    then false
    else true
  end;
$$;

comment on function public.is_eligible_for_paid_tier is
  'false si user en DOM-TOM (Stripe Tax non couvert v1). Bloque l''accès à Checkout.';

-- 5) Helper : current_tier
--    Source de vérité = subscriptions (alimenté par webhook Stripe).
--    Retourne 'discovery' / 'local' / 'itinerant' / 'anonymous' selon état.
create or replace function public.current_tier(uid uuid)
returns text
language sql
stable
security definer
set search_path = public
as $$
  with sub as (
    select plan, status, trial_end, current_period_end, cancel_at_period_end
    from public.subscriptions
    where user_id = uid
    order by created_at desc limit 1
  )
  select case
    when uid is null then 'anonymous'
    when not exists(select 1 from sub) then 'discovery'
    -- Trial actif (statut trialing + trial_end > now)
    when (select status from sub) = 'trialing'
         and (select trial_end from sub) > now() then (select plan from sub)
    -- Active avec période courante valide
    when (select status from sub) = 'active'
         and (select current_period_end from sub) > now() then (select plan from sub)
    -- Annulation programmée fin de période, mais encore dans la période
    when (select status from sub) = 'active'
         and (select cancel_at_period_end from sub) = true
         and (select current_period_end from sub) > now() then (select plan from sub)
    -- Tout le reste = retombe en discovery
    else 'discovery'
  end;
$$;

comment on function public.current_tier is
  'Source de vérité tier en lecture. Refactor lib/auth/tier.ts l''appelle. Webhook Stripe est le seul à écrire en upstream.';
```

**Critère** :
- Migration appliquée en remote (`supabase db push --linked`)
- `select current_tier(auth.uid())` retourne le bon tier pour les comptes seed sprint 8
- `pnpm typecheck` vert après `pnpm dlx supabase gen types typescript ... > lib/types.ts`

## B2 — Régen `lib/types.ts` (5 min)

```bash
pnpm dlx supabase gen types typescript --project-id glgciwwnpmgifyhbvxsw > lib/types.ts
```

**Critère** : `is_eligible_for_paid_tier`, `current_tier` apparaissent dans les types des RPC.

---

# Bloc C — Lib Stripe + refactor tier (4-5h)

## C1 — `lib/env.ts` : étendre avec les vars Stripe (15 min)

Ajouter au schéma zod existant les 9 nouvelles vars Stripe (cf A2). Logique : en prod (`VERCEL_ENV === 'production'`), exiger les `sk_live`/`pk_live`/`whsec`. En preview/dev, exiger les `_TEST_` équivalents. Pas de fallback silencieux.

**Critère** : `pnpm dev` démarre OK avec clés test. `pnpm build` en prod échoue si clé live manque.

## C2 — `lib/stripe/client.ts` (15 min)

```ts
import Stripe from 'stripe'
import { env } from '@/lib/env'

const isProd = process.env.VERCEL_ENV === 'production'

export const stripe = new Stripe(
  isProd ? env.STRIPE_SECRET_KEY : env.STRIPE_TEST_SECRET_KEY,
  {
    apiVersion: '2024-12-18.acacia', // pinner la version Stripe (à vérifier au moment du sprint)
    typescript: true,
    appInfo: {
      name: 'Carnet de Pêche',
      version: '1.0.0',
      url: 'https://www.carnet-de-peche.com',
    },
  }
)

export const STRIPE_PUBLISHABLE_KEY = isProd
  ? env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
  : env.NEXT_PUBLIC_STRIPE_TEST_PUBLISHABLE_KEY
```

**Critère** : `import { stripe } from '@/lib/stripe/client'` accessible côté server uniquement (pas dans un client component).

## C3 — `lib/stripe/pricing.ts` — mapping price_id ↔ tier (30 min)

Table en dur, **single source of truth** :

```ts
import { env } from '@/lib/env'

const isProd = process.env.VERCEL_ENV === 'production'

type PlanInterval = 'monthly' | 'annual'
type PaidPlan = 'local' | 'itinerant'

export const STRIPE_PRICES = {
  local: {
    monthly: isProd ? env.STRIPE_PRICE_LOCAL_MONTHLY : env.STRIPE_TEST_PRICE_LOCAL_MONTHLY,
    annual:  isProd ? env.STRIPE_PRICE_LOCAL_ANNUAL  : env.STRIPE_TEST_PRICE_LOCAL_ANNUAL,
  },
  itinerant: {
    monthly: isProd ? env.STRIPE_PRICE_ITINERANT_MONTHLY : env.STRIPE_TEST_PRICE_ITINERANT_MONTHLY,
    annual:  isProd ? env.STRIPE_PRICE_ITINERANT_ANNUAL  : env.STRIPE_TEST_PRICE_ITINERANT_ANNUAL,
  },
} as const satisfies Record<PaidPlan, Record<PlanInterval, string>>

// Map inverse : price_id → plan
export const STRIPE_PRICE_TO_PLAN: Record<string, PaidPlan> = {
  [STRIPE_PRICES.local.monthly]: 'local',
  [STRIPE_PRICES.local.annual]:  'local',
  [STRIPE_PRICES.itinerant.monthly]: 'itinerant',
  [STRIPE_PRICES.itinerant.annual]:  'itinerant',
}

export function priceIdToPlan(priceId: string): PaidPlan | null {
  return STRIPE_PRICE_TO_PLAN[priceId] ?? null
}
```

**Critère** : tests Vitest `lib/stripe/__tests__/pricing.test.ts` : 8 cas (4 price_ids → plans + 4 prix invalides → null) verts.

## C4 — `lib/stripe/events.ts` — handlers webhook (1.5h)

Une fonction par event Stripe. Chaque handler :
- Idempotent : check `subscriptions.stripe_subscription_id` avant insert
- Pas d'écriture qui contredit l'event (ex : ne pas downgrade un user qui a `status=active` à partir d'un event `subscription.deleted` re-rejoué après le `subscription.created` qui a déjà ramené la sub à `active`)
- Logue le `event.id` + `event.type` + `subscription_id` côté console (Sentry sprint 11)

```ts
import type Stripe from 'stripe'
import { createServiceRoleClient } from '@/lib/supabase/service-role'
import { priceIdToPlan } from './pricing'

export async function handleSubscriptionUpsert(sub: Stripe.Subscription) {
  const supabase = createServiceRoleClient()
  const price = sub.items.data[0]?.price.id
  const plan = price ? priceIdToPlan(price) : null
  if (!plan) {
    console.warn('[stripe-webhook] subscription with unknown price', { subId: sub.id, price })
    return
  }
  const userId = sub.metadata.user_id  // posé dans createCheckoutSession (D1)
  if (!userId) {
    console.error('[stripe-webhook] subscription without user_id metadata', { subId: sub.id })
    return
  }

  await supabase.from('subscriptions').upsert({
    user_id: userId,
    plan,
    stripe_customer_id: sub.customer as string,
    stripe_subscription_id: sub.id,
    stripe_price_id: price,
    status: sub.status,
    current_period_start: new Date(sub.current_period_start * 1000).toISOString(),
    current_period_end: new Date(sub.current_period_end * 1000).toISOString(),
    cancel_at_period_end: sub.cancel_at_period_end,
    trial_end: sub.trial_end ? new Date(sub.trial_end * 1000).toISOString() : null,
    latest_invoice_id: typeof sub.latest_invoice === 'string' ? sub.latest_invoice : sub.latest_invoice?.id,
    default_payment_method: typeof sub.default_payment_method === 'string'
      ? sub.default_payment_method
      : sub.default_payment_method?.id,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'user_id' })
}

export async function handleSubscriptionDeleted(sub: Stripe.Subscription) {
  const supabase = createServiceRoleClient()
  await supabase.from('subscriptions').update({
    plan: 'discovery',
    status: 'canceled',
    cancel_at_period_end: false,
    stripe_subscription_id: null,
    stripe_price_id: null,
    trial_end: null,
    updated_at: new Date().toISOString(),
  }).eq('stripe_subscription_id', sub.id)
}

export async function handleInvoicePaymentFailed(inv: Stripe.Invoice) {
  // Logue + (sprint 11) email user. Pour l'instant, console + tag subscription past_due.
  console.warn('[stripe-webhook] invoice payment failed', { invId: inv.id, sub: inv.subscription })
}

// ... idem pour: checkout.session.completed, invoice.payment_succeeded, trial_will_end
```

**Critère** :
- Tests Vitest qui passent un fixture `Stripe.Subscription` à chaque handler et vérifient l'état attendu en DB (mock supabase)
- Idempotency testée : appeler 2× `handleSubscriptionUpsert` avec le même event ne crée pas de double row

## C5 — `lib/supabase/service-role.ts` (10 min)

Helper pour créer un client Supabase avec la `SUPABASE_SERVICE_ROLE_KEY` (déjà ajoutée en sprint 7.5). À utiliser EXCLUSIVEMENT côté webhook handlers + scripts admin.

```ts
import { createClient } from '@supabase/supabase-js'
import { env } from '@/lib/env'

export function createServiceRoleClient() {
  return createClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false } }
  )
}
```

**Critère** : `grep -r "createServiceRoleClient" --include "*.ts" --include "*.tsx"` ne retourne QUE des fichiers dans `app/api/stripe/`, `lib/stripe/`, ou `scripts/` admin.

## C6 — Refactor `lib/auth/tier.ts` pour lire `current_tier` RPC (45 min)

**Avant** (extrait sprint 7) : lit `has_active_subscription` puis fetch plan séparément.

**Après** : un seul appel à la RPC `current_tier(uid)` (B1 §5) :

```ts
export const getUserTier = cache(async (): Promise<UserTier> => {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return 'anonymous'

  const { data, error } = await supabase.rpc('current_tier', { uid: user.id })
  if (error) {
    console.error('[tier] current_tier rpc error', error)
    return 'discovery' // fallback safe
  }
  return (data as UserTier) ?? 'discovery'
})
```

**Critère** :
- Comportement identique à avant pour les 5 comptes seed sprint 8
- 1 seul round-trip DB au lieu de 2 (cf React `cache()`)
- Tests Vitest verts (les tests existants `lib/auth/__tests__/tier.test.ts` doivent passer sans modif côté input)

## C7 — Garde `is_eligible_for_paid_tier` côté UI + serveur (15 min)

Avant tout clic vers Checkout, vérifier l'éligibilité géo (DOM-TOM bloqués).

- Server Action `app/actions/billing.ts` (créée en D1) appelle `is_eligible_for_paid_tier` en premier
- Composant `<PricingCards>` reçoit `eligible: boolean` via Server Component parent, et désactive les CTAs payants avec un encart "Outre-mer non couvert v1, on travaille dessus"

**Critère** : compte test avec `home_department='974'` voit l'encart, ne peut pas atteindre Checkout même via URL forgée.

---

# Bloc D — API routes Stripe (4-5h)

## D1 — `app/api/stripe/checkout/route.ts` (1.5h)

POST → crée une `Checkout Session` Stripe + retourne `{ url }`. Le client `redirect(url)`.

```ts
// Pseudo-code
- Vérifier auth (user logged in)
- Vérifier is_eligible_for_paid_tier
- Récupérer ou créer stripe_customer_id (Stripe Customers.create avec email + metadata.user_id)
- Vérifier qu'il n'y a pas déjà une subscription active (refuser ou rediriger vers Customer Portal pour change plan)
- Créer Checkout Session :
  mode: 'subscription'
  line_items: [{ price: priceId, quantity: 1 }]
  customer: stripe_customer_id
  subscription_data: {
    trial_period_days: 7,
    metadata: { user_id }
  }
  metadata: { user_id }
  allow_promotion_codes: true     // coupon BETA2026 sprint 11
  automatic_tax: { enabled: true } // Stripe Tax
  customer_update: { address: 'auto' }
  tax_id_collection: { enabled: false } // B2C
  billing_address_collection: 'required'
  payment_method_collection: 'always'
  success_url: https://www.carnet-de-peche.com/compte/abonnement/success?session_id={CHECKOUT_SESSION_ID}
  cancel_url: https://www.carnet-de-peche.com/tarifs?cancel=1
  locale: 'fr'
- Renvoyer { url }
```

**Critère** :
- Test manuel : cliquer "Essayer 7 jours · Local mensuel" sur `/tarifs` → atterri sur Stripe Checkout en FR avec 4,90 € visible + bandeau "Essai 7 jours"
- Cartes test Stripe (`4242 4242 4242 4242` succès, `4000 0000 0000 9995` decline) → flows respectifs

## D2 — `app/api/stripe/webhook/route.ts` (1.5h)

POST → vérifie signature `Stripe-Signature` (constructEvent avec `STRIPE_WEBHOOK_SECRET`), puis dispatche vers `lib/stripe/events.ts` handlers.

```ts
import { stripe } from '@/lib/stripe/client'
import { env } from '@/lib/env'
import * as handlers from '@/lib/stripe/events'

export async function POST(req: Request) {
  const signature = req.headers.get('stripe-signature')
  if (!signature) return new Response('No signature', { status: 400 })

  const body = await req.text() // raw body required for sig verif
  const secret = isProd ? env.STRIPE_WEBHOOK_SECRET : env.STRIPE_TEST_WEBHOOK_SECRET

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(body, signature, secret)
  } catch (e) {
    console.error('[webhook] signature verification failed', e)
    return new Response('Invalid signature', { status: 400 })
  }

  console.log('[webhook]', event.id, event.type)
  try {
    switch (event.type) {
      case 'checkout.session.completed':
        await handlers.handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session)
        break
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
        await handlers.handleSubscriptionUpsert(event.data.object as Stripe.Subscription)
        break
      case 'customer.subscription.deleted':
        await handlers.handleSubscriptionDeleted(event.data.object as Stripe.Subscription)
        break
      case 'customer.subscription.trial_will_end':
        await handlers.handleTrialWillEnd(event.data.object as Stripe.Subscription)
        break
      case 'invoice.payment_succeeded':
        await handlers.handleInvoicePaymentSucceeded(event.data.object as Stripe.Invoice)
        break
      case 'invoice.payment_failed':
        await handlers.handleInvoicePaymentFailed(event.data.object as Stripe.Invoice)
        break
      default:
        console.log('[webhook] ignored', event.type)
    }
    return new Response('ok', { status: 200 })
  } catch (e) {
    console.error('[webhook] handler error', event.id, e)
    // Renvoyer 500 → Stripe retry. Idempotency garantie côté handlers (C4).
    return new Response('Handler error', { status: 500 })
  }
}

// Force Node runtime (pas Edge — besoin Buffer raw body)
export const runtime = 'nodejs'
```

⚠️ **Important** : `runtime = 'nodejs'` (pas Edge) — `stripe.webhooks.constructEvent` a besoin du raw body en string/Buffer, et Edge a parfois des soucis de stream.

**Critère** :
- Stripe CLI : `stripe trigger customer.subscription.created` côté local → webhook reçu, DB updated
- Replay : rejouer 2× le même event → DB état stable, pas de doublon (idempotency)
- Forge avec signature invalide → 400

## D3 — `app/api/stripe/portal/route.ts` (30 min)

POST → crée une `billingPortal.Session` Stripe et retourne `{ url }`.

```ts
- Vérifier auth + récupérer stripe_customer_id depuis subscriptions
- Si aucune subscription → 400 "Pas de Customer Portal sans abonnement"
- billingPortal.sessions.create({
    customer: stripe_customer_id,
    return_url: 'https://www.carnet-de-peche.com/compte/abonnement'
  })
- return { url }
```

**Critère** : depuis `/compte/abonnement`, bouton "Gérer mon abonnement" → atterrit dans Customer Portal Stripe en FR.

## D4 — `app/api/stripe/checkout/success/route.ts` (optionnel, 30 min)

Pas obligatoire si on délègue tout au webhook. Mais utile : sur l'arrivée `/compte/abonnement/success?session_id=xxx`, on peut faire un `stripe.checkout.sessions.retrieve(session_id, { expand: ['subscription'] })` pour confirmer côté UI tout de suite sans attendre le webhook.

**Critère** : page success affiche "Bienvenue dans Local 7 jours d'essai" sans dépendre de la latence webhook.

## D5 — Sécurité runtime : protection /api/stripe/webhook (15 min)

- Pas de CORS sur cette route (seul Stripe l'appelle)
- Pas de rate-limiting custom (Stripe rate-limit ses propres retries)
- Documenter dans le code : "ne JAMAIS rendre cette route publique en GET, c'est POST-only"

**Critère** : `curl -X GET .../api/stripe/webhook` → 405

---

# Bloc E — UI tarifs + page abonnement (4-5h)

## E1 — Refonte `app/(marketing)/tarifs/pricing-cards.tsx` (1.5h)

Remplacer les CTAs actuels (qui pointent vers `/auth/register` depuis sprint 7.5) par :

```tsx
// Si user pas loggué :
<Link href={`/auth/register?next=/tarifs&plan=${plan}&interval=${interval}`}>Essayer 7 jours</Link>

// Si user loggué + eligible + pas déjà abonné :
<form action="/api/stripe/checkout" method="POST">
  <input type="hidden" name="plan" value={plan} />
  <input type="hidden" name="interval" value={interval} />
  <button type="submit">Essayer 7 jours</button>
</form>

// Si user loggué + tier déjà actif :
<Link href="/compte/abonnement">Gérer mon abonnement</Link>

// Si user loggué + DOM-TOM :
<div className="bg-sand-100 text-ink-700 text-sm rounded-lg p-3">
  Outre-mer pas encore couvert. <Link href="/contact">Préviens-nous</Link>.
</div>
```

**Composant** `<TrialBadge>` : "Essai 7j · CB requise · Annulation 1 clic" en chip teal sous chaque CTA payant.

**Critère** :
- 4 états testés (anonymous / discovery FR / local FR / discovery DOM)
- Le toggle mensuel/annuel modifie bien le `interval` envoyé à Checkout
- Pas de redirection magique : un POST classique vers `/api/stripe/checkout`, qui répond 303 vers Stripe

## E2 — `app/(app)/compte/abonnement/page.tsx` (2h)

Page de gestion :

```
- Header : "Ton abonnement"
- Card état actuel :
  - Plan : Local mensuel (logo + 4,90 €/mois)
  - Statut : Essai en cours · J+5 sur 7 — finit le 28 mai 2026
    OU
  - Statut : Actif · Prochain prélèvement le 28 juin 2026 (4,90 €)
    OU
  - Statut : Annulé · Accès jusqu'au 28 juin 2026
- 2 CTAs :
  - "Gérer mon abonnement" → POST /api/stripe/portal
  - "Changer de plan" → POST /api/stripe/portal (Stripe portal gère le changement)
- Historique : 5 dernières factures (Stripe Invoices.list, lien PDF)
```

**Composant** `<TrialCountdown>` : "Il reste 5 jours d'essai" avec progress bar teal.

**Empty state** (user discovery sans subscription) : "Tu n'as pas encore d'abonnement. [CTA vers /tarifs]"

**Critère** : pour chaque état (trial / active / cancel_at_period_end / canceled / past_due), capture écran dans `docs/sprint-9/screenshots/abonnement-states.png`.

## E3 — `app/(app)/compte/abonnement/success/page.tsx` (30 min)

Page d'atterrissage post-Checkout :
- Si `session_id` valide + payment ok : "Bienvenue dans Local 🎉 · Ton essai 7 jours démarre maintenant"
- Sinon : redirige `/compte/abonnement`

**Critère** : test manuel après checkout test, page rend bien.

## E4 — `app/(app)/compte/abonnement/cancel/page.tsx` (15 min)

Atterrissage si user annule pendant le Checkout :
- "Tu as annulé. Quand tu veux revenir, [CTA /tarifs]."
- Pas de hard-feelings, pas de tracking dégueulasse

**Critère** : test manuel.

## E5 — Bandeau global "Trial bientôt fini" (45 min)

Côté `app/(app)/layout.tsx` : si `subscription.trial_end` < 3 jours, affiche un bandeau teal en haut de toutes les pages app :

> "Il te reste 2 jours d'essai. Tu seras prélevé(e) de 4,90 € le 28 mai. [Gérer]"

Dismissible (localStorage 24h).

**Critère** : compte trial à J-2 → bandeau visible. Cliquer Dismiss → bandeau disparait. F5 → toujours absent.

---

# Bloc F — Emails préparés (sans envoyer) (1h)

> Resend sera setup en sprint 11. En sprint 9, on rédige les **templates React Email** mais on ne les envoie pas.

## F1 — `emails/welcome-trial.tsx` (15 min)

Sujet : "Bienvenue dans Carnet de Pêche · Ton essai 7 jours démarre"
Contenu : explication essai, comment annuler, lien `/compte/abonnement`, premier "Logue ta première prise".

## F2 — `emails/trial-day-5.tsx` (15 min)

Sujet : "Plus que 2 jours d'essai — toujours partant ?"
Contenu : rappel + lien annulation Customer Portal.

## F3 — `emails/payment-failed.tsx` (15 min)

Sujet : "On n'a pas pu encaisser ton paiement"
Contenu : lien Customer Portal pour mettre à jour la CB.

## F4 — `emails/subscription-canceled.tsx` (15 min)

Sujet : "Ton abonnement est annulé — à bientôt"
Contenu : "Tu gardes l'accès jusqu'au [date]. Reviens quand tu veux."

**Critère** : 4 templates rendus en `pnpm dlx react-email preview` (port 3001), preview HTML/text propre. Pas de send.

---

# Bloc G — Tests automatisés + Stripe CLI (3h)

## G1 — Tests Vitest `lib/stripe/__tests__/` (2h)

- `pricing.test.ts` — mapping price_id ↔ plan (cf C3, 8 tests)
- `events.test.ts` — chaque handler vs fixture Stripe (cf C4, 12 tests)
  - `handleSubscriptionUpsert` : trial, active, cancel_at_period_end, deleted, idempotence
  - `handleSubscriptionDeleted` : downgrade vers discovery propre
  - `handleInvoicePaymentFailed` : tag past_due, pas de plan change
- `webhook-route.test.ts` — POST avec signature invalide → 400, valide → 200 (mock stripe.webhooks.constructEvent)

**Critère** : `pnpm test` ≥ 183 + 20 = 203 vert.

## G2 — Test E2E manuel Stripe CLI (1h)

À documenter dans `docs/sprint-9/stripe-cli-playbook.md` :

```bash
# 1) Forward webhook
stripe listen --forward-to localhost:3000/api/stripe/webhook
# (note le whsec_xxx imprimé, le coller dans .env.local comme STRIPE_TEST_WEBHOOK_SECRET)

# 2) Trigger les events principaux
stripe trigger customer.subscription.created
stripe trigger customer.subscription.updated
stripe trigger customer.subscription.deleted
stripe trigger invoice.payment_failed

# 3) Flow Checkout complet manuel
# - démarrer pnpm dev
# - login test_disco_29
# - /tarifs → "Essayer Local mensuel"
# - Stripe Checkout → 4242 4242 4242 4242
# - retour /success
# - vérifier en SQL: select * from subscriptions where user_id = '<test_disco_29>' → plan=local, status=trialing
# - attendre 1 min ou trigger manuel : stripe trigger customer.subscription.trial_will_end
# - vérifier en UI : bandeau "Trial bientôt fini" (E5) visible
# - aller dans Customer Portal, annuler
# - vérifier en SQL: cancel_at_period_end=true
```

**Critère** : tout le playbook s'exécute end-to-end sans erreur. Screenshot ou log à chaque étape clé.

---

# Bloc H — Plan de transition seed sprint 8 → vrai Stripe (1.5h)

## H1 — Conserver `supabase/seed_test_accounts.sql` en dev/preview (15 min)

Les 5 comptes seed du sprint 8 (test_disco/local_29/local_56/itin) restent **dans le seed dev/preview only**. Le seed UPDATE direct sur `subscriptions` sans passer par Stripe (cf brief sprint 8 §A0).

**Garde-fou supplémentaire** : ajouter une assertion `current_tier(user_id)` post-seed pour vérifier que l'UPDATE a pris correctement.

**Critère** : `select current_tier(uid) from auth.users where email like 'test_%@carnet.test'` retourne le bon tier.

## H2 — Documenter la non-prolifération seed → prod (15 min)

Ajouter dans `supabase/README.md` :

```markdown
## ⚠️ Seed test accounts — JAMAIS en prod

Le fichier `supabase/seed_test_accounts.sql` (sprint 8) crée 5 comptes test avec des
subscriptions UPDATE-é vers local/itinerant SANS passer par Stripe. C'est exclusivement
pour permettre de tester le tier gating en dev/preview avant que Stripe Checkout
(sprint 9) ne soit câblé.

**Jamais en prod** :
- Ne pas inclure dans `supabase db push` automatique
- En prod, la seule façon d'avoir un tier autre que `discovery` = passer par Stripe
  Checkout → webhook → upsert subscription (cf `app/api/stripe/webhook/route.ts`)
- Si des comptes test traînent en prod (eg après un mauvais run) : SQL pour les
  identifier et purger (cf section "Purge comptes test" plus bas)
```

## H3 — Vérif anti-traîne (en prod) (15 min)

Script SQL one-shot à lancer manuellement en prod avant de merger sprint 9 :

```sql
-- Identifie les comptes test résiduels en prod
select user_id, plan, status, stripe_customer_id, stripe_subscription_id, created_at
from public.subscriptions
where plan in ('local','itinerant')
  and (stripe_customer_id is null or stripe_subscription_id is null);
-- Si non vide : ce sont des comptes test qui ont fui en prod, à supprimer.
```

**Critère** : la query retourne 0 ligne (ou si non, John doit comprendre pourquoi avant de merger).

## H4 — Tests d'intégration tier gating réel (45 min)

Reprendre la checklist QA tier du sprint 8 (`docs/sprint-8/qa-checklist.md`) avec **un parcours en plus** par tier :

- `test_disco_29` → `/tarifs` → "Essayer Local mensuel" → Checkout test card 4242 → trial démarre → vérif tier passe `local` → l'utilisateur peut maintenant poster sur `/fil/29` (qu'il ne pouvait pas avant)
- `test_local_29` (déjà local via seed) → `/compte/abonnement` → "Annuler" Customer Portal → `cancel_at_period_end=true` → tier reste `local` → fin de période → tier retombe `discovery` → l'utilisateur perd l'écriture fil

**Critère** : ces 2 parcours sont passés à la main + documentés avec captures dans `docs/sprint-9/qa-checklist.md`.

---

# Bloc I — Critères de sortie + métriques (30 min)

## I1 — Tests automatisés

- `pnpm test` ≥ 203/203 vert (183 base sprint 8 + 20 nouveaux Stripe)
- `pnpm lint` = 0 erreur
- `pnpm typecheck` = 0 erreur
- CI GitHub Actions verte sur `main`

## I2 — Tests manuels obligatoires (checklist)

À cocher dans `docs/sprint-9/qa-checklist.md` :

**Checkout flow**
- [ ] Discovery FR → `/tarifs` → "Essayer Local mensuel" → Checkout FR + 4,90 € visible + bandeau "Essai 7 jours"
- [ ] Carte test `4242 4242 4242 4242` → success → retour `/compte/abonnement/success` → tier devient `local` en < 5s
- [ ] Carte test decline `4000 0000 0000 9995` → reste sur Stripe Checkout avec message d'erreur
- [ ] Discovery DOM-TOM (974) → `/tarifs` → encart "Outre-mer pas encore couvert", CTAs désactivés
- [ ] Anonymous → `/tarifs` → "Essayer 7 jours" redirige vers `/auth/register?next=/tarifs&plan=...`

**Customer Portal**
- [ ] Local en trial → `/compte/abonnement` → "Gérer mon abonnement" → Customer Portal FR ouvre
- [ ] Changer mensuel → annuel via portal → webhook → DB plan/price_id updated en < 5s
- [ ] Annuler via portal → `cancel_at_period_end=true` → bandeau "Annulation programmée" visible

**Webhook idempotency**
- [ ] Stripe CLI rejoue 2× `customer.subscription.created` → 1 seule ligne en DB
- [ ] Signature invalide → 400 + log warning
- [ ] Event non-géré (`charge.failed`) → 200 + log "ignored", pas de crash

**Trial expiry**
- [ ] User en trial J+8 (forcer en SQL : `update subscriptions set trial_end = now() - interval '1 hour' where user_id = ...`) → webhook `customer.subscription.updated` (passé en `active` par Stripe) → tier reste `local` → 4,90 € prélevé (test mode)
- [ ] Bandeau "Trial bientôt fini" visible à J-2

**RLS sécurité**
- [ ] Logged user A tente `SELECT` direct `subscriptions` d'un user B via Supabase REST → 0 row
- [ ] Logged user A tente `UPDATE subscriptions set plan='itinerant' where user_id = auth.uid()` → 0 row (pas de policy WRITE pour authenticated)

**DOM-TOM blocage**
- [ ] User avec `home_department='974'` qui tente POST direct `/api/stripe/checkout` → 403 "Outre-mer non éligible"

## I3 — Métriques à câbler (Plausible/PostHog setup sprint 11)

Documenter dans `docs/sprint-9/metrics-to-track.md` :
- `pricing_page_viewed` (props: tier, eligible)
- `checkout_started` (props: plan, interval)
- `checkout_completed` (props: plan, interval, trial)
- `checkout_abandoned` (props: plan, interval — événement `customer.subscription.canceled` < 1h après création)
- `subscription_canceled` (props: plan, days_since_creation, in_trial)
- `subscription_payment_failed`
- `customer_portal_opened`
- `trial_will_end_email_dispatched` (sprint 11 quand Resend câblé)

## I4 — Documentation

- [ ] Mettre à jour `CLAUDE.md` §2 : sprint 9 ✅, sprint 10 🔜
- [ ] Mettre à jour `docs/ROADMAP.md` : marquer sprint 9 ✅ + findings éventuels
- [ ] Créer `docs/sprint-9/RECAP.md` (au format des recap précédents)
- [ ] Mettre à jour `CLAUDE.md` §5 (variables d'env Stripe maintenant required en prod)
- [ ] Mettre à jour `CLAUDE.md` §8 — décrocher l'astérisque "Stripe à venir" sur le pricing et noter que Stripe est désormais opérant

## I5 — Backlog post-sprint 9 (à logger dans ROADMAP)

- Coupon `BETA2026` à créer dans Stripe Dashboard avant sprint 11 (50 invités × 6 mois Itinérant)
- Cron de réconciliation Stripe ↔ DB (lit Stripe Subscriptions.list → patch DB) — sprint 11
- Email Resend (4 templates F1-F4 prêts, sending = sprint 11)
- Sentry alertes webhook 5xx (sprint 11)
- A/B test pricing si conversion < 5 % (sprint 22)
- Stripe Connect pour marketplace guides locaux (phase 2)

---

# Estimation totale

| Bloc | Coût estimé |
|---|---|
| 0 — Décisions | 15 min (John) |
| A — Stripe Dashboard + secrets | 2-3h (John pour le dashboard, Claude Code pour env vars + doc) |
| B — DB migration 021 | 2h |
| C — Lib Stripe + refactor tier | 4-5h |
| D — API routes | 4-5h |
| E — UI tarifs + abonnement | 4-5h |
| F — Templates emails | 1h |
| G — Tests + Stripe CLI | 3h |
| H — Transition seed → Stripe | 1.5h |
| I — QA + doc | 1h (hors temps tests manuels) |

**Total Claude Code** : ~23-26h sur 2 semaines = ~2.5-3h/jour, soutenable.
**Total John** : 2-3h compte Stripe (KYC + dashboard config) + 0.25h Bloc 0 + 1h validation tests manuels Bloc I.

---

# Risques et mitigations spécifiques sprint 9

| Risque | Probabilité | Mitigation |
|---|---|---|
| **Désync DB ↔ Stripe** (webhook raté, retry échoué) | Moyenne | Idempotency clé `stripe_subscription_id` + cron de réconciliation prévu sprint 11 |
| **Fausse subscription en prod** (seed dev qui fuite) | Faible | Garde-fou H2/H3, header `-- DEV ONLY` dans seed, vérif SQL anti-traîne avant merge |
| **Mauvais mapping price_id ↔ plan** (typo env var) | Moyenne | Table en dur C3 + tests Vitest 8 cas + assertion runtime au démarrage |
| **Stripe Tax cassé DOM-TOM** | Moyenne | Blocage en amont via `is_eligible_for_paid_tier` (B1), encart UI explicite (E1) |
| **Webhook signature mauvaise** | Faible | `constructEvent` strict + test signature invalide → 400 (G1) |
| **Customer Portal en anglais** | Faible | `portal.session.create({ locale: 'fr' })` + branding Stripe Dashboard FR |
| **User qui souscrit 2× au même plan** | Moyenne | Vérif `current_tier` avant Checkout, redirection Customer Portal si déjà abonné (D1) |
| **Trial qui ne convertit pas → user vexé** | Moyenne | Email J-2 (F2, sending sprint 11), bandeau in-app E5, 1-clic Customer Portal |

---

# Checklist sortie sprint 9 (à valider par John en fin de sprint)

**Bloc 0 — Décisions**
- [ ] Pricing 4,90 € / 9,90 € avec annuel -17 % validé
- [ ] Essai 7j avec CB confirmé
- [ ] DOM-TOM bloqués v1 acté
- [ ] Stripe Tax FR métropole ON

**Bloc A — Dashboard**
- [ ] Compte Stripe Live actif
- [ ] 2 produits × 4 prix créés
- [ ] Webhook endpoint + tous events souscrits
- [ ] 9 env vars Vercel renseignées
- [ ] Stripe CLI installée + testée

**Bloc B — DB**
- [ ] Migration 021 appliquée
- [ ] `current_tier`, `is_eligible_for_paid_tier` testés
- [ ] `lib/types.ts` regen, commit

**Bloc C — Lib**
- [ ] `lib/stripe/client.ts`, `pricing.ts`, `events.ts` + `lib/supabase/service-role.ts`
- [ ] `lib/auth/tier.ts` refactor via RPC
- [ ] 20+ tests Vitest verts

**Bloc D — API**
- [ ] `/api/stripe/checkout` testé carte 4242
- [ ] `/api/stripe/webhook` testé Stripe CLI (sig valide + invalide + replay)
- [ ] `/api/stripe/portal` testé en flow réel

**Bloc E — UI**
- [ ] `/tarifs` CTAs branchés Stripe selon les 4 états (anon/disco FR/local/DOM)
- [ ] `/compte/abonnement` rend les 5 états (trial/active/cancel_scheduled/canceled/past_due)
- [ ] Bandeau "Trial bientôt fini" visible J-2

**Bloc F — Emails**
- [ ] 4 templates React Email rendus en preview (pas envoyés)

**Bloc G — Tests**
- [ ] `pnpm test` ≥ 203/203 vert
- [ ] Playbook Stripe CLI passé end-to-end

**Bloc H — Transition**
- [ ] `supabase/seed_test_accounts.sql` doc-marqué DEV ONLY
- [ ] Vérif prod : 0 ligne `subscriptions` avec plan paid sans stripe_customer_id

**Bloc I — QA + doc**
- [ ] Checklist QA I2 cochée à 100%
- [ ] CI verte
- [ ] CLAUDE.md §2, §5, §8 mis à jour
- [ ] ROADMAP.md sprint 9 ✅
- [ ] `docs/sprint-9/RECAP.md` rédigé

Une fois ces points cochés → sprint 10 (Guides + SEO programmatique).

---

*Brief généré le 2026-05-21. Voir aussi `docs/ROADMAP.md` §"Sprint 9 — Paiements Stripe" et `docs/sprint-8/brief-sprint-8.md` pour le format de référence.*
