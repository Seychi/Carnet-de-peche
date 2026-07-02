# Sprint 36 — Brief d'exécution
## « Carte instantanée » (P0 perf · ~5 j)

> Rédigé le 2026-06-26. C'est le **2ᵉ verrou** du gate web→mobile (cf `docs/ROADMAP-PRE-MOBILE-2026-06-26.md`) et le sprint perf cadré au sprint 28 mais **jamais exécuté**.
> Contexte : audit `docs/audits/AUDIT-2026-06-26.md` (finding **C1**). `/carte` est la vitrine **et** la page la plus lourde. Notre concurrent le plus proche (Fishing Grid) gagne sur la fluidité perçue ; une app native bâtie sur une carte lente hérite du problème.
> Décisions John : une seule, sur le compromis UX (cf **D1**). Le reste est cadré.

**Baseline mesurée (sprint 28, mobile, prod, médiane 3 runs Lighthouse — `docs/sprint-28/RECAP.md` Bloc 2) :**
- **Performance 35** (cible **≥ 70**) · **TBT 3 920 ms** (cible **< 600 ms**) · **LCP 6 068 ms** · CLS ~0 · 1ʳᵉ tuile ~2,0 s.
- **Diagnostic clé** : le lazy-load (sprint 16) **fonctionne** (maplibre ~406 Ko hors bundle initial). MAIS quand le chunk arrive, l'**`init()` au mount déclenche une long task de ~1 537 ms + 4 tâches de 365-660 ms = 100 % du TBT** (parse/compile/exec de MapLibre sur CPU mobile throttlé 4×). **Le lazy-load déplace le coût, il ne le supprime pas.**

**⚠️ Référence interne directe** : la refonte home (sprint 34) **applique déjà** le bon pattern dans `components/marketing/home-v3/HeroMap.tsx` — montage MapLibre **après `requestIdleCallback`** (`:46-56`) + spots en **couche GPU `circle`** (`:113-134`, « PAS des marqueurs HTML »). On s'en inspire pour `/carte`.

---

## 🚀 Ligne de lancement (à copier-coller par John)

> ultracode — effort xhigh. Exécute `docs/sprint-36/BRIEF.md`. WS A (montage différé = le cœur) + WS B (allègement) + WS D (mesure CI) en parallèle ; WS C (DOM→GPU) **seulement** si A+B n'atteignent pas la cible ou si je le dis. Termine par VERIF avec **mesure Lighthouse mobile avant/après**. **Ne push pas.** Tout compromis UX non tranché ici → `⚠️ DEMANDER À JOHN`.

---

## 🧠 Connecteurs & sous-agents

| Quand | Sous-agent → connecteur | Pourquoi |
|---|---|---|
| Pattern montage différé / `requestIdleCallback` / dynamic import MapLibre 5 | **docs-researcher** → Context7 | API version-correcte (Next 15.5, React 19, maplibre-gl 5.24). |
| Mesure Lighthouse mobile prod `/carte` avant/après + long tasks | **qa-chrome** → Claude in Chrome + Playwright | Prouver le gain TBT, captures, profil CPU throttlé. |
| Après déploiement | **deploy-watch** → Vercel + Sentry | Pas de régression runtime sur la carte. |
| Clôture | **`/verif-sprint`** | Tests + build + lint + types + anti-régression GPS/gating. |

---

## Objectif en une phrase
Sortir la long task d'init MapLibre de la fenêtre de chargement pour passer `/carte` de **Lighthouse mobile 35 → ≥ 70 et TBT 3 920 → < 600 ms**, sans rien régresser (floutage GPS, gating freemium, couche Fond marin tout juste livrée, fil/popup).

## Workstreams & dépendances

| WS | Bloc | Durée | Dépend de |
|----|------|-------|-----------|
| A | **Montage MapLibre différé** (attaque le TBT) | 2-2,5 j | — |
| B | Allègement du chemin critique (bundle + requêtes série) | 1 j | — (parallèle) |
| C | **Option** : marqueurs DOM → couche GPU `circle` (lever fort, risque élevé) | 2 j | A |
| D | Mesure & garde-fou (Lighthouse CI sur `/carte`) | 0,5 j | — (parallèle) |
| VERIF | revue finale + mesure avant/après | 0,5 j | A-B-D |

---

## WS A — Montage MapLibre différé (LE cœur — c'est lui qui descend le TBT)

Le TBT vient à 100 % de l'`init()` MapLibre exécuté pendant la fenêtre de chargement. On le **décale après le premier paint** : skeleton tout de suite, instance interactive montée à **`requestIdleCallback`** et/ou à la **première interaction** (clic/tap/scroll sur la zone carte), au plus tôt des deux.

> **Connecteurs** : docs-researcher (pattern + API) ; qa-chrome (profil CPU throttlé 4×, vérifier que la long task sort de la fenêtre TBT).

### Tâches
1. Fichiers : `components/map/MapShell.tsx` (le `dynamic(() => import('@/components/map/MapView'), { ssr:false, loading: MapSkeleton })` `:43-46`, et `onMapReady` `:510-523`) + `components/map/MapView.tsx` (l'`init()` qui fait `import('maplibre-gl')` `:436-437` puis `new maplibre.Map()` `:451`).
2. Ne plus monter `MapView` **au render** : afficher d'abord le **MapSkeleton** (déjà existant, `:713`/`MapSkeleton.tsx`) + éventuellement un aperçu statique léger, puis **monter l'instance interactive** sur `requestIdleCallback(timeout)` ET sur premier geste utilisateur (listener sur le conteneur). S'inspirer de `HeroMap.tsx:46-56`.
3. Conserver les optimisations déjà en place (ne pas les casser) : `prewarm()` (`:404-406`), `prefetchTilesAround` 3×3 low-priority (`:411-413`), `fadeDuration:0`/`maxTileCacheSize:20`/`renderWorldCopies:false` (`:461-463`), style allégé mobile `basic-v2` (`:443-447`).
4. **⚠️ Sécurité (re-vérifier sur le nouveau chemin de mount)** : le gating de tier (`get_spots_for_map` gaté serveur `app/(map)/carte/page.tsx:49-73`) et le **floutage GPS** doivent rester intacts — le montage différé ne doit pas changer quelles coordonnées arrivent au client. Idem : la couche **Fond marin** (proxy livré au sprint précédent) et la heatmap doivent se rebrancher correctement une fois la carte montée.

### Critères d'acceptation
- Profil qa-chrome (CPU 4×) : la long task d'init MapLibre **ne tombe plus** dans la fenêtre de mesure du TBT.
- **TBT `/carte` mobile < 600 ms** et **Performance ≥ 70** (mesure Lighthouse prod, médiane 3 runs).
- La carte reste utilisable : skeleton immédiat → interactive en < ~1,5 s après idle/geste, pas de canvas noir.
- 0 régression : spots, popup, filtres, heatmap, Fond marin, gating, floutage.

### Garde-fous
- ⚠️ **DEMANDER À JOHN (D1)** si le compromis « carte interactive un poil plus tard » doit être validé avant d'aller plus loin.
- Ne pas réintroduire de chargement au-dessus du zoom 9 (bathy) ni de canvas noir au mount.

---

## WS B — Allègement du chemin critique (bundle + requêtes série)

> **Connecteurs** : docs-researcher (code-split) ; supabase-guard (lecture, vérifier le coût des RPC carte).

### Tâches
1. **Code-split `MapLayerSelector`** : aujourd'hui **import statique** dans `MapShell.tsx:25` (donc dans le bundle MapShell) alors que les autres panneaux sont en `dynamic`/`ssr:false` (`:63-78`). Le passer en `next/dynamic`.
2. **Bundle `/carte`** : ajouter `@next/bundle-analyzer` (**absent** du repo) + script `analyze`, objectiver le chunk `/carte`, code-splitter les couches avancées (hooks bathy/qualité) hors du chemin critique du gratuit.
3. **Requêtes Supabase en série → parallèles** : `app/(map)/carte/page.tsx` enchaîne en série `fetchSpots` (`:142`, RPC `get_spots_for_map`) puis `fetchFreshScores` (`:145`, table `spot_scores`). Paralléliser (ou différer les scores après le premier rendu) pour réduire le TTFB/LCP. Garder le gating serveur (`:49-73`) intact.

### Critères d'acceptation
- First Load JS de `/carte` réduit (mesuré `next build` + analyzer, avant/après).
- **LCP `/carte` mobile amélioré** (baseline 6 068 ms) — viser nettement sous, idéalement < 2,5 s.
- Aucune régression fonctionnelle.

### Garde-fous
- Ne pas déplacer de logique de gating/floutage côté client en voulant « alléger » le serveur.

---

## WS C — Option : marqueurs DOM → couche GPU `circle` (lever fort, RISQUE élevé)

Sur `/carte`, sous le seuil `MAX_HTML_MARKERS = 200` (`MapView.tsx:13`, `:398`) — le cas réel en prod (157 spots, gating réduit encore) — les spots sont des **marqueurs DOM HTML** (`createPins` `:182-201`, `createPinElement` `:78-131`), soit jusqu'à ~157 nœuds repositionnés en `transform` à chaque frame. Les migrer en **couche GPU `circle` data-driven** (comme `HeroMap.tsx:113-134`) supprime ce coût et fluidifie le pan/zoom.

> **À ne lancer que si A+B n'atteignent pas la cible, ou en lot séparé** — c'est le WS le plus risqué.

### Tâches
1. Remplacer les marqueurs DOM par une source GeoJSON + couche `circle` (couleur pilotée par le score, comme la légende `Exceptionnelle/Très Bonne/…`), en réutilisant le clustering GPU déjà présent au-dessus de 200 (`addClusteredSpotsToMap` `:217-314`).
2. **Re-implémenter en data-driven** ce qui repose aujourd'hui sur le DOM par marqueur (`MapView.tsx:585-672`) : badge « Vérifié » (anneau), anneau de score, highlight « près de toi » (`nearbySpotIds`). → paint properties (`circle-stroke-*`, `circle-color`, expressions) au lieu d'éléments HTML.

### Critères d'acceptation
- Pan/zoom fluide (pas de jank) avec tous les spots affichés (cas Itinérant = 157).
- Badge Vérifié / score / highlight visuellement équivalents à avant.

### Garde-fous
- ⚠️ Risque de régression visuelle fort (badges/anneaux) → captures avant/après obligatoires (qa-chrome). Si le rendu n'est pas équivalent, **ne pas merger** ce WS et le sortir en lot dédié.

---

## WS D — Mesure & garde-fou (Lighthouse CI sur `/carte`)

`/carte` **n'est pas** surveillé par la CI aujourd'hui (`lighthouserc.json:7-11` teste `/`, `/tarifs`, `/spots/pointe-du-raz`, preset **desktop**). On verrouille le gain.

### Tâches
1. Ajouter **`/carte` en preset mobile** à la config Lighthouse CI (`lighthouserc.json`) — éventuellement une 2ᵉ config/contexte mobile pour ne pas casser les seuils desktop existants.
2. **Overrides d'assertions par URL** pour `/carte` : les seuils globaux (`FCP ≤ 2000`, `LCP ≤ 2500` en *error*, `:18-26`) sont irréalistes sur la carte → poser des cibles propres (ex. `performance ≥ 0.70`, `total-blocking-time ≤ 600` en *error*) sans dégrader les autres pages.
3. (Option) smoke perf Playwright : assert « time-to-interactive carte » sous un budget.

### Critères d'acceptation
- La CI mesure `/carte` mobile et **échoue si TBT > 600 ms ou perf < 0,70** (anti-régression future).
- Les seuils des autres pages restent inchangés.

---

## Workstream VERIF (obligatoire, agent indépendant)
1. **Mesure Lighthouse mobile prod `/carte` avant/après** (médiane 3 runs) : Performance, TBT, LCP. Documenter dans le RECAP (vs baseline 35 / 3 920 / 6 068).
2. `/verif-sprint` (tests + build + lint + types + revue croisée).
3. **Passe anti-régression (non négociable)** : floutage GPS intact (coords précises toujours réservées aux abonnés sur le nouveau chemin de mount), gating freemium intact (3 spots/dépt gratuit, filtres verrouillés), **couche Fond marin** (proxy du sprint précédent) toujours OK, heatmap/popup/filtres OK, **0 erreur console** sur `/carte`.
4. **deploy-watch** (Vercel + Sentry) après déploiement.
5. Livrer `docs/sprint-36/RECAP.md` : avant/après chiffré, comment tester, reste manuel John, statut WS C (fait / sorti en lot).

## Décisions pour John
- **D1 — Compromis UX** : on accepte que la carte devienne interactive **légèrement plus tard** (montage à idle/premier geste) pour gagner le TBT ? (le plan sprint 28 le signalait comme tradeoff). Reco : oui, c'est le seul moyen de sortir la long task de la fenêtre, et le skeleton + aperçu rendent l'attente invisible.
- **D2 — WS C (DOM→GPU)** : on le tente dans ce sprint si besoin, ou on le réserve à un lot dédié (risque badges/anneaux) ?
- **D3 — Cible CI** : on **bloque** la CI sur TBT ≤ 600 / perf ≥ 0,70 pour `/carte`, ou on commence en *warn* le temps de stabiliser ?

## Reste manuel John (post-sprint)
- Relire le diff, merger `sprint-36` → `main`, déploiement (auto Vercel), **re-mesurer Lighthouse mobile prod** sur `/carte`, QA rapide (qa-chrome) : carte, gating, Fond marin, fil.

---

> **Invariants (rappel) :** pas de push sans validation de John · RLS jamais désactivé · **ne pas régresser le floutage GPS ni le gating de tier sur le nouveau chemin de mount** (passe adversariale obligatoire) · ne pas casser la couche Fond marin tout juste livrée · mesurer en absolu vs cible (la baseline S16 « 46/1240 » n'est pas comparable 1:1, cf `docs/sprint-28/RECAP.md`).
