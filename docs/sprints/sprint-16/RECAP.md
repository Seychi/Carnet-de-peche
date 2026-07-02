# Sprint 16 — RECAP : Polish mobile & fluidité (« 0 chargement perçu »)

> Date : 2026-06-22 · Branche : `sprint-16` (base `e8f097c`) · **NON poussé** (merge + déploiement = feu vert John, §13).
> Mode : ultracode (workflows multi-agents) + connecteurs (supabase-guard, docs-researcher, qa-chrome). Aucune optimisation à l'aveugle : tout est mesuré/vérifié.

## Verdict : GO ✅ (code), QA device réelle = à faire par John

- **Gate vert** : `pnpm typecheck` OK · `pnpm lint` « No ESLint warnings or errors » · **Vitest 350/350** · `pnpm build` OK (Node 24).
- **Revue croisée indépendante (opus)** : GO — tous les critères B/C/D/cache confirmés (file:line), passe anti-régression entièrement verte.
- **Aucune migration** dans ce sprint (front/perf uniquement).

## Décisions critiques (vérifiées contre le vrai code, pas le brief)

1. **React Query → DIFFÉRÉ.** Le brief justifiait React Query par « tuer les 3-4 round-trips auth incompressibles ». Vérification (supabase-guard) : **faux** — les `getUser()` multiples (middleware + layout + page) sont déjà dédupliqués par le SDK `@supabase/ssr` (JWT vérifié en local, pas de round-trip réseau). Le vrai apport de RQ (« retour onglet = instantané ») reste valable mais c'est +13 KB + conversion des écrans chauds en fetch client → à décider sur **mesure réelle device**, pas à l'aveugle.
2. **LAY-2 (subscriptions en layout) → DIFFÉRÉ.** Le seul vrai gain réseau identifié (1 `SELECT subscriptions` par tap d'onglet, pour un bandeau d'essai rare). Mais : bénéfice **non mesurable** sans flux authentifié (device John) + **blast-radius élevé** (le layout rend toutes les pages app). Reporté tant que le besoin n'est pas confirmé sur device.

## Livré (5 commits, `e8f097c..HEAD`)

| Commit | Bloc | Contenu |
|---|---|---|
| `5a4668d` | **B — flash blanc scroll** | `scroll-reveal.tsx` : IO `{threshold:0, rootMargin:'0px 0px 120px 0px'}` (déclenche +tôt) + `duration-700`→`duration-300` ; `animated-counter.tsx` idem ; `AppShell`/`TabBar` → `will-change-transform` (promotion GPU ciblée). `prefers-reduced-motion` préservé (garde matchMedia avant tout setState/Observer). |
| `81eca4c` + `64b42f6` | **C — carte** | `force-dynamic` (sûreté-cache tier+GPS) ; `Promise.all([getUser, getUserTier])` + profil (gating `getUserTier` AVANT `fetchSpots` préservé) ; `prewarm()` + prefetch tuiles 3×3 + style `basic-v2` mobile + `fadeDuration:0`/`maxTileCacheSize`/`renderWorldCopies` ; `MapSkeleton.tsx` (CSS-only, reduced-motion). Mini-cartes (`SpotMiniMap`/`CatchMiniMap`) en héritent (elles rendent `MapView`). |
| `d387d2a` | **D — 7 bugs mobile** | image fil `onError`/fallback ; filtres `/spots` pleine largeur mobile ; fondu bandeau instruments (`sm:hidden`) ; fondu onglets fil (`from-sand-50 sm:hidden`) ; contraste header prise (`text-white/80`) ; radios `accent-teal-600` ; titre section CatchForm mobile. |
| `e1b061d` | **Sûreté-cache** | `force-dynamic` sur `carnet/[id]/page.tsx` (geom adaptée au viewer → jamais de cache partagé). |

## Mesures AVANT (baseline qa-chrome sur prod `3a67636`, mobile 390px / 4G simulé)

| Surface | Métrique | Avant |
|---|---|---|
| Home `/` | Lighthouse perf · LCP · TBT | **55** · 5,8 s · 970 ms |
| Home `/` | **Flash blanc au scroll** | **CONFIRMÉ** (sections `opacity:0`+`duration-700` sur fond crème ; 71 % des frames d'un scroll rapide < 0,6 d'opacité) |
| `/spots` | Lighthouse perf · TBT | **52** · 1450 ms |
| `/spots` | **Filtres mobile 390 & 360px** | **CASSÉS** (`items-end` sans `w-full`) |
| `/carte` | `style.json` à froid (4G) | **~4 s** |
| Transverse | JS inutilisé / main-thread | 136 KB / 4,0 s (piste hors-scope) |

Captures + Lighthouse JSON : `baseline/` (commité dans `e8f097c`).

## Mesures APRÈS (qa-chrome sur build prod local, même méthodo Lighthouse mobile que le baseline)

| Surface | Métrique | AVANT | APRÈS | Δ |
|---|---|---|---|---|
| Home `/` | Lighthouse perf | 55 | **83** | **+28** |
| Home `/` | LCP · TBT · CLS | 5,8 s · 970 ms · 0 | **4,3 s · 0 ms · 0** | LCP −1,5 s · TBT **−970 ms** |
| Home `/` | Flash blanc au scroll | CONFIRMÉ | **RÉSOLU** (opacité 1,0 des sections pendant scroll rapide ET lent) | ✅ |
| Home `/` | prefers-reduced-motion | — | **0 élément armé/caché, contenu visible d'emblée** | ✅ |
| `/spots` | Lighthouse perf | 52 | **79** | **+27** |
| `/spots` | TBT | 1450 ms | **0 ms** | **−1450 ms** |
| `/spots` | Filtres 390px / 360px | CASSÉS (escalier 235/181/80 aligné à droite) | **PASS** (3 contrôles pleine largeur : 327px @390, 297px @360) | ✅ |
| `/spots` | Filtres desktop ≥640px | — | **PASS** (en ligne, largeurs auto, pas de régression) | ✅ |
| `/carte` | `style.json` froid · 1ʳᵉ tuile | ~4 s · — | **3,19 s · 2,91 s** (13 tuiles 200) | ✅ |
| `/carte` | Skeleton · canvas mount | dégradé simple · risque noir | **MapSkeleton présent · canvas plein, pas de noir** | ✅ |
| Toutes | Console JS | — | **0 erreur** (seul favicon.ico 404 préexistant) | ✅ |

**Note process (honnêteté §19)** : la 1ʳᵉ passe qa-chrome a capté que le fix filtres D#2 visait un **dead code** (`spot-filters.tsx` non importé) — le vrai formulaire est inline dans `app/(marketing)/spots/page.tsx:212`. Corrigé (commit `dc24be6`) puis **re-confirmé en runtime sur build neuf**. C'est exactement la valeur de mesurer plutôt que supposer.

**Carte — réserve perf (P2)** : le skeleton améliore le *perçu* mais le coût JS MapLibre reste élevé (Lighthouse `/carte` 46, TBT 1240 ms). Hors périmètre Bloc C ; candidat sprint perf carte dédié (lazy-load maplibre / réduction bundle).

> **La mesure définitive (flux authentifié `(app)` + ressenti 60 fps au pouce sur vrai téléphone Android) reste à faire par John** — le throttling émulé ne capture pas le ressenti haptique (exigence du brief). Surfaces publiques uniquement mesurées ici.

## Passe anti-régression (revue opus) — toute verte

- **Floutage GPS** : ordre gating intact (`Promise.all` résout `tier` avant `fetchSpots`), RPC `get_spots_for_map` seule source des coords (floutées pour anon/discovery), aucune `geom` précise exposée au gratuit.
- **Gating tier** : `limitSpotsPerDept(spots,3)` + filtres URL bloqués pour le gratuit ; fil social 100 % gratuit (aucun check tier réintroduit).
- **RLS / vues** : lectures via `catches_for_viewer` / vues `*_for_viewer` ; signatures media via service_role mais autorisation en amont (vue) → pas de fuite.
- **Cache partagé** : `force-dynamic` sur `/carte` + `/carnet/[id]` ; aucun `revalidate`/`force-static` sur une page tier/GPS.
- **prefers-reduced-motion** : respecté (B + MapSkeleton en `motion-safe:`).

## Reste avant merge (manuel John)

1. **Valider le ressenti sur ton téléphone** (Android milieu de gamme) : scroll sans blanc, navigations, carte < 2,5 s — c'est la mesure qui compte, le device réel.
2. **`.env.example`** : non commité (ton hook guard-git bloque `.env` pour mes commandes) → `git add .env.example && git commit` dans ton terminal.
3. `baseline/` (captures + 2 gros Lighthouse JSON) commité dans `e8f097c` — `git rm --cached baseline -r` si tu veux l'alléger.
4. **Merge `sprint-16` → `main`** + déploiement, puis **`deploy-watch`** (Vercel + Sentry).
5. À reconsidérer après mesure device : **React Query** (retour-instantané) et **LAY-2** (subscriptions hors layout).
6. Piste perf hors-scope repérée au baseline : **136 KB de JS inutilisé** + TBT ~1 s sur home/spots (hydratation) — candidat sprint perf web suivant.
