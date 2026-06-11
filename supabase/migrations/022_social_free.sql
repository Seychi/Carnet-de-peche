-- ============================================================
-- Migration 022 — Sprint 10 Bloc 0 : social 100% gratuit
--   Le fil (posts, commentaires, likes) devient gratuit pour tout
--   utilisateur authentifié, sur tous les départements côtiers.
--   Le payant ne porte plus que sur : carte précise/complète, scoring,
--   filtres, offline, push, couches avancées, stats avancées, photos HD.
--   Décision John 2026-06-11 (cf docs/concurrents/fishing-grid.md §6C,
--   docs/sprint-10/BRIEF.md Bloc 0).
-- ============================================================
-- Pré-requis : 001→021 appliquées.
-- Ne touche PAS au RLS spots / spot_scores / vues *_for_viewer
-- (le gating carte/scoring reste intact).
-- ============================================================

-- ------------------------------------------------------------
-- 1) can_post_in_department(dept) : plus aucun check tier.
--    true ⇔ utilisateur authentifié ET département côtier.
--    La liste reflète lib/geo/departments.ts (référence canonique).
--    Signature inchangée → les appels RPC existants restent valides.
-- ------------------------------------------------------------
create or replace function public.can_post_in_department(dept char(3))
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select auth.uid() is not null
     and trim(dept) = any (array[
       -- Manche / Atlantique
       '14','17','22','29','33','35','40','44','50','56',
       '59','62','64','76','80','85',
       -- Méditerranée
       '06','11','13','30','34','66','83','2A','2B'
     ]);
$$;

comment on function public.can_post_in_department is
  'true si l''utilisateur est authentifié et que le département est côtier. Social 100% gratuit depuis la migration 022 (plus aucun check tier). Whitelist = lib/geo/departments.ts.';

-- ------------------------------------------------------------
-- 2) Garde-fou anti-spam : la barrière payante saute, on rate-limite.
--    Max 10 posts / 24h et 50 commentaires / 24h par utilisateur.
--    Backstop DB (trigger) : les Server Actions font le même count en
--    amont pour afficher une erreur propre, mais seul le trigger protège
--    contre un accès PostgREST direct avec la clé publishable.
-- ------------------------------------------------------------
create or replace function public.enforce_feed_post_rate_limit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
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
$$;

create or replace function public.enforce_feed_comment_rate_limit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if (
    select count(*)
    from public.feed_comments
    where author_id = new.author_id
      and created_at > now() - interval '24 hours'
  ) >= 50 then
    raise exception 'rate_limit_comments'
      using errcode = 'P0001',
            hint = 'Max 50 commentaires par 24h.';
  end if;
  return new;
end;
$$;

drop trigger if exists feed_posts_rate_limit on public.feed_posts;
create trigger feed_posts_rate_limit
  before insert on public.feed_posts
  for each row execute function public.enforce_feed_post_rate_limit();

drop trigger if exists feed_comments_rate_limit on public.feed_comments;
create trigger feed_comments_rate_limit
  before insert on public.feed_comments
  for each row execute function public.enforce_feed_comment_rate_limit();

comment on function public.enforce_feed_post_rate_limit is
  'Anti-spam post-pivot social gratuit (022) : max 10 posts/24h/user. Backstop DB des checks faits dans app/actions/feed.ts.';
comment on function public.enforce_feed_comment_rate_limit is
  'Anti-spam post-pivot social gratuit (022) : max 50 commentaires/24h/user. Backstop DB des checks faits dans app/actions/feed.ts.';

-- ------------------------------------------------------------
-- 3) RLS feed_posts : écriture = authentifié + ownership + dept côtier.
--    On recrée les policies sous des noms qui reflètent la nouvelle
--    sémantique (plus de "tier_gated").
-- ------------------------------------------------------------
drop policy if exists "feed_posts_insert_tier_gated" on public.feed_posts;
drop policy if exists "feed_posts_update_own"         on public.feed_posts;

create policy "feed_posts_insert_authenticated"
  on public.feed_posts for insert
  with check (
    auth.uid() = author_id
    and region is not null
    and public.can_post_in_department(region)
  );

-- WITH CHECK conserve le contrôle dept côtier : on ne peut pas "déplacer"
-- son post vers un département non couvert.
create policy "feed_posts_update_own"
  on public.feed_posts for update
  using (author_id = auth.uid())
  with check (
    author_id = auth.uid()
    and region is not null
    and public.can_post_in_department(region)
  );

-- feed_posts_select_approved (RLS-FIX-04) et feed_posts_delete_own : inchangés.

-- ------------------------------------------------------------
-- 4) RLS feed_comments : écriture = authentifié + post existant.
-- ------------------------------------------------------------
drop policy if exists "feed_comments_insert_tier_gated" on public.feed_comments;

create policy "feed_comments_insert_authenticated"
  on public.feed_comments for insert
  with check (
    auth.uid() = author_id
    and exists (
      select 1 from public.feed_posts p
      where p.id = post_id
        and public.can_post_in_department(p.region)
    )
  );

-- feed_comments_select_authenticated (RLS-FIX-05) + delete_own : inchangés.

-- ------------------------------------------------------------
-- 5) RLS feed_likes : like = authentifié + post existant.
-- ------------------------------------------------------------
drop policy if exists "feed_likes_insert_tier_gated" on public.feed_likes;

create policy "feed_likes_insert_authenticated"
  on public.feed_likes for insert
  with check (
    auth.uid() = user_id
    and exists (
      select 1 from public.feed_posts p
      where p.id = post_id
        and public.can_post_in_department(p.region)
    )
  );

-- feed_likes_select_authenticated + feed_likes_delete_own : inchangés.

-- ------------------------------------------------------------
-- 6) follows : déjà gratuit depuis 017 (aucun check tier). No-op intentionnel.
-- ------------------------------------------------------------
