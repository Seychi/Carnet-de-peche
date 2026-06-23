-- =====================================================================
-- Carnet de Pêche — 046 : suppression de conditions_cache (table morte)
-- Nettoyage post-sprint 20. À jouer APRÈS 045_weather_cache.sql.
-- =====================================================================
-- `conditions_cache` n'a jamais rien écrit (0 ligne depuis sa création) à cause de
-- 3 murs (cf 045). Elle est remplacée par `weather_cache` (migration 045), vers
-- laquelle les 2 consommateurs (openmeteo.ts, spot-forecast.ts) ont été repointés.
-- Vérifié avant DROP : 0 ligne, 0 FK entrante, 0 vue dépendante, plus aucune
-- référence dans le code applicatif. Suppression sûre, sans CASCADE nécessaire.
-- =====================================================================

drop table if exists public.conditions_cache;
