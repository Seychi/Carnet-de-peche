# Sprint 64 — Brief d'exécution
## Carte instantanée (perf & filtre fantôme)

> Rédigé le 2026-06-30. Durée cible : **1 passe Fable** (effort `xhigh`), M.
> Contexte : `docs/audits/AUDIT-2026-06-30-UX-DESIGN-GAMIFICATION.md` §1.1, §1.3, §3.6 ; `docs/ROADMAP-POST-AUDIT-2026-06-30.md` Phase C. La carte est la feature table-stake n°1 face à spot-de-peche.com : sa 1re impression doit être irréprochable.
> Décisions John 2026-06-30 : perf « ressentie » OK côté machine, mais la 1re peinture des tuiles (~8 s constaté à froid) et le filtre fantôme sont de vrais irritants d'entrée. Pas de refonte MapLibre, juste rendre l'entrée propre et rapide.

**Préalable avant de démarrer** (manuel John) : aucun. Sprint 100 % client/perf, **0 migration**.

> **🔀 Parallélisation** : ce sprint tourne **en parallèle** des Sprints **59**, **60**, **65** (fichiers disjoints, **0 migration** ici → aucune collision avec le 098 du Sprint 60). Un seul point de coordination léger (Bloc 2, l'INP du log de prise) documenté plus bas.

---

## 🚀 Ligne de lancement (à copier-coller par John)

> ultracode — effort xhigh. Exécute `docs/sprint-64/BRIEF.md`. Lance les Blocs 0 et 1 en
> parallèle dès maintenant (aucune dépendance), le Bloc 2 en tenant compte de la note de
> coordination avec le Sprint 59, et termine par le workstream VERIF. Mesure la perf
> AVANT/APRÈS (Lighthouse mobile + réseau tuiles). Ne push pas.

---

## 🧠 Connecteurs & sous-agents (usage systématique — cf `CLAUDE.md` §20)

| Quand | Sous-agent → connecteur | Pourquoi |
|---|---|---|
| Perf MapLibre (deferred load, tuiles, style) + Next 15 | **docs-researcher** → Context7 | Pattern version-correct (MapLibre 5.x), pas de code de mémoire. |
| Mesures perf réelles + console/réseau /carte | **qa-chrome** → Claude in Chrome + Playwright/Lighthouse | Lighthouse mobile AVANT/APRÈS, requêtes tuiles, filtre fantôme, INP. |
| Source `parentNode` null (si le triage 59 pointe MapLibre) | **deploy-watch** → Sentry | Confirmer avant de poser le null-guard. |
| Clôture | **`/verif-sprint`** | Tests + build + lint + types + revue indépendante + anti-régression. |

## Objectif du sprint en une phrase

Une entrée `/carte` **non filtrée par défaut** et des **tuiles qui apparaissent en < ~2 s** à froid (Lighthouse mobile visiblement remonté), sans rien changer au gating ni au floutage GPS.

## Workstreams & dépendances

| WS | Bloc(s) | Durée | Dépend de | Parallélisable jour 1 |
|----|---------|-------|-----------|----------------------|
| A  | Bloc 0 — Filtre fantôme (localStorage) | S-M | — | ✅ |
| B  | Bloc 1 — Perf tuiles / first paint | M | — | ✅ |
| C  | Bloc 2 — INP log de prise (non bloquant) | S | ⚠️ coord. Sprint 59 | ✅* |
| VERIF | revue finale | S | tous | ❌ |

*Bloc 2 : parallélisable **si** on cible l'utilitaire de géocodage/action serveur (pas `CatchForm.tsx`, possédé par le Sprint 59). Voir garde-fous.

---

## Bloc 0 — Filtre fantôme au chargement (`MapFilters.tsx`)

En arrivant sur `/carte` nu, l'URL devient `?species=calmar&source=curated` (« 2 filtres actifs », carte quasi vide car `calmar` n'a pas de spot curé) et la carte vole loin du département de l'utilisateur. Cause : restauration du dernier filtre depuis `localStorage` puis re-push dans l'URL.

> **Connecteurs** : **qa-chrome** pour reproduire (entrer sur `/carte` avec un `localStorage` `carte:last-filters` peuplé → vérifier l'URL et le nombre de spots).

### Tâches
1. Dans `components/map/MapFilters.tsx` (restauration `:160-187`, sync/re-push `:191-213`, clé `carte:last-filters`) : **choisir une des deux corrections** —
   - **(préférée)** supprimer la restauration automatique sur entrée nue : `/carte` sans query = **non filtré** ; le `localStorage` ne sert plus qu'à ne pas perdre un filtre en cours de session (pas à réécrire l'URL au mount) ;
   - **(alternative)** garder la restauration en mémoire mais **ne pas réécrire l'URL** (`router.replace`) tant que l'utilisateur n'a pas touché un filtre.
2. Vérifier que le nettoyage des filtres orphelins (`:171-178`) ne réintroduit pas un `source`/`species` périmé.

### Critères d'acceptation
- Ouvrir `/carte` (URL nue) après avoir déjà filtré « calmar » dans une session précédente → l'URL **reste `/carte`** (pas de `?species=…`), **215 spots** visibles (pas 111/vide), la carte est centrée correctement (pas propulsée en Atlantique si l'utilisateur est Med).
- Appliquer puis réinitialiser un filtre fonctionne toujours ; le partage d'une URL **avec** query filtre marche toujours (deep-link intact).

### Garde-fous
- Ne pas toucher au **gating de tier** (3 spots/dépt gratuit vs complet abonné) ni au **floutage GPS**.
- Ne pas casser les deep-links `/carte?species=bar` (un lien explicite doit toujours filtrer).

---

## Bloc 1 — Perf tuiles / premier paint (`MapShell.tsx`, `MapView.tsx`)

À froid, ~8 s de canvas gris + spinner avant les tuiles (constaté en QA). Le `useDeferredMount` existe déjà ; l'objectif est de raccourcir le premier paint, pas de refondre la carte.

> **Connecteurs** : **docs-researcher** (Context7) sur MapLibre 5.x (préchargement/priorisation des tuiles, `maxTileCacheSize`, style minimal au boot) + Next 15 (chargement des chunks) ; **qa-chrome** pour Lighthouse mobile **AVANT** (référence) puis **APRÈS**.

### Tâches
1. Mesurer l'état **AVANT** (Lighthouse mobile /carte + waterfall des requêtes tuiles via `qa-chrome`) et le **noter dans le RECAP**.
2. Réduire le time-to-first-tile : pistes à évaluer (docs-researcher d'abord) — priorité au chargement du style/tuiles au-dessus du reste, `preconnect`/`dns-prefetch` vers MapTiler, éviter un double-mount du canvas (cf `map.resize()` au `load`), lazy des couches secondaires (bathy/qualité) après le premier paint, `loading="eager"` sur rien de superflu.
3. Confirmer que le spinner/skeleton couvre bien la fenêtre jusqu'au premier paint (pas de canvas noir/gris nu).

### Critères d'acceptation
- Premier paint des tuiles **< ~2 s** à froid (réseau normal) — preuve `qa-chrome` (capture horodatée ou trace).
- Lighthouse mobile /carte **visiblement remonté** vs la référence AVANT (viser > ~60, à confirmer selon la mesure de départ) ; noter le chiffre AVANT/APRÈS dans le RECAP.
- Aucun spot/couche perdu ; le clustering et les markers s'affichent comme avant.

### Garde-fous
- Pas de refonte du composant carte ni du style ; optimisations de chargement uniquement.
- ⚠️ **DEMANDER À JOHN AVANT** si une optimisation implique de changer de **fournisseur de tuiles** ou d'ajouter une **clé/coût** MapTiler (rester dans le free tier actuel).
- **`parentNode` null (optionnel)** : si le triage Sentry du **Sprint 59** confirme que le `TypeError: parentNode` vient du **teardown des marqueurs MapLibre** (`MapView.tsx` ~`:585-625`), poser ici le **null-guard** (ce sprint possède `MapView.tsx`). Sinon, laisser au Sprint 59 le soin de router le fix.

---

## Bloc 2 — INP du log de prise (rendre le submit/géocodage non bloquant)

Le moniteur INP de Vercel a mesuré **2 285 ms** de blocage sur un **champ de saisie au moment de loguer une prise** (§3.6). Ce n'est **pas** sur la carte : c'est le handler de soumission/géocodage. On le range ici (perf) mais **attention au fichier**.

> **Connecteurs** : **qa-chrome** pour reproduire l'INP (moniteur Vercel visible en tant qu'owner) et confirmer le gain ; **docs-researcher** si besoin sur `navigator`/fetch non bloquant.

### Tâches
1. Localiser le blocage : très probablement le **géocodage synchrone** (`lib/geo/*` ou l'action serveur `app/actions/catches*`) exécuté dans le handler de submit / de saisie ville.
2. Le rendre **non bloquant** : débouncer la saisie, géocoder en asynchrone (ne pas bloquer l'event handler de l'input), déférer le travail lourd hors du chemin critique de l'interaction.

### Critères d'acceptation
- INP de l'input « ville » / du submit de log **< 200 ms** (mesure `qa-chrome` via le moniteur, AVANT ~2 285 ms → APRÈS < 200 ms).
- Le géocodage donne toujours le bon résultat (« Brest » → coords Finistère), la prise se crée toujours.

### Garde-fous
- ⚠️ **COORDINATION Sprint 59** : `components/catches/CatchForm.tsx` est **possédé par le Sprint 59** (Bloc 0). **Ne pas éditer `CatchForm.tsx` ici.** Cibler l'**utilitaire de géocodage / l'action serveur**. Si le fix exige de toucher le JSX du formulaire, **le laisser à la session Sprint 59** et le noter (ne pas créer de conflit de merge).
- Ne pas changer la logique de résolution d'adresse ni le fallback « saisir manuellement ».

---

## Workstream VERIF (obligatoire, agent indépendant)

1. Lance **`/verif-sprint`** (`pnpm test` + `pnpm build` + `pnpm typecheck` + `pnpm lint` + revue croisée + anti-régression). Puis **deploy-watch** (Vercel + Sentry).
2. Relire chaque critère (Blocs 0-2) et cocher ✅/❌ **avec preuve** (URL, capture Lighthouse AVANT/APRÈS, trace INP).
3. **Passe anti-régression carte** : gating tier (3 spots/dépt gratuit) intact, floutage GPS intact, deep-links `?species=` OK, couches (heatmap/bathy/qualité/score) OK, clustering OK.
4. **Passe perf** : chiffres AVANT/APRÈS consignés (first paint tuiles, Lighthouse, INP).
5. Livrer **`docs/sprint-64/RECAP.md`** : fait / comment tester / mesures AVANT-APRÈS / reste manuel John.

## Reste manuel John (post-sprint)

- Relire → merge sur `main` (après le merge du Sprint 60 si les deux touchent `/home`… ici non, `/carte` ≠ `/home`) → déploiement → QA `/carte` à froid.
- Arbitrer si une optim tuiles touche le coût/fournisseur MapTiler (⚠️ Bloc 1).
