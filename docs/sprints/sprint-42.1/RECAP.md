# Sprint 42.1 — RECAP
## « Retirer la couche Zones actives » (nettoyage carte)

> Exécuté le 2026-06-28 (ultracode). **Pas poussé**. Migration **074 appliquée en prod** + `lib/types.ts` régénéré.
>
> Décision John : « Zones actives » (sprint 41, `get_active_zones` `069`) faisait DOUBLON avec la heatmap « Zones de prises » (`get_catch_heatmap` `040`) — même donnée (prises publiques k-anon K=3, cellule 0.01°, geom_public), seul le rendu diffère. On la supprime entièrement, on garde la heatmap inchangée.

---

## Fait

### WS A — front (retrait)
- **Supprimés** : `lib/map/useActiveZonesLayer.ts`, `lib/map/active-zones.ts`.
- **`components/map/MapShell.tsx`** : retiré les imports (`useActiveZonesLayer`, type `ZonesFilters`), le state `activeZonesOn`, le `useMemo` `zonesFilters`, l'appel du hook, les 4 props passées au sélecteur. **`heatVersion` conservé** (partagé heatmap + qualité).
- **`components/map/MapLayerSelector.tsx`** : retiré `Radar` (import lucide), les 4 props de l'interface + de la déstructuration, et le **bloc JSX « Zones actives »** entier. Blocs « Zones de prises » et « Qualité » NON touchés.
- **`components/map/DepartmentStats.tsx`** : retiré `active_zone_count` (type + affichage « N zones »), ne reste que les comptes de spots.

### WS B — DB (migration 074)
- `DROP FUNCTION get_active_zones(...)` (signature exacte de `069`).
- `DROP` + `CREATE get_department_stats()` **sans** `active_zone_count` ni ses CTE `zone_*` (type de retour changé → pas de CREATE OR REPLACE possible). **Grant `anon, authenticated` préservé.**
- `get_catch_heatmap` (`040`) et `get_quality_cells` (`044`) **non touchés** (vérifié : présents).
- `lib/types.ts` régénéré (`get_active_zones` et `active_zone_count` disparus).

---

## VERIF (gate verte)
- **Grep** `active_zones|activeZones|useActiveZonesLayer|onActiveZonesToggle|active_zone_count|zonesFilters|ZonesFilters` (hors `lib/types.ts`) → **vide**.
- `pnpm typecheck` 0 · `pnpm lint` 0 · `pnpm test` 574 verts · `pnpm build` OK (`/carte` 22.2 → 21.2 kB).
- DB : `get_active_zones` absente, `get_department_stats` = `department/spot_count/curated_count/community_count/imported_count` (grant anon+authenticated), heatmap + qualité intactes.

## Comment tester (post-deploy)
- Sélecteur de couches `/carte` : **plus de toggle « Zones actives »** ; « Zones de prises » (heatmap) fonctionne comme avant (légende, 7j/30j) ; « Qualité » OK ; comptes département sans « zones » ; 0 erreur console.

## Reste manuel John
- Merger `sprint-42.1` → `main`, déployer, QA rapide du sélecteur de couches.

---

> **Invariants tenus** : pas de push · migration = nouveau fichier (074) + regen types · heatmap (`get_catch_heatmap`) + qualité (`get_quality_cells`) intactes · build/typecheck verts (zéro prop orpheline) · copy sans tiret cadratin.
