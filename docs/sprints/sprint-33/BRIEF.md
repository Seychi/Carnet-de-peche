# Sprint 33 — Brief d'exécution
## Phase 1 + 2 — « Polish + Pôle Guides (lot 1) »

> Rédigé le 2026-06-25. Durée cible : ~1 semaine.
> Contexte : `docs/ROADMAP-PRE-REFONTE-2026-06-25.md` (Phase 1 = polish ; Phase 2 = guides 5 → 20). Fait suite à `docs/sprint-31/BRIEF.md` (Phase 0). Refonte marketing = Phase 3, **toujours différée** (décision John).
> Constat sprint : l'**infra guides est déjà solide** (`content/guides/_TEMPLATE.mdx` riche : `cover_image`, `related`, `howto`, `verified_at` ; `app/(marketing)/guides/[slug]/page.tsx` a déjà JSON-LD Article + BreadcrumbList + fallback cover navy/isobathes). Le vrai manque de Phase 2 est donc le **contenu** (5 guides / 20) + quelques finitions de pipeline. Ce sprint fait le **polish Phase 1** + **lance le lot 1 de guides** + branche `/techniques`.

**Préalable avant de démarrer (manuel John)** : trancher les 2 décisions du Bloc C (liste/volume du lot de guides ; rédaction par Claude Code vs César). Le reste démarre sans préalable. Aucune migration prévue.

---

## 🚀 Ligne de lancement (à copier-coller par John)

> ultracode — effort xhigh. Exécute `docs/sprint-33/BRIEF.md`. Lance les workstreams A et B en parallèle dès maintenant ; démarre C (rédaction guides) une fois que j'ai tranché les 2 décisions du Bloc C. Termine par le workstream VERIF avant de me rendre la main. Ne push pas.

---

## 🧠 Connecteurs & sous-agents (usage systématique — cf `CLAUDE.md` §20)

| Quand | Sous-agent → connecteur | Pourquoi |
|---|---|---|
| Réglementation à jour (mailles/quotas) pour les guides | **docs-researcher** → Context7 + WebSearch | Sourcer + dater (`verified_at`) ; ne pas inventer une maille. |
| Composants carte/MDX/Next (SpotMiniMap, MDX, metadata) | **docs-researcher** → Context7 | API version-correcte. |
| QA des écrans (cards guides, fiche spot, /techniques, notif) | **qa-chrome** → Claude in Chrome + Playwright | Captures, console, rendu des covers, INP. |
| Après déploiement | **deploy-watch** → Vercel + Sentry | Zéro régression runtime. |
| Clôture | **`/verif-sprint`** | Tests + build + lint + types + revue indépendante + anti-régression. |

> Pas de DB ce sprint (aucune migration). Si un besoin schéma émerge → **supabase-guard** d'abord, fichier numéroté ensuite.

---

## Objectif du sprint en une phrase

Clore la petite dette UX (Phase 1) et **faire passer les guides de 5 à ~9-10** (lot 1) avec des covers distinctives et `/techniques` enfin branché — pour muscler le pilier éditorial le plus faible.

## Workstreams & dépendances

| WS | Bloc(s) | Findings / objet | Durée | Dépend de | Parallèle J1 |
|----|---------|------------------|-------|-----------|--------------|
| A | Bloc A — Polish & hygiène | F10, F11, F12 | S | — | ✅ |
| B | Bloc B — Pipeline guides | F9b + covers + maillage + /techniques | M | — | ✅ |
| C | Bloc C — Guides lot 1 (rédaction) | Phase 2 contenu | M | ⚠️ décision John + Bloc B (covers) | ⛔ (après décision) |
| VERIF | revue finale | — | 0,5 j | tous | ❌ (en dernier) |

---

## Bloc A — Polish & hygiène  *(F10, F11, F12)*

Trois correctifs courts et indépendants.

> **Connecteurs** : qa-chrome pour valider notif + fiche spot. docs-researcher si besoin (MapLibre resize).

### Tâches
1. **F10 — copy notif co-pêchage** : `app/(app)/notifications/page.tsx` tombe dans le générique `${who} a interagi avec toi` (l.37) pour les événements de co-pêchage. Ajouter des cas explicites selon le type d'event (cf `lib/cofishing/actions.ts`) : « a demandé à rejoindre ta sortie », « a rejoint ta sortie », « a accepté ta demande »… avec icône adaptée.
2. **F11 — spinner mini-carte fiche spot** : `components/spots/SpotMiniMap.tsx` reste en spinner « CARTE » au 1er paint. Ajouter `map.resize()` au `load` (cf fix MapView historique), précharger/whenIdle, et remplacer le spinner par `components/map/MapSkeleton.tsx` (ou un skeleton ciblé). Utilisée par `app/(marketing)/spots/[slug]/page.tsx`.
3. **F12 — hygiène `CLAUDE.md`** : resynchroniser la synthèse §2 (dit encore « 6 espèces / sprint 21 » ; réel = **26 espèces**, **sprint 30-32**, migration **049**, nav reliée, social gratuit). Mettre à jour la date de dernière maj.
   - ✅ **FAIT (2026-06-26, dans le cadre de l'audit transverse + vérifié au sprint 35 / WS D).** `CLAUDE.md` resynchronisé : §2 état réel ~sprint 34 (58 migrations, ~540 tests, 26 espèces), §4 stack mobile/monorepo « non démarré » + versions réelles, §7 `current_tier` remplace `has_active_subscription`, §8 floutage ~500-900 m + verrou colonne, §9 chantiers A-G livrés + gate mobile, footer daté. Annexe généalogique conservée. Plus aucune contradiction avec `docs/audits/AUDIT-2026-06-26.md`.

### Critères d'acceptation
- Notif de co-pêchage affiche un libellé **spécifique** (plus de « a interagi avec toi » générique) — vérifié qa-chrome sur `/notifications`.
- Fiche spot : la mini-carte rend **sans spinner persistant** (skeleton propre puis carte) — vérifié qa-chrome desktop + mobile.
- `CLAUDE.md` §2 reflète l'état réel (26 espèces, sprint courant, migration 049).

### Garde-fous
- Ne pas régresser la carte principale (`/carte`) en touchant au resize.

---

## Bloc B — Pipeline guides : covers, maillage, /techniques  *(F9b + Phase 2 infra)*

L'infra existe ; on la finit. Aujourd'hui les cards de guides sans `cover_image` tombent sur un fallback **identique** (navy + isobathes + glyphe poisson) → répétitif (constat audit 1). Et `/techniques` est un stub « Bientôt » alors que des guides techniques existent/arrivent.

> **Connecteurs** : docs-researcher (génération SVG cover, MDX). qa-chrome pour le rendu des cards + /techniques.

### Tâches
1. **F9b — covers distinctives** : rendre le fallback de cover **spécifique** (par `category` / `species` / `technique`) au lieu d'un visuel unique — réutiliser `components/especes/SpeciesArt.tsx` ou décliner couleur/motif selon la catégorie. Localiser le fallback (rendu des cards dans `app/(marketing)/guides/page.tsx` + cover dans `app/(marketing)/guides/[slug]/page.tsx`).
2. **Maillage interne** : vérifier que le champ `related` (sidebar « Lire aussi ») fonctionne, et ajouter les liens croisés **guide ↔ fiche espèce** (`/especes/<slug>`) et **guide ↔ spots** quand `species`/`department` sont renseignés. C'est un levier SEO clé (cf `CLAUDE.md` Fishing Grid).
3. **`/techniques`** : `app/(marketing)/techniques/page.tsx` — dès qu'un guide `technique` existe, lister les guides techniques disponibles (et retirer la promesse « bientôt » pour ceux livrés). Si le lot 1 n'est pas encore mergé, garder le stub mais préparer le composant de liste.
4. Vérifier `lib/guides/loader.ts` : `howto` → JSON-LD HowTo, temps de lecture, tri par `published_at`.

### Critères d'acceptation
- Deux guides de catégories différentes affichent des covers **visuellement distinctes** (plus de fallback unique) — capture qa-chrome `/guides`.
- Un guide avec `species: Bar` linke vers `/especes/bar` (et réciproquement si pertinent) ; `related` rend la sidebar « Lire aussi ».
- `/techniques` liste les guides techniques publiés (ou composant prêt si lot 1 pas encore mergé).
- `pnpm build` OK (sitemap inclut déjà les guides).

### Garde-fous
- Ne pas casser les 5 guides existants ni leur SEO (JSON-LD, canonical).

---

## Bloc C — Guides lot 1 (rédaction)  *(Phase 2 — contenu)*  — **après décision John**

Le pilier le plus faible = 5 guides / 20. `/techniques` promet 4 piliers techniques (leurres, surfcasting, flottante, vif) — aujourd'hui seuls des guides espèce-spécifiques existent (`peche-au-bar-au-leurre`, `peche-a-la-dorade-royale-au-surfcasting`).

> **Connecteurs** : **docs-researcher + WebSearch** pour toute maille/quota/réglementation → **sourcer et dater** (`verified_at`). Suivre `content/guides/_TEMPLATE.mdx` à la lettre.

### ⚠️ DEMANDER À JOHN AVANT
- **Périmètre du lot 1** : je propose **4 guides piliers techniques** — « La pêche aux leurres en mer du bord », « Le surfcasting du bord », « La pêche à la flottante (bord de mer) », « La pêche au vif/posé ». OK ? Ajouts/retraits ? Volume (4 ? 6 ?).
- **Qui rédige** : Claude Code **drafte** (sourcé, `draft: true`, pour ta/César revue), **ou** on réserve la rédaction à César et ce sprint ne livre que le pipeline (Bloc B) + 1 guide-pilote ?

### Tâches (si rédaction par Claude Code validée)
1. Pour chaque guide du lot : créer `content/guides/<slug>.mdx` depuis `_TEMPLATE.mdx` — frontmatter complet (`title` SEO 60-70c, `excerpt`, `category: Technique`, `technique`, `related` 1-3, `howto: true` si pas-à-pas, `verified_at` si réglementation), 1500-2500 mots, voix pêcheur tutoiement, **réglementation sourcée et datée**.
2. `related` croisés entre les nouveaux guides et les guides/fiches espèces existants.
3. Laisser `draft: true` → John/César valide avant `draft: false`.

### Critères d'acceptation
- N guides `.mdx` créés (N = décision John), conformes au template, **build OK**, visibles en preview `/guides/<slug>` (même en `draft` via route de preview si dispo).
- Toute donnée réglementaire porte une **source + `verified_at`**.
- `/techniques` peut basculer en index réel (Bloc B) une fois ces guides en `draft: false`.

### Garde-fous
- ⚠️ Ne PAS publier (`draft: false`) sans revue humaine — risque de conseil/réglementation faux.
- Pas de copie d'un concurrent ; contenu original.

---

## Workstream VERIF (obligatoire, agent indépendant)

1. **`/verif-sprint`** : `pnpm test` + `pnpm build` + `pnpm typecheck` + `pnpm lint` + revue croisée + anti-régression. Puis **deploy-watch** après déploiement.
2. Relire chaque critère d'acceptation des blocs A→C, cocher ✅/❌ avec preuve (URL, capture, commande).
3. Passe SEO : guides existants intacts (JSON-LD, canonical, sitemap) ; nouvelles covers n'alourdissent pas le LCP.
4. Passe copy FR : tutoiement, zod en français, **aucune promesse mensongère** ; guides en `draft: true` tant que non revus ; réglementation **sourcée + datée**.
5. Livrer `docs/sprint-33/RECAP.md` : fait / comment tester / reste manuel John (revue + passage `draft: false`).

## Reste manuel John (post-sprint)

- Trancher les 2 décisions du Bloc C (périmètre lot 1 ; rédaction Claude Code vs César).
- Relire les guides draftés → passer `draft: false` au compte-gouttes.
- Relire → merge `sprint-33` → `main` → déploiement → QA.
