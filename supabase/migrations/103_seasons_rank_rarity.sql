-- 103_seasons_rank_rarity.sql — Sprint 67 (Phase E, « Saisons & rangs vivants »).
--
-- Rend les classements du Sprint 66 (102_leaderboards) RÉCURRENTS et VIVANTS + ajoute la
-- rareté des badges. Trois volets, tous soumis au MÊME garde-fou non négociable que le 66 :
-- AUCUNE fuite de spot — les fonctions ne renvoient jamais de geom/ville/lat-lng/coordonnée.
-- Le département reste un FILTRE d'entrée (profiles.home_department), jamais une donnée de
-- sortie exploitable pour localiser une prise.
--
-- Décisions John (2026-07-02, brief docs/sprint-67/BRIEF.md) :
--   • Cadence de saison = TRIMESTRIELLE NOMMÉE (Hiver/Printemps/Été/Automne + année),
--     frontière Europe/Paris (trimestre civil). Remplace « année civile » du 66. La clé de
--     saison ('2026-Q3') est technique ; le libellé « Été 2026 » est calculé en TS
--     (lib/gamification/season.ts) → une seule source pour le mapping quart→nom.
--   • Archivage COMPLET : table season_results (podium figé) + cron de bascule + badge public
--     permanent « Champion de saison » (national XP #1 de chaque saison).
--
-- VOLET A — Saisons. `season_window(offset)` calcule la fenêtre d'une saison (0=courante,
--   -1=précédente…). `get_leaderboard` v2 : borne HAUTE ajoutée + p_season_offset → on peut
--   consulter une saison passée (recalcul exact depuis le ledger, toujours juste). À la
--   bascule, le classement 'season' repart mécaniquement de zéro (nouvelle fenêtre de dates).
--   `season_results` fige le podium ; `archive_season(offset)` l'archive (idempotent) et
--   attribue le badge champion.
-- VOLET B — Notifs de rang. `get_overtaken_followers(actor, delta)` : quels de MES followers
--   (opt-in) je viens de dépasser en XP de saison. Émission event-driven au log (spot-safe,
--   throttlée côté app). + notifs de récap de fin de saison via le cron.
-- VOLET C — Rareté des badges. `get_badge_rarity()` : % de détenteurs par badge (agrégat
--   opaque, jamais QUI détient quoi).
--
-- Pattern (102 / 098 / 099) : RPC STABLE SECURITY DEFINER SET search_path=public qui AGRÈGENT
-- sans exposer de coordonnée ; REVOKE large + GRANT ciblé. ⚠️ Regénérer lib/types.ts après.
-- Dernier fichier sur disque = 102 → 103 libre.

-- ════════════════════════════════════════════════════════════════════════════════
-- VOLET A — SAISONS (trimestre nommé, reset, archivage figé, champion)
-- ════════════════════════════════════════════════════════════════════════════════

-- ─── A1. season_window(offset) : bornes d'une saison trimestrielle (Europe/Paris) ──
-- Renvoie la clé technique ('2026-Q3') + les bornes [starts_at, ends_at) d'une saison,
-- relative à MAINTENANT (offset 0 = saison courante, -1 = précédente, +1 = suivante).
-- La frontière est ancrée sur l'HEURE MURALE de Paris (date_trunc en local puis retour en
-- timestamptz) — même leçon anti-décalage UTC que 101/102. Décrémenter la clé en TS suffit
-- pour lister les saisons passées (arithmétique année+trimestre, pas de calcul de fuseau).
create or replace function public.season_window(p_offset int default 0)
returns table (season_key text, starts_at timestamptz, ends_at timestamptz)
language sql
stable
set search_path = public
as $$
  with b as (
    -- Début du trimestre décalé de p_offset trimestres, en heure murale Paris.
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
$$;

comment on function public.season_window(int) is
  'Bornes d''une saison trimestrielle (Sprint 67). Offset relatif à maintenant (0=courante, -1=précédente). Clé « 2026-Q3 », fenêtre [starts_at, ends_at) ancrée heure murale Europe/Paris. Le libellé « Été 2026 » est mappé en TS.';

-- season_window ne fuit rien (des dates + une clé) : lisible par tous les connectés (l'UI en
-- a besoin pour afficher « Saison : Été 2026 ») + service_role (cron/archivage).
revoke all on function public.season_window(int) from public, anon;
grant execute on function public.season_window(int) to authenticated, service_role;

-- ─── A2. get_leaderboard v2 : saison trimestrielle + borne haute + p_season_offset ─
-- Reprend 102 en AJOUTANT : (1) une borne HAUTE de période (indispensable pour consulter une
-- saison PASSÉE) ; (2) un paramètre p_season_offset (0 = saison courante). L'ancienne
-- signature 6-arg est DROPPÉE (create or replace avec une liste d'args différente créerait un
-- second overload orphelin + grant obsolète).
drop function if exists public.get_leaderboard(text, text, text, text, text, int);

create or replace function public.get_leaderboard(
  p_scope         text default 'national',
  p_dept          text default null,
  p_species       text default null,
  p_period        text default 'season',
  p_metric        text default 'xp',
  p_limit         int  default 50,
  p_season_offset int  default 0
)
returns table (
  rank         int,
  user_id      uuid,
  username     text,
  avatar_url   text,
  metric_value numeric
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_uid    uuid := (select auth.uid());
  v_kanon  constant int := 3;
  v_limit  int := least(greatest(coalesce(p_limit, 50), 1), 100);
  v_start  timestamptz;   -- NULL = all-time (aucune borne)
  v_end    timestamptz;   -- NULL = all-time / non borné à droite
begin
  if p_period = 'all_time' then
    v_start := null;
    v_end   := null;
  else
    -- Fenêtre de LA saison ciblée (courante par défaut). Borne haute exclusive → une saison
    -- passée renvoie exactement ce qu'elle valait ; la saison courante a une borne haute
    -- future (inoffensive). À la bascule, la fenêtre glisse → le classement repart de zéro.
    select w.starts_at, w.ends_at into v_start, v_end
    from public.season_window(coalesce(p_season_offset, 0)) w;
  end if;

  -- ⚠️ RETURNS TABLE : colonnes OUT = variables plpgsql → alias internes DIFFÉRENTS
  -- (uid/uname/avatar/mv/rnk) pour éviter « column reference is ambiguous » (gotcha 102).
  return query
  with elig as (
    -- Population opt-in (public_ranking) filtrée par le scope. home_department = FILTRE, jamais
    -- une colonne de sortie.
    select p.id as uid, p.username::text as uname, p.avatar_url as avatar
    from public.profiles p
    where p.public_ranking = true
      and (
        p_scope = 'national'
        -- home_department est char(3) (ex. '06 ', padding fixe). Un client renvoie la valeur
        -- paddée → comparer en TEXT sans trim laisse '06 ' != '06' et vide le classement
        -- (bug latent hérité du 66). trim() des DEUX côtés = robuste.
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
          -- XP (défaut) : all-time = total matérialisé ; saison = somme du ledger sur la fenêtre.
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
$$;

comment on function public.get_leaderboard(text, text, text, text, text, int, int) is
  'Classements spot-safe (Sprint 66, saison trimestrielle Sprint 67). {rank,user_id,username,avatar_url,metric_value} — JAMAIS de coordonnée. Opt-in public_ranking ; k-anon K=3 sur scopes publics ; connectés uniquement. p_season_offset : 0=saison courante, -1=précédente (recalcul exact). Borne haute exclusive.';

revoke all on function public.get_leaderboard(text, text, text, text, text, int, int) from public, anon;
grant execute on function public.get_leaderboard(text, text, text, text, text, int, int) to authenticated;

-- ─── A3. season_results : podium FIGÉ de fin de saison (historique + champions) ────
-- Archive les classements national/département × {xp,catches,biggest,diversity}, top 10, par
-- saison. Aucune colonne de localisation exploitable : dept est le MÊME filtre grossier
-- (région) déjà public, jamais une coordonnée. Lisible par les connectés (podium public) ;
-- écriture réservée à la fonction definer archive_season (aucune policy INSERT/UPDATE/DELETE).
create table if not exists public.season_results (
  season_key   text        not null,
  scope        text        not null check (scope in ('national', 'department')),
  metric       text        not null check (metric in ('xp', 'catches', 'biggest', 'diversity')),
  dept         text        not null default '',   -- '' = national (sentinelle, PK simple)
  species      text        not null default '',   -- '' = toutes espèces (archivage sans filtre espèce)
  rank         int         not null,
  user_id      uuid        not null references public.profiles(id) on delete cascade,
  metric_value numeric     not null,
  archived_at  timestamptz not null default now(),
  primary key (season_key, scope, metric, dept, species, user_id)
);

comment on table public.season_results is
  'Podiums de fin de saison FIGÉS (Sprint 67). Top 10 par (saison, scope national/département, métrique). dept/species = filtres grossiers déjà publics, jamais une coordonnée. Écrit uniquement par archive_season (definer) ; lecture connectés.';

alter table public.season_results enable row level security;

-- LECTURE DIRECTE VERROUILLÉE (pattern user_badges / invite_codes) : RLS activée SANS aucune
-- policy → aucun client (anon/authenticated) ne lit la table en direct. Deux raisons :
--   1. RGPD : get_season_results filtre public_ranking (un opt-out disparaît de l'historique).
--      Un SELECT direct contournerait ce filtre → un pêcheur opté-OUT resterait visible. Verrou.
--   2. Anti-fuite : pas d'exposition brute de la colonne dept (métadonnée de localisation
--      grossière) via un GROUP BY direct. Le dept ne sort que filtré, via la RPC.
-- L'écriture passe par archive_season (SECURITY DEFINER, owner postgres → bypass RLS) ; la
-- lecture par get_season_results (SECURITY DEFINER également). Aucune policy nécessaire.
drop policy if exists season_results_select on public.season_results;

-- Index de lecture (un podium = filtre par saison/scope/métrique, trié par rang).
create index if not exists season_results_lookup_idx
  on public.season_results (season_key, scope, metric, dept, species, rank);
-- Index FK couvrant (advisor unindexed_foreign_key).
create index if not exists season_results_user_idx
  on public.season_results (user_id);

-- ─── A4. get_season_results : lecture d'un podium archivé (spot-safe) ──────────────
create or replace function public.get_season_results(
  p_season_key text,
  p_scope      text default 'national',
  p_metric     text default 'xp',
  p_dept       text default null,
  p_limit      int  default 10
)
returns table (rank int, user_id uuid, username text, avatar_url text, metric_value numeric)
language sql
stable
security definer
set search_path = public
as $$
  select sr.rank, sr.user_id, p.username::text, p.avatar_url, sr.metric_value
  from public.season_results sr
  join public.profiles p on p.id = sr.user_id
  where sr.season_key = p_season_key
    and sr.scope      = p_scope
    and sr.metric     = p_metric
    -- dept archivé en trimé ('06') ; le client peut passer '06 ' (char3 paddé) → trim des 2 côtés.
    and sr.dept       = trim(coalesce(p_dept, ''))
    and sr.species    = ''
    -- L'opt-out RGPD reste souverain : un pêcheur qui a coupé public_ranking disparaît AUSSI
    -- de l'historique figé (cohérent avec 102 : opt-out = retrait de TOUS les classements).
    and p.public_ranking = true
  order by sr.rank, p.username
  limit least(greatest(coalesce(p_limit, 10), 1), 100);
$$;

comment on function public.get_season_results(text, text, text, text, int) is
  'Podium archivé d''une saison (Sprint 67). Spot-safe (aucune coordonnée). Respecte l''opt-out RGPD (public_ranking) même sur l''historique.';

revoke all on function public.get_season_results(text, text, text, text, int) from public, anon;
grant execute on function public.get_season_results(text, text, text, text, int) to authenticated;

-- ─── A5. archive_season : fige le podium + attribue le badge champion (idempotent) ─
-- Appelée par le cron (offset -1 = saison qui vient de se terminer, relative à maintenant).
-- Idempotente (ON CONFLICT DO NOTHING) : rejouable chaque jour sans doublon ni double octroi.
-- Retourne UNIQUEMENT les lignes FRAÎCHEMENT insérées du board flagship (national XP) pour
-- que le cron émette les notifs de récap une seule fois (kind='champion' pour le rang 1).
create or replace function public.archive_season(p_offset int default -1)
returns table (kind text, o_user_id uuid, o_season_key text, o_rank int, o_metric_value numeric)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_key    text;
  v_metric text;
  v_dept   text;
  v_fresh  jsonb;
begin
  select w.season_key into v_key from public.season_window(coalesce(p_offset, -1)) w;

  -- 1. Board FLAGSHIP national XP : insertion + capture des lignes FRAÎCHES (pour les notifs).
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

  -- 2. Autres métriques nationales (pas de notif → pas de capture).
  foreach v_metric in array array['catches', 'biggest', 'diversity'] loop
    insert into public.season_results (season_key, scope, metric, dept, species, rank, user_id, metric_value)
    select v_key, 'national', v_metric, '', '', l.rank, l.user_id, l.metric_value
    from public.get_leaderboard('national', null, null, 'season', v_metric, 10, p_offset) l
    on conflict (season_key, scope, metric, dept, species, user_id) do nothing;
  end loop;

  -- 3. Boards départementaux, uniquement pour les départements ayant des joueurs opt-in
  -- (data-driven → pas de liste codée en dur, pas d'insertion vide).
  for v_dept in
    -- trim() : home_department est char(3) paddé ('06 '). On archive/compare en code trimé ('06').
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

  -- 4. Badge « Champion de saison » = national XP rang 1. Attribué UNE fois par pêcheur
  -- (unique user_id/slug → un multi-champion garde son earned_at d'origine). Le badge n'est
  -- PAS dérivable des prises → recompute_my_badges ne le touche jamais (slug absent de sa liste).
  insert into public.user_badges (user_id, badge_slug, tier, target, progress)
  select sr.user_id, 'season_champion', 1, 1, 1
  from public.season_results sr
  where sr.season_key = v_key and sr.scope = 'national' and sr.metric = 'xp'
    and sr.dept = '' and sr.species = '' and sr.rank = 1
  on conflict (user_id, badge_slug) do nothing;

  -- 5. Retour : lignes fraîches du board flagship (rang 1 = champion, 2-10 = récap).
  return query
  select
    (case when (e->>'rank')::int = 1 then 'champion' else 'recap' end)::text,
    (e->>'user_id')::uuid,
    v_key,
    (e->>'rank')::int,
    (e->>'metric_value')::numeric
  from jsonb_array_elements(v_fresh) e;
end;
$$;

comment on function public.archive_season(int) is
  'Fige le podium d''une saison (Sprint 67) : national/département × 4 métriques, top 10 + badge « Champion de saison » (national XP #1). Idempotent (ON CONFLICT). Retourne les lignes FRAÎCHES du board national XP (pour notifs récap uniques). Appelée par le cron archive-season en service_role.';

revoke all on function public.archive_season(int) from public, anon, authenticated;
grant execute on function public.archive_season(int) to service_role;

-- ════════════════════════════════════════════════════════════════════════════════
-- VOLET B — NOTIFS DE RANG (dépassement par un follow)
-- ════════════════════════════════════════════════════════════════════════════════

-- ─── B1. get_overtaken_followers : quels de MES followers (opt-in) j'ai dépassés ───
-- Au log d'une prise/sortie, l'appelant (actor) a gagné p_delta d'XP de saison. On cherche
-- les pêcheurs F qui SUIVENT l'actor (donc l'actor apparaît dans le board 'follows' de F) et
-- que l'actor vient de DÉPASSER : F était devant-ou-à-égalité (A_avant <= F) et est maintenant
-- derrière (F < A_maintenant). Les deux comptes doivent être opt-in. Renvoie {user_id, username}
-- — zéro coordonnée. Appelée en service_role depuis l'app (p_actor explicite, pas auth.uid()).
create or replace function public.get_overtaken_followers(p_actor uuid, p_delta numeric)
returns table (user_id uuid, username text)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_start timestamptz;
  v_end   timestamptz;
  v_now   numeric;      -- XP de saison de l'actor MAINTENANT (après le gain)
  v_before numeric;     -- XP de saison de l'actor AVANT le gain
begin
  if p_actor is null or coalesce(p_delta, 0) <= 0 then
    return;
  end if;
  -- L'actor doit être opt-in, sinon rien à comparer (il n'est dans aucun classement).
  if not exists (select 1 from public.profiles where id = p_actor and public_ranking = true) then
    return;
  end if;

  select w.starts_at, w.ends_at into v_start, v_end from public.season_window(0) w;

  v_now := coalesce((
    select sum(x.points) from public.xp_events x
    where x.user_id = p_actor and x.created_at >= v_start and x.created_at < v_end
  ), 0)::numeric;
  v_before := v_now - p_delta;

  return query
  select f.follower_id as user_id, pf.username::text as username
  from public.follows f
  join public.profiles pf on pf.id = f.follower_id
  where f.following_id = p_actor
    and pf.public_ranking = true
    and pf.id <> p_actor
    and (
      -- XP de saison du follower F (immuable pendant CE log).
      coalesce((
        select sum(x2.points) from public.xp_events x2
        where x2.user_id = pf.id and x2.created_at >= v_start and x2.created_at < v_end
      ), 0)::numeric
    ) >= v_before
    and (
      coalesce((
        select sum(x3.points) from public.xp_events x3
        where x3.user_id = pf.id and x3.created_at >= v_start and x3.created_at < v_end
      ), 0)::numeric
    ) < v_now;
end;
$$;

comment on function public.get_overtaken_followers(uuid, numeric) is
  'Sprint 67 : followers OPT-IN que p_actor vient de dépasser en XP de saison (delta = XP gagnée au log). Spot-safe ({user_id, username}). Appelée en service_role (émission event-driven des notifs « X t''a dépassé »). Fenêtre = saison courante.';

revoke all on function public.get_overtaken_followers(uuid, numeric) from public, anon, authenticated;
grant execute on function public.get_overtaken_followers(uuid, numeric) to service_role;

-- ─── B2. Types de notification : rank_overtake + season_recap ──────────────────────
-- Pattern 085/101 : on RÉÉCRIT la liste COMPLÈTE (dropper un type existant casserait les
-- notifs déjà émises). rank_overtake = acteur humain (le pêcheur qui dépasse) ; season_recap
-- = self-notif (actor_id NULL, émise par le cron d'archivage). Opt-out PUSH via la clé de pref
-- 'ranking' (lib/notifications/prefs-meta.ts). In-app toujours créée.
alter table public.notifications drop constraint if exists notifications_type_check;

alter table public.notifications add constraint notifications_type_check
  check (type in (
    'new_follower', 'post_liked', 'post_commented', 'catch_commented', 'mention',
    'spot_approved', 'spot_rejected', 'recfishing_reminder', 'outing_join', 'outing_accepted',
    'optimal_window', 'spot_verified', 'outing_full', 'outing_cancelled', 'outing_message',
    'outing_reminder', 'big_tide', 'followed_catch', 'species_closure', 'weekly_digest',
    'nearby_outing',
    'level_up', 'badge_earned', 'new_record', 'streak_danger', 'challenge_completed',
    -- Sprint 67 (rangs vivants) :
    'rank_overtake', 'season_recap'
  ));

-- ════════════════════════════════════════════════════════════════════════════════
-- VOLET C — RARETÉ DES BADGES (agrégat opaque)
-- ════════════════════════════════════════════════════════════════════════════════

-- ─── C1. get_badge_rarity : % de détenteurs par badge (jamais QUI) ─────────────────
-- holders = nb de pêcheurs détenant le badge. total = nb de pêcheurs ACTIFS (≥ 1 prise) —
-- dénominateur honnête « parmi les pêcheurs qui pêchent », pas les inscrits fantômes. Le %
-- est calculé en TS. Aucune identité exposée (un COUNT et rien d'autre). Rafraîchi à la lecture
-- (dataset minuscule) + cache RSC côté app.
create or replace function public.get_badge_rarity()
returns table (badge_slug text, holders int, total int)
language sql
stable
security definer
set search_path = public
as $$
  with denom as (
    select count(distinct c.user_id)::int as t from public.catches c
  )
  select ub.badge_slug, count(distinct ub.user_id)::int as holders, (select t from denom) as total
  from public.user_badges ub
  group by ub.badge_slug;
$$;

comment on function public.get_badge_rarity() is
  'Sprint 67 : rareté des badges = {slug, holders, total} où total = pêcheurs actifs (≥1 prise). Agrégat opaque, n''expose JAMAIS l''identité des détenteurs. Le % est calculé côté app.';

-- Agrégat sans PII, badges déjà publics (get_public_badges est grantée anon) → lecture large.
revoke all on function public.get_badge_rarity() from public;
grant execute on function public.get_badge_rarity() to anon, authenticated;
