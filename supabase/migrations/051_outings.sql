-- 051_outings.sql — Sprint 25, WS-B (log de la bredouille).
-- Permet de loguer « je suis sorti, 0 prise ». Fonde le DÉNOMINATEUR manquant du
-- futur scoring prédictif (déferral 7.5) SANS polluer catches/heatmap/feed/scoring.
--
-- Invariants : RLS fail-closed (un user ne lit/écrit que SES sorties), AUCUN geom
-- précis exposé (une sortie n'a pas de coordonnée — juste un département + label).

-- ─── Table outings ────────────────────────────────────────────────────────────
CREATE TABLE public.outings (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  started_at       timestamptz NOT NULL,
  ended_at         timestamptz,
  -- Département côtier (code INSEE, ex. '29', '2A'). Pas de geom : une sortie ne
  -- porte JAMAIS de coordonnée précise (anti spot-burning, cohérent floutage 3 couches).
  department       text        NOT NULL,
  -- Rattachement optionnel à un spot curé (pour relier, pas pour exposer du geom).
  spot_id          uuid        REFERENCES public.spots(id) ON DELETE SET NULL,
  technique        text,
  species_targeted text[],
  notes            text        CHECK (notes IS NULL OR char_length(notes) <= 1000),
  created_at       timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.outings IS
  'Sorties de pêche (y compris bredouilles, 0 prise). Dénominateur du futur scoring prédictif. RLS : strictement privé au propriétaire. Aucune coordonnée précise (département seulement).';

CREATE INDEX outings_user_started_idx ON public.outings (user_id, started_at DESC);

-- ─── RLS fail-closed (activée AVANT toute policy) ─────────────────────────────
ALTER TABLE public.outings ENABLE ROW LEVEL SECURITY;

CREATE POLICY outings_select_own ON public.outings
  FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()));

CREATE POLICY outings_insert_own ON public.outings
  FOR INSERT TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY outings_update_own ON public.outings
  FOR UPDATE TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY outings_delete_own ON public.outings
  FOR DELETE TO authenticated
  USING (user_id = (SELECT auth.uid()));

-- ─── Lien prise ↔ sortie (append-only, nullable) ──────────────────────────────
-- Une prise PEUT être rattachée à une sortie (pour calculer prises/sortie et
-- % bredouille). Nullable : les prises historiques n'ont pas de sortie. ON DELETE
-- SET NULL : supprimer une sortie ne supprime jamais une prise.
ALTER TABLE public.catches
  ADD COLUMN IF NOT EXISTS outing_id uuid REFERENCES public.outings(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS catches_outing_idx ON public.catches (outing_id);

-- ─── RPC stats sorties (NE modifie PAS 007/008) ───────────────────────────────
-- SECURITY DEFINER + filtre explicite auth.uid() : ne lit que les sorties du
-- demandeur. Renvoie total, nombre/taux de bredouilles, prises/sortie.
CREATE OR REPLACE FUNCTION public.get_my_outing_stats()
RETURNS json
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH my AS (
    SELECT o.id,
           (SELECT count(*) FROM public.catches c WHERE c.outing_id = o.id) AS nb
    FROM public.outings o
    WHERE o.user_id = auth.uid()
  )
  SELECT json_build_object(
    'totalOutings', (SELECT count(*) FROM my),
    'blankOutings', (SELECT count(*) FROM my WHERE nb = 0),
    'blankRate', CASE WHEN (SELECT count(*) FROM my) = 0 THEN 0
                 ELSE round(100.0 * (SELECT count(*) FROM my WHERE nb = 0) / (SELECT count(*) FROM my)) END,
    'catchesPerOuting', CASE WHEN (SELECT count(*) FROM my) = 0 THEN 0
                        ELSE round((SELECT coalesce(sum(nb), 0) FROM my)::numeric / (SELECT count(*) FROM my), 2) END
  );
$$;

COMMENT ON FUNCTION public.get_my_outing_stats() IS
  'Stats sorties du demandeur (auth.uid()) : total, bredouilles, % bredouille, prises/sortie. Ne touche pas get_my_catch_stats (007).';

REVOKE ALL ON FUNCTION public.get_my_outing_stats() FROM public, anon;
GRANT EXECUTE ON FUNCTION public.get_my_outing_stats() TO authenticated;
