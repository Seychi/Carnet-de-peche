-- 065_push_subscriptions.sql — Sprint 39, WS-A (canal Web Push F4).
--
-- But : stocker les abonnements Web Push (endpoint + clés p256dh/auth) d'un user, pour
-- pouvoir lui envoyer une notification push (créneau optimal perso) en plus de la notif
-- in-app déjà produite par le cron `personal-window`. L'ENVOI se fait en service-role
-- (bypass RLS, serveur/Node uniquement, comme le cron), donc pas de policy d'envoi.
--
-- Invariants : RLS owner-only (un user ne lit/écrit que SES abonnements, modèle
-- 051_outings) ; opt-in strict (l'insert vient d'un geste utilisateur côté client) ;
-- aucune donnée sensible (endpoint = URL du push service, clés publiques d'abonnement).
--
-- ⚠️ Numérotation : le brief disait 063, mais 063/064 ont été pris au sprint 38
-- (outing_id sur la vue, residual marées) → cette migration est la 065.
--
-- Migration APPLIQUÉE en prod via apply_migration. Régénérer lib/types.ts ensuite.

create table public.push_subscriptions (
  id         uuid        primary key default gen_random_uuid(),
  user_id    uuid        not null references auth.users(id) on delete cascade,
  -- endpoint = URL unique du push service (FCM/Mozilla/WNS...) pour CE device+navigateur.
  endpoint   text        not null unique,
  -- clés d'abonnement (chiffrement du payload) renvoyées par pushManager.subscribe.
  p256dh     text        not null,
  auth       text        not null,
  ua         text,
  created_at timestamptz not null default now()
);

comment on table public.push_subscriptions is
  'Abonnements Web Push (sprint 39). Un endpoint par device+navigateur. RLS owner-only (lecture/écriture/suppression). L''envoi se fait en service-role (cron). Un abonnement mort (404/410) est purgé par l''util d''envoi.';

create index push_subscriptions_user_idx on public.push_subscriptions (user_id);

-- ─── RLS fail-closed (activée AVANT toute policy) ─────────────────────────────
alter table public.push_subscriptions enable row level security;

create policy push_subscriptions_select_own on public.push_subscriptions
  for select to authenticated
  using (user_id = (select auth.uid()));

create policy push_subscriptions_insert_own on public.push_subscriptions
  for insert to authenticated
  with check (user_id = (select auth.uid()));

-- UPDATE own : permet à un device de rafraîchir ses clés (upsert on conflict endpoint)
-- sans jamais toucher l'abonnement d'autrui (using + with check pin user_id = auth.uid()).
create policy push_subscriptions_update_own on public.push_subscriptions
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy push_subscriptions_delete_own on public.push_subscriptions
  for delete to authenticated
  using (user_id = (select auth.uid()));
