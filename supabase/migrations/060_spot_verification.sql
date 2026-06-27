-- 060_spot_verification.sql — Sprint 37, WS-E (F2 « coordonnée vérifiée »).
--
-- But : donner un sens TRAÇABLE à « vérifié » (qui ? quand ?) et propager le
-- signal partout, pour planter le drapeau anti-Decathlon (« un spot c'est un GPS
-- fixe vérifié, pas un point communautaire qui bouge »).
--
-- Décision John D1 (sprint 37) = backfill source='curated' → verified=true : les
-- 157 spots curés ont des coordonnées vérifiées à la main → on assume le claim.
-- Le badge carte reste conditionné sur source='curated' (043, inchangé), c'est le
-- tooltip/label + la traçabilité verified_at/verified_by + l'action modération
-- (WS-F) qui portent désormais le sens « coordonnée vérifiée ».
--
-- Invariants : RLS/policies sur `spots` INCHANGÉES (la policy spots_update_moderator
-- de 043 backstoppe déjà l'action « marquer vérifié »). AUCUN geom précis exposé :
-- les RPC gardent leur gating de tier à l'identique, on n'AJOUTE que verified+source.
-- CHECK spots_verified_only_curated (043 : verified ⇒ source='curated') respecté
-- par le backfill (on ne passe verified=true que sur des curés).
--
-- Migration APPLIQUÉE en prod via apply_migration. Régénérer lib/types.ts ensuite.

-- ─── 1. Colonnes de traçabilité ───────────────────────────────────────────────
ALTER TABLE public.spots
  ADD COLUMN IF NOT EXISTS verified_at timestamptz,
  ADD COLUMN IF NOT EXISTS verified_by uuid REFERENCES auth.users(id) ON DELETE SET NULL;

COMMENT ON COLUMN public.spots.verified_at IS
  'Date de vérification de la coordonnée (curé backfillé en 060, ou action modération). NULL = jamais vérifié.';
COMMENT ON COLUMN public.spots.verified_by IS
  'Modérateur ayant vérifié la coordonnée. NULL pour les curés backfillés (vérification système / éditoriale) ou si le compte a été supprimé.';

-- ─── 2. Backfill curated → verified (décision John D1) ────────────────────────
-- Les curés ont des coords vérifiées à la main. On les marque verified=true et on
-- horodate. Idempotent : après 1er passage, tous les curés ont verified_at posé.
-- Les 9 déjà-verified mais sans verified_at sont aussi horodatés (verified_at IS NULL).
-- verified_by reste NULL (backfill système, pas un modérateur identifié).
UPDATE public.spots
SET verified = true,
    verified_at = now()
WHERE source = 'curated'
  AND (verified IS NOT TRUE OR verified_at IS NULL);

-- ─── 3. nearby_spots : exposer verified + source (gating INCHANGÉ) ────────────
-- On REPART du corps courant (039 anti-trilatération → 043) et on AJOUTE seulement
-- verified + source à la sortie. drop + create + grant (pattern 043). Aucun geom
-- précis exposé en plus ; le gating de tier (rn <= 3 pour discovery) est identique.
DROP FUNCTION IF EXISTS public.nearby_spots(double precision, double precision, double precision, text[], text[]);
CREATE FUNCTION public.nearby_spots(
  lat double precision,
  lng double precision,
  radius_km double precision DEFAULT 50,
  species_filter text[] DEFAULT NULL::text[],
  technique_filter text[] DEFAULT NULL::text[]
)
RETURNS TABLE(
  id uuid,
  name text,
  slug text,
  department character,
  distance_m double precision,
  techniques text[],
  species text[],
  difficulty smallint,
  verified boolean,
  source text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $function$
  with viewer as materialized (
    select
      auth.uid() as uid,
      coalesce(public.current_tier(auth.uid()), 'discovery') as tier,
      (select home_department from public.profiles where id = auth.uid()) as home_dept
  ),
  matched as (
    select
      s.id, s.name, s.slug, s.department,
      case
        when (
          coalesce(s.created_by = v.uid, false)
          or v.tier = 'itinerant'
          or (v.tier = 'local' and btrim(s.department) = btrim(coalesce(v.home_dept, '')))
        )
        then ST_Distance(
               s.geom,
               ST_SetSRID(ST_MakePoint(lng, lat), 4326)::geography
             )
        else ST_Distance(
               ST_Centroid(s.geom_public)::geography,
               ST_SetSRID(ST_MakePoint(lng, lat), 4326)::geography
             )
      end as distance_m,
      s.techniques, s.species, s.difficulty,
      s.verified, s.source,
      v.tier
    from public.spots s
    cross join viewer v
    where ST_DWithin(
            s.geom,
            ST_SetSRID(ST_MakePoint(lng, lat), 4326)::geography,
            radius_km * 1000
          )
      and s.moderation_status = 'approved'
      and (
        s.visibility = 'public'
        or (s.visibility = 'subscriber' and v.tier in ('local','itinerant'))
        or coalesce(s.created_by = v.uid, false)
      )
      and (species_filter is null   or s.species   && species_filter)
      and (technique_filter is null or s.techniques && technique_filter)
    order by distance_m
    limit 100
  ),
  ranked as (
    select *, row_number() over (order by distance_m) as rn from matched
  )
  select id, name, slug, department, distance_m, techniques, species, difficulty, verified, source
  from ranked
  where tier in ('local','itinerant') or rn <= 3
  order by distance_m;
$function$;

grant execute on function public.nearby_spots(double precision, double precision, double precision, text[], text[]) to anon, authenticated;

-- ─── 4. get_top_spots_for_species : exposer verified + source ─────────────────
-- Même principe : on REPART du corps courant (049) et on AJOUTE verified + source.
-- Gating perso (Itinérant) + k-anon communauté INCHANGÉS. drop + create + grant.
DROP FUNCTION IF EXISTS public.get_top_spots_for_species(text, text, integer, integer);
CREATE FUNCTION public.get_top_spots_for_species(
  p_species text,
  p_dept text DEFAULT NULL::text,
  p_limit integer DEFAULT 6,
  p_days integer DEFAULT 90
)
RETURNS TABLE(
  id uuid,
  name text,
  slug text,
  department character,
  structure text,
  lng double precision,
  lat double precision,
  is_precise boolean,
  species_catches integer,
  fishers integer,
  perso_catches integer,
  verified boolean,
  source text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
  with viewer as materialized (
    select
      auth.uid() as uid,
      coalesce(public.current_tier(auth.uid()), 'discovery') as tier,
      (select home_department from public.profiles where id = auth.uid()) as home_dept
  ),
  cand as (
    select s.id, s.name, s.slug, s.department, s.structure, s.geom, s.geom_public, s.created_by, s.verified, s.source
    from public.spots s
    where s.visibility = 'public'
      and s.species && array[p_species]
      and (p_dept is null or btrim(s.department) = btrim(p_dept))
  ),
  sig as (
    select
      c.spot_id,
      count(*) filter (where c.privacy = 'public')::int                as pub_count,
      count(distinct c.user_id) filter (where c.privacy = 'public')::int as pub_fishers
    from public.catches c
    where c.spot_id in (select id from cand)
      and c.species = p_species
      and c.caught_at > now() - (greatest(coalesce(p_days, 90), 1) || ' days')::interval
    group by c.spot_id
  ),
  perso as (
    select c.spot_id, count(*)::int as perso_count
    from public.catches c
    cross join viewer v
    where v.tier = 'itinerant'
      and v.uid is not null
      and c.user_id = v.uid
      and c.spot_id in (select id from cand)
      and c.species = p_species
      and c.caught_at > now() - (greatest(coalesce(p_days, 90), 1) || ' days')::interval
    group by c.spot_id
  ),
  resolved as (
    select
      cand.id, cand.name, cand.slug, cand.department, cand.structure,
      (
        coalesce(cand.created_by = v.uid, false)
        or v.tier = 'itinerant'
        or (v.tier = 'local' and btrim(cand.department) = btrim(coalesce(v.home_dept, '')))
      ) as precise,
      cand.geom, cand.geom_public,
      case when sig.pub_count >= 3 and sig.pub_fishers >= 3 then sig.pub_count   else 0 end as kc,
      case when sig.pub_count >= 3 and sig.pub_fishers >= 3 then sig.pub_fishers else 0 end as kf,
      coalesce(perso.perso_count, 0) as pc,
      cand.verified, cand.source
    from cand
    cross join viewer v
    left join sig   on sig.spot_id   = cand.id
    left join perso on perso.spot_id = cand.id
  )
  select
    r.id, r.name, r.slug, r.department, r.structure,
    case when r.precise then ST_X(r.geom::geometry) else ST_X(ST_Centroid(r.geom_public::geometry)) end as lng,
    case when r.precise then ST_Y(r.geom::geometry) else ST_Y(ST_Centroid(r.geom_public::geometry)) end as lat,
    r.precise as is_precise,
    r.kc as species_catches,
    r.kf as fishers,
    r.pc as perso_catches,
    r.verified, r.source
  from resolved r
  order by r.kc desc, r.pc desc, r.name asc
  limit greatest(least(coalesce(p_limit, 6), 24), 1);
$function$;

grant execute on function public.get_top_spots_for_species(text, text, integer, integer) to anon, authenticated;

-- ─── 5. Notif : nouveau type spot_verified ────────────────────────────────────
-- ⚠️ Anti-régression (leçon 024/025/055) : on RÉPÈTE la liste COMPLÈTE des types en
-- vigueur (les 11 de 055) + le nouveau, pour ne RIEN perdre. target_type='spot'
-- est déjà accepté (043) → pas touché.
ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS notifications_type_check;
ALTER TABLE public.notifications ADD CONSTRAINT notifications_type_check
  CHECK (type IN (
    'new_follower', 'post_liked', 'post_commented', 'catch_commented', 'mention',
    'spot_approved', 'spot_rejected', 'recfishing_reminder',
    'outing_join', 'outing_accepted', 'optimal_window',
    -- Sprint 37 : un modérateur a vérifié la coordonnée du spot proposé.
    'spot_verified'
  ));
