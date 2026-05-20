-- =====================================================================
-- Carnet de Pêche — 013 catches scoring columns
-- Colonnes dénormalisées pour le scoring personnalisé (sprint 7).
-- Prérequis : 001 → 012 appliquées.
-- =====================================================================

-- ─────────────────────────────────────────────────────────────────────
-- 1. Colonnes météo dénormalisées sur catches
-- ─────────────────────────────────────────────────────────────────────
-- Ces colonnes dupliquent les valeurs du champ JSONB `conditions`
-- pour permettre des requêtes SQL simples dans lib/scoring/.
-- Toutes nullable : les catches historiques restent à NULL (bucket
-- 'unknown' dans le scoring → contribution neutre).

ALTER TABLE public.catches
  ADD COLUMN IF NOT EXISTS wind_speed_kmh     real,
  ADD COLUMN IF NOT EXISTS wind_direction_deg real,
  ADD COLUMN IF NOT EXISTS tide_state         text
    CHECK (tide_state IN ('rising', 'falling', 'slack'));

-- ─────────────────────────────────────────────────────────────────────
-- 2. location_label manquant dans les migrations précédentes
-- ─────────────────────────────────────────────────────────────────────
-- Utilisé dans CatchForm + actions.ts mais absent de 001_init.sql.

ALTER TABLE public.catches
  ADD COLUMN IF NOT EXISTS location_label text CHECK (char_length(location_label) <= 120);

-- ─────────────────────────────────────────────────────────────────────
-- 3. Vue catches_for_viewer — mise à jour avec les nouvelles colonnes
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
  COALESCE(public.catch_visible_geom(c), c.geom_public) AS geom_visible,
  c.species,
  c.size_cm,
  c.weight_g,
  c.technique,
  c.bait,
  c.bait_type,
  c.lure_brand,
  c.lure_model,
  c.water_temperature_c,
  c.wind_speed_kmh,
  c.wind_direction_deg,
  c.tide_state,
  c.caught_at,
  c.photo_path,
  c.notes,
  c.privacy,
  c.released,
  c.location_method,
  c.location_label,
  c.created_at
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
