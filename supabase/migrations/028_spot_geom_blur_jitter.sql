-- =====================================================================
-- Carnet de Pêche — 028 flou GPS spots réel (jitter aléatoire) + verrou colonne geom
-- Sprint 11.6 workstream A2 (BUG-01, BUG-02). À jouer APRÈS 027.
-- ⚠️ APPLIQUÉ EN PROD le 2026-06-21 (versions 20260621113102 + 20260621113516).
-- =====================================================================
-- 🔴 CORRECTIF CRITIQUE (audit 2026-06-21).
--
-- Problème 1 (BUG-01) : blur_spot_geom() posait geom_public = ST_Buffer(geom,1000),
--   un buffer SYMÉTRIQUE centré sur le point exact → ST_Centroid(geom_public) = le
--   point précis (offset mesuré : ~0 m). Les RPC carte/fiche lisent
--   ST_Centroid(geom_public) → elles renvoyaient les coords EXACTES.
--   On recentre geom_public sur un point JITTERÉ aléatoire à 500-900 m du réel.
--   ⚠️ La colonne geom_public est typée geography(POLYGON) → on ne peut PAS y mettre
--   un Point. On stocke donc un BUFFER autour du point jitteré : son ST_Centroid
--   (ce que lisent les RPC) = le point flouté. Jitter aléatoire STOCKÉ (pas dérivé
--   de l'id = réversible).
--
-- Problème 2 (BUG-02) : anon/authenticated pouvaient lire la colonne spots.geom.
--   ⚠️ Un `revoke select (geom)` seul est INOPÉRANT : ces rôles ont un SELECT au
--   niveau TABLE (grant Supabase par défaut) qui prime sur un revoke de colonne.
--   On révoque donc le SELECT table, puis on re-grant colonne par colonne SAUF geom.
--   L'app ne lit que des colonnes précises (jamais geom, jamais select('*')) et les
--   coords précises passent par des RPC SECURITY DEFINER (owner postgres) → transparent.
--
-- Vérifs post-application :
--   select min(d), max(d) from (
--     select ST_Distance(geom::geography, ST_Centroid(geom_public::geometry)::geography) d
--     from public.spots where geom is not null) t;        -- ∈ ~[500, 900] m
--   select has_column_privilege('anon','public.spots','geom','SELECT');           -- false
--   select has_column_privilege('authenticated','public.spots','geom','SELECT');  -- false
-- =====================================================================

-- 1) Nouveau flou : buffer autour d'un point projeté à 500-900 m (azimut aléatoire).
create or replace function public.blur_spot_geom()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if tg_op = 'INSERT' or new.geom is distinct from old.geom then
    new.geom_public := ST_Buffer(
      ST_Project(new.geom, 500 + random() * 400, random() * 2 * pi()),
      500
    );
  end if;
  return new;
end;
$$;

-- 2) Recalcul des spots existants (le trigger ne se redéclenche pas seul).
update public.spots
set geom_public = ST_Buffer(ST_Project(geom, 500 + random() * 400, random() * 2 * pi()), 500)
where geom is not null;

-- 3) Verrou de la colonne geom : revoke SELECT table puis grant colonne par colonne
--    SAUF geom (un revoke de colonne seul ne suffit pas face au grant table).
revoke select on public.spots from anon, authenticated;

grant select (
  id, name, slug, department, region, geom_public, techniques, species,
  structure, difficulty, description, access_notes, hazards, visibility,
  created_by, verified, created_at, updated_at
) on public.spots to anon, authenticated;
