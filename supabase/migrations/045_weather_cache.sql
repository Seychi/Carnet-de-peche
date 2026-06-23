-- =====================================================================
-- Carnet de Pêche — 045 : table weather_cache (cache météo Open-Meteo)
-- Sprint 20, Bloc 2. À jouer APRÈS 044_quality_cells.sql.
-- =====================================================================
-- Pourquoi une NOUVELLE table plutôt que réparer `conditions_cache` ?
-- `conditions_cache` est morte (0 ligne depuis sa création) à cause de 3 murs :
--   1. ses consommateurs font `upsert(..., onConflict: 'cache_key')`, mais l'unique
--      sur `cache_key` est un index PARTIEL (`WHERE cache_key IS NOT NULL`) → PostgreSQL
--      ne peut PAS l'inférer comme cible d'ON CONFLICT (erreur 42P10) ;
--   2. sa PK est `(spot_id, hour)` NOT NULL, que le write ne renseigne pas ;
--   3. forme d'origine `(spot_id, hour)` supplantée par `spot_scores` (migration 014).
-- → On donne au cache géohash sa propre table, simple et correcte. `conditions_cache`
--    n'est PAS supprimée ici (nettoyage séparé éventuel — décision John).
--
-- Sécurité : RLS activée. SELECT ouvert (la météo n'est pas sensible, la fiche spot
-- est consultable hors connexion). AUCUNE policy INSERT/UPDATE → l'écriture passe
-- exclusivement par le client service-role (bypass RLS, serveur uniquement), donc
-- pas de vecteur d'empoisonnement de cache depuis un client anon/authenticated.
-- Le cache ne stocke que de la météo agrégée (jamais de coordonnée précise / geom).
-- =====================================================================

create table if not exists public.weather_cache (
  cache_key   text primary key,
  payload     jsonb not null,
  fetched_at  timestamptz not null default now()
);

-- Balayage par fraîcheur (purge éventuelle / lecture filtrée sur fetched_at > now()-1h).
create index if not exists weather_cache_fetched_at_idx
  on public.weather_cache (fetched_at);

alter table public.weather_cache enable row level security;

-- Lecture publique (anon + authenticated). La fiche spot publique doit pouvoir lire
-- le cache sans connexion → cache hit pour les visiteurs anonymes.
drop policy if exists "weather_cache lisible par tous" on public.weather_cache;
create policy "weather_cache lisible par tous"
  on public.weather_cache for select
  to anon, authenticated using (true);

-- Pas de policy INSERT/UPDATE/DELETE : écriture réservée au service-role.

comment on table public.weather_cache is
  'Cache météo Open-Meteo (sprint 20). Clé = geohash5_heureUTC (prises) ou forecast_lat_lng_date (fiches). PK cache_key (non partielle) → onConflict:cache_key valide. RLS : SELECT public, écriture service-role uniquement. Remplace conditions_cache (morte).';
