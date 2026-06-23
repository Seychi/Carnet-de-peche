-- =====================================================================
-- Test de régression — floutage GPS (sprint 21 / Chantier 0)
-- À jouer dans le SQL Editor / psql (idempotent, AUCUNE écriture : DO blocks
-- en mémoire + lecture du catalogue + appel des RPC live). Modèle : les tests
-- supabase/tests/heatmap_kanon.sql + quality_cells_kanon.sql. Lève une exception
-- si un invariant de sécurité est violé.
-- =====================================================================
-- Verrouille le risque #1 (fuite de coordonnées précises), sur 3 couches :
--   (A) GRANTS COLONNE (028b/041) : anon ET authenticated n'ont AUCUN SELECT sur
--       spots.geom / catches.geom (seul geom_public reste lisible). C'est la preuve
--       autoritative qu'un « SELECT geom FROM spots/catches » en anon serait refusé
--       (permission denied for column geom) — has_column_privilege() évalue le grant
--       réel sans avoir à basculer de rôle.
--   (B) FLOUTAGE EFFECTIF : pour chaque spot, le CENTRE de geom_public est à
--       ~500-900 m de geom. ⚠️ On mesure ST_Distance(geom, ST_Centroid(geom_public)),
--       PAS la distance au polygone geom_public (artefact qui descend à ~4 m → faux
--       négatif de sécurité, cf audit 2026-06-23 §4).
--   (C) RPC live : get_spots_for_map en contexte non-abonné (auth.uid() NULL) ne
--       renvoie jamais le point précis — uniquement le centroïde flouté de geom_public.
--   (D) Attaque live best-effort en rôle anon (skip si la bascule de rôle est
--       interdite dans le contexte d'exécution — la Partie A reste autoritative).
-- =====================================================================

-- ── Partie A — grants colonne geom (anon + authenticated) ────────────────────
do $$
begin
  if has_column_privilege('anon', 'public.spots', 'geom', 'SELECT') then
    raise exception 'FUITE GPS: anon a un SELECT sur spots.geom';
  end if;
  if has_column_privilege('authenticated', 'public.spots', 'geom', 'SELECT') then
    raise exception 'FUITE GPS: authenticated a un SELECT sur spots.geom';
  end if;
  if has_column_privilege('anon', 'public.catches', 'geom', 'SELECT') then
    raise exception 'FUITE GPS: anon a un SELECT sur catches.geom';
  end if;
  if has_column_privilege('authenticated', 'public.catches', 'geom', 'SELECT') then
    raise exception 'FUITE GPS: authenticated a un SELECT sur catches.geom';
  end if;
  -- geom_public DOIT rester lisible (sinon la carte publique casse).
  if not has_column_privilege('anon', 'public.spots', 'geom_public', 'SELECT') then
    raise exception 'RÉGRESSION: anon ne peut plus lire spots.geom_public (carte cassée)';
  end if;
  raise notice 'PARTIE A (grants colonne geom verrouillés, geom_public lisible): OK';
end $$;

-- ── Partie B — offset réel du centre flouté (mesure CENTROÏDE) ────────────────
do $$
declare mn numeric; mx numeric;
begin
  select min(d), max(d) into mn, mx from (
    select ST_Distance(geom::geography, ST_Centroid(geom_public::geometry)::geography) as d
    from public.spots
    where geom is not null and geom_public is not null
  ) z;
  if mn is null then
    raise notice 'PARTIE B: aucun spot avec geom+geom_public → skip';
    return;
  end if;
  -- Plancher 150 m : garde contre une régression qui ramènerait le centre flouté
  -- ~sur geom (le flou réel observé est 500-900 m). Plafond 2000 m : sanité.
  if mn < 150 then
    raise exception 'FLOUTAGE FAIBLE: un spot a son centre flouté à % m (<150 m) de geom', round(mn);
  end if;
  if mx > 2000 then
    raise exception 'FLOUTAGE ANORMAL: un spot a son centre flouté à % m (>2000 m) de geom', round(mx);
  end if;
  raise notice 'PARTIE B (offset centroïde geom_public dans [% m, % m]): OK', round(mn), round(mx);
end $$;

-- ── Partie C — contrat live get_spots_for_map (non-abonné) ───────────────────
do $$
declare bad int;
begin
  if to_regprocedure('public.get_spots_for_map(character,text[],text[])') is null then
    raise notice 'PARTIE C: get_spots_for_map absente → skip';
    return;
  end if;
  -- auth.uid() est NULL dans ce contexte → tier "discovery" → is_precise=false.
  -- Chaque point renvoyé doit être le centroïde de geom_public (≈0 m), et donc à
  -- >150 m du geom précis. Toute violation = fuite.
  select count(*) into bad
  from public.get_spots_for_map(null, null, null) m
  join public.spots s on s.id = m.id
  where m.is_precise = true
     or ST_Distance(ST_SetSRID(ST_MakePoint(m.lng, m.lat), 4326)::geography, s.geom::geography) < 150
     or ST_Distance(ST_SetSRID(ST_MakePoint(m.lng, m.lat), 4326)::geography, ST_Centroid(s.geom_public::geometry)::geography) > 5;
  if bad > 0 then
    raise exception 'FLOUTAGE RPC VIOLÉ: % spot(s) renvoyé(s) précis/non-flouté(s) par get_spots_for_map en contexte non-abonné', bad;
  end if;
  raise notice 'PARTIE C (get_spots_for_map non-abonné → centroïde flouté): OK';
end $$;

-- ── Partie D — attaque live en rôle anon (best-effort) ───────────────────────
-- Bascule réellement en rôle anon et tente de lire geom : doit échouer
-- (insufficient_privilege). Skip propre si la bascule de rôle n'est pas permise
-- dans ce contexte (la Partie A prouve déjà le grant de façon autoritative).
do $$
declare can_switch boolean := true; leaked boolean := false;
begin
  begin
    set local role anon;
  exception when others then
    can_switch := false;
  end;
  if not can_switch then
    raise notice 'PARTIE D: bascule rôle anon non autorisée ici → skip (Partie A autoritative)';
    return;
  end if;
  begin
    perform 1 from public.spots where geom is not null limit 1;
    leaked := true; -- ne devrait jamais arriver
  exception when insufficient_privilege then
    leaked := false; -- attendu : permission denied for column geom
  end;
  reset role;
  if leaked then
    raise exception 'FUITE GPS LIVE: le rôle anon a pu lire spots.geom';
  end if;
  raise notice 'PARTIE D (attaque live anon → spots.geom denied): OK';
end $$;
