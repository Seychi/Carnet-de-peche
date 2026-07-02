# Sprint 31 — Brief d'exécution
## Phase 0 — « Socle avant la refonte » (remédiation audits 2026-06-25)

> Rédigé le 2026-06-25. Durée cible : ~1 semaine (4-6 j).
> Contexte : `docs/audits/AUDIT-2026-06-25-fonctionnel-seo.md` (audit 1), `docs/audits/AUDIT-2026-06-25-profond.md` (audit 2), `docs/ROADMAP-PRE-REFONTE-2026-06-25.md` (ce sprint = **Phase 0**).
> Décision John 2026-06-25 : **refonte marketing reportée (Phase 3)**. Ce sprint rend **vraies les promesses produit** (perso, 26 espèces) et corrige les **bugs que la future page héritera** (article département, a11y, INP, meta), avant d'amplifier le funnel.

**Préalable avant de démarrer (manuel John)** : fournir / connecter un **compte Découverte SANS essai en cours** pour le workstream F (QA gratuit). Tous les autres workstreams démarrent **sans préalable**. Aucune migration prévue — sauf si Bloc C révèle que `catches.species` n'accepte pas déjà les 26 dbKeys (à vérifier via supabase-guard).

---

## 🚀 Ligne de lancement (à copier-coller par John)

> ultracode — effort xhigh. Exécute `docs/sprint-31/BRIEF.md`. Lance les workstreams A/B/C/D/E en parallèle dès maintenant, respecte les dépendances du tableau, et termine par le workstream VERIF avant de me rendre la main. Le workstream F (QA gratuit) démarre quand je t'ai connecté le compte Découverte. Ne push pas.

---

## 🧠 Connecteurs & sous-agents (usage systématique — cf `CLAUDE.md` §20)

| Quand | Sous-agent → connecteur | Pourquoi |
|---|---|---|
| Avant de toucher Radix Dialog, react-hook-form, Next metadata, web-vitals/INP | **docs-researcher** → Context7 | API version-correcte (Radix `DialogTitle`/`VisuallyHidden`, `useTransition`). |
| Vérifier que `catches.species` accepte les 26 dbKeys (enum/contrainte) | **supabase-guard** → Supabase (RO) | Savoir si Bloc C nécessite une migration. `get_advisors` aussi. |
| QA des écrans (gratuit, a11y console, INP) | **qa-chrome** → Claude in Chrome + Playwright | Captures, console (warnings Radix), mesure INP, gating gratuit. |
| Après déploiement | **deploy-watch** → Vercel + Sentry | Zéro régression runtime. |
| Clôture | **`/verif-sprint`** | Tests + build + lint + types + revue indépendante + anti-régression. |

---

## Objectif du sprint en une phrase

Rendre vraies les promesses (perso « Exemple », 26 espèces loguables) et corriger les bugs hérités (article département, modale a11y, INP composer, meta /techniques) pour qu'une future page marketing amplifie un **funnel sain** — et vérifier enfin le **parcours gratuit**.

## Workstreams & dépendances

| WS | Bloc(s) | Finding | Durée | Dépend de | Parallèle J1 |
|----|---------|---------|-------|-----------|--------------|
| A | Bloc A — Honnêteté perso | F2 | S | — | ✅ |
| B | Bloc B — Article département | F4 | S/M | — | ✅ |
| C | Bloc C — Carnet 6 → 26 espèces | F3 | M | ⚠️ décision John (UX) | ✅ (démarre par la décision) |
| D | Bloc D — Petits fixes (a11y + submit + meta) | F5, F7, F8 | S | — | ✅ |
| E | Bloc E — INP composer fil | F6 | M | — | ✅ |
| F | Bloc F — QA parcours gratuit | F1 | M | compte Découverte (John) | ✅ (QA, parallèle) |
| VERIF | revue finale | — | 0,5 j | tous | ❌ (toujours en dernier) |

---

## Bloc A — Honnêteté du « perso » sur le marketing  *(F2)*

Le score perso **prédictif** est neutralisé (le réel = solunaire générique). Or la home affiche un widget « 87 · TON CRÉNEAU · Calculé sur tes derniers bars · ⚡ Perso » et des mockups (« Ton année », « RECORD PERSO », « Ton plus beau bar ») **sans label « Exemple »** → sur-promesse. Ne PAS retoucher le scoring réel ni les fiches spots (déjà honnêtes).

> **Connecteurs** : docs-researcher si besoin (composant). qa-chrome pour vérifier le rendu après fix.

### Tâches
1. Dans `app/(marketing)/page.tsx` : localiser la carte hero « perso » (texte « Calculé sur tes derniers bars », badge « ⚡ Perso »). Soit la marquer **« Exemple »** visiblement, soit requalifier le badge (« ⚡ Perso — bientôt » / copy au conditionnel) tant que le perso prédictif n'est pas livré.
2. Dans `components/marketing/home-visuals.tsx` : les mockups (« RECORD PERSO » l.142, graphe « Ton année », « Ton plus beau bar ») reçoivent un marqueur **« Exemple »** discret mais lisible.
3. Vérifier qu'aucune autre surface marketing (`components/home/TodayPersonalOverlay.tsx` si utilisé hors app) ne présente de donnée perso fictive comme réelle.

### Critères d'acceptation
- Sur `/` (déconnecté), **chaque** visuel qui implique une donnée perso réelle porte un marqueur « Exemple » OU une copy au conditionnel — vérifié par capture qa-chrome desktop + mobile.
- Le badge « ⚡ Perso » du hero n'affirme plus un calcul perso réel.
- Aucune régression visuelle sur le reste du hero (DA v2 intacte).

### Garde-fous
- Ne pas toucher au scoring réel (`components/map/ScorePanel.tsx`, fiches spots) — déjà honnête.
- Tutoiement, DA v2.

---

## Bloc B — Article de département centralisé  *(F4)*

Bug systémique : `app/(app)/fil/[department]/page.tsx:30` génère « Fil **du** ${name} » et `app/(app)/sorties/page.tsx:52` « dans **le** ${name} » → faux pour les pluriels (« des » Alpes-Maritimes, Côtes-d'Armor…) et élisions (« de l' / dans l' » Hérault, Aude, Eure).

> **Connecteurs** : docs-researcher (Next metadata) si besoin. Pas de DB.

### Tâches
1. Ajouter dans `lib/geo/departments.ts` une fonction pure `departmentArticle(code, prep)` où `prep ∈ {'de','dans'}`, renvoyant l'article correct collé au nom (« de la Corse-du-Sud », « des Alpes-Maritimes », « de l'Hérault » / « dans la Corse-du-Sud », « dans les Alpes-Maritimes », « dans l'Hérault »). S'appuyer sur `DEPARTMENT_LABELS` + une table genre/nombre/élision par département (24 côtiers).
2. Remplacer les interpolations fautives : `app/(app)/fil/[department]/page.tsx:30` (titre + toute autre meta), `app/(app)/sorties/page.tsx:52` et `:70`. Grep le reste du repo (`du ${`, `dans le ${`, `de ${DEPARTMENT`) pour les autres occurrences.
3. Tests unitaires dans `lib/geo/__tests__/departments.test.ts` : couvrir un cas masculin (« du Finistère »), un pluriel (« des Alpes-Maritimes »), une élision (« de l'Hérault »), une Corse (« de la Corse-du-Sud / de la Haute-Corse »).

### Critères d'acceptation
- `<title>` `/fil/06` = « Fil **des** Alpes-Maritimes (06) … » ; `/fil/2A` = « … **de la** Corse-du-Sud … » ; `/fil/34` = « … **de l'**Hérault … » — vérifié qa-chrome (titre d'onglet).
- Sous-titre `/sorties` cohérent (« dans les Alpes-Maritimes », « dans l'Hérault »).
- `pnpm test` : nouveaux cas verts.

### Garde-fous
- Fonction **pure et testée** (pas de logique dispersée). Ne pas casser les libellés existants corrects.

---

## Bloc C — Carnet : 6 → 26 espèces loguables  *(F3)*

`components/catches/CatchForm.tsx:25` a un tableau **`const SPECIES = [...]` codé en dur (6 espèces)** rendu l.475. Or `lib/seo/programmatic.ts` marque **`inCarnet: true` pour les 26** (source unique). Conséquence : on a une fiche profonde « seiche / congre / mulet… » mais on ne peut pas la loguer.

> **Connecteurs** : **supabase-guard** d'abord — vérifier si `catches.species` est un **enum Postgres** ou une **contrainte CHECK**, et s'il accepte déjà les 26 `dbKey`. Si NON → migration numérotée requise (`supabase/migrations/0NN_*.sql`) + regen `lib/types.ts`. docs-researcher pour le pattern combobox si recherche.

### ⚠️ DEMANDER À JOHN AVANT
- **UX du sélecteur** : (a) **les 26 dans un combobox avec recherche** (recommandé — 26 vignettes en grille, c'est lourd), ou (b) garder **6 quick-picks + un champ « autre espèce » déroulant** vers les 20 restantes ? L'agent s'arrête sur ce choix avant de coder l'UI.
- **Onboarding** (`app/(app)/onboarding/[step]/onboarding-step.tsx`) : on garde les **6 espèces favorites** à l'onboarding (décision 2026-06-11) ou on l'aligne aussi sur 26 ? (par défaut : **on garde 6 à l'onboarding**, on n'étend que le carnet.)

### Tâches
1. Remplacer le `SPECIES` codé en dur de `CatchForm.tsx` par une liste **dérivée du référentiel** (`lib/seo/programmatic.ts` → `SPECIES` filtré `inCarnet === true`, avec `{ value: dbKey, label }`). Une seule source de vérité.
2. Vérifier/étendre `lib/catches/schema.ts` (`catchSpeciesEnum`) pour accepter les 26 `dbKey` (il dérive déjà de `CARNET_SPECIES_DB_KEYS` — confirmer).
3. Implémenter l'UI choisie (cf décision John). Maille façade-aware (l.224) : vérifier qu'elle gère les espèces ajoutées (sinon `null` = pas de maille, déjà géré).
4. Mettre à jour les tests (`lib/seo/__tests__/species-referential.test.ts` + tests form si présents).

### Critères d'acceptation
- Sur `/carnet/nouvelle`, on peut sélectionner **seiche, mulet, congre** (et les autres `inCarnet`) et **loguer** une prise — vérifié qa-chrome (création d'une prise de test seiche → visible au carnet → supprimée).
- La liste du form == espèces `inCarnet` du référentiel (aucune liste parallèle codée en dur).
- `catches.species` accepte les 26 (confirmé supabase-guard) ; `lib/types.ts` régénéré si migration.
- `pnpm test` vert.

### Garde-fous
- Une seule source d'espèces (le référentiel). Ne pas réintroduire de liste dupliquée.
- Si migration : RLS/policies inchangées, fichier numéroté, jamais de SQL destructif.

---

## Bloc D — Petits fixes : a11y modale + feedback submit + meta techniques  *(F5, F7, F8)*

Trois correctifs courts et indépendants.

> **Connecteurs** : docs-researcher (Radix `DialogTitle` + `VisuallyHidden`). qa-chrome pour valider la console (zéro warning Radix) et le comportement submit.

### Tâches
1. **F5 — a11y `DialogTitle`** : ajouter un `<DialogTitle>` (masqué via `VisuallyHidden` si non désiré visuellement) à **chaque** `DialogContent`. Cibles connues : `components/feed/PostDeleteDialog.tsx`, `components/catches/CatchDeleteDialog.tsx`, `components/feed/ReportDialog.tsx`. **Grep tout le repo** (`DialogContent`) pour les autres.
2. **F7 — feedback submit prise** : dans `components/catches/CatchForm.tsx`, au submit invalide, **scroller vers le 1er champ en erreur** (Espèce) + afficher un **toast** (« Choisis une espèce / une technique / un lieu »). Aujourd'hui le clic sur le CTA collant ne donne aucun retour visible.
3. **F8 — meta /techniques** : `app/(marketing)/techniques/page.tsx:9-10` — la description promet « Inscris-toi pour être notifié » alors que la page n'a pas de capture email (CTA = « Créer mon carnet »). Aligner : reformuler la meta sur le carnet, **OU** (⚠️ DEMANDER À JOHN) ajouter une vraie capture email.

### Critères d'acceptation
- Ouvrir n'importe quelle modale (suppr post, suppr prise, signalement) → **aucun warning** « DialogContent requires a DialogTitle » en console (vérifié qa-chrome).
- Submit d'une prise incomplète → l'utilisateur **voit** pourquoi (scroll + toast), bouton jamais silencieux.
- Meta `/techniques` cohérente avec le contenu réel de la page.

### Garde-fous
- ⚠️ DEMANDER À JOHN AVANT d'ajouter une capture email sur /techniques (sinon : reformuler la meta).

---

## Bloc E — INP du composer du fil  *(F6)*

Interagir avec la `<textarea>` du composer (`components/feed/PostComposer.tsx`) déclenche un blocage UI **~460 ms** (relevé INP, Core Web Vital « poor ») sur la page sociale la plus utilisée.

> **Connecteurs** : qa-chrome pour **mesurer l'INP avant/après** (et profiler le long task). docs-researcher (`useTransition`, patterns de re-render).

### Tâches
1. Profiler l'interaction (qa-chrome / Performance) : identifier le handler coupable (auto-resize de la textarea ? re-render de `FeedClient`/`PostList` à chaque frappe ? recalcul lourd ?).
2. Corriger : isoler l'état du composer pour ne pas re-render la liste du fil à la frappe, debounce l'auto-resize, et/ou `useTransition` pour les updates non urgents.
3. Vérifier qu'aucune autre interaction du fil n'a régressé.

### Critères d'acceptation
- INP de l'interaction composer **< 200 ms** (mesuré qa-chrome, idéalement « good »).
- Taper dans le composer ne provoque **pas** de re-render de toute la liste de posts (vérifié via profiler / React DevTools).
- Publication + suppression de post toujours OK (toast, optimiste).

### Garde-fous
- Ne pas casser l'optimistic update (publication/suppression).

---

## Bloc F — QA du parcours GRATUIT (Découverte)  *(F1)*  — **démarre quand John a connecté le compte**

L'audit n'a jamais pu voir le gratuit (comptes en premium/essai). Avant la refonte (qui pousse surtout des inscriptions gratuites), il FAUT le vérifier.

> **Connecteurs** : **qa-chrome** (compte Découverte sans essai) + **supabase-guard** pour corréler le floutage attendu (vues `*_for_viewer`, `geom_public`).

### Tâches
1. Sur `/carte` (gratuit) : vérifier le **gating 3 spots/dépt**, le **floutage** (pas de marker précis), l'**absence de score**, le **paywall** des couches premium.
2. Sur une **fiche spot** (gratuit) : coords = `geom_public` (~500-900 m), **pas de GPS précis**, score gaté.
3. Sur `/tarifs` (gratuit) : les CTA Local/Itinérant affichent bien **« Démarrer l'essai 7 j »** (et NON « Gérer mon abonnement » — ce dernier n'apparaît que pour un abonné/essai).
4. Consigner tout écart dans `docs/sprint-31/qa-gratuit.md` (captures + repro).

### Critères d'acceptation
- Rapport `docs/sprint-31/qa-gratuit.md` livré, statuant **OK / KO** sur chaque point ci-dessus avec preuve.
- Tout KO (ex. CTA tarifs faux pour un gratuit, fuite GPS) ouvre un finding chiffré pour la roadmap.

### Garde-fous
- QA en lecture : ne rien acheter, ne pas lancer d'essai réel.

---

## Workstream VERIF (obligatoire, agent indépendant)

1. Lancer **`/verif-sprint`** : `pnpm test` + `pnpm build` + `pnpm typecheck` + `pnpm lint` + revue croisée indépendante + passe anti-régression. Puis **deploy-watch** (Vercel + Sentry) après déploiement.
2. Relire **chaque critère d'acceptation** des blocs A→F et cocher ✅/❌ avec preuve (URL, commande, capture).
3. Passe sécurité : si migration au Bloc C → RLS d'abord, `*_for_viewer` intacts, aucun secret commité, `lib/types.ts` régénéré.
4. Passe copy FR : tutoiement, zod en français, **aucune promesse produit mensongère** (le perso reste « Exemple » tant que non livré).
5. Passe anti-régression ciblée : **floutage GPS** et **gating de tier** inchangés (Bloc C ne doit rien ouvrir côté carte), SEO (titres fil corrigés mais toujours indexables).
6. Livrer `docs/sprint-31/RECAP.md` : fait / comment tester / reste manuel John.

## Reste manuel John (post-sprint)

- Connecter le compte Découverte (préalable Bloc F).
- Trancher les 2 décisions du Bloc C (UX sélecteur 26 ; onboarding 6 vs 26) + la capture email /techniques (Bloc D).
- Relire → merge `sprint-31` → `main` → déploiement → QA finale.
