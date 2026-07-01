-- 099_badges_tiers.sql — Sprint 62 (Séries actives & badges publics à paliers).
--
-- Deux volets, dans l'esprit du pivot ADN dopamine (CLAUDE.md §8), SANS classement ici
-- (les leaderboards sont la Phase E) et SANS jamais exposer une coordonnée :
--
--   VOLET 1 — Séries hebdomadaires. Remplit user_progress.current_week_streak /
--     longest_week_streak / last_active_week (colonnes posées vides au Sprint 60). Une
--     « semaine active » = ≥ 1 catch OU ≥ 1 outing cette semaine (date_trunc('week',
--     Europe/Paris)). Règle du JOKER : 1 semaine manquée par mois calendaire ne casse
--     pas la série (anti-culpabilisation, décision John). Crédite +20 XP par semaine
--     active (barème audit §2.2.1, validé John), idempotent via le ledger xp_events.
--
--   VOLET 2 — Badges à paliers. Ajoute tier/target/progress à user_badges, migre les
--     anciens slugs vers des familles à paliers (earned_at PRÉSERVÉ), corrige le seuil
--     Pokédex (>= 20 → >= 26, bug 066:146) et rend les badges affichables PUBLIQUEMENT
--     via une RPC gatée (la table reste own-only en lecture directe).
--
-- Familles retenues (décision John 2026-07-01 « noyau seul ») : volume 10/50/200,
-- espèces 5/10/26, conservation 10/50, régularité 4/12/52, saisons (4/4). Les familles
-- « records de taille / espèce » et « exploration départements » sont DÉFÉRÉES (0 prise
-- mesurée en base + département fiable sur 25% des prises seulement) ; « nuit/aube » est
-- ÉCARTÉE (pas d'heure solaire en base, suncalc vit en TS). Cf docs/sprint-62/RECAP.md.
--
-- Pattern calqué sur 056/084/098 : RLS d'abord, écriture via fonctions SECURITY DEFINER
-- (owner postgres), REVOKE des fonctions internes, GRANT ciblé des RPC publiques. Les
-- fonctions publiques (get_user_streak/get_public_badges) exposent des AGRÉGATS opaques
-- (un entier de série, des métadonnées de badge) : zéro prise, zéro spot, zéro coordonnée
-- → même catégorie d'advisor *_security_definer_function_executable que get_user_xp (098),
-- pattern déjà assumé du projet, PAS une nouvelle classe de warning.
--
-- Dernier appliqué = 098 → 099 libre (vérifié via list_migrations, aucune dérive).
-- Le fichier 056_gamification.sql est laissé INTACT comme historique (garde-fou « jamais
-- éditer 056 ») ; ses COMMENT ON « anti-comparaison » périmés sont supersédés ci-dessous.

-- ════════════════════════════════════════════════════════════════════════════════
-- VOLET 1 — SÉRIES HEBDOMADAIRES
-- ════════════════════════════════════════════════════════════════════════════════

-- ─── 1a. compute_user_week_streak : série vivante + plus longue série (avec joker) ──
-- Renvoie, pour un utilisateur et une date de référence :
--   current_streak = longueur de la série VIVANTE au regard de p_asof (0 si cassée),
--   longest_streak = plus longue série de semaines actives de tout l'historique,
--   last_week      = dernière semaine active,
--   joker_month    = mois calendaire du dernier joker consommé dans la série en cours
--                    (sert à savoir si le joker du mois courant est encore dispo).
-- « Consécutives » au sens joker : un trou d'UNE semaine est pardonné si aucun autre
-- trou n'a déjà été pardonné le même mois (les mois ne font que croître le long de la
-- timeline → suivre le DERNIER mois jokerisé suffit). Un trou ≥ 2 semaines casse toujours.
-- SECURITY DEFINER : lit les catches/outings de l'utilisateur (bypass RLS) pour COMPTER
-- des semaines uniquement — aucune donnée sensible ne sort.
create or replace function public.compute_user_week_streak(
  p_user_id uuid,
  p_asof    date default current_date
)
returns table (current_streak int, longest_streak int, last_week date, joker_month date)
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
  v_joker_month date := null;   -- dernier mois jokerisé dans la série EN COURS
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
    where w <= v_cur_week            -- ignore d'éventuelles semaines futures (défensif)
    order by w
  loop
    if v_prev is null then
      v_run := 1;
      v_joker_month := null;
    else
      v_gap := ((v_week - v_prev) / 7)::int;   -- nombre de pas de semaine entre les deux
      if v_gap = 1 then
        v_run := v_run + 1;                    -- semaine adjacente → la série continue
      elsif v_gap = 2 then
        -- exactement une semaine manquée entre v_prev et v_week
        v_missed_mon := date_trunc('month', v_prev + 7)::date;
        if v_joker_month is distinct from v_missed_mon then
          v_joker_month := v_missed_mon;       -- consomme le joker de ce mois
          v_run := v_run + 1;
        else
          v_run := 1;                          -- joker déjà pris ce mois → rupture
          v_joker_month := null;
        end if;
      else
        v_run := 1;                            -- trou ≥ 2 semaines → rupture
        v_joker_month := null;
      end if;
    end if;

    if v_run > v_best then v_best := v_run; end if;
    v_prev := v_week;
    v_last := v_week;
  end loop;

  longest_streak := v_best;
  last_week := v_last;

  -- Série VIVANTE au regard de p_asof : la dernière semaine active doit être assez
  -- récente. Vivante si dernière semaine = courante ou précédente ; OU il y a 2 semaines
  -- SI le joker du mois de la semaine manquée est encore dispo dans la série en cours.
  if v_last is null then
    current_streak := 0;
  else
    v_gap := ((v_cur_week - v_last) / 7)::int;
    if v_gap <= 1 then
      current_streak := v_run;                 -- cette semaine ou la précédente → vivante
    elsif v_gap = 2 then
      v_missed_mon := date_trunc('month', v_last + 7)::date;
      if v_joker_month is distinct from v_missed_mon then
        current_streak := v_run;               -- joker du mois encore dispo → série tenue
        v_joker_month := v_missed_mon;          -- (le joker serait consommé si on reste passif)
      else
        current_streak := 0;                   -- joker déjà pris ce mois → cassée
      end if;
    else
      current_streak := 0;                     -- ≥ 2 semaines sans rien → cassée
    end if;
  end if;

  joker_month := v_joker_month;
  return next;
end;
$$;

comment on function public.compute_user_week_streak(uuid, date) is
  'Série hebdo d''un pêcheur (Sprint 62) : current (vivante au regard de p_asof), longest, dernière semaine active, mois du dernier joker. Semaine active = ≥1 catch OU ≥1 outing. Joker : 1 semaine manquée/mois pardonnée. SECURITY DEFINER, ne renvoie que des agrégats (aucune coordonnée).';

-- ─── 1b. refresh_user_streak : persiste user_progress + crédite l'XP régularité ────
-- Recalcule la série et met à jour user_progress. Crédite +20 XP par SEMAINE ACTIVE
-- (idempotent : ref_id = hash de la semaine → une semaine ne crédite qu'une fois, même
-- rejouée). Appelée par les triggers catches/outings ET le backfill.
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

  -- +20 XP par semaine active (catch OU outing). Idempotent via le hash de la semaine.
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
$$;

comment on function public.refresh_user_streak(uuid) is
  'Recalcule la série d''un pêcheur, met à jour user_progress, crédite +20 XP par semaine active (idempotent, ledger xp_events). SECURITY DEFINER — appelée par les triggers catches/outings et le backfill (Sprint 62).';

-- ─── 1c. Triggers AFTER INSERT (série se rafraîchit à chaque prise / sortie) ───────
create or replace function public.catches_refresh_streak_tg()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.refresh_user_streak(new.user_id);
  return null;
end;
$$;

drop trigger if exists catches_refresh_streak on public.catches;
create trigger catches_refresh_streak
  after insert on public.catches
  for each row execute function public.catches_refresh_streak_tg();

create or replace function public.outings_refresh_streak_tg()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.refresh_user_streak(new.user_id);
  return null;
end;
$$;

drop trigger if exists outings_refresh_streak on public.outings;
create trigger outings_refresh_streak
  after insert on public.outings
  for each row execute function public.outings_refresh_streak_tg();

-- ─── 1d. get_my_streak() : série vivante + urgence douce + joker (pour la StreakCard) ─
-- REMPLACE la version 056 (descriptive/passive). Conserve les champs activeDays /
-- activeWeeks / longestWeekStreak (rétro-compat) et AJOUTE currentWeekStreak,
-- weekActiveNow, daysLeftThisWeek, jokerAvailable. Calcul LIVE au regard de current_date
-- → jamais faux même si user_progress est en retard. Descriptif, jamais culpabilisant.
create or replace function public.get_my_streak()
returns json
language plpgsql
stable
security definer
set search_path = public
as $$
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

  -- Jours actifs / semaines actives distincts (catch OU outing) — descriptif.
  select
    count(distinct d), count(distinct date_trunc('week', d::timestamp)::date)
    into v_active_days, v_active_weeks
  from (
    select (caught_at  at time zone 'Europe/Paris')::date as d from public.catches where user_id = v_uid
    union
    select (started_at at time zone 'Europe/Paris')::date as d from public.outings where user_id = v_uid
  ) x;

  -- Jours restants (aujourd'hui inclus) avant la fin de la semaine courante.
  v_days_left := 8 - extract(isodow from current_date)::int;   -- lun=7 … dim=1
  -- Joker du MOIS COURANT dispo tant qu'il n'a pas été consommé dans la série en cours.
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
$$;

comment on function public.get_my_streak() is
  'Série hebdo du demandeur (Sprint 62) : current/longest + urgence douce (jours restants, joker) + jours/semaines actifs. Vivante au regard de current_date. Joker : 1 semaine manquée/mois ne casse pas la série. Descriptif, jamais culpabilisant.';

-- ─── 1e. get_user_streak(uid) : série en cours publique (flair profil, spot-safe) ──
-- Le « 🔥 X sem. » affiché sur le profil public. Expose UNIQUEMENT un entier (la série
-- vivante), calculé LIVE → jamais faux. Aucune prise, aucun spot, aucune coordonnée.
create or replace function public.get_user_streak(p_user_id uuid)
returns int
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select current_streak from public.compute_user_week_streak(p_user_id, current_date)),
    0);
$$;

comment on function public.get_user_streak(uuid) is
  'Série hebdo EN COURS d''un pêcheur (Sprint 62), pour le flair « 🔥 X sem. » du profil public. Renvoie un entier (agrégat opaque, zéro fuite). Calcul live.';

-- ════════════════════════════════════════════════════════════════════════════════
-- VOLET 2 — BADGES À PALIERS
-- ════════════════════════════════════════════════════════════════════════════════

-- ─── 2a. Colonnes paliers ─────────────────────────────────────────────────────────
-- tier     = médaille (1 bronze / 2 argent / 3 or) du seuil atteint par CE badge.
-- target   = seuil de ce badge (ex. volume_50 → 50).
-- progress = valeur de la métrique au 1er déblocage (informatif, figé par DO NOTHING).
alter table public.user_badges
  add column if not exists tier     smallint not null default 1,
  add column if not exists progress int,
  add column if not exists target   int;

-- ─── 2b. Migration des anciens slugs → familles à paliers (earned_at PRÉSERVÉ) ─────
-- Les anciens slugs de seuil IDENTIQUE deviennent le palier bronze de leur famille : on
-- garde la date d'obtention d'origine (honnêteté). pokedex_complete est SUPPRIMÉ (il
-- récompensait ≥ 20 espèces, seuil erroné 066:146 ; recompute re-attribuera species_26
-- seulement à ≥ 26 réelles — jamais un « 26 » non mérité).
update public.user_badges set badge_slug = 'volume_10'   where badge_slug = 'ten_catches';
update public.user_badges set badge_slug = 'species_5'    where badge_slug = 'five_species';
update public.user_badges set badge_slug = 'release_10'   where badge_slug = 'release_friendly';
update public.user_badges set badge_slug = 'regularity_4' where badge_slug = 'regular_4w';
delete from public.user_badges where badge_slug = 'pokedex_complete';

-- Renseigne tier/target/progress des badges déjà gagnés (tous bronze = tier 1 ici).
update public.user_badges set tier = 1, target = 1,  progress = 1  where badge_slug = 'first_catch';
update public.user_badges set tier = 1, target = 10, progress = 10 where badge_slug = 'volume_10';
update public.user_badges set tier = 1, target = 5,  progress = 5  where badge_slug = 'species_5';
update public.user_badges set tier = 1, target = 10, progress = 10 where badge_slug = 'release_10';
update public.user_badges set tier = 1, target = 4,  progress = 4  where badge_slug = 'regularity_4';
update public.user_badges set tier = 1, target = 1,  progress = 1  where badge_slug = 'prise_mesuree';

-- ─── 2c. recompute_my_badges() : familles à paliers + Pokédex 26 ──────────────────
-- REPREND 066 et l'étend : mêmes agrégats + saisons, INSERT idempotent des paliers
-- mérités avec tier/target/progress. Pokédex complet = species_26 (>= 26, corrige le bug).
create or replace function public.recompute_my_badges()
returns setof public.user_badges
language plpgsql
security definer
set search_path = public
as $$
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
    -- Saisons météo : (mois % 12) / 3 → 0 DJF, 1 MAM, 2 JJA, 3 SON. 4 distinctes = toutes.
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
$$;

comment on function public.recompute_my_badges() is
  'Recalcule et persiste (idempotent) les badges à paliers du demandeur depuis public.catches (Sprint 62) : volume 10/50/200, espèces 5/10/26, conservation 10/50, régularité 4/12/52, saisons, première prise, prise mesurée. tier/target/progress remplis. earned_at figé.';

-- ─── 2d. get_public_badges(uid) : badges d'un profil public (gaté, spot-safe) ──────
-- user_badges reste RLS own-only en lecture DIRECTE. L'exposition publique passe par
-- CETTE fonction, qui ne renvoie que des MÉTADONNÉES de badge (slug/palier/seuil/date)
-- d'un utilisateur donné : aucune prise, aucun compte fin, aucune coordonnée. Sert les
-- « badges phares » du profil public /u/[username] (pivot ADN dopamine).
create or replace function public.get_public_badges(p_user_id uuid)
returns table (badge_slug text, tier smallint, target int, earned_at timestamptz)
language sql
stable
security definer
set search_path = public
as $$
  select badge_slug, tier, target, earned_at
  from public.user_badges
  where user_id = p_user_id
  order by tier desc, earned_at asc;
$$;

comment on function public.get_public_badges(uuid) is
  'Badges (métadonnées : slug/palier/seuil/date) d''un pêcheur, pour l''affichage public de son profil (Sprint 62). user_badges reste RLS own-only en direct ; cette RPC gatée n''expose aucune prise/spot/coordonnée.';

-- ════════════════════════════════════════════════════════════════════════════════
-- VOLET 3 — COMMENT ON pivot-aligné (056 laissé en historique)
-- ════════════════════════════════════════════════════════════════════════════════
comment on table public.user_badges is
  'Badges à paliers (Sprint 62). tier = médaille (1 bronze/2 argent/3 or), target = seuil, progress = métrique au 1er déblocage. RLS own-only en lecture DIRECTE ; exposition PUBLIQUE via get_public_badges() (pivot ADN dopamine, CLAUDE.md §8 — les mentions « ZÉRO leaderboard » de 056 sont supersédées). earned_at figé à la 1re obtention.';

-- ════════════════════════════════════════════════════════════════════════════════
-- VOLET 4 — SÉCURITÉ DES FONCTIONS (REVOKE internes, GRANT ciblé des RPC)
-- ════════════════════════════════════════════════════════════════════════════════
-- Fonctions INTERNES (série/trigger) : NON exécutables par le client. Le trigger se
-- déclenche indépendamment des grants ; les appels imbriqués depuis une fonction definer
-- (owner postgres) sont autorisés par l'owner, pas par l'appelant d'origine (cf 098).
revoke all on function public.compute_user_week_streak(uuid, date) from public, anon, authenticated;
revoke all on function public.refresh_user_streak(uuid)            from public, anon, authenticated;
revoke all on function public.catches_refresh_streak_tg()          from public, anon, authenticated;
revoke all on function public.outings_refresh_streak_tg()          from public, anon, authenticated;

-- RPC publiques : série en cours + badges d'un profil = lisibles par tous (flair public).
grant execute on function public.get_user_streak(uuid)   to anon, authenticated;
grant execute on function public.get_public_badges(uuid) to anon, authenticated;
-- get_my_streak / recompute_my_badges : réservées au demandeur authentifié.
revoke all on function public.get_my_streak()        from public, anon;
revoke all on function public.recompute_my_badges()  from public, anon;
grant execute on function public.get_my_streak()       to authenticated;
grant execute on function public.recompute_my_badges() to authenticated;

-- ════════════════════════════════════════════════════════════════════════════════
-- VOLET 5 — BACKFILL (idempotent)
-- ════════════════════════════════════════════════════════════════════════════════

-- 5a. Badges à paliers : attribue à CHAQUE pêcheur les paliers mérités (earned_at = now
-- pour les nouveaux ; les paliers bronze migrés en 2b gardent leur date). DO NOTHING
-- préserve les lignes existantes. Impersonnel (recompute_my_badges lit auth.uid()).
insert into public.user_badges (user_id, badge_slug, tier, target, progress)
select m.user_id, b.slug, b.tier, b.target, b.metric
from (
  select
    user_id,
    count(*)                                                        as v_total,
    count(distinct species)                                        as v_species,
    count(*) filter (where released is true)                       as v_released,
    count(distinct date_trunc('week', caught_at))                  as v_active_weeks,
    count(*) filter (where photo_verified_at is not null)          as v_measured,
    count(distinct ((extract(month from caught_at)::int % 12) / 3)) as v_seasons
  from public.catches
  group by user_id
) m
cross join lateral (values
  ('first_catch',   1::smallint, 1,   m.v_total::int,        (m.v_total        >= 1)),
  ('volume_10',     1::smallint, 10,  m.v_total::int,        (m.v_total        >= 10)),
  ('volume_50',     2::smallint, 50,  m.v_total::int,        (m.v_total        >= 50)),
  ('volume_200',    3::smallint, 200, m.v_total::int,        (m.v_total        >= 200)),
  ('species_5',     1::smallint, 5,   m.v_species::int,      (m.v_species      >= 5)),
  ('species_10',    2::smallint, 10,  m.v_species::int,      (m.v_species      >= 10)),
  ('species_26',    3::smallint, 26,  m.v_species::int,      (m.v_species      >= 26)),
  ('release_10',    1::smallint, 10,  m.v_released::int,     (m.v_released     >= 10)),
  ('release_50',    2::smallint, 50,  m.v_released::int,     (m.v_released     >= 50)),
  ('regularity_4',  1::smallint, 4,   m.v_active_weeks::int, (m.v_active_weeks >= 4)),
  ('regularity_12', 2::smallint, 12,  m.v_active_weeks::int, (m.v_active_weeks >= 12)),
  ('regularity_52', 3::smallint, 52,  m.v_active_weeks::int, (m.v_active_weeks >= 52)),
  ('seasons_all',   1::smallint, 4,   m.v_seasons::int,      (m.v_seasons      >= 4)),
  ('prise_mesuree', 1::smallint, 1,   m.v_measured::int,     (m.v_measured     >= 1))
) as b(slug, tier, target, metric, earned)
where b.earned
on conflict (user_id, badge_slug) do nothing;

-- 5b. Séries + XP régularité : rejoue chaque pêcheur actif (catch OU outing).
do $$
declare
  u uuid;
begin
  for u in
    select user_id from public.catches
    union
    select user_id from public.outings
  loop
    perform public.refresh_user_streak(u);
  end loop;
end;
$$;
