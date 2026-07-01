-- 102_leaderboards.sql — Sprint 66 (Phase E, dopamine MULTI-joueur : classements spot-safe).
--
-- Premier sprint où la comparaison entre pêcheurs arrive (pivot ADN 2026-06-28). On expose
-- des CLASSEMENTS opt-in (national / département / espèce / saison) + un « duel vs tes
-- follows », classés sur des métriques SANS AUCUNE FUITE DE SPOT.
--
-- ⚠️ GARDE-FOU NON NÉGOCIABLE (anti spot-burning ABSOLU) : la RPC ne renvoie JAMAIS de
-- `geom`/`geom_public`, ni ville, ni lat/lng, ni `home_department` — QUE {rang, user_id,
-- username, avatar_url, valeur} où la valeur est un compteur/une XP/une longueur (jamais une
-- coordonnée). Le département n'est qu'un FILTRE d'ENTRÉE (via profiles.home_department, une
-- région grossière déjà publique), jamais une donnée de SORTIE.
--
-- Décisions John (2026-07-01, brief docs/sprint-66/BRIEF.md) :
--   • Classements RÉSERVÉS AUX CONNECTÉS → grant EXECUTE à `authenticated` uniquement (PAS
--     `anon`). Pas de page SEO publique en v1. Enforce au niveau des droits le gate « ne pas
--     exposer un classement maigre ».
--   • Métrique-reine par défaut = « XP de la saison » (les 3 autres restent sélectionnables).
--   • Opt-in RGPD (`public_ranking`, default false) : un compte n'apparaît dans AUCUN
--     classement tant que false. Réversible instantanément.
--
-- Décisions techniques (documentées pour Sprint 67 « saisons & rangs vivants ») :
--   • « SAISON » = ANNÉE CIVILE courante, frontière calculée en Europe/Paris (leçon
--     101_dopamine_notifications / challenges_month_paris_boundary : `date_trunc` en UTC décale
--     la frontière). Sprint 67 pourra passer en trimestriel/reset dédié.
--   • Période filtrée sur `created_at` (date d'ENREGISTREMENT), PAS `caught_at` (déclaratif,
--     antidatable) — cohérent avec le moteur XP (098) : ladder « fraîche » chaque saison,
--     anti-antidatage.
--   • Métriques prises (nombre / plus grosse / diversité) : comptent UNIQUEMENT les prises
--     `privacy = 'public'` (le pêcheur a choisi de les montrer ; « plus grosse » est alors
--     vérifiable sur son profil). « Plus grosse » exige mesurée+photo (measured_length_cm IS
--     NOT NULL AND photo_verified_at IS NOT NULL) = standard record anti-farm (098/066).
--   • Métrique XP : total_xp est DÉJÀ public (get_user_xp, 098) → all-time lit user_progress ;
--     saison somme xp_events sur created_at (index ajouté §0). XP est holistique → le filtre
--     ESPÈCE ne s'applique pas à la métrique XP (ignoré, documenté).
--   • k-anon K=3 (standard projet : get_catch_heatmap / get_quality_cells) sur les scopes
--     PUBLICS (national/département) : si < 3 pêcheurs classés, la RPC ne renvoie RIEN → l'UI
--     montre un état vide digne (aligne le gate produit « pas de classement à 3 pêcheurs »).
--     PAS de k-anon sur le scope 'follows' : ce sont des comptes que tu suis explicitement,
--     tous opt-in, aucun enjeu d'anonymat — un duel à 2 est justement le cas d'usage.
--
-- Pattern calqué sur 084_spot_confirmations.sql + get_user_xp (098) : RPC SQL/plpgsql STABLE
-- SECURITY DEFINER SET search_path=public qui AGRÈGE sans jamais exposer de coordonnée.
-- Aucune table créée (une colonne + une RPC + un index). Dernier fichier sur disque = 101 →
-- 102 libre. ⚠️ Regénérer lib/types.ts après application.

-- ─── 0. Opt-in RGPD + index de période ─────────────────────────────────────────
alter table public.profiles
  add column if not exists public_ranking boolean not null default false;

comment on column public.profiles.public_ranking is
  'Opt-in RGPD (Sprint 66) : quand true, le pseudo + les stats AGRÉGÉES du pêcheur (jamais un spot/coordonnée) peuvent apparaître dans les classements (get_leaderboard). Off par défaut ; réversible instantanément (repasser false = retrait immédiat de TOUS les classements).';

-- Index couvrant pour la somme d'XP saisonnière (WHERE created_at >= borne, agrégée par
-- user_id). xp_events n'avait aucun index sur created_at (seule la contrainte unique existe) →
-- sans lui, la somme saisonnière ferait un seq scan. INCLUDE(points) rend l'index couvrant.
create index if not exists xp_events_created_at_user_idx
  on public.xp_events (created_at, user_id) include (points);

-- ─── 1. get_leaderboard : classement spot-safe, opt-in, k-anon ──────────────────
-- Paramètres :
--   p_scope   'national' | 'department' | 'follows'
--   p_dept    code département côtier (requis si scope='department', sinon ignoré)
--   p_species dbKey espèce (filtre optionnel ; ignoré pour metric 'xp' et 'diversity')
--   p_period  'season' (année civile Paris) | 'all_time'
--   p_metric  'xp' (défaut) | 'catches' | 'biggest' | 'diversity'
--   p_limit   taille max renvoyée (borné 1..100, défaut 50)
-- Retour : lignes {rank, user_id, username, avatar_url, metric_value} — ZÉRO coordonnée.
create or replace function public.get_leaderboard(
  p_scope   text default 'national',
  p_dept    text default null,
  p_species text default null,
  p_period  text default 'season',
  p_metric  text default 'xp',
  p_limit   int  default 50
)
returns table (
  rank         int,
  user_id      uuid,
  username     text,
  avatar_url   text,
  metric_value numeric
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_uid          uuid := (select auth.uid());     -- appelant (JWT), fonctionne en definer
  v_kanon        constant int := 3;               -- seuil mini d'affichage (scopes publics)
  v_limit        int := least(greatest(coalesce(p_limit, 50), 1), 100);
  v_period_start timestamptz;                      -- NULL = all-time (aucune borne basse)
begin
  -- Borne de saison = 1er janvier de l'année courante, en Europe/Paris (anti-décalage UTC).
  if p_period = 'all_time' then
    v_period_start := null;
  else
    v_period_start := date_trunc('year', (now() at time zone 'Europe/Paris')) at time zone 'Europe/Paris';
  end if;

  -- ⚠️ RETURNS TABLE : les colonnes OUT (rank, user_id, username, avatar_url, metric_value)
  -- sont des variables plpgsql. On nomme donc TOUS les alias internes DIFFÉREMMENT
  -- (uid/uname/avatar/mv/rnk) pour éviter l'ambiguïté « column reference is ambiguous ».
  -- RETURN QUERY mappe par POSITION → les noms internes n'ont pas d'importance en sortie.
  return query
  with elig as (
    -- Population éligible : profils OPT-IN (public_ranking) filtrés par le scope.
    -- Aucune colonne de localisation en sortie (home_department sert de FILTRE, pas de SELECT).
    select p.id as uid, p.username::text as uname, p.avatar_url as avatar
    from public.profiles p
    where p.public_ranking = true
      and (
        p_scope = 'national'
        or (p_scope = 'department' and p_dept is not null and p.home_department = p_dept)
        or (
          p_scope = 'follows' and v_uid is not null and (
            p.id = v_uid
            or p.id in (
              select f.following_id from public.follows f where f.follower_id = v_uid
            )
          )
        )
      )
  ),
  metrics as (
    select
      e.uid, e.uname, e.avatar,
      case p_metric
        -- Nombre de prises PUBLIQUES (filtre espèce + période).
        when 'catches' then (
          select count(*)::numeric
          from public.catches c
          where c.user_id = e.uid
            and c.privacy = 'public'
            and (v_period_start is null or c.created_at >= v_period_start)
            and (p_species is null or c.species = p_species)
        )
        -- Plus grosse prise VÉRIFIÉE (mesurée + photo) publique (filtre espèce + période).
        when 'biggest' then (
          select coalesce(max(c.measured_length_cm), 0)::numeric
          from public.catches c
          where c.user_id = e.uid
            and c.privacy = 'public'
            and c.photo_verified_at is not null
            and c.measured_length_cm is not null
            and (v_period_start is null or c.created_at >= v_period_start)
            and (p_species is null or c.species = p_species)
        )
        -- Diversité = nombre d'espèces DISTINCTES publiques (le filtre espèce n'a pas de sens ici).
        when 'diversity' then (
          select count(distinct c.species)::numeric
          from public.catches c
          where c.user_id = e.uid
            and c.privacy = 'public'
            and (v_period_start is null or c.created_at >= v_period_start)
        )
        -- XP (défaut) : all-time = total_xp matérialisé ; saison = somme du ledger sur created_at.
        -- XP est holistique → le filtre espèce est ignoré.
        else (
          case
            when v_period_start is null then
              coalesce((select up.total_xp from public.user_progress up where up.user_id = e.uid), 0)::numeric
            else
              coalesce((
                select sum(x.points) from public.xp_events x
                where x.user_id = e.uid and x.created_at >= v_period_start
              ), 0)::numeric
          end
        )
      end as mv
    from elig e
  ),
  base as (
    -- On ne classe que les pêcheurs AYANT une valeur > 0 (un opt-in inactif n'apparaît pas).
    select * from metrics where mv > 0
  ),
  ranked as (
    -- rank() renvoie bigint ; la colonne OUT `rank` est int → cast explicite.
    select
      (rank() over (order by mv desc))::int as rnk,
      uid, uname, avatar, mv
    from base
  )
  select r.rnk, r.uid, r.uname, r.avatar, r.mv
  from ranked r
  -- k-anon : masque le classement complet sous le seuil, SAUF pour le duel 'follows'.
  where p_scope = 'follows' or (select count(*) from base) >= v_kanon
  order by r.rnk, r.uname
  limit v_limit;
end;
$$;

comment on function public.get_leaderboard(text, text, text, text, text, int) is
  'Classements spot-safe (Sprint 66). Renvoie {rank,user_id,username,avatar_url,metric_value} — JAMAIS de geom/ville/coordonnée. Opt-in via profiles.public_ranking ; k-anon K=3 sur scopes publics ; connectés uniquement (grant authenticated). Métriques : xp/catches/biggest/diversity. Saison = année civile Europe/Paris.';

-- Connectés uniquement (décision John) : anon N'A PAS accès. authenticated seul.
revoke all on function public.get_leaderboard(text, text, text, text, text, int) from public, anon;
grant execute on function public.get_leaderboard(text, text, text, text, text, int) to authenticated;
