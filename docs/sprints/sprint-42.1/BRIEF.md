# Sprint 42.1 — Brief d'exécution
## « Retirer la couche Zones actives » (nettoyage carte · ~0,5 j)

> Rédigé le 2026-06-28. Petit sprint de nettoyage **post-sprint 42** (qui est terminé : migrations à jour jusqu'à `073`). Décision John : « Zones actives » fait doublon avec la heatmap « Zones de prises » ; on la **supprime** et on garde la heatmap telle quelle.
> Contexte : `get_active_zones` (sprint 41, migration `069`) a été conçue comme un **clone** de `get_catch_heatmap` (`040`) — même donnée (prises publiques agrégées **k-anon K=3**, même cellule plancher 0.01°, même `geom_public`), seul le rendu diffère (heatmap continue vs cellules pointillées « Np »). Deux couches pour la même info = confusion. Réservoir vide aujourd'hui (0 cellule) → retrait **sans perte visible**.

**⚠️ État** : migrations sur disque à **073**, **prochain libre = `074`** (`supabase-guard` confirme). La couche est toujours en place (le retrait n'a pas été fait au sprint 42).

---

## 🚀 Ligne de lancement (à copier-coller par John)

> ultracode — effort xhigh. Exécute `docs/sprint-42.1/BRIEF.md`. Supprime **entièrement** la couche « Zones actives » (front + RPC `074`) et **ne touche pas** à la heatmap « Zones de prises » (`get_catch_heatmap`) ni à « Qualité » (`get_quality_cells`). Migration en fichier numéroté `074`, applique, régénère `lib/types.ts`. Termine par **VERIF** (build OK, plus aucune référence `active_zones`, heatmap intacte). **Ne push pas.**

---

## 🧠 Connecteurs & sous-agents

| Quand | Sous-agent → connecteur | Pourquoi |
|---|---|---|
| Migration `074` (drop RPC + recreate `get_department_stats`) | **supabase-guard** → Supabase (RO d'abord) | Vérifier qu'aucun objet ne dépend de `get_active_zones` ; préserver les grants ; regen types. |
| QA carte | **qa-chrome** → Claude in Chrome | La heatmap « Zones de prises » marche toujours, plus de toggle « Zones actives », 0 erreur console. |
| Clôture | **`/verif-sprint`** | Build + typecheck + lint + tests. |

## Objectif en une phrase
Supprimer proprement la couche « Zones actives » (toggle, hook, RPC, comptes) sans rien casser, en conservant à l'identique la heatmap « Zones de prises ».

## Workstreams & dépendances

| WS | Bloc | Durée | Dépend de |
|----|------|-------|-----------|
| A | Front : retrait du toggle + du hook + des props | 0,2 j | — |
| B | DB : migration `074` (drop `get_active_zones` + `get_department_stats` sans `active_zone_count`) | 0,2 j | — |
| VERIF | build + QA carte | 0,1 j | A, B |

A et B sont parallélisables (le front compile même avant le drop DB, et inversement).

---

## WS A — Front : retirer la couche

### Tâches
1. **Supprimer les fichiers** : `lib/map/useActiveZonesLayer.ts` et `lib/map/active-zones.ts`.
2. **`components/map/MapShell.tsx`** : retirer
   - l'import `useActiveZonesLayer` (`:33`),
   - le commentaire + state `activeZonesOn/setActiveZonesOn` (`:223-225`),
   - le commentaire + l'appel `useActiveZonesLayer({ … enabled: activeZonesOn })` qui produit `zonesCellCount`/`zonesLoading` (`:271-281`),
   - les 4 props passées au sélecteur (`:586-589` : `activeZonesOn`, `onActiveZonesToggle={setActiveZonesOn}`, `activeZonesEmpty`, `activeZonesLoading`).
3. **`components/map/MapLayerSelector.tsx`** : retirer
   - `Radar` de l'import lucide (`:5`),
   - les 4 props de l'**interface** (`activeZonesOn:36`, `onActiveZonesToggle:37`, `activeZonesEmpty:38`, `activeZonesLoading:39`),
   - les 4 props de la **signature de déstructuration** (`:86-89`),
   - le **bloc JSX entier « Zones actives »** (`:346-392`, du commentaire `{/* Zones actives … */}` jusqu'au `</div>` de fermeture du bloc).
   - **NE PAS toucher** au bloc « Zones de prises » (heatmap, `:146-200`) ni à « Qualité » (`:272-344`).
4. **`components/map/DepartmentStats.tsx`** : retirer `active_zone_count` du type (`:19`) et l'affichage « N zone(s) » (`:126-127`), ne garder que les comptes de spots.

### Critères d'acceptation
- Plus de toggle « Zones actives » dans le sélecteur de couches ; la heatmap « Zones de prises » fonctionne **exactement comme avant** (toggle, légende, fenêtre 7j/30j).
- `grep -ri "active_zones\|activeZones\|useActiveZonesLayer\|onActiveZonesToggle"` sur `app/`, `components/`, `lib/` (hors `lib/types.ts` régénéré) **ne renvoie plus rien**.
- **Build + typecheck OK** (aucune prop orpheline, aucun import cassé).

### Garde-fous
- Seules les « Zones actives » partent. Ne pas dégrader la heatmap ni « Qualité ».
- Vérifier que `DepartmentStats` est le seul consommateur de `active_zone_count` (cf grep).

---

## WS B — DB : migration `074_remove_active_zones.sql`

### Tâches
1. **Drop de la fonction** : `DROP FUNCTION IF EXISTS public.get_active_zones(double precision, double precision, double precision, double precision, integer, text[], text[], integer);` (signature exacte de `069_active_zones.sql`).
2. **Nettoyer `get_department_stats`** : il calcule `active_zone_count` **en interne** (CTE `zone_cells/zone_kanon/zone_counts` dans `070_department_stats.sql:43-63`) et **n'appelle PAS** `get_active_zones` → le drop ne le casse pas. Mais la colonne devient inutile : **`DROP FUNCTION public.get_department_stats()` puis `CREATE`** la version **sans** `active_zone_count` ni ses CTE (le type de retour change → `CREATE OR REPLACE` impossible). **Préserver** `grant execute on function public.get_department_stats() to anon, authenticated;`.
3. **Régénérer `lib/types.ts`** (la signature de `get_department_stats` change, `get_active_zones` disparaît).

### Critères d'acceptation
- `get_active_zones` n'existe plus en base (`select proname from pg_proc where proname='get_active_zones'` = vide).
- `get_department_stats` renvoie les comptes spots (`spot_count`, `curated_count`, `community_count`, `imported_count`) **sans** `active_zone_count`, toujours gratuit/non gaté, et `DepartmentStats.tsx` (WS A) consomme la nouvelle forme.
- `lib/types.ts` régénéré, cohérent avec le front.

### Garde-fous
- **Ne pas toucher** à `get_catch_heatmap` (`040`) ni `get_quality_cells` (`044`).
- Migration = nouveau fichier `074`, jamais éditer une migration existante. Confirmer le numéro libre avant (disque à `073`).

---

## Workstream VERIF
1. `/verif-sprint` : **build + typecheck + lint + tests** verts (le point critique = aucune prop/ référence orpheline après le retrait).
2. **QA carte (qa-chrome)** : ouvrir le sélecteur de couches → « Zones actives » **absent** ; activer « Zones de prises » → heatmap OK (légende, 7j/30j) ; « Qualité » OK ; comptes département sans « zones » ; **0 erreur console**.
3. **Passe grep** : `active_zones`/`activeZones`/`useActiveZonesLayer`/`get_active_zones` absents du code applicatif (hors migrations historiques `069`/`074`).
4. Livrer `docs/sprint-42.1/RECAP.md` : fichiers supprimés/modifiés, migration `074`, comment tester.

## Reste manuel John (post-sprint)
- Appliquer `074` (drop), regen types, merger `sprint-42.1` → `main`, déployer, QA rapide du sélecteur de couches.

---

> **Invariants (rappel)** : pas de push sans validation · migration = nouveau fichier (`074`) + regen `lib/types.ts` · ne pas toucher heatmap (`get_catch_heatmap`) ni qualité (`get_quality_cells`) · build/typecheck verts après retrait (zéro prop orpheline) · copy sans tiret cadratin.
