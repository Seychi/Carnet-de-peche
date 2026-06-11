# Sprint 10.5 — Brief d'exécution pour Claude Code
## Refonte UI « Instrument de précision marine » (DA v2)

> Rédigé le 2026-06-11. DA validée par John (`docs/maquette-v2/DA.md` + 9 maquettes HTML).
> Durée cible : **1 semaine**. Un seul objectif : faire ressembler le produit aux maquettes. **Zéro changement de logique.**

### Prompt de lancement (à coller dans Claude Code)

```
Lis docs/sprint-10.5/BRIEF.md et exécute-le. Avant toute chose, applique la
section « Préalables git » — ne commence pas la refonte tant que le sprint 10
n'est pas commité et mergé sur main. Suis l'ordre des phases. Commits atomiques
par phase. Pas de push sans mon accord.
```

---

## Préalables git (BLOQUANT)

L'état constaté le 2026-06-11 : branche `sprint-10` avec des dizaines de fichiers modifiés **non commités**. Donc, dans l'ordre :

1. **Terminer et commiter le sprint 10** sur la branche `sprint-10` (tests verts + build OK exigés avant commit final).
2. **Merger `sprint-10` → `main`** (après QA John si c'est le process en cours).
3. Créer la branche de travail : `git checkout -b sprint-10.5-ui` depuis `main` à jour.
4. Vérifier `git status` propre avant la première modification.

**Interdit** : commencer la refonte dans un working tree qui contient encore du travail sprint 10 non commité. Si c'est le cas, s'arrêter et demander à John.

## Sources de vérité

| Quoi | Où |
|---|---|
| Direction artistique (principes, tokens, composants) | `docs/maquette-v2/DA.md` |
| **Référence produit (mobile-first)** | `docs/maquette-v2/mobile.html` — 5 écrans |
| Onboarding (mobile-first) | `docs/maquette-v2/onboarding.html` — 6 étapes + écran final, validé 2026-06-11 |
| Maquettes desktop | `docs/maquette-v2/*.html` (index, tarifs, espece, carnet, carte, spot, fil, profil) |
| CSS de référence (à transposer, pas copier tel quel) | `docs/maquette-v2/assets/style.css` |

Le CSS des maquettes est du CSS « libre » : il faut le **transposer en Tailwind v4 + shadcn**, pas l'importer. Les valeurs (couleurs, radius, espacements) sont la loi ; la syntaxe non.

## Règles absolues

1. **Aucun changement de logique** : pas de Server Action, RPC, migration, RLS, gating, routing modifiés. Si un changement visuel semble exiger un changement de logique → noter dans `docs/sprint-10.5/QUESTIONS.md` et passer.
2. **Mobile-first** : chaque écran se code en 390 px d'abord. Tap targets ≥ 44 px. Pas de scroll horizontal (sauf chips/instruments). Tester chaque page au viewport mobile AVANT desktop.
3. **Pas de régression** : la suite de tests reste verte, le build passe, Lighthouse Perf/SEO ne baisse pas (mesurer avant/après sur `/`, `/carte`, `/spots/[slug]`).
4. **Un commit par phase** (`feat(ui): phase N — …`), jamais de commit mélangeant deux phases. Pas de push sans validation John.
5. Copy inchangée sauf indication des maquettes. Tutoiement partout, comme toujours.

---

## Phase 1 — Fondations (tokens + fonts) — ~0,5 j

1. `app/globals.css` (Tailwind v4, CSS-first via `@theme`) : ajouter/mettre à jour les tokens DA v2 :
   - `--navy-950:#04141C`, `--navy-800:#0E3D4F`, `--navy-700:#155A73`, `--gold-500:#D9A53C`, `--coral-500:#E5604F`, `--teal-300:#5EEAD4`, `--teal-600:#0E9488`, `--sand-100:#F4EEE0`, `--sand-200:#E8DFCB`, `--ink-600:#44545E`, `--ink-400:#7E8C95`
   - Conserver les tokens v1 existants (navy-900, teal-500, sand-50, ink-900).
   - Sémantique score : `--score-low` (ink-400), `--score-mid` (gold-500), `--score-high` (teal-500).
2. `app/layout.tsx` : ajouter **JetBrains Mono** via `next/font` (subset latin, weights 400/500/600) en plus d'Inter et Space Grotesk. Exposer en variable CSS `--font-mono`.
3. Ombres : 2 niveaux (`shadow-sm` doux, `shadow-lg` flottants). Bordures 1px `sand-200` remplacent les ombres par défaut des cards.

**Critère** : aucune page ne change encore visuellement (tokens ajoutés, rien re-skinné). Build + tests verts. Commit.

## Phase 2 — Composants signature — ~1 j

Créer dans `components/ui-v2/` (puis adoption progressive) :

1. **`<TagData>`** : étiquette mono uppercase 11.5px letterspacing 8% (la signature : `COEF 88`, `PM 06:42`, coords). Variantes : default/teal/gold/coral/on-dark. **Règle : tout chiffre métier passe en mono** — c'est le composant le plus utilisé de la refonte.
2. **`<ScoreRing value>`** : anneau SVG 0-100, couleur sémantique auto (≥75 teal, 50-74 gold, <50 ink-400), tailles sm/md/lg.
3. **`<TideSparkline>`** : courbe de marée SVG compacte avec curseur « maintenant » (coral) + labels PM/BM mono. Réutilisable hero/fiche spot/cards. S'appuyer sur les données marées existantes (Open-Meteo, sprint 9.5) — présentation seulement.
4. **`<InstrumentsBar>`** : bandeau navy-950, une ligne mono : dépt · PM/BM · coef (▲/▼) · vent · créneau perso. Version condensée mobile (scroll horizontal autorisé ici). Données : conditions du `main_department` du profil — réutiliser les fetchs existants, pas de nouvelle API.
5. **`<Bathy>`** : SVG d'isobathes décoratif (3-5 courbes + labels profondeur), props densité/opacité. Utilisé sur heros sombres et footer. Recopier les paths des maquettes.
6. **Re-theme shadcn** : Button (primary navy / accent teal / ghost bordure), Card (bordure fine + variante `live` à liseré teal 3px gauche), Chip/Badge (variantes teal/gold/navy/mono).
7. **Icônes** : remplacer tous les emojis-icônes par Lucide (déjà dans la stack), stroke 1.7.

**Critère** : Storybook non requis — une page dev `/dev/ui-v2` (guard NODE_ENV) qui affiche tous les composants. Commit.

## Phase 3 — App shell mobile — ~1 j

Le cœur mobile-first (référence : `mobile.html`) :

1. **Tab bar mobile** (`components/layout/TabBar.tsx`) : visible < 960 px sur les routes `(app)` — Carnet · Carte · **FAB « + » central teal surélevé** (→ `/carnet/nouvelle`) · Fil · Profil. Safe-area iOS (`env(safe-area-inset-bottom)`). Desktop : sidebar actuelle conservée, re-skinnée (item actif navy plein).
2. **`<InstrumentsBar>` branchée** dans le layout `(app)` , sous le header, sticky. Mobile = version condensée.
3. **Header app** allégé : logo + « + Loguer » + avatar.
4. **Bottom sheets** : la fiche spot ouverte depuis la carte mobile devient un bottom sheet (poignée de drag, snap mi-hauteur/plein) — utiliser `vaul` (compatible shadcn) si pas déjà présent ; seule nouvelle dépendance autorisée du sprint.

**Critère** : navigation app au pouce complète en 390 px, FAB fonctionnel, aucune route cassée. Commit.

## Phase 4 — Écrans app — ~2 j

Dans cet ordre (re-skin, données et actions inchangées) :

1. **Carnet** (`/carnet`) : KPIs en cards mono (prises, record, coef moyen, marée favorite), card insight perso à liseré, rows de prises avec `<TagData>` (date · spot · coef · marée · leurre) + score conditions. Réf : `carnet.html` + `mobile.html` 01.
2. **Carte** (`/carte`) : markers = pastilles score colorées (sémantique), panneau desktop / bottom sheet mobile, chips de filtres, coords + zoom en mono en bas. Réf : `carte.html` + `mobile.html` 02.
3. **Fiche spot** (`/spots/[slug]`) : hero navy-950 + isobathes, double anneau « ton score / score global », `<TideSparkline>` grand format, grille météo 4 cards mono, créneaux 7 j en slots à chips, activité récente en card live. Réf : `spot.html` + `mobile.html` 03.
4. **Fil** (`/fil/[dept]`) : cards posts épurées, badge CARNET sur les posts-catch, bandeau données mono sur la photo, posts alerte à liseré coral, sidebar stats du dépt. Réf : `fil.html` + `mobile.html` 04.
5. **Formulaire prise** (`/carnet/nouvelle`) : flow « 3 taps » — photo d'abord (GPS+conditions auto mis en avant), chips espèces, card live « conditions captées », chips visibilité. Réf : `mobile.html` 05. **Sans toucher à la logique de soumission existante.**
6. **Profil** (`/profil`, `/u/[username]`) : hero navy, barre d'année, badges, stats mono. Réf : `profil.html`.
7. **Onboarding** (`/onboarding/[step]`) : re-skin des 6 étapes — segments de progression (au lieu de la barre `Progress`), labels mono (`ÉTAPE 02/06`, codes dépt + façade, `LVL`, `HEBDO`), cards radio et chips conformes, stepper mono pour les années, aperçu profil live (étape 1) et encart saison (étape 4, statique OK). Réf : `onboarding.html`. **+ écran final « Ton carnet est prêt »** (frame 07) : c'est la SEULE addition de flow autorisée du sprint — après `completeOnboarding`, rediriger vers `/onboarding/fini` (navy-950 + isobathes, récap chips mono, tide sparkline du dépt, CTA « Ouvrir mon carnet » + lien « Loguer ma première prise »). Aucune Server Action ni migration nouvelle : on réutilise `completeOnboarding` et les données profil/marées existantes.

**Critère** : chaque écran validé par John sur capture mobile + desktop avant de passer au suivant (poster les captures dans le récap de phase). Un commit par écran.

## Phase 5 — Pages marketing — ~1 j

1. **Home** (`/`) : hero navy-950 + isobathes + cards data (tide sparkline + créneau perso), sections numérotées 01/02/03, section sombre « scoring perso », section précision mer avec table marées mono, fil d'exemples, pricing teaser. Réf : `index.html`.
2. **Tarifs** (`/tarifs`) : 3 cards dont Local en navy-950 featured + isobathes, prix en mono, mini-FAQ en 3 colonnes. **Attention** : refléter le pivot social gratuit (fil complet dans Découverte — normalement déjà fait au sprint 10 Bloc 0, vérifier).
3. **Guides + fiches espèces + pages programmatiques** (sorties du sprint 10) : appliquer les tokens (typo, `<RegulationBox>` re-skinné gold, encarts live à liseré, sommaire latéral). Réf : `espece.html`.
4. **OG images** (`app/opengraph-image.tsx` + variantes) : aligner sur la DA v2 (navy-950 + isobathes + mono).
5. Footer global : navy-950 + isobathes + colonnes (réf `index.html`).

**Critère** : Lighthouse SEO ≥ 95 maintenu sur les pages refondues, perf sans régression. Un commit par groupe de pages.

## Phase 6 — Vérification finale — ~0,5 j

1. `pnpm lint` + `pnpm typecheck` + `pnpm test` : tout vert.
2. `pnpm build` : OK, temps < 4 min.
3. Lighthouse avant/après sur `/`, `/carte`, `/spots/[slug]` → tableau dans `docs/sprint-10.5/RECAP.md`.
4. Passe responsive : 360, 390, 768, 1280 px sur les 6 écrans app + home + tarifs. Vérifier tap targets ≥ 44 px (audit rapide).
5. Chasse aux résidus : emojis-icônes restants, ombres lourdes, chiffres métier pas en mono (`grep` des patterns coef/PM/BM dans les composants).
6. Rédiger `docs/sprint-10.5/RECAP.md` : fait / captures / restes / questions. Mettre à jour `CLAUDE.md` §6 (DA v2 = charte courante) et `docs/ROADMAP.md`.

## Ce qu'on ne fait PAS dans ce sprint

- ❌ PWA / service worker (sprint 11)
- ❌ Dark mode complet (les tokens le permettent, c'est tout)
- ❌ Nouvelles features, changements de copy marketing non prévus par les maquettes
- ❌ Toucher au schéma DB, aux Server Actions, au RLS, au gating
- ❌ Nouvelles dépendances (sauf `vaul` pour les bottom sheets, et uniquement si nécessaire)

## Critères de sortie du sprint

- Les 6 écrans app + onboarding (6 étapes + écran final) + home + tarifs + guides/espèces conformes aux maquettes, validés par John écran par écran
- Tab bar + FAB + bandeau instruments en prod sur mobile
- Plus un seul emoji-icône, plus un chiffre métier hors mono
- Tests verts, build OK, Lighthouse sans régression (tableau de preuve dans le RECAP)
- Branche `sprint-10.5-ui` prête à merger, **pas pushée sans accord John**
