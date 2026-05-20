-- =====================================================================
-- Carnet de Pêche — 016 get_spots_for_scoring
-- RPC dédiée au cron de pré-calcul des scores (sprint 7 phase 4B).
-- Retourne les coordonnées PRÉCISES (lng/lat) des spots publics.
--
-- ⚠️ Sécurité : ces coords précises sont normalement payantes (cf. floutage
--    GPS). La fonction est donc RÉVOQUÉE de public/anon/authenticated et
--    accessible UNIQUEMENT au service_role (le cron). security definer pour
--    lire geom indépendamment de la RLS.
-- Prérequis : 001 → 015 appliquées.
-- =====================================================================

CREATE OR REPLACE FUNCTION public.get_spots_for_scoring()
RETURNS TABLE (
  id  uuid,
  lng double precision,
  lat double precision
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    s.id,
    ST_X(s.geom::geometry) AS lng,
    ST_Y(s.geom::geometry) AS lat
  FROM public.spots s
  WHERE s.visibility = 'public'
    AND s.geom IS NOT NULL
  ORDER BY s.id;
$$;

-- Verrouillage : seul le service_role (cron) peut exécuter (coords précises).
REVOKE ALL ON FUNCTION public.get_spots_for_scoring() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_spots_for_scoring() TO service_role;
