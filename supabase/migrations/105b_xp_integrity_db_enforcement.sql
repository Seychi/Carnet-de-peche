-- 105b_xp_integrity_db_enforcement.sql — Sprint 69, fix de la passe adversariale.
--
-- La migration 105 défend le chemin APPLICATIF (server actions). La passe
-- adversariale a démontré que son invariant fondateur — « created_at = temps
-- serveur de confiance » — n'était appliqué NULLE PART au niveau DB : anon et
-- authenticated ont le privilège INSERT sur catches.created_at / caught_at /
-- photo_verified_at, la policy RLS ne borne que user_id, aucun trigger ne force
-- created_at, aucun rate-limit DB. Un POST PostgREST direct (clé publishable +
-- JWT) contournait donc la fenêtre anti-datage, TOUS les plafonds du ledger et
-- TOUS les rate-limits TS d'un coup (gain XP illimité). Vérifié live 2026-07-02.
--
-- Ce fix rend l'économie XP infalsifiable QUELLE QUE SOIT LA SOURCE :
--   1) created_at forcé = now() côté DB (INSERT) et figé (UPDATE) sur catches
--      ET outings → l'antidatage par created_at est impossible ; la fenêtre
--      is_competitive et les plafonds journaliers redeviennent infalsifiables.
--   2) rate-limit DB statement-level sur catches (backstop du rate-limit TS,
--      attrape aussi le méga-batch PostgREST).
--   3) plafond journalier sur personal_best (+30) — seul crédit encore non borné.
--   4) séries : les outings antidatées ne fabriquent plus de semaine active
--      (fenêtre compétitive appliquée à la branche outings, cohérent catches).
--
-- Ce que ce fix NE ferme PAS (résiduels documentés au RECAP, hors périmètre XP) :
--   - la métrique leaderboard « biggest » et le défi « measured » reposent sur
--     une photo auto-déclarée non contrôlée (compromis « mesurée ≠ vérifiée »,
--     sprints 44/48) → nécessite une vérif vision (mobile) ;
--   - recompute_my_badges compte encore les prises sans fenêtre compétitive
--     (badges volume/régularité via bulk antidaté).
--
-- Décision A (098) conservée : aucun XP révoqué, aucun level-down.

-- ────────────────────────────────────────────────────────────────────────────
-- 1) created_at = temps serveur, sur catches ET outings.
--    INSERT : écrase toute valeur client par now(). UPDATE : fige (empêche de
--    re-fenêtrer une prise a posteriori pour la métrique catches/biggest du
--    leaderboard, qui filtre sur created_at). Les server actions ne fournissent
--    jamais created_at → aucun impact sur le flux applicatif normal.
-- ────────────────────────────────────────────────────────────────────────────

create or replace function public.force_server_created_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    new.created_at := now();
  elsif tg_op = 'UPDATE' then
    new.created_at := old.created_at;
  end if;
  return new;
end;
$$;

comment on function public.force_server_created_at() is
  'Sprint 69 (105b) : created_at = temps serveur (INSERT = now(), UPDATE = figé). Neutralise l''antidatage par created_at qui contournait la fenêtre compétitive et les plafonds journaliers via un insert PostgREST direct.';

drop trigger if exists catches_force_created_at on public.catches;
create trigger catches_force_created_at
  before insert or update on public.catches
  for each row execute function public.force_server_created_at();

drop trigger if exists outings_force_created_at on public.outings;
create trigger outings_force_created_at
  before insert or update on public.outings
  for each row execute function public.force_server_created_at();

-- ────────────────────────────────────────────────────────────────────────────
-- 2) Rate-limit DB sur catches (backstop du rate-limit TS, migration 105/actions).
--    STATEMENT-level → une seule évaluation par insert, ET attrape le méga-batch
--    PostgREST (un POST de N milliers de lignes fait exploser le count et
--    déclenche le rollback). Discriminant unitaire/bulk = technique (une prise
--    unitaire a toujours une technique ; un import bulk jamais). Le service_role
--    (seeds dev, crons : auth.uid() null) est EXEMPTÉ. created_at ayant été forcé
--    à now() juste avant (trigger BEFORE), les nouvelles lignes comptent bien
--    dans la fenêtre 24 h.
-- ────────────────────────────────────────────────────────────────────────────

create or replace function public.enforce_catch_rate_limit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid  uuid := (select auth.uid());
  v_unit int;
  v_bulk int;
begin
  -- service_role / cron / seed dev : pas de JWT utilisateur → non soumis.
  if v_uid is null then
    return null;
  end if;

  select
    count(*) filter (where technique is not null),
    count(*) filter (where technique is null)
  into v_unit, v_bulk
  from public.catches
  where user_id = v_uid
    and created_at > now() - interval '24 hours';

  if v_unit > 20 then
    raise exception 'rate_limit_catches'
      using errcode = 'P0001', hint = 'Max 20 prises par 24h.';
  end if;
  if v_bulk > 100 then
    raise exception 'rate_limit_catches_bulk'
      using errcode = 'P0001', hint = 'Max 100 prises importées par 24h.';
  end if;

  return null;
end;
$$;

comment on function public.enforce_catch_rate_limit() is
  'Sprint 69 (105b) : rate-limit DB backstop sur catches (20 unitaires + 100 bulk / 24h), statement-level (attrape le méga-batch PostgREST). service_role exempté (auth.uid() null).';

drop trigger if exists catches_rate_limit on public.catches;
create trigger catches_rate_limit
  after insert on public.catches
  for each statement execute function public.enforce_catch_rate_limit();

-- ────────────────────────────────────────────────────────────────────────────
-- 3) award_catch_xp : + plafond journalier sur personal_best (+30). C'était le
--    seul crédit sans plafond → via des prises « vérifiées » de longueur
--    croissante le même jour, il donnait un gain non borné. Cap 3/jour (aligné
--    sur measured). Le reste de la fonction est IDENTIQUE à la 105.
-- ────────────────────────────────────────────────────────────────────────────

create or replace function public.award_catch_xp(c catches)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  c_max_catch_species_day constant int := 3;  -- +10 « catch » max 3/espèce/jour
  c_max_measured_day      constant int := 3;  -- +15 « measured » max 3/jour
  c_max_released_day      constant int := 5;  -- +4  « released » max 5/jour
  c_max_pb_day            constant int := 3;  -- +30 « personal_best » max 3/jour (105b)
  v_same_day      int;
  v_prior_species int;
  v_prior_best    numeric;
  v_measured_day  int;
  v_released_day  int;
  v_pb_day        int;
  v_meta          jsonb;
begin
  if not public.is_competitive_catch(c.caught_at, c.created_at) then
    return;
  end if;

  v_meta := jsonb_build_object(
    'species',            c.species,
    'measured_length_cm', c.measured_length_cm,
    'caught_at',          c.caught_at
  );

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
    ),
    count(*) filter (
      where e.kind = 'personal_best'
        and date_trunc('day', e.created_at) = date_trunc('day', c.created_at)
    )
  into v_same_day, v_prior_species, v_prior_best, v_measured_day, v_released_day, v_pb_day
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
     and c.measured_length_cm > v_prior_best
     and v_pb_day < c_max_pb_day then
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
  'Crédite l''XP d''une prise (trigger 098, réécrit S69 105/105b) : compteurs sur le LEDGER, fenêtre anti-datage, plafonds catch 3/espèce/jour + measured 3/jour + released 5/jour + personal_best 3/jour, new_species 1×/espèce à vie.';

-- ────────────────────────────────────────────────────────────────────────────
-- 4) Séries : les OUTINGS antidatées ne fabriquent plus de semaine active
--    (fenêtre compétitive appliquée à la branche outings, comme aux catches en
--    105). Impact prod = nul (1 seule outing, compétitive). created_at des
--    outings étant désormais serveur (§1), la fenêtre est infalsifiable.
--    Le reste des fonctions est IDENTIQUE à la 105.
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
      select distinct date_trunc('week', (caught_at  at time zone 'Europe/Paris'))::date as w
        from public.catches
        where user_id = p_user_id
          and public.is_competitive_catch(caught_at, created_at)
      union
      select distinct date_trunc('week', (started_at at time zone 'Europe/Paris'))::date as w
        from public.outings
        where user_id = p_user_id
          and public.is_competitive_catch(started_at, created_at)
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
  -- S69 : ni prise NI outing antidatée ne crée de semaine créditable.
  for w in
    select distinct date_trunc('week', (caught_at  at time zone 'Europe/Paris'))::date as wk
      from public.catches
      where user_id = p_user_id
        and public.is_competitive_catch(caught_at, created_at)
    union
    select distinct date_trunc('week', (started_at at time zone 'Europe/Paris'))::date as wk
      from public.outings
      where user_id = p_user_id
        and public.is_competitive_catch(started_at, created_at)
  loop
    perform public.award_xp(p_user_id, 'week_streak', 20, 'week', md5(w::text)::uuid);
  end loop;
end;
$$;
