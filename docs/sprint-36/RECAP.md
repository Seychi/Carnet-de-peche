# Sprint 36 — RECAP « Carte instantanée »

> Exécuté le 2026-06-26 sur la branche `sprint-36` (depuis `main`). **Non poussé.**
> Périmètre livré : **WS A** (montage MapLibre différé) + **WS B** (allègement bundle) + **WS D** (Lighthouse CI mobile). **WS C non fait** (voir pourquoi ci-dessous). 
> ⚠️ **Lis la section « Mesure & honnêteté perf » : la cible chiffrée n'est PAS encore démontrée — elle se mesure en prod (ta décision D1).**

## TL;DR

On a sorti le montage de MapLibre du render initial de `/carte` : **skeleton immédiat**, instance interactive montée à `requestIdleCallback` **ou** au 1er geste (au plus tôt), via un hook `useDeferredMount`. + code-split `MapLayerSelector` + bundle-analyzer + Lighthouse CI mobile sur `/carte` (en *warn*). **Aucune régression** (GPS/gating/Fond marin/heatmap intacts — revue indépendante GO).

**Gate VERIF** : `tsc` 0 · `next lint` 0 · **Vitest 568/568** · `next build` OK · revue indépendante **clear-to-merge** (0 critical/0 high).

---

## Mesure & honnêteté perf (à lire)

- **Baseline (prod, sprint 28)** : Performance **35** · TBT **3920 ms** · LCP **6068 ms**.
- **Mesure locale après (médiane 3 runs, lighthouserc.mobile)** : Performance **42** · TBT **2945 ms** · LCP **6350 ms**.
- ⚠️ **Cette mesure locale n'est PAS fiable** et ne démontre PAS la cible (<600 / ≥70) : (1) elle tourne sur la machine de dev sous charge (builds/agents) → throttle 4× faussé, TBT gonflé ; (2) **doute mécanique** : sous le *simulated throttling* de Lighthouse, `requestIdleCallback` se déclenche tôt (sur le trace réel rapide) → la long task d'init MapLibre peut **rester comptée dans le TBT** même différée. Le seul mécanisme qui sort vraiment l'init de la fenêtre Lighthouse (qui n'interagit jamais) est le **montage au 1er geste uniquement**.
- **Décision John (D1)** : **mesurer le prod d'abord**. On déploie WS A/B/D (gain structurel sûr) ; tu re-mesures Lighthouse mobile **prod** (propre). **Si la cible n'est pas atteinte → on bascule sur le montage-au-geste** (carte interactive au 1er toucher/scroll + aperçu statique ; vrai levier TBT). **WS C (DOM→GPU) n'adresse PAS le TBT d'init** (il fluidifie le pan/zoom) → écarté pour ce sprint.

---

## WS A — Montage MapLibre différé ✅

- **Nouveau** `lib/hooks/useDeferredMount.ts` : retourne `shouldMount=true` au plus tôt entre `requestIdleCallback(timeout 2000)` et le 1er geste (`pointerdown`/`touchstart`/`wheel`/`scroll`) sur le conteneur. SSR-safe, **fallback `setTimeout` si `requestIdleCallback` absent** (Safari/iOS — sinon la carte ne monterait jamais), cleanup complet, anti double-fire.
- `components/map/MapShell.tsx` : `<MapView>` (déjà `dynamic(ssr:false)`) n'est plus rendu au render → `{shouldMountMap ? <MapView/> : <MapSkeleton/>}` derrière un `mapZoneRef`. Le `dynamic` ne télécharge le chunk QUE quand le composant est rendu → ni download ni init avant idle/geste.
- **Inchangé** : props de MapView, `onMapReady`/`setMapInstance` → les hooks `useCatchHeatmap`/`useBathyLayer`/`useQualityLayer` (qui gèrent `map=null`) se rebranchent quand la carte monte. `prewarm`/`prefetchTilesAround`/options mobiles conservés.

## WS B — Allègement ✅ (partiel assumé)

- **Code-split `MapLayerSelector`** : import statique → `next/dynamic` (ssr:false) → sort du First Load JS de `/carte`. (`/carte` First Load JS = **332 kB** après build.)
- **`@next/bundle-analyzer`** ajouté (+ `cross-env`) + script **`pnpm analyze`** (`ANALYZE=true next build`). No-op total en prod/CI ; sert à objectiver le chunk `/carte`.
- **Requêtes Supabase série→parallèle (tâche 3) : NON faite, et c'est justifié.** `fetchFreshScores` **dépend** de `fetchSpots` (il filtre `spot_scores` sur `spotIds = spotsRaw.map(s => s.id)`) → **non parallélisable**. La seule alternative (différer les scores côté client après le 1er rendu) est un refactor à risque de régression (recoloration des markers = la légende de score) pour un gain LCP marginal (RPC scores léger). → laissé en l'état, à traiter en lot dédié si besoin.

## WS D — Lighthouse CI mobile ✅

- **Nouveau** `lighthouserc.mobile.json` : `/carte` en mobile (défaut LH = CPU 4× + slow 4G), assertions **en `warn`** (D3) : `performance ≥ 0.70`, `total-blocking-time ≤ 600`, `largest-contentful-paint ≤ 4000`. Séparé de `lighthouserc.json` (preset desktop, **inchangé** → seuils des autres pages préservés).
- `.github/workflows/e2e.yml` : 2ᵉ step `lhci autorun --config=./lighthouserc.mobile.json` (séquentiel, lhci gère son propre serveur).
- **D3 = warn-first** : la CI Lighthouse mobile est bruyante (~±15-20 pts) ; on annote sans bloquer. À passer en `error` une fois la perf stabilisée (toi).

## WS C — écarté

DOM→GPU `circle` fluidifie le **pan/zoom** mais **ne réduit pas la long task d'init** (la source du TBT). Donc inutile pour la cible de CE sprint. À garder en lot dédié pour le confort de manipulation (risque visuel badges/anneaux).

---

## Comment tester

- **Fonctionnel** : `/carte` → skeleton immédiat, puis carte interactive après ~idle ou au 1er geste. Spots, popup, filtres, heatmap, **Fond marin** (sprint précédent), gating (3 spots/dépt gratuit), floutage : tout OK. 0 erreur console.
- **Bundle** : `pnpm analyze` → ouvre le rapport du chunk `/carte`.
- **Perf** : `pnpm exec lhci autorun --config=./lighthouserc.mobile.json` (local, bruité) OU — **autoritatif** — Lighthouse mobile **prod** après déploiement.

## Reste manuel John (LE point clé)

1. Relire le diff, **merge `sprint-36` → `main`** + déploiement.
2. **Re-mesurer Lighthouse mobile PROD sur `/carte`** (médiane 3 runs) = LA mesure qui fait foi. Comparer à 35 / 3920 / 6068.
3. **Si la cible <600 / ≥70 n'est pas atteinte** → me dire « go montage au geste » : je bascule sur le montage interactif au 1er geste + aperçu statique (le vrai levier TBT en lab). 
4. QA rapide (qa-chrome) : carte, gating, Fond marin, fil. Décider plus tard de passer la CI mobile en `error`.

## Fichiers

Nouveaux : `lib/hooks/useDeferredMount.ts`, `lighthouserc.mobile.json`.
Modifiés : `components/map/MapShell.tsx`, `next.config.ts`, `package.json`, `pnpm-lock.yaml`, `.github/workflows/e2e.yml`.
