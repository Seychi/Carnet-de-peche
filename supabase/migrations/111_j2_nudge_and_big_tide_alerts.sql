-- ============================================================================
-- 111 — Relance J+2 « aucune prise » + alerte grande marée sur spot favori
-- Sprint 77 : Bloc 8 tâche 4 (lifecycle J+2) et Bloc 10 tâche 2 (alerte spot).
--
-- Objets touchés :
--   1) lifecycle_emails_kind_check  — + 'j2_first_catch' (relance J+2, one-shot)
--   2) alert_settings.big_tide_alert_enabled — opt-in EXPLICITE, défaut false
--   3) public.big_tide_alerts_sent  — journal de dédup dédié aux alertes marée
--
-- POURQUOI UN JOURNAL DÉDIÉ ET PAS `alerts_sent` (106) :
--   `alerts_sent` porte `score smallint NOT NULL check (0..100)` et son `kind`
--   est lu tel quel par components/home/NextAlertWindow.tsx, qui rend un
--   ScoreRing et la copie « pas encore assez de prises loguées ». Une alerte
--   grande marée n'a PAS de score de fenêtre : y écrire un 0 serait un chiffre
--   fabriqué (interdit, CLAUDE.md §8) et la carte /home mentirait. On journalise
--   donc ce qui est réellement mesuré : le marnage (m) et le seuil de façade.
--
-- HONNÊTETÉ DES DONNÉES (invariant projet, re-vérifié au S72) :
--   Le repo ne calcule AUCUN coefficient de marée (`tide_coefficient` est
--   toujours null côté Open-Meteo). Le déclencheur est le MARNAGE MESURÉ du
--   jour (max PM - min BM, dérivé de sea_level_height_msl) comparé au seuil de
--   façade du sprint 49 : Manche > 9 m, Atlantique > 5 m, Méditerranée/Corse
--   jamais (marnage météo-dominé). Les colonnes ci-dessous stockent ces deux
--   valeurs telles quelles, jamais un coefficient.
--
-- SÉCURITÉ :
--   - big_tide_alerts_sent : RLS activée, SELECT own uniquement, AUCUNE policy
--     d'écriture → le moteur écrit en service-role (bypass RLS), un INSERT par
--     `authenticated` renvoie 42501. Modèle = alerts_sent (106) / lifecycle_emails (108).
--   - Aucune coordonnée n'entre ici : on référence le spot par son uuid.
--   - RGPD : FK user_id -> auth.users ON DELETE CASCADE ; `delete_my_account`
--     (033) fait `delete from auth.users` et s'appuie à 100 % sur les cascades,
--     aucune modification de la fonction n'est requise.
--   - big_tide_alert_enabled : opt-in explicite, défaut FALSE. Aucun compte
--     existant ne commence à recevoir quoi que ce soit du fait de cette migration.
--
-- PAS DE GATING DE TIER sur l'alerte grande marée (décision alignée sur le
-- greffon big_tide du S49, décision John D1) : c'est un signal MESURÉ, pas le
-- moat perso. Le bénéfice payant reste l'alerte PERSONNALISÉE (S72), qui elle
-- reste gatée Local/Itinérant par `alerts_enabled` + current_tier dans le moteur.
--
-- ROLLBACK :
--   drop table if exists public.big_tide_alerts_sent;
--   alter table public.alert_settings drop column if exists big_tide_alert_enabled;
--   alter table public.lifecycle_emails drop constraint lifecycle_emails_kind_check;
--   alter table public.lifecycle_emails add constraint lifecycle_emails_kind_check
--     check (kind in ('welcome','j1_window','j3_import','weekly_window'));
-- ============================================================================

-- ─── 1) lifecycle_emails : + 'j2_first_catch' ─────────────────────────────────
-- Superset strict de la liste actuelle → les lignes existantes satisfont déjà le
-- nouveau CHECK, pas besoin de NOT VALID.

alter table public.lifecycle_emails drop constraint lifecycle_emails_kind_check;

alter table public.lifecycle_emails add constraint lifecycle_emails_kind_check
  check (kind in ('welcome', 'j1_window', 'j2_first_catch', 'j3_import', 'weekly_window'));

comment on column public.lifecycle_emails.kind is
  'Type d''email d''activation. j2_first_catch (sprint 77) = relance à J+2 des comptes sans aucune prise, sent_key = ''once'' (jamais deux fois au même compte).';

-- ─── 2) alert_settings.big_tide_alert_enabled ─────────────────────────────────

alter table public.alert_settings
  add column if not exists big_tide_alert_enabled boolean not null default false;

comment on column public.alert_settings.big_tide_alert_enabled is
  'Opt-in explicite (sprint 77) à l''alerte grande marée sur les spots favoris. Défaut false : jamais d''envoi sans consentement. Ouvert à TOUS les tiers (le signal est un marnage mesuré, pas le scoring perso payant). Coupé aussi par marketing_email_optin = false (kill-switch global) et par /unsubscribe pour le canal email.';

-- ─── 3) big_tide_alerts_sent (journal de dédup dédié) ─────────────────────────

create table public.big_tide_alerts_sent (
  user_id     uuid        not null references auth.users(id)   on delete cascade,
  spot_id     uuid        not null references public.spots(id) on delete cascade,
  window_date date        not null,
  -- Marnage MESURÉ du jour annoncé (m) et seuil de façade franchi (m).
  -- JAMAIS un coefficient : le repo n'en calcule aucun.
  range_m     real        not null
    constraint big_tide_alerts_sent_range_check check (range_m >= 0 and range_m <= 25),
  threshold_m real        not null
    constraint big_tide_alerts_sent_threshold_check check (threshold_m >= 0 and threshold_m <= 25),
  sent_at     timestamptz not null default now(),
  -- Dédup dure : max 1 alerte marée par (user, spot, date annoncée). Sert aussi
  -- de détection d'ÉPISODE : le moteur refuse d'alerter pour J+1 si une ligne
  -- existe déjà pour J (grande marée = 3-4 jours d'affilée, un seul email).
  primary key (user_id, spot_id, window_date)
);

comment on table public.big_tide_alerts_sent is
  'Journal de dédup des alertes grande marée sur spot favori (sprint 77). Écrit APRÈS le 1er canal réussi, en service-role UNIQUEMENT (aucune policy d''écriture → insert authenticated = 42501). window_date = jour Paris annoncé (le lendemain du calcul). Une ligne pour J bloque l''alerte pour J+1 sur le même spot : un épisode de grande marée = un seul email.';

-- FK spot_id couverte (leçon 097) : la PK commence par user_id.
create index big_tide_alerts_sent_spot_idx on public.big_tide_alerts_sent (spot_id);

alter table public.big_tide_alerts_sent enable row level security;

create policy big_tide_alerts_sent_select_own on public.big_tide_alerts_sent
  for select to authenticated
  using (user_id = (select auth.uid()));

-- AUCUNE policy INSERT/UPDATE/DELETE : le moteur écrit en service-role.
