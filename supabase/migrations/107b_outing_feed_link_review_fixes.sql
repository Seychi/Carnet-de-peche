-- =====================================================================
-- Carnet de Pêche — 107b : fixes de revue du Sprint 73 (post-107)
-- =====================================================================
-- Trois correctifs issus de la passe adversariale :
--
--  (1) 🔴 FUITE XP (invariant « zéro nouvel XP » du sprint). « Regrouper en
--      sortie » (lib/outings/regroup.ts) insère une ligne dans public.outings.
--      Or recompute_my_challenges() (migration 105) compte le défi
--      `outing_logged` (« Logue une sortie », first_outing, +20 XP) via un
--      `count(*) from outings` SANS aucun filtre. Un pêcheur qui n'avait jamais
--      logué de sortie décrochait donc +20 XP au premier regroupement (au
--      prochain recompute : log de prise OU chargement du cockpit /home).
--      → On marque les sorties RÉTROACTIVES (`is_retroactive`) et on les EXCLUT
--        du comptage du défi. On NE touche PAS au filtre `is_competitive_catch`
--        (qui, lui, réinitialiserait completed_at=null pour tous les users dont
--        la sortie a > 48 h, cf 105:439-443 « when not v_complete then null »).
--      Note : la SÉRIE (105b refresh_user_streak) est déjà saine — elle filtre
--      les outings par `is_competitive_catch(started_at, created_at)`, donc une
--      sortie rétroactive antidatée n'y crée aucune semaine créditable.
--
--  (2) 🟠 get_outing_summary trop ouverte : elle renvoyait le résumé de
--      N'IMPORTE quelle sortie à tout authentifié connaissant l'UUID (y compris
--      une sortie jamais publiée). On restreint : appelant = propriétaire OU un
--      post approuvé référence la sortie. (L'enrichissement du fil et l'aperçu
--      du propriétaire restent OK ; une sonde d'UUID non publié renvoie null.)
--
--  Pas de changement de signature → grants inchangés (CREATE OR REPLACE
--  préserve l'ACL). Pas de nouvelle policy RLS.
--
-- ROLLBACK :
--   create or replace ... (versions 105 / 107 d'origine) ;
--   alter table public.outings drop column is_retroactive ;
-- =====================================================================

-- ─── (1a) Marqueur de sortie rétroactive ─────────────────────────────
alter table public.outings
  add column if not exists is_retroactive boolean not null default false;

comment on column public.outings.is_retroactive is
  'Sprint 73/107b : true = sortie créée par « Regrouper en sortie » (rétroactive, à partir de prises déjà loguées). Exclue du défi outing_logged pour ne créer AUCUN XP (invariant anti-farm S69). N''affecte pas la série (déjà filtrée is_competitive).';

-- ─── (1b) recompute_my_challenges : exclure les sorties rétroactives ──
-- Réplique EXACTE de la version 105, seule la branche outing_logged change
-- (ajout de `and is_retroactive = false`).
create or replace function public.recompute_my_challenges()
returns setof user_challenge_progress
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid         uuid := (select auth.uid());
  ch            record;
  v_progress    integer;
  v_target      integer;
  v_complete    boolean;
  v_month_start timestamptz := (date_trunc('month', now() at time zone 'Europe/Paris')) at time zone 'Europe/Paris';
  v_month_end   timestamptz := (date_trunc('month', now() at time zone 'Europe/Paris') + interval '1 month') at time zone 'Europe/Paris';
  v_month_key   text := to_char(now() at time zone 'Europe/Paris', 'YYYY-MM');
  v_ref_type    text;
  v_ref_id      uuid;
begin
  if v_uid is null then
    raise exception 'auth.uid() is null (authentification requise)';
  end if;

  for ch in select * from public.challenges where active order by sort_order loop
    v_target   := greatest(1, coalesce((ch.criteria->>'count')::integer, 1));
    v_progress := 0;
    v_ref_type := 'challenge';
    v_ref_id   := ch.id;

    if (ch.criteria->>'type') = 'distinct_species_month' then
      select count(distinct species) into v_progress
      from public.catches
      where user_id = v_uid
        and caught_at >= v_month_start
        and caught_at <  v_month_end
        and public.is_competitive_catch(caught_at, created_at);
      v_ref_type := 'challenge_month';
      v_ref_id   := md5(ch.id::text || v_month_key)::uuid;

    elsif (ch.criteria->>'type') = 'measured_catch' then
      select count(*) into v_progress
      from public.catches
      where user_id = v_uid
        and photo_verified_at is not null
        and public.is_competitive_catch(caught_at, created_at);

    elsif (ch.criteria->>'type') = 'outing_logged' then
      -- Sprint 73/107b : les sorties RÉTROACTIVES (regroupées) ne comptent pas
      -- pour ce défi → « Regrouper en sortie » ne crée aucun XP.
      select count(*) into v_progress
      from public.outings
      where user_id = v_uid
        and is_retroactive = false;

    elsif (ch.criteria->>'type') = 'species_in_season' then
      select count(*) into v_progress
      from public.catches
      where user_id = v_uid
        and species = (ch.criteria->>'species')
        and (ch.period_start is null or caught_at >= ch.period_start)
        and (ch.period_end   is null or caught_at <  (ch.period_end + interval '1 day'))
        and public.is_competitive_catch(caught_at, created_at);

    else
      continue;
    end if;

    v_complete := v_progress >= v_target;

    insert into public.user_challenge_progress as ucp
      (user_id, challenge_id, progress, target, completed_at, updated_at)
    values
      (v_uid, ch.id, least(v_progress, v_target), v_target,
       case when v_complete then now() else null end, now())
    on conflict (user_id, challenge_id) do update set
      progress = least(v_progress, v_target),
      target   = v_target,
      completed_at = case
        when v_complete and ucp.completed_at is null then now()
        when not v_complete then null
        else ucp.completed_at
      end,
      updated_at = now();

    if v_complete and ch.reward_xp > 0 then
      perform public.award_xp(v_uid, 'challenge', ch.reward_xp, v_ref_type, v_ref_id);
    end if;
  end loop;

  return query
    select * from public.user_challenge_progress where user_id = v_uid;
end;
$$;

-- ─── (2) get_outing_summary : restreindre la frontière de confiance ──
-- Réplique EXACTE de la 107, seule la CTE `o` change : on ne renvoie le résumé
-- que si l'appelant est le propriétaire OU si un post APPROUVÉ référence la
-- sortie (l'enrichissement du fil + l'aperçu propriétaire restent OK ; une sonde
-- d'UUID de sortie non publiée renvoie null).
create or replace function public.get_outing_summary(p_outing_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  with o as (
    select ou.id, ou.started_at, ou.ended_at, btrim(ou.department) as department
    from public.outings ou
    where ou.id = p_outing_id
      and (
        ou.user_id = (select auth.uid())
        or exists (
          select 1
          from public.feed_posts fp
          where fp.outing_id = ou.id
            and fp.moderation_status = 'approved'
        )
      )
  ),
  visible as (
    select c.species, c.size_cm, c.weight_g, c.caught_at,
           c.photo_verified_at, c.conditions
    from public.catches_for_viewer c
    where c.outing_id = p_outing_id
  ),
  species_agg as (
    select coalesce(
             jsonb_agg(
               jsonb_build_object('species', t.species, 'count', t.n)
               order by t.n desc, t.species asc
             ),
             '[]'::jsonb
           ) as species
    from (
      select v.species, count(*)::int as n
      from visible v
      group by v.species
    ) t
  ),
  biggest as (
    select jsonb_build_object(
             'species',  v.species,
             'size_cm',  v.size_cm,
             'weight_g', v.weight_g,
             'verified', true
           ) as biggest
    from visible v
    where v.photo_verified_at is not null
    order by v.size_cm desc nulls last, v.weight_g desc nulls last
    limit 1
  ),
  nearest as (
    select v.conditions
    from visible v, o
    where v.conditions is not null and v.conditions <> '{}'::jsonb
    order by abs(extract(epoch from (v.caught_at - o.started_at))) asc
    limit 1
  )
  select case
    when (select count(*) from o) = 0 then null
    else jsonb_build_object(
      'outing_id',    (select id from o),
      'started_at',   (select started_at from o),
      'ended_at',     (select ended_at from o),
      'duration_min', case
                        when (select ended_at from o) is null then null
                        else (extract(epoch from ((select ended_at from o) - (select started_at from o))) / 60)::int
                      end,
      'department',   (select department from o),
      'catch_count',  (select count(*)::int from visible),
      'blank',        ((select count(*) from visible) = 0),
      'species',      (select species from species_agg),
      'biggest',      (select biggest from biggest),
      'conditions',   (select conditions from nearest)
    )
  end;
$$;