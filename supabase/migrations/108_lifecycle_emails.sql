-- ============================================================================
-- 108 — Emails d'activation (sprint 74 « Première valeur en 60 secondes »)
--
-- Objets créés :
--   1) public.lifecycle_emails         — journal de dédup des emails lifecycle
--   2) profiles.weekly_window_optin    — opt-in explicite du créneau hebdo
--
-- SÉCURITÉ
--   - lifecycle_emails : RLS activée, SELECT own uniquement. AUCUNE policy
--     d'écriture → le cron écrit en service-role (bypass RLS), un INSERT par
--     `authenticated` renvoie 42501. Modèle = alerts_sent (106).
--   - Les GRANTS table sont automatiques pour anon/authenticated sur toute
--     nouvelle table du schéma public : la RLS est le SEUL verrou.
--   - RGPD : la FK user_id -> auth.users ON DELETE CASCADE suffit.
--     `delete_my_account` (033) ne liste aucune table, elle fait
--     `delete from auth.users` et s'appuie à 100 % sur les cascades.
--     Aucune modification de la fonction n'est requise (prouvé au S72,
--     docs/sprint-72/research/matrix-106.md test 16).
--
-- ⚠️ NOTE DE SÉCURITÉ HORS PÉRIMÈTRE (à arbitrer par John, PAS corrigé ici) :
--   `profiles.email_unsub_token` est lisible par le rôle `anon` (policy
--   `profiles_select_all` USING true + grant table SELECT). N'importe quel
--   visiteur peut énumérer tous les tokens et désinscrire tout le monde des
--   emails marketing. Trou PRÉ-EXISTANT depuis la 054 (S26), pas introduit ici.
--   Un `revoke select (email_unsub_token) ... from anon` est INOPÉRANT (testé
--   en prod, rollback) : le grant TABLE couvre la colonne. Le correctif réel
--   suit le modèle 028b — `revoke select on public.profiles from anon,
--   authenticated` puis `grant select (<toutes les colonnes sauf le token>)`.
--   Il est volontairement laissé de côté : il impose de re-granter à la main
--   chaque colonne AJOUTÉE plus tard à profiles (piège de maintenance), ce qui
--   dépasse le périmètre de ce sprint. Aucun chemin client ne lit le token
--   (vérifié : lib/email/recipient.ts et unsubscribe/actions.ts passent tous
--   les deux par service-role), donc le verrou ne casserait rien côté app.
--
-- ROLLBACK
--   drop table if exists public.lifecycle_emails;
--   alter table public.profiles drop column if exists weekly_window_optin;
-- ============================================================================

-- ─── 1) lifecycle_emails (journal de dédup) ───────────────────────────

create table public.lifecycle_emails (
  user_id  uuid        not null references auth.users(id) on delete cascade,
  kind     text        not null
    constraint lifecycle_emails_kind_check
    check (kind in ('welcome', 'j1_window', 'j3_import', 'weekly_window')),
  -- 'once' pour les one-shot (welcome / j1 / j3 : une fois À VIE par compte),
  -- clé de semaine ISO ('2026-W32') pour l'hebdo (une fois par semaine).
  sent_key text        not null
    constraint lifecycle_emails_sent_key_check
    check (sent_key = 'once' or sent_key ~ '^\d{4}-W\d{2}$'),
  sent_at  timestamptz not null default now(),
  -- Dédup dure. La PK sert aussi d'index de lecture du cron (filtre user_id).
  primary key (user_id, kind, sent_key)
);

comment on table public.lifecycle_emails is
  'Journal de dédup des emails d''activation (sprint 74). Écrit APRÈS un envoi réussi, en service-role UNIQUEMENT (aucune policy d''écriture → insert authenticated = 42501). sent_key = ''once'' pour welcome/j1_window/j3_import, clé ISO ''YYYY-Www'' pour weekly_window.';

comment on column public.lifecycle_emails.sent_key is
  'Granularité de la dédup : ''once'' = une seule fois par compte à vie ; ''2026-W32'' = une fois par semaine ISO (Europe/Paris).';

-- Pas d'index FK supplémentaire : la seule FK (user_id) est en tête de PK
-- (leçon 097). Pas d'updated_at ni de trigger touch_updated_at : une ligne de
-- journal est immuable (modèle alerts_sent).

alter table public.lifecycle_emails enable row level security;

create policy lifecycle_emails_select_own on public.lifecycle_emails
  for select to authenticated
  using (user_id = (select auth.uid()));

-- AUCUNE policy INSERT/UPDATE/DELETE : le cron écrit en service-role
-- (bypass RLS). RLS fail-closed pour tout le reste.

-- ─── 2) profiles.weekly_window_optin (opt-in hebdo) ───────────────────
-- Opt-in EXPLICITE, défaut OFF (décision RGPD S72 reconduite). Colonne dédiée
-- et PAS une clé de `notification_prefs` : ce jsonb a une sémantique opt-OUT
-- (isNotificationPrefEnabled traite une clé ABSENTE comme activée,
-- lib/notifications/prefs-meta.ts:101) — un opt-in par défaut OFF y serait
-- impossible sans casser la convention partagée émetteurs↔UI. À ne pas
-- confondre avec la pref push `weekly_digest` (S49), qui est un autre objet.
--
-- Visibilité assumée : `profiles` est world-readable (policy
-- profiles_select_all USING true), donc ce booléen est public au même titre
-- que `public_ranking`. Sensibilité jugée nulle (« reçoit un email hebdo »).

alter table public.profiles
  add column if not exists weekly_window_optin boolean not null default false;

comment on column public.profiles.weekly_window_optin is
  'Opt-in explicite au créneau hebdo par email (sprint 74, vendredi matin). Défaut false : jamais d''envoi sans consentement. Coupé aussi par marketing_email_optin = false (kill-switch global) et par le lien /unsubscribe.';
