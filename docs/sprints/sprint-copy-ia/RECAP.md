# Sprint Copy-IA — RECAP

> Exécuté le 2026-06-26. Objectif : retirer le **tiret cadratin « — »** de la copy visible en prose, en contexte (zéro regex aveugle), **sans toucher au fond** (ni un mot, ni un chiffre, ni une balise). **Non poussé** — branche `main` locale, en attente de relecture + commit/push John.

## Verdict

**Sprint propre.** ~**475 tirets cadratin retirés de la prose** sur **90 fichiers** (diff = **453 insertions / 452 suppressions** → ponctuation pure). **0 changement de sens** signalé. Revue indépendante : **3 défauts seulement**, tous corrigés. Tous les garde-fous tiennent (placeholders, `<title>`, libellés data, balises HTML/MDX, tutoiement).

### Méthode
- Orchestration multi-agents (`ultracode`) : **94 agents** — 1 par fiche espèce / guide / email / page vitrine, 1 par lot de composants app, puis **1 agent de revue indépendant** (n'a pas écrit les corrections).
- Chaque tiret **relu en contexte** et remplacé selon son rôle : virgule (incise/aside), parenthèses (apposition secondaire), deux-points (explication/liste), point (rupture forte). Variation volontaire — pas de nouveau tic « tout en : ».
- Édition **ciblée** (jamais de réécriture de fichier), tags `<strong>`/MDX et littéraux préservés.

## Compte avant → après (em-dash en prose)

| Surface (WS) | Avant | Corrigés | Restant en prose |
|---|---:|---:|---:|
| A · Vitrine (home + marketing + app-root) | ~95 | ~47 | 0 (hors Tier 2) |
| B · 26 fiches espèces (`lib/especes/content`) | ~290 | ~290 | 0 (hors `famille:` = libellé) |
| C · 6 guides MDX (`content/guides`) | 92 | ~84 | 0 (hors titres de spots) |
| D · Emails + UI app + composants | ~110 | ~54 | 0 (hors libellés/logs/placeholders) |
| **Total** | — | **~475** | **0 prose** |

> Les « restants » globaux (~31 au linter, ~500 au grep brut) sont **tous légitimes** : commentaires de code (~205), séparateurs de `<title>`/OG (~55), libellés département `'NN — Dépt'` (~24), placeholders d'absence de valeur `'—'` (~38), labels bathy `'— N m'` (~12), + les **Tier 2 laissés exprès** (voir ci-dessous). Aucune prose oubliée.

## WS E — Garde-fou anti-récidive (livré)
- **`CLAUDE.md` §6** : règle ajoutée — « jamais de tiret cadratin « — » dans une chaîne de copy visible » + exceptions + pointeur lint.
- **`scripts/lint-copy-dashes.mjs`** : linter dépendance-zéro, **warn-only** (exit 0, décision John), scanner de commentaires propre (gère `//`, `/* */`, `{/* */}`, JSDoc). Usage : `node scripts/lint-copy-dashes.mjs` (tout le repo) ou `… <fichiers>` (hook). Exclut tests / légal / `app/og` / `app/dev`.

## Revue indépendante — 3 défauts trouvés, tous corrigés
1. `components/especes/species-score.tsx:43` — vraie prose oubliée → coupée en 2 phrases.
2. `app/(marketing)/tarifs/page.tsx:94` — **fuite de vouvoiement préexistante** (« Vous couvrez toute la France ? ») → tutoiement (`Tu couvres…`), applique la règle verrouillée n°8 « Pas de 'vous' ». *(Hors périmètre ponctuation strict, mais c'est une règle produit verrouillée — flaggé ici en transparence.)*
3. `components/especes/species-score.tsx:129` — « — Itinérant » → **Tier 2** (CTA + nom de plan, même schéma que « — gratuit ») → laissé, voir ci-dessous.

### Corrections d'arbitrage supplémentaires (prose dans des champs de données espèces)
Champs `source:` / `habitat:` / `regime:` de plusieurs fiches contenaient encore de la prose explicative avec « — » (ex. « Arrêté … — l'espèce n'y figure pas », « … en banc — digues, enrochements »). Corrigés en `:` / `,` / `()` **sans toucher aux faits** (dates, n° d'arrêté, mailles, noms d'espèces identiques) : `calmar`, `barracuda`, `liche`, `oblade`, `tacaud`, `vieille`, `maigre`, `marbre`, `tassergal`, + guide bar (`Sécurité — à lire deux fois` → `,`) + email `subscription-canceled` (preview).

## ⚠️ Tier 2 — laissés intacts par défaut, à arbitrer (John)
Le brief dit « par défaut on les laisse dans ce pass ». Aucun n'a été modifié. À trancher si tu veux les passer (souvent en `·` façon DA, ou `:` / `()`) :

| Catégorie | Où | Exemple |
|---|---|---|
| Numéros de section home | `HomeSections.tsx`, `HomeMapSection.tsx` | `01 — Le moat`, `02 — La carte`, `03 — La communauté`, `04 — La précision se paie` |
| CTA « — gratuit » | `MarketingCTA.tsx`, `Hero.tsx`, `HomeSections.tsx` | « Créer mon carnet — gratuit » |
| CTA « — Itinérant » | `components/especes/species-score.tsx:129` | « Ajoute ton historique perso au score — Itinérant » |
| Libellés taxonomie `famille:` | `bar`, `calmar`, `maigre`, `marbre`, `tassergal` | « Moronidés — Dicentrarchus labrax » |
| Séparateurs dept `code — label` | `spot-filters.tsx`, `MapFilters.tsx`, `OutingForm.tsx`, `OutingComposer.tsx`, `spots/page.tsx` | « 29 — Finistère » |
| Titres de spots (guide) | `les-meilleurs-spots-de-peche-en-bretagne.mdx` | `### Pointe du Raz — Finistère (29)` |
| OG alt marque—slogan | `app/opengraph-image.tsx`, `especes/[slug]/opengraph-image.tsx` | « Carnet de Pêche — Logue. Partage. Progresse. » |
| **CGU / pages légales** | `app/(marketing)/legal/*` | « Article N — … » → **laissé intact par décision** (vouvoiement légal assumé) |

## Vérification (gates)
- `✓ next build` : **Compiled successfully in 92s** (compile webpack de toutes les routes/MDX/TSX OK). Le `next build` sort ensuite en code 1 sur **2 causes environnementales, pas le sprint** : (1) fichier **untracked `scripts/_seedtest.ts`** (imports `.ts`, préexistant, hors repo) ; (2) `PageNotFoundError /_document` à « Collecting page data » = **collision `.next`** entre le `next dev` actif (port 3000) et `next build`. → pour un build formel vert : `pnpm build` **dev arrêté**.
- `tsc --noEmit` : 0 erreur sur les fichiers du sprint (seules les 2 erreurs préexistantes du stray `_seedtest.ts`).
- `next lint` : **0 warning / 0 erreur**.
- `vitest` : **568/568** (l'unique échec initial = timeout 5s sous charge concurrente build+lint+test ; repassé **29/29 isolé**).
- Rendu réel (dev :3000) : `/especes/bar`, `/guides/peche-au-bar-au-leurre`, `/tarifs` → **HTTP 200**, balises `<strong>` **équilibrées** (6/6, 79/79), fix tutoiement live confirmé.
- Diff : **90 fichiers, 453 insertions / 452 suppressions**, `meaningFlags = 0`.

## Reste manuel John
1. Relire le diff (un coup d'œil sur 2-3 fiches espèces suffit, le reste est mécanique).
2. Arbitrer le **Tier 2** ci-dessus (numéros de section, CTA « — gratuit »/« — Itinérant », `famille:`, séparateurs dept, titres de spots, OG alt, CGU).
3. Confirmer la **correction tutoiement** `/tarifs` (règle n°8) — ou revert si tu la veux hors de ce pass.
4. Trancher si le lint anti-tiret devient **bloquant** (défaut : warn-only).
5. `pnpm build` avec le dev arrêté pour le build formel vert, puis `git commit` + `push` (auto-deploy Vercel).
6. Nettoyer le stray `scripts/_seedtest.ts` (untracked, casse `tsc`/`build` — pas lié à ce sprint).
