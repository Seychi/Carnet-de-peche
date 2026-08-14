-- 110_tier_ladder.sql — Sprint 77, Bloc 1 (+ Bloc 8 tâche 1)
-- « Trois paliers qui se voient » : le compte gratuit ouvre enfin la carte.
--
-- CONSTAT (mesuré en base le 2026-08-13) : `get_spots_for_map` et `nearby_spots`
-- se terminaient par `where tier in ('local','itinerant') or rn <= 3`. Un compte
-- gratuit (`discovery`) tombait donc dans le MÊME `rn <= 3` qu'un anonyme : créer
-- un compte ne débloquait strictement RIEN sur la carte.
--
-- CORRECTION : la clause devient `where tier <> 'anonymous' or rn <= 3`.
--   • anonyme    → 3 spots par département (inchangé, 72 lignes max)
--   • discovery  → tous les spots, coordonnées TOUJOURS floutées
--   • local      → son département (le filtre de dépt du CTE `visible` est inchangé)
--   • itinerant  → tout, coordonnées précises
--
-- ⚠️ Pourquoi cette clause est correcte, et non un no-op : `current_tier(null)`
-- renvoie littéralement 'anonymous' (cf migration 021 + 104), donc le
-- `coalesce(current_tier(auth.uid()), 'discovery')` du CTE `viewer` est inerte —
-- vérifié en SQL live avant écriture. Un anonyme porte bien `tier = 'anonymous'`.
--
-- ⚠️ INVARIANT NON NÉGOCIABLE : la gate de précision (`is_precise`) n'est PAS
-- touchée. `discovery` continue de recevoir `ST_Centroid(geom_public)` (flou
-- 500-900 m, migrations 028/028b/041). Les coordonnées précises restent le cœur
-- de l'abonnement (CLAUDE.md §8, décision John maintenue).
--
-- ⚠️ `get_spot_by_slug` n'est VOLONTAIREMENT pas modifiée (cf RECAP §Bloc 1) :
-- tous les champs qu'elle renvoie sont du contenu socle, identique aux trois
-- paliers d'après la matrice du brief, et sa gate `precise` est déjà exactement
-- celle voulue (propriétaire / itinerant / local sur son dépt). La profondeur de
-- contenu (marées 7 j, frise de score, prises) n'y transite pas : elle est
-- récupérée par d'autres appels et arbitrée par la page via `getUserTier()`,
-- ce que le brief demande explicitement. Modifier une fonction SECURITY DEFINER
-- sans effet utile serait du risque gratuit.

begin;

-- ─── 1. Carte : le compte gratuit voit tous les spots ────────────────────────
create or replace function public.get_spots_for_map(
  dept_filter character default null,
  species_filter text[] default null,
  technique_filter text[] default null
)
returns table (
  id uuid, name text, slug text, department character, region text,
  lng double precision, lat double precision, is_precise boolean,
  techniques text[], species text[], structure text, difficulty smallint,
  verified boolean, source text
)
language sql
stable
security definer
set search_path to 'public'
as $function$
  with viewer as materialized (
    select
      auth.uid() as uid,
      coalesce(public.current_tier(auth.uid()), 'discovery') as tier,
      (select home_department from public.profiles where id = auth.uid()) as home_dept
  ),
  visible as (
    select
      s.*,
      v.tier,
      v.uid,
      (v.tier in ('local','itinerant') or coalesce(s.created_by = v.uid, false)) as is_precise
    from public.spots s
    cross join viewer v
    where s.moderation_status = 'approved'
      and (
        s.visibility = 'public'
        or (s.visibility = 'subscriber' and v.tier in ('local','itinerant'))
        or coalesce(s.created_by = v.uid, false)
      )
      and (
        v.tier = 'itinerant'
        or v.tier not in ('local','itinerant')
        or (v.tier = 'local' and btrim(s.department) = btrim(coalesce(v.home_dept,'')))
      )
      and (dept_filter is null or s.department = dept_filter)
      and (species_filter is null or s.species && species_filter)
      and (technique_filter is null or s.techniques && technique_filter)
  ),
  ranked as (
    select *, row_number() over (partition by btrim(department) order by name) as rn
    from visible
  )
  select
    id, name, slug, department, region,
    case when is_precise then ST_X(geom::geometry) else ST_X(ST_Centroid(geom_public::geometry)) end as lng,
    case when is_precise then ST_Y(geom::geometry) else ST_Y(ST_Centroid(geom_public::geometry)) end as lat,
    is_precise, techniques, species, structure, difficulty, verified, source
  from ranked
  -- SPRINT 77 : seul l'anonyme reste plafonné à 3 spots par département.
  where tier <> 'anonymous' or rn <= 3
  order by name;
$function$;

-- ─── 2. Voisins : mêmes paliers ──────────────────────────────────────────────
-- Un compte gratuit doit voir de VRAIS voisins et non les 3 plus proches d'une
-- liste tronquée. Aucune fuite de précision : pour un non-abonné la distance est
-- déjà calculée depuis `ST_Centroid(geom_public)`, clause inchangée.
create or replace function public.nearby_spots(
  lat double precision,
  lng double precision,
  radius_km double precision default 50,
  species_filter text[] default null,
  technique_filter text[] default null
)
returns table (
  id uuid, name text, slug text, department character, distance_m double precision,
  techniques text[], species text[], difficulty smallint, verified boolean, source text
)
language sql
stable
security definer
set search_path to 'public'
as $function$
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
  -- SPRINT 77 : idem, seul l'anonyme reste plafonné.
  where tier <> 'anonymous' or rn <= 3
  order by distance_m;
$function$;

-- ─── 3. Bloc 8 tâche 1 : une prise est publique par défaut ───────────────────
-- Un réseau social dont le contenu est privé par défaut n'a pas de fil : 7 prises
-- publiques sur 26 loguées. Le choix reste VISIBLE et modifiable au moment de
-- loguer (trois options à l'écran, cf CatchForm) — il n'est pas enterré.
--
-- ⚠️ AUCUNE REPRISE RÉTROACTIVE. `alter column ... set default` ne touche pas une
-- seule ligne existante : les 18 prises privées et la 1 « amis » restent telles
-- quelles, définitivement. Changer la visibilité de données passées sans accord
-- explicite serait une faute (garde-fou du brief, décision par défaut = non).
--
-- ⚠️ Ce défaut DB est une ceinture, pas la bretelle : l'application envoie
-- TOUJOURS `privacy` explicitement (lib/catches/actions.ts). Le défaut qui compte
-- pour l'utilisateur est celui du schéma zod + du formulaire, changés en même
-- temps que cette migration.
alter table public.catches alter column privacy set default 'public';

commit;
