# Sprint Copy-IA — Brief d'exécution
## « Dé-IA-isation de la copy » (tiret « — » en prose · ~1-2 j)

> Rédigé le 2026-06-26. Durée : 1-2 jours (surtout du volume, peu de risque technique).
> Contexte : audit `docs/audits/AUDIT-COPY-IA-2026-06-26.md`. Diagnostic = la copy est bien écrite (voix d'expert, tutoiement 100 % cohérent, tics IA lexicaux quasi absents) ; le SEUL tic pervasif est le **tiret cadratin « — » en pleine phrase**, surtout la **double incise** (« Ce gadidé — cousin de la morue — vit collé… »). ~557 occurrences en prose / 108 fichiers, dont 327 dans les 26 fiches espèces et 75 dans les 6 guides.
> Décisions John : périmètre = qualité de la copy uniquement. Pas de refonte du fond, juste la ponctuation.

**Préalable avant de démarrer** (manuel John) : rien de bloquant. Part de `main` (= prod). Ce sprint ne touche ni la DB, ni les RLS, ni le gating — **uniquement des chaînes de texte**.

---

## 🚀 Ligne de lancement (à copier-coller par John)

> ultracode — effort xhigh. Exécute `docs/sprint-copy-ia/BRIEF.md`. Lance les workstreams
> A / B / C / D / E **en parallèle dès maintenant** (aucune dépendance entre eux : chacun
> travaille sur des fichiers différents), et termine par le workstream **VERIF** avant de
> me rendre la main. **Ne push pas.** Tout choix ouvert non tranché ici (Tier 2, CGU)
> → `⚠️ DEMANDER À JOHN AVANT`, tu t'arrêtes, tu n'inventes pas. **Aucune regex aveugle :
> on relit chaque chaîne en contexte.**

---

## 🧠 Connecteurs & sous-agents (usage systématique — cf `CLAUDE.md` §20)

> Sprint éditorial : peu de connecteurs DB. L'enjeu est la **QA visuelle** (que la copy corrigée se lise bien et que rien ne casse) + la **vérif build/lint**.

| Quand | Sous-agent → connecteur | Pourquoi |
|---|---|---|
| QA visuelle de la home + 1 fiche espèce + 1 guide après réécriture | **qa-chrome** → Claude in Chrome + Playwright | Vérifier rendu naturel, aucun retour à la ligne cassé, HTML inline des fiches intact. |
| Si doute sur la syntaxe MDX (composants custom dans les guides) | **docs-researcher** → Context7 | Ne pas casser le pipeline MDX (`components/guides/mdx-components.tsx`). |
| Après déploiement (post-merge John) | **deploy-watch** → Vercel | Pages `/especes/*`, `/guides/*`, home build OK. |
| Clôture | **`/verif-sprint`** | `pnpm build` + `pnpm test` + `pnpm lint` + `pnpm typecheck` + revue indépendante. |

> Pas de **supabase-guard** ici (aucune migration). Si un WS pense devoir toucher la DB, c'est qu'il sort du périmètre → stop.

---

## Objectif du sprint en une phrase

À la sortie : **0 tiret « — » en prose visible** sur toutes les surfaces (pages marketing, app, 26 fiches espèces, 6 guides, emails), **sans toucher à un seul usage légitime** (placeholders, `<title>`, commentaires, libellés de données) et **sans changer le fond** d'une seule phrase.

## Workstreams & dépendances

| WS | Surface (lot audit) | Volume | Dépend de | Parallélisable jour 1 |
|----|---------------------|-------:|-----------|----------------------|
| A | Vitrine : home + pages `(marketing)` publiques (Lot 1) | ~73 occ | — | ✅ |
| B | 26 fiches espèces `lib/especes/content/*.ts` (Lot 2) | 327 occ | — | ✅ |
| C | 6 guides `content/guides/*.mdx` (Lot 3) | 75 occ | — | ✅ |
| D | Emails + UI app + autres composants (Lots 4-5) | ~82 occ | — | ✅ |
| E | Garde-fou anti-récidive : règle `CLAUDE.md` + lint warn-only (Lot 0) | — | — | ✅ |
| VERIF | revue finale indépendante | — | A,B,C,D,E | ❌ (toujours en dernier) |

> Aucun WS ne dépend d'un autre (fichiers disjoints) → **tous lançables jour 1 en parallèle**.

---

## 📏 Règles communes à TOUS les workstreams (lire avant de coder)

### Ce qu'on remplace (le tiret « — » selon son rôle)
| Le tiret sert à… | Remplacement | Exemple |
|---|---|---|
| Apposition / incise | virgules, ou parenthèses si secondaire | « Ce gadidé, cousin de la morue, vit… » |
| Introduire explication/liste | deux-points `:` | « il se mérite : 8 à 15 m d'eau, l'aube… » |
| Aside léger en fin de phrase | virgule | « …identique pour tous, tes tendances perso… » |
| Rupture forte | point (2 phrases) | « …apprend ton historique. Et te dit quand sortir. » |

⚠️ **Ne pas tout passer en « : »** — ça crée un nouveau tic. Varier virgule / parenthèses / point / deux-points selon le sens.

### Ce qu'on NE TOUCHE JAMAIS (allow-list)
- Placeholder donnée vide : `'—'`, `"—"`, `<span>—</span>`, `?? '—'`, `: '—'`
- Séparateur de `<title>` : `title: '… — Carnet de Pêche'`
- Commentaires de code : `// … —`, `{/* … — */}`, `/* … */`
- Libellés structurés : `'29 — Finistère'` (filtres dept), `'— 10 m'` (bathy), ranges `10–29`
- Le demi-cadratin « – » dans du code technique (rampes de couleur, plages numériques)

### Lister les candidats (point de départ, PAS vérité — juger en contexte)
```bash
rg -n '—' <fichiers du WS> \
 | rg -v "'—'|\"—\"|>—<|>\{'—'\}<|title:.*Carnet de Pêche|'— [0-9]+ ?m'|'[0-9]{2} —" \
 | rg -v "^\s*[0-9]+:\s*(//|\*|\{/\*|/\*)"
```

### Invariants (cf `CLAUDE.md` §11, §13)
- **Diff = ponctuation uniquement.** Aucun mot supprimé/ajouté sauf liaison strictement nécessaire (ex. ajouter « c'est » en coupant une phrase). Le sens et les faits (mailles, dates, coefficients) restent **identiques au caractère près**.
- Tutoiement préservé (0 fuite « vous » hors légal — c'est déjà le cas, ne pas régresser).
- **Ne pas push.** Montrer le diff par WS.

---

## Bloc A — Vitrine (home + marketing public)

La surface vue en premier par un visiteur. Peu de volume, fort impact.

> **Connecteurs** : **qa-chrome** en fin de bloc — rendre la home et 2 pages marketing, screenshot mobile + desktop, vérifier qu'aucune phrase ne casse en layout.

### Tâches
1. Corriger les tirets en prose dans : `app/(marketing)/page.tsx`, `components/marketing/home-v3/Hero.tsx`, `components/marketing/home-v3/HomeSections.tsx`, `components/marketing/home-v3/HomeMapSection.tsx`, `components/home/home-ui.tsx`, `app/(marketing)/especes/page.tsx`, `app/(marketing)/tarifs/page.tsx`, `app/(marketing)/fil/page.tsx`, `app/(marketing)/spots/page.tsx`, `app/(marketing)/guides/page.tsx`, `app/layout.tsx` (description), `app/opengraph-image.tsx` (baseline + alt, **pas** les labels `'— N m'`), `app/global-error.tsx`.
2. Exemples déjà repérés (audit §3.3) : « tes patterns — marée, marnage, vent, heure — et te dit » → parenthèses ; « instrument de précision — pas comme un lac » → virgule ; « co-pêchage — gratuit, sans pub » → deux-points.

### Critères d'acceptation
- `rg -n '—' app/\(marketing\) components/marketing components/home --glob '!**/__tests__/**'` ne renvoie plus que des cas allow-list (placeholders, `<title>`, commentaires, `'— N m'`, `01 — ` section, libellés dept).
- `pnpm build` vert ; home + `/especes` + `/tarifs` rendent sans erreur (qa-chrome).
- Diff = ponctuation seule.

### Garde-fous
- ⚠️ DEMANDER À JOHN AVANT : les **numéros de section** `<SecNum>01 — Le moat</SecNum>` et le CTA `« Créer mon carnet — gratuit »` (Tier 2 stylistique). Par défaut **on les laisse** dans ce pass.
- Ne pas toucher : `app/og/**` (images OG, données techniques), labels bathy.

## Bloc B — 26 fiches espèces (`lib/especes/content/*.ts`)

Le gros morceau (327 occ) et le cœur SEO. **Voix d'expert à préserver absolument.**

> **Connecteurs** : **qa-chrome** sur 2-3 fiches après coup (`/especes/lieu-jaune`, `/especes/bar`, `/especes/dorade-royale`).

### Tâches
1. Parcourir les 26 fichiers `lib/especes/content/*.ts`. Corriger les tirets en prose dans les champs texte (`intro`, `note`, `why`, `a` des FAQ, descriptions de postes…).
2. **Attention au HTML inline** : certains champs contiennent `<strong>…</strong>` (ex. `<strong>Maille : 42 cm</strong> en Manche — tout lieu jaune…`). Corriger le tiret **sans casser les balises**.
3. Cibler en priorité les **doubles incises** (« Le vif — lançon en tête — présenté… » → parenthèses ou virgules).

### Critères d'acceptation
- `rg -n '—' lib/especes/content` ne renvoie plus que des commentaires d'en-tête de fichier (`* Fiche espèce … —`) — qui sont du commentaire, donc tolérés, ou à corriger aussi par cohérence (au choix, non bloquant).
- `pnpm build` + `pnpm typecheck` verts (les `.ts` doivent rester valides — guillemets/backticks intacts).
- Aucune donnée réglementaire modifiée : `rg 'cm|quota|arrêté|vérifié le' lib/especes/content` identique avant/après (seuls les tirets autour changent).
- 3 fiches rendues OK (qa-chrome), aucun `<strong>` orphelin.

### Garde-fous
- Ne pas toucher aux dates, mailles, quotas, sources, `verified_at`. Ne pas reformuler le fond.

## Bloc C — 6 guides MDX (`content/guides/*.mdx`)

Long-format SEO. Markdown — attention à la syntaxe.

> **Connecteurs** : **docs-researcher** si doute sur un composant MDX custom ; **qa-chrome** sur 1 guide rendu (`/guides/peche-au-bar-au-leurre`).

### Tâches
1. Corriger les tirets en prose dans les 5 guides publiés + `_TEMPLATE.mdx` : `comment-lire-une-courbe-de-maree.mdx` (22), `les-meilleurs-coefficients-pour-pecher-le-bar.mdx` (17), `les-meilleurs-spots-de-peche-en-bretagne.mdx` (12), `peche-a-la-dorade-royale-au-surfcasting.mdx` (11), `peche-au-bar-au-leurre.mdx` (10), `_TEMPLATE.mdx` (3).
2. Ne pas confondre tiret cadratin « — » (à corriger) et tiret de liste markdown `- ` en début de ligne (à garder).

### Critères d'acceptation
- `rg -n '—' content/guides` → 0 (hors éventuel front-matter légitime, à juger).
- `pnpm build` vert ; 1 guide rendu sans erreur MDX (qa-chrome).

### Garde-fous
- Ne pas toucher au front-matter (title/description/slug/dates) sauf tiret en prose dans la `description`.

## Bloc D — Emails + UI app + autres composants

Long traîne (~82 occ), faible visibilité unitaire mais touche les abonnés (emails) et l'app.

> **Connecteurs** : aucun obligatoire. `pnpm build` suffit.

### Tâches
1. **Emails** (`emails/*.tsx`) : `welcome.tsx`, `welcome-trial.tsx`, `trial-day-5.tsx`, `trial-ending-j1.tsx`, `post-trial-winback.tsx`, `subscription-canceled.tsx`.
2. **UI app** (`app/(app)/**`) : `carnet/nouvelle`, `carnet/[id]`, `compte/abonnement/success`, `onboarding/fini`, `onboarding/[step]`, `sorties`, `profil/actions.ts`.
3. **Autres composants** (`components/**` hors marketing/home déjà faits en A) : `map/*`, `spots/*`, `catches/*`, `scoring/*`, `gamification/*`, `solunar/*`, `cofishing/*`, `outings/*`, `regulation/*`, `forms/*`, `feed/*`.

### Critères d'acceptation
- `rg -n '—' app/\(app\) components emails --glob '!**/__tests__/**'` (après A et D) → uniquement allow-list.
- `pnpm build` + `pnpm test` verts.

### Garde-fous
- Ne pas toucher aux fichiers de test (`__tests__`, `*.test.ts`) — les `describe('… —')` y sont du libellé technique.
- Ne pas toucher aux flèches « → » et coches « ✓ » (Tier 2, hors périmètre).

## Bloc E — Garde-fou anti-récidive

Pour que le tic ne revienne pas au prochain contenu généré.

> **Connecteurs** : aucun. Édition de doc + petit script.

### Tâches
1. Ajouter dans `CLAUDE.md` (§6 Conventions, sous « Style UI » ou « Conventions ») la règle : **« Jamais de tiret cadratin « — » dans une chaîne de copy visible. Exceptions : placeholder de donnée vide `'—'` et séparateur de `<title>`. Sinon : virgule / parenthèses / deux-points / point. »**
2. Étendre le hook `lint-changed` (`.claude/hooks/`, cf `CLAUDE.md` §20.4) **OU** ajouter `scripts/lint-copy-dashes.mjs` : signale (warn, **non bloquant**) tout « — » dans une chaîne JSX/template hors allow-list, sur les fichiers modifiés.

### Critères d'acceptation
- La règle figure dans `CLAUDE.md`.
- Le script tourne et liste 0 violation une fois A-D terminés (`node scripts/lint-copy-dashes.mjs`).

### Garde-fous
- ⚠️ DEMANDER À JOHN AVANT de rendre le lint **bloquant** (par défaut : warn-only).

---

## Workstream VERIF (obligatoire, agent indépendant)

1. Lancer **`/verif-sprint`** : `pnpm test` + `pnpm build` + `pnpm typecheck` + `pnpm lint` + revue croisée par un agent qui n'a pas écrit les corrections.
2. **Compte global** : `rg -n '—' app components emails lib/especes/content content/guides --glob '!**/__tests__/**'` → toute occurrence restante doit être justifiable par l'allow-list (placeholder, `<title>`, commentaire, libellé dept, label bathy, Tier 2 laissé exprès). Lister les restantes avec leur justification.
3. **Anti-régression « on n'a pas cassé le légitime »** : vérifier que les placeholders `'—'`, séparateurs `<title>` et libellés `'NN — Dépt'` sont **toujours présents** (count avant/après stable).
4. **Tutoiement** : `rg -nE '\b(vous|votre|vos)\b' app components emails content/guides lib/especes/content` hors pages légales → toujours 0.
5. **Sens préservé** : revue de diff — uniquement de la ponctuation, aucun fait métier (maille, date, quota, coef) altéré.
6. **Rendu réel** (qa-chrome) : home + 1 fiche espèce + 1 guide + 1 email (preview) se lisent naturellement, aucun layout cassé, aucun `<strong>`/balise MDX orpheline.
7. Livrer `docs/sprint-copy-ia/RECAP.md` : compte avant/après par surface, fichiers touchés, ce qui reste en Tier 2 pour arbitrage John, comment tester.

---

## Reste manuel John (post-sprint)

- Relire le diff (gros volume sur les fiches espèces — un coup d'œil sur 2-3 suffit, le reste est mécanique).
- Arbitrer les **Tier 2** listés au RECAP : numéros de section `01 — `, CTA `« — gratuit »`, libellés dept `29 — Finistère` (les passer en `·` façon DA « Manche · Atlantique » ? ou garder), flèches « → », et la **CGU** (texte légal — laissée intacte par défaut).
- Trancher si le lint anti-tiret devient **bloquant**.
- `git commit` + `push` + déploiement (auto Vercel) quand validé.
