# Sprint 34 — RECAP (refonte home « production ») — **EN COURS**

> Chantier multi-semaines (décision John). **Cette session = fondations WS-1 + WS-2**
> (les deux que le brief demande de lancer en premier). WS-3→7 + VERIF = sessions
> suivantes (hero MapLibre + mer WebGL + motion choreography → itération visuelle +
> device + specs Figma). **Non commité sur main, non poussé.**

## Décisions John (verrouillées cette session)
1. **Hero mobile** : **live aussi sur mobile** (MapLibre + mer WebGL). → je garderai des garde-fous perf (poster LCP, montage après idle, pause onglet caché, cap devicePixelRatio) ; `prefers-reduced-motion` reste le coupe-circuit dur (même sur mobile).
2. **Communauté home** : **spots + marées + activité AGRÉGÉE k-anon** (pas de prise/post individuel). Choix conforté par les findings data (cf ci-dessous).
3. **Mise en ligne** : **swap direct** (pas d'A/B) — on câblera quand même les events de conversion PostHog (WS-7).

## Findings data critiques (supabase-guard, à connaître pour la suite)
- **Pas de coefficient de marée** : le projet n'invente AUCUN coef SHOM (`tide_coefficient` = toujours `null`). La donnée honnête = le **MARNAGE** (amplitude PM-BM en m). → le hero affichera le marnage, **pas** un faux « COEF 88 ». (Le brief disait « coef réels » — corrigé pour rester honnête.)
- **Posts du fil = bloqués en anon** (RLS `feed_posts_for_viewer` gatée `auth.uid()`). Aucun chemin public → pas de posts sur la home publique.
- **Prises individuelles = risque GPS** : `catches_for_viewer` peut exposer le **point exact** (`reveal_precise_to_public`, 3/6 prises publiques à 0 m). → on n'affiche **jamais** la coord brute d'une prise sur la home. D'où l'activité **agrégée** (décision 2).
- **Home déjà dynamique** (Header lit les cookies auth) → réutiliser `fetchSpotConditions` (cookies) est gratuit ; le LCP se protège par le poster statique côté hero (WS-3).

## WS-1 — Fondations motion & perf ✅ (livré)
Installé `gsap@3.15 + @gsap/react@2.1 + lenis@1.3`. Module `components/marketing/motion/` :
- `gsap.ts` : enregistrement plugins UNE fois, client-only (`useGSAP`, `ScrollTrigger`).
- `useMotionPreference.ts` : hook réactif `{ reduceMotion, isTouch, enabled }`, SSR-safe (défaut conservateur = pas d'animation avant hydratation).
- `SmoothScroll.tsx` : Lenis ↔ ScrollTrigger via `gsap.ticker` (`autoRaf:false`, anti double-RAF) ; **off** si reduced-motion **ou** tactile (scroll natif). Cleanup auto.
- `hooks.ts` : `useReveal`, `useParallax`, `usePin`, `useScrub`, `useMagnetic`, `useCursorGlow` — tous **no-op en reduced-motion** ; les effets POINTEUR (magnetic/glow) aussi **no-op en tactile**. Cleanup auto (`useGSAP` + cleanups retournés).
- `index.ts` : barrel.
- Pattern version-correct 2026 (docs-researcher) : `useGSAP` (auto SSR-safe + revert au démontage), Lenis package `lenis` (pas `@studio-freight`).
- **Pas encore monté sur la home** (fondations dormantes) → WS-3 les câble en lazy hors LCP.

## WS-2 — Couche données réelles ✅ (livré, anon-safe)
- `lib/marketing/home-data.ts` (serveur) + `lib/marketing/home-data-core.ts` (pur, testé) :
  - `getHomeCounts()` → `{ spots, departments, species }` réels (`spots_for_viewer`, anon, `unstable_cache` 1h). species = 26 (référentiel).
  - `getHeroSnapshot()` → spot Finistère par défaut (le mieux scoré, déterministe via `rankByDayScore`) + **vraie marée du jour** (`fetchSpotConditions` : PM/BM, **marnage**, tendance, hauteur) + **score générique réel** (`spot_scores.day_score`, qualité dérivée via `qualityFromScore`). Position = **centroïde `geom_public`** (floutée), jamais `geom`.
  - `getHomeActivity()` → activité agrégée nationale `{ catchCount, cellCount }` via `get_catch_heatmap` k-anon (K=3, counts only), `unstable_cache` 1h.
  - `HOME_TIERS` → 3 formules, montants depuis `lib/stripe/pricing` (source de vérité).
  - `getHomeData()` → agrège tout en parallèle (best-effort par brique).
- **Anon-safe par construction** : aucune lecture de `geom`/`catches` direct ; tout via vues/RPC floutées (verrous 028b/041). Confirmé supabase-guard.
- Tests : `home-data-core.test.ts` (rankByDayScore déterministe + HOME_TIERS prix exacts) = **6 verts**.

## Gates (cette session)
- `pnpm test` : **543 verts** (52 fichiers, +7). `tsc --noEmit` : 0 erreur. `next build` : OK (71 pages, First Load JS inchangé — fondations non encore importées). `next lint` (fichiers touchés) : 0.

## Reste (sessions suivantes)
- **WS-3** Hero = vraie carte MapLibre + **mer WebGL** (custom layer GL, `args.defaultProjectionData.mainMatrix`, `triggerRepaint`, antialias au constructeur) + instrument HUD (marnage/score réels) + **poster LCP**. Besoin specs **Figma** (`get_motion_context`, `get_shader_effect`).
- **WS-4** Carte explorable (section 02, lazy, `SpotPopup` réel, floutage anon).
- **WS-5** Sections + scroll storytelling (moat réel, activité agrégée, marquee 26 espèces, tarifs `HOME_TIERS`, FAQ JSON-LD).
- **WS-6** Mobile (motion + device réel 360/390 ; live mobile assumé).
- **WS-7** SEO/JSON-LD + **events PostHog** sur les CTA + **swap** (pas d'A/B).
- **VERIF** : Lighthouse (perf desktop ≥85 / mobile ≥90 via poster, LCP<2,5s, INP<200ms, CLS<0,1), qa-chrome device + réseau (zéro coord GPS anon), E2E, copy FR.

## Reste manuel John
- Relire les fondations. Fournir l'accès Figma (specs hero/motion/shader) pour WS-3.
- Phase 0 (sprint 31) verte = **fait** (mergé/déployé).
