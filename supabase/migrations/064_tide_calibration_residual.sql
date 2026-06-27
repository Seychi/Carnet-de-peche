-- 064_tide_calibration_residual.sql — Sprint 38 (fix finding marées, décision John).
--
-- John rouvre D3 : on PASSE à l'offset par port (v2). L'audit a montré que l'erreur
-- Open-Meteo vs SHOM est presque entièrement un décalage de phase CONSTANT par port
-- (biais signé), le résidu après correction étant petit (1 à 8 min, cf
-- docs/sprint-38/tide-calibration-results.md). On applique donc l'offset = -bias_min
-- aux heures de PM/BM affichées sur la fiche spot, et on affiche l'écart RÉSIDUEL.
--
-- Cette migration ajoute la colonne `residual_min` (écart médian APRÈS correction du
-- biais) et la seede avec les valeurs mesurées figées. Aucune heure de marée n'est
-- recalculée en base : l'offset est appliqué à l'affichage (côté fiche spot).
--
-- Migration APPLIQUÉE en prod via apply_migration. Régénérer lib/types.ts ensuite.

alter table public.tide_calibration
  add column if not exists residual_min real;

comment on column public.tide_calibration.residual_min is
  'Écart médian (min) APRÈS correction du biais de phase par port (offset = -bias_min). Mesuré, figé. C''est la précision réelle annoncée une fois l''offset appliqué.';

-- Seed des résidus mesurés (figés 2026-06-27, cf tide-calibration-results.md).
update public.tide_calibration as t
set residual_min = v.r
from (values
  ('Saint-Malo', 3.0),
  ('Brest', 1.0),
  ('Pornichet', 8.0),
  ('Les Sables-d''Olonne', 5.0),
  ('Arcachon (Eyrac)', 4.0)
) as v(port, r)
where t.port = v.port;
