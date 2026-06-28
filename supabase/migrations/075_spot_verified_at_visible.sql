-- 075_spot_verified_at_visible.sql — Sprint 44, WS-E (confiance spot).
--
-- La promesse « vérifié le JJ/MM » est en DB (spots.verified_at) mais jamais affichée :
-- get_spot_by_slug ne renvoie pas verified_at et la colonne est verrouillée (028b/041).
-- On ajoute verified_at au retour de la RPC (definer → pas besoin de grant colonne).
-- Décision John D3 : on expose la DATE seule ; verified_by (uuid modérateur) reste fermé
-- (la fiche affichera « par l'équipe », pas d'identité).
--
-- Le type de retour change (colonne ajoutée) → DROP + CREATE (CREATE OR REPLACE refusé).
-- On reprend le corps EXACT courant (043, état vérifié) et on ajoute verified_at EN FIN
-- du RETURNS TABLE et du SELECT. Re-grant obligatoire après DROP.
--
-- ⚠️ Prochain libre = 075. Migration APPLIQUÉE en prod. Régénérer lib/types.ts ensuite.

drop function if exists public.get_spot_by_slug(text);

create function public.get_spot_by_slug(p_slug text)
returns table(
  id uuid, name text, slug text, department character, region text,
  lng double precision, lat double precision, is_precise boolean,
  techniques text[], species text[], structure text, difficulty smallint,
  description text, access_notes text, hazards text[], visibility text,
  verified boolean, created_at timestamp with time zone, source text,
  verified_at timestamp with time zone
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
    verified_at
  from matched;
$function$;

grant execute on function public.get_spot_by_slug(text) to anon, authenticated;
