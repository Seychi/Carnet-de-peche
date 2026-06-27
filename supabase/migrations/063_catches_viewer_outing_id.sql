-- 063_catches_viewer_outing_id.sql — Sprint 38, fix WS-A (carte de sortie).
--
-- Pourquoi : la carte « sortie » (kind='outing') doit agréger les prises rattachées
-- à une sortie. Or `catches.outing_id` (ajoutée en 051, APRÈS le verrou colonne 041)
-- n'a PAS de SELECT pour anon/authenticated → une lecture directe `where outing_id=…`
-- échoue (« permission denied for column outing_id »). Et l'invariant projet impose
-- de lire les prises TOUJOURS via `catches_for_viewer` (jamais la table).
--
-- Fix : exposer `outing_id` dans la vue (append-only, exactement comme gear_id en 059)
-- → la server action lit le groupage de sortie via la vue (DEFINER, owner-scopée par le
-- WHERE de la vue), sans toucher la table ni ouvrir de grant colonne.
--
-- ⚠️ outing_id est un uuid de GROUPAGE, pas une coordonnée : aucun risque geom.
-- ⚠️ La vue reste SECURITY DEFINER (041/047, D-2 assumé) : append-only, on conserve
--    les 36 colonnes existantes (015 → 034 lng/lat → 059 gear) à l'identique et on
--    AJOUTE outing_id EN FIN → CREATE OR REPLACE autorisé, pas de DROP CASCADE.
--
-- Migration APPLIQUÉE en prod via apply_migration. Régénérer lib/types.ts ensuite.

CREATE OR REPLACE VIEW public.catches_for_viewer AS
SELECT
  v.id, v.user_id, v.username, v.display_name, v.avatar_url, v.spot_id, v.spot_name,
  v.department, v.geom_visible, v.species, v.size_cm, v.weight_g, v.technique, v.bait,
  v.caught_at, v.photo_path, v.notes, v.privacy, v.released, v.created_at, v.bait_type,
  v.lure_brand, v.lure_model, v.water_temperature_c, v.location_method, v.location_label,
  v.conditions, v.precise_for_friends, v.reveal_precise_to_public, v.wind_speed_kmh,
  v.wind_direction_deg, v.tide_state,
  ST_X(v.geom_visible::geometry) AS lng,
  ST_Y(v.geom_visible::geometry) AS lat,
  v.gear_id,
  v.gear_label,
  v.outing_id
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
    c.tide_state,
    c.gear_id,
    NULLIF(btrim(concat_ws(' ', gi.brand, gi.model, gi.color)), '') AS gear_label,
    c.outing_id
  FROM public.catches c
  JOIN public.profiles p ON p.id = c.user_id
  LEFT JOIN public.spots s ON s.id = c.spot_id
  LEFT JOIN public.gear_items gi ON gi.id = c.gear_id
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

-- Re-affirme le DEFINER volontaire (041) — préservé par CREATE OR REPLACE.
ALTER VIEW public.catches_for_viewer SET (security_invoker = false);

COMMENT ON VIEW public.catches_for_viewer IS
  'Prises visibles par le viewer (floutage geom par catch_visible_geom). SECURITY DEFINER VOLONTAIRE (041). lng/lat (034). gear_id+gear_label (059). outing_id (063) = groupage de sortie pour la carte de partage, uuid non géo. Toujours lire cette vue, jamais la table catches.';
