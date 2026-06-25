# Sprint 34 — RECAP (refonte home « production ») — **COMPLET (branche, non poussé)**

> Chantier multi-semaines (décision John). Branche **`sprint-34`**, **`main` propre à
> 226d297, RIEN poussé**. La page refonte est **COMPLÈTE et SWAPPÉE sur `/`** (la
> préversion `/refonte-v3` a été supprimée au WS-7). Lancer `pnpm dev` → **`/`**.
> **Reste = VERIF perf post-déploiement** (Lighthouse/qa-chrome/deploy-watch sur la
> preview Vercel) + relecture + merge par John.

## Décisions John (verrouillées)
1. **Tout en réel** + **motion la plus avancée** (GSAP/ScrollTrigger/Lenis).
2. **Hero = vraie carte MapLibre + mer WebGL pleine** (custom layer GL, LCP via poster).
3. **Hero live aussi sur mobile** (reduced-motion = coupe-circuit dur).
4. **Communauté = activité AGRÉGÉE k-anon** (pas de prise/post individuel).
5. **Mise en ligne = swap direct** (events PostHog quand même, pas d'A/B).
6. **Source de design = le prototype HTML** `docs/maquette-v3/accueil-premium-v3.html`
   (+ tokens DA-v2 du code). **PAS Figma** (aucun fichier hero ; static API MapTiler 403).

## Findings data structurants (à connaître)
- **AUCUN coefficient de marée** dans le projet (`tide_coefficient` toujours null). Donnée
  honnête = le **MARNAGE** (amplitude PM-BM). Le hero affiche le marnage, pas un faux coef.
- **Posts du fil bloqués en anon** (RLS) ; **`catches_for_viewer` peut exposer le GPS exact**
  (`reveal_precise_to_public`) → la home n'expose JAMAIS de coord de prise → activité agrégée.
- **Home déjà dynamique** (Header lit les cookies) → `fetchSpotConditions` (cookies) gratuit ;
  le LCP est protégé par le poster + le montage différé de la carte.

## Commits (sprint-34), dans l'ordre
| Commit | Contenu |
|---|---|
| 6c85c1d | **WS-1+WS-2 fondations** : motion (GSAP/@gsap/react/Lenis) + couche données réelles |
| 8f17bd6 | **WS-3.1/3.2** : hero scaffold + vraie donnée + motion GSAP |
| 4339e52 | **WS-3.3** : fond carte MapLibre sombre (vrais spots floutés + dérive) |
| f0e180c | **WS-3.4** : mer WebGL (custom layer GLSL, contexte GL unique) |
| 86b5577 | **WS-3.5** : poster LCP (texture Bathy instantanée) |
| 441d1cc | **WS-5a** : trust strip + 01 Moat + 03 Communauté + marquee 26 espèces |
| bc741e1 | **WS-5b** : 04 Tarifs (HOME_TIERS) + FAQ (JSON-LD) + CTA final |
| 7ae296e | **fix** : markers spots en couche circle GPU (fin du tremblement à la dérive) |
| 8c6e552 | **WS-4** : section 02 carte explorable RÉELLE (MapLibre lazy, vrais spots, SpotPopup) |
| 980ce8b | **docs** : RECAP complet |
| 650addb | **WS-6** : pass mobile (carte section 02 non-interactive sur tactile + CTA) |
| 21d19cd | **WS-7 + SWAP** : SEO/JSON-LD + events PostHog + `/refonte-v3` → `/` (preview supprimée) |
| 81152f1 | **fix** : titre hero « où » lisible (span dégradé `inline-block`) |

## Architecture livrée

### Couche données — `lib/marketing/home-data.ts` (+ `home-data-core.ts` testé)
- `getHomeCounts()` (spots/dépts/espèces), `getHeroSnapshot()` (spot Finistère réel + marée
  + marnage + score + prochain créneau + mapSpots), `getHomeActivity()` (k-anon national),
  `getHomeMapSpots()` (tous spots publics anon, gatés 3/dépt, scores mergés), `HOME_TIERS`,
  `getHomeData()`. **Anon-safe par construction** (vues/RPC floutées, jamais `geom`).

### Motion — `components/marketing/motion/`
- `gsap.ts`, `useMotionPreference`, `SmoothScroll` (Lenis↔ScrollTrigger), hooks
  `useReveal/useParallax/usePin/useScrub/useMagnetic/useCursorGlow`. **No-op reduced-motion**
  (pointeur no-op tactile). SSR-safe (`useGSAP`).

### Page `/refonte-v3` (`app/(marketing)/refonte-v3/page.tsx`)
`getHomeData()` + `getHomeMapSpots()` → `<Hero>` + `<HomeSections>`. **Complète** :
1. **Hero** (`home-v3/Hero.tsx` + `HeroMap.tsx` + `seaLayer.ts` + `LiveClock.tsx`) :
   poster Bathy → carte MapLibre live (dataviz-dark, markers **circle GPU** colorés par
   qualité, dérive bearing) → mer WebGL (GLSL caustiques) → voiles → instrument réel
   (TideSparkline/ScoreRing/marnage/créneau) + entrée GSAP + magnetic CTA + halo curseur.
2. **Trust strip** + **01 Moat** (carte donnée réelle + perso honnête « débloqué dès ta 1re prise »)
3. **02 Carte** (`HomeMapSection.tsx`) : MapView réel + SpotPopup, lazy (IntersectionObserver), anon-floutée.
4. **03 Communauté** (3 cards, fil = activité agrégée) + **marquee 26 espèces**.
5. **04 Tarifs** (HOME_TIERS, Local mis en avant) + **FAQ** (JSON-LD FAQPage) + **CTA final**.
- `app/globals.css` : keyframe `marquee` (reduced-motion-safe).

### Honnêteté (« tout en réel »)
Marnage (pas de coef) · score étiqueté « générique » · perso « débloqué dès ta 1re prise »
(pas de fausse stat) · communauté agrégée k-anon (pas d'individuel, pas de fuite GPS).

## Leçons / gotchas
- **Carte qui s'anime en continu → JAMAIS de `maplibre.Marker` HTML** (vibrent au transform
  par frame) : utiliser une couche **circle canvas** (data-driven color). (fix 7ae296e.)
- **Custom layer MapLibre v5** : matrice = `options.defaultProjectionData.mainMatrix`
  (vérifié maplibre-gl.d.ts), `triggerRepaint()`, `antialias:true` au constructeur.
- **h1 sur fond sombre** : `text-white` EXPLICITE (base `h1{color:navy-900}` dans globals.css).
- **Build** : tuer node (`taskkill //F //IM node.exe`) AVANT `next build` (jamais pendant
  `pnpm dev` → collision `.next`).
- Verif visuelle : **Playwright MCP** (`mcp__plugin_playwright_playwright__*`) ; chrome-devtools MCP KO.
- Dev local : warn `weather_cache` + RSC 500 = clé admin serveur absente en local (OK en prod).

## Gates (à chaque commit) : 543 tests · build 72 pages · types · lint OK.

## WS-6 / WS-7 / fix titre (faits)
- **WS-6** (650addb) — pass mobile : `HomeMapSection` carte NON interactive sur tactile (`useMediaQuery <768px`, sinon capte le scroll 1 doigt) + CTA « Explorer la carte complète ». Reste déjà OK (Lenis/curseur/magnetic OFF tactile, body overflow-x:hidden, tap targets ≥ 44 px).
- **WS-7 + SWAP** (21d19cd) — `/refonte-v3` **supprimée**, `app/(marketing)/page.tsx` = la nouvelle home. Métadonnées (title/description/OG) + JSON-LD WebSite/Organization. Events PostHog conversion (`analytics.homeCtaClicked` → `hero_register`/`final_register`/`pricing_*`, opt-out défaut, no-op SSR) via `HeroPrimaryCta.event` + `TrackedCta`. Perf : **HeroMap → `next/dynamic` ssr:false**.
- **fix** (81152f1) — titre hero « quand et où » en `inline-block` (sinon « où » coupé en milieu de `bg-clip-text` au retour ligne = invisible) + stops clairs.

## Dead code post-swap (à signaler, NON supprimé)
`components/marketing/home-visuals.tsx` + `lib/marketing/home-stats.ts` ne sont plus importés (l'ancienne home était le seul consommateur). Tree-shakés (0 impact bundle). **Cleanup optionnel pour John.**

## VERIF — gates verts ; perf = POST-DÉPLOIEMENT
- ✅ **Gates** : 543 tests · build **71 pages** · types · lint · vérif visuelle desktop+mobile `/` (0 erreur console réelle).
- ⏳ **Post-déploiement** (besoin de la preview Vercel ; chrome-devtools MCP KO en local → pas de Lighthouse local) : **Lighthouse** (perf desktop ≥ 85 / mobile ≥ 90 via poster, a11y/SEO ≥ 95, LCP < 2,5 s, CLS < 0,1) + **qa-chrome** device réel + **deploy-watch**. À lancer dès que John a mergé+déployé.

## Reste manuel John
1. Relire la home en local (`pnpm dev` → `/`). 2. Merger `sprint-34` → `main` + déployer. 3. Post-déploiement : lancer deploy-watch + qa-chrome + Lighthouse sur la preview/prod. Phase 0 (sprint 31) = déjà mergée.
