-- =====================================================================
-- Carnet de Pêche — 014 spot_scores
-- Table de cache des scores de qualité par spot, pré-calculés par un
-- cron Edge Function (sprint 7 phase 4). Lecture publique, écriture
-- réservée au service role.
-- Prérequis : 001 → 013 appliquées.
-- =====================================================================

-- ─────────────────────────────────────────────────────────────────────
-- 1. Table spot_scores (une ligne par spot, upsert)
-- ─────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.spot_scores (
  id                  uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  spot_id             uuid NOT NULL REFERENCES public.spots(id) ON DELETE CASCADE,
  computed_at         timestamptz NOT NULL DEFAULT now(),
  valid_until         timestamptz NOT NULL,
  current_score       integer NOT NULL CHECK (current_score BETWEEN 0 AND 100),
  current_quality     text NOT NULL CHECK (current_quality IN ('faible','moyenne','bonne','tres_bonne','exceptionnelle')),
  next_window_start   timestamptz,
  next_window_quality text,
  day_score           integer CHECK (day_score BETWEEN 0 AND 100),

  UNIQUE (spot_id)
);

-- ─────────────────────────────────────────────────────────────────────
-- 2. Index de lecture
-- ─────────────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS spot_scores_spot_id_idx     ON public.spot_scores(spot_id);
CREATE INDEX IF NOT EXISTS spot_scores_valid_until_idx ON public.spot_scores(valid_until);

-- ─────────────────────────────────────────────────────────────────────
-- 3. RLS : lecture publique, écriture service role uniquement
-- ─────────────────────────────────────────────────────────────────────
-- Les scores sont publics (affichés sur la carte pour tous).
-- Aucune policy INSERT/UPDATE/DELETE : seul le cron via service role
-- (qui bypass RLS) peut écrire.

ALTER TABLE public.spot_scores ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "spot_scores_read_all" ON public.spot_scores;
CREATE POLICY "spot_scores_read_all"
  ON public.spot_scores
  FOR SELECT
  USING (true);
