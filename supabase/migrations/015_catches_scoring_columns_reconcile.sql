-- =====================================================================
-- Carnet de Pêche — 015 catches scoring columns (réconciliation)
-- La 013 n'a jamais été appliquée au remote, et la vue catches_for_viewer
-- a divergé côté remote (migration `catches_for_viewer_add_conditions_privacy`
-- sans fichier local → colonnes conditions/precise_for_friends/
-- reveal_precise_to_public ajoutées à la vue).
--
-- Cette migration réconcilie de façon NON destructive :
--   1. ajoute les 3 colonnes de scoring (IF NOT EXISTS) ;
--   2. recrée catches_for_viewer en SUR-ENSEMBLE (toutes les colonnes
--      remote existantes, dans le même ordre, + les 3 nouvelles en fin).
--
-- ⚠️ Ne JAMAIS appliquer 013 au remote : sa définition de vue est un
--    sous-ensemble obsolète qui retirerait conditions/precise_for_friends/
--    reveal_precise_to_public. 015 la remplace.
-- Prérequis : 001 → 012 + migrations remote `catches_location_label` et
--    `catches_for_viewer_add_conditions_privacy` appliquées.
-- =====================================================================

-- ─────────────────────────────────────────────────────────────────────
-- 1. Colonnes météo dénormalisées sur catches (scoring perso sprint 7)
-- ─────────────────────────────────────────────────────────────────────

ALTER TABLE public.catches
  ADD COLUMN IF NOT EXISTS wind_speed_kmh     real,
  ADD COLUMN IF NOT EXISTS wind_direction_deg real,
  ADD COLUMN IF NOT EXISTS tide_state         text
    CHECK (tide_state IN ('rising', 'falling', 'slack'));

-- ─────────────────────────────────────────────────────────────────────
-- 2. catches_for_viewer — sur-ensemble (append-only, rien retiré)
-- ─────────────────────────────────────────────────────────────────────

CREATE OR REPLACE VIEW public.catches_for_viewer AS
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
  );
