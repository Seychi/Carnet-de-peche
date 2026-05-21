-- ============================================================
-- Migration 021 — Sprint 9 : colonnes Stripe + index + helpers tier
-- ============================================================
-- La table subscriptions (migration 001) a déjà : user_id (PK), plan,
-- stripe_customer_id, stripe_subscription_id, status, current_period_end,
-- cancel_at_period_end, trial_end. On AJOUTE les colonnes manquantes pour
-- la réconciliation Stripe + on pose les index de lookup webhook + deux
-- helpers SQL (current_tier, is_eligible_for_paid_tier).
-- Stripe reste la SEULE source d'écriture (RLS interdit l'écriture authenticated).
-- ============================================================

-- 1) Colonnes manquantes (additif, pas de refactor)
alter table public.subscriptions
  add column if not exists stripe_price_id text,
  add column if not exists current_period_start timestamptz,
  add column if not exists latest_invoice_id text,        -- réconciliation factures
  add column if not exists default_payment_method text;   -- pmt method id (pré-remplissage Customer Portal)

-- 2) Index uniques pour le lookup par webhook (partiels : seulement quand non null)
create unique index if not exists subscriptions_stripe_subscription_id_uidx
  on public.subscriptions(stripe_subscription_id)
  where stripe_subscription_id is not null;

create unique index if not exists subscriptions_stripe_customer_id_uidx
  on public.subscriptions(stripe_customer_id)
  where stripe_customer_id is not null;

-- 3) RLS : on reconfirme la policy de lecture (idempotent). Aucune policy
--    INSERT/UPDATE/DELETE → seul service_role écrit (webhook + seed dev).
drop policy if exists "subscriptions_select_own" on public.subscriptions;

create policy "subscriptions_select_own"
  on public.subscriptions for select
  using (user_id = auth.uid());

-- 4) Helper : is_eligible_for_paid_tier
--    false si user en DOM-TOM (Stripe Tax non couvert v1) → bloque l'accès Checkout.
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
--    Source de vérité tier EN LECTURE. Alimenté en upstream uniquement par le
--    webhook Stripe. Retourne 'anonymous' / 'discovery' / 'local' / 'itinerant'.
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
    order by created_at desc
    limit 1
  )
  select case
    when uid is null then 'anonymous'
    when not exists (select 1 from sub) then 'discovery'
    -- Trial actif (trialing + trial_end dans le futur)
    when (select status from sub) = 'trialing'
         and (select trial_end from sub) > now()
      then (select plan from sub)
    -- Abonnement actif avec période courante valide
    when (select status from sub) = 'active'
         and (select current_period_end from sub) > now()
      then (select plan from sub)
    -- Annulation programmée fin de période, mais encore dans la période payée
    when (select status from sub) = 'active'
         and (select cancel_at_period_end from sub) = true
         and (select current_period_end from sub) > now()
      then (select plan from sub)
    -- Tout le reste (past_due, canceled, période expirée…) → discovery
    else 'discovery'
  end;
$$;

comment on function public.current_tier is
  'Source de vérité tier en lecture (lib/auth/tier.ts l''appelle). Le webhook Stripe est le seul à écrire en upstream.';
