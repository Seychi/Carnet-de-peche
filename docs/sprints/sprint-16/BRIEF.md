# Sprint 16 — Brief d'exécution
## Polish mobile & fluidité (« 0 chargement perçu »)

> Rédigé le 2026-06-22, réécrit le 2026-06-22 pour exploiter les connecteurs (cf `CLAUDE.md` §20). Durée : 1,5-2 semaines.
> Contexte : `docs/audits/AUDIT-MOBILE-UX-2026-06-22.md` (UX mobile) + `docs/audits/ANALYSE-COUT-NATIF-FLUIDITE-2026-06-22.md` (perf). Objectif John : **écraser la concurrence sur le ressenti mobile avant d'ajouter des features**. Le contenu nous met déjà devant ; le retard est sur la **fluidité**.
> Décision : on ne part PAS en natif maintenant (cf. analyse coût — le « 0 chargement » se gagne en web par cache/prefetch/optimistic ; le natif viendra après Gate 1).

**Préalable avant de démarrer** (manuel John) :
1. Repo stable, suite verte. (Pas de migration dans ce sprint — c'est du front/perf.)
2. **Avoir un vrai téléphone Android milieu de gamme sous la main** pour la passe perf (WS B/C/VERIF) — le throttling DevTools ne suffit pas.

---

## 🚀 Ligne de lancement (à copier-coller par John)

> ultracode — effort xhigh. Exécute `docs/sprint-16/BRIEF.md`. Lance A, B, C, D en parallèle dès maintenant. **Câblé connecteurs (CLAUDE.md §20)** : avant toute lib (React Query, MapLibre) passe par le sous-agent **docs-researcher** ; pour tout ce qui touche l'auth/les requêtes Supabase, **supabase-guard** en lecture d'abord ; mesure le ressenti via **qa-chrome** (preview + device). Termine par **`/verif-sprint`** puis **qa-chrome sur device réel** et **deploy-watch** après déploiement. Ne push pas. **Docker dispo si besoin** (`supabase start`) — optionnel. **Effort maximal, très attentif et critique** : mesure avant/après (pas d'optimisation à l'aveugle), vérifie le vrai code, passe adversariale (ne JAMAIS cacher au CDN une page qui dépend du tier ou du GPS — risque de fuite cross-utilisateur). Invariants : RLS intactes, pas de régression gating/floutage, `prefers-reduced-motion` respecté.

## ⚙️ Environnement & posture d'exécution (transverse — exigence John 2026-06-21)

**Docker disponible** (optionnel, seulement si nécessaire). **Effort maximal + esprit critique** : le brief est un guide, vérifie chaque hypothèse contre le vrai code ; **mesure** (Lighthouse mobile, traces) avant/après chaque optimisation ; passe adversariale anti-régression (gating de tier, floutage GPS, RLS, SEO) ; `⚠️ DEMANDER À JOHN` plutôt qu'inventer.

## 🧠 Connecteurs & sous-agents (usage systématique — cf `CLAUDE.md` §20)

> Ce sprint se fait « connecté ». **Aucune optimisation à l'aveugle, aucune API de mémoire** : on mesure et on vérifie via les connecteurs. Délègue aux sous-agents (ils encaissent les gros tool-calls, ton contexte principal reste pour le code).

| Quand | Sous-agent → connecteur | Pourquoi (ce que ça rend « intelligent ») |
|---|---|---|
| Avant de coder **React Query/SWR**, **MapLibre/MapTiler**, **IntersectionObserver** | **docs-researcher** → Context7 | API version-correcte (React Query v5 ≠ v4 ; signatures MapLibre prefetch). Évite le bug « API périmée » (cf. finding Stripe 22.x). |
| **A** (round-trips auth) & **C** (5 requêtes carte) | **supabase-guard** → Supabase (RO) | Lire les vraies requêtes/RLS AVANT de toucher ; **garantir qu'aucune page tier/GPS ne passe en cache partagé**. |
| **B, C, D** (ressenti réel) | **qa-chrome** → Claude in Chrome + Playwright | Mesure sur preview **et** device : round-trips, flashs blancs, tuiles < 2,5 s, bugs en 390 px — captures/traces à l'appui. |
| Après déploiement | **deploy-watch** → Vercel + Sentry | Confirmer zéro régression runtime / nouvelle issue après le merge. |
| Clôture | **`/verif-sprint`** | Tests + build + lint + types + revue indépendante + passe anti-régression, en une commande. |

---

## Objectif du sprint en une phrase

Sur un vrai téléphone : les changements d'onglet sont **quasi instantanés**, le scroll **ne flashe plus jamais blanc**, la carte affiche ses tuiles **< 2,5 s**, et les bugs visibles de l'audit mobile sont corrigés.

## Workstreams & dépendances

| WS | Bloc | Durée | Dépend de | Parallèle J1 |
|----|------|-------|-----------|--------------|
| A | Perf navigations (round-trips + cache + optimistic) | 3-4 j | — | ✅ |
| B | Scroll : tuer les flashs blancs + perf | 1,5 j | — | ✅ |
| C | Carte plus rapide | 1,5 j | — | ✅ |
| D | Bugs visibles mobile (lot de finition) | 2 j | — | ✅ |
| VERIF | `/verif-sprint` + **qa-chrome sur device réel** + deploy-watch | 1 j | tous | ❌ (dernier) |

---

## Bloc A — Perf des navigations (le gros levier)

Aujourd'hui chaque tap d'onglet = **3-4 allers-retours Supabase incompressibles** : le middleware (`middleware.ts:39,68` getUser + select onboarded) **puis** le layout app (`app/(app)/layout.tsx:31-46` getUser + subscriptions) **avant** que la page fetch. Et aucune donnée n'est gardée côté client (pas de SWR/React Query) → revenir = tout refetch. C'est le « ça rame entre les onglets ».

> **Connecteurs** : (1) **supabase-guard** lit d'abord `middleware.ts` + `app/(app)/layout.tsx` et confirme, en read-only, quelles requêtes/RLS sont réellement nécessaires par route (ne pas se fier au brief — vérifier le vrai code, il a bougé). (2) **docs-researcher** verrouille l'API exacte de React Query v5 (ou SWR) avant intégration. (3) **qa-chrome** capture la trace réseau **avant** (état actuel) puis **après** pour prouver le gain.

### Tâches
1. **Dégrouper / mutualiser** les requêtes d'auth : éviter le double `getUser` (middleware + layout) ; ne charger `subscriptions` que là où le tier est réellement nécessaire (pas sur chaque page app). Mesurer le gain (traces réseau via qa-chrome).
2. **Cache client** : introduire React Query (ou SWR) sur les écrans chauds (fil, carnet, profil) → revenir sur une page = **affichage immédiat depuis le cache** + revalidation en arrière-plan. (API confirmée via docs-researcher.)
3. **Optimistic + prefetch** : généraliser l'optimistic (déjà fait sur like/commentaire/follow/post au sprint 15) ; précharger au survol/intention les routes probables.
4. **NE PAS** passer en cache CDN une page `(app)` qui dépend du tier/GPS (fuite cross-utilisateur). Le cache ici est **client/SWR**, pas ISR.

### Critères d'acceptation
- Trace réseau (qa-chrome) : un changement d'onglet ne déclenche plus 3-4 round-trips auth en cascade. **Mesure avant/après jointe au RECAP.**
- Revenir sur un onglet déjà visité = rendu **immédiat** (données en cache), revalidation discrète.
- Aucune fuite : un compte gratuit ne voit jamais de données d'un payant, aucune page tier/GPS mise en cache partagé (vérifié par supabase-guard + qa-chrome).

### Garde-fous
- ⚠️ Cache = risque de données périmées : discipline d'invalidation (après mutation, invalider la clé). Tester un like/commentaire → compteur cohérent au retour.

## Bloc B — Scroll : tuer les flashs blancs + perf

Constat vérifié (audit mobile #1) : juste après un scroll, l'écran **flashe blanc** ~1-2 s puis le contenu apparaît — partout (home, fil, profil, form). Les reveals au scroll (sprint 14) se déclenchent trop tard et/ou l'empilement de couches fixes (header + bandeau instruments + tab bar) provoque du repaint.

> **Connecteurs** : **qa-chrome** reproduit le flash sur **device réel** (le throttling DevTools ne le montre pas toujours), capture avant/après ; **docs-researcher** si tu touches l'API IntersectionObserver / la lib d'animation (confirme `rootMargin`/threshold et le respect de `prefers-reduced-motion`).

### Tâches
1. Reveals : déclencher **plus tôt** (IntersectionObserver `rootMargin` négatif / threshold bas) **ou** les désactiver sous le breakpoint mobile ; respecter `prefers-reduced-motion`. Fichiers : composant ScrollReveal (sprint 14), `app/globals.css`.
2. Perf repaint : vérifier que `AppShell`/`AppInstruments`/tab bar fixes n'imposent pas un repaint plein écran au scroll (isoler en couches via `transform`/`will-change` ciblés, pas global).
3. Mesurer sur **device réel** via qa-chrome (pas seulement DevTools).

### Critères d'acceptation
- Scroller du haut en bas de la home ET du fil **sans aucun écran blanc** intermédiaire, sur un vrai téléphone (capture qa-chrome).
- `prefers-reduced-motion: reduce` → contenu visible d'emblée, zéro animation.

## Bloc C — Carte plus rapide

Audit mobile #2 : ~6-8 s de dégradé navy→teal avant les tuiles (aussi sur les mini-cartes des fiches spots).

> **Connecteurs** : **supabase-guard** confirme que les 5 requêtes de `carte/page.tsx` sont indépendantes (donc parallélisables) et qu'aucune ne fuite de geom précis au tier gratuit ; **docs-researcher** verrouille l'API MapLibre/MapTiler (prefetch des tuiles, style allégé) ; **qa-chrome** mesure le time-to-tiles sur 4G simulée + device.

### Tâches
1. Paralléliser les 5 requêtes Supabase de `carte/page.tsx` (auth→tier→profil→spots→scores) au lieu du séquentiel — après confirmation supabase-guard qu'elles sont indépendantes.
2. Style MapTiler allégé mobile + `prefetch` des tuiles autour du centre initial ; confirmer `map.resize()` au `load`. Fichiers : `components/map/MapView.tsx`, `MapShell.tsx`, `SpotMiniMap.tsx`.
3. Skeleton « carte » (pas un simple dégradé).

### Critères d'acceptation
- Tuiles visibles **< 2,5 s** sur 4G simulée (mesure qa-chrome) et nette amélioration sur device réel.
- Mini-carte de fiche spot idem.

## Bloc D — Bugs visibles mobile (finition)

De `AUDIT-MOBILE-UX-2026-06-22.md` :
1. **Image vide dans le fil** (#3) : fallback gracieux si une photo échoue (skeleton pendant le chargement, masquage propre si échec) + investiguer la cause. `components/feed/PostCard.tsx`, `app/actions/feed.ts`.
2. **Filtres `/spots` pleine largeur** sur mobile (#4) : `app/(marketing)/spots/spot-filters.tsx`.
3. **Bandeau instruments** : fondu/affordance de scroll horizontal (#5). `components/layout/AppInstruments.tsx`.
4. **Header « Nouvelle prise »** contraste clair sur navy (#6). `components/catches/CatchForm.tsx`.
5. **Checkboxes/radios teal** dans le profil (#7). `app/(app)/profil/profile-form.tsx` (`accent-color`).
6. **Onglets du fil** : éviter le débordement ≤ 360 px (#8). `components/feed/FeedTabs.tsx`.
7. **Titres de section** formulaires : échelle réduite mobile (#9).

> **Connecteurs** : **qa-chrome** valide chaque point en **390 px** (et 360 px pour #8) avec capture — c'est la preuve d'acceptation. ⚠️ Le repo bouge : vérifie chaque chemin/ligne avant d'éditer (un autre agent a pu déjà toucher ces fichiers).

### Critères d'acceptation
- Chaque point ci-dessus vérifié en 390 px (captures qa-chrome) : aucun bloc image vide, filtres pleine largeur, bandeau avec fondu, header lisible, contrôles teal, onglets non tronqués.

## Workstream VERIF (obligatoire, agent indépendant)

1. Lance **`/verif-sprint`** : `pnpm test` + `pnpm build` + `pnpm typecheck` + `pnpm lint` + `pnpm lhci` verts, revue croisée indépendante du diff contre ce brief, passe anti-régression (gating/floutage/RLS/perf/SEO).
2. **qa-chrome sur device réel** (Android milieu de gamme) : scroll sans blanc, navigations instantanées, carte < 2,5 s. Captures/mesures jointes.
3. **supabase-guard** : confirmer qu'aucune page tier/GPS n'est en cache partagé, RLS intactes, gating/floutage non régressés.
4. Après déploiement (post-merge John) : **deploy-watch** (Vercel build/runtime + Sentry) pour confirmer zéro régression en prod.
5. `docs/sprint-16/RECAP.md` : mesures **avant/après** (Lighthouse mobile, traces réseau qa-chrome) + reste manuel John.

## Reste manuel John (post-sprint)
- Valider le ressenti sur ton téléphone. Merge → `main` + déploiement. Lancer `deploy-watch` après le déploiement.
