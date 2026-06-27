-- 059_catch_gear.sql — Sprint 37, WS-A (« le matériel qui parle », F1).
--
-- But : créer la BOÎTE À MATÉRIEL personnelle structurée (leurres / montages /
-- appâts) et la rattacher aux prises, pour faire émerger un 6ᵉ facteur de
-- tendance perso « leurre » (« ton shad chartreuse sort 60 % de tes bars ») et
-- alimenter la page /carnet/boite, SANS casser la saisie texte legacy
-- (lure_brand / lure_model / bait_type / bait restent en place et lus par le scoring).
--
-- Invariants : RLS fail-closed (un user ne lit/écrit que SON matériel, modèle
-- owner-only de 051_outings) ; AUCUN geom touché ; catches_for_viewer reste
-- SECURITY DEFINER (verrou colonne geom 041 — cf §3 ci-dessous). Le moat (boîte
-- + tendances) est GRATUIT, jamais derrière un paywall.
--
-- Migration APPLIQUÉE en prod via apply_migration. Régénérer lib/types.ts ensuite.

-- ─── 1. Table gear_items (boîte à matériel, owner-only) ───────────────────────
CREATE TABLE public.gear_items (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  -- v1 : leurres d'abord (décision John D2). PAS de canne/moulinet/ligne.
  kind       text        NOT NULL CHECK (kind IN ('leurre', 'montage', 'appat')),
  brand      text,
  model      text,
  color      text,
  size_mm    smallint,
  notes      text        CHECK (notes IS NULL OR char_length(notes) <= 1000),
  archived   boolean     NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.gear_items IS
  'Boîte à matériel perso (leurres / montages / appâts). RLS owner-only. Rattachée aux prises via catches.gear_id. Fonde le facteur de tendance « leurre » (scoring perso descriptif) et la page /carnet/boite. Aucune comparaison entre pêcheurs.';

-- Index partiel : on ne liste que le matériel actif (non archivé) dans le picker / la boîte.
CREATE INDEX gear_items_user_idx ON public.gear_items (user_id) WHERE NOT archived;

-- ─── 2. RLS fail-closed (activée AVANT toute policy) ──────────────────────────
ALTER TABLE public.gear_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY gear_items_select_own ON public.gear_items
  FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()));

CREATE POLICY gear_items_insert_own ON public.gear_items
  FOR INSERT TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY gear_items_update_own ON public.gear_items
  FOR UPDATE TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY gear_items_delete_own ON public.gear_items
  FOR DELETE TO authenticated
  USING (user_id = (SELECT auth.uid()));

-- ─── 3. Lien prise ↔ matériel (nullable, ON DELETE SET NULL) ──────────────────
-- Nullable : les prises historiques + la saisie texte one-shot n'ont pas de
-- gear_id. SET NULL : archiver/supprimer un item ne supprime jamais une prise.
ALTER TABLE public.catches
  ADD COLUMN IF NOT EXISTS gear_id uuid REFERENCES public.gear_items(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS catches_gear_id_idx ON public.catches (gear_id);

-- ─── 4. catches_for_viewer : exposer gear_id + gear_label dénormalisé ─────────
-- ⚠️ On REPREND la définition COMPLÈTE courante (015 → 034 lng/lat) et on
-- AJOUTE gear_id + gear_label EN FIN de liste (après lng/lat) → CREATE OR REPLACE
-- autorisé (colonnes existantes inchangées, append-only) → PAS de DROP CASCADE
-- (feed_posts_for_viewer dépend de cette vue, cf 034).
-- gear_label = libellé lisible (marque modèle couleur). Exposé seulement sur les
-- prises que le viewer voit déjà (own/public/friends) — même surface que
-- lure_brand/lure_model déjà publics ici. La table gear_items elle-même reste
-- privée (RLS owner-only) : seule cette chaîne dérivée transite par la vue.
-- ⚠️ La vue reste SECURITY DEFINER (041 / 047 §3, D-2 assumé) : la colonne
-- catches.geom est révoquée à anon/authenticated → une vue invoker casserait.
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
  v.gear_label
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
    NULLIF(btrim(concat_ws(' ', gi.brand, gi.model, gi.color)), '') AS gear_label
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

-- Re-affirme le DEFINER volontaire posé en 041 (préservé par CREATE OR REPLACE,
-- ré-affirmé par sécurité — même discipline que 034).
ALTER VIEW public.catches_for_viewer SET (security_invoker = false);

COMMENT ON VIEW public.catches_for_viewer IS
  'Prises visibles par le viewer (floutage geom appliqué par catch_visible_geom). SECURITY DEFINER VOLONTAIRE depuis 041 (colonne catches.geom révoquée à anon/authenticated → une vue invoker casserait ; le WHERE mirrore les policies). lng/lat (034) = st_x/st_y de geom_visible. gear_id + gear_label (059) = matériel rattaché, libellé dénormalisé (marque modèle couleur), exposé seulement sur les prises déjà visibles. Toujours lire cette vue, jamais la table catches.';

-- ─── 5. Backfill best-effort (non bloquant, idempotent) ───────────────────────
-- Matérialise les leurres saisis en texte (lure_brand / lure_model) en gear_items
-- (kind='leurre', un par user × valeur distincte) et rattache les prises. Idempotent :
-- ne duplique pas un item déjà présent, ne réécrase pas un gear_id déjà posé.
WITH distinct_lures AS (
  SELECT DISTINCT
    c.user_id,
    NULLIF(btrim(c.lure_brand), '') AS brand,
    NULLIF(btrim(c.lure_model), '') AS model
  FROM public.catches c
  WHERE c.gear_id IS NULL
    AND (NULLIF(btrim(c.lure_brand), '') IS NOT NULL
      OR NULLIF(btrim(c.lure_model), '') IS NOT NULL)
)
INSERT INTO public.gear_items (user_id, kind, brand, model)
SELECT dl.user_id, 'leurre', dl.brand, dl.model
FROM distinct_lures dl
WHERE NOT EXISTS (
  SELECT 1 FROM public.gear_items g
  WHERE g.user_id = dl.user_id
    AND g.kind = 'leurre'
    AND g.brand IS NOT DISTINCT FROM dl.brand
    AND g.model IS NOT DISTINCT FROM dl.model
);

UPDATE public.catches c
SET gear_id = g.id
FROM public.gear_items g
WHERE c.gear_id IS NULL
  AND g.user_id = c.user_id
  AND g.kind = 'leurre'
  AND g.brand IS NOT DISTINCT FROM NULLIF(btrim(c.lure_brand), '')
  AND g.model IS NOT DISTINCT FROM NULLIF(btrim(c.lure_model), '')
  AND (NULLIF(btrim(c.lure_brand), '') IS NOT NULL
    OR NULLIF(btrim(c.lure_model), '') IS NOT NULL);
