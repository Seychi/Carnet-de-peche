-- 083_spot_verification_level.sql — Sprint 48, WS-B (niveaux de vérification).
--
-- `verified` est binaire. On ajoute un NIVEAU gradué : qui a vérifié le spot.
-- Dérivation (au moment de la vérif, côté app dans moderateVerifySpot) :
--   modérateur → 'equipe' ; ambassadeur (profiles.is_ambassador) → 'ambassadeur' ;
--   sinon → 'communaute'. En pratique v1 : seuls les modérateurs vérifient → 'equipe'.
-- Reste cohérent avec spots_verified_only_curated (verified ⇒ source='curated').
-- On expose verification_level dans get_spot_by_slug (badge gradué fiche).
-- (La carte get_spots_for_map garde son ✓ binaire en v1 : tout vérifié = equipe,
--  pas de gradation visible à ajouter ; map gradué = fast-follow.)
--
-- ⚠️ Prochain libre = 083 (082 = sprint 47). Migration APPLIQUÉE en prod. Regen types.

alter table public.spots
  add column if not exists verification_level text
    check (verification_level in ('communaute', 'ambassadeur', 'equipe') or verification_level is null);

-- Backfill : les spots curés DÉJÀ vérifiés sont vérifiés par l'équipe.
update public.spots
  set verification_level = 'equipe'
  where verified is true and source = 'curated' and verification_level is null;

-- get_spot_by_slug : ajoute verification_level EN FIN (RETURNS + SELECT). DROP+CREATE
-- car le type de retour change. Corps EXACT courant (post-075) + colonne ajoutée.
drop function if exists public.get_spot_by_slug(text);

create function public.get_spot_by_slug(p_slug text)
returns table(
  id uuid, name text, slug text, department character, region text,
  lng double precision, lat double precision, is_precise boolean,
  techniques text[], species text[], structure text, difficulty smallint,
  description text, access_notes text, hazards text[], visibility text,
  verified boolean, created_at timestamp with time zone, source text,
  verified_at timestamp with time zone, verification_level text
)
language sql
stable
security definer
set search_path to 'public'
as $function$
  with viewer as (
    select
      auth.uid() as uid,
      coalesce(public.current_tier(auth.uid()), 'discovery') as tier,
      (select home_department from public.profiles where id = auth.uid()) as home_dept
  ),
  matched as (
    select
      s.*,
      (
        coalesce(s.created_by = v.uid, false)
        or v.tier = 'itinerant'
        or (v.tier = 'local' and btrim(s.department) = btrim(coalesce(v.home_dept, '')))
      ) as precise
    from public.spots s
    cross join viewer v
    where s.slug = p_slug
      and s.moderation_status = 'approved'
      and (
        s.visibility = 'public'
        or (s.visibility = 'subscriber' and v.tier in ('local','itinerant'))
        or coalesce(s.created_by = v.uid, false)
      )
    limit 1
  )
  select
    id, name, slug, department, region,
    case when precise then ST_X(geom::geometry) else ST_X(ST_Centroid(geom_public::geometry)) end as lng,
    case when precise then ST_Y(geom::geometry) else ST_Y(ST_Centroid(geom_public::geometry)) end as lat,
    precise as is_precise,
    techniques, species, structure, difficulty, description, access_notes, hazards, visibility, verified, created_at, source,
    verified_at, verification_level
  from matched;
$function$;

grant execute on function public.get_spot_by_slug(text) to anon, authenticated;
