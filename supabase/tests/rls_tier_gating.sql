-- =====================================================================
-- Test de régression — gating de tier & social gratuit (sprint 21 / Chantier 0)
-- À jouer dans le SQL Editor / psql (idempotent, AUCUNE écriture : DO blocks en
-- mémoire + lecture du catalogue + appel des RPC live). Modèle : heatmap_kanon.sql.
-- Lève une exception si un invariant de monétisation/confidentialité est violé.
-- =====================================================================
-- Verrouille :
--   (A) get_spots_for_scoring (RPC du cron, renvoie lng/lat BRUTS) n'est PAS
--       exécutable par anon/authenticated — réservé service_role/postgres (cron).
--   (B) get_spots_for_map en non-abonné : jamais de point précis, et au plus
--       3 spots par département (freemium "Découverte" 3/dépt).
--   (C) get_quality_cells : la composante PERSO est gatée Itinérant et JAMAIS
--       activée pour un anonyme (vérifié sur la source de la fonction).
--   (D) Fil social 100% gratuit (décision 2026-06-11) : poster ne dépend QUE
--       d'être authentifié + département côtier, jamais du tier/abonnement.
--   (E) k-anon : en contexte anonyme, get_quality_cells n'expose aucune cellule
--       communauté sous K=3 (détail complet : quality_cells_kanon.sql).
-- =====================================================================

-- ── Partie A — get_spots_for_scoring réservé au cron ─────────────────────────
do $$
begin
  if has_function_privilege('anon', 'public.get_spots_for_scoring()', 'EXECUTE') then
    raise exception 'EXPOSITION: anon peut EXECUTE get_spots_for_scoring (lng/lat bruts, sans gate de tier)';
  end if;
  if has_function_privilege('authenticated', 'public.get_spots_for_scoring()', 'EXECUTE') then
    raise exception 'EXPOSITION: authenticated peut EXECUTE get_spots_for_scoring (lng/lat bruts)';
  end if;
  raise notice 'PARTIE A (get_spots_for_scoring réservé service_role/postgres): OK';
end $$;

-- ── Partie B — get_spots_for_map : freemium 3/dépt + jamais précis ───────────
do $$
declare bad_precise int; bad_dept int;
begin
  if to_regprocedure('public.get_spots_for_map(character,text[],text[])') is null then
    raise notice 'PARTIE B: get_spots_for_map absente → skip';
    return;
  end if;
  -- Contexte non-abonné (auth.uid() NULL → tier "discovery").
  select count(*) into bad_precise
  from public.get_spots_for_map(null, null, null)
  where is_precise;
  if bad_precise > 0 then
    raise exception 'GATING: % spot(s) précis renvoyé(s) à un non-abonné', bad_precise;
  end if;

  select count(*) into bad_dept
  from (
    select btrim(department) d, count(*) n
    from public.get_spots_for_map(null, null, null)
    group by btrim(department)
    having count(*) > 3
  ) z;
  if bad_dept > 0 then
    raise exception 'GATING: % département(s) exposent >3 spots à un non-abonné (freemium 3/dépt)', bad_dept;
  end if;
  raise notice 'PARTIE B (non-abonné: 3 spots/dépt max, jamais précis): OK';
end $$;

-- ── Partie C — get_quality_cells : perso gaté Itinérant, anonyme exclu ───────
do $$
declare def text;
begin
  select pg_get_functiondef(p.oid) into def
  from pg_proc p join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public' and p.proname = 'get_quality_cells';
  if def is null then
    raise notice 'PARTIE C: get_quality_cells absente → skip';
    return;
  end if;
  -- La composante perso ne s'active QUE pour l'Itinérant…
  if position('''itinerant''' in def) = 0 then
    raise exception 'GATING: get_quality_cells ne gate plus le perso sur le tier itinerant';
  end if;
  -- …et JAMAIS pour un anonyme (court-circuit explicite auth.uid() null → false).
  if position('auth.uid() is null then false' in def) = 0 then
    raise exception 'GATING: get_quality_cells n''exclut plus explicitement l''anonyme du perso';
  end if;
  raise notice 'PARTIE C (perso gaté Itinérant, anonyme exclu): OK';
end $$;

-- ── Partie D — fil social 100% gratuit (aucun gate d'abonnement) ─────────────
do $$
declare def text;
begin
  select pg_get_functiondef(p.oid) into def
  from pg_proc p join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public' and p.proname = 'can_post_in_department';
  if def is null then
    raise notice 'PARTIE D: can_post_in_department absente → skip';
    return;
  end if;
  if position('current_tier' in lower(def)) > 0
     or position('subscription' in lower(def)) > 0
     or position('has_active' in lower(def)) > 0 then
    raise exception 'RÉGRESSION SOCIAL GRATUIT: can_post_in_department dépend du tier/abonnement';
  end if;
  if position('auth.uid() is not null' in def) = 0 then
    raise exception 'can_post_in_department ne vérifie plus l''authentification';
  end if;
  raise notice 'PARTIE D (fil social tous tiers, sans gate d''abonnement): OK';
end $$;

-- ── Partie E — k-anon communauté en contexte anonyme ─────────────────────────
do $$
declare bad int;
begin
  if to_regprocedure('public.get_quality_cells(double precision,double precision,double precision,double precision,integer,text,text,integer)') is null then
    raise notice 'PARTIE E: get_quality_cells absente → skip';
    return;
  end if;
  -- Contexte anonyme (auth.uid() NULL) → perso désactivé → toute cellule renvoyée
  -- doit être une communauté K-anon (>=3 prises ET >=3 pêcheurs distincts).
  select count(*) into bad
  from public.get_quality_cells(-5.5, 41.0, 9.8, 51.5, 8, null, null, 3650)
  where community_count < 3 or fishers_count < 3 or community_count between 1 and 2;
  if bad > 0 then
    raise exception 'K-ANON: % cellule(s) communauté sub-K exposée(s) en contexte anonyme', bad;
  end if;
  raise notice 'PARTIE E (anonyme: communauté K-anon uniquement): OK';
end $$;
