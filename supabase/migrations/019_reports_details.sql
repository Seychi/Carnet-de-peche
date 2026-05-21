-- ============================================================
-- Migration 019 — Sprint 8 : colonne details sur reports
-- ============================================================
-- La table reports (001) n'a pas de champ pour le texte libre du
-- ReportDialog (E5). reason = catégorie (spam/inapproprie/spot_burning/autre),
-- details = précision optionnelle saisie par le rapporteur.
-- ============================================================

alter table public.reports
  add column if not exists details text check (char_length(details) <= 1000);

comment on column public.reports.details is
  'Texte libre optionnel saisi par le rapporteur (ReportDialog E5). reason = catégorie, details = précision.';
