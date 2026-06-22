# Sprint 14 — Brief d'exécution
## Effet 10 000 € (home + design)

> Rédigé le 2026-06-21. Durée : 1,5-2 semaines.
> Contexte : `docs/excellence/ROADMAP.md` · audit home 2026-06-21 (note **4,5/10** : « montre une maquette, pas un produit vivant »). Faux exemples partout, micro-interactions absentes, hiérarchie typo faible. Le contraste footer a déjà été corrigé (quick wins 2026-06-21). DA v2 « Instrument marine » : `docs/maquette-v2/DA.md`, tokens dans `app/globals.css` (@theme), composants `components/ui-v2/*`.
> Décision John 2026-06-21 : viser un rendu « 10 000 € » dès la home ; objectif final du track = leader incontestable, pas « un cran au-dessus ».

**Préalable avant de démarrer** (manuel John) :
1. Sprints 12-13 mergés (la home pourra montrer de vraies photos de posts).
2. ⚠️ Trancher le mode des visuels home (Bloc A) : **data réelle live** (recommandé) vs **captures produit**. Défaut retenu : data réelle, fallback capture.

---

## 🚀 Ligne de lancement (à copier-coller par John)

> ultracode — effort xhigh. Exécute `docs/sprint-14/BRIEF.md`. Lance A, B, C, D, E en parallèle dès maintenant (B s'appuie sur les tokens de C mais peut démarrer). Termine par VERIF. Ne push pas. **Docker dispo si besoin** (`supabase start`) — optionnel, seulement quand c'est utile (migration sensible, repro d'un bug), pas un passage obligé. **Effort maximal, très attentif et critique** : vérifie le vrai code, remets en cause le brief s'il se trompe, passe adversariale anti-régression (cf §Environnement & posture). Invariants : ne casse aucun SEO existant (JSON-LD, canonical, OG, sitemap), respecte `prefers-reduced-motion`, pas de localStorage en artifact, DA v2 = référence.

---

## ⚙️ Environnement & posture d'exécution (transverse — exigence John 2026-06-21)

**Docker est disponible** sur la machine de John — **optionnel, à utiliser seulement si nécessaire** (pas un passage obligé) :
- Pour reproduire un bug dur ou tester l'app en local, `supabase start` (stack Supabase local sous Docker) est dispo. Ce sprint n'a pas de migration, donc Docker n'est probablement pas nécessaire ici.
- Lance tests + e2e Playwright (et **Lighthouse** pour ce sprint UI) contre une base/instance jetable, jamais la prod.
- Conteneurise le build si ça aide à reproduire un comportement.

**Effort maximal + esprit critique** (exigence, pas une option) :
- `ultracode` + effort `xhigh` : parallélise au max, ne bâcle aucun bloc, va au bout des critères d'acceptation.
- **Très attentif et critique** : le brief est un guide, pas une vérité. Vérifie chaque hypothèse (chemins, lignes, schéma) contre le **vrai code** avant d'agir ; si un élément cloche, **remets en cause le brief** au lieu de l'exécuter aveuglément.
- **Passe adversariale** sur ton propre travail : traque les régressions (gating de tier, floutage GPS, RLS, perf INP, SEO), les cas limites et les fuites de données. En cas de doute : `⚠️ DEMANDER À JOHN` plutôt qu'inventer.

---

## Objectif du sprint en une phrase

La home ne contient plus aucun faux « Exemple » : elle montre du vrai produit (posts/spots réels), s'anime au scroll avec finesse, applique une hiérarchie typo nette et des états de chargement soignés — score perçu visé **≥ 8/10**.

## Workstreams & dépendances

| WS | Bloc | Durée | Dépend de | Parallélisable jour 1 |
|----|------|-------|-----------|----------------------|
| A | Virer les faux exemples → vrai produit | 2-3 j | sprints 12-13 mergés | ✅ |
| B | Micro-animations (scroll reveal, hover, compteurs, header) | 2 j | C (tokens) light | ✅ |
| C | Polish DA v2 (typo, focus rings, Bathy/TagData) | 2 j | — | ✅ |
| D | États de chargement (skeletons, images lazy/blur) | 1,5 j | — | ✅ |
| E | CTA & copy + `/techniques` | 1 j | — | ✅ |
| VERIF | Revue finale indépendante | 0,5 j | tous | ❌ (toujours en dernier) |

---

## Bloc A — Virer les faux exemples → vrai produit

`app/(marketing)/page.tsx` contient : `ExampleBadge()` (≈ l.86), `VisualCarnet` (≈114), `VisualCarte` (≈153), `VisualCommunaute` (≈182, **faux noms** « Yann Le Bras », « Sophie Marec », « Loïc Briand »), + badges « Exemple » épars (≈274, 391, 430, 459). Tout est figé/inventé → tue la crédibilité.

### Tâches
1. **VisualCommunaute** → 3 **vrais** posts publics récents : Server Component qui fetch via `feed_posts_for_viewer` (visibilité publique, anon) les 3 derniers posts avec photo, auteur réel (pseudo), sans coords précises. Fallback statique honnête si < 3 posts.
2. **VisualCarte** → vraie carte ou capture réelle de la carte avec le **vrai compte de spots** (38 en prod ; lire dynamiquement). Plus de « 3 spots » inventés.
3. **VisualCarnet** → vraies stats agrégées anonymisées (ex. « X prises loguées cette semaine ») ou capture produit réelle.
4. **Supprimer `ExampleBadge`** et tous les badges « Exemple ». Si une démo reste illustrative, le dire en prose (« exemple de score personnalisé »), jamais avec un badge « fake ».

### Critères d'acceptation
- Recherche `Exemple` dans le DOM rendu de `/` → **0 occurrence** de badge.
- Les noms « Yann Le Bras / Sophie Marec / Loïc Briand » n'existent plus dans le code.
- La section communauté affiche des pseudos réels issus de la base (ou un fallback honnête si vide), sans position GPS précise.
- Le nombre de spots affiché = nombre réel en base.

### Garde-fous
- ⚠️ DEMANDER À JOHN AVANT de publier des posts d'utilisateurs réels en home s'ils ne sont pas déjà publics (n'utiliser que `feed_posts_for_viewer` visibilité publique).
- Ne pas réintroduire de fausses preuves sociales (témoignages inventés).

## Bloc B — Micro-animations

Le site est statique (audit : « micro-interactions 2/10 »).

### Tâches
1. **Scroll reveal** : composant `ScrollReveal` (IntersectionObserver, fade + slide-up léger) appliqué aux sections de `page.tsx`. **Respecter `prefers-reduced-motion`** (aucune animation si réduit).
2. **Hover** : cartes tarifs (`app/(marketing)/tarifs/pricing-cards.tsx`) et cartes guides → lift + ombre + légère scale au hover.
3. **Compteurs animés** : « 6 espèces », « 100% gratuit », nb spots → count-up au scroll (hook `useCountUp`, désactivé si reduced-motion).
4. **Header** : `components/layout/Header.tsx` → ombre + `backdrop-blur` quand `scrollY > 10`.

### Critères d'acceptation
- Au scroll, les sections apparaissent en fondu (et restent visibles si on remonte).
- `prefers-reduced-motion: reduce` → aucune animation, contenu visible d'emblée.
- Header gagne une ombre/flou après défilement.

### Garde-fous
- Pas de jank : animations CSS/transform uniquement (pas de layout thrash). Pas de dépendance lourde si évitable.

## Bloc C — Polish DA v2

### Tâches
1. **Échelle typo** : expliciter les tailles des `h2`/`h3` des sections (l'audit note des `<h2>` sans classe → trop petits). Échelle stricte (ex. 12/14/16/18/22/28/36/48). Appliquer dans `page.tsx` et pages marketing.
2. **Focus rings AA partout** : `focus-visible:outline-2 outline-offset-2 outline-teal-500` (ou équivalent token) sur liens, boutons, toggles tarifs. Navigation clavier visible.
3. **Bathy** : remonter l'opacité (audit : 30-35% = fantôme) vers ~50% là où c'est identitaire ; **TagData** : taille mini ≥ 12px desktop.
4. Vérifier l'usage `font-mono` (JetBrains) sur **tout chiffre métier** (règle d'or DA v2).

### Critères d'acceptation
- Lighthouse a11y ≥ 95 sur `/` (focus + contrastes).
- Tab au clavier : focus visible sur chaque élément interactif de la home et des tarifs.
- Aucune `h2` sans taille explicite dans les pages marketing.

### Garde-fous
- Rester dans les tokens `app/globals.css` (@theme), ne pas inventer de couleurs hors charte.

## Bloc D — États de chargement

### Tâches
1. Skeletons : fil (`PostCardSkeleton` si pas déjà fait au sprint 13), carte (skeleton existant au sprint 4 à vérifier), listes guides/espèces.
2. Images : `next/image` avec `placeholder="blur"` + `sizes` corrects sur les covers guides (`app/(marketing)/guides/`) ; lazy par défaut.

### Critères d'acceptation
- Pas d'écran blanc au chargement des pages à data ; un skeleton ou un blur s'affiche.
- Les images guides ne provoquent pas de CLS (dimensions/sizes fournis).

## Bloc E — CTA, copy & `/techniques`

### Tâches
1. Unifier les libellés CTA (audit : mélange « Créer mon carnet » / « Commencer » / « Voir un exemple »). Choisir une formulation principale cohérente.
2. CTA de bas de page sur chaque page marketing (`especes`, `guides`, `techniques`) avant le footer.
3. `app/(marketing)/techniques/page.tsx` = stub « Bientôt » → soit `noindex` propre + CTA waitlist honnête, soit premier contenu réel. Tranché : **noindex + teaser honnête** (le contenu profond arrive sprint 15/sprint 10 bloc 3).

### Critères d'acceptation
- Libellé CTA principal cohérent sur toute la home.
- `/techniques` n'est plus un soft-404 indexé (vérifier `robots`/`metadata`).
- Chaque page marketing a un CTA de conversion visible avant le footer.

### Garde-fous
- Ne pas réintroduire de promesse mensongère (export GPX, « 27 départements », etc. — déjà nettoyés sprint 11.6).

## Workstream VERIF (obligatoire, agent indépendant)

1. `pnpm test` + `pnpm build` + `pnpm typecheck` + `pnpm lhci` (a11y + seo) verts.
2. Cocher A→E avec preuve (grep « Exemple », Lighthouse, test reduced-motion).
3. Passe SEO : JSON-LD, canonical, OG, sitemap intacts (régression interdite — c'était un point fort).
4. Passe copy : tutoiement, rien de mensonger, CTA cohérents.
5. Livrer `docs/sprint-14/RECAP.md` avec avant/après du score perçu (capture).

## Reste manuel John (post-sprint)

- Valider visuellement le rendu (c'est subjectif : l'agent livre, John arbitre le « waouh »).
- Fournir d'éventuelles vraies captures produit HD si le mode « capture » est choisi.
- Merge → `main` + déploiement.
