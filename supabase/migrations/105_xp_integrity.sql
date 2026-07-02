-- 105_xp_integrity.sql — Sprint 69 : le ledger fait foi (économie XP infalsifiable)
--
-- Stratégie « option A » (roadmap 2026-07-02, décision John) : les compteurs
-- anti-farm se calculent sur xp_events (append-only), PLUS JAMAIS sur catches
-- (vivantes). On CONSERVE la décision 098 « pas de révocation au DELETE » :
-- supprimer une prise reste XP-neutre, mais ne remet plus AUCUN compteur à zéro.
--
-- Trous fermés (vérifiés live par pg_get_functiondef, cf docs/sprint-69/research/anchor.md) :
--   (a) award_catch_xp comptait sur public.catches → delete + re-log re-farmait
--       new_species (+50), personal_best (+30) et le plafond 3/espèce/jour ;
--   (b) rien ne liait photo_verified_at à photo_path (contrainte miroir ici) ;
--   (c) antidater des prises créditait streaks (+20/semaine via refresh_user_streak),
--       défis et XP → fenêtre compétitive partagée is_competitive_catch.
--
-- Toutes les fonctions remplacées le sont en create or replace À L'IDENTIQUE
-- hors changements commentés (définitions live ancrées avant remplacement).
-- 105b_*.sql est réservé aux fixes de revue (pattern S68).

-- ────────────────────────────────────────────────────────────────────────────
-- 1) xp_events.meta : le contexte de la prise VOYAGE avec l'événement.
--    (xp_events n'a ni espèce ni longueur ; sans meta, impossible de plafonner
--    par espèce/jour sur le ledger.) Cascade RGPD inchangée (FK user_id).
-- ────────────────────────────────────────────────────────────────────────────

alter table public.xp_events
  add column if not exists meta jsonb;

comment on column public.xp_events.meta is
  'Contexte de l''événement (sprint 69) : {species, measured_length_cm, caught_at} pour les kinds liés à une prise. Sert aux compteurs anti-farm sur le ledger. NULL pour les kinds sans prise (week_streak, challenge) et les événements orphelins d''avant le backfill.';

-- Backfill : les événements liés à une prise ENCORE existante récupèrent leur
-- contexte. Les événements de prises déjà supprimées gardent meta NULL (assumé :
-- ils continuent de compter dans les plafonds journaliers mais pas dans les
-- compteurs par espèce — documenté au RECAP).
update public.xp_events e
set meta = jsonb_build_object(
  'species',            c.species,
  'measured_length_cm', c.measured_length_cm,
  'caught_at',          c.caught_at
)
from public.catches c
where e.ref_type = 'catch'
  and e.ref_id = c.id
  and e.meta is null;

-- ────────────────────────────────────────────────────────────────────────────
-- 2) Fenêtre anti-datage PARTAGÉE : une prise est « compétitive » si sa date
--    déclarée colle à sa date de saisie ([-48 h, +15 min]). Hors fenêtre, la
--    prise reste ENTIÈRE dans le carnet, les stats perso et le scoring (le
--    moat) : elle ne crédite juste ni XP, ni série, ni défi.
-- ────────────────────────────────────────────────────────────────────────────

create or replace function public.is_competitive_catch(p_caught_at timestamptz, p_created_at timestamptz)
returns boolean
language sql
immutable
set search_path = public
as $$
  select p_caught_at is not null
     and p_created_at is not null
     and p_caught_at between p_created_at - interval '48 hours'
                         and p_created_at + interval '15 minutes';
$$;

comment on function public.is_competitive_catch(timestamptz, timestamptz) is
  'Fenêtre anti-datage (sprint 69) : caught_at dans [created_at - 48h, created_at + 15min]. Seules les prises compétitives créditent XP/séries/défis. Le carnet et le scoring perso ne filtrent JAMAIS là-dessus.';

-- Fonction pure sans accès table : exécutable par tous (utilisée dans des definer).
grant execute on function public.is_competitive_catch(timestamptz, timestamptz) to anon, authenticated, service_role;

-- ────────────────────────────────────────────────────────────────────────────
-- 3) award_xp : + p_meta jsonb. Un paramètre supplémentaire = NOUVELLE signature
--    Postgres → DROP explicite de l'ancienne (sinon overload fantôme). Dédup
--    (unique + on conflict do nothing) et incrément user_progress INCHANGÉS.
-- ────────────────────────────────────────────────────────────────────────────

drop function if exists public.award_xp(uuid, text, integer, text, uuid);

create function public.award_xp(
  p_user_id uuid,
  p_kind text,
  p_points integer,
  p_ref_type text default null,
  p_ref_id uuid default null,
  p_meta jsonb default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_user_id is null then
    return;
  end if;

  insert into public.xp_events (user_id, kind, points, ref_type, ref_id, meta)
  values (p_user_id, p_kind, p_points, p_ref_type, p_ref_id, p_meta)
  on conflict (user_id, kind, ref_type, ref_id) do nothing;

  if not found then
    return;
  end if;

  insert into public.user_progress (user_id, total_xp, updated_at)
  values (p_user_id, p_points, now())
  on conflict (user_id) do update
    set total_xp   = user_progress.total_xp + excluded.total_xp,
        updated_at = now();
end;
$$;

comment on function public.award_xp(uuid, text, integer, text, uuid, jsonb) is
  'Crédite un événement XP idempotent (ledger append-only, migration 098 + meta 105). N''incrémente user_progress que si l''événement est nouveau.';

revoke all on function public.award_xp(uuid, text, integer, text, uuid, jsonb) from public, anon, authenticated;
grant execute on function public.award_xp(uuid, text, integer, text, uuid, jsonb) to service_role;

-- ────────────────────────────────────────────────────────────────────────────
-- 4) award_catch_xp : LE LEDGER FAIT FOI. Tous les compteurs se lisent sur
--    xp_events (les événements des prises SUPPRIMÉES comptent toujours), AVANT
--    l'insert des événements de la prise courante (aucun event de c n'existe
--    encore à ce stade : pas d'auto-comptage). Nouveaux plafonds journaliers
--    measured/released. Fenêtre anti-datage en tête (0 XP hors fenêtre).
-- ────────────────────────────────────────────────────────────────────────────

create or replace function public.award_catch_xp(c catches)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  -- Plafonds (jour UTC de created_at, sémantique 098 conservée) :
  c_max_catch_species_day constant int := 3;  -- +10 « catch » max 3/espèce/jour
  c_max_measured_day      constant int := 3;  -- +15 « measured » max 3/jour
  c_max_released_day      constant int := 5;  -- +4  « released » max 5/jour
  v_same_day      int;
  v_prior_species int;
  v_prior_best    numeric;
  v_measured_day  int;
  v_released_day  int;
  v_meta          jsonb;
begin
  -- Anti-datage : hors fenêtre, AUCUN crédit compétitif (carnet/stats intacts).
  if not public.is_competitive_catch(c.caught_at, c.created_at) then
    return;
  end if;

  v_meta := jsonb_build_object(
    'species',            c.species,
    'measured_length_cm', c.measured_length_cm,
    'caught_at',          c.caught_at
  );

  -- Compteurs sur le LEDGER (jamais sur catches) :
  --   v_same_day      : events « catch » de la même espèce le même jour ;
  --   v_prior_species : le +50 « new_species » est acquis UNE fois PAR ESPÈCE À VIE ;
  --   v_prior_best    : la barre du record ne redescend jamais (max du ledger) ;
  --   v_measured_day / v_released_day : plafonds journaliers.
  select
    count(*) filter (
      where e.kind = 'catch'
        and e.meta->>'species' is not distinct from c.species
        and date_trunc('day', e.created_at) = date_trunc('day', c.created_at)
    ),
    count(*) filter (
      where e.kind = 'new_species'
        and e.meta->>'species' is not distinct from c.species
    ),
    max((e.meta->>'measured_length_cm')::numeric) filter (
      where e.kind = 'measured'
        and e.meta->>'species' is not distinct from c.species
    ),
    count(*) filter (
      where e.kind = 'measured'
        and date_trunc('day', e.created_at) = date_trunc('day', c.created_at)
    ),
    count(*) filter (
      where e.kind = 'released'
        and date_trunc('day', e.created_at) = date_trunc('day', c.created_at)
    )
  into v_same_day, v_prior_species, v_prior_best, v_measured_day, v_released_day
  from public.xp_events e
  where e.user_id = c.user_id
    and e.ref_type = 'catch';

  if v_same_day < c_max_catch_species_day then
    perform public.award_xp(c.user_id, 'catch', 10, 'catch', c.id, v_meta);
  end if;

  if v_prior_species = 0 then
    perform public.award_xp(c.user_id, 'new_species', 50, 'catch', c.id, v_meta);
  end if;

  if c.photo_verified_at is not null
     and c.measured_length_cm is not null
     and v_prior_best is not null
     and c.measured_length_cm > v_prior_best then
    perform public.award_xp(c.user_id, 'personal_best', 30, 'catch', c.id, v_meta);
  end if;

  if c.photo_verified_at is not null and v_measured_day < c_max_measured_day then
    perform public.award_xp(c.user_id, 'measured', 15, 'catch', c.id, v_meta);
  end if;

  if c.released is true and v_released_day < c_max_released_day then
    perform public.award_xp(c.user_id, 'released', 4, 'catch', c.id, v_meta);
  end if;
end;
$$;

comment on function public.award_catch_xp(catches) is
  'Crédite l''XP d''une prise (trigger 098, réécrit sprint 69) : compteurs sur le LEDGER xp_events (insensibles au delete), fenêtre anti-datage, plafonds catch 3/espèce/jour + measured 3/jour + released 5/jour, new_species une fois par espèce à vie.';

-- ────────────────────────────────────────────────────────────────────────────
-- 5) Séries : seules les prises COMPÉTITIVES comptent (les sorties, elles,
--    restent comptées telles quelles : leur date n'est pas déclarative de la
--    même façon, hors périmètre sprint 69). Le longest_week_streak déjà acquis
--    est préservé par le greatest() existant ; les XP week_streak déjà crédités
--    restent au ledger (décision A). Seule la branche catches change.
-- ────────────────────────────────────────────────────────────────────────────

create or replace function public.compute_user_week_streak(p_user_id uuid, p_asof date default current_date)
returns table(current_streak integer, longest_streak integer, last_week date, joker_month date)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_week        date;
  v_prev        date := null;
  v_run         int  := 0;
  v_best        int  := 0;
  v_joker_month date := null;
  v_last        date := null;
  v_cur_week    date := date_trunc('week', p_asof::timestamp)::date;
  v_gap         int;
  v_missed_mon  date;
begin
  current_streak := 0;
  longest_streak := 0;
  last_week := null;
  joker_month := null;

  for v_week in
    select w from (
      -- Sprint 69 : filtre anti-datage (une prise antidatée ne fabrique pas
      -- de semaine active rétroactive).
      select distinct date_trunc('week', (caught_at  at time zone 'Europe/Paris'))::date as w
        from public.catches
        where user_id = p_user_id
          and public.is_competitive_catch(caught_at, created_at)
      union
      select distinct date_trunc('week', (started_at at time zone 'Europe/Paris'))::date as w
        from public.outings  where user_id = p_user_id
    ) s
    where w <= v_cur_week
    order by w
  loop
    if v_prev is null then
      v_run := 1;
      v_joker_month := null;
    else
      v_gap := ((v_week - v_prev) / 7)::int;
      if v_gap = 1 then
        v_run := v_run + 1;
      elsif v_gap = 2 then
        v_missed_mon := date_trunc('month', v_prev + 7)::date;
        if v_joker_month is distinct from v_missed_mon then
          v_joker_month := v_missed_mon;
          v_run := v_run + 1;
        else
          v_run := 1;
          v_joker_month := null;
        end if;
      else
        v_run := 1;
        v_joker_month := null;
      end if;
    end if;

    if v_run > v_best then v_best := v_run; end if;
    v_prev := v_week;
    v_last := v_week;
  end loop;

  longest_streak := v_best;
  last_week := v_last;

  if v_last is null then
    current_streak := 0;
  else
    v_gap := ((v_cur_week - v_last) / 7)::int;
    if v_gap <= 1 then
      current_streak := v_run;
    elsif v_gap = 2 then
      v_missed_mon := date_trunc('month', v_last + 7)::date;
      if v_joker_month is distinct from v_missed_mon then
        current_streak := v_run;
        v_joker_month := v_missed_mon;
      else
        current_streak := 0;
      end if;
    else
      current_streak := 0;
    end if;
  end if;

  joker_month := v_joker_month;
  return next;
end;
$$;

create or replace function public.refresh_user_streak(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_current int;
  v_longest int;
  v_last    date;
  v_joker   date;
  w         date;
begin
  if p_user_id is null then
    return;
  end if;

  select current_streak, longest_streak, last_week, joker_month
    into v_current, v_longest, v_last, v_joker
  from public.compute_user_week_streak(p_user_id, current_date);

  insert into public.user_progress (user_id, current_week_streak, longest_week_streak, last_active_week, updated_at)
  values (p_user_id, coalesce(v_current, 0), coalesce(v_longest, 0), v_last, now())
  on conflict (user_id) do update
    set current_week_streak = excluded.current_week_streak,
        longest_week_streak = greatest(user_progress.longest_week_streak, excluded.longest_week_streak),
        last_active_week    = excluded.last_active_week,
        updated_at          = now();

  -- XP +20 par semaine active distincte (clé md5(semaine) stable = dédup à vie).
  -- Sprint 69 : une prise antidatée ne crée plus de semaine créditable.
  for w in
    select distinct date_trunc('week', (caught_at  at time zone 'Europe/Paris'))::date as wk
      from public.catches
      where user_id = p_user_id
        and public.is_competitive_catch(caught_at, created_at)
    union
    select distinct date_trunc('week', (started_at at time zone 'Europe/Paris'))::date as wk
      from public.outings  where user_id = p_user_id
  loop
    perform public.award_xp(p_user_id, 'week_streak', 20, 'week', md5(w::text)::uuid);
  end loop;
end;
$$;

-- ────────────────────────────────────────────────────────────────────────────
-- 6) Défis : les 3 branches qui lisent catches ne comptent plus que les prises
--    compétitives. La branche outings est inchangée (cf §5).
-- ────────────────────────────────────────────────────────────────────────────

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
      select count(*) into v_progress
      from public.outings
      where user_id = v_uid;

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

-- ────────────────────────────────────────────────────────────────────────────
-- 7) Contrainte miroir « vérifiée exige une photo » (défense en profondeur du
--    Bloc 2 TS ; ferme aussi l'insert PostgREST direct qui posait
--    photo_verified_at à la main). NOT VALID puis VALIDATE : l'inventaire prod
--    au 2026-07-02 est VIDE (0 ligne photo_verified_at sans photo_path), le
--    VALIDATE passe donc sans nettoyage (Bloc 4 sans objet, vérifié à l'ancrage).
-- ────────────────────────────────────────────────────────────────────────────

alter table public.catches
  drop constraint if exists catches_verified_requires_photo;

alter table public.catches
  add constraint catches_verified_requires_photo
  check (photo_verified_at is null or photo_path is not null)
  not valid;

alter table public.catches
  validate constraint catches_verified_requires_photo;

-- ────────────────────────────────────────────────────────────────────────────
-- 8) get_leaderboard : lisible à 1 joueur. Le type de retour change (ajout
--    is_self + eligible_count) → DROP + CREATE (re-grants explicites).
--    Nouveau contrat : la ligne du CALLER opté-in est TOUJOURS renvoyée (même
--    sous le seuil k-anon et même hors du top v_limit) ; les identités TIERCES
--    ne sortent que si eligible_count >= K (k-anon inchangé : un rang + un
--    comptage ne sont pas des identités). En cron/service_role (archive_season),
--    auth.uid() est null → aucune ligne self → comportement d'archivage inchangé.
-- ────────────────────────────────────────────────────────────────────────────

drop function if exists public.get_leaderboard(text, text, text, text, text, integer, integer);

create function public.get_leaderboard(
  p_scope text default 'national',
  p_dept text default null,
  p_species text default null,
  p_period text default 'season',
  p_metric text default 'xp',
  p_limit integer default 50,
  p_season_offset integer default 0
)
returns table(
  rank integer,
  user_id uuid,
  username text,
  avatar_url text,
  metric_value numeric,
  is_self boolean,
  eligible_count integer
)
language plpgsql
stable
security definer
set search_path to 'public'
as $$
declare
  v_uid    uuid := (select auth.uid());
  v_kanon  constant int := 3;
  v_limit  int := least(greatest(coalesce(p_limit, 50), 1), 100);
  v_start  timestamptz;
  v_end    timestamptz;
begin
  if p_period = 'all_time' then
    v_start := null;
    v_end   := null;
  else
    select w.starts_at, w.ends_at into v_start, v_end
    from public.season_window(coalesce(p_season_offset, 0)) w;
  end if;

  return query
  with elig as (
    select p.id as uid, p.username::text as uname, p.avatar_url as avatar
    from public.profiles p
    where p.public_ranking = true
      and (
        p_scope = 'national'
        or (p_scope = 'department' and p_dept is not null and trim(p.home_department) = trim(p_dept))
        or (
          p_scope = 'follows' and v_uid is not null and (
            p.id = v_uid
            or p.id in (select f.following_id from public.follows f where f.follower_id = v_uid)
          )
        )
      )
  ),
  metrics as (
    select
      e.uid, e.uname, e.avatar,
      case p_metric
        when 'catches' then (
          select count(*)::numeric
          from public.catches c
          where c.user_id = e.uid
            and c.privacy = 'public'
            and (v_start is null or c.created_at >= v_start)
            and (v_end   is null or c.created_at <  v_end)
            and (p_species is null or c.species = p_species)
        )
        when 'biggest' then (
          select coalesce(max(c.measured_length_cm), 0)::numeric
          from public.catches c
          where c.user_id = e.uid
            and c.privacy = 'public'
            and c.photo_verified_at is not null
            and c.measured_length_cm is not null
            and (v_start is null or c.created_at >= v_start)
            and (v_end   is null or c.created_at <  v_end)
            and (p_species is null or c.species = p_species)
        )
        when 'diversity' then (
          select count(distinct c.species)::numeric
          from public.catches c
          where c.user_id = e.uid
            and c.privacy = 'public'
            and (v_start is null or c.created_at >= v_start)
            and (v_end   is null or c.created_at <  v_end)
        )
        else (
          case
            when v_start is null then
              coalesce((select up.total_xp from public.user_progress up where up.user_id = e.uid), 0)::numeric
            else
              coalesce((
                select sum(x.points) from public.xp_events x
                where x.user_id = e.uid
                  and x.created_at >= v_start
                  and x.created_at <  v_end
              ), 0)::numeric
          end
        )
      end as mv
    from elig e
  ),
  base as (
    select * from metrics where mv > 0
  ),
  stats as (
    select count(*)::int as n from base
  ),
  ranked as (
    select (rank() over (order by mv desc))::int as rnk, uid, uname, avatar, mv
    from base
  )
  select t.rnk, t.uid, t.uname, t.avatar, t.mv, coalesce(t.uid = v_uid, false) as self, s.n
  from (
    -- Tableau public : top v_limit, seulement si k-anon atteint (ou scope follows).
    (
      select r.rnk, r.uid, r.uname, r.avatar, r.mv
      from ranked r, stats s2
      where p_scope = 'follows' or s2.n >= v_kanon
      order by r.rnk, r.uname
      limit v_limit
    )
    union
    -- Ligne du caller : TOUJOURS (rang visible même seul ou hors du top).
    (
      select r.rnk, r.uid, r.uname, r.avatar, r.mv
      from ranked r
      where v_uid is not null and r.uid = v_uid
    )
  ) t, stats s
  order by t.rnk, t.uname;
end;
$$;

comment on function public.get_leaderboard(text, text, text, text, text, integer, integer) is
  'Classements spot-safe (S66/S67, étendu S69) : + is_self et eligible_count ; la ligne du caller opté-in sort TOUJOURS (même sous le seuil k-anon K=3 : un rang + un comptage ne révèlent aucune identité tierce). Identités tierces gatées k-anon inchangé.';

revoke all on function public.get_leaderboard(text, text, text, text, text, integer, integer) from public, anon;
grant execute on function public.get_leaderboard(text, text, text, text, text, integer, integer) to authenticated, service_role;

-- ────────────────────────────────────────────────────────────────────────────
-- 9) Saisons archivées : petite RPC pour ne proposer dans le sélecteur QUE les
--    saisons passées ayant des résultats réels (une clé de saison est un
--    agrégat calendaire, aucune identité).
-- ────────────────────────────────────────────────────────────────────────────

create or replace function public.get_archived_season_keys()
returns setof text
language sql
stable
security definer
set search_path = public
as $$
  select distinct season_key from public.season_results order by season_key desc;
$$;

comment on function public.get_archived_season_keys() is
  'Clés des saisons archivées (sprint 69) : alimente le sélecteur de saisons des classements (les saisons pré-lancement sans données ne sont plus proposées).';

revoke all on function public.get_archived_season_keys() from public, anon;
grant execute on function public.get_archived_season_keys() to authenticated, service_role;
