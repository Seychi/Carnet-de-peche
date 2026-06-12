# Mini-sprint — Brief d'exécution
## Intégration du logo « carnet qui ferre » sur tout le site

> Rédigé le 2026-06-12. Durée : 1 jour (hors sprint, peut se glisser entre deux blocs du sprint 10).
> Contexte : nouveau logo validé par John le 2026-06-12 — planche de référence `docs/logo/logo-board.png`, philosophie `docs/logo/design-philosophy.md`. Les 4 SVG sources sont déjà dans `public/logo/` (`logo-icon.svg`, `logo-icon-dark.svg`, `logo.svg`, `logo-dark.svg`).
> Décisions John 2026-06-12 : picto = page de carnet (3 lignes d'entrées) + signet-hameçon teal ; couleurs courantes DA v2 (navy-900 `#0A2F3D` / teal-500 `#14B8A6` sur clair, sand-50 `#FBF8F2` / teal-300 `#5EEAD4` sur sombre). Le nom et la tagline ne changent pas.

**Préalable avant de démarrer** (manuel John) : aucun. `main` est déployé et propre (état 2026-06-11).

---

## 🚀 Ligne de lancement (à copier-coller par John)

> ultracode — effort xhigh. Exécute `docs/logo/BRIEF-INTEGRATION.md`. Lance les workstreams
> A/B/C en parallèle dès maintenant, respecte les dépendances du tableau, et termine
> par le workstream VERIF avant de me rendre la main. Ne push pas.

---

## Objectif du sprint en une phrase

Remplacer l'ancien picto partout (composants, favicon, icônes PWA, images OG) par le nouveau logo, sans aucune régression visuelle ni de build.

## Workstreams & dépendances

| WS | Bloc(s) | Durée | Dépend de | Parallélisable jour 1 |
|----|---------|-------|-----------|----------------------|
| A  | Bloc 1 — composant `Logo` + composants layout | 0,5 j | — | ✅ |
| B  | Bloc 2 — favicon + icônes PWA + manifest | 0,5 j | — | ✅ |
| C  | Bloc 3 — images OG | 0,5 j | — | ✅ |
| D  | Bloc 4 — balayage des occurrences restantes | 0,25 j | A | ❌ |
| VERIF | revue finale | 0,25 j | tous | ❌ (toujours en dernier) |

---

## Bloc 1 — Composant `Logo` central + remplacement dans les layouts

Aujourd'hui le picto est dupliqué en SVG inline dans au moins 3 fichiers (`components/layout/Header.tsx` ~l.23, `components/layout/AppHeader.tsx` ~l.9, `components/layout/Footer.tsx` ~l.56 — anciens viewBox `0 0 24 24` et `0 0 30 30`). On centralise pour ne plus jamais dupliquer.

### Tâches
1. Créer `components/ui-v2/Logo.tsx` : composant server-safe (pas de `'use client'`) qui rend le picto **en SVG inline** (pas de `<img src>` — évite un fetch et permet `currentColor`). Reprendre exactement la géométrie de `public/logo/logo-icon.svg` (grille 48, trait 3, rect `x=11 y=6 w=26 h=29 rx=5`, 3 lignes `M16 13.5h10 / M16 19.5h10 / M16 25.5h6`, hameçon `M31 6v31a4.5 4.5 0 1 1-9 0v-2`, masque d'échancrure `M31 33v4` stroke-width 5). Props : `size?: number` (default 32), `variant?: 'light' | 'dark'` (couleurs ci-dessus), `withWordmark?: boolean` (wordmark = `Carnet de Pêche` en Space Grotesk 600, via la classe de fonte existante du projet, PAS un `<text>` SVG). Attribut `aria-hidden` si purement décoratif, sinon `<title>Carnet de Pêche</title>`.
2. Remplacer les SVG inline par `<Logo …/>` dans `components/layout/Header.tsx`, `components/layout/AppHeader.tsx`, `components/layout/Footer.tsx`. Conserver les tailles rendues actuelles à ±2 px (mesurer avant de remplacer) et les liens englobants existants.
3. Vérifier `components/mobile-nav.tsx` : si l'ancien picto y figure, même traitement.

### Critères d'acceptation
- `grep -rn "viewBox=\"0 0 30 30\"" components/ app/` ne retourne plus rien (ancien picto éradiqué des composants).
- `/`, `/home`, `/carnet`, `/tarifs` affichent le nouveau picto dans le header et le footer (vérif visuelle locale `pnpm dev`).
- Le composant `Logo` est utilisé partout — aucune nouvelle copie inline du path en dehors de `components/ui-v2/Logo.tsx`.
- `pnpm build` OK.

### Garde-fous
- Ne pas toucher : tokens `app/globals.css`, autres composants `components/ui-v2/*`.
- Ne pas modifier les 4 fichiers `public/logo/*.svg` (source de vérité de la marque).

## Bloc 2 — Favicon + icônes PWA + manifest

Les PNG actuels de `public/icons/` (apple-touch-icon, icon-192/512, maskable-192/512) portent l'ancien picto. Le manifest `public/manifest.webmanifest` référence ces fichiers (noms à conserver — zéro changement de chemin).

### Tâches
1. Régénérer depuis la géométrie de `public/logo/logo-icon-dark.svg` (script Node + `sharp`, à mettre dans `scripts/generate-icons.mjs`, committé) :
   - `public/icons/icon-192.png`, `icon-512.png` : picto sombre centré sur fond navy-950 `#04141C`, coins pleins (le launcher arrondit lui-même), picto à ~70 % de la largeur.
   - `public/icons/icon-maskable-192.png`, `icon-maskable-512.png` : idem mais picto à ~55 % (zone de sécurité maskable de 20 %).
   - `public/icons/apple-touch-icon.png` (180×180) : même recette que icon-192.
2. Favicon : ajouter `app/icon.svg` (convention Next App Router — picto seul, variante claire, fond transparent). Si un `app/favicon.ico` existe, le régénérer en 32×32 depuis le même rendu ; sinon ne pas en créer.
3. `app/layout.tsx` : vérifier le bloc `icons:` (~l.39) — les chemins ne changent pas, ne toucher que si un chemin est cassé.

### Critères d'acceptation
- Les 5 PNG de `public/icons/` ont une mtime du jour et montrent le nouveau picto (ouvrir les fichiers).
- `public/manifest.webmanifest` : AUCUNE modification (diff vide sur ce fichier).
- Onglet navigateur en dev : nouveau favicon visible.
- `pnpm build` OK.

### Garde-fous
- `sharp` en devDependency uniquement.
- Ne pas toucher : `start_url`, `theme_color`, `background_color` du manifest.

## Bloc 3 — Images OG

`app/opengraph-image.tsx` (OG de marque par défaut, sprint 9.5 T0.1) et les routes `app/og/spot/` + `app/og/spots/` embarquent l'ancien picto.

### Tâches
1. Dans `app/opengraph-image.tsx` : remplacer l'ancien picto par le nouveau (JSX SVG inline, même géométrie que le Bloc 1 ; les composants React ne sont pas toujours importables dans un contexte `ImageResponse` edge — dupliquer le path ICI est autorisé, avec un commentaire `/* source: public/logo/logo-icon.svg */`).
2. Même traitement dans `app/og/spot/` et `app/og/spots/` s'ils affichent le picto (grep `viewBox` dans ces routes).

### Critères d'acceptation
- `curl -s localhost:3000/opengraph-image | file -` retourne bien une image PNG et l'aperçu montre le nouveau picto.
- Les OG spot continuent de rendre sans erreur (tester une URL `app/og/spot` existante en dev).
- `pnpm build` OK.

### Garde-fous
- Ne pas toucher : textes, dimensions 1200×630, données dynamiques des OG spot.

## Bloc 4 — Balayage des occurrences restantes (après Bloc 1)

Filet de sécurité : retrouver toute occurrence résiduelle de l'ancien picto ou d'un placeholder.

### Tâches
1. `grep -rn "0 0 30 30\|0 0 24 24" app/ components/ --include="*.tsx"` : examiner chaque hit ; ne remplacer que les occurrences qui sont l'ancien LOGO (les icônes Lucide utilisent aussi `0 0 24 24` — ne pas y toucher).
2. Vérifier les écrans qui affichent une marque : `app/auth/layout.tsx`, `app/(app)/onboarding/` (écran final « carnet prêt »), `app/not-found.tsx`, page offline `app/offline/`. Remplacer par `<Logo/>` le cas échéant.

### Critères d'acceptation
- Liste exhaustive des hits examinés dans le RECAP, avec décision par hit (remplacé / icône Lucide laissée).

### Garde-fous
- ⚠️ DEMANDER À JOHN AVANT : si l'ancien picto apparaît dans un endroit inattendu où le remplacement change la mise en page (email, PDF, seed).

## Workstream VERIF (obligatoire, agent indépendant)

1. `pnpm test` (suite complète verte, ≥215 tests) + `pnpm build` (OK).
2. Relire chaque critère d'acceptation du brief et cocher ✅/❌ avec preuve (commande + sortie).
3. Passe sécurité : aucun secret commité, aucune modification RLS/migrations (ce sprint n'en contient pas — toute migration = drapeau rouge).
4. Passe copy : alt/title en français, tutoiement, pas de promesse produit.
5. Passe visuelle : captures header clair (`/`), header app (`/home`), footer, favicon, et un OG — comparer au lockup de `docs/logo/logo-board.png`.
6. Livrer `docs/logo/RECAP-INTEGRATION.md` : fait / comment tester / reste manuel John.

## Reste manuel John (post-sprint)

- QA visuelle rapide sur mobile (tab bar + header instruments).
- Commit + push après validation, déploiement Vercel auto.
- Vider le cache navigateur / vérifier le favicon en prod (les favicons sont agressivement cachés).
