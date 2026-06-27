-- 066_catch_verification.sql — Sprint 39, WS-D (fondation « prise mesurée », F7).
--
-- But : poser la donnée qu'un flux manuel honnête (web) remplit aujourd'hui et que le
-- mobile remplira demain automatiquement (caméra + IA espèce/mesure). En v1 la prise est
-- « MESURÉE » (longueur auto-déclarée + objet de référence), PAS « vérifiée » par un tiers
-- (décision John D1 : honnêteté, on réserve « vérifiée » à la phase mobile IA).
--
-- ⚠️ Numérotation : le brief disait 064, pris au sprint 38 → cette migration est la 066.
--
-- Migration APPLIQUÉE en prod via apply_migration. Régénérer lib/types.ts ensuite.

-- ─── 1. Colonnes « prise mesurée » sur catches ────────────────────────────────
alter table public.catches
  add column if not exists measured_length_cm smallint
    check (measured_length_cm is null or (measured_length_cm > 0 and measured_length_cm < 300)),
  add column if not exists reference_object text,
  add column if not exists photo_verified_at timestamptz;

comment on column public.catches.measured_length_cm is
  'Longueur mesurée (cm) auto-déclarée par le pêcheur avec une référence. v1 honnête (« mesurée », pas « vérifiée »). Le mobile la remplira par photo + IA.';
comment on column public.catches.photo_verified_at is
  'Horodatage quand une prise a été mesurée avec un objet de référence (débloque le badge prise_mesuree). « mesurée » en v1, sémantique « vérifiée » réservée au mobile.';

-- ─── 2. catches_for_viewer : append measured_length_cm + reference_object + photo_verified_at ──
-- On REPREND la déf. complète courante (015 → 034 lng/lat → 059 gear → 063 outing_id) et on
-- AJOUTE les 3 colonnes EN FIN (après outing_id) → CREATE OR REPLACE append-only autorisé,
-- pas de DROP CASCADE. ⚠️ La vue reste SECURITY DEFINER (041/047, D-2 assumé).
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
  v.outing_id,
  v.measured_length_cm,
  v.reference_object,
  v.photo_verified_at
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
    c.outing_id,
    c.measured_length_cm,
    c.reference_object,
    c.photo_verified_at
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

ALTER VIEW public.catches_for_viewer SET (security_invoker = false);

COMMENT ON VIEW public.catches_for_viewer IS
  'Prises visibles par le viewer (floutage geom par catch_visible_geom). SECURITY DEFINER VOLONTAIRE (041). lng/lat (034). gear (059). outing_id (063). measured_length_cm/reference_object/photo_verified_at (066) = prise mesurée. Toujours lire cette vue, jamais la table catches.';

-- ─── 3. recompute_my_badges : badge prise_mesuree ─────────────────────────────
-- On REPREND le corps courant (056) et on AJOUTE l'agrégat v_measured + la ligne
-- ('prise_mesuree', v_measured >= 1) au VALUES. Le RPC lit catches en direct (own-only,
-- definer) → il voit photo_verified_at même si la colonne n'a pas de SELECT grant table.
CREATE OR REPLACE FUNCTION public.recompute_my_badges()
RETURNS SETOF public.user_badges
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_uid             uuid := auth.uid();
  v_total           bigint;
  v_species         bigint;
  v_released        bigint;
  v_active_weeks    bigint;
  v_measured        bigint;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Non authentifié';
  END IF;

  -- Agrégats à partir des SEULES prises du demandeur.
  SELECT
    count(*),
    count(DISTINCT species),
    count(*) FILTER (WHERE released IS TRUE),
    count(DISTINCT date_trunc('week', caught_at)),
    count(*) FILTER (WHERE photo_verified_at IS NOT NULL)
  INTO v_total, v_species, v_released, v_active_weeks, v_measured
  FROM public.catches
  WHERE user_id = v_uid;

  -- UPSERT idempotent : on n'insère un badge que s'il est mérité ; ON CONFLICT
  -- DO NOTHING garde l'earned_at de la première fois (jamais réécrit).
  INSERT INTO public.user_badges (user_id, badge_slug)
  SELECT v_uid, b.badge_slug
  FROM (VALUES
    ('first_catch',      (v_total        >= 1)),
    ('ten_catches',      (v_total        >= 10)),
    ('five_species',     (v_species      >= 5)),
    ('pokedex_complete', (v_species      >= 20)),
    ('release_friendly', (v_released     >= 10)),
    ('regular_4w',       (v_active_weeks >= 4)),
    ('prise_mesuree',    (v_measured     >= 1))
  ) AS b(badge_slug, earned)
  WHERE b.earned
  ON CONFLICT (user_id, badge_slug) DO NOTHING;

  RETURN QUERY
    SELECT * FROM public.user_badges WHERE user_id = v_uid ORDER BY earned_at;
END;
$function$;
