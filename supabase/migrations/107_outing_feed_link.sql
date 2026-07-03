-- =====================================================================
-- Carnet de Pêche — 107 : lien sortie SOLO ↔ post de fil + résumé de sortie
-- Sprint 73 « Sorties groupées » — VERSION SOLO-FIRST (décision John)
-- =====================================================================
-- Périmètre : le MONDE SOLO 'outings' (S25) UNIQUEMENT. On ignore
-- 'outing_proposals' / 'outing_participants' (pas de participants, pas de
-- tags dans cette migration). Objectif : pouvoir attacher UN post de fil à
-- UNE sortie perso et afficher un « résumé de sortie » (durée, département,
-- prises visibles, plus grosse vérifiée, conditions) SANS jamais fuiter de
-- coordonnée.
--
-- 4 changements :
--  1) feed_posts.outing_id : FK -> outings(id) ON DELETE SET NULL, NULL par
--     défaut (la quasi-totalité des posts n'est pas liée à une sortie).
--     + index btree pour les jointures/lookups.
--  2) Contrainte « 1 post par sortie » : index UNIQUE partiel sur outing_id
--     WHERE outing_id IS NOT NULL (autorise autant de posts non liés qu'on
--     veut, un seul par sortie donnée).
--  3) Vue feed_posts_for_viewer re-créée À L'IDENTIQUE (security_invoker=true
--     préservé) + colonne fp.outing_id ajoutée EN FIN de SELECT (contrainte
--     CREATE OR REPLACE : on ne peut qu'APPENDRE une colonne). RIEN d'autre
--     ne change.
--  4) RPC get_outing_summary(uuid) : métadonnées de sortie + agrégats de
--     prises VISIBLES du viewer, en jsonb, ZÉRO coordonnée.
--
-- SÉCURITÉ / FLOUTAGE GPS (invariant cardinal du projet) :
--  - get_outing_summary est SECURITY DEFINER par NÉCESSITÉ : un tiers qui
--    voit le post doit lire la durée/département de la sortie, or 'outings'
--    est owner-only en RLS (user_id = auth.uid()). Le DEFINER contourne cette
--    RLS pour les MÉTADONNÉES NON sensibles (started_at, ended_at,
--    department) uniquement.
--  - IMPÉRATIF : même en DEFINER, auth.uid() reste l'APPELANT (claim JWT, pas
--    le rôle). Les PRISES sont donc lues via public.catches_for_viewer, qui
--    self-filtre par auth.uid() = le VIEWER. Conséquence voulue : chaque
--    viewer ne voit QUE ses prises visibles ; les prises 'private' du
--    propriétaire DISPARAISSENT pour un tiers. On ne lit JAMAIS la table
--    public.catches en direct (règle d'or CLAUDE.md §11.6).
--  - Le retour ne contient AUCUNE géométrie : ni geom, geom_public,
--    geom_visible, lat, lng, ni spot_id. La zone exposée = department seul.
--  - conditions : renvoyé tel quel (le snapshot Open-Meteo de la prise
--    visible la plus proche de started_at). Vérifié le 2026-07-03 sur les 14
--    lignes prod portant un snapshot : AUCUNE clé de coordonnée (latitude /
--    longitude / lat / lng / geom) — que des champs météo/marée. Résiduel
--    documenté au RECAP : si le writer météo ajoutait un jour une coordonnée,
--    elle transiterait ; la couche UI (Bloc 2/3) ne rend qu'un whitelist de
--    champs météo. La fonction elle-même ne lit AUCUNE colonne géo.
--  - Durcissement maison : LANGUAGE sql STABLE, SET search_path = '' (tout
--    schéma-qualifié), REVOKE ALL FROM public, anon ; GRANT EXECUTE TO
--    authenticated (aucun accès anon).
--  - AUCUNE policy RLS existante n'est touchée (ni assouplie).
--
-- ROLLBACK :
--  drop function public.get_outing_summary(uuid);
--  create or replace view public.feed_posts_for_viewer ... (def sans outing_id);
--  drop index public.feed_posts_one_post_per_outing_idx;
--  drop index public.feed_posts_outing_id_idx;
--  alter table public.feed_posts drop column outing_id;
-- =====================================================================

-- ─── 1) feed_posts.outing_id + index ─────────────────────────────────

alter table public.feed_posts
  add column if not exists outing_id uuid null
    references public.outings(id) on delete set null;

comment on column public.feed_posts.outing_id is
  'Sprint 73 (solo) : sortie perso (outings) attachée à ce post. NULL = post non lié (cas courant). ON DELETE SET NULL : supprimer la sortie ne supprime pas le post. Unicité 1 post/sortie via index partiel.';

create index if not exists feed_posts_outing_id_idx
  on public.feed_posts (outing_id)
  where outing_id is not null;

-- ─── 2) Contrainte « 1 post par sortie » (index unique partiel) ──────
-- N posts sans sortie autorisés ; au plus 1 post par sortie donnée.

create unique index if not exists feed_posts_one_post_per_outing_idx
  on public.feed_posts (outing_id)
  where outing_id is not null;

-- ─── 3) feed_posts_for_viewer : def EXACTE + fp.outing_id en fin ─────
-- Re-création À L'IDENTIQUE de la définition live (pg_get_viewdef, 2026-07-03)
-- avec security_invoker=true PRÉSERVÉ. Seul ajout : fp.outing_id, APPENDÉ en
-- dernière colonne (CREATE OR REPLACE n'autorise qu'un ajout en fin). Aucune
-- autre modification (jointures, filtres, colonnes inchangés).

create or replace view public.feed_posts_for_viewer
with (security_invoker = true) as
 SELECT fp.id,
    fp.author_id,
    fp.catch_id,
    fp.text,
    fp.region,
    fp.likes_count,
    fp.comments_count,
    fp.created_at,
    fp.updated_at,
    prof.username AS author_username,
    prof.display_name AS author_display_name,
    prof.avatar_url AS author_avatar_url,
    prof.home_department AS author_home_department,
    c.species AS catch_species,
    c.size_cm AS catch_size_cm,
    c.weight_g AS catch_weight_g,
    c.caught_at AS catch_caught_at,
    c.photo_path AS catch_photo_path,
    c.technique AS catch_technique,
    c.spot_name AS catch_spot_name,
    sp.slug AS catch_spot_slug,
    (EXISTS ( SELECT 1
           FROM feed_likes l
          WHERE l.post_id = fp.id AND l.user_id = auth.uid())) AS liked_by_me,
    ( SELECT array_agg(ph.storage_path ORDER BY ph."position", ph.created_at) AS array_agg
           FROM feed_post_photos ph
          WHERE ph.post_id = fp.id) AS photo_paths,
    fp.outing_id
   FROM feed_posts fp
     JOIN profiles prof ON prof.id = fp.author_id
     LEFT JOIN catches_for_viewer c ON c.id = fp.catch_id
     LEFT JOIN spots sp ON sp.id = c.spot_id
  WHERE auth.uid() IS NOT NULL AND fp.moderation_status = 'approved'::text;

-- ─── 4) RPC get_outing_summary(uuid) ─────────────────────────────────
-- Résumé geom-free d'une sortie SOLO, du point de vue de l'APPELANT.
--  - Métadonnées (started_at, ended_at, department) : lues sur public.outings
--    en DEFINER (contourne la RLS owner-only ; données non sensibles).
--  - Prises : lues via public.catches_for_viewer (self-filtre auth.uid()).
--    catch_count / species / biggest / conditions = VISIBLES du viewer.
--  - biggest : la plus grosse UNIQUEMENT parmi les prises photo-vérifiées
--    (photo_verified_at IS NOT NULL), par size_cm puis weight_g. Sinon null
--    (on ne prétend PAS de record ; l'UI la labellise non vérifiée).
--  - conditions : snapshot de la prise visible la plus proche de started_at.
--  - Sortie introuvable -> null.

create or replace function public.get_outing_summary(p_outing_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  with o as (
    select ou.id, ou.started_at, ou.ended_at, btrim(ou.department) as department
    from public.outings ou
    where ou.id = p_outing_id
  ),
  visible as (
    -- Prises VISIBLES du viewer, rattachées à la sortie. JAMAIS public.catches.
    select c.species, c.size_cm, c.weight_g, c.caught_at,
           c.photo_verified_at, c.conditions
    from public.catches_for_viewer c
    where c.outing_id = p_outing_id
  ),
  species_agg as (
    select coalesce(
             jsonb_agg(
               jsonb_build_object('species', t.species, 'count', t.n)
               order by t.n desc, t.species asc
             ),
             '[]'::jsonb
           ) as species
    from (
      select v.species, count(*)::int as n
      from visible v
      group by v.species
    ) t
  ),
  biggest as (
    select jsonb_build_object(
             'species',  v.species,
             'size_cm',  v.size_cm,
             'weight_g', v.weight_g,
             'verified', true
           ) as biggest
    from visible v
    where v.photo_verified_at is not null
    order by v.size_cm desc nulls last, v.weight_g desc nulls last
    limit 1
  ),
  nearest as (
    -- conditions de la prise visible la plus proche de started_at.
    select v.conditions
    from visible v, o
    where v.conditions is not null and v.conditions <> '{}'::jsonb
    order by abs(extract(epoch from (v.caught_at - o.started_at))) asc
    limit 1
  )
  select case
    when (select count(*) from o) = 0 then null
    else jsonb_build_object(
      'outing_id',    (select id from o),
      'started_at',   (select started_at from o),
      'ended_at',     (select ended_at from o),
      'duration_min', case
                        when (select ended_at from o) is null then null
                        else (extract(epoch from ((select ended_at from o) - (select started_at from o))) / 60)::int
                      end,
      'department',   (select department from o),
      'catch_count',  (select count(*)::int from visible),
      'blank',        ((select count(*) from visible) = 0),
      'species',      (select species from species_agg),
      'biggest',      (select biggest from biggest),
      'conditions',   (select conditions from nearest)
    )
  end;
$$;

comment on function public.get_outing_summary(uuid) is
  'Sprint 73 (solo) : résumé geom-free d''une sortie SOLO du point de vue de l''appelant. DEFINER pour lire les métadonnées owner-only (durée/département), mais les prises passent par catches_for_viewer (self-filtre auth.uid()) → un tiers ne voit QUE les prises publiques/amies. AUCUNE coordonnée en sortie ; biggest = plus grosse photo-vérifiée uniquement. authenticated-only.';

revoke all on function public.get_outing_summary(uuid) from public;
revoke all on function public.get_outing_summary(uuid) from anon;
grant execute on function public.get_outing_summary(uuid) to authenticated;
