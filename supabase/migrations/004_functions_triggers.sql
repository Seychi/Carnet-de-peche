-- =====================================================================
-- Carnet de Pêche — 004 functions & triggers
-- Logique automatique : création profil, floutage GPS, updated_at,
-- compteurs likes/comments, recherche spots proches.
-- =====================================================================

-- ---------- Trigger : auto-création du profil à l'inscription ----------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Crée une ligne profile vide : le pseudo et les préférences seront posés
  -- par l'onboarding obligatoire (frontend redirige tant que onboarded = false).
  insert into public.profiles (id, onboarded)
  values (new.id, false);

  -- Crée aussi un abonnement Discovery par défaut.
  insert into public.subscriptions (user_id, plan, status)
  values (new.id, 'discovery', 'active');

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------- Trigger : maintenir updated_at ----------
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger profiles_updated_at      before update on public.profiles      for each row execute function public.touch_updated_at();
create trigger spots_updated_at         before update on public.spots         for each row execute function public.touch_updated_at();
create trigger catches_updated_at       before update on public.catches       for each row execute function public.touch_updated_at();
create trigger feed_posts_updated_at    before update on public.feed_posts    for each row execute function public.touch_updated_at();
create trigger subscriptions_updated_at before update on public.subscriptions for each row execute function public.touch_updated_at();

-- ---------- Trigger : floutage GPS automatique ----------
-- Sur spots et catches, géocode geom_public à partir de geom.
-- - spots : polygon (zone) autour du point précis.
-- - catches : point flouté (déplacement aléatoire dans un rayon).
create or replace function public.blur_spot_geom()
returns trigger
language plpgsql
as $$
begin
  if new.geom is not null then
    new.geom_public := ST_Buffer(new.geom, 1000)::geography;  -- buffer 1 km (vue gratuite)
  end if;
  return new;
end;
$$;

create trigger spots_blur
  before insert or update of geom on public.spots
  for each row execute function public.blur_spot_geom();

create or replace function public.blur_catch_geom()
returns trigger
language plpgsql
as $$
declare
  jitter_lat double precision;
  jitter_lng double precision;
begin
  if new.geom is not null then
    -- Décalage aléatoire ±0.009° (~1 km à 45°N).
    jitter_lat := (random() - 0.5) * 0.018;
    jitter_lng := (random() - 0.5) * 0.018;
    new.geom_public := ST_SetSRID(
      ST_MakePoint(
        ST_X(new.geom::geometry) + jitter_lng,
        ST_Y(new.geom::geometry) + jitter_lat
      ),
      4326
    )::geography;
  end if;
  return new;
end;
$$;

create trigger catches_blur
  before insert or update of geom on public.catches
  for each row execute function public.blur_catch_geom();

-- ---------- Helpers : visibilité de geom ----------

-- Pour les SPOTS : seul un abonné Local/Itinérant voit le geom précis.
-- Les utilisateurs gratuits ne voient que geom_public (zone floutée 1 km).
create or replace function public.spot_visible_geom(s public.spots)
returns geography
language sql
stable
security definer
set search_path = public
as $$
  select case
    when s.created_by = auth.uid() then s.geom
    when public.has_active_subscription(auth.uid()) then s.geom
    else null  -- les non-abonnés n'utilisent que geom_public, accessible directement sur la table
  end;
$$;

-- Pour les CATCHES : règle par défaut = floutage SAUF si amis (et le pêcheur a laissé
-- precise_for_friends=true). Le pêcheur peut aussi forcer reveal_precise_to_public.
create or replace function public.catch_visible_geom(c public.catches)
returns geography
language sql
stable
security definer
set search_path = public
as $$
  select case
    when c.user_id = auth.uid() then c.geom
    when c.reveal_precise_to_public then c.geom
    when c.precise_for_friends and exists (
      select 1 from public.follows
      where follower_id = auth.uid() and following_id = c.user_id
    ) then c.geom
    else null  -- caller doit retomber sur geom_public
  end;
$$;

-- ---------- Compteurs likes & comments ----------
create or replace function public.bump_likes_count()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'INSERT' then
    update public.feed_posts set likes_count = likes_count + 1 where id = new.post_id;
  elsif tg_op = 'DELETE' then
    update public.feed_posts set likes_count = greatest(0, likes_count - 1) where id = old.post_id;
  end if;
  return null;
end;
$$;

create trigger feed_likes_count
  after insert or delete on public.feed_likes
  for each row execute function public.bump_likes_count();

create or replace function public.bump_comments_count()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'INSERT' then
    update public.feed_posts set comments_count = comments_count + 1 where id = new.post_id;
  elsif tg_op = 'DELETE' then
    update public.feed_posts set comments_count = greatest(0, comments_count - 1) where id = old.post_id;
  end if;
  return null;
end;
$$;

create trigger feed_comments_count
  after insert or delete on public.feed_comments
  for each row execute function public.bump_comments_count();

-- ---------- RPC : spots proches d'une position ----------
-- Usage frontend : await supabase.rpc('nearby_spots', { lat, lng, radius_km });
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
  where ST_DWithin(
          s.geom,
          ST_SetSRID(ST_MakePoint(lng, lat), 4326)::geography,
          radius_km * 1000
        )
    and (
      s.visibility = 'public'
      or (s.visibility = 'subscriber' and public.has_active_subscription(auth.uid()))
      or s.created_by = auth.uid()
    )
    and (species_filter is null   or s.species   && species_filter)
    and (technique_filter is null or s.techniques && technique_filter)
  order by distance_m
  limit 100;
$$;

-- ---------- Vues *_for_viewer (déplacées depuis 003) ----------
-- ⚠ RÉPARATION REPLAY (sprint 11, 2026-06-13) : ces vues dépendent de
-- catch_visible_geom / spot_visible_geom définies plus haut dans CE fichier
-- — elles étaient dans 003 et cassaient toute application sur base fraîche.
-- Définitions reprises VERBATIM de 003 (les versions ultérieures 013/015
-- les redéfinissent plus loin dans la séquence, comme avant). Sans effet
-- sur la prod (004 déjà enregistrée comme appliquée).

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
