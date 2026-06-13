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

-- ---------- Vues publiques ----------
-- ⚠ RÉPARATION REPLAY (sprint 11, 2026-06-13) : les vues catches_for_viewer
-- et spots_for_viewer étaient définies ICI alors qu'elles dépendent de
-- catch_visible_geom / spot_visible_geom créées en 004 → toute application
-- de la séquence sur une base FRAÎCHE (branche preview Supabase, CI E2E)
-- échouait à ce statement. Elles sont déplacées en FIN de 004. Sans effet
-- sur la prod (003/004 déjà enregistrées comme appliquées). Un `comment on
-- view public.public_catches` orphelin (vue jamais créée) a aussi été retiré.

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
