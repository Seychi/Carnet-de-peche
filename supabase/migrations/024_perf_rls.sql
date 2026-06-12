-- =====================================================================
-- Carnet de Pêche — 024 perf RLS (sprint 11 Bloc F — audit EXPLAIN prod)
-- =====================================================================
-- NON APPLIQUÉE — à relire par John puis jouer via le dashboard
-- (Supabase Studio → SQL Editor). Aucun changement de schéma : uniquement
-- des recréations de fonctions/vue/policies à sémantique identique + index.
--
-- Constat de l'audit EXPLAIN live (prod, 2026-06-12) :
--   • get_spots_for_map() : 58-82 ms pour seulement 10 spots. Cause :
--     public.has_active_subscription(auth.uid()) est appelée ~4 fois PAR
--     SPOT (2 CASE lng/lat + is_precise + WHERE), et chaque appel exécute
--     un SELECT sur subscriptions. À 100-120 spots curés (objectif
--     sprint 10), le coût serait x10-12 → fix AVANT la curation.
--   • Advisor Supabase `auth_rls_initplan` : ~25 policies évaluent
--     auth.uid() (et parfois has_active_subscription / is_moderator)
--     ligne par ligne au lieu d'une fois par requête.
--
-- Le fix : faire évaluer auth.uid() et has_active_subscription(auth.uid())
-- UNE SEULE FOIS par requête.
--   • Fonctions RPC : CTE matérialisée mono-ligne `viewer` + cross join
--     (1 évaluation par appel, garanti par `as materialized`).
--   • Vue + policies : sous-requête scalaire `(select auth.uid())` →
--     le planner en fait un InitPlan exécuté une fois par requête.
-- La sémantique de chaque objet est STRICTEMENT identique à la dernière
-- version appliquée (002/003/004/010/017/021/022/023) : mêmes colonnes,
-- mêmes CASE de floutage geom vs geom_public, même visibilité
-- public/subscriber/private, mêmes security definer / search_path.
--
-- Sections :
--   1. INITPLAN chemin carte (CRITIQUE) : get_spots_for_map (dernière
--      version = 010), nearby_spots (004), vue spots_for_viewer (003),
--      policy spots_select_visible (002).
--   2. Index manquants (feed_comments par auteur, feed_posts global
--      approuvé, lookup feed_posts par catch_id, lookup reports par cible).
--   3. Drop des index redondants (couverts par d'autres index existants).
--   4. INITPLAN sur les policies RLS (advisor auth_rls_initplan) :
--      drop + create à l'identique, seul le wrapping (select …) change.
--   5. VÉRIF POST-APPLICATION : 3 EXPLAIN à relancer.
--
-- NB : get_spot_by_slug (011) / get_spot_by_id (012) appellent aussi
-- has_active_subscription mais sur UNE ligne → 1 évaluation, pas de
-- problème, on n'y touche pas. Idem catches_for_viewer (013/015) :
-- catch_visible_geom est par-ligne par nature (dépend de c), hors scope.
-- =====================================================================


-- =====================================================================
-- 1. INITPLAN — chemin carte (finding CRITIQUE)
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1a. get_spots_for_map — repart de la version 010 (coalesce anti-NULL
--     pour les anonymes). auth.uid() + has_active_subscription passent
--     dans une CTE matérialisée mono-ligne : 1 évaluation par appel au
--     lieu de ~4 par spot.
-- ---------------------------------------------------------------------
create or replace function public.get_spots_for_map(
  dept_filter char(3) default null,
  species_filter text[] default null,
  technique_filter text[] default null
)
returns table (
  id          uuid,
  name        text,
  slug        text,
  department  char(3),
  region      text,
  lng         double precision,
  lat         double precision,
  is_precise  boolean,
  techniques  text[],
  species     text[],
  structure   text,
  difficulty  smallint,
  verified    boolean
)
language sql
stable
security definer
set search_path = public
as $$
  with viewer as materialized (
    select
      auth.uid()                                  as uid,
      public.has_active_subscription(auth.uid())  as is_sub
  )
  select
    s.id,
    s.name,
    s.slug,
    s.department,
    s.region,
    -- Coords précises si proprio ou abonné actif ; centroïde du disque flouté sinon
    case
      when coalesce(s.created_by = v.uid, false) or v.is_sub
        then ST_X(s.geom::geometry)
      else ST_X(ST_Centroid(s.geom_public::geometry))
    end as lng,
    case
      when coalesce(s.created_by = v.uid, false) or v.is_sub
        then ST_Y(s.geom::geometry)
      else ST_Y(ST_Centroid(s.geom_public::geometry))
    end as lat,
    coalesce(s.created_by = v.uid, false) or v.is_sub as is_precise,
    s.techniques,
    s.species,
    s.structure,
    s.difficulty,
    s.verified
  from public.spots s
  cross join viewer v
  where (
    s.visibility = 'public'
    or (s.visibility = 'subscriber' and v.is_sub)
    or coalesce(s.created_by = v.uid, false)
  )
  and (dept_filter is null or s.department = dept_filter)
  and (species_filter is null or s.species && species_filter)
  and (technique_filter is null or s.techniques && technique_filter)
  order by s.name;
$$;

-- Grant identique à 009/010 (create or replace préserve les ACL ; on
-- ré-affirme pour la lisibilité).
grant execute on function public.get_spots_for_map(char, text[], text[]) to anon, authenticated;

-- ---------------------------------------------------------------------
-- 1b. nearby_spots — repart de la version 004 (jamais redéfinie depuis).
--     Même traitement : CTE viewer matérialisée, 1 évaluation par appel.
-- ---------------------------------------------------------------------
create or replace function public.nearby_spots(
  lat double precision,
  lng double precision,
  radius_km double precision default 50,
  species_filter text[] default null,
  technique_filter text[] default null
)
returns table (
  id uuid,
  name text,
  slug text,
  department char(3),
  distance_m double precision,
  techniques text[],
  species text[],
  difficulty smallint
)
language sql
stable
security definer
set search_path = public
as $$
  with viewer as materialized (
    select
      auth.uid()                                  as uid,
      public.has_active_subscription(auth.uid())  as is_sub
  )
  select
    s.id,
    s.name,
    s.slug,
    s.department,
    ST_Distance(
      s.geom,
      ST_SetSRID(ST_MakePoint(lng, lat), 4326)::geography
    ) as distance_m,
    s.techniques,
    s.species,
    s.difficulty
  from public.spots s
  cross join viewer v
  where ST_DWithin(
          s.geom,
          ST_SetSRID(ST_MakePoint(lng, lat), 4326)::geography,
          radius_km * 1000
        )
    and (
      s.visibility = 'public'
      or (s.visibility = 'subscriber' and v.is_sub)
      or s.created_by = v.uid
    )
    and (species_filter is null   or s.species   && species_filter)
    and (technique_filter is null or s.techniques && technique_filter)
  order by distance_m
  limit 100;
$$;

-- ---------------------------------------------------------------------
-- 1c. Vue spots_for_viewer — repart de la version 003 (jamais redéfinie
--     depuis). Deux changements de forme, zéro changement de sémantique :
--     • geom_precise : l'appel par-ligne à spot_visible_geom(s) (security
--       definer → non inlinable → auth.uid() + has_active_subscription
--       exécutées PAR LIGNE) est remplacé par son CASE inliné à
--       l'identique (cf 004 l.102-114), avec sous-requêtes scalaires →
--       InitPlan. coalesce(x, null) ≡ x, donc le coalesce d'origine tombe.
--     • WHERE : mêmes 3 branches, wrappées en (select …).
--     Mêmes colonnes, mêmes noms, mêmes types, même ordre → create or
--     replace view accepté sans drop. La fonction spot_visible_geom
--     reste en place telle quelle (utilisée nulle part ailleurs, mais on
--     ne supprime rien dans cette migration).
-- ---------------------------------------------------------------------
create or replace view public.spots_for_viewer as
select
  s.id,
  s.name,
  s.slug,
  s.department,
  s.region,
  case
    when s.created_by = (select auth.uid()) then s.geom
    when (select public.has_active_subscription(auth.uid())) then s.geom
    else null  -- les non-abonnés n'utilisent que geom_public
  end as geom_precise,                                           -- null si pas autorisé
  s.geom_public,                                                 -- toujours dispo (flouté 1 km)
  s.techniques,
  s.species,
  s.structure,
  s.difficulty,
  s.description,
  s.access_notes,
  s.hazards,
  s.visibility,
  s.created_by,
  s.verified,
  s.created_at
from public.spots s
where
  s.visibility = 'public'
  or (s.visibility = 'subscriber' and (select public.has_active_subscription(auth.uid())))
  or s.created_by = (select auth.uid());

-- ---------------------------------------------------------------------
-- 1d. Policy spots_select_visible — version 002, wrapping initplan.
-- ---------------------------------------------------------------------
drop policy if exists "spots_select_visible" on public.spots;
create policy "spots_select_visible"
  on public.spots for select
  using (
    visibility = 'public'
    or (visibility = 'subscriber' and (select public.has_active_subscription(auth.uid())))
    or created_by = (select auth.uid())
  );


-- =====================================================================
-- 2. Index manquants (findings importants)
-- =====================================================================
-- Volumes actuels faibles → pas besoin de CONCURRENTLY (qui serait de
-- toute façon interdit dans la transaction du SQL Editor).

-- Rate-limit anti-spam des commentaires : countLast24h (app/actions/feed.ts)
-- + trigger backstop enforce_feed_comment_rate_limit (022) comptent les
-- commentaires par author_id sur 24h À CHAQUE commentaire posté — aucun
-- index ne couvrait author_id (advisor : FK non couverte). Couvre aussi la
-- cascade de suppression de compte.
create index if not exists feed_comments_author_created_idx
  on public.feed_comments (author_id, created_at desc);

-- Fil global trié par date (sans filtre region) : partiel sur approved,
-- aligné sur feed_posts_for_viewer / get_feed_unread_counts.
create index if not exists feed_posts_created_approved_idx
  on public.feed_posts (created_at desc)
  where moderation_status = 'approved';

-- Lookup "ce catch a-t-il déjà été partagé ?" (composer) — partiel,
-- la majorité des posts n'ont pas de catch lié.
create index if not exists feed_posts_catch_id_idx
  on public.feed_posts (catch_id)
  where catch_id is not null;

-- Modération : signalements par cible (post/comment/catch/profile/spot).
create index if not exists reports_target_idx
  on public.reports (target_type, target_id);


-- =====================================================================
-- 3. Drop des index redondants
-- =====================================================================

-- 003 : feed_posts_author_idx (author_id) — préfixe strict de
-- feed_posts_author_created_idx (author_id, created_at desc) créé en 017.
drop index if exists public.feed_posts_author_idx;

-- 003 : feed_posts_region_created_idx (region, created_at desc) — le fil
-- ne lit que des posts approved (RLS-FIX-04 + vues) : le partiel
-- feed_posts_region_approved_idx (017) couvre toutes les requêtes réelles.
-- ⚠ Hypothèse documentée : si un futur flux de modération lit des posts
-- `pending` PAR RÉGION (bascule moderation_status='pending' prévue au
-- CLAUDE.md), le partiel ne couvrira pas → recréer un index region
-- non-partiel à ce moment-là.
drop index if exists public.feed_posts_region_created_idx;

-- 014 : spot_scores_spot_id_idx — doublonne l'index unique
-- spot_scores_spot_id_key généré par la contrainte UNIQUE (spot_id).
drop index if exists public.spot_scores_spot_id_idx;


-- =====================================================================
-- 4. INITPLAN sur les policies RLS (advisor auth_rls_initplan)
-- =====================================================================
-- Drop + create à l'identique de la DERNIÈRE version appliquée de chaque
-- policy (002, puis 017/021/022/023 pour celles redéfinies depuis). Seul
-- changement : auth.uid() → (select auth.uid()),
-- public.is_moderator() → (select public.is_moderator()).
-- Les appels corrélés à une colonne de la ligne — can_post_in_department
-- (region / p.region) — ne sont PAS wrappables (dépendent de la ligne) et
-- restent tels quels. Les policies sans auth.uid() ne sont pas touchées :
-- profiles_select_all, catches_select_public, conditions_cache_select_all,
-- spot_scores_read_all. Les policies multiples de catches ne sont PAS
-- fusionnées (décision : risqué, hors scope).

-- ---------- PROFILES (002) ----------
drop policy if exists "profiles_update_self" on public.profiles;
create policy "profiles_update_self"
  on public.profiles for update
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

-- ---------- SPOTS (002) — spots_select_visible déjà traitée en 1d ----------
drop policy if exists "spots_insert_authenticated" on public.spots;
create policy "spots_insert_authenticated"
  on public.spots for insert
  with check ((select auth.uid()) is not null and created_by = (select auth.uid()));

drop policy if exists "spots_update_own" on public.spots;
create policy "spots_update_own"
  on public.spots for update
  using (created_by = (select auth.uid()));

drop policy if exists "spots_delete_own" on public.spots;
create policy "spots_delete_own"
  on public.spots for delete
  using (created_by = (select auth.uid()));

-- ---------- CATCHES (002) ----------
drop policy if exists "catches_select_own" on public.catches;
create policy "catches_select_own"
  on public.catches for select
  using (user_id = (select auth.uid()));

drop policy if exists "catches_select_friends" on public.catches;
create policy "catches_select_friends"
  on public.catches for select
  using (
    privacy in ('friends','public')
    and exists (
      select 1 from public.follows
      where follower_id = (select auth.uid()) and following_id = catches.user_id
    )
  );

-- catches_select_public : using (privacy = 'public') — pas d'auth.uid(), inchangée.

drop policy if exists "catches_insert_own" on public.catches;
create policy "catches_insert_own"
  on public.catches for insert
  with check ((select auth.uid()) = user_id);

drop policy if exists "catches_update_own" on public.catches;
create policy "catches_update_own"
  on public.catches for update
  using (user_id = (select auth.uid()));

drop policy if exists "catches_delete_own" on public.catches;
create policy "catches_delete_own"
  on public.catches for delete
  using (user_id = (select auth.uid()));

-- ---------- FEED_POSTS (017 select/delete, 022 insert/update, 023 modo) ----------
drop policy if exists "feed_posts_select_approved" on public.feed_posts;
create policy "feed_posts_select_approved"
  on public.feed_posts for select
  using (
    (select auth.uid()) is not null
    and (moderation_status = 'approved' or author_id = (select auth.uid()))
  );

drop policy if exists "feed_posts_insert_authenticated" on public.feed_posts;
create policy "feed_posts_insert_authenticated"
  on public.feed_posts for insert
  with check (
    (select auth.uid()) = author_id
    and region is not null
    and public.can_post_in_department(region)
  );

drop policy if exists "feed_posts_update_own" on public.feed_posts;
create policy "feed_posts_update_own"
  on public.feed_posts for update
  using (author_id = (select auth.uid()))
  with check (
    author_id = (select auth.uid())
    and region is not null
    and public.can_post_in_department(region)
  );

drop policy if exists "feed_posts_delete_own" on public.feed_posts;
create policy "feed_posts_delete_own"
  on public.feed_posts for delete
  using (author_id = (select auth.uid()));

drop policy if exists "feed_posts_delete_moderator" on public.feed_posts;
create policy "feed_posts_delete_moderator"
  on public.feed_posts for delete
  using ((select public.is_moderator()));

-- ---------- FEED_COMMENTS (017 select, 022 insert, 002 delete, 023 modo) ----------
drop policy if exists "feed_comments_select_authenticated" on public.feed_comments;
create policy "feed_comments_select_authenticated"
  on public.feed_comments for select
  using ((select auth.uid()) is not null);

drop policy if exists "feed_comments_insert_authenticated" on public.feed_comments;
create policy "feed_comments_insert_authenticated"
  on public.feed_comments for insert
  with check (
    (select auth.uid()) = author_id
    and exists (
      select 1 from public.feed_posts p
      where p.id = post_id
        and public.can_post_in_department(p.region)
    )
  );

drop policy if exists "feed_comments_delete_own" on public.feed_comments;
create policy "feed_comments_delete_own"
  on public.feed_comments for delete
  using (author_id = (select auth.uid()));

drop policy if exists "feed_comments_delete_moderator" on public.feed_comments;
create policy "feed_comments_delete_moderator"
  on public.feed_comments for delete
  using ((select public.is_moderator()));

-- ---------- FEED_LIKES (017 select/delete, 022 insert) ----------
drop policy if exists "feed_likes_select_authenticated" on public.feed_likes;
create policy "feed_likes_select_authenticated"
  on public.feed_likes for select
  using ((select auth.uid()) is not null);

drop policy if exists "feed_likes_insert_authenticated" on public.feed_likes;
create policy "feed_likes_insert_authenticated"
  on public.feed_likes for insert
  with check (
    (select auth.uid()) = user_id
    and exists (
      select 1 from public.feed_posts p
      where p.id = post_id
        and public.can_post_in_department(p.region)
    )
  );

drop policy if exists "feed_likes_delete_own" on public.feed_likes;
create policy "feed_likes_delete_own"
  on public.feed_likes for delete
  using (user_id = (select auth.uid()));

-- ---------- FOLLOWS (017 select, 002 insert/delete) ----------
drop policy if exists "follows_select_authenticated" on public.follows;
create policy "follows_select_authenticated"
  on public.follows for select
  using ((select auth.uid()) is not null);

drop policy if exists "follows_insert_own" on public.follows;
create policy "follows_insert_own"
  on public.follows for insert
  with check ((select auth.uid()) = follower_id);

drop policy if exists "follows_delete_own" on public.follows;
create policy "follows_delete_own"
  on public.follows for delete
  using ((select auth.uid()) = follower_id);

-- ---------- SUBSCRIPTIONS (021) ----------
drop policy if exists "subscriptions_select_own" on public.subscriptions;
create policy "subscriptions_select_own"
  on public.subscriptions for select
  using (user_id = (select auth.uid()));

-- ---------- REPORTS (002 select/insert, 023 update modo) ----------
drop policy if exists "reports_select_own_or_mod" on public.reports;
create policy "reports_select_own_or_mod"
  on public.reports for select
  using (
    reporter_id = (select auth.uid())
    or exists (select 1 from public.profiles where id = (select auth.uid()) and is_ambassador = true)
  );

drop policy if exists "reports_insert_authenticated" on public.reports;
create policy "reports_insert_authenticated"
  on public.reports for insert
  with check ((select auth.uid()) is not null and reporter_id = (select auth.uid()));

drop policy if exists "reports_update_moderator" on public.reports;
create policy "reports_update_moderator"
  on public.reports for update
  using ((select public.is_moderator()))
  with check ((select public.is_moderator()));

-- ── storage.objects (bucket catches, policies de 006) ─────────────────
-- Mêmes warnings advisor : auth.uid()::text évalué par ligne. Le wrapping
-- est sûr (non corrélé à la ligne). Recréées à l'identique de 006, seul
-- (select auth.uid()) change.

drop policy if exists "catches_storage_select_own" on storage.objects;
create policy "catches_storage_select_own"
  on storage.objects for select
  using (
    bucket_id = 'catches'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

drop policy if exists "catches_storage_insert_own" on storage.objects;
create policy "catches_storage_insert_own"
  on storage.objects for insert
  with check (
    bucket_id = 'catches'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

drop policy if exists "catches_storage_delete_own" on storage.objects;
create policy "catches_storage_delete_own"
  on storage.objects for delete
  using (
    bucket_id = 'catches'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );


-- =====================================================================
-- 5. VÉRIF POST-APPLICATION (à relancer après application)
-- =====================================================================
-- ⚠ Dans le SQL Editor tu es `postgres` (bypass RLS + auth.uid() = null).
-- Pour mesurer dans les conditions réelles d'un utilisateur connecté,
-- simuler le contexte dans une transaction (rollback à la fin) :
--
--   begin;
--   set local role authenticated;
--   set local request.jwt.claims to '{"sub":"<uuid-d-un-vrai-user>","role":"authenticated"}';
--
--   -- VÉRIF 1 — chemin carte (avant : 58-82 ms pour 10 spots).
--   -- Attendu : quelques ms, et UNE SEULE exécution du scan subscriptions
--   -- (CTE viewer), plus aucun appel par-spot.
--   explain (analyze, buffers)
--   select * from public.get_spots_for_map();
--
--   -- VÉRIF 2 — vue spots_for_viewer.
--   -- Attendu : nœuds "InitPlan" pour auth.uid() / has_active_subscription
--   -- dans le plan (loops=1), pas de SubPlan ré-exécuté par ligne.
--   explain (analyze, buffers)
--   select * from public.spots_for_viewer;
--
--   -- VÉRIF 3 — fil : policies initplan + index partiel.
--   -- Attendu : filtre RLS de feed_posts en InitPlan (loops=1) et scan via
--   -- feed_posts_region_approved_idx ou feed_posts_created_approved_idx.
--   explain (analyze, buffers)
--   select * from public.feed_posts_for_viewer
--   order by created_at desc limit 20;
--
--   rollback;
--
-- Puis relancer l'advisor Supabase (Dashboard → Advisors → Performance) :
-- les warnings `auth_rls_initplan` (public + storage) doivent avoir disparu,
-- ainsi que les `duplicate_index` sur feed_posts / spot_scores.
