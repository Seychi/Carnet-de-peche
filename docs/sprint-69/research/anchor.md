# Sprint 69 — Bloc 0 : ancrage lecture (2026-07-02)

> Livrable du workstream A. Trois rapports d'agents en lecture seule : DB prod live
> (supabase-guard), code TS prises, code TS classements. Les definitions SQL sont
> collees VERBATIM depuis pg_get_functiondef (prod glgciwwnpmgifyhbvxsw).

# RAPPORT D'ANCRAGE DB — Sprint 69 « intégrité XP » (prod glgciwwnpmgifyhbvxsw, lecture seule, 2026-07-02)

## 1. Définitions de fonctions (pg_get_functiondef, VERBATIM)

Inventaire des fonctions public matchant `%streak%|%challenge%|%leaderboard%|%season%|%xp%` (hors bruit PostGIS/citext `_st_expand`, `st_expand`, `regexp_*`) :
`archive_season(integer)`, `award_catch_xp(catches)`, `award_xp(uuid,text,integer,text,uuid)`, `catches_award_xp_tg()`, `catches_refresh_streak_tg()`, `compute_user_week_streak(uuid,date)`, `get_leaderboard(text,text,text,text,text,integer,integer)`, `get_my_streak()`, `get_season_results(text,text,text,text,integer)`, `get_user_streak(uuid)`, `get_user_xp(uuid)`, `outings_refresh_streak_tg()`, `recompute_my_challenges()`, `refresh_user_streak(uuid)`, `season_window(integer)`. (+ `recompute_my_badges()` dumpée car elle lit `photo_verified_at`.)

### award_xp
```sql
CREATE OR REPLACE FUNCTION public.award_xp(p_user_id uuid, p_kind text, p_points integer, p_ref_type text DEFAULT NULL::text, p_ref_id uuid DEFAULT NULL::uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  if p_user_id is null then
    return;
  end if;

  insert into public.xp_events (user_id, kind, points, ref_type, ref_id)
  values (p_user_id, p_kind, p_points, p_ref_type, p_ref_id)
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
$function$
```

### award_catch_xp
```sql
CREATE OR REPLACE FUNCTION public.award_catch_xp(c catches)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_prior_species int;
  v_prior_best    smallint;
  v_same_day      int;
begin
  select
    count(*) filter (where x.species is not distinct from c.species),
    max(x.measured_length_cm) filter (
      where x.species is not distinct from c.species
        and x.photo_verified_at is not null
    ),
    count(*) filter (
      where x.species is not distinct from c.species
        and date_trunc('day', x.created_at) = date_trunc('day', c.created_at)
    )
  into v_prior_species, v_prior_best, v_same_day
  from public.catches x
  where x.user_id = c.user_id
    and (x.created_at, x.id) < (c.created_at, c.id);

  if v_same_day < 3 then
    perform public.award_xp(c.user_id, 'catch', 10, 'catch', c.id);
  end if;

  if v_prior_species = 0 then
    perform public.award_xp(c.user_id, 'new_species', 50, 'catch', c.id);
  end if;

  if c.photo_verified_at is not null
     and c.measured_length_cm is not null
     and v_prior_best is not null
     and c.measured_length_cm > v_prior_best then
    perform public.award_xp(c.user_id, 'personal_best', 30, 'catch', c.id);
  end if;

  if c.photo_verified_at is not null then
    perform public.award_xp(c.user_id, 'measured', 15, 'catch', c.id);
  end if;

  if c.released is true then
    perform public.award_xp(c.user_id, 'released', 4, 'catch', c.id);
  end if;
end;
$function$
```

### catches_award_xp_tg
```sql
CREATE OR REPLACE FUNCTION public.catches_award_xp_tg()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  perform public.award_catch_xp(new);
  return null;
end;
$function$
```

### get_user_xp
```sql
CREATE OR REPLACE FUNCTION public.get_user_xp(p_user_id uuid)
 RETURNS bigint
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select coalesce((select total_xp from public.user_progress where user_id = p_user_id), 0::bigint);
$function$
```

### compute_user_week_streak
```sql
CREATE OR REPLACE FUNCTION public.compute_user_week_streak(p_user_id uuid, p_asof date DEFAULT CURRENT_DATE)
 RETURNS TABLE(current_streak integer, longest_streak integer, last_week date, joker_month date)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
        from public.catches  where user_id = p_user_id
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
$function$
```

### refresh_user_streak
```sql
CREATE OR REPLACE FUNCTION public.refresh_user_streak(p_user_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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

  for w in
    select distinct date_trunc('week', (caught_at  at time zone 'Europe/Paris'))::date as wk
      from public.catches  where user_id = p_user_id
    union
    select distinct date_trunc('week', (started_at at time zone 'Europe/Paris'))::date as wk
      from public.outings  where user_id = p_user_id
  loop
    perform public.award_xp(p_user_id, 'week_streak', 20, 'week', md5(w::text)::uuid);
  end loop;
end;
$function$
```

### catches_refresh_streak_tg / outings_refresh_streak_tg
```sql
CREATE OR REPLACE FUNCTION public.catches_refresh_streak_tg()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  perform public.refresh_user_streak(new.user_id);
  return null;
end;
$function$
```
```sql
CREATE OR REPLACE FUNCTION public.outings_refresh_streak_tg()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  perform public.refresh_user_streak(new.user_id);
  return null;
end;
$function$
```

### get_my_streak
```sql
CREATE OR REPLACE FUNCTION public.get_my_streak()
 RETURNS json
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_uid          uuid := auth.uid();
  v_current      int;
  v_longest      int;
  v_last         date;
  v_joker        date;
  v_active_days  bigint;
  v_active_weeks bigint;
  v_cur_week     date  := date_trunc('week', current_date::timestamp)::date;
  v_days_left    int;
  v_joker_avail  boolean;
begin
  if v_uid is null then
    return json_build_object(
      'activeDays', 0, 'activeWeeks', 0, 'longestWeekStreak', 0,
      'currentWeekStreak', 0, 'weekActiveNow', false, 'daysLeftThisWeek', 0, 'jokerAvailable', true);
  end if;

  select current_streak, longest_streak, last_week, joker_month
    into v_current, v_longest, v_last, v_joker
  from public.compute_user_week_streak(v_uid, current_date);

  select
    count(distinct d), count(distinct date_trunc('week', d::timestamp)::date)
    into v_active_days, v_active_weeks
  from (
    select (caught_at  at time zone 'Europe/Paris')::date as d from public.catches where user_id = v_uid
    union
    select (started_at at time zone 'Europe/Paris')::date as d from public.outings where user_id = v_uid
  ) x;

  v_days_left := 8 - extract(isodow from current_date)::int;
  v_joker_avail := (v_joker is distinct from date_trunc('month', current_date)::date);

  return json_build_object(
    'activeDays',        coalesce(v_active_days, 0),
    'activeWeeks',       coalesce(v_active_weeks, 0),
    'longestWeekStreak', coalesce(v_longest, 0),
    'currentWeekStreak', coalesce(v_current, 0),
    'weekActiveNow',     (v_last is not null and v_last = v_cur_week),
    'daysLeftThisWeek',  greatest(v_days_left, 0),
    'jokerAvailable',    v_joker_avail
  );
end;
$function$
```

### get_user_streak
```sql
CREATE OR REPLACE FUNCTION public.get_user_streak(p_user_id uuid)
 RETURNS integer
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select coalesce(
    (select current_streak from public.compute_user_week_streak(p_user_id, current_date)),
    0);
$function$
```

### recompute_my_challenges
```sql
CREATE OR REPLACE FUNCTION public.recompute_my_challenges()
 RETURNS SETOF user_challenge_progress
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
        and caught_at <  v_month_end;
      v_ref_type := 'challenge_month';
      v_ref_id   := md5(ch.id::text || v_month_key)::uuid;

    elsif (ch.criteria->>'type') = 'measured_catch' then
      select count(*) into v_progress
      from public.catches
      where user_id = v_uid and photo_verified_at is not null;

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
        and (ch.period_end   is null or caught_at <  (ch.period_end + interval '1 day'));

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
$function$
```

### season_window
```sql
CREATE OR REPLACE FUNCTION public.season_window(p_offset integer DEFAULT 0)
 RETURNS TABLE(season_key text, starts_at timestamp with time zone, ends_at timestamp with time zone)
 LANGUAGE sql
 STABLE
 SET search_path TO 'public'
AS $function$
  with b as (
    select date_trunc(
      'quarter',
      (now() at time zone 'Europe/Paris') + make_interval(months => coalesce(p_offset, 0) * 3)
    ) as q_local
  )
  select
    extract(year from q_local)::int || '-Q' || extract(quarter from q_local)::int as season_key,
    (q_local at time zone 'Europe/Paris')                          as starts_at,
    ((q_local + interval '3 months') at time zone 'Europe/Paris')  as ends_at
  from b;
$function$
```

### archive_season
```sql
CREATE OR REPLACE FUNCTION public.archive_season(p_offset integer DEFAULT '-1'::integer)
 RETURNS TABLE(kind text, o_user_id uuid, o_season_key text, o_rank integer, o_metric_value numeric)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_key    text;
  v_metric text;
  v_dept   text;
  v_fresh  jsonb;
begin
  select w.season_key into v_key from public.season_window(coalesce(p_offset, -1)) w;

  with ins as (
    insert into public.season_results (season_key, scope, metric, dept, species, rank, user_id, metric_value)
    select v_key, 'national', 'xp', '', '', l.rank, l.user_id, l.metric_value
    from public.get_leaderboard('national', null, null, 'season', 'xp', 10, p_offset) l
    on conflict (season_key, scope, metric, dept, species, user_id) do nothing
    returning user_id, rank, metric_value
  )
  select coalesce(
    jsonb_agg(jsonb_build_object('user_id', user_id, 'rank', rank, 'metric_value', metric_value) order by rank),
    '[]'::jsonb
  ) into v_fresh from ins;

  foreach v_metric in array array['catches', 'biggest', 'diversity'] loop
    insert into public.season_results (season_key, scope, metric, dept, species, rank, user_id, metric_value)
    select v_key, 'national', v_metric, '', '', l.rank, l.user_id, l.metric_value
    from public.get_leaderboard('national', null, null, 'season', v_metric, 10, p_offset) l
    on conflict (season_key, scope, metric, dept, species, user_id) do nothing;
  end loop;

  for v_dept in
    select distinct trim(home_department)
    from public.profiles
    where public_ranking = true and home_department is not null
  loop
    foreach v_metric in array array['xp', 'catches', 'biggest', 'diversity'] loop
      insert into public.season_results (season_key, scope, metric, dept, species, rank, user_id, metric_value)
      select v_key, 'department', v_metric, v_dept, '', l.rank, l.user_id, l.metric_value
      from public.get_leaderboard('department', v_dept, null, 'season', v_metric, 10, p_offset) l
      on conflict (season_key, scope, metric, dept, species, user_id) do nothing;
    end loop;
  end loop;

  insert into public.user_badges (user_id, badge_slug, tier, target, progress)
  select sr.user_id, 'season_champion', 1, 1, 1
  from public.season_results sr
  where sr.season_key = v_key and sr.scope = 'national' and sr.metric = 'xp'
    and sr.dept = '' and sr.species = '' and sr.rank = 1
  on conflict (user_id, badge_slug) do nothing;

  return query
  select
    (case when (e->>'rank')::int = 1 then 'champion' else 'recap' end)::text,
    (e->>'user_id')::uuid,
    v_key,
    (e->>'rank')::int,
    (e->>'metric_value')::numeric
  from jsonb_array_elements(v_fresh) e;
end;
$function$
```

### recompute_my_badges (bonus, lit photo_verified_at)
```sql
CREATE OR REPLACE FUNCTION public.recompute_my_badges()
 RETURNS SETOF user_badges
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_uid          uuid := auth.uid();
  v_total        bigint;
  v_species      bigint;
  v_released     bigint;
  v_active_weeks bigint;
  v_measured     bigint;
  v_seasons      bigint;
begin
  if v_uid is null then
    raise exception 'Non authentifié';
  end if;

  select
    count(*),
    count(distinct species),
    count(*) filter (where released is true),
    count(distinct date_trunc('week', caught_at)),
    count(*) filter (where photo_verified_at is not null),
    count(distinct ((extract(month from caught_at)::int % 12) / 3))
  into v_total, v_species, v_released, v_active_weeks, v_measured, v_seasons
  from public.catches
  where user_id = v_uid;

  insert into public.user_badges (user_id, badge_slug, tier, target, progress)
  select v_uid, b.slug, b.tier, b.target, b.metric
  from (values
    ('first_catch',   1::smallint, 1,   v_total::int,        (v_total        >= 1)),
    ('volume_10',     1::smallint, 10,  v_total::int,        (v_total        >= 10)),
    ('volume_50',     2::smallint, 50,  v_total::int,        (v_total        >= 50)),
    ('volume_200',    3::smallint, 200, v_total::int,        (v_total        >= 200)),
    ('species_5',     1::smallint, 5,   v_species::int,      (v_species      >= 5)),
    ('species_10',    2::smallint, 10,  v_species::int,      (v_species      >= 10)),
    ('species_26',    3::smallint, 26,  v_species::int,      (v_species      >= 26)),
    ('release_10',    1::smallint, 10,  v_released::int,     (v_released     >= 10)),
    ('release_50',    2::smallint, 50,  v_released::int,     (v_released     >= 50)),
    ('regularity_4',  1::smallint, 4,   v_active_weeks::int, (v_active_weeks >= 4)),
    ('regularity_12', 2::smallint, 12,  v_active_weeks::int, (v_active_weeks >= 12)),
    ('regularity_52', 3::smallint, 52,  v_active_weeks::int, (v_active_weeks >= 52)),
    ('seasons_all',   1::smallint, 4,   v_seasons::int,      (v_seasons      >= 4)),
    ('prise_mesuree', 1::smallint, 1,   v_measured::int,     (v_measured     >= 1))
  ) as b(slug, tier, target, metric, earned)
  where b.earned
  on conflict (user_id, badge_slug) do nothing;

  return query
    select * from public.user_badges where user_id = v_uid order by tier desc, earned_at;
end;
$function$
```

## 2. Triggers sur public.catches (tous, non-internes)

```
catches_award_xp        CREATE TRIGGER catches_award_xp AFTER INSERT ON public.catches FOR EACH ROW EXECUTE FUNCTION catches_award_xp_tg()
catches_blur            CREATE TRIGGER catches_blur BEFORE INSERT OR UPDATE OF geom ON public.catches FOR EACH ROW EXECUTE FUNCTION blur_catch_geom()
catches_broadcast_heat  CREATE TRIGGER catches_broadcast_heat AFTER INSERT OR UPDATE OF privacy ON public.catches FOR EACH ROW EXECUTE FUNCTION broadcast_public_catch()
catches_refresh_streak  CREATE TRIGGER catches_refresh_streak AFTER INSERT ON public.catches FOR EACH ROW EXECUTE FUNCTION catches_refresh_streak_tg()
catches_updated_at      CREATE TRIGGER catches_updated_at BEFORE UPDATE ON public.catches FOR EACH ROW EXECUTE FUNCTION touch_updated_at()
```
**Trigger DELETE : NON, il n'y en a AUCUN** (rien sur DELETE ; XP/streaks ne réagissent qu'à INSERT).

## 3. xp_events

Colonnes (information_schema) :
```
id          bigint       NOT NULL  (pas de default visible côté information_schema — identity/sequence)
user_id     uuid         NOT NULL
kind        text         NOT NULL
points      integer      NOT NULL
ref_type    text         NULL
ref_id      uuid         NULL
created_at  timestamptz  NOT NULL  DEFAULT now()
```

Contraintes (pg_constraint) :
```
xp_events_pkey                              PRIMARY KEY (id)
xp_events_user_id_fkey                      FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
xp_events_user_id_kind_ref_type_ref_id_key  UNIQUE (user_id, kind, ref_type, ref_id)   ← OUI, elle existe
```
Note : contrainte UNIQUE classique → deux lignes avec `ref_type`/`ref_id` NULL ne se dédupliquent PAS (sémantique NULL). En pratique `award_xp` passe toujours ref_type/ref_id non nuls dans les appels observés.

RLS : `relrowsecurity=true`, `relforcerowsecurity=false`. Policies :
```
xp_events_select_own  SELECT  {authenticated}  qual: (user_id = ( SELECT auth.uid() AS uid))
```
(aucune policy INSERT/UPDATE/DELETE → écriture uniquement via definer/service_role.)

EXECUTE (has_function_privilege) :
| rôle | award_xp | award_catch_xp | get_user_xp | get_leaderboard | get_season_results | recompute_my_challenges | archive_season |
|---|---|---|---|---|---|---|---|
| anon | **false** | **false** | true | false | false | false | false |
| authenticated | **false** | **false** | true | true | true | true | false |
| service_role | true | true | true | true | true | true | true |

## 4. user_progress

Colonnes :
```
user_id              uuid         NOT NULL   (PK)
total_xp             bigint       NOT NULL   DEFAULT 0
current_week_streak  integer      NOT NULL   DEFAULT 0
longest_week_streak  integer      NOT NULL   DEFAULT 0
last_active_week     date         NULL
updated_at           timestamptz  NOT NULL   DEFAULT now()
```
RLS ON (force off). Policies :
```
user_progress_select_own  SELECT  {authenticated}  qual: (user_id = ( SELECT auth.uid() AS uid))
```

## 5. Vérification des 3 trous du brief

**(a) Compteurs sur les lignes VIVANTES : CONFIRMÉ.** Dans `award_catch_xp` live, `v_prior_species` / `v_prior_best` / `v_same_day` sont calculés sur `public.catches` (table directe, donc uniquement les prises encore existantes), lignes exactes :
```sql
  into v_prior_species, v_prior_best, v_same_day
  from public.catches x
  where x.user_id = c.user_id
    and (x.created_at, x.id) < (c.created_at, c.id);
```
Conséquence factuelle : supprimer une prise ne retire aucun XP (pas de trigger DELETE, cf §2) ET fait « oublier » cette prise dans les compteurs des inserts futurs → delete + re-log peut re-déclencher `new_species` (50 XP) / `personal_best` (30 XP) / contourner le plafond `v_same_day < 3`, dédup `award_xp` inopérante car le nouveau `c.id` est différent. Même logique « table vivante » dans `recompute_my_challenges`, `recompute_my_badges`, `compute_user_week_streak`/`refresh_user_streak` (les XP `week_streak` déjà accordés persistent, clé `md5(semaine)` stable).

**(b) Condition photo_path côté SQL posant photo_verified_at : NON, AUCUNE.** Recherche `prosrc ilike '%photo_path%'` sur tout `public` → **0 fonction**. `photo_verified_at` n'apparaît qu'en LECTURE dans 4 fonctions : `award_catch_xp`, `get_leaderboard`, `recompute_my_badges`, `recompute_my_challenges`. Aucun trigger/fonction SQL ne POSE `photo_verified_at` → il est posé côté app (server action), et rien en DB ne lie `photo_verified_at` à la présence de `photo_path`.

**(c) Rate-limit DB sur catches : NON.** Aucun trigger rate-limit sur `public.catches` (cf liste §2). Modèle existant sur feed_posts :
```
CREATE TRIGGER feed_posts_rate_limit BEFORE INSERT ON public.feed_posts FOR EACH ROW EXECUTE FUNCTION enforce_feed_post_rate_limit()
```
```sql
CREATE OR REPLACE FUNCTION public.enforce_feed_post_rate_limit()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  if (
    select count(*)
    from public.feed_posts
    where author_id = new.author_id
      and created_at > now() - interval '24 hours'
  ) >= 10 then
    raise exception 'rate_limit_posts'
      using errcode = 'P0001',
            hint = 'Max 10 posts par 24h.';
  end if;
  return new;
end;
$function$
```

## 6. Contenu réel (prod, 2026-07-02)

- `xp_events` total : **59**. Par kind :
```
catch        21   (210 pts)
new_species  13   (650 pts)
week_streak  12   (240 pts)
released      9   ( 36 pts)
challenge     3   (115 pts)
measured      1   ( 15 pts)
              --  total points = 1266
```
  ⚠️ Anomalie de barème observable : 21 événements `catch` mais 1 seul `measured` alors que le kind `personal_best` n'existe pas encore en données (0 ligne) — cohérent avec « personal_best gaté photo-vérifié » et très peu de prises photo-vérifiées.
- **Inventaire Bloc 4** : catches avec `photo_verified_at IS NOT NULL AND photo_path IS NULL` → **count = 0**. Aucune ligne, donc pas d'inventaire user_id/username/dates à produire (l'incohérence supposée n'existe pas en prod aujourd'hui).
- Profils `public_ranking = true` : **1**.

## 7. get_leaderboard + get_season_results

Définitions complètes ci-dessus impossibles à dupliquer sans redite — les voici :

- `get_leaderboard(text,text,text,text,text,integer,integer)` : `provolatile='s'` (STABLE), `prosecdef=true` (SECURITY DEFINER), `SET search_path TO 'public'`. EXECUTE : authenticated ✓, anon ✗, service_role ✓. Def verbatim :
```sql
CREATE OR REPLACE FUNCTION public.get_leaderboard(p_scope text DEFAULT 'national'::text, p_dept text DEFAULT NULL::text, p_species text DEFAULT NULL::text, p_period text DEFAULT 'season'::text, p_metric text DEFAULT 'xp'::text, p_limit integer DEFAULT 50, p_season_offset integer DEFAULT 0)
 RETURNS TABLE(rank integer, user_id uuid, username text, avatar_url text, metric_value numeric)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
  ranked as (
    select (rank() over (order by mv desc))::int as rnk, uid, uname, avatar, mv
    from base
  )
  select r.rnk, r.uid, r.uname, r.avatar, r.mv
  from ranked r
  where p_scope = 'follows' or (select count(*) from base) >= v_kanon
  order by r.rnk, r.uname
  limit v_limit;
end;
$function$
```
  Note d'intégrité : les métriques `catches`/`biggest`/`diversity` du leaderboard filtrent sur `c.created_at` (pas `caught_at`) et sur la table vivante ; le kind `xp` en saison lit `xp_events.created_at` (ledger, donc résilient aux deletes de prises, MAIS les XP frauduleusement re-gagnés y restent).

- `get_season_results(text,text,text,text,integer)` : `provolatile='s'` (STABLE), `prosecdef=true`, `SET search_path TO 'public'`. EXECUTE : authenticated ✓, anon ✗, service_role ✓. Def verbatim :
```sql
CREATE OR REPLACE FUNCTION public.get_season_results(p_season_key text, p_scope text DEFAULT 'national'::text, p_metric text DEFAULT 'xp'::text, p_dept text DEFAULT NULL::text, p_limit integer DEFAULT 10)
 RETURNS TABLE(rank integer, user_id uuid, username text, avatar_url text, metric_value numeric)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select sr.rank, sr.user_id, p.username::text, p.avatar_url, sr.metric_value
  from public.season_results sr
  join public.profiles p on p.id = sr.user_id
  where sr.season_key = p_season_key
    and sr.scope      = p_scope
    and sr.metric     = p_metric
    and sr.dept       = trim(coalesce(p_dept, ''))
    and sr.species    = ''
    and p.public_ranking = true
  order by sr.rank, p.username
  limit least(greatest(coalesce(p_limit, 10), 1), 100);
$function$
```

## 8. Baseline advisors (à comparer post-migration ; fichiers bruts : `C:\Users\johns\.claude\projects\c--Users-johns-Carnet-de-peche\3bcd0e2c-c6d0-4f37-8e8f-eb1b3c01f384\tool-results\mcp-supabase-get_advisors-1782981342221.txt` (security), `...\toolu_01S3yTCVFSfQ6QhxuRhG8VQW.json` (performance), agrégat `...\bis3oya44.txt`)

**SECURITY — 95 lints :**
```
ERROR | rls_disabled_in_public                              : 1
ERROR | security_definer_view                               : 2
INFO  | rls_enabled_no_policy                               : 1
WARN  | anon_security_definer_function_executable           : 36
WARN  | auth_leaked_password_protection                     : 1   (HIBP OFF assumé, plan Free — ne pas re-signaler)
WARN  | authenticated_security_definer_function_executable  : 48
WARN  | extension_in_public                                 : 3   (citext, postgis, pg_trgm)
WARN  | function_search_path_mutable                        : 3   (stripe.set_updated_at, stripe.set_updated_at_metadata, stripe.check_rate_limit — schéma stripe managé, pas public)
```
ERROR (3, tous PRÉ-EXISTANTS et assumés) :
- `security_definer_view` : `public.catches_for_viewer` (assumé, migration 047 §3)
- `security_definer_view` : `public.spots_for_viewer` (assumé)
- `rls_disabled_in_public` : `public.spatial_ref_sys` (table système PostGIS)

INFO notable : `public.season_results` a RLS ON mais **0 policy** — c'est VOULU (verrou sprint 67, lecture uniquement via `get_season_results` definer filtrant l'opt-out).

**PERFORMANCE — 79 lints, 0 ERROR :**
```
INFO | unindexed_foreign_keys       : 1   (stripe._managed_webhooks.fk_managed_webhooks_account — schéma stripe managé)
INFO | unused_index                 : 48
WARN | multiple_permissive_policies : 30
```

## Synthèse des faits clés pour le brief sprint 69

1. Le trou (a) est **confirmé dans le code live** : compteurs anti-farm calculés sur `public.catches` vivantes + aucun trigger DELETE → delete/re-log = re-farm de `new_species`/`personal_best`/plafond quotidien.
2. Le trou (b) est **confirmé** : rien côté SQL ne pose `photo_verified_at` ni ne le conditionne à `photo_path` ; mais l'inventaire Bloc 4 est **vide en prod (0 ligne incohérente)**.
3. Le trou (c) est **confirmé** : pas de rate-limit DB sur catches ; modèle `enforce_feed_post_rate_limit` (BEFORE INSERT, count 24h, ≥10 → exception P0001) prêt à imiter.
4. Dédup XP : `UNIQUE (user_id, kind, ref_type, ref_id)` existe et `award_xp` fait `on conflict do nothing` + n'incrémente `user_progress` que si `found` — l'idempotence est saine à ref_id CONSTANT ; elle ne protège pas contre un nouveau `catch.id`.
5. Écritures XP verrouillées : `award_xp`/`award_catch_xp` non exécutables par anon/authenticated ; xp_events/user_progress = RLS ON, SELECT own uniquement, 0 policy d'écriture.
6. Volumes prod : 59 xp_events (catch 21 / new_species 13 / week_streak 12 / released 9 / challenge 3 / measured 1, `personal_best` = 0 ligne), 1 seul profil `public_ranking=true`.

---

# Rapport d'ancrage CODE TS — Sprint 69 (photo obligatoire pour « vérifiée » + rate-limit prises)

## 1. lib/catches/actions.ts — structure complète

Fichier `'use server'`, exports : `createCatch`, `updateCatch`, `markCatchDeclared`, `deleteCatch`, `uploadCatchPhoto`, `bulkCreateCatches`.

### createCatch (lib/catches/actions.ts:103-265)

Signature :
```ts
export async function createCatch(
  input: CreateCatchInput
): Promise<{ id: string; celebration?: CatchCelebration } | { error: string }>
```
- Validation : `createCatchSchema.safeParse(input)` (l.106-110), messages zod joints par virgule.
- Auth `supabase.auth.getUser()` (l.114-117), gardes `assertGearOwnership` (l.121-124) et `assertSpotAccessible` (l.125-128) AVANT insert.
- **Pose de photo_verified_at** (l.145-163) — LE point central pour le sprint :
```ts
// l.149-152
const isMeasured =
  data.is_measured === true &&
  data.measured_length_cm !== undefined &&
  !!data.reference_object
// l.163 (dans l'insert)
photo_verified_at: isMeasured ? new Date().toISOString() : null,
```
⚠️ **La photo n'entre PAS dans le calcul** : `data.photo_path` est inséré à part (l.180 `photo_path: data.photo_path ?? null`) mais `isMeasured` ne le teste pas. Aujourd'hui une prise peut être « mesurée » (photo_verified_at posé) SANS photo.
- Post-insert best-effort STRICT (ordre) : `notifyFollowersOfPublicCatch` si public (l.197-203), `recomputeSoloChallenges` (l.208-218), `buildCatchCelebration` S61 (l.223-237, utilise `measuredLength = isMeasured ? data.measured_length_cm : null`), `emitDopamineNotifications` (l.246-255), `emitRankChangeNotifications` (l.257-261), puis `revalidatePath('/carnet')` et retour `{ id, celebration? }` (l.263-264).
- **Aucun rate-limit** : ni count applicatif ni trigger DB sur `catches` (seul trigger insert existant = XP mig. 098).

### updateCatch (lib/catches/actions.ts:269-413)

- Validation `updateCatchSchema` (partial + id). Fetch de l'existant l.285-290 sélectionne `photo_verified_at` :
```ts
.select('id, photo_path, measured_length_cm, reference_object, photo_verified_at, privacy')
```
- **Chemin photo_verified_at à l'update** (l.332-352) : recalcul UNIQUEMENT si un champ de mesure est soumis :
```ts
// l.338-352
const measurementTouched =
  data.is_measured !== undefined ||
  data.measured_length_cm !== undefined ||
  data.reference_object !== undefined
if (measurementTouched) {
  const effLength = data.measured_length_cm !== undefined ? data.measured_length_cm : existing.measured_length_cm
  const effReference = data.reference_object !== undefined ? data.reference_object : existing.reference_object
  const wantsMeasured =
    data.is_measured !== undefined ? data.is_measured : existing.photo_verified_at !== null
  payload.photo_verified_at =
    wantsMeasured && effLength != null && !!effReference ? new Date().toISOString() : null
}
```
⚠️ Même trou : la photo (existante ou soumise, `data.photo_path` l.370) n'entre pas dans le recalcul. Un update peut aussi RE-poser un timestamp neuf sur une prise déjà mesurée (new Date() à chaque recalcul).
- Suite : update scopé `eq('id').eq('user_id')` (l.372-376), suppression ancienne photo Storage si remplacée (l.384-395), notif followers sur transition vers public (l.401-408), revalidate `/carnet` + `/carnet/[id]`.

### bulkCreateCatches (lib/catches/actions.ts:547-606)

- Validation `bulkCatchSchema` (l.550-554), auth, puis map des payloads (l.567-592). **NE pose PAS photo_verified_at** (absent du payload → défaut colonne null), pas de `measured_length_cm`, pas de `photo_path`. Champs : species, caught_at, size_cm, technique:null, released:false, location_method:'manual', geom = point mer du dépt, privacy:'private', conditions dénormalisées.
- **Aucun rate-limit** non plus : le seul plafond est zod `.max(50)` PAR APPEL (schema.ts:209) — rejouable à l'infini. À noter pour le sprint : bulk = 50 prises/appel, un rate-limit « prises/24h » doit décider s'il compte le bulk.

### deleteCatch (l.449-496) : fetch photo_path scopé user, delete scopé user, remove Storage best-effort. Rien lié au sprint.

### uploadCatchPhoto (l.505-543) : garde 1,8 Mo + `image/webp` only, path `${user.id}/${uuid}.webp` dans bucket `catches`, retourne `{ path }`.

### Tous les écrivains de photo_verified_at (grep repo)
- `lib/catches/actions.ts:163` (createCatch) et `:350` (updateCatch) — **les 2 seuls écrivains TS**.
- Lecteurs : `lib/gamification/{queries,badges,challenges,celebration}`, `components/catches/{CatchCard,CatchRowItem,CatchForm}`, `app/(app)/carnet/[id]/page.tsx:213`.

## 2. lib/catches/schema.ts — schéma mesure

Champs (l.44-77 dans `catchFieldsNoDefaults`) :
```ts
size_cm: z.number().min(10).max(200).optional(),
weight_kg: z.number().min(0.05).max(30).optional(),
measured_length_cm: z.number().int()
  .min(10, { error: 'La longueur mesurée doit faire au moins 10 cm.' })
  .max(250, { error: 'La longueur mesurée doit faire au plus 250 cm.' })
  .optional(),
reference_object: z.string().trim().max(120).optional(),
is_measured: z.boolean().optional(),   // champ de FORMULAIRE, pas une colonne
...
photo_path: z.string().optional(),
```
Refinement existant `refineMeasured` (l.96-115) — appliqué par `catchBaseSchema` (l.118, mode édition du form) ET `createCatchSchema` (l.120-121) ; **jamais sur `updateCatchSchema`** (l.171 = `.partial()` sans superRefine) :
```ts
function refineMeasured(data, ctx) {
  if (!data.is_measured) return
  if (data.measured_length_cm === undefined) ctx.addIssue({ code: 'custom',
    message: 'Renseigne la longueur mesurée (ou décoche « Prise mesurée »).', path: ['measured_length_cm'] })
  if (!data.reference_object || data.reference_object.trim().length === 0) ctx.addIssue({ code: 'custom',
    message: 'Indique l’objet de référence visible sur la photo (ou décoche « Prise mesurée »).', path: ['reference_object'] })
}
```
→ Pour « photo obligatoire », le point d'extension naturel = ajouter un check `photo_path` dans `refineMeasured`… MAIS attention : en création, `photo_path` est injecté par `onSubmit` APRÈS la validation RHF (voir §4) — la photo n'est pas dans les `data` validées par le resolver client (le fichier vit dans `photoFile` state). Le check zod ne mordra côté client que si on synchronise `photo_path`/un flag photo dans le form, sinon seul le safeParse serveur (qui reçoit `photo_path`) le verra.

## 3. Pattern rate-limit du fil (à répliquer)

app/actions/feed.ts:23-46 :
```ts
// le même plafond est appliqué en backstop par les triggers DB
// feed_posts_rate_limit / feed_comments_rate_limit.
const MAX_POSTS_PER_24H = 10
const MAX_COMMENTS_PER_24H = 50
const POST_LIMIT_MSG = 'Doucement moussaillon : 10 posts en 24h, c’est le max. Reviens demain 🎣'

async function countLast24h(supabase, table: 'feed_posts' | 'feed_comments', userId: string): Promise<number> {
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
  const { count } = await supabase.from(table)
    .select('id', { count: 'exact', head: true })
    .eq('author_id', userId)
    .gte('created_at', since)
  return count ?? 0
}
```
Appel dans createPost (feed.ts:138-141) :
```ts
if ((await countLast24h(supabase, 'feed_posts', user.id)) >= MAX_POSTS_PER_24H) {
  return fail(POST_LIMIT_MSG)
}
```
+ mapping de l'erreur trigger à l'insert (feed.ts:161) : `if (error?.message.includes('rate_limit_posts')) return fail(POST_LIMIT_MSG)`. Idem commentaires (feed.ts:288-291, 300).

Backstop DB — supabase/migrations/022_social_free.sql:48-98 :
```sql
create or replace function public.enforce_feed_post_rate_limit()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if (select count(*) from public.feed_posts
      where author_id = new.author_id
        and created_at > now() - interval '24 hours') >= 10 then
    raise exception 'rate_limit_posts' using errcode = 'P0001', hint = 'Max 10 posts par 24h.';
  end if;
  return new;
end; $$;

create trigger feed_posts_rate_limit
  before insert on public.feed_posts
  for each row execute function public.enforce_feed_post_rate_limit();
```
Rationale documenté (022 l.44-46) : « les Server Actions font le même count en amont pour afficher une erreur propre, mais seul le trigger protège contre un accès PostgREST direct avec la clé publishable. » Pour `catches`, la colonne équivalente est `user_id` (pas `author_id`). ⚠️ Un trigger `security definer` sur catches bloquerait AUSSI les inserts service_role (seeds dev, comptes admin) — à décider (le fil n'a pas ce souci car les seeds posent `created_at` étalés dans le passé).

## 4. components/catches/CatchForm.tsx — mesure, photo, célébrations

- Resolver : `zodResolver(isEdit ? catchBaseSchema : createCatchSchema)` (l.288).
- Section mesure (l.756-823) : `Controller name="is_measured"` → `ToggleRow label="Prise mesurée"` (l.765) ; sous-texte l.773 : « Tu as posé la prise à côté d'une référence de taille connue sur la photo. Honnête : auto-déclaré, pas vérifié. » Champs conditionnels si coché : input `measured_length_cm` (min 10 max 250, setValue + shouldValidate, l.782-801) et `reference_object` (register, l.808-817). **Erreurs zod affichées inline via `<FieldError error={errors.measured_length_cm?.message} />`** (l.801) et `errors.reference_object` (l.817) ; les path des `ctx.addIssue` matchent ces champs.
- Photo (l.202, 1164-1172) : `const [photoFile, setPhotoFile] = useState<File | null>(null)` ; Section 6 `<PhotoInput onChange={setPhotoFile} initialUrl={isEdit ? existingPhotoUrl : null} />`. La photo est **hors react-hook-form** : uploadée dans `onSubmit` (l.454-482) via `uploadCatchPhoto(FormData)` → `photoPath`, puis `createCatch({ ...data, photo_path: photoPath })` (l.508) ou `updateCatch({ id, ...data, ...(photoPath !== undefined ? { photo_path: photoPath } : {}) })` (l.484-489). En édition sans nouvelle photo, `photo_path` n'est PAS soumis (l'existante reste). NB : `photo_path` est aussi pré-rempli dans defaultValues en édition (l.115) mais exclu du brouillon localStorage (l.384).
- Pré-remplissage édition (l.99-102) : `is_measured: row.photo_verified_at != null` (dérivé).
- **Flux célébrations S61 à ne pas casser** (l.208-211, 527-541, 1296-1306) : après succès création, si `result.celebration && buildCatchMoments(...).length > 0` → `pendingNavRef.current = '/carnet/${id}'`, `setCelebration(...)`, return (pas de toast ni push) ; sinon `toast.success('Prise loguée !')` + `router.push`. `CelebrationOverlay` navigue à la fermeture (onClose l.1301-1306). Toute nouvelle erreur (photo manquante / rate-limit) doit revenir en `{ error }` AVANT l'insert pour que ce flux reste intact ; le form gère déjà `'error' in result` → toast + `setSubmitPhase('idle')` (l.511-…) et le cas `'Non authentifié'` → redirect login.
- Contexte sortie S50 (l.133-199, 245-272) : `?outing=&dept=&species=` pré-remplit species/notes « Sortie partagée » SANS FK — la création passe par le même `createCatch`, donc couverte par le rate-limit.

## 5. Tests existants — lib/catches/__tests__/actions.test.ts

Harnais (l.24-80) : faux client Supabase maison `makeClient({ user, responses, storageUpload, storageRemove })` — builder chaînable, file FIFO de réponses consommée par `.single()/.maybeSingle()/await`, capture `ops` (table/op/payload) et `removed` (Storage). Mocks : `next/cache`, `@/lib/supabase/server` (createClient), `@/lib/conditions/openmeteo`. ⚠️ Les modules gamification/notifs (`recomputeSoloChallenges`, `buildCatchCelebration`, `emitDopamineNotifications`, `getUserXpOrNull`, `notifyFollowersOfPublicCatch`, `emitRankChangeNotifications`) ne sont PAS mockés ici — ils reçoivent le faux client et tombent en best-effort silencieux (la FIFO renvoie `{data:null,error:null}` par défaut). Un test ajoutant un count rate-limit **décalera la FIFO** : la 1re réponse consommée deviendra celle du count, pas de l'insert — il faudra ajuster `responses` de tous les tests createCatch existants (ou brancher le count sur `head:true`).
- Cas couverts createCatch : insert valide + EWKT, defaults privacy/released, poids kg→g + dénormalisation conditions, rejet zod FR sans insert, non authentifié, erreur DB → message FR. **AUCUN test sur is_measured/photo_verified_at dans actions.test.ts.**
- La mesure est testée côté schéma : lib/catches/__tests__/schema.test.ts:126-142 (`createCatchSchema — prise mesurée (WS-E)`) : cochée sans longueur → fail ; cochée avec longueur+référence → pass ; `is_measured:false` → pass.
- updateCatch : update partiel sans écrasement, non possédée, non auth, poids. deleteCatch/uploadCatchPhoto/bulkCreateCatches couverts (bulk : coords dépt + defaults, dépt non côtier, non auth, liste vide).

## 6. Autres chemins de création de prises

| Chemin | Fichier | photo_verified_at ? | Rate-limit contournable ? |
|---|---|---|---|
| Import groupé UI | `components/catches/BulkCatchImport.tsx:63` → `bulkCreateCatches` | Non posé (jamais) | **Oui** : max 50/appel zod seulement, aucun count 24h — un rate-limit applicatif dans createCatch seul ne le couvre pas |
| Prefill sortie S50 | `CatchForm` via `?outing=` (l.145-199) | Passe par `createCatch` normal | Non (même chemin) |
| Seed fil (dev) | `app/dev/seed-feed/actions.ts:81-93` (client **admin** service_role) | Non posé | Bypass triggers applicatifs ? Non — un trigger DB s'appliquerait aussi au service_role (⚠. dates `caught_at` passées mais `created_at` = now) |
| Seed heatmap (dev) | `app/dev/seed-heatmap/actions.ts:70-84` (admin, insert par lots) | Non posé | Idem : un trigger 24h sur `created_at` casserait ce seed (jusqu'à ~N prises d'un coup par user seed) |
| Accès PostgREST direct (clé publishable) | RLS insert own sur `catches` | Client peut poser `photo_verified_at` LUI-MÊME ? **À vérifier côté DB** : `lib/types.ts:77` liste `photo_verified_at?` dans l'Insert type → la colonne est insérable via PostgREST si la RLS/grants colonne ne la bloquent pas. C'est le trou « auto-vérification » que le backstop DB devrait fermer (même logique que le trigger rate-limit du fil) | **Oui** aujourd'hui : aucun trigger rate-limit sur `catches` |
| Crons/scripts | `scripts/backfill-tide.ts`, crons recfishing/personal-window | UPDATE seulement (tide_state, reminded_at), pas de création ni de photo_verified_at | n/a |

Points d'attention pour le brief :
1. Les 2 seuls écrivains TS de `photo_verified_at` sont createCatch:163 et updateCatch:350 ; le fix « photo obligatoire » = étendre `isMeasured` (create) et le recalcul `measurementTouched` (update, avec photo EFFECTIVE = soumise sinon `existing.photo_path`) + `refineMeasured` côté zod pour l'UX. Mais en création la photo n'est pas dans les data validées client (state `photoFile`) → l'erreur zod client ne se déclenchera pas sans câblage form.
2. Le backstop DB honnête = trigger BEFORE INSERT sur `catches` (pattern 022) + éventuellement garde colonne `photo_verified_at` contre l'insert PostgREST direct.
3. `bulkCreateCatches` et les seeds dev (service_role) sont les cas limites du rate-limit : décider s'ils comptent / sont exemptés.

---

# RAPPORT ANCRAGE CODE TS — Classements (sprint 69)

## 1. Page classements — `app/(app)/classements/page.tsx` (73 lignes, lue en entier)

Server Component, auth obligatoire, noindex. Structure :

- **Auth + profil** (lignes 17-28) : `redirect('/auth/login?redirect=/classements')` si anonyme ; lit `profiles.home_department, public_ranking` via `maybeSingle()`.
- **Fetch initial SSR** (lignes 30-38) : appelle directement la Server Action `getLeaderboard({ scope:'national', metric:'xp', period:'season', dept: profile?.home_department ?? null, species:null, seasonOffset:0 })` ; `initialRows = initial.ok ? initial.rows : []` (une erreur SSR devient silencieusement un tableau vide → l'UI affichera l'empty state, pas l'erreur).
- **Saisons : NI en dur NI purement TS** (lignes 40-47) : la clé courante vient de la RPC SQL `season_window(p_offset: 0)` (Europe/Paris), avec repli TS honnête :
  ```ts
  const { data: seasonRows } = await supabase.rpc('season_window', { p_offset: 0 })
  const currentSeasonKey =
    (Array.isArray(seasonRows) ? seasonRows[0]?.season_key : null) ??
    `${new Date().getFullYear()}-Q${Math.floor(new Date().getMonth() / 3) + 1}`
  const seasons = seasonOptions(currentSeasonKey, 3)
  ```
  → **toujours 4 options (courante + 3 passées), dérivées par arithmétique de trimestres, SANS vérifier qu'une saison passée contient des données.** C'est le point d'entrée pour « masquer les saisons vides » : il n'existe aucun check de données par saison aujourd'hui.
- **Rendu** (lignes 49-72) : header (copy « Mesure-toi aux autres pêcheurs, sans jamais dévoiler un spot. Ta participation est optionnelle et réversible à tout moment. » lignes 57-60) puis `<LeaderboardTable initialRows myUserId homeDepartment seasons optedIn={profile?.public_ranking ?? false} />`.

## 2. Server Action — `app/actions/leaderboard.ts` (85 lignes)

- Signature : `getLeaderboard(params: LeaderboardParams): Promise<LeaderboardResult>` avec `type LeaderboardResult = { ok: true; rows: LeaderboardRow[] } | { ok: false; error: string }` (lignes 18-20).
- Auth : anonyme → `{ ok:false, error:'Connecte-toi pour voir les classements.' }` (ligne 39).
- Listes blanches défensives : scope/metric/period inconnus retombent sur `national/xp/season` (lignes 43-51) ; `dept` borné ≤ 3 chars, `species` ≤ 40 sinon `null` (lignes 53-55) ; `seasonOffset` tronqué et borné `[-40, 0]` (lignes 58-59).
- Appel RPC (lignes 61-68) : `supabase.rpc('get_leaderboard', { p_scope, p_dept, p_species, p_period, p_metric, p_season_offset })`.
- **Le type RpcRow (lignes 26-32) ne contient QUE `{rank, user_id, username, avatar_url, metric_value}`** — pas de `own_rank` ni `eligible_count` aujourd'hui. Mapping snake→camel lignes 75-81 (`Number(r.rank)`, `Number(r.metric_value) || 0`).
- Erreur RPC → `console.error` + `{ ok:false, error:'Impossible de charger le classement. Réessaie.' }` (lignes 70-73).
- **Aucune gestion opt-in dans l'action** : l'opt-in est appliqué côté SQL (RPC filtre `public_ranking`), et l'état opt-in de l'utilisateur est lu séparément par la page (profil).

## 3. Composants — `components/gamification/`

### `LeaderboardTable.tsx` (318 lignes, `'use client'`)

- Props (lignes 60-73) : `{ initialRows: LeaderboardRow[], myUserId: string, homeDepartment: string | null, seasons: SeasonOption[], optedIn: boolean }`.
- State : `params` (défaut national/xp/season/dept=home/offset 0, lignes 74-81), `rows`, `loading`, `errored`, + jeton anti-course `requestId = useRef(0)` (ligne 87).
- `apply(patch)` (lignes 89-109) : merge params, force `dept=homeDepartment` si scope department sans dept, purge `species` si métrique non filtrable, re-fetch via `getLeaderboard`, ignore les réponses obsolètes (`id !== requestId.current`).
- Sélecteur de saison (lignes 157-174) : affiché seulement si `period === 'season' && seasons.length > 1`, une `Chip` par `SeasonOption`, libellé `` s.offset === 0 ? `${s.label} (en cours)` : s.label `` — **toutes les saisons passées sont proposées inconditionnellement**.
- Nudge opt-in (lignes 226-235) : si `!optedIn`, encart gold « Tu n'apparais pas encore dans les classements. [Active ta visibilité](/profil) (ton pseudo et tes stats, jamais tes spots). ».
- Cascade de rendu (lignes 238-314) : `errored` → message coral ; `loading` → 5 skeletons ; `scope==='department' && !dept` → « Choisis un département ci-dessus » ; **`rows.length === 0` → `<LeaderboardEmptyState scope={params.scope} optedIn={optedIn} />` (ligne 255)** ; sinon `<ol>` des lignes (rang mono + médaille `rankMedal`, avatar, lien `/u/{username}`, badge « toi » si `isMe`, valeur `formatMetricValue` + check « vérifié » si `meta.verifiedOnly`).

### `LeaderboardEmptyState.tsx` (45 lignes)

État vide actuel sous le seuil k-anon (le SEUL rendu quand la RPC renvoie 0 ligne, que ce soit k-anon ou vraiment vide — indistinguable côté client aujourd'hui) :

- Message (lignes 15-18) : scope `follows` → « Aucun des pêcheurs que tu suis n'apparaît encore ici. Suis-en d'autres, ou invite tes potes à activer leur classement. » ; sinon → « Le classement s'anime dès que plusieurs pêcheurs loguent publiquement. Encore un peu de patience, le coin se remplit. »
- CTAs : `Loguer une prise` → `/carnet/nouvelle` + (si `!optedIn`) `Apparaître dans les classements` → `/profil` (lignes 27-40). **Aucun `own_rank`/`eligible_count`, aucun CTA de partage.**

## 4. Toggle opt-in — `app/(app)/profil/ranking-visibility-toggle.tsx` (85 lignes)

- Copy EXACTE actuelle (lignes 42-48) :
  - Titre : `Apparaître dans les classements`
  - Description : `Ton pseudo et tes stats (XP, prises, records) peuvent apparaître dans les classements. Jamais tes spots ni une coordonnée. Réversible à tout moment.`
  - **Endroit naturel pour la mention département : ce `<p>` lignes 45-48** (ex. préciser que le classement départemental utilise le département de domicile du profil, sans localiser les prises).
- Toasts (lignes 25-29) : `'Tu apparais désormais dans les classements.'` / `'Tu es retiré des classements.'`
- Mécanique : optimiste + revert (lignes 16-32), `role="switch"` + libellé texte `Activé/Désactivé` (daltonien-safe, lignes 53-79).
- Action serveur : `updateRankingVisibility(enabled)` dans `app/(app)/profil/actions.ts:98-118` — update `profiles.public_ranking` + `revalidatePath('/profil')` + `revalidatePath('/classements')`.

## 5. Mécanique de partage S45/S47 (CTA sous le seuil)

- **Composant réutilisable : `components/share/ShareButton.tsx`** (client). Props : `{ input: ShareCardInput, title: string, text: string, label?, variant?: 'solid'|'ghost'|'card', className?, hasPhoto? }` (lignes 26-43). Il gère tout le flux : opt-in dialog (`ShareOptInDialog`) ou 1-tap (`profiles.share_skip_optin`), création de la carte, Web Share fichier story 9:16, fallback desktop `ShareSuccessModal` (aperçu + copie lien + download).
- Hook sous-jacent : `components/share/use-share-card.ts` → `createShareCard(input)` (Server Action `app/actions/share.ts`) → slug public `/c/{slug}` + image OG `/og/card/{slug}`.
- **Kinds existants** (`app/actions/share.ts:158-165`) :
  ```ts
  export type ShareCardInput =
    | { kind: 'catch'; catchId: string; includePhoto?: boolean }
    | { kind: 'conditions' }
    | { kind: 'outing'; outingId: string }
    | { kind: 'gearbox' }
    | { kind: 'recap'; period?: string }
    | { kind: 'records' }
    | { kind: 'badges' }
  ```
  **Il n'existe PAS de kind « leaderboard/rank »**. Les candidats naturels pour un CTA sous le seuil, sans nouveau kind : `{ kind: 'records' }` (records perso, S47) ou `{ kind: 'badges' }` (S62), invocables depuis la page classements par simple `<ShareButton input={{ kind: 'records' }} title="…" text="…" />` (client, donc à placer dans `LeaderboardTable`/`LeaderboardEmptyState`, déjà client). Un kind dédié « mon rang » impliquerait un nouveau payload + route OG + branche `createShareCard`. Note : tous les payloads sont geom-free et dédupliqués par fenêtre récente (`findRecentSlug`).

## 6. Construction des saisons côté TS — `lib/gamification/season.ts` (64 lignes)

- Frontière + clé technique = **SQL** (`season_window`, Europe/Paris) ; TS ne fait que du mapping (commentaire lignes 1-9).
- `parseSeasonKey('2026-Q3') → {year, quarter}` (lignes 21-26) ; `seasonLabelFromKey` → « Été 2026 » via `SEASON_QUARTER_NAMES` Q1 Hiver/Q2 Printemps/Q3 Été/Q4 Automne (lignes 11-33) ; `shiftSeasonKey(key, offset)` arithmétique pure trimestres (lignes 40-48).
- **`seasonOptions(currentKey, pastCount = 3)`** (lignes 56-63) : renvoie `SeasonOption[] = { offset, key, label }[]`, offset 0 en tête puis -1, -2, -3. **Génération purement arithmétique : aucune notion de « saison avec données ».** Pour filtrer les saisons vides il faudra une source de données (ex. `season_results` figé lu via `get_season_results`, ou min(created_at) des xp_events) car ce module est volontairement pur/sans I/O.

## 7. Tests existants

- **`app/actions/__tests__/leaderboard.test.ts`** (117 lignes) : harnais = `makeSupabase` de `app/actions/__tests__/_supabase-mock` + `vi.mock('@/lib/supabase/server')`, inspection des args RPC via `firstRpcArgs(client)` (lignes 20-23). 9 cas : refus anonyme ; mapping snake→camel ; erreur RPC propre ; listes blanches scope/metric/period ; bornes dept≤3/species≤40→null ; passage dept/species valides ; `seasonOffset` absent→0 ; bornes offset (+5→0, -100→-40) ; offset -1 passé tel quel. **Tout ajout de colonnes RPC (own_rank/eligible_count) devra étendre `RpcRow`, le mapping et ces tests.**
- **`lib/gamification/__tests__/leaderboard.test.ts`** : helpers purs — `groupThousands` (espace insécable, déterministe sans Intl, comparaison via `flat()`), `formatMetricValue` (XP/prises/cm/espèces, pluriels, NaN→0), `metricMeta`/`isSpeciesFilterable`, `rankMedal`, ordre des 4 métriques.
- **`lib/gamification/__tests__/season.test.ts`** : `parseSeasonKey` (valide/trim/rejets Q0-Q5), `seasonLabelFromKey` (4 saisons + repli), `shiftSeasonKey` (franchissement d'année dans les 2 sens, identité), `seasonOptions` (courante + 3 passées, offset 0 en tête).

## Points d'attention pour le sprint 69

1. **Pas de `own_rank`/`eligible_count` nulle part dans la chaîne TS** : ni dans `RpcRow` (app/actions/leaderboard.ts:26-32), ni dans `LeaderboardRow` (lib/gamification/leaderboard.ts:28-34), ni dans les props des composants. Toute la « lisibilité à 1 joueur » passe par une extension du contrat RPC + de ces 3 couches.
2. L'empty state ne distingue pas « k-anon non atteint » de « zéro donnée » : la RPC renvoie 0 ligne dans les deux cas et le client rend le même `LeaderboardEmptyState`.
3. Les saisons passées sont TOUJOURS proposées (4 chips inconditionnels) ; le filtrage des saisons vides nécessitera un fetch de données (SSR page ou action dédiée), `seasonOptions` étant pur.
4. `page.tsx:38` avale l'erreur du fetch initial SSR (`ok:false` → tableau vide → empty state trompeur) — à connaître si on touche cette zone.

Fichiers clés (absolus) :
- c:\Users\johns\Carnet-de-peche\app\(app)\classements\page.tsx
- c:\Users\johns\Carnet-de-peche\app\actions\leaderboard.ts
- c:\Users\johns\Carnet-de-peche\components\gamification\LeaderboardTable.tsx
- c:\Users\johns\Carnet-de-peche\components\gamification\LeaderboardEmptyState.tsx
- c:\Users\johns\Carnet-de-peche\app\(app)\profil\ranking-visibility-toggle.tsx (+ actions.ts:98-118)
- c:\Users\johns\Carnet-de-peche\components\share\ShareButton.tsx (+ use-share-card.ts, app\actions\share.ts:158-165)
- c:\Users\johns\Carnet-de-peche\lib\gamification\season.ts · leaderboard.ts
- c:\Users\johns\Carnet-de-peche\app\actions\__tests__\leaderboard.test.ts · lib\gamification\__tests__\leaderboard.test.ts · season.test.ts
