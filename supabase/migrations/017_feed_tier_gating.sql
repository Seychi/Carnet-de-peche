-- ============================================================
-- Migration 017 — Sprint 8 : Fil communautaire
--   tier gating (RLS) + durcissement lecture (RLS-FIX-04/05)
--   + index + vue feed_posts_for_viewer + RPC compteurs
-- ============================================================
-- Pré-requis : 001→016 appliquées. Audit RLS : docs/sprint-8/rls-audit.md
-- Décisions : brief Bloc 0 + RLS-FIX-04/05 validés par John 2026-05-21.
-- ============================================================

-- ------------------------------------------------------------
-- 1) Helper : can_post_in_department(dept)
--    true si l'utilisateur courant a le tier requis pour écrire
--    dans ce département. Itinerant = tous depts. Local = home_department.
--    Discovery / anonymous = false (fail-closed).
-- ------------------------------------------------------------
create or replace function public.can_post_in_department(dept char(3))
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.subscriptions s
    join public.profiles p on p.id = s.user_id
    where s.user_id = auth.uid()
      and s.status in ('active','trialing')
      and (s.current_period_end is null or s.current_period_end > now())
      and (
        s.plan = 'itinerant'
        or (s.plan = 'local' and dept = p.home_department)
      )
  );
$$;

comment on function public.can_post_in_department is
  'true si l''utilisateur courant a le tier requis pour poster/commenter/liker dans le département donné. Itinerant = tous depts. Local = home_department uniquement. Discovery/anonymous = false.';

-- ------------------------------------------------------------
-- 2) feed_posts : RLS
--    - INSERT tier-gaté (RLS-FIX-01)
--    - SELECT réservé aux authentifiés (RLS-FIX-04)
--    - UPDATE/DELETE inchangés (auteur uniquement)
-- ------------------------------------------------------------
drop policy if exists "feed_posts_insert_own"     on public.feed_posts;
drop policy if exists "feed_posts_update_own"      on public.feed_posts;
drop policy if exists "feed_posts_delete_own"      on public.feed_posts;
drop policy if exists "feed_posts_select_approved" on public.feed_posts;

-- RLS-FIX-04 : lecture fermée aux non-authentifiés (defense-in-depth + redirect app)
create policy "feed_posts_select_approved"
  on public.feed_posts for select
  using (
    auth.uid() is not null
    and (moderation_status = 'approved' or author_id = auth.uid())
  );

-- RLS-FIX-01 : on ne poste que dans un dept où on a le tier
create policy "feed_posts_insert_tier_gated"
  on public.feed_posts for insert
  with check (
    auth.uid() = author_id
    and region is not null
    and public.can_post_in_department(region)
  );

-- WITH CHECK inclut le gating dept : on ne peut pas "déplacer" son post vers
-- un dept où on n'a pas le tier (sinon contournement de RLS-FIX-01 via UPDATE).
create policy "feed_posts_update_own"
  on public.feed_posts for update
  using (author_id = auth.uid())
  with check (
    author_id = auth.uid()
    and region is not null
    and public.can_post_in_department(region)
  );

create policy "feed_posts_delete_own"
  on public.feed_posts for delete
  using (author_id = auth.uid());

-- ------------------------------------------------------------
-- 3) feed_comments : RLS
--    - INSERT tier-gaté via le dept du post parent (RLS-FIX-02)
--    - SELECT réservé aux authentifiés (RLS-FIX-05)
-- ------------------------------------------------------------
drop policy if exists "feed_comments_insert_own" on public.feed_comments;
drop policy if exists "feed_comments_select_all" on public.feed_comments;

create policy "feed_comments_select_authenticated"
  on public.feed_comments for select
  using (auth.uid() is not null);

create policy "feed_comments_insert_tier_gated"
  on public.feed_comments for insert
  with check (
    auth.uid() = author_id
    and exists (
      select 1 from public.feed_posts p
      where p.id = post_id
        and public.can_post_in_department(p.region)
    )
  );

-- feed_comments_delete_own : inchangé (déjà en 002), on ne le touche pas.

-- ------------------------------------------------------------
-- 4) feed_likes : RLS
--    - INSERT tier-gaté via le dept du post (RLS-FIX-03)
--    - SELECT réservé aux authentifiés (RLS-FIX-05)
--    - DELETE par l'auteur du like (inchangé)
-- ------------------------------------------------------------
drop policy if exists "feed_likes_insert_own" on public.feed_likes;
drop policy if exists "feed_likes_delete_own" on public.feed_likes;
drop policy if exists "feed_likes_select_all" on public.feed_likes;

create policy "feed_likes_select_authenticated"
  on public.feed_likes for select
  using (auth.uid() is not null);

create policy "feed_likes_insert_tier_gated"
  on public.feed_likes for insert
  with check (
    auth.uid() = user_id
    and exists (
      select 1 from public.feed_posts p
      where p.id = post_id
        and public.can_post_in_department(p.region)
    )
  );

create policy "feed_likes_delete_own"
  on public.feed_likes for delete
  using (user_id = auth.uid());

-- ------------------------------------------------------------
-- 5) follows : SELECT réservé aux authentifiés (RLS-FIX-05)
--    INSERT/DELETE inchangés (suivre reste gratuit, pas de tier).
-- ------------------------------------------------------------
drop policy if exists "follows_select_all" on public.follows;

create policy "follows_select_authenticated"
  on public.follows for select
  using (auth.uid() is not null);

-- ------------------------------------------------------------
-- 6) Index supplémentaires
--    NB : 003 a déjà feed_posts_region_created_idx (non partiel) et
--    feed_posts_author_idx (author_id seul). On crée des noms DISTINCTS
--    pour les versions améliorées (sinon "if not exists" = no-op).
-- ------------------------------------------------------------
create index if not exists feed_posts_region_approved_idx
  on public.feed_posts (region, created_at desc)
  where moderation_status = 'approved';

create index if not exists feed_posts_text_trgm_idx
  on public.feed_posts using gin (text gin_trgm_ops);

create index if not exists feed_posts_author_created_idx
  on public.feed_posts (author_id, created_at desc);

-- ------------------------------------------------------------
-- 7) Vue feed_posts_for_viewer
--    Joint l'auteur + la catch (via catches_for_viewer = floutage déjà géré)
--    + slug du spot (catches_for_viewer n'expose pas le slug) + liked_by_me.
--    ⚠ Sécurité : une vue classique bypasse le RLS des tables sous-jacentes
--    (s'exécute comme son owner). La vue DOIT donc se sécuriser elle-même :
--    auth.uid() is not null dans le WHERE (cohérent avec RLS-FIX-04 + le
--    pattern de catches_for_viewer).
-- ------------------------------------------------------------
create or replace view public.feed_posts_for_viewer as
select
  fp.id,
  fp.author_id,
  fp.catch_id,
  fp.text,
  fp.region,
  fp.likes_count,
  fp.comments_count,
  fp.created_at,
  fp.updated_at,
  -- Auteur
  prof.username        as author_username,
  prof.display_name    as author_display_name,
  prof.avatar_url      as author_avatar_url,
  prof.home_department as author_home_department,
  -- Catch (via catches_for_viewer : floutage geom déjà appliqué)
  -- colonnes réelles : weight_g (grammes) + photo_path
  c.species            as catch_species,
  c.size_cm            as catch_size_cm,
  c.weight_g           as catch_weight_g,
  c.caught_at          as catch_caught_at,
  c.photo_path         as catch_photo_path,
  c.technique          as catch_technique,
  c.spot_name          as catch_spot_name,
  sp.slug              as catch_spot_slug,
  -- Flag perso
  exists (
    select 1 from public.feed_likes l
    where l.post_id = fp.id and l.user_id = auth.uid()
  ) as liked_by_me
from public.feed_posts fp
join public.profiles prof on prof.id = fp.author_id
left join public.catches_for_viewer c on c.id = fp.catch_id
left join public.spots sp on sp.id = c.spot_id
where auth.uid() is not null
  and fp.moderation_status = 'approved';

comment on view public.feed_posts_for_viewer is
  'Vue de lecture du fil : auteur + catch floutée (via catches_for_viewer) + liked_by_me. Réservée aux authentifiés (WHERE auth.uid() is not null). Toujours utiliser cette vue, jamais la table feed_posts directement.';

-- ------------------------------------------------------------
-- 8) RPC nb posts récents par dept (compteurs onglets / header)
-- ------------------------------------------------------------
create or replace function public.get_feed_unread_counts()
returns table (region char(3), nb_posts_24h integer)
language sql
stable
security definer
set search_path = public
as $$
  select region, count(*)::integer as nb_posts_24h
  from public.feed_posts
  where moderation_status = 'approved'
    and created_at > now() - interval '24 hours'
    and region is not null
  group by region;
$$;

comment on function public.get_feed_unread_counts is
  'Nb de posts approuvés des dernières 24h, groupés par département. Pour badges/compteurs.';

-- ------------------------------------------------------------
-- 9) Trigger touch_updated_at sur feed_posts
--    (004 l.47 le crée déjà sous le nom feed_posts_updated_at ; on le
--    laisse tel quel. On ne recrée PAS de doublon.)
-- ------------------------------------------------------------
-- (no-op intentionnel : trigger updated_at déjà présent depuis 004)
