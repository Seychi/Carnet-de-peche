-- =====================================================================
-- Carnet de Pêche — 035 : photos de post (upload direct) — sprint 13 Bloc A
-- =====================================================================
-- Permet à n'importe quel post de porter 1..4 photos uploadées directement
-- (façon Instagram), EN PLUS du partage de prise (catch_id) existant.
--
-- SÉCURITÉ :
--  - RLS posée AVANT toute donnée. Lecture d'une photo = visibilité du post
--    parent (on s'appuie sur la RLS de feed_posts, PAS sur la vue
--    feed_posts_for_viewer → sinon récursion : vue → photo_paths → photos →
--    vue …). feed_posts.feed_posts_select_approved gère déjà qui voit quoi.
--  - Bucket Storage privé `feed-photos`. Lecture d'affichage = URLs signées
--    générées côté serveur avec le client service_role (l'autorisation est
--    déjà assurée par la requête du fil qui ne renvoie que des posts visibles).
--    Les policies storage.objects ne donnent que l'accès « propriétaire ».
--  - Strip EXIF/GPS = côté client (re-encodage canvas→WebP), cf Bloc B.
--
-- ROLLBACK : drop trigger + table + policies storage + bucket + revert vue 017.
-- =====================================================================

-- 1) Table -------------------------------------------------------------
create table if not exists public.feed_post_photos (
  id           uuid primary key default gen_random_uuid(),
  post_id      uuid not null references public.feed_posts(id) on delete cascade,
  user_id      uuid not null references public.profiles(id)   on delete cascade,
  storage_path text not null,
  position     smallint not null default 0,
  width        int,
  height       int,
  created_at   timestamptz not null default now()
);

create index if not exists feed_post_photos_post_position_idx
  on public.feed_post_photos (post_id, position);

-- Empêche qu'une même image (ou le chemin d'un autre user) soit réclamée 2x.
create unique index if not exists feed_post_photos_storage_path_key
  on public.feed_post_photos (storage_path);

-- 2) RLS d'abord -------------------------------------------------------
alter table public.feed_post_photos enable row level security;

-- SELECT : la photo est visible si le post parent est visible par le viewer.
-- EXISTS sur la table de base feed_posts → sa RLS (select_approved) s'applique
-- dans le contexte de l'appelant. Pas de référence à la vue → pas de récursion.
create policy feed_post_photos_select on public.feed_post_photos
  for select
  using (
    exists (select 1 from public.feed_posts fp where fp.id = post_id)
  );

-- INSERT : seulement ses propres photos, et uniquement sur SON post.
create policy feed_post_photos_insert on public.feed_post_photos
  for insert
  with check (
    user_id = (select auth.uid())
    and exists (
      select 1 from public.feed_posts fp
      where fp.id = post_id and fp.author_id = (select auth.uid())
    )
  );

-- DELETE : ses propres photos (la cascade du post couvre la suppression du post).
create policy feed_post_photos_delete on public.feed_post_photos
  for delete
  using (user_id = (select auth.uid()));

-- 3) Plafond 4 photos / post (backstop DB) -----------------------------
-- SECURITY DEFINER pour compter TOUTES les lignes du post (insensible à la RLS),
-- search_path vidé + objets qualifiés (durcissement 11.5/11.6).
create or replace function public.feed_post_photos_enforce_limit()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (select count(*) from public.feed_post_photos where post_id = new.post_id) >= 4 then
    raise exception 'max_photos_per_post'
      using message = 'Maximum 4 photos par post.';
  end if;
  return new;
end;
$$;

drop trigger if exists feed_post_photos_limit_trg on public.feed_post_photos;
create trigger feed_post_photos_limit_trg
  before insert on public.feed_post_photos
  for each row execute function public.feed_post_photos_enforce_limit();

-- 4) Bucket Storage privé + policies « propriétaire » ------------------
-- Chemin : feed-photos/<user_id>/<dossier>/<n>.webp → foldername[1] = user_id.
insert into storage.buckets (id, name, public)
values ('feed-photos', 'feed-photos', false)
on conflict (id) do nothing;

drop policy if exists feed_photos_insert_own on storage.objects;
create policy feed_photos_insert_own on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'feed-photos'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

drop policy if exists feed_photos_select_own on storage.objects;
create policy feed_photos_select_own on storage.objects
  for select to authenticated
  using (
    bucket_id = 'feed-photos'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

drop policy if exists feed_photos_delete_own on storage.objects;
create policy feed_photos_delete_own on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'feed-photos'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

-- 5) Vue : expose photo_paths (agrégat ordonné) -----------------------
-- CREATE OR REPLACE append-only : on garde TOUTES les colonnes de 017 dans le
-- même ordre et on ajoute photo_paths en dernier. security_invoker (031)
-- ré-affirmé. Le sous-select sur feed_post_photos est filtré par sa RLS
-- (cohérente avec la visibilité du post).
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
  prof.username        as author_username,
  prof.display_name    as author_display_name,
  prof.avatar_url      as author_avatar_url,
  prof.home_department as author_home_department,
  c.species            as catch_species,
  c.size_cm            as catch_size_cm,
  c.weight_g           as catch_weight_g,
  c.caught_at          as catch_caught_at,
  c.photo_path         as catch_photo_path,
  c.technique          as catch_technique,
  c.spot_name          as catch_spot_name,
  sp.slug              as catch_spot_slug,
  (exists (
    select 1 from public.feed_likes l
    where l.post_id = fp.id and l.user_id = auth.uid()
  )) as liked_by_me,
  (
    select array_agg(ph.storage_path order by ph.position, ph.created_at)
    from public.feed_post_photos ph
    where ph.post_id = fp.id
  ) as photo_paths
from public.feed_posts fp
  join public.profiles prof on prof.id = fp.author_id
  left join public.catches_for_viewer c on c.id = fp.catch_id
  left join public.spots sp on sp.id = c.spot_id
where auth.uid() is not null
  and fp.moderation_status = 'approved'::text;

alter view public.feed_posts_for_viewer set (security_invoker = true);

comment on view public.feed_posts_for_viewer is
  'Posts visibles par le viewer (approved). security_invoker=true (031). photo_paths (035) = chemins Storage des photos du post, ordonnés ; lecture filtrée par la RLS de feed_post_photos. URLs signées générées côté serveur (service_role).';
