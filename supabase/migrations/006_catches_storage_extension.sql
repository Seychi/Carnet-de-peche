-- =====================================================================
-- Carnet de Pêche — 006 catches storage extension
-- Nouveaux champs carnet, bucket Storage photos, cache marées WorldTides.
-- Prérequis : 001 → 005 appliquées.
-- =====================================================================

-- ─────────────────────────────────────────────────────────────────────
-- 1. ALTER TABLE catches — colonnes manquantes
-- ─────────────────────────────────────────────────────────────────────
-- Colonnes DÉJÀ présentes (001_init.sql) — ne pas recréer :
--   released, photo_path, notes (max 2000), spot_id, bait (texte libre)
-- On ajoute uniquement les colonnes manquantes.

ALTER TABLE public.catches
  ADD COLUMN IF NOT EXISTS lure_brand          text CHECK (char_length(lure_brand) <= 60),
  ADD COLUMN IF NOT EXISTS lure_model          text CHECK (char_length(lure_model) <= 100),
  ADD COLUMN IF NOT EXISTS bait_type           text,
  -- bait_type ≠ bait : valeurs structurées pour surfcasting
  -- (arenicole | crabe_vert | moule | couteau | encornet | vif_chinchard | autre)
  ADD COLUMN IF NOT EXISTS water_temperature_c numeric(4,1),
  ADD COLUMN IF NOT EXISTS location_method     text NOT NULL DEFAULT 'gps'
    CHECK (location_method IN ('gps', 'manual', 'spot'));

-- released : était nullable avec DEFAULT true dans 001.
-- On le passe à NOT NULL + DEFAULT false (pas relâché par défaut — plus neutre).
ALTER TABLE public.catches
  ALTER COLUMN released SET NOT NULL,
  ALTER COLUMN released SET DEFAULT false;

-- notes : tighten max 2000 → 1000 chars.
-- On cherche dynamiquement le nom de la contrainte auto-générée par Postgres.
DO $$
DECLARE
  v_constraint text;
BEGIN
  SELECT con.conname INTO v_constraint
  FROM pg_constraint con
  JOIN pg_class rel ON rel.oid = con.conrelid
  JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
  WHERE nsp.nspname = 'public'
    AND rel.relname = 'catches'
    AND con.contype = 'c'
    AND pg_get_constraintdef(con.oid) ILIKE '%notes%';

  IF v_constraint IS NOT NULL THEN
    EXECUTE format('ALTER TABLE public.catches DROP CONSTRAINT %I', v_constraint);
  END IF;
END;
$$;

ALTER TABLE public.catches
  ADD CONSTRAINT catches_notes_max_len CHECK (char_length(notes) <= 1000);

-- ─────────────────────────────────────────────────────────────────────
-- 2. Index catches (user_id, caught_at DESC)
-- ─────────────────────────────────────────────────────────────────────
-- Déjà créé dans 003_indexes_views.sql (catches_user_date_idx).
-- Rien à faire.

-- ─────────────────────────────────────────────────────────────────────
-- 3. Bucket Storage "catches" + policies
-- ─────────────────────────────────────────────────────────────────────
-- Structure des chemins attendue : <user_id>/<catch_id>.webp
-- RLS activé par défaut sur storage.objects dans Supabase.

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'catches',
  'catches',
  false,
  5242880,      -- 5 Mo max par fichier
  ARRAY['image/webp', 'image/jpeg', 'image/png']
)
ON CONFLICT (id) DO NOTHING;

-- SELECT : un user lit uniquement ses propres photos
DROP POLICY IF EXISTS "catches_storage_select_own" ON storage.objects;
CREATE POLICY "catches_storage_select_own"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'catches'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- INSERT : upload dans son propre dossier uniquement
DROP POLICY IF EXISTS "catches_storage_insert_own" ON storage.objects;
CREATE POLICY "catches_storage_insert_own"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'catches'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- DELETE : suppression de ses propres photos uniquement
DROP POLICY IF EXISTS "catches_storage_delete_own" ON storage.objects;
CREATE POLICY "catches_storage_delete_own"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'catches'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Pas de policy UPDATE : le frontend remplace via DELETE + INSERT.

-- ─────────────────────────────────────────────────────────────────────
-- 4. conditions_cache — extension pour le cache marées (WorldTides)
-- ─────────────────────────────────────────────────────────────────────
-- La table existante utilise (spot_id, hour) comme PK pour le cache Open-Meteo.
-- On ajoute cache_key (geohash + date) pour le cache WorldTides géographique,
-- qui n'est pas forcément lié à un spot.
-- Format cache_key : geohash4(lat, lng) + '_' + YYYY-MM-DD
--   ex : "gbpu_2026-05-12"

ALTER TABLE public.conditions_cache
  ADD COLUMN IF NOT EXISTS cache_key  text,
  ADD COLUMN IF NOT EXISTS payload    jsonb NOT NULL DEFAULT '{}'::jsonb;

-- Index unique sur cache_key (nullable : UNIQUE ignore les NULL en PG)
CREATE UNIQUE INDEX IF NOT EXISTS conditions_cache_cache_key_idx
  ON public.conditions_cache (cache_key)
  WHERE cache_key IS NOT NULL;

-- Index sur fetched_at (utile pour purger le cache périmé)
CREATE INDEX IF NOT EXISTS conditions_cache_fetched_at_idx
  ON public.conditions_cache (fetched_at);

-- ─────────────────────────────────────────────────────────────────────
-- 5. Vue catches_for_viewer — mise à jour avec les nouvelles colonnes
-- ─────────────────────────────────────────────────────────────────────
-- replay : redéfinition incompatible avec OR REPLACE (colonnes modifiées) — drop préalable (réparation sprint 11, sans effet prod)
DROP VIEW IF EXISTS public.catches_for_viewer;
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
  c.caught_at,
  c.photo_path,
  c.notes,
  c.privacy,
  c.released,
  c.location_method,
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
