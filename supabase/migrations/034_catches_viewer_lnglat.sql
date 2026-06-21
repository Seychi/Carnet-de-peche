-- =====================================================================
-- Carnet de Pêche — 034 : lng/lat sur catches_for_viewer (sprint 12, Bloc A)
-- =====================================================================
-- But : exposer deux colonnes numériques lng/lat DÉRIVÉES de geom_visible,
-- pour pouvoir brancher une mini-carte sur la fiche prise (/carnet/[id])
-- sans jamais lire geom (précis brut).
--
-- ⚠️ SÉCURITÉ : geom_visible encode DÉJÀ la précision à laquelle le viewer a
-- droit (catch_visible_geom() floute pour les non-amis / le public, point
-- précis pour le propriétaire et les amis autorisés). lng/lat ne révèlent donc
-- rien de plus que geom_visible, qui était déjà exposé. On ne touche PAS geom.
--
-- Forme : on ne peut pas référencer l'alias `geom_visible` dans la même liste
-- SELECT → on enveloppe le corps EXACT de la 015 dans une sous-requête `v`,
-- puis on ajoute lng/lat = st_x/st_y(v.geom_visible::geometry). Le reste des
-- colonnes est conservé À L'IDENTIQUE (même ordre, mêmes noms) via `v.*`.
--
-- security_invoker : un CREATE OR REPLACE qui change la liste de colonnes
-- impose un DROP préalable → l'option security_invoker (posée en 031) est
-- perdue à la recréation. On la RÉ-AFFIRME explicitement en fin de migration.
--
-- RLS : aucune table touchée, aucune policy modifiée. Append-only.
-- ROLLBACK : revenir à la définition de 015 (sans lng/lat) + re-set
--            security_invoker = true.
-- =====================================================================

DROP VIEW IF EXISTS public.catches_for_viewer;

CREATE VIEW public.catches_for_viewer AS
SELECT
  v.*,
  ST_X(v.geom_visible::geometry) AS lng,
  ST_Y(v.geom_visible::geometry) AS lat
FROM (
  SELECT
    c.id,
    c.user_id,
    p.username,
    p.display_name,
    p.avatar_url,
    c.spot_id,
    s.name               AS spot_name,
    s.department,
    COALESCE(public.catch_visible_geom(c.*), c.geom_public) AS geom_visible,
    c.species,
    c.size_cm,
    c.weight_g,
    c.technique,
    c.bait,
    c.caught_at,
    c.photo_path,
    c.notes,
    c.privacy,
    c.released,
    c.created_at,
    c.bait_type,
    c.lure_brand,
    c.lure_model,
    c.water_temperature_c,
    c.location_method,
    c.location_label,
    c.conditions,
    c.precise_for_friends,
    c.reveal_precise_to_public,
    c.wind_speed_kmh,
    c.wind_direction_deg,
    c.tide_state
  FROM public.catches c
  JOIN public.profiles p ON p.id = c.user_id
  LEFT JOIN public.spots s ON s.id = c.spot_id
  WHERE
    c.user_id = auth.uid()
    OR c.privacy = 'public'
    OR (
      c.privacy = 'friends'
      AND EXISTS (
        SELECT 1 FROM public.follows
        WHERE follower_id = auth.uid() AND following_id = c.user_id
      )
    )
) v;

-- Re-affirme l'option posée en 031 (perdue par le DROP/CREATE).
ALTER VIEW public.catches_for_viewer SET (security_invoker = true);

COMMENT ON VIEW public.catches_for_viewer IS
  'Prises visibles par le viewer (floutage geom déjà appliqué par catch_visible_geom). security_invoker=true (031). lng/lat (034) = st_x/st_y de geom_visible : même précision que geom_visible, ne révèle pas geom. Toujours lire cette vue, jamais la table catches.';
