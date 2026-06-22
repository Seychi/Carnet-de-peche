# RECAP — Sprint Carte-v2 / C1 « La carte vivante »

> Exécuté le 2026-06-22 (branche `carte-v2-c1`, clone principal). **Code-complet, NON push.** Migrations **040 + 041 + 042 APPLIQUÉES + vérifiées en prod** (041 autorisée explicitement par John). Build + 350 tests Vitest + typecheck + lint + preuve k-anon + revue adversariale indépendante : verts.
>
> ⚠️ **Collision de numéro avec la session C2** : C2 a aussi des migrations 040/041… → au **merge, renuméroter celles de C2 en 043+** (les miennes sont déjà en prod par timestamp).

## Ce qui a été livré

La carte montre **où ça mord** (heatmap des prises publiques floutées), réagit **en temps réel** à chaque nouvelle prise publique, avec une couche activable **« ton score »** (perso, descriptif) — **sans jamais exposer une position précise**. Livrée **seedée** + **fallback « peu de prises »** → prête pour la beta, pas une démo.

### Décisions appliquées (John 2026-06-22)
- **K = 3** (k-anonymat strict). **Heatmap communautaire = teaser GRATUIT** (tous tiers). **« Ton score » = payant** (Local/Itinérant), gating **serveur** via `current_tier`.
- **Cividis PRÉSERVÉE pour le score** (markers/ring intacts) ; heatmap en **inferno** (autre rampe colorblind-safe, luminance-monotone) → 2 couches distinguables.

## Migrations

| # | Fichier | Rôle | État |
|---|---------|------|------|
| **040** | `040_catch_heatmap.sql` | RPC `get_catch_heatmap` (agrège `geom_public` only, k-anon K=3, grille par zoom) + index partiel. | ✅ **APPLIQUÉE** (v20260622195240), vérifiée live (RPC OK, grants anon+authenticated, index présent) |
| **042** | `042_catch_heat_realtime.sql` | Trigger `broadcast_public_catch` → `realtime.send('catch-heat', {department})`, **best-effort** (n'échoue jamais le log d'une prise). | ✅ **APPLIQUÉE** (v20260622195445), trigger présent |
| **041** | `041_catches_geom_column_lockdown.sql` | 🔴 **HOTFIX SÉCURITÉ** : verrou colonne `catches.geom` + `catches_for_viewer` → DEFINER. | ✅ **APPLIQUÉE** (v20260622200xxx), vérifiée live : anon ne lit plus `geom`, `geom_public` OK, vue fonctionnelle, `SELECT geom` direct par anon **bloqué** |

`lib/types.ts` **régénéré** depuis le schéma live (2194 lignes, inclut `get_catch_heatmap`). Typecheck OK.

## Sécurité — invariant n°1 respecté (validé par revue indépendante)

Une revue adversariale à 3 lentilles (sécurité/fuite GPS, correction MapLibre/React, gating/honnêteté) a **confirmé que l'invariant n°1 TIENT** :
1. **RPC 040** : agrège **`geom_public`** seul, jamais `geom`/`geom_visible`. Sortie = centroïde de grille + counts. Plancher 0.01° > flou réel.
2. **k-anonymat K=3 prouvé en SQL** + **test de régression permanent** : `supabase/tests/heatmap_kanon.sql` (algorithme : 3 users→1 cellule ; 3 prises/1 user→0 ; 2 users→0 ; filtre species appliqué AVANT le HAVING→0 ; contrat live : aucune cellule sous K=3). **Joué contre la prod : ALL PASSED.**
3. **Realtime (042)** : broadcast au payload `{department}` seul, jamais de coord. Pas de `postgres_changes` sur `catches`.
4. **Couches client** : ne consomment QUE `get_catch_heatmap` (k-anon) et `get_spot_activity` (counts via `catches_for_viewer`, sans coord).
5. **Gating** : heatmap appelable anon (teaser) ; « ton score » gaté **serveur** (`getMapScoreInsights` → `current_tier`).

### 🔴 Sécurité — fuite `catches.geom` FERMÉE (migration 041)
L'audit avait confirmé (memo `catches-geom-leak`) qu'**`anon` lisait `catches.geom` (point PRÉCIS) des prises publiques en direct table**. **041 l'a fermée** (modèle 028 : revoke table + grant 28 cols sauf geom ; bascule `catches_for_viewer` invoker→definer comme `spots_for_viewer`). **Vérifié live (en simulant le rôle anon)** : `has_column_privilege('anon','catches','geom')=false`, `geom_public=true`, `SELECT geom` direct par anon → `insufficient_privilege` (bloqué), `catches_for_viewer` lisible et fonctionnelle. Revue indépendante : flip definer nécessaire ET sûr, aucun lecteur app cassé. Memo `catches-geom-leak` mis à jour → FERMÉE.

## Findings de revue — corrigés
- 🟠 **Seed peu fiable** (Monte-Carlo 26-78% à cause de centres sur frontières de grille) → **corrigé** : centres sur **nœuds 0.20°** + 8 prises/5 pêcheurs distincts. **Re-simulé : K=3 dans 100% des essais** (cellules 0.10/0.05/0.02°).
- 🟠 **`refresh()` sans garde d'annulation** → **corrigé** : `aliveRef` (no setData/setState sur carte démontée) + cleanup `off('idle')`.
- 🟡 **042 couplait broadcast et log de prise** → **corrigé** : `EXCEPTION WHEN OTHERS` (best-effort, ne bloque jamais l'INSERT).
- 🟡 nits non bloquants (double-fetch initial dédupliqué par reqId ; jaune haut commun inferno/cividis sur plans visuels distincts) : documentés, non corrigés.

## Seed (dev/preview) — `/dev/seed-heatmap`
Route + action idempotente (garde NODE_ENV, marqueur `location_label='seed-heatmap-c1'`). 3 zones bretonnes (29/56/22) **centrées sur nœuds de grille**, 8 prises publiques de 5 pêcheurs distincts chacune. Réutilise les 6 pêcheurs de `SEED_AUTHORS`. **Fallback** : sélecteur affiche « pas encore assez de prises partagées » si 0 cellule en vue.

## Fichiers
**Migrations** : `040/041/042`. **Test** : `supabase/tests/heatmap_kanon.sql`.
**Créés** : `lib/map/{heatmap,useCatchHeatmap,useCatchHeatRealtime,seed-heatmap-data}.ts`, `components/map/{MapLayerSelector,ScorePanel,SpotActivityBadge}.tsx`, `app/actions/map-insights.ts`, `app/dev/seed-heatmap/{actions,page,seed-heatmap-button}.tsx`.
**Modifiés** : `components/map/MapShell.tsx`, `components/map/SpotPopup.tsx`, `lib/types.ts` (régénéré).
**`MapView.tsx` : INTACT** (vérifié git par la revue) → zéro régression sur le rendu spots existant.

## Vérifié
- `typecheck` 0 erreur · `vitest` **350/30 verts** · ESLint clean · **build Next.js OK** · k-anon (preuve + test régression live) · revue adversariale 3 lentilles.

## Reste manuel John (critères de sortie)
1. Merger `carte-v2-c1` + déployer (les migrations 040/041/042 sont déjà en prod). **Au merge avec C2 : renuméroter les migrations de C2 en 043+** (collision de numéros).
2. Lancer `/dev/seed-heatmap` (preview) → ouvrir `/carte`, couche « Zones de prises » ON, dézoomer Bretagne → zones chaudes inferno sous les markers.
3. **Test « 1ʳᵉ prise »** : loguer une vraie prise publique (2ᵉ onglet) → pastille « +1 prise » + heatmap rafraîchie en quelques secondes **sans reload**. ✅ prête beta.
4. qa-chrome (preview, device réel) + deploy-watch.
