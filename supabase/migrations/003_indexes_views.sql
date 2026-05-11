-- =====================================================================
-- Carnet de Pêche — 003 indexes & views
-- Index PostGIS, index de performance, vues pour l'affichage public.
-- =====================================================================

-- ---------- Index PostGIS (recherche géographique) ----------
create index if not exists spots_geom_idx
  on public.spots using gist (geom);

create index if not exists spots_geom_public_idx
  on public.spots using gist (geom_public);

create index if not exists catches_geom_public_idx
  on public.catches using gist (geom_public);

-- ---------- Index B-tree (filtres usuels) ----------
create index if not exists spots_department_idx           on public.spots (department);
create index if not exists spots_species_gin              on public.spots using gin (species);
create index if not exists spots_techniques_gin           on public.spots using gin (techniques);
create index if not exists spots_visibility_idx           on public.spots (visibility);

create index if not exists catches_user_date_idx          on public.catches (user_id, caught_at desc);
create index if not exists catches_spot_idx               on public.catches (spot_id);
create index if not exists catches_species_idx            on public.catches (species);
create index if not exists catches_caught_at_idx          on public.catches (caught_at desc);
create index if not exists catches_privacy_idx            on public.catches (privacy);

create index if not exists feed_posts_region_created_idx  on public.feed_posts (region, created_at desc);
create index if not exists feed_posts_mod_status_idx      on public.feed_posts (moderation_status);
create index if not exists feed_posts_author_idx          on public.feed_posts (author_id);

create index if not exists feed_comments_post_idx         on public.feed_comments (post_id, created_at);
create index if not exists follows_following_idx          on public.follows (following_id);
create index if not exists reports_status_idx             on public.reports (status, created_at);

-- ---------- Recherche fulltext sur les spots ----------
create index if not exists spots_name_trgm_idx
  on public.spots using gin (name gin_trgm_ops);

-- ---------- Vues publiques (masquent les colonnes sensibles) ----------

-- Vue : prises visibles par l'utilisateur courant.
-- Le geom retourné dépend de la relation (ami ? non-ami ?) et des préférences du pêcheur.
create or replace view public.catches_for_viewer as
select
  c.id,
  c.user_id,
  p.username,
  p.display_name,
  p.avatar_url,
  c.spot_id,
  s.name           as spot_name,
  s.department,
  coalesce(public.catch_visible_geom(c), c.geom_public) as geom_visible,
  c.species,
  c.size_cm,
  c.weight_g,
  c.technique,
  c.bait,
  c.caught_at,
  c.photo_path,
  c.notes,
  c.privacy,
  c.released,
  c.created_at
from public.catches c
join public.profiles p on p.id = c.user_id
left join public.spots s on s.id = c.spot_id
where
  c.user_id = auth.uid()
  or c.privacy = 'public'
  or (
    c.privacy = 'friends'
    and exists (
      select 1 from public.follows
      where follower_id = auth.uid() and following_id = c.user_id
    )
  );

-- Vue : spots avec geom adapté (précis pour abonnés, flouté pour gratuits).
create or replace view public.spots_for_viewer as
select
  s.id,
  s.name,
  s.slug,
  s.department,
  s.region,
  coalesce(public.spot_visible_geom(s), null) as geom_precise,  -- null si pas autorisé
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
  or (s.visibility = 'subscriber' and public.has_active_subscription(auth.uid()))
  or s.created_by = auth.uid();

comment on view public.public_catches is 'Vue lecture seule des prises publiques avec géoloc floutée. À utiliser pour le fil régional.';

-- Vue : compteurs de profil (à utiliser dans les fiches profil).
create or replace view public.profile_stats as
select
  p.id,
  p.username,
  (select count(*) from public.catches c where c.user_id = p.id) as catches_count,
  (select count(*) from public.follows f where f.follower_id = p.id) as following_count,
  (select count(*) from public.follows f where f.following_id = p.id) as followers_count,
  (select max(c.size_cm) from public.catches c where c.user_id = p.id) as biggest_catch_cm,
  (select count(distinct c.species) from public.catches c where c.user_id = p.id) as species_count
from public.profiles p;
