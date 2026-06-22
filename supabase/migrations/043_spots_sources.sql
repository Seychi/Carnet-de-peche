-- =====================================================================
-- Carnet de Pêche — 043 modèle multi-source des spots (sprint Carte-v2 / C2)
-- =====================================================================
-- Renumérotée 041 → 043 : la session C1 a appliqué 3 migrations en prod en
-- parallèle (catch_heatmap / catch_heat_realtime / catches_geom_column_lockdown,
-- ses 040/041/042) → C2 prend 043 pour éviter la collision de fichier au merge.
-- APPLIQUÉE en prod le 2026-06-22 via apply_migration. Régénérer lib/types.ts ensuite.
--
-- Pré-requis : 001→039 + les 3 migrations C1 (enregistrées par slug dans l'historique).
-- RLS reste activé partout. Aucun GRANT SELECT table-wide sur spots (verrou 028).
-- nearby_spots : on REPART du corps 039 (fix anti-trilatération GPS) — voir §7c.
--
-- OBJET : faire passer `spots` d'un socle 100% curé (inséré à la main) à un
-- modèle À 3 SOURCES, pour scaler vers 1000+ :
--   * curated   — socle vérifié (les 157 existants), badge éditorial « Vérifié »
--   * community — proposé par un pêcheur → MODÉRÉ avant d'être public
--   * imported  — structures publiques OSM importées en masse (script Bloc D)
--
-- INVARIANTS DE SÉCURITÉ (passe adversariale) :
--   1. Un spot `community`/`pending` n'est JAMAIS visible du public : ni RLS
--      table, ni vue `spots_for_viewer` (DEFINER), ni AUCUNE des 5 RPC carte.
--   2. Anti auto-approbation : `authenticated`/`anon` ont les grants table
--      INSERT/UPDATE (le verrou 028 ne portait que sur SELECT) → tout passe par
--      la RLS. Un user ne peut PAS s'auto-approuver (WITH CHECK pin
--      moderation_status='pending'/source='community'/verified=false).
--   3. Le verrou colonne `geom` (028) reste intact : on n'accorde SELECT que
--      sur les NOUVELLES colonnes (source, moderation_status), JAMAIS sur geom.
--   4. Le badge « Vérifié » reste réservé aux curés : CHECK
--      (verified ⇒ source='curated'). (Décision C2 : le badge UI s'appuie sur
--      source='curated', pas sur `verified` — on ne backfill PAS les 9 verified
--      existants. cf docs/carte-v2/RECAP-C2.md.)
--   5. Dédup géo (ST_DWithin < 150 m) à la proposition ET à l'import.
--   6. Anti-spam : max 5 propositions community / 24 h / utilisateur.
-- =====================================================================
-- (Pas de begin/commit explicite : apply_migration / le batch simple-query
--  enveloppe déjà le script dans une transaction implicite atomique.)

-- ---------------------------------------------------------------------
-- 1) Colonnes multi-source
--    `created_by` (déjà FK profiles ON DELETE SET NULL) joue le rôle de
--    « submitted_by » (le brief proposait submitted_by → redondant, écarté).
--    Les 157 curés ont created_by IS NULL → les ALTER ... DEFAULT les passent
--    en source='curated' / moderation_status='approved' sans backfill explicite.
-- ---------------------------------------------------------------------
alter table public.spots
  add column source text not null default 'curated'
    check (source in ('curated', 'community', 'imported'));

alter table public.spots
  add column moderation_status text not null default 'approved'
    check (moderation_status in ('pending', 'approved', 'rejected'));

-- Le badge éditorial « Vérifié » ne peut concerner qu'un spot curé.
alter table public.spots
  add constraint spots_verified_only_curated
  check (verified is not true or source = 'curated');

comment on column public.spots.source is
  'Provenance : curated (socle éditorial vérifié), community (proposé par un pêcheur, modéré), imported (OSM/ODbL). Migration 041.';
comment on column public.spots.moderation_status is
  'État de modération. pending/approved/rejected. community arrive en pending (RLS) ; curated/imported par défaut approved. Un pending n''est jamais public (RLS + vue + RPC). Migration 041.';

-- ---------------------------------------------------------------------
-- 2) Grants colonne — reproduire le pattern 028 (jamais de GRANT table-wide).
--    anon/authenticated lisent déjà created_by/verified ; exposer source +
--    moderation_status ne change rien à la fuite GPS (la RLS masque déjà les
--    lignes pending). geom reste exclu.
-- ---------------------------------------------------------------------
grant select (source, moderation_status) on public.spots to anon, authenticated;

-- ---------------------------------------------------------------------
-- 3) Dédup géographique (ST_DWithin). geom est en geography → comparaison en
--    mètres directe, indexée par spots_geom_idx (GiST).
--    a) find_spot_duplicate() : utilisée par la Server Action de proposition
--       pour un message FR avant insert. SECURITY DEFINER (lit geom verrouillé)
--       mais ne renvoie AUCUNE coordonnée (juste id/name/slug) → zéro fuite.
--    b) enforce_spot_dedup() : trigger BEFORE INSERT, backstop authoritatif
--       (protège même un INSERT PostgREST direct). Ne s'applique qu'au
--       community (curated/imported gèrent leur propre dédup à l'insertion SQL).
-- ---------------------------------------------------------------------
create or replace function public.find_spot_duplicate(
  p_lng double precision,
  p_lat double precision,
  p_radius_m double precision default 150
)
returns table (id uuid, name text, slug text)
language sql
stable
security definer
set search_path = public
as $$
  select s.id, s.name, s.slug
  from public.spots s
  where s.moderation_status <> 'rejected'
    and ST_DWithin(
          s.geom,
          ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326)::geography,
          p_radius_m
        )
  order by ST_Distance(s.geom, ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326)::geography)
  limit 1;
$$;

comment on function public.find_spot_duplicate is
  'Détecte un spot existant (non rejeté) à moins de p_radius_m (défaut 150 m) du point proposé. Ne renvoie que id/name/slug (jamais de coordonnée). Anti-doublon de la proposition community (041).';

grant execute on function public.find_spot_duplicate(double precision, double precision, double precision)
  to authenticated;

create or replace function public.enforce_spot_dedup()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Backstop dédup : uniquement pour les propositions community (curated/imported
  -- peuvent légitimement coexister à proximité ; ils dédupliquent via NOT EXISTS
  -- dans leur SQL d'insertion).
  if new.source = 'community' and exists (
    select 1 from public.spots s
    where s.id <> new.id
      and s.moderation_status <> 'rejected'
      and ST_DWithin(s.geom, new.geom, 150)
  ) then
    raise exception 'spot_duplicate'
      using errcode = 'P0001',
            hint = 'Un spot existe déjà à proximité (moins de 150 m).';
  end if;
  return new;
end;
$$;

drop trigger if exists spots_dedup on public.spots;
create trigger spots_dedup
  before insert on public.spots
  for each row execute function public.enforce_spot_dedup();

comment on function public.enforce_spot_dedup is
  'Backstop anti-doublon des propositions community : refuse un INSERT community à moins de 150 m d''un spot non rejeté. Backstop DB du check fait dans app/actions/spots.ts (041).';

-- ---------------------------------------------------------------------
-- 4) Anti-spam : max 5 propositions community / 24 h / utilisateur.
--    (Modèle = enforce_feed_post_rate_limit, migration 022.)
-- ---------------------------------------------------------------------
create or replace function public.enforce_spot_proposal_rate_limit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.source = 'community' and (
    select count(*)
    from public.spots
    where created_by = new.created_by
      and source = 'community'
      and created_at > now() - interval '24 hours'
  ) >= 5 then
    raise exception 'rate_limit_spots'
      using errcode = 'P0001',
            hint = 'Max 5 propositions de spots par 24 h.';
  end if;
  return new;
end;
$$;

drop trigger if exists spots_proposal_rate_limit on public.spots;
create trigger spots_proposal_rate_limit
  before insert on public.spots
  for each row execute function public.enforce_spot_proposal_rate_limit();

comment on function public.enforce_spot_proposal_rate_limit is
  'Anti-spam : max 5 propositions community/24h/user. Backstop DB du check fait dans app/actions/spots.ts (041).';

-- ---------------------------------------------------------------------
-- 5) RLS — réécriture complète (anti-fuite pending + anti auto-approbation).
--    Les policies Postgres sont OR-ées : on déclare des policies par
--    rôle/commande explicites.
-- ---------------------------------------------------------------------
drop policy if exists "spots_select_visible"       on public.spots;
drop policy if exists "spots_insert_authenticated"  on public.spots;
drop policy if exists "spots_update_own"            on public.spots;
drop policy if exists "spots_delete_own"            on public.spots;

-- SELECT : (approuvé ET visible selon tier) OU propriétaire (voit son pending)
--          OU modérateur (voit tout pour modérer).
create policy "spots_select_visible"
  on public.spots for select
  using (
    (
      moderation_status = 'approved'
      and (
        visibility = 'public'
        or (visibility = 'subscriber' and public.has_active_subscription(auth.uid()))
      )
    )
    or created_by = (select auth.uid())
    or public.is_moderator()
  );

-- INSERT (authenticated) : forcé community / pending / non-vérifié / public.
--   → un user ne peut créer qu'une PROPOSITION. curated/imported passent par
--     service_role / SQL Editor (bypass RLS). anon : auth.uid() IS NULL → bloqué.
create policy "spots_insert_community"
  on public.spots for insert
  with check (
    auth.uid() is not null
    and created_by = (select auth.uid())
    and source = 'community'
    and moderation_status = 'pending'
    and verified = false
    and visibility = 'public'
  );

-- UPDATE propriétaire : peut éditer SON spot tant qu'il n'est pas approuvé,
--   sans jamais escalader (reste community/pending/non-vérifié). Une fois
--   approuvé (public), seul un modérateur peut le modifier.
create policy "spots_update_own"
  on public.spots for update
  using (created_by = (select auth.uid()) and moderation_status <> 'approved')
  with check (
    created_by = (select auth.uid())
    and source = 'community'
    and moderation_status = 'pending'
    and verified = false
  );

-- UPDATE modérateur : approuver / rejeter / fusionner / corriger.
create policy "spots_update_moderator"
  on public.spots for update
  using (public.is_moderator())
  with check (public.is_moderator());

-- DELETE propriétaire : retirer SA proposition tant qu'elle n'est pas approuvée.
create policy "spots_delete_own"
  on public.spots for delete
  using (created_by = (select auth.uid()) and moderation_status <> 'approved');

-- DELETE modérateur : suppression (rejet dur / nettoyage de doublon).
create policy "spots_delete_moderator"
  on public.spots for delete
  using (public.is_moderator());

-- ---------------------------------------------------------------------
-- 6) Vue spots_for_viewer (SECURITY DEFINER — reloptions NULL, cf 031) :
--    le filtrage pending DOIT vivre dans le WHERE (la RLS de l'appelant ne
--    s'applique pas à une vue definer). On parenthèse le bloc d'origine
--    (WHERE non parenthésé = A OR (B AND C) OR D) avant d'ajouter la
--    condition de modération. On expose aussi source + moderation_status
--    (colonnes ajoutées EN FIN → CREATE OR REPLACE VIEW accepté).
--    geom précis : inchangé (propriétaire ou abonné actif), jamais pour anon.
-- ---------------------------------------------------------------------
create or replace view public.spots_for_viewer as
  select
    id, name, slug, department, region,
    case
      when created_by = (select auth.uid()) then geom
      when (select public.has_active_subscription(auth.uid())) then geom
      else null::geography
    end as geom_precise,
    geom_public, techniques, species, structure, difficulty,
    description, access_notes, hazards, visibility, created_by, verified, created_at,
    source, moderation_status
  from public.spots s
  where (
      moderation_status = 'approved'
      and (
        visibility = 'public'
        or (visibility = 'subscriber' and (select public.has_active_subscription(auth.uid())))
      )
    )
    or created_by = (select auth.uid());

-- ---------------------------------------------------------------------
-- 7) RPC carte — ajout du filtre `moderation_status = 'approved'` (anti-fuite
--    pending) en conservant À L'IDENTIQUE le gating de tier / floutage de 029.
--    get_spot_by_id / nearby_spots / get_spots_for_scoring : même type de
--    retour → CREATE OR REPLACE. get_spots_for_map / get_spot_by_slug :
--    on AJOUTE la colonne `source` au retour → DROP + CREATE + regrant.
-- ---------------------------------------------------------------------

-- 7a) get_spot_by_id : + filtre pending. Retour inchangé.
create or replace function public.get_spot_by_id(p_id uuid)
returns table (
  id           uuid,
  name         text,
  slug         text,
  department   char(3),
  region       text,
  lng          double precision,
  lat          double precision,
  is_precise   boolean
)
language sql
stable
security definer
set search_path = public
as $$
  with viewer as (
    select
      auth.uid() as uid,
      coalesce(public.current_tier(auth.uid()), 'discovery') as tier,
      (select home_department from public.profiles where id = auth.uid()) as home_dept
  ),
  matched as (
    select
      s.*,
      (
        coalesce(s.created_by = v.uid, false)
        or v.tier = 'itinerant'
        or (v.tier = 'local' and btrim(s.department) = btrim(coalesce(v.home_dept, '')))
      ) as precise
    from public.spots s
    cross join viewer v
    where s.id = p_id
      and s.moderation_status = 'approved'
      and (
        s.visibility = 'public'
        or (s.visibility = 'subscriber' and v.tier in ('local','itinerant'))
        or coalesce(s.created_by = v.uid, false)
      )
    limit 1
  )
  select
    id, name, slug, department, region,
    case when precise then ST_X(geom::geometry) else ST_X(ST_Centroid(geom_public::geometry)) end as lng,
    case when precise then ST_Y(geom::geometry) else ST_Y(ST_Centroid(geom_public::geometry)) end as lat,
    precise as is_precise
  from matched;
$$;

grant execute on function public.get_spot_by_id(uuid) to anon, authenticated;

-- 7b) get_spots_for_scoring : + filtre pending. EXECUTE reste service_role
--     uniquement (025) — CREATE OR REPLACE préserve les grants, on NE re-grant
--     PAS anon/authenticated.
create or replace function public.get_spots_for_scoring()
returns table (id uuid, lng double precision, lat double precision)
language sql
stable
security definer
set search_path = public
as $$
  select
    s.id,
    ST_X(s.geom::geometry) as lng,
    ST_Y(s.geom::geometry) as lat
  from public.spots s
  where s.visibility = 'public'
    and s.moderation_status = 'approved'
    and s.geom is not null
  order by s.id;
$$;

-- 7c) nearby_spots : on REPART du corps prod ACTUEL (migration 039 fix
--     anti-trilatération : distance_m FLOUTÉE via ST_Centroid(geom_public) pour
--     les viewers non-précis) et on greffe `moderation_status='approved'` DANS la
--     CTE matched (avant limit 100 / rn <= 3). ⚠️ NE JAMAIS revenir au
--     ST_Distance(s.geom) brut → rouvrirait la trilatération GPS (RLS-FIX-07).
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
      auth.uid() as uid,
      coalesce(public.current_tier(auth.uid()), 'discovery') as tier,
      (select home_department from public.profiles where id = auth.uid()) as home_dept
  ),
  matched as (
    select
      s.id, s.name, s.slug, s.department,
      case
        when (
          coalesce(s.created_by = v.uid, false)
          or v.tier = 'itinerant'
          or (v.tier = 'local' and btrim(s.department) = btrim(coalesce(v.home_dept, '')))
        )
        then ST_Distance(
               s.geom,
               ST_SetSRID(ST_MakePoint(lng, lat), 4326)::geography
             )
        else ST_Distance(
               ST_Centroid(s.geom_public)::geography,
               ST_SetSRID(ST_MakePoint(lng, lat), 4326)::geography
             )
      end as distance_m,
      s.techniques, s.species, s.difficulty,
      v.tier
    from public.spots s
    cross join viewer v
    where ST_DWithin(
            s.geom,
            ST_SetSRID(ST_MakePoint(lng, lat), 4326)::geography,
            radius_km * 1000
          )
      and s.moderation_status = 'approved'
      and (
        s.visibility = 'public'
        or (s.visibility = 'subscriber' and v.tier in ('local','itinerant'))
        or coalesce(s.created_by = v.uid, false)
      )
      and (species_filter is null   or s.species   && species_filter)
      and (technique_filter is null or s.techniques && technique_filter)
    order by distance_m
    limit 100
  ),
  ranked as (
    select *, row_number() over (order by distance_m) as rn from matched
  )
  select id, name, slug, department, distance_m, techniques, species, difficulty
  from ranked
  where tier in ('local','itinerant') or rn <= 3
  order by distance_m;
$$;

grant execute on function public.nearby_spots(double precision, double precision, double precision, text[], text[]) to anon, authenticated;

-- 7d) get_spots_for_map : + filtre pending + colonne `source` (badges carte).
--     Changement de type de retour → DROP + CREATE.
drop function if exists public.get_spots_for_map(char, text[], text[]);
create function public.get_spots_for_map(
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
  verified    boolean,
  source      text
)
language sql
stable
security definer
set search_path = public
as $$
  with viewer as materialized (
    select
      auth.uid() as uid,
      coalesce(public.current_tier(auth.uid()), 'discovery') as tier,
      (select home_department from public.profiles where id = auth.uid()) as home_dept
  ),
  visible as (
    select
      s.*,
      v.tier,
      v.uid,
      (v.tier in ('local','itinerant') or coalesce(s.created_by = v.uid, false)) as is_precise
    from public.spots s
    cross join viewer v
    where s.moderation_status = 'approved'
      and (
        s.visibility = 'public'
        or (s.visibility = 'subscriber' and v.tier in ('local','itinerant'))
        or coalesce(s.created_by = v.uid, false)
      )
      and (
        v.tier = 'itinerant'
        or v.tier not in ('local','itinerant')
        or (v.tier = 'local' and btrim(s.department) = btrim(coalesce(v.home_dept,'')))
      )
      and (dept_filter is null or s.department = dept_filter)
      and (species_filter is null or s.species && species_filter)
      and (technique_filter is null or s.techniques && technique_filter)
  ),
  ranked as (
    select *, row_number() over (partition by btrim(department) order by name) as rn
    from visible
  )
  select
    id, name, slug, department, region,
    case when is_precise then ST_X(geom::geometry) else ST_X(ST_Centroid(geom_public::geometry)) end as lng,
    case when is_precise then ST_Y(geom::geometry) else ST_Y(ST_Centroid(geom_public::geometry)) end as lat,
    is_precise, techniques, species, structure, difficulty, verified, source
  from ranked
  where tier in ('local','itinerant') or rn <= 3
  order by name;
$$;

grant execute on function public.get_spots_for_map(char, text[], text[]) to anon, authenticated;

-- 7e) get_spot_by_slug : + filtre pending + colonne `source` (badge fiche).
--     Changement de type de retour → DROP + CREATE.
drop function if exists public.get_spot_by_slug(text);
create function public.get_spot_by_slug(p_slug text)
returns table (
  id           uuid,
  name         text,
  slug         text,
  department   char(3),
  region       text,
  lng          double precision,
  lat          double precision,
  is_precise   boolean,
  techniques   text[],
  species      text[],
  structure    text,
  difficulty   smallint,
  description  text,
  access_notes text,
  hazards      text[],
  visibility   text,
  verified     boolean,
  created_at   timestamptz,
  source       text
)
language sql
stable
security definer
set search_path = public
as $$
  with viewer as (
    select
      auth.uid() as uid,
      coalesce(public.current_tier(auth.uid()), 'discovery') as tier,
      (select home_department from public.profiles where id = auth.uid()) as home_dept
  ),
  matched as (
    select
      s.*,
      (
        coalesce(s.created_by = v.uid, false)
        or v.tier = 'itinerant'
        or (v.tier = 'local' and btrim(s.department) = btrim(coalesce(v.home_dept, '')))
      ) as precise
    from public.spots s
    cross join viewer v
    where s.slug = p_slug
      and s.moderation_status = 'approved'
      and (
        s.visibility = 'public'
        or (s.visibility = 'subscriber' and v.tier in ('local','itinerant'))
        or coalesce(s.created_by = v.uid, false)
      )
    limit 1
  )
  select
    id, name, slug, department, region,
    case when precise then ST_X(geom::geometry) else ST_X(ST_Centroid(geom_public::geometry)) end as lng,
    case when precise then ST_Y(geom::geometry) else ST_Y(ST_Centroid(geom_public::geometry)) end as lat,
    precise as is_precise,
    techniques, species, structure, difficulty, description, access_notes, hazards, visibility, verified, created_at, source
  from matched;
$$;

grant execute on function public.get_spot_by_slug(text) to anon, authenticated;

-- ---------------------------------------------------------------------
-- 8) Notifications : étendre les CHECK pour notifier le proposant d'un spot
--    (accepté / refusé) et cibler un spot. (target_type='spot' déjà permis
--    sur reports, PAS sur notifications.) + index FK manquant (advisor 11.5).
-- ---------------------------------------------------------------------
alter table public.notifications drop constraint if exists notifications_type_check;
alter table public.notifications add constraint notifications_type_check
  check (type in (
    'new_follower',
    'post_liked',
    'post_commented',
    'catch_commented',
    'mention',
    'spot_approved',
    'spot_rejected'
  ));

alter table public.notifications drop constraint if exists notifications_target_type_check;
alter table public.notifications add constraint notifications_target_type_check
  check (target_type is null or target_type in ('post', 'catch', 'comment', 'spot'));

create index if not exists notifications_actor_idx
  on public.notifications (actor_id);
