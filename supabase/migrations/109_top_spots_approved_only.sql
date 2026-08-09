-- 109 — get_top_spots_for_species ne renvoie plus que des spots APPROUVÉS (sprint 75).
--
-- LE BUG. La fonction est SECURITY DEFINER : elle contourne donc la RLS
-- `spots_select_visible` qui, elle, restreint bien `anon` aux spots approuvés.
-- Son filtre interne ne portait que sur `visibility = 'public'`, si bien qu'elle
-- remontait aussi des imports `pending` et des spots `rejected`.
--
-- Prouvé en prod avant correctif (rôle anon, ids capturés puis vérifiés hors RLS) :
--   get_top_spots_for_species('bar', null, 24, 90) → 24 lignes, dont 1 `pending`.
--
-- CONSÉQUENCE VISIBLE. Le bloc « meilleurs spots » des fiches /especes liait vers
-- /spots/<slug>, or cette fiche filtre bien les non-approuvés et répond 404. On
-- servait donc des liens internes morts sur les pages que le sprint 75 cherche
-- justement à faire convertir, et on gaspillait du budget de crawl.
--
-- Même décision que le fix sitemap du 2026-08-05 (les `pending` ne sont pas du
-- contenu publiable), appliquée cette fois à la voie definer.
--
-- SÉCURITÉ. Changement strictement RESTRICTIF : il ne peut que retirer des lignes,
-- jamais en exposer. Aucune signature modifiée, aucune coordonnée touchée : le
-- gating des coords (`precise`) et le k-anon K=3 sur les compteurs sont recopiés
-- à l'identique depuis la définition existante.

create or replace function public.get_top_spots_for_species(
  p_species text,
  p_dept text default null,
  p_limit integer default 6,
  p_days integer default 90
)
returns table(
  id uuid, name text, slug text, department character, structure text,
  lng double precision, lat double precision, is_precise boolean,
  species_catches integer, fishers integer, perso_catches integer,
  verified boolean, source text
)
language sql
stable
security definer
set search_path to 'public', 'pg_temp'
as $function$
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
      -- ⬇️ LE FIX 109 : la fonction est definer, la RLS ne la filtre pas.
      and s.moderation_status = 'approved'
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
