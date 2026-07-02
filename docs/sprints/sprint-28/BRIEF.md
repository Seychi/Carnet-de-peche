# Sprint 28 — Brief d'exécution
## Polish & fluidité « feel natif » v2 — tenir le standard sur TOUTES les surfaces

> Rédigé le 2026-06-24. Durée cible : ~1 semaine.
> Contexte : audit `docs/audits/AUDIT-UX-2026-06-24.md` + `docs/audits/AUDIT-MOBILE-UX-2026-06-22.md` + RECAP `docs/sprint-16/RECAP.md` (qui a déjà clos l'essentiel de la liste 22/06). Vient après le sprint 27 (IA & nav).
> Décisions John 2026-06-24 : on règle le « feel natif » AVANT le port Expo.
> Périmètre : **perf / fluidité / UI / design**. Pas de changement de logique métier, pas de migration, pas de RLS.

**⚠️ Reframe à lire avant de commencer.** Le sprint 16 a **déjà résolu** la liste de fluidité du 22/06 : flash blanc au scroll (RÉSOLU, vérifié opacité 1,0 en scroll rapide et lent), carte (prewarm + prefetch tuiles + `MapSkeleton`, 1ʳᵉ tuile ~2,9 s), et les **7 bugs de finition** (image fil `onError`/fallback, filtres `/spots` pleine largeur, fondu bandeau instruments, fondu onglets fil, contraste header prise, radios `accent-teal-600`, titre section CatchForm). **On NE refait PAS ça.** Ce sprint : (1) **re-vérifier** que ces fixes tiennent sur device réel APRÈS les ajouts des sprints 17-26 ; (2) attaquer le **seul vrai goulot perf restant** (coût JS de la carte, que le S16 a explicitement différé) ; (3) appliquer le **même standard de polish aux surfaces nouvelles** (co-pêchage, gamification, réglementation, score espèce) jamais auditées en mobile ; (4) finir **2 détails design** réels.

**Préalable avant de démarrer** (manuel John) : sprint 27 mergé + déployé (sinon la nouvelle nav/`MoreMenu` n'est pas sur la preview à auditer). Device de test : un **Android milieu de gamme réel** + un iPhone à encoche.

---

## 🚀 Ligne de lancement (à copier-coller par John)

> ultracode — effort xhigh. Exécute `docs/sprint-28/BRIEF.md`. Lis d'abord le reframe : le sprint 16 a déjà clos la liste 22/06, ne la refais pas. Lance les workstreams A/B/C en parallèle (re-vérif fluidité / perf JS carte / polish des surfaces post-S16), respecte les dépendances, et termine par VERIF avec un test sur device réel. Sois critique : mesure une baseline AVANT de « corriger » une perf, et remets en cause le brief si une cible est déjà atteinte. Ne push pas.

---

## 🧠 Connecteurs & sous-agents (usage systématique — cf `CLAUDE.md` §20)

| Quand | Sous-agent → connecteur | Pourquoi |
|---|---|---|
| Lazy-load / dynamic import MapLibre, patterns perf Next 15 | **docs-researcher** → Context7 | Pattern `next/dynamic` + MapLibre version-correct (le précédent maison = `components/conditions/TideChartLazy.tsx`). |
| QA de chaque écran (preview + **device réel**) | **qa-chrome** → Claude in Chrome + Playwright | Captures desktop + mobile, scroll, console, réseau, Lighthouse. |
| Après déploiement | **deploy-watch** → Vercel + Sentry | Pas de régression runtime sur les layouts/carte modifiés. |
| Clôture | **`/verif-sprint`** | Tests + build + typecheck + lint + revue indépendante + anti-régression. |

> **supabase-guard : non requis** (aucun changement DB). Toucher la base = hors périmètre.

---

## Objectif du sprint en une phrase

**Le « feel natif » tient sur 100 % des surfaces** (y compris celles des sprints 17-26) et la carte passe sous le seuil perçu — mesuré sur device réel : scroll sans blanc partout, `/carte` Lighthouse mobile ≥ 70 (TBT < 600 ms).

---

## Workstreams & dépendances

| WS | Bloc(s) | Durée | Dépend de | Parallélisable jour 1 |
|----|---------|-------|-----------|----------------------|
| A  | Bloc 1 (re-vérif fluidité device réel) | 0,5-1 j | sprint 27 déployé | ✅ |
| B  | Bloc 2 (perf JS carte) | 2-3 j | — | ✅ |
| C  | Bloc 3 (polish surfaces post-S16) | 2 j | — (multi-agents par groupe d'écrans) | ✅ |
| D  | Bloc 4 (2 détails design) | 1 j | — | ✅ |
| VERIF | revue + device réel | 0,5 j | tous | ❌ (toujours en dernier) |

---

## Bloc 1 — Fluidité & transitions : fix « footer au clic sur Fil » + re-vérif device

Les fixes du S16 sont en place. Objectif : confirmer qu'ils **tiennent encore** maintenant que les sprints 17-26 ont ajouté des surfaces (sorties, gamification, score espèce, réglementation) qui montent leurs propres composants animés.

> **Note John 2026-06-24** : le **flash blanc au scroll n'est PLUS un problème** (confirmé sur device) — le S16 l'a bien réglé. Le **seul** défaut de transition observé est le **footer marketing qui flashe ~0,5 s en cliquant « Fil régional »** : c'est une fuite de shell (route `/fil` marketing qui redirige). **Le sprint 27 étant déjà lancé, on corrige cette fuite ICI** (tâche 1 ci-dessous), puis on vérifie sur device que (a) le scroll reste sans blanc et (b) la transition Fil est devenue propre.

> **Connecteurs** : **docs-researcher** (Context7) pour le routing/`redirect` Next 15 (tâche 1) ; **qa-chrome** sur device réel pour la re-vérif. Code limité à la tâche 1 (nav) + corrections de re-jank ciblées.

### Tâches
1. **[FIX] Footer au clic sur « Fil » (fuite de shell)** : les liens « Fil » du shell app (`components/layout/AppSidebar.tsx`, `components/layout/TabBar.tsx`, et `MoreMenu` si livré au S27) pointent vers `/fil` — page du groupe `(marketing)` (Header **+ Footer**) qui ne *redirige* qu'**ensuite** le connecté vers `/fil/[dept]` (`app/(marketing)/fil/page.tsx`, `redirect()` serveur), d'où le **footer qui flashe ~0,5 s** (observé John 2026-06-24). **Fix** : pour un connecté **avec** département, pointer le lien « Fil » du shell app **directement** vers `/fil/[home_department]` (on reste dans le shell app, zéro footer) ; **sans** département → `/fil` (chooser). Threader `homeDepartment` depuis `app/(app)/layout.tsx` → `AppShell` → `AppSidebar` / `TabBar` / `MoreMenu`. Garder `/fil` (stub) pour les anonymes/SEO. ⚠️ Vérifier d'abord (`git log`/code) que le sprint 27 ne l'a pas déjà introduit → si oui, ne pas dupliquer, juste valider.
2. Sur **Android réel** : scroller de haut en bas `/home`, `/carnet`, `/fil/[dept]`, fiche spot, `/profil`, **+ les écrans neufs** `/sorties`, page gamification, fiche espèce (`/especes/bar`) → **aucun flash blanc/crème**.
3. `/carte` sur 4G simulée : 1ʳᵉ tuile **< 2,5 s**, pas de canvas noir au mount. Mini-cartes (`SpotMiniMap`, `CatchMiniMap`) idem.
4. Vérifier que `ScrollReveal` (`components/ui-v2/scroll-reveal.tsx`) et `AnimatedCounter` ne sont pas appliqués de façon trop agressive sur les nouveaux écrans (listes longues du fil/pokédex → reveals en cascade = re-jank). Si un écran neuf rejank → corriger CIBLÉ (désactiver le reveal sur les items de liste, garder sur les sections).
5. Confirmer `prefers-reduced-motion` respecté sur les nouveaux composants animés (StreakCard, score ring espèce, etc.).
6. **Autres transitions propres** : depuis le shell app, cliquer « Co-pêchage », « Espèces », « Guides » → aucun flash de footer/shell étranger ni page intermédiaire. Repérer toute autre transition qui laisse voir un shell de passage.

### Critères d'acceptation
- Capture vidéo/série d'un scroll rapide sur 3 écrans (dont 1 neuf) **sans frame < 0,9 d'opacité** (méthode S16).
- `/carte` : 1ʳᵉ tuile < 2,5 s mesurée (qa-chrome réseau).
- Liste du fil / pokédex : scroll fluide, pas de reveal en cascade qui « pop ».
- Navigation vers le fil (et autres entrées du shell app) : **aucun flash de footer/shell de passage** (le fix de la tâche 1 élimine le ~0,5 s observé). Vérifier réseau (qa-chrome) : plus de navigation intermédiaire vers `/fil` pour un connecté avec département.

### Garde-fous
- Ne PAS retoucher les fixes S16 qui passent. Ne corriger que ce qui rejank réellement sur device.

---

## Bloc 2 — Perf JS de la carte (le seul vrai goulot restant)

Le S16 a rendu la carte **perçue** rapide (skeleton + prefetch) mais a explicitement laissé en réserve le **coût JS MapLibre** : `/carte` Lighthouse mobile **46**, TBT **1240 ms** (cf `docs/sprint-16/RECAP.md`, « réserve perf P2 »). C'est le candidat « sprint perf carte dédié ». On l'attaque ici.

> **Connecteurs** : **docs-researcher** (Context7) pour `next/dynamic` + import dynamique MapLibre GL. Précédent maison : `components/conditions/TideChartLazy.tsx`.

### Tâches
1. **Mesurer la baseline AVANT toute modif** (Lighthouse mobile `/carte`, TBT, bundle des chunks `(map)`), la consigner dans le RECAP — on ne « corrige » pas une perf sans chiffre de départ.
2. **Lazy-load MapLibre GL** : importer dynamiquement `maplibre-gl` (et `MapView`) via `next/dynamic` (`ssr: false`) pour le sortir du JS critique de `app/(map)/carte/page.tsx` ; afficher `MapSkeleton` pendant le chargement (déjà CSS-only).
3. Vérifier le **tree-shaking** des contrôles/plugins MapLibre importés (n'importer que ce qui sert) et défer les couches lourdes (bathy/heatmap) au post-mount.
4. Re-mesurer après chaque étape ; viser les cibles ci-dessous. Si une optim casse l'UX (flash, perte d'interactivité), la documenter et la retirer.

### Critères d'acceptation
- `/carte` Lighthouse **mobile ≥ 70** (depuis 46) **et** TBT **< 600 ms** (depuis 1240 ms), mesuré qa-chrome, baseline + après dans le RECAP.
- **Aucune régression de gating/GPS** : l'ordre `getUserTier` AVANT `fetchSpots` (S16) est préservé ; les spots floutés restent floutés pour les gratuits ; `force-dynamic` conservé sur `/carte`.
- 1ʳᵉ tuile toujours < 2,5 s (pas de régression du perçu).

### Garde-fous
- ⚠️ Le floutage GPS et le gating de tier passent par le serveur — **ne pas** les déplacer côté client en lazy-loadant. Le lazy-load ne concerne QUE le rendu MapLibre, pas la récupération des données gatées.
- Si la cible Lighthouse ≥ 70 n'est pas atteignable sans refonte profonde → livrer le gain obtenu + `⚠️ DEMANDER À JOHN` pour un arbitrage (sprint perf dédié vs suffisant).

---

## Bloc 3 — Polish des surfaces post-S16 (jamais auditées en mobile)

Les sprints 17-26 ont ajouté des écrans **après** l'audit mobile du 22/06 et le polish du S16. Ils n'ont jamais reçu la passe « feel natif ». On les met au standard.

> **Connecteurs** : **qa-chrome** (captures 390 px de chaque surface). **docs-researcher** si pattern d'animation à confirmer.

### Surfaces à passer (un agent par groupe possible)
1. **Co-pêchage** : `app/(app)/sorties/page.tsx`, `components/cofishing/OutingComposer.tsx`, `components/cofishing/ProposalCard.tsx`.
2. **Gamification** : `components/gamification/{GamificationHub,PokedexGrid,StreakCard,BadgesGrid,ConservationChallenges}.tsx`.
3. **Réglementation** : `components/regulation/{CatchRegulationSection,SpotRegulationCard}.tsx` + `components/catches/RecfishingNotice.tsx`.
4. **Score/insights espèce & carnet** : `components/especes/{species-score,species-season-now,species-top-spots,species-personal}.tsx`, `components/catches/{NextWindowInsight,CatchStatsDetailed}.tsx`, `components/catches/BulkCatchImport.tsx`.

### Checklist à appliquer à chaque surface (critères d'acceptation)
- **Tap targets ≥ 44 px** sur tous les contrôles interactifs.
- **Charte respectée** : couleurs teal/navy/gold, **aucun bleu/gris OS par défaut** (checkboxes, radios, selects, focus) ; chiffres métier en `font-mono`.
- **Pas de débordement à 390 px** (ni 360 px) : pas de texte coupé, pas de bloc flotté laissant un vide ; barres d'onglets/segments scrollables avec fondu si besoin (réutiliser le pattern S16).
- **Reduced-motion** respecté sur tout composant animé (score ring, streak, reveal).
- **Échelle typographique** cohérente avec le reste de l'app (titres de section ~18-20 px sur mobile, cf polish S16).
- Capture 390 px **avant/après** de chaque surface jointe au RECAP.

### Garde-fous
- Polish visuel uniquement : ne pas toucher la logique (scoring, réglementation, gating co-pêchage GPS).
- ⚠️ Garde-fou GPS du co-pêchage intact (aucune divulgation de spot précis — cf `CLAUDE.md` / Chantier G).

---

## Bloc 4 — 2 détails design réels

> **Connecteurs** : **docs-researcher** si besoin (SVG/illustration). **qa-chrome** pour le rendu.

### Tâches
1. **Visuels par espèce** (cartes `/especes` + fiches) : aujourd'hui **chaque carte affiche le même pictogramme `<Fish>` générique** (`app/(marketing)/especes/page.tsx:87`). Remplacer par un **visuel distinct par espèce** — recommandation par défaut : **silhouettes SVG line-art maison** (légères, on-brand teal/navy, zéro risque de droits, faciles à maintenir), via un composant `components/especes/SpeciesGlyph.tsx` mappant `slug → silhouette`. Réutiliser le glyph sur la fiche espèce et, si pertinent, dans le sélecteur d'espèces du `CatchForm`.
2. **`/home` — bouton « Me déconnecter »** : il est affiché en haut à droite du dashboard (cf capture audit `ss_2767swggv`) et fait doublon avec l'avatar (`UserMenu`). Le **retirer du dashboard** (la déconnexion vit dans l'avatar) et, si la place se libère, y mettre une action utile (« Voir mes tendances » → `/carnet`, ou « Loguer une sortie » → `/carnet/sortie`). Localiser le composant qui le rend (page `/home` ou un enfant du dashboard).

### Critères d'acceptation
- Chaque espèce a un visuel **distinct** sur `/especes` (plus de `<Fish>` identique partout) ; CLS nul (SVG inline, pas d'image distante) ; build vert.
- `/home` n'affiche plus de bouton « Me déconnecter » proéminent ; la déconnexion reste accessible via l'avatar.

### Garde-fous
- ⚠️ DEMANDER À JOHN AVANT de produire les visuels : confirmer la **direction artistique** (silhouettes line-art monochrome = reco par défaut vs illustrations détaillées vs photos sourcées). Les silhouettes maison sont le défaut sûr (légèreté + droits) ; si John veut des illustrations riches, c'est un **lot d'assets** à cadrer (budget/temps) → ne pas improviser 20-26 illustrations sans son OK.
- Originaux uniquement — **ne copier aucun visuel d'artiste/marque existant** (risque de droits).

---

## Workstream VERIF (obligatoire, agent indépendant)

1. **`/verif-sprint`** : `pnpm test` + `pnpm build` + `pnpm typecheck` + `pnpm lint` + revue croisée + anti-régression. Puis **deploy-watch** après déploiement.
2. **Mesures device réel** (la seule qui compte) : sur Android milieu de gamme — scroll sans blanc sur 3 écrans dont 1 neuf ; `/carte` 1ʳᵉ tuile < 2,5 s ; navigation fluide.
3. **Lighthouse mobile** : `/` , `/carte` (cible ≥ 70 / TBT < 600 ms), une fiche espèce, `/sorties` — chiffres baseline + après dans le RECAP.
4. **Anti-régression ciblée** : floutage GPS / gating tier / RLS **intacts** (`git diff --stat` ne montre que perf/UI/design + tests, aucun `lib/*` data ni `supabase/*`) ; SEO `/especes` `/carte` `/` inchangé (canonical/JSON-LD/robots) ; `/` reste statique, `/carte` reste `force-dynamic`.
5. **a11y AA** sur les surfaces touchées : contraste, focus visible, `prefers-reduced-motion`, tap targets.
6. Relire chaque critère d'acceptation Blocs 1→4 et cocher ✅/❌ avec preuve (capture / chiffre Lighthouse / commande).
7. Livrer `docs/sprint-28/RECAP.md` : fait / comment tester / reste manuel John + **tableau perf baseline→après**.

---

## Reste manuel John (post-sprint)

- Valider le **ressenti sur ton téléphone** (mesure souveraine) : scroll, carte, surfaces neuves.
- Trancher la **direction artistique** des visuels d'espèce (Bloc 4) si non fait avant.
- Relire la branche → merge → `main` → déploiement → re-Lighthouse en prod.

---

## Rappels invariants (cf `CLAUDE.md`)

- Pas de push sans validation. RLS jamais désactivé. Aucune migration ce sprint (sinon hors périmètre). 
- Sprint **perf/UI/design only** : si un agent ouvre une migration, `app/actions/*` ou la logique de scoring/réglementation/gating, il sort du périmètre → s'arrêter et signaler.
- **Mesurer avant d'optimiser** : aucune « amélioration » perf annoncée sans chiffre baseline → après.
