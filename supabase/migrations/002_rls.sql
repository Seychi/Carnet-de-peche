-- =====================================================================
-- Carnet de Pêche — 002 RLS (Row Level Security)
-- Règles de sécurité par table. À jouer après 001.
-- =====================================================================

-- ---------- Activer RLS sur toutes les tables ----------
alter table public.profiles          enable row level security;
alter table public.spots             enable row level security;
alter table public.catches           enable row level security;
alter table public.feed_posts        enable row level security;
alter table public.feed_comments     enable row level security;
alter table public.feed_likes        enable row level security;
alter table public.follows           enable row level security;
alter table public.subscriptions     enable row level security;
alter table public.conditions_cache  enable row level security;
alter table public.reports           enable row level security;

-- ---------- Helper : abonnement actif ? ----------
-- Renvoie true si l'utilisateur a un abonnement Local ou Itinérant actif.
create or replace function public.has_active_subscription(uid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.subscriptions
    where user_id = uid
      and plan in ('local','itinerant')
      and status in ('active','trialing')
      and (current_period_end is null or current_period_end > now())
  );
$$;

-- =====================================================================
-- PROFILES
-- =====================================================================

-- Lecture publique de tous les profils.
create policy "profiles_select_all"
  on public.profiles for select
  using (true);

-- Seul le propriétaire peut modifier son propre profil.
create policy "profiles_update_self"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- L'insertion se fait via trigger handle_new_user (security definer), pas via RLS.

-- =====================================================================
-- SPOTS
-- =====================================================================

-- Lecture : public OU abonné actif.
create policy "spots_select_visible"
  on public.spots for select
  using (
    visibility = 'public'
    or (visibility = 'subscriber' and public.has_active_subscription(auth.uid()))
    or created_by = auth.uid()
  );

-- Insertion : tout utilisateur authentifié peut proposer un spot (modération à venir).
create policy "spots_insert_authenticated"
  on public.spots for insert
  with check (auth.uid() is not null and created_by = auth.uid());

-- Update / Delete : créateur uniquement.
create policy "spots_update_own"
  on public.spots for update
  using (created_by = auth.uid());

create policy "spots_delete_own"
  on public.spots for delete
  using (created_by = auth.uid());

-- =====================================================================
-- CATCHES (le carnet)
-- =====================================================================

-- Lecture :
--   - propriétaire : tout (geom précis inclus)
--   - amis (follows mutuels) : si privacy IN ('friends','public')
--   - tout le monde : si privacy='public' (mais via view qui masque geom — cf. 003)
create policy "catches_select_own"
  on public.catches for select
  using (user_id = auth.uid());

create policy "catches_select_friends"
  on public.catches for select
  using (
    privacy in ('friends','public')
    and exists (
      select 1 from public.follows
      where follower_id = auth.uid() and following_id = catches.user_id
    )
  );

create policy "catches_select_public"
  on public.catches for select
  using (privacy = 'public');
  -- NB: pour l'affichage public, le frontend utilise la view `public_catches`
  -- qui masque geom (précis) et n'expose que geom_public.

-- Insertion : authentifié, et user_id doit être soi.
create policy "catches_insert_own"
  on public.catches for insert
  with check (auth.uid() = user_id);

-- Update / Delete : propriétaire uniquement.
create policy "catches_update_own"
  on public.catches for update
  using (user_id = auth.uid());

create policy "catches_delete_own"
  on public.catches for delete
  using (user_id = auth.uid());

-- =====================================================================
-- FEED POSTS
-- =====================================================================

-- Lecture : seuls les posts approuvés sont publics.
create policy "feed_posts_select_approved"
  on public.feed_posts for select
  using (moderation_status = 'approved' or author_id = auth.uid());

-- Insertion : authentifié.
create policy "feed_posts_insert_own"
  on public.feed_posts for insert
  with check (auth.uid() = author_id);

-- Update / Delete : auteur uniquement.
create policy "feed_posts_update_own"
  on public.feed_posts for update
  using (author_id = auth.uid());

create policy "feed_posts_delete_own"
  on public.feed_posts for delete
  using (author_id = auth.uid());

-- =====================================================================
-- COMMENTS & LIKES
-- =====================================================================

create policy "feed_comments_select_all"
  on public.feed_comments for select using (true);

create policy "feed_comments_insert_own"
  on public.feed_comments for insert
  with check (auth.uid() = author_id);

create policy "feed_comments_delete_own"
  on public.feed_comments for delete
  using (author_id = auth.uid());

create policy "feed_likes_select_all"
  on public.feed_likes for select using (true);

create policy "feed_likes_insert_own"
  on public.feed_likes for insert
  with check (auth.uid() = user_id);

create policy "feed_likes_delete_own"
  on public.feed_likes for delete
  using (user_id = auth.uid());

-- =====================================================================
-- FOLLOWS
-- =====================================================================

create policy "follows_select_all"
  on public.follows for select using (true);

create policy "follows_insert_own"
  on public.follows for insert
  with check (auth.uid() = follower_id);

create policy "follows_delete_own"
  on public.follows for delete
  using (auth.uid() = follower_id);

-- =====================================================================
-- SUBSCRIPTIONS
-- =====================================================================

-- Lecture : utilisateur lit son propre abonnement.
create policy "subscriptions_select_own"
  on public.subscriptions for select
  using (auth.uid() = user_id);

-- Aucun INSERT/UPDATE/DELETE via RLS — uniquement via webhook Stripe en service role.

-- =====================================================================
-- CONDITIONS CACHE
-- =====================================================================

-- Lecture publique (les conditions du jour sont visibles à tous).
create policy "conditions_cache_select_all"
  on public.conditions_cache for select using (true);

-- Écriture réservée au service role (Edge Function cron Open-Meteo).

-- =====================================================================
-- REPORTS
-- =====================================================================

create policy "reports_select_own_or_mod"
  on public.reports for select
  using (
    reporter_id = auth.uid()
    or exists (select 1 from public.profiles where id = auth.uid() and is_ambassador = true)
  );

create policy "reports_insert_authenticated"
  on public.reports for insert
  with check (auth.uid() is not null and reporter_id = auth.uid());
