# Sprint 34 — Brief d'exécution
## Refonte home « production » — données 100 % réelles + carte MapLibre + motion avancée (GSAP/ScrollTrigger/Lenis)

> Rédigé le 2026-06-25. **Gros chantier (multi-semaines assumé)** — priorité au **meilleur rendu**, pas à la vitesse de livraison (décision John).
> Contexte : prototype de référence `docs/maquette-v3/accueil-premium-v3.html` ; plan `docs/ROADMAP-REFONTE-HOME-V2.md` ; **Phase 3** de `docs/ROADMAP-PRE-REFONTE-2026-06-25.md`.
> **Décisions John 2026-06-25 (verrouillées)** : (1) **tout en réel** — données live, vraie carte, montrer ce que le site propose vraiment ; (2) **motion la plus avancée possible** — GSAP + ScrollTrigger + Lenis (smooth scroll), hero animé haut de gamme ; (3) chantier long accepté pour le meilleur résultat ; (4) **hero = vraie carte MapLibre + mer WebGL pleine** — mer = **custom layer GL du map**, **LCP via poster statique**, mobile allégé.

**Préalable (manuel John) avant de démarrer** : **Phase 0 (`docs/sprint-31/BRIEF.md`) verte** — surtout F3 (26 espèces vraiment loguables, car la home l'affiche) et F1 (parcours gratuit connu). Note : « tout en réel » **remplace** le label « Exemple » du proto par de **vraies données honnêtes** (cf §Garde-fous : score générique réel, perso seulement là où il est réel).

---

## 🚀 Ligne de lancement (à copier-coller par John)

> ultracode — effort xhigh. Exécute `docs/sprint-34/BRIEF.md`. Lance WS-1 et WS-2 en premier (fondations motion + couche données réelles), puis WS-3/4/5 en parallèle, WS-6 (mobile) et WS-7 (SEO) ensuite, et termine par VERIF. Chantier long assumé : privilégie le rendu et la perf, pas la vitesse. Arrête-toi aux ⚠️ DEMANDER À JOHN. Ne push pas.

---

## 🧠 Connecteurs & sous-agents (usage systématique — cf `CLAUDE.md` §20)

> Figma + PostHog **connectés le 2026-06-25**. Démarrer par une passe **superpowers `/brainstorm`** (direction hero/motion) avant WS-1.

| Quand | Sous-agent → connecteur | Pourquoi |
|---|---|---|
| GSAP / ScrollTrigger / Lenis / MapLibre / (Three.js si WebGL) / Next 15 | **docs-researcher** → Context7 | API version-correcte ; patterns SSR-safe (dynamic import, cleanup). |
| **Phase design** : tokens, specs, **motion & shaders** | **Figma MCP** (`get_variable_defs`, `get_design_context`, `get_screenshot`, `get_motion_context`, `get_shader_effect`) | Implémenter au pixel + récupérer les specs réelles d'animation/shaders du hero (sert WS-1 / WS-3 / WS-5). |
| Événements de conversion, funnel, **A/B test** | **PostHog MCP** | Définir/vérifier les events CTA, mesurer la conversion d'inscription, piloter et **lire l'A/B** (WS-7 + VERIF). |
| **Démarrage créatif** (direction hero/motion) | **superpowers** → `/brainstorm` (phase design) | Cadrer la direction avant de coder : clarify → design → plan, surtout pour le parti pris d'animation. |
| Comptes réels (espèces, spots, scores), vues `*_for_viewer`, floutage anon | **supabase-guard** → Supabase (RO) | Brancher la home sur les **vraies** données, **sans fuite GPS** côté anon. |
| Marées/conditions réelles | `lib/conditions/*` (déjà en prod) | Réutiliser, ne pas réécrire. |
| Perf (LCP/INP/CLS), rendu desktop+mobile, **device réel** | **qa-chrome** → Claude in Chrome + Playwright/Lighthouse | Le motion avancé NE DOIT PAS casser la perf. |
| Après déploiement preview | **deploy-watch** → Vercel + Sentry | Zéro régression runtime. |
| Clôture | **`/verif-sprint`** | Tests + build + lint + types + revue indépendante. |

---

## Objectif du sprint en une phrase

Une home **qui montre le vrai produit** (marées réelles, carte MapLibre des vrais spots, activité réelle, vrais tarifs) avec une **mise en scène scroll haut de gamme** (GSAP/ScrollTrigger/Lenis), **sans sacrifier la perf mobile ni le floutage GPS**.

## Workstreams & dépendances

| WS | Objet | Effort | Dépend de |
|----|-------|--------|-----------|
| 1 | Fondations motion & perf (GSAP/Lenis, provider, SSR-safe, reduced-motion) | M | — |
| 2 | Couche données réelles (server/ISR) | M | — |
| 3 | Hero réel + animé (+ option WebGL) | L | 1,2 |
| 4 | Carte showcase MapLibre **réelle** | L | 1,2 |
| 5 | Sections + scroll storytelling (réel) | L | 1,2 |
| 6 | Mobile (motion adaptée + device) | M | 3,4,5 |
| 7 | SEO / meta / JSON-LD / analytics | S | 5 |
| VERIF | perf + a11y + QA device | M | tous |

---

## ✅ Verrouillé (John 2026-06-25) + ⚠️ choix restants

**Verrouillé** : **hero = vraie carte MapLibre + mer WebGL pleine** (rendu max). Architecture imposée pour que ça tienne :
- la mer = **custom layer WebGL de MapLibre** (**un seul** contexte GL — surface/caustiques/houle en shader) ; **pas** de 2e canvas Three.js superposé ;
- **LCP = poster statique** (image/SSR de la carte) → MapLibre + shader montent **après hydratation/idle** ;
- **floutage anon** dans le hero (jamais de GPS précis).

**⚠️ DEMANDER À JOHN AVANT** :
1. **Mobile du hero lourd** (défaut posé) : **hero statique premium** sur mobile (poster + shimmer, carte/mer live OFF) pour tenir la perf — confirme, ou tu veux le **live aussi sur mobile** (perf à assumer) ?
2. **Mise en ligne** : **A/B test** vs **swap direct** ?
3. **Réservoir mince** : mettre en avant **157 spots + marées réelles** et **masquer** l'activité communautaire si trop peu — OK ?

---

## WS-1 — Fondations motion & perf

> **Connecteurs** : docs-researcher (GSAP 3 + ScrollTrigger + Lenis, intégration React/Next 15 App Router, cleanup en `useEffect`, SSR-safe via `dynamic`/`ssr:false` pour les couches non critiques). **Figma** (`get_variable_defs`) pour aligner les tokens DA sur la maquette.

### Tâches
1. Ajouter GSAP + ScrollTrigger + Lenis (`pnpm add gsap lenis`). **Mer du hero = custom layer WebGL de MapLibre en GLSL** (éviter Three.js complet — poids ; ne l'introduire que si indispensable). Créer un **MotionProvider** (`components/marketing/motion/`) : init Lenis (smooth scroll), `gsap.registerPlugin(ScrollTrigger)`, sync Lenis↔ScrollTrigger, **désactivation totale si `prefers-reduced-motion`** et **dégradé mobile**.
2. Hooks réutilisables : `useReveal`, `useScrub`, `usePin`, `useParallax`, `useMagnetic`, `useCursorGlow` — tous **no-op** en reduced-motion / touch.
3. Garantir **SSR-safe** : aucun effet motion ne bloque le 1er paint ; les libs se chargent après hydratation (et idéalement lazy à l'entrée en viewport).

### Critères d'acceptation
- La page reste **entièrement utilisable sans JS** et en **reduced-motion** (contenu visible, pas de blocage scroll Lenis).
- Aucun import GSAP/Lenis dans le chemin critique du LCP (vérifié via bundle analyzer / qa-chrome).

---

## WS-2 — Couche données réelles (server / ISR)

> **Connecteurs** : **supabase-guard** pour les vrais comptes + vues anon ; `lib/conditions/*` pour les marées.

### Tâches
1. `lib/marketing/home-data.ts` (Server) qui fournit : **comptes réels** (espèces = `SPECIES` filtré, **nb de spots publics** via DB, nb de départements) ; **hero conditions réelles** (marées + coef + score générique d'un **spot par défaut** — ex. Pointe du Raz — via `lib/conditions/tide.ts`/`openmeteo.ts` + `lib/especes/score.ts`) ; **activité réelle** (derniers spots curés + dernières prises/posts **publics** via `app/actions/feed.ts` / `catches_for_viewer`) ; **tarifs** depuis la config Stripe (`lib/env.ts` + config tiers).
2. Cache/ISR raisonnable (revalidate) pour ne pas taper les API à chaque visite.
3. **Anonyme = floutage** : toute donnée spot exposée passe par `spots_for_viewer` / `geom_public` (jamais `geom` précis). Confirmer via supabase-guard.

### Critères d'acceptation
- Les chiffres affichés == base réelle (pas de valeur en dur divergente).
- Le hero affiche une **vraie marée du jour** (PM/BM/coef réels) pour le spot par défaut.
- **Aucune coordonnée précise** d'un spot n'est exposée à un visiteur anonyme (vérifié supabase-guard + réseau qa-chrome).

---

## WS-3 — Hero réel + animé

> **Connecteurs** : docs-researcher (timeline GSAP, ScrollTrigger scrub). Réutiliser `components/ui-v2/tide-sparkline.tsx`, `score-ring.tsx`, `animated-counter.tsx`, `bathy.tsx`, `tag-data.tsx`. **Figma** (`get_motion_context`, `get_shader_effect`) pour les specs d'animation/shader du hero.

### Tâches
1. **Fond de hero = vraie carte MapLibre** (réutiliser `components/map/MapView.tsx`/`MapShell.tsx`) centrée sur une façade (ex. Finistère), **vrais spots publics** + markers de **score réel**, positions **floutées** anon ; caméra animée (léger fly-to / drift).
2. **Mer WebGL pleine** : **custom layer WebGL de MapLibre** rendant surface/caustiques/houle animées (shader GLSL). Sourcer le shader via Figma (`get_shader_effect`/`get_shader_fill`) ou GLSL maison. **Un seul** contexte GL (le map) — pas de 2e canvas.
3. **Instrument en HUD** (overlay) : courbe de marée réelle + anneau de score + tags coords/coef réels (WS-2) ; connecté = **vraies tendances perso** (`lib/scoring/personal/fetch.ts`) ; sinon score générique honnête.
4. **Motion** : entrée orchestrée GSAP, **bloom des markers**, parallax/scrub léger, CTA magnétiques, halo curseur (desktop).
5. **LCP = poster statique** : 1re frame = **image/poster** de la carte (SSR ou capture) + markers statiques ; MapLibre + mer WebGL montent **après hydratation/idle**. Le live ne bloque jamais le 1er paint.

### Critères d'acceptation
- Hero = **vraie carte + vrais spots/score + mer WebGL animée** ; instrument en données réelles (score étiqueté générique/perso).
- **Floutage anon** respecté dans le hero (aucun GPS précis exposé).
- **LCP < 2,5 s** grâce au **poster statique** (le live MapLibre/WebGL monte après) — Lighthouse mobile.
- **Un seul** contexte GL pour la mer (custom layer MapLibre), pas de 2e canvas.

---

## WS-4 — Carte explorable MapLibre **réelle** (section plus bas)

> Note : le **hero (WS-3) montre déjà une carte vivante** ; ici = la carte **explorable** (filtres espèces/techniques, plus de spots, popup) en aval de la page.

> **Connecteurs** : docs-researcher (MapLibre + Next). Réutiliser `components/map/MapView.tsx`, `MapShell.tsx`, `SpotPopup.tsx`, `MapLegend.tsx`.

### Tâches
1. Intégrer une **vraie carte MapLibre** dans la section 02, avec les **vrais spots publics** + markers colorisés par **score réel** + `SpotPopup` réel. **Lazy-load** à l'entrée en viewport (pas au mount), skeleton `MapSkeleton`.
2. Intro **ScrollTrigger** (la carte se révèle / markers qui apparaissent) sans bloquer l'interaction.
3. **Floutage anon** : la carte publique montre `geom_public` (comme le tier gratuit) — jamais le précis.

### Critères d'acceptation
- La carte rend les **vrais spots** avec scores réels ; clic = vrai popup.
- Markers anon = positions **floutées** (≈ 500-900 m), pas de fuite GPS (réseau vérifié).
- Pas de jank au scroll ; carte lazy (pas dans le LCP).

---

## WS-5 — Sections + scroll storytelling (réel)

### Tâches
1. **Moat** : si loggé, vraies tendances perso ; sinon, exemple **clairement réel** (un spot réel + son score réel) — pas de fausse stat.
2. **Communauté** : **vraies** dernières prises/posts publics (fallback : masquer si trop peu — cf §3 décision).
3. **Espèces** : marquee des **26 réelles** (liens vers `/especes/<slug>`).
4. **Tarifs** : vrais tiers/prix (WS-2), CTA branchés (`/auth/register?plan=…`).
5. **FAQ** (`<details>` a11y + **JSON-LD FAQPage**) + **CTA final**.
6. **Storytelling GSAP** : sections **pin/scrub** maîtrisées (1-2 moments forts max, pas de gadget partout).

### Critères d'acceptation
- Chaque bloc affiche du **réel** (ou se masque proprement si vide) ; CTA routent correctement ; prix = source de vérité.

---

## WS-6 — Mobile (motion adaptée + device)

### Tâches
1. Porter le motion en **dégradé mobile** : Lenis testé sur touch (ou désactivé si instable), effets lourds (WebGL/halo/tilt) **allégés ou off**, **CTA collant en bas**, **zéro scroll horizontal**, tap targets ≥ 44 px.
2. **Tester sur device réel** (l'émulation a manqué pendant les audits) : 360 / 390 / 414.

### Critères d'acceptation
- **Aucun scroll horizontal** à 360 px ; INP < 200 ms ; scroll fluide sur un mobile milieu de gamme.

---

## WS-7 — SEO / meta / analytics

### Tâches
`metadata` (title/desc/canonical/OG), **JSON-LD** Organization + FAQPage (+ Offer pour les tarifs si pertinent), `og:image` de marque. **Événements de conversion** sur chaque CTA via **PostHog MCP** (définir + vérifier les events), et préparer le **flag / l'expérience A/B** de mise en ligne.

### Critères d'acceptation
- Lighthouse **SEO ≥ 95** ; données structurées valides ; CTA trackés.

---

## Workstream VERIF (obligatoire, agent indépendant)

1. **`/verif-sprint`** (tests + build + lint + types + revue indépendante) puis **deploy-watch** sur la preview.
2. **Lighthouse** : A11y ≥ 95, SEO ≥ 95, BP ≥ 95. **Perf** (hero carte+WebGL) : **desktop ≥ 85** ; **mobile ≥ 90 via hero statique** (le live ne monte que sur capable/au-delà du 1er paint). CLS < 0,1, INP < 200 ms, **LCP < 2,5 s (poster)**.
3. **qa-chrome device** : desktop + mobile (360/390), console propre, **zéro scroll horizontal**, reduced-motion OK, **réseau : aucune coord GPS précise exposée à l'anon**.
4. **E2E** (Playwright) : « Créer mon carnet » → `/auth/register` ; un CTA tarif → bon contexte plan.
5. **PostHog** : vérifier la remontée des events de conversion sur la preview ; A/B prêt à être lu après mise en ligne.
5. Passe copy FR : tutoiement, **aucune promesse non livrée** (score perso seulement si réel).
6. `docs/sprint-34/RECAP.md` : fait / comment tester / reste manuel John (+ décision A/B vs swap).

## Reste manuel John (post-sprint)

- Trancher les 3 décisions (WebGL ; A/B vs swap ; gestion réservoir mince).
- Phase 0 verte avant mise en ligne.
- Relire preview → A/B ou swap → merge → déploiement.

---

### Garde-fous transverses (rappels invariants)
- **LCP d'abord** : le motion avancé ne doit jamais retarder le 1er paint (SSR + hydratation différée + lazy).
- **Floutage GPS** : la carte/données publiques de la home = niveau **anon** (jamais de précis). C'est une page **publique** — risque de fuite réel si on réutilise mal les requêtes.
- **Honnêteté** : « tout en réel » = vraies données ; le **score perso prédictif** n'étant pas livré, on montre le **score générique réel** (étiqueté) + les **vraies tendances** seulement pour un connecté.
- Pas de push sans validation ; RLS jamais désactivé ; `lib/types.ts` régénéré si schéma touché (a priori aucune migration).
