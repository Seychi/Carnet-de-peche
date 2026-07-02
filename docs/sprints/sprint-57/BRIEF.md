# 🎯 Sprint 57 — « Performance & SEO »

> **Brief exécutable** (format Fable `ultracode` / effort `xhigh`). Source : `docs/ROADMAP-CORRECTIFS-2026-06-29-SPRINTS-51-58.md` §10 + `docs/audits/AUDIT-2026-06-29-ADDENDUM-PROFONDEUR.md`.
> **Prod = HEAD `aa4a28d` (sprint-51, déployé).** Objectif : **carte instantanée** (TBT mobile ~3,9 s → cible Lighthouse perf > 70) et **SEO mieux exploité**. **Aucune migration** (code).

---

## 🚀 Ligne de lancement (copier-coller)

```
ultracode effort xhigh — Exécute le Sprint 57 (docs/sprint-57/BRIEF.md). WS-A perf carte (root cause TBT), WS-B perf annexes (posthog/heatmap/polices mono), WS-C SEO (titres/schema tarifs/canonical spots/SearchAction). Finis par WS-D (vérif : Lighthouse CI mobile /carte avant/après + Rich Results). MESURE avant/après (le succès est chiffré, pas déclaratif). Esprit critique : le « hack timeout » a un coût UX réel pour les visiteurs passifs — privilégie le découpage en tâches. NE PUSH PAS sans validation.
```

**Prérequis** : dépôt local réparé. **Mesure** : ce sprint se valide au **chiffre** (Lighthouse CI mobile), pas à l'œil.

---

## Posture & invariants

Effort max + **critique** : ce sprint touche à la perf perçue ET au score Lighthouse — ce ne sont pas la même chose. Optimiser le **vrai** chargement, pas seulement le nombre. Invariants : gating de tier carte intact, floutage GPS inchangé, **pas de tiret cadratin dans la copy visible**, pas de push sans John.

---

## WS-A — Carte : faire fondre le TBT (root cause identifiée) 🔴 [findings 1.3 + P]

**Constat (vérifié)** : `useDeferredMount` (`lib/hooks/useDeferredMount.ts`, `timeout=2000` par défaut `:18`) monte MapLibre via `requestIdleCallback` **ou** `setTimeout(2000)` (fallback Safari/iOS) **ou** le 1er geste (`pointerdown/touchstart/wheel/scroll`, `:29`). Invoqué dans `MapShell.tsx:271` (`{ timeout: 2000 }`). Sur mobile bridé, l'idle/timeout arrive ~1-2 s après le FCP → l'**init WebGL synchrone** de MapLibre (la longue tâche ~1,5 s) tombe **dans la fenêtre FCP→TTI** qui définit le TBT. Le defer améliore le FCP (skeleton d'abord) mais **ne peut pas** réparer le TBT.

**Correctif — par ordre de valeur RÉELLE (pas seulement de score)** :

1. **Découper l'init en tâches < 50 ms (LE vrai fix, sans coût UX).** Le TBT ne compte que les tâches > 50 ms. Dans `components/map/MapView.tsx:478-567`, `new maplibre.Map()` + le `on('load')` (création des couches) + le `createPins` initial s'exécutent en **un bloc**. Les **yielder** entre étapes (`await scheduler.yield?.()` ou `requestAnimationFrame`/`setTimeout(0)`) : (a) créer la map, (b) yield, (c) poser les couches, (d) yield, (e) créer les pins. Aucune tâche ne dépasse 50 ms → TBT chute **même si l'utilisateur interagit tôt**, et la carte n'est pas retardée.
2. **Différer le travail non critique au 1er paint de la carte** : la heatmap initiale (cf WS-B) et la couche qualité ne doivent pas s'exécuter dans le même tick que l'init.
3. **(Optionnel, lever de score — avec AVERTISSEMENT)** : monter la map plus tard hors fenêtre Lighthouse en augmentant le `timeout` (`MapShell.tsx:271`, ex. 4-5 s). ⚠️ **Coût réel** : un visiteur qui **ne fait aucun geste** voit un skeleton 4-5 s. Le 1er geste monte déjà la carte instantanément (`useDeferredMount:29`), donc l'impact ne touche que les passifs — mais c'est un compromis score-vs-UX **à assumer explicitement avec John**, pas un fix gratuit. **Reco : ne PAS l'utiliser seul ; (1)+(2) d'abord, puis mesurer.**

**Critères d'acceptation** : Lighthouse CI mobile `/carte` — TBT en **forte baisse**, perf **> 70**, **mesuré avant/après** (joindre les 2 rapports). Aucune régression d'interactivité (la carte se monte toujours au 1er geste, le gating 3 spots/dépt tient).

---

## WS-B — Perf annexes 🟡

- **PostHog eager + avant consentement** : `components/analytics/PostHogProvider.tsx:5` importe `posthog-js` **statiquement** (≈50-60 KB) et `:26` `posthog.init()` au mount (puis opt-out par défaut). Sur `/carte`, ça ajoute du travail thread principal dans la même fenêtre que l'init carte, pour la majorité qui n'accepte jamais. → **import dynamique** (`const posthog = (await import('posthog-js')).default`) **dans un effet gaté `requestIdleCallback` ET consentement `granted`** (`lib/consent` `readConsent`). Ne charger le SDK que si l'utilisateur a accepté.
- **Heatmap ON par défaut qui refetch à froid** : `MapShell.tsx:211` `heatmapOn = useState(true)` → `lib/map/useCatchHeatmap.ts:132` `if (enabledRef.current) void refresh(map)` au `load` + refetch `get_catch_heatmap` à chaque `moveend` (`:126/136`, debounce). Sur réservoir quasi vide = gâchis au cold start. → **gater le `refresh` initial** (`:132`) derrière le 1er `moveend` utilisateur (ou un idle post-interactive). *(Garder la heatmap activable, juste ne pas la fetch au tout premier paint.)*
- **Polices mono sur `/carte`** : 3 graisses JetBrains Mono chargées alors que presque aucun texte mono ne s'y affiche (coords + compteurs). → trimmer à la graisse réellement utilisée, ou `preload:false` la mono pour cette route.

**Critères** : `posthog-js` absent du bundle initial `/carte` pour un visiteur sans consentement ; aucun fetch heatmap avant le 1er `moveend` ; poids polices réduit. Mesure réseau (DevTools) avant/après.

---

## WS-C — SEO mieux exploité 🟡

- **Titres espèces trop longs** : `app/(marketing)/especes/[slug]/page.tsx:60` → `« {label} ({latin}) : pêche du bord, saisons, taille légale »` + ` · Carnet de Pêche` (`:63`) = ~88-91 car. → tronqué en SERP. **Fix** : sortir le nom latin du `<title>` (le garder en H1 + JSON-LD `headline:110`), viser < 65 car. Ex. `« {label} : pêche du bord, saisons & taille légale »`, suffixe marque seulement si ça rentre.
- **Schema tarifs** : `app/(marketing)/tarifs/page.tsx:20-49` = un `Product` avec 3 `Offer` dont une `price:'0'` (`:29`), sans `priceValidUntil`/`AggregateOffer` → warnings Rich Results. **Fix** : modéliser les payants en `AggregateOffer` (`lowPrice:'4.90'`, `highPrice:'9.90'`, `priceCurrency:'EUR'`, `offerCount:2`) + `priceValidUntil` ; retirer l'offre €0 du `Product` (le tier gratuit n'est pas un SKU achetable).
- **`/spots?dept=&species=` auto-canonicalisés mais hors sitemap** : `spots/page.tsx` (generateMetadata, ~`:96`) pose un canonical sur l'URL filtrée elle-même, alors que `sitemap.ts` ne liste que `/spots` → des combinaisons indexables non déclarées ni maillées. **Décision John** : (a) landing SEO → ajouter les combos curés au sitemap + liens internes ; (b) bruit → `canonical` vers `/spots` ou `noindex` des variantes paramétrées. *Reco : (b) noindex v1, mesurer, promouvoir quelques combos forts ensuite.*
- **Home `WebSite` sans `SearchAction`** : `app/(marketing)/page.tsx:40` (`@type:'WebSite'`, node unique) sans `potentialAction` → pas de sitelinks search box. **Fix (si un endpoint de recherche par query existe)** : ajouter `potentialAction` `SearchAction`. Sinon différer.

**Critères** : titres espèces < 65 car. ; Rich Results tarifs sans warning (AggregateOffer) ; politique claire sur `/spots?…` (sitemap+maillage **ou** noindex/canonical) ; SearchAction si applicable.

---

## WS-D — Vérification (obligatoire, en dernier) ✅

1. **Lighthouse CI mobile `/carte`** AVANT/APRÈS (le projet a déjà `lighthouserc.mobile.json`) → joindre les 2 rapports, perf > 70, TBT en forte baisse.
2. **Rich Results Test** sur `/tarifs` (AggregateOffer sans warning) + une fiche espèce (Article OK).
3. **`/verif-sprint`** : Vitest vert, build OK, lint + types OK.
4. **Anti-régression** : gating carte intact, floutage GPS inchangé, la carte se monte toujours au 1er geste, PostHog capture toujours **après** consentement (ne pas casser l'analytics opt-in), aucune page passée en `noindex` par erreur.
5. **NE PAS PUSH** : laisser à John.

---

## Récap

| WS | Findings | Fichiers clés | Migration |
|---|---|---|---|
| A | TBT carte (root cause defer + init monolithique) | `lib/hooks/useDeferredMount.ts`, `components/map/MapShell.tsx`, `MapView.tsx` | — |
| B | posthog eager / heatmap cold fetch / polices mono | `PostHogProvider.tsx`, `useCatchHeatmap.ts`, `MapShell.tsx`, `app/layout.tsx` | — |
| C | titres / schema tarifs / canonical spots / SearchAction | `especes/[slug]/page.tsx`, `tarifs/page.tsx`, `spots/page.tsx`, `page.tsx`, `sitemap.ts` | — |

**Décisions ouvertes** :
1. **WS-A.3** : utiliser le « hack timeout » (gagne du score, coûte aux visiteurs passifs) ou s'en tenir au découpage (reco : découpage seul, mesurer).
2. **WS-C `/spots?…`** : landing indexables (sitemap+maillage) ou noindex/canonical (reco : noindex v1).
3. **WS-C SearchAction** : seulement si un endpoint de recherche par query existe.

**Parallélisme** : WS-A/B (perf, recoupent la carte → 1 agent cohérent recommandé) ‖ WS-C (SEO, indépendant). Puis WS-D (mesure). Effort ~2-3 j. Indépendant des autres sprints (mais le découpage WS-A profite du heatmap deferré WS-B).

---

*Brief Sprint 57 rédigé le 2026-06-29. Vérifié contre HEAD `aa4a28d` (= prod, sprint-51) : `useDeferredMount` (timeout 2000 + 1er geste), `MapShell.tsx:271` + `heatmapOn:211`, `PostHogProvider` import eager + init, `useCatchHeatmap` refresh initial + moveend, titre espèces `:60`, schema tarifs Product `:20-49`, `spots/page.tsx` filtres, `page.tsx` WebSite sans SearchAction. Prochain : Sprint 58 (dernier) sur demande.*
