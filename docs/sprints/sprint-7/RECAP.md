# Récap Sprint 7 — Scoring personnalisé

> Le carnet apprend de tes prises : overlay « Tu pêches mieux quand… » par-dessus les
> données environnementales génériques. Premier sprint qui **consomme les données
> loguées par l'utilisateur**.

_Généré le 2026-05-20 — phase 5 (consolidation finale)._

> **⚠️ Mise à jour 2026-05-20 (post-review produit)** — deux changements majeurs après
> test sur données réelles :
> 1. **Bug corrigé** : `getCachedPersonalProfile` plantait systématiquement
>    (`cookies` appelés dans `unstable_cache`) → la section perso ne s'affichait jamais.
>    Cache retiré, calcul à la volée.
> 2. **Pivot des « multiplicateurs » vers du descriptif honnête** : l'approche
>    « tu pêches mieux que ta moyenne par vent X » a été abandonnée car non démontrable
>    (le carnet ne logue que les prises, jamais les sorties bredouilles → pas de vrai
>    taux de réussite ; le proxy « taille > médiane » mesure la grosseur, pas le succès ;
>    échantillons trop petits). Remplacée par `computeCatchPatterns` : on décrit
>    seulement **où et quand tombent tes prises** (condition dominante par facteur).
>    Composants `MultiplierGauge` et `InsightCard` supprimés.
>
> **À faire (suivi)** : le scoring perso des fiches spots (badge « ⚡ Perso » + ajustement
> du score solunar par le multiplicateur) repose sur la même logique abandonnée. Il est
> inerte en pratique (conditions des prises rarement renseignées) mais reste à neutraliser
> pour cohérence, idéalement avec le futur chantier « scoring de vraie performance basé
> sur les sorties loguées ».

---

## A. Fichiers créés

**Lib scoring (`lib/scoring/`)**
- `types.ts` — types du profil perso, insights, multiplicateurs
- `personal-config.ts` — constantes (MIN catches, bornes multiplicateurs, seuils confidence)
- `catch-analysis.ts` — bucketing des catches (vent / marée / heure) + stats
- `insights.ts` — `computeInsights` + `computePersonalMultiplier`
- `personal-fetcher.ts` — récupération + cache du profil perso d'un user
- `insights-matcher.ts` — matching insight → fenêtre solunar (approche approximative)
- `spot-scores-job.ts` — calcul + stockage des scores génériques de qualité (utilisé par le cron)

**Tests (`lib/scoring/__tests__/`)**
- `catch-analysis.test.ts` (55 cas)
- `insights.test.ts` (10 cas)
- `scoring-integration.test.ts` (9 cas)

**UI (`components/scoring/`)**
- `InsightCard.tsx` — carte d'insight sur /profil
- `InsightChip.tsx` — chip « ⚡ Perso » sur les fenêtres de fiche spot (hover desktop / tap mobile)
- `MultiplierGauge.tsx` — jauge de multiplicateur
- `PersonalScoreSection.tsx` — section perso du profil (avec empty state)

**Carte**
- `components/map/MapLegend.tsx` — légende des markers colorisés

**Infra / DB**
- `app/api/crons/compute-spot-scores/route.ts` — Vercel Cron quotidien (fail-closed sur `CRON_SECRET`)
- `lib/supabase/admin.ts` — client service-role (serveur uniquement, pour le cron)
- `supabase/migrations/014_spot_scores.sql` — table `spot_scores` + index + RLS
- `supabase/migrations/015_catches_scoring_columns_reconcile.sql` — réconciliation colonnes
- `supabase/migrations/016_get_spots_for_scoring.sql` — RPC d'alimentation du cron

**Dev / docs**
- `app/dev/scoring-preview/` — page de preview dev du scoring
- `docs/sprint-7/`, `docs/ROADMAP.md`, `docs/tests/`

> Note : `migration 013_catches_scoring_columns.sql` (colonnes `wind_speed_kmh`,
> `wind_direction_deg`, `tide_state`, `location_label` sur `catches`) a été créée et
> **déjà commitée** en amont (commit `3fa322a`).

## B. Fichiers modifiés

- `lib/solunar/scoring.ts` *(via `lib/solunar/next-window.ts`)* — paramètre `personalMultiplier` optionnel
- `lib/solunar/next-window.ts` — propagation du `personalMultiplier`
- `app/actions/solunar.ts` — enrichissement avec `userId`
- `app/(marketing)/spots/[slug]/page.tsx` — passage du `userId`
- `app/(map)/carte/page.tsx` — join `spot_scores` (markers colorisés)
- `components/spots/SpotBestMomentsSection.tsx` — badge « Perso »
- `components/solunar/BestMomentCard.tsx` + `DayBestMoments.tsx` — InsightChip
- `components/map/MapView.tsx` — markers colorisés par qualité + correctif lint (état d'erreur dérivé au montage)
- `components/map/MapShell.tsx`, `components/map/MapFilters.tsx` — intégration légende + correctif lint
- `lib/catches/actions.ts` — invalidation cache profil après log d'une prise
- `app/(app)/profil/page.tsx` — `PersonalScoreSection`
- `lib/map/utils.ts`, `lib/spots/filters-schema.ts` — support markers/scores
- `vercel.json` — déclaration du cron quotidien (Hobby Vercel = 1 cron/jour max)
- `.env.example`, `app/globals.css` — vars (`CRON_SECRET`, `SUPABASE_SERVICE_ROLE_KEY`) + styles

## C. Packages ajoutés

- **Aucun.** Pur TypeScript + SQL.

## D. Migrations DB

| Fichier | Contenu |
|---|---|
| `014_spot_scores.sql` | table `spot_scores` (score générique par spot) + index + RLS |
| `015_catches_scoring_columns_reconcile.sql` | réconciliation des colonnes scoring sur `catches` |
| `016_get_spots_for_scoring.sql` | RPC fournissant la liste des spots à scorer au cron |

> ⚠️ **Numérotation divergente** : le brief prévoyait `007_spot_scores.sql`, mais les
> migrations réelles sont à `013-016` (la DB avait déjà avancé). Aucune incidence
> fonctionnelle — c'est juste le numéro de fichier.

## E. Décisions notables prises seul

- **Déclencheur cron = Vercel Cron** (`vercel.json` → `/api/crons/compute-spot-scores`,
  schedule `0 5 * * *`, quotidien à 05:00 UTC — le plan Hobby limite les crons à 1/jour ;
  passer Pro pour repasser en horaire). Choisi plutôt que pg_cron / Edge Function car : déjà sur Vercel,
  zéro infra supplémentaire, auth native via `CRON_SECRET`, logs centralisés.
- **Cron fail-closed** : refuse tout appel sans `Authorization: Bearer <CRON_SECRET>`
  (401). Utilise un client service-role (`lib/supabase/admin.ts`) → nécessite
  `SUPABASE_SERVICE_ROLE_KEY`.
- **Scoring perso ≠ scoring carte** : la carte affiche un score **générique** par spot
  (markers colorisés, identiques pour tous, recalculés 1×/jour sur Hobby). Le scoring
  **personnalisé** n'apparaît que sur les fiches spots et /profil. Décision assumée pour
  le v1 (perf + simplicité).
- **Matching insight → fenêtre** approximatif : on rapproche un insight (ex. « marée
  descendante ») de la fenêtre solunar la plus proche en conditions, sans recalcul exact.
  Suffisant pour l'affichage, à affiner post-beta.
- **Cache profil perso 24h** (vs 1h pour le solunar générique) : les patterns perso
  évoluent lentement, inutile de recalculer souvent. Invalidé immédiatement au log d'une
  nouvelle prise (`lib/catches/actions.ts`).
- **Formules de multiplicateur** bornées (clamp min/max) avec garde-fou « aberrant →
  clampé » pour éviter qu'un échantillon faible produise un multiplicateur extrême.

## F. Flaggé pour plus tard

- Affinement des formules de multiplicateur sur vraies données post-beta
- Scoring perso sur les markers carte (aujourd'hui générique)
- Score de satisfaction 1-5 sur les catches (sprint 8+) pour mieux pondérer les « bonnes » prises
- Corrélations avancées : espèce par espèce, spot par spot
- Alertes push « Tes conditions idéales sont actives demain » (sprint 12+ mobile)
- Tests E2E Playwright sur le flow log catch → profil mis à jour (sprint 11)
- **Dette lint** : ~360 erreurs `react/no-unescaped-entities` (apostrophes FR dans le
  JSX de pages guides/légal/auth) — **pré-existantes, hors sprint 7**. Le build les ignore
  (`eslint.ignoreDuringBuilds`). À nettoyer dans un chantier dédié.

## G. Métriques

- **Bundle First Load JS** : le `pnpm build` de ce sprint affiche `0 B` sur toutes les
  routes (artefact d'affichage de cette config de build) — **cibles ≤265 kB / ≤225 kB non
  vérifiables automatiquement**. Aucun package client ajouté + `lib/scoring/` côté serveur
  uniquement → pas de raison de régression. À confirmer visuellement sur Vercel.
- **Temps de calcul** : non mesuré formellement. Les 55 cas de `catch-analysis.test.ts`
  s'exécutent en ~35 ms cumulés → coût par profil largement sous la cible 5 ms.
- **Cron** : non mesuré en conditions réelles (DB de dev). À surveiller au premier
  déclenchement prod (cible < 5 min pour ~200 spots).
- **Couverture tests `lib/scoring`** : non mesurée formellement (cible 80 %). 74 tests
  scoring + 42 solunar = 116 tests verts.

## H. Tests skippés / non faits

- **Partie 5B (smoke test navigateur)** : nécessite des comptes test-zero / test-few /
  test-full + interaction manuelle → **à faire par John** avant le push.
- Device physique iOS (pas d'app mobile)
- Validation des multiplicateurs contre données réelles (post-beta)
- Performance du cron avec 1000+ spots (hors périmètre v1)

---

## ⚙️ Avant / pendant le déploiement (rappels)

1. **Vercel env vars** à confirmer en Production **avant** que le cron tourne :
   - `CRON_SECRET` (sinon le cron renvoie 401)
   - `SUPABASE_SERVICE_ROLE_KEY` (sinon `createAdminClient` échoue)
2. **Migrations 014-016** à appliquer sur la DB de prod (Supabase Studio ou `db push`).
3. Après deploy : **déclencher le cron une fois** manuellement pour peupler `spot_scores`,
   sinon les markers carte restent gris.
4. Smoke test prod rapide (1 scénario par tier).

## État des checks (Partie 5A)

| Check | Résultat |
|---|---|
| `pnpm typecheck` | ✅ 0 erreur |
| `pnpm test lib/scoring lib/solunar` | ✅ 116/116 |
| `pnpm build` | ✅ succès |
| `pnpm lint` | ⚠️ 365 erreurs **pré-existantes** (apostrophes FR) — voir dette section F. Les 2 erreurs liées au sprint (`set-state-in-effect`) ont été corrigées. |
