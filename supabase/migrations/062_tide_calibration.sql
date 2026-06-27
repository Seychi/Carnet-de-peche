-- 062_tide_calibration.sql — Sprint 38, WS-E (marées vérifiées port par port).
--
-- But : matérialiser notre rigueur marées en argument anti-Fishing Grid (qui a des
-- marées imprécises). On audite les heures PM/BM dérivées (Open-Meteo Marine) vs
-- SHOM sur des ports étalon par façade, et on STOCKE le résultat mesuré + daté, pour
-- l'afficher honnêtement sur la fiche spot (« écart médian N min vs SHOM, audité le
-- JJ/MM »). Décision John D3 = AFFICHER la précision mesurée seulement (PAS d'offset
-- appliqué en prod) → tide_coefficient reste null partout, aucune heure n'est corrigée.
--
-- Sécurité : RLS activée, SELECT public (la précision marées n'est pas sensible et la
-- fiche spot est consultable hors connexion). Aucune policy d'écriture → seed/maj via
-- service-role uniquement (modèle weather_cache 045). Aucune coordonnée de spot privée
-- ici : seulement des ports de référence publics (ports SHOM).
--
-- Migration APPLIQUÉE en prod via apply_migration. Le SEED des valeurs mesurées
-- (verify-tides) est inséré séparément en service-role une fois l'audit figé + daté.

create table public.tide_calibration (
  id               uuid        primary key default gen_random_uuid(),
  port             text        not null unique,
  lat              double precision,
  lng              double precision,
  -- 'manche' | 'atlantique' | 'mediterranee'
  facade           text,
  -- écart médian absolu mesuré (minutes) entre PM/BM dérivés et SHOM.
  median_error_min real,
  -- biais signé moyen (minutes) : positif = on est en retard sur SHOM.
  bias_min         real,
  -- fenêtre d'échantillonnage de l'audit (ex. '30 jours · 2026-06').
  sample_window    text,
  verified_at      timestamptz,
  -- provenance (ex. 'SHOM Géoservices vs Open-Meteo Marine').
  source           text,
  created_at       timestamptz not null default now()
);

comment on table public.tide_calibration is
  'Calibration marées par port de référence (sprint 38). Audit PM/BM dérivés vs SHOM, écart médian + biais signé, daté. RLS : SELECT public, écriture service-role (seed). Affichage honnête sur la fiche spot. Aucun offset appliqué en prod (D3 v1) ni coef inventé.';

create index tide_calibration_facade_idx on public.tide_calibration (facade);

-- ─── RLS fail-closed ──────────────────────────────────────────────────────────
alter table public.tide_calibration enable row level security;

create policy tide_calibration_select_public on public.tide_calibration
  for select to anon, authenticated
  using (true);

-- Pas de policy INSERT/UPDATE/DELETE : seed/maj réservés au service-role.
