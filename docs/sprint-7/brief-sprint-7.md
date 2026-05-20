# Sprint 7 — Scoring personnalisé "Tu pêches mieux quand…"

> Brief découpé en **5 phases**. Chaque phase est un bloc copier-coller pour Claude Code (entre triples backticks). Donne-lui les phases dans l'ordre — chaque phase a ses propres commits et peut être validée + pushée avant la suivante.
>
> **Périmètre du sprint** : exploiter l'historique de catches loggées pour personnaliser le scoring solunar. L'utilisateur voit des insights sur ses propres patterns ("Tu pêches mieux par vent SSO 10-15 km/h", "Tes meilleures sessions sont en marée montante coef > 75") ET le score des fenêtres solunar intègre son historique pour re-pondérer les facteurs. C'est le différenciateur fort vs spot-de-peche.com — eux n'ont pas l'historique de l'user.
>
> **Ce sprint N'EST PAS** : un système de recommandation ML. C'est du scoring statistique simple (corrélations entre conditions au moment des prises et taille/satisfaction). Pas de modèle, pas de training, pas de numpy. Just SQL + TypeScript.
>
> **Pré-requis** : sprint 6 mergé et pushé. L'utilisateur a au minimum **3 catches loguées** pour que les insights soient affichés (en dessous, message "Logue tes prises pour débloquer tes insights"). La lib `lib/solunar/` est complète avec les types `ScoringFactors`, `FishingWindow`, `DailyForecast`.

---

## ▶ Phase 0 — Décisions produit + pré-requis (15 min — fait par toi)

> **Budget** : 15 min
> **Difficulté** : easy
> **Pré-requis** : sprint 6 mergé, ≥ quelques catches en DB (pour les tests)

### Partie 0A — Décisions produit à valider

Avant de lancer Claude Code, valide ces choix par défaut :

| Décision | Valeur par défaut proposée | Alternative possible |
|---|---|---|
| Seuil déclenchement insights | 3 catches minimum | 5 ou 10 |
| Fenêtre temporelle de l'analyse | Toutes les catches de l'user | Dernières 12 mois seulement |
| Facteurs analysés | Vent (vitesse + direction) + marée (état + coef approx) + heure du jour + saison | Ajouter phase lunaire, météo (sky cover) |
| Metric de "bonne prise" | Taille du poisson (length_cm) si renseignée, sinon présence de la prise = 1 | Score satisfaction 1-5 (à logger — sprint 8) |
| Re-pondération du score solunar | Multiplicateur perso appliqué sur les 3 facteurs 40/35/25 | Remplacement total des poids |
| Affichage insights | Section dédiée sur /profil + tooltip enrichi dans BestMomentCard | Page dédiée /mes-insights |
| Seuil de confiance affiché | "Basé sur X prises" sous chaque insight | Score de confiance 0-100 caché |

Ces valeurs sont **ajustables** via constantes dans `lib/scoring/personal-config.ts`.

### Partie 0B — Vérification des pré-requis

Avant de lancer Claude Code, confirme :
- [ ] `lib/solunar/` complet (types, scoring, astronomy, index) — sprint 6 ✅
- [ ] Table `catches` en DB avec colonnes : `caught_at` (timestamp), `length_cm` (nullable), `wind_speed_kmh` (nullable), `wind_direction_deg` (nullable), `tide_state` (nullable : 'rising'|'falling'|'slack'), `spot_id` (nullable), `user_id`
- [ ] Au moins 5-10 catches seedées en DB pour les tests (conditions variées)
- [ ] La Server Action `getSpotNextWindow` du sprint 6 est fonctionnelle

Si `catches` n'a pas les colonnes conditions météo : **ALERTE-MOI** avant la phase 1 — il faudra une migration.

### Partie 0C — Architecture du scoring personnalisé

Le scoring personnalisé fonctionne en deux couches :

```
Scoring générique (sprint 6)                    Scoring personnalisé (sprint 7)
─────────────────────────────                    ──────────────────────────────
solunar × 0.40                                   solunar × (0.40 × persoMultiplier.solunar)
tide × 0.35          ──→  score brut  ──→ ×     tide    × (0.35 × persoMultiplier.tide)
wind × 0.25                                      wind    × (0.25 × persoMultiplier.wind)
                                                                                    ↕ re-normalisé → 0-100
```

`persoMultiplier` est calculé une fois par user (quand il y a ≥ 3 catches) et mis en cache 24h.

### Checkpoint pré-phase 1

- [ ] Décisions produit Partie 0A validées
- [ ] Pré-requis 0B confirmés (colonnes conditions dans catches)
- [ ] Sprint 6 stable en prod
- [ ] Prêt à donner le prompt phase 1

---

## ▶ Phase 1 — Analyse statistique des catches (lib pure)

> **Budget Claude Code** : 1-1.5 jour
> **Difficulté** : medium (stats simples, pas de ML)
> **Pré-requis** : phase 0 OK

**Copie-colle dans Claude Code :**

```
Contexte : sprint 7 du Carnet de Pêche. Objectif global du sprint : personnaliser le scoring solunar en exploitant l'historique de catches de l'utilisateur. Ce sprint EST le différenciateur produit — spot-de-peche.com n'a pas ça.

Cette phase 1 = la couche analytique pure : aucun composant UI, aucune route, juste `lib/scoring/` avec l'analyse statistique des catches et le calcul des multiplicateurs personnels.

────────────────────────────────────────────────────────────────────────
PARTIE 1A — Types + config (~30 min)
────────────────────────────────────────────────────────────────────────

1. Créer `lib/scoring/types.ts` :
   ```ts
   export type WindBucket = 'calm' | 'light' | 'moderate' | 'strong' | 'gale'
   // calm: 0-5 km/h · light: 5-15 · moderate: 15-25 · strong: 25-40 · gale: >40

   export type TideStateBucket = 'rising' | 'falling' | 'slack' | 'unknown'

   export type HourBucket = 'night' | 'dawn' | 'morning' | 'midday' | 'afternoon' | 'dusk'
   // night: 23-4 · dawn: 4-7 · morning: 7-11 · midday: 11-14 · afternoon: 14-18 · dusk: 18-23

   export type SeasonBucket = 'spring' | 'summer' | 'autumn' | 'winter'

   export type CatchSample = {
     caughtAt: Date
     lengthCm: number | null      // taille, peut être null
     windSpeedKmh: number | null
     windDirectionDeg: number | null
     tideState: TideStateBucket
     hourLocal: number             // 0-23 en timezone Europe/Paris
     monthLocal: number            // 1-12
   }

   export type ConditionStats = {
     count: number                 // nombre de prises dans ce bucket
     avgLength: number | null      // longueur moyenne (null si aucune mesurée)
     catchRate: number             // proportion de bonnes prises (length > median OU count/total)
   }

   export type PersonalInsight = {
     factor: 'wind' | 'tide' | 'hour' | 'season'
     label: string                 // ex: "Vent léger (5-15 km/h)"
     description: string           // ex: "Tu as 72% de tes meilleures prises avec ce vent"
     catchRate: number             // 0-1
     sampleCount: number
     isPositive: boolean           // true = condition favorable pour toi
     confidence: 'low' | 'medium' | 'high'  // low: <5 prises, medium: 5-20, high: >20
   }

   export type PersonalMultiplier = {
     wind: number          // 0.5 - 2.0 (1.0 = neutre, pas de personnalisation)
     tide: number          // 0.5 - 2.0
     solunar: number       // 0.5 - 2.0 (pour l'heure du jour vs événements astro)
     computedAt: string    // ISO — pour savoir si le cache est stale
     basedOnCatches: number  // nombre de prises utilisées
   }

   export type PersonalProfile = {
     userId: string
     insights: PersonalInsight[]
     multiplier: PersonalMultiplier
     hasEnoughData: boolean   // true si ≥ MIN_CATCHES_FOR_INSIGHTS
   }
   ```

2. Créer `lib/scoring/personal-config.ts` :
   ```ts
   export const PERSONAL_SCORING_CONFIG = {
     MIN_CATCHES_FOR_INSIGHTS: 3,        // en dessous : pas d'insights affichés
     MIN_CATCHES_FOR_MULTIPLIER: 5,      // en dessous : multiplier = 1.0 (neutre)
     CACHE_TTL_HOURS: 24,                // recalcul toutes les 24h

     // Cap des multiplicateurs (évite des scores aberrants)
     MULTIPLIER_MIN: 0.6,
     MULTIPLIER_MAX: 1.6,
     MULTIPLIER_NEUTRAL: 1.0,

     // Pour le calcul du catch rate "positif"
     CATCH_RATE_POSITIVE_THRESHOLD: 0.6,  // > 60% de ses prises dans ce bucket = positif

     // Pour la description des insights
     WIND_BUCKETS: {
       calm: { label: 'Calme (< 5 km/h)', range: [0, 5] },
       light: { label: 'Léger (5-15 km/h)', range: [5, 15] },
       moderate: { label: 'Modéré (15-25 km/h)', range: [15, 25] },
       strong: { label: 'Fort (25-40 km/h)', range: [25, 40] },
       gale: { label: 'Tempête (> 40 km/h)', range: [40, 999] },
     },
   } as const
   ```

────────────────────────────────────────────────────────────────────────
PARTIE 1B — Extraction et bucketing des catches (~2 h)
────────────────────────────────────────────────────────────────────────

3. Créer `lib/scoring/catch-analysis.ts` :

   a. `function toCatchSamples(catches: DbCatch[]): CatchSample[]`
      - Mappe les rows DB en CatchSample
      - Calcule `hourLocal` via `Intl.DateTimeFormat('fr-FR', { timeZone: 'Europe/Paris', hour: 'numeric' })`
      - Calcule `monthLocal` idem
      - Gère les nulls (windSpeedKmh, tideState) → `null` / `'unknown'`

   b. `function bucketizeWind(speedKmh: number | null): WindBucket`
      - null → 'calm' (valeur par défaut neutre)
      - Lookup par range

   c. `function bucketizeHour(hourLocal: number): HourBucket`
      - Lookup tableau statique

   d. `function bucketizeSeason(monthLocal: number): SeasonBucket`
      - 3-5 = spring, 6-8 = summer, 9-11 = autumn, 12/1/2 = winter

   e. `function computeMedianLength(samples: CatchSample[]): number | null`
      - Filtre les samples avec lengthCm non null
      - Si 0 : retourne null (pas de données de taille)
      - Sinon : tri + médiane

4. `function computeConditionStats(samples: CatchSample[], filter: (s: CatchSample) => boolean, medianLength: number | null): ConditionStats`
   - `count` = samples.filter(filter).length
   - `avgLength` = moyenne des lengths dans le filtre (nullable si aucune mesure)
   - `catchRate` :
     * Si medianLength !== null : proportion des filtered samples avec length > medianLength (sur total des filtered samples avec length)
     * Sinon : count / totalSamples (catch rate brut = part des prises dans ce contexte)

────────────────────────────────────────────────────────────────────────
PARTIE 1C — Calcul des insights + multiplicateurs (~2-3 h)
────────────────────────────────────────────────────────────────────────

5. `function computeInsights(samples: CatchSample[]): PersonalInsight[]`
   - Si samples.length < MIN_CATCHES_FOR_INSIGHTS : return []
   - Pour chaque facteur :

   **Vent :**
   - Calcule conditionStats pour chaque WindBucket
   - Pour les buckets avec count ≥ 2 : crée un PersonalInsight
   - label = WIND_BUCKETS[bucket].label
   - description = ex: "72% de tes meilleures prises avec ce vent (sur 8 sessions)"
   - isPositive = catchRate > CATCH_RATE_POSITIVE_THRESHOLD
   - confidence = count < 5 → 'low', 5-20 → 'medium', > 20 → 'high'

   **Marée :**
   - Stats pour rising / falling / slack / unknown
   - Mêmes règles

   **Heure du jour :**
   - Stats pour chaque HourBucket
   - Buckets avec count ≥ 2

   **Saison :**
   - Stats pour spring/summer/autumn/winter
   - Buckets avec count ≥ 1

   - Trie les insights par catchRate décroissant
   - Limite à 6 insights max (les plus significatifs)

6. `function computePersonalMultiplier(samples: CatchSample[]): PersonalMultiplier`
   - Si samples.length < MIN_CATCHES_FOR_MULTIPLIER :
     * Return `{ wind: 1.0, tide: 1.0, solunar: 1.0, computedAt: now, basedOnCatches: samples.length }`
   - Calcul du multiplicateur vent :
     * windStats[bucket].catchRate pour chaque bucket
     * Le multiplicateur = (catchRate du bucket 'light') / (catchRate moyen tous buckets) — si le light est meilleur que la moyenne, on booste le score vent dans les conditions légères
     * Plus simplement : `windMultiplier = sum(catchRate[bucket] * weight[bucket]) / sum(weight[bucket])` où weight = SOLUNAR_WEIGHTS[bucket] from config sprint 6
     * Cap entre MULTIPLIER_MIN et MULTIPLIER_MAX
   - Calcul du multiplicateur marée :
     * Même logique avec rising/falling/slack stats
     * risingMultiplier = catchRate['rising'] / catchRate_avg
     * Cap entre MULTIPLIER_MIN et MULTIPLIER_MAX
   - Calcul multiplicateur solunar (via heure du jour) :
     * Compare catch rate dawn+dusk vs midday
     * Si l'user pêche beaucoup mieux en aube/crépuscule → boost solunar
     * Formule : `solunarMultiplier = (catchRate_dawn + catchRate_dusk) / (2 * catchRate_midday)`
     * Default = 1.0 si données insuffisantes par bucket

   **Note importante sur la formule** : le but n'est pas de la précision mathématique — c'est de produire un multiplicateur entre 0.6 et 1.6 qui reflète les tendances de l'utilisateur. Si au smoke test tu vois des multiplicateurs aberrants (> 1.6 ou < 0.6), loggue un warning et cap silencieusement.

7. `function computePersonalProfile(userId: string, catches: DbCatch[]): PersonalProfile`
   - Appelle toCatchSamples → computeInsights → computePersonalMultiplier
   - Retourne PersonalProfile complet

────────────────────────────────────────────────────────────────────────
PARTIE 1D — Intégration avec le scoring solunar (~1 h)
────────────────────────────────────────────────────────────────────────

8. Modifier `lib/solunar/scoring.ts` (déjà existant de sprint 6) :
   - Ajouter un paramètre optionnel `personalMultiplier?: PersonalMultiplier` à `scoreWindow()`
   - Si présent ET `basedOnCatches >= MIN_CATCHES_FOR_MULTIPLIER` :
     * Applique les multiplicateurs sur les composantes avant de calculer le score final :
       ```ts
       const adjustedSolunar = Math.min(solunar * personalMultiplier.solunar, 1.0)
       const adjustedTide    = Math.min(tide    * personalMultiplier.tide,    1.0)
       const adjustedWind    = Math.min(wind    * personalMultiplier.wind,    1.0)
       ```
     * Re-calcule le score avec les valeurs ajustées
     * Ajoute dans `factors.reasons` : "Personnalisé sur tes X prises" si le multiplier a impacté le score de ≥ 5 points
   - Si non présent : comportement identique au sprint 6 (rétrocompatibilité stricte)

────────────────────────────────────────────────────────────────────────
PARTIE 1E — Tests unitaires (~1-2 h)
────────────────────────────────────────────────────────────────────────

9. Créer `lib/scoring/__tests__/catch-analysis.test.ts` :
   - Test `bucketizeWind` pour toutes les frontières (0, 5, 15, 25, 40, 50 km/h)
   - Test `bucketizeHour` pour minuit, 6h, 12h, 20h
   - Test `computeMedianLength` avec [null, null, null] → null, [30, 40, 50] → 40, [30] → 30
   - Test `computeConditionStats` avec mock samples

10. Créer `lib/scoring/__tests__/insights.test.ts` :
    - Test `computeInsights` avec 2 catches → [] (pas assez)
    - Test `computeInsights` avec 10 catches biaisées vent léger → insight vent positif
    - Test `computePersonalMultiplier` avec 4 catches → multiplier = 1.0 (neutre, pas assez)
    - Test `computePersonalMultiplier` avec 20 catches vent léger dominant → wind > 1.0
    - Test multiplicateur cap (force un cas qui devrait dépasser 1.6 → 1.6 max)

11. Créer `lib/scoring/__tests__/scoring-integration.test.ts` :
    - Test `scoreWindow` sans multiplier → identique au sprint 6 (régression)
    - Test `scoreWindow` avec multiplier neutre (tout à 1.0) → identique au sprint 6
    - Test `scoreWindow` avec multiplier vent fort (1.5) en conditions vent léger → score monte
    - Test que `factors.reasons` contient "Personnalisé" quand l'impact est ≥ 5 pts

────────────────────────────────────────────────────────────────────────
TESTS À FAIRE
────────────────────────────────────────────────────────────────────────

1. `pnpm test lib/scoring` → 100% green
2. `pnpm typecheck` → 0 erreur
3. Smoke test manuel :
   - Crée `scripts/scoring-smoke.ts` :
     * Mock 15 catches : 10 en vent léger 5-15 km/h, 5 en vent fort 30+ km/h
     * Toutes les prises vent léger : length 40-50 cm. Vent fort : 25-30 cm.
     * Appelle computePersonalProfile → affiche insights
     * Appelle scoreWindow avec et sans multiplier perso → compare les deux scores
   - `pnpm tsx scripts/scoring-smoke.ts`
   - Vérifie : insight "Vent léger" positif visible, multiplicateur vent > 1.0, score vent-léger > score vent-fort dans les deux cas (mais plus différencié avec multiplier)

────────────────────────────────────────────────────────────────────────
COMMITS
────────────────────────────────────────────────────────────────────────

- feat(scoring): types + config pour scoring personnalisé
- feat(scoring): catch-analysis — bucketing + stats
- feat(scoring): computeInsights + computePersonalMultiplier
- feat(solunar): intégration multiplicateur perso dans scoreWindow
- test(scoring): tests unitaires catch-analysis + insights + intégration

NE PUSH PAS. Préviens-moi quand c'est commité, je relirai.

────────────────────────────────────────────────────────────────────────
NOTES POUR TOI (CLAUDE CODE)
────────────────────────────────────────────────────────────────────────

- Si la table `catches` n'a pas de colonne `tide_state` ou `wind_speed_kmh` : ARRÊTE-TOI et previens-moi. On fera une migration Supabase avant de continuer.
- Les formules de multiplicateur sont intentionnellement simples. Ne cherche pas à les optimiser statistiquement — on les calibrera post-beta avec de vraies données.
- TypeScript strict : pas de `any`. Si tu galères sur un type DB, utilise `unknown` + type guard.
- Ne change pas l'interface publique de `scoreWindow` de façon breaking — le paramètre `personalMultiplier` doit être optionnel pour que tout le code sprint 6 continue de compiler sans changement.
```

---

## ▶ Phase 2 — Cache + Server Action personnalisée

> **Budget Claude Code** : 0.5-1 jour
> **Difficulté** : easy-medium (cache + pipeline)
> **Pré-requis** : phase 1 mergée

**Copie-colle dans Claude Code :**

```
Contexte : sprint 7 phase 2. Phase 1 a livré la couche analytique `lib/scoring/`. Maintenant on expose ce calcul côté serveur avec un cache raisonnable et on enrichit la Server Action `getSpotNextWindow` pour utiliser le multiplicateur personnel quand l'user est loggé.

────────────────────────────────────────────────────────────────────────
PARTIE 2A — Fetch des catches pour le profil perso (~1 h)
────────────────────────────────────────────────────────────────────────

1. Créer `lib/scoring/personal-fetcher.ts` :

   a. `async function fetchUserCatches(userId: string, supabase): Promise<DbCatch[]>`
      - Query : `catches` WHERE `user_id = userId` ORDER BY `caught_at DESC`
      - Sélectionne : `id, caught_at, length_cm, wind_speed_kmh, wind_direction_deg, tide_state, spot_id`
      - Pas de limite (on veut tout l'historique). Si la table grossit (> 1000 rows), on limitera plus tard.
      - Gère l'erreur Supabase proprement (return [] si erreur, ne pas planter le rendering)

   b. `async function fetchAndComputePersonalProfile(userId: string, supabase): Promise<PersonalProfile>`
      - Appelle fetchUserCatches
      - Appelle computePersonalProfile (de phase 1)
      - Retourne le profil

2. Cache via `unstable_cache` de Next.js :
   - Wrapping de `fetchAndComputePersonalProfile` dans `getCachedPersonalProfile(userId)` :
     ```ts
     import { unstable_cache } from 'next/cache'

     export const getCachedPersonalProfile = (userId: string) =>
       unstable_cache(
         () => fetchAndComputePersonalProfile(userId, await createClient()),
         [`personal-profile-${userId}`],
         { revalidate: 86400 }  // 24h — TTL du PERSONAL_SCORING_CONFIG
       )()
     ```
   - Clé de cache : `personal-profile-{userId}` (pas besoin de l'heure — l'analyse change lentement)
   - Invalidation : quand une nouvelle catch est loggée → `revalidatePath` ou `revalidateTag`

3. Invalidation du cache au log d'une nouvelle catch :
   - Dans `app/(app)/carnet/nouvelle/actions.ts` (Server Action qui crée une catch) :
     * Après le insert Supabase : `revalidateTag('personal-profile')` (si tu utilises les tags) OU `revalidatePath('/profil')` (plus simple)
     * Le but : que le prochain accès au profil re-calcule le profil avec la nouvelle prise

────────────────────────────────────────────────────────────────────────
PARTIE 2B — Server Action enrichie pour solunar personnalisé (~2 h)
────────────────────────────────────────────────────────────────────────

4. Modifier `app/actions/solunar.ts` (Server Action `getSpotNextWindow` du sprint 6) :
   - Ajoute un paramètre optionnel `userId?: string`
   - Si userId fourni :
     * Appelle `getCachedPersonalProfile(userId)` → `profile`
     * Si `profile.multiplier.basedOnCatches >= MIN_CATCHES_FOR_MULTIPLIER` : passe `personalMultiplier` à `computeWeeklyForecast`
     * Sinon : behavior sprint 6 inchangé
   - Modifie `computeWeeklyForecast` pour accepter `personalMultiplier?: PersonalMultiplier` (passe-le à `computeDailyForecast` → `scoreWindow`)
   - Rétrocompatibilité : si `userId` non fourni → comportement sprint 6 identique (pas de régression pour les pages qui n'ont pas encore le userId)

5. Modifier `components/spots/SpotBestMomentsSection.tsx` (phase 3 du sprint 6) :
   - Le composant reçoit déjà `weekly: DailyForecast[]` depuis le Server Component parent
   - Ajouter : si les windows ont `factors.reasons` contenant "Personnalisé" : ajouter un badge discret "⚡ Perso" sur la BestMomentCard
   - Pas de changement de l'interface `weekly: DailyForecast[]` — les données personnalisées arrivent déjà dans les scores

6. Modifier `app/(marketing)/spots/[slug]/page.tsx` :
   - `const user = await getUser()` (déjà fait normalement)
   - Si user : `const weekly = await computeWeeklyForecast(..., user.id)` (en passant l'userId)
   - Si pas user : comportement sprint 6 (weekly générique)

────────────────────────────────────────────────────────────────────────
TESTS À FAIRE
────────────────────────────────────────────────────────────────────────

1. `pnpm typecheck` → 0 erreur
2. `pnpm dev`, compte test avec 10+ catches variées :
   - Va sur `/spots/{slug}` : les windows affichées ont des scores légèrement différents vs non loggé
   - Badge "⚡ Perso" visible sur les windows impactées par le multiplier
   - Va sur `/spots/{slug}` non loggé : comportement identique au sprint 6, pas de badge Perso
3. Performance : check que le `getCachedPersonalProfile` ne fait pas un fetch DB à chaque page visit (cache hit dans les logs Supabase)
4. Invalidation : log une nouvelle catch → reviens sur une fiche spot → le profil est re-calculé (le score peut avoir légèrement bougé si la nouvelle catch change les stats)

────────────────────────────────────────────────────────────────────────
COMMITS
────────────────────────────────────────────────────────────────────────

- feat(scoring): fetchAndComputePersonalProfile + cache 24h
- feat(solunar): getSpotNextWindow accepte userId pour scoring perso
- feat(spots): badge Perso sur les BestMomentCards impactées
- feat(carnet): invalidation cache profil perso au log d'une catch

NE PUSH PAS.

────────────────────────────────────────────────────────────────────────
NOTES POUR TOI (CLAUDE CODE)
────────────────────────────────────────────────────────────────────────

- Le passage du multiplier de Server Action → computeWeeklyForecast → computeDailyForecast → scoreWindow implique de modifier plusieurs signatures de fonctions. Fais-le proprement en TypeScript strict (paramètre optionnel partout) sans casser les appels existants.
- Si la Server Action `getSpotNextWindow` du sprint 6 est déjà cachée par `(spotId, hourKey)`, ajoute `userId` à la clé de cache. Sinon deux users différents sur le même spot partagent le même résultat.
- `unstable_cache` préfixé "unstable" car l'API Next.js peut changer — c'est quand même la solution recommandée pour les Server Components jusqu'à Next.js 15+.
```

---

## ▶ Phase 3 — UI Insights sur /profil

> **Budget Claude Code** : 1 jour
> **Difficulté** : medium (data viz légère + empty states)
> **Pré-requis** : phases 1+2 mergées

**Copie-colle dans Claude Code :**

```
Contexte : sprint 7 phase 3. Phases 1+2 livrées. Maintenant on expose les insights à l'utilisateur dans la section /profil. L'objectif UX : que l'utilisateur comprenne en 10 secondes "pourquoi le scoring est personnalisé pour moi" et "quelles conditions je dois cibler".

────────────────────────────────────────────────────────────────────────
PARTIE 3A — Composant InsightCard (~1-2 h)
────────────────────────────────────────────────────────────────────────

1. Créer `components/scoring/InsightCard.tsx` (Server Component possible) :
   - Props : `insight: PersonalInsight`
   - Layout (card compacte ~80px de hauteur) :
     ```
     ┌────────────────────────────────────────────────┐
     │ 💨  Vent léger (5-15 km/h)          [✅ Positif] │
     │     72% de tes meilleures prises                │
     │     Basé sur 8 sessions             [medium]    │
     └────────────────────────────────────────────────┘
     ```
   - Icônes par facteur (Lucide) : vent → `Wind`, marée → `Waves`, heure → `Clock`, saison → `Leaf`
   - Couleur selon `isPositive` :
     * true : fond vert teal-50, texte teal-700, badge vert
     * false : fond amber-50, texte amber-700, badge amber (condition à éviter)
   - Badge confidence :
     * 'low' : texte gris discret "Peu de données (X prises)"
     * 'medium' : texte gris neutre "Basé sur X prises"
     * 'high' : texte teal-600 "Confirmé sur X prises"
   - Accessibilité : `aria-label="Insight pêche : {label}, {isPositive ? 'favorable' : 'défavorable'}, {description}"`

2. Variante mini `InsightChip.tsx` (une ligne) pour le tooltip de BestMomentCard :
   - `💨 Vent léger — 72% de tes bonnes prises`
   - Utilisé dans le tooltip/popover des windows solunar sur les fiches spots

────────────────────────────────────────────────────────────────────────
PARTIE 3B — Composant PersonalScoreSection (~2 h)
────────────────────────────────────────────────────────────────────────

3. Créer `components/scoring/PersonalScoreSection.tsx` (Client Component pour la grille de multiplicateurs) :
   - Props : `profile: PersonalProfile`
   - Sections :

   **Header** :
   - Titre : "Ton profil de pêcheur"
   - Sous-titre : "Basé sur {basedOnCatches} prises loguées"
   - Si `!profile.hasEnoughData` : message "Logue {MIN_CATCHES - actual} prises de plus pour débloquer tes insights perso 🎣" + empty state illustré (SVG simple ou emoji)

   **Grille multiplicateurs** (si `basedOnCatches >= MIN_CATCHES_FOR_MULTIPLIER`) :
   - 3 jauges visuelles côte à côte :
     * Vent : `{(multiplier.wind).toFixed(1)}×` avec une barre de progression (0.6 = rouge, 1.0 = gris, 1.6 = teal)
     * Marée : idem avec `multiplier.tide`
     * Horaires : idem avec `multiplier.solunar`
   - Label sous chaque jauge : "Vent" / "Marée" / "Horaires"
   - Tooltip sur chaque jauge : explication simple ("Un multiplicateur > 1 signifie que ce facteur est plus discriminant pour toi que la moyenne")
   - Composant `MultiplierGauge` réutilisable (barre horizontale, 0.6 → 1.0 → 1.6 avec interpolation couleur)

   **Liste des insights** (si `hasEnoughData`) :
   - Grid 1 col mobile / 2 cols desktop
   - Les cards positive en premier, negative ensuite
   - Max 6 InsightCard (limité en computeInsights — phase 1)

   **Empty state si pas de données** :
   ```
   ┌──────────────────────────────────────────┐
   │          🎣                              │
   │   Pas encore assez de données            │
   │   Logue 3 prises pour débloquer          │
   │   tes insights personnalisés             │
   │                                          │
   │   [Logger une prise →]                   │
   └──────────────────────────────────────────┘
   ```

────────────────────────────────────────────────────────────────────────
PARTIE 3C — Intégration dans /profil (~1 h)
────────────────────────────────────────────────────────────────────────

4. Modifier `app/(app)/profil/page.tsx` (ou équivalent, vérifie le path exact) :
   - Server Component : `const profile = await getCachedPersonalProfile(user.id)`
   - Passe `profile` à `<PersonalScoreSection profile={profile} />`
   - Insertion dans le layout /profil :
     * Au-dessus de la liste de catches (section vedette, premier contenu de valeur après le header)
     * Ordre suggéré : Header profil → **PersonalScoreSection** → Catches récentes → Paramètres

5. Skeleton loading pour PersonalScoreSection :
   - Server Component fetchant pendant le SSR : pas de skeleton nécessaire (le fetch est dans le Server Component)
   - MAIS si tu utilises `<Suspense>` pour defer le rendu : crée un `PersonalScoreSkeleton` (3 rectangles arrondis gris animés)

────────────────────────────────────────────────────────────────────────
PARTIE 3D — Tooltip enrichi sur BestMomentCard (~1 h)
────────────────────────────────────────────────────────────────────────

6. Modifier `components/solunar/BestMomentCard.tsx` (sprint 6) :
   - Si `window.factors.reasons` contient des entrées liées au scoring perso (ex: "Personnalisé sur tes X prises") : ajouter une section dans le contenu de la card :
     ```
     ┌──────────────────────────────────────┐
     │ 07:39 - 09:39              [88]      │
     │ Très Bonne                  ⚡        │  ← badge Perso si applicable
     │ ⓘ Lever de lune · Marée montante     │
     │ ─────────────────────────────────    │
     │ 💨 Vent léger — 72% de tes prises    │  ← InsightChip personnalisé
     └──────────────────────────────────────┘
     ```
   - L'InsightChip n'apparaît que si :
     a. L'user est loggé
     b. `profile.basedOnCatches >= MIN_CATCHES_FOR_MULTIPLIER`
     c. L'insight correspondant à la condition actuelle est disponible dans `profile.insights`
   - Passe `relevantInsight?: PersonalInsight` en prop optionnel sur BestMomentCard

7. Matching insight → window :
   - Helper `findRelevantInsight(window: FishingWindow, insights: PersonalInsight[]): PersonalInsight | null` dans `lib/scoring/insights-matcher.ts`
   - Logique simplifiée : regarde `window.factors.wind` score → si > 0.7 (conditions de vent favorable) et qu'il y a un insight vent positif → retourne l'insight vent
   - Idem pour marée
   - Si plusieurs insights correspondent : retourne le plus significatif (catchRate le plus haut)

────────────────────────────────────────────────────────────────────────
TESTS À FAIRE
────────────────────────────────────────────────────────────────────────

1. `pnpm typecheck` → 0 erreur
2. `pnpm dev`, compte avec 2 catches (pas assez) :
   - /profil → PersonalScoreSection visible avec empty state "Logue X prises de plus"
   - Bouton CTA "Logger une prise" fonctionne
3. Compte avec 10+ catches variées :
   - Jauges multiplicateurs visibles (3 barres)
   - Insights positifs en premier, négatifs ensuite
   - Badge confidence correct (low/medium/high selon le count)
4. Sur une fiche spot loggé avec multiplicateur actif :
   - Badge "⚡ Perso" visible sur les windows impactées
   - InsightChip dans la card (si matching insight)
5. Non loggé ou 0 catches : aucun élément personnalisé visible sur la fiche spot, comportement sprint 6
6. Mobile :
   - InsightCards lisibles pleine largeur
   - Jauges multiplicateurs lisibles (pas tronquées)
   - Tooltip InsightChip accessible au tap (pas seulement au hover)

────────────────────────────────────────────────────────────────────────
COMMITS
────────────────────────────────────────────────────────────────────────

- feat(scoring): composant InsightCard + InsightChip
- feat(scoring): composant PersonalScoreSection avec jauges multiplicateurs
- feat(profil): intégration PersonalScoreSection dans /profil
- feat(solunar): BestMomentCard enrichie avec InsightChip perso
- feat(scoring): helper findRelevantInsight pour matching window↔insight

NE PUSH PAS.

────────────────────────────────────────────────────────────────────────
NOTES POUR TOI (CLAUDE CODE)
────────────────────────────────────────────────────────────────────────

- La jauge MultiplierGauge avec interpolation couleur peut être une barre SVG simple ou Tailwind background gradient. Pas besoin de Recharts pour ça — évite d'alourdir le bundle pour trois rectangles.
- Le tooltip sur la BestMomentCard doit fonctionner au tap mobile (pas seulement au hover desktop). Utilise le pattern Radix/shadcn Tooltip avec trigger au touch.
- Si le chemin de /profil est en réalité `/app/profil` ou `/settings/profil`, adapte — vérifie le filesystem avant de modifier.
- Pour le matching insight → window : le matcher est approximatif (on regarde les scores factors, pas les conditions météo réelles de la window). C'est délibéré pour cette v1 — on affinera post-beta avec de vraies corrélations.
```

---

## ▶ Phase 4 — Spot scores colorisés sur la carte (4C du sprint 6 reporté)

> **Budget Claude Code** : 1 jour
> **Difficulté** : medium (cron + table DB + websocket-less live update)
> **Pré-requis** : phases 1+2+3 mergées. **Nécessite une migration DB.**

**Copie-colle dans Claude Code :**

```
Contexte : sprint 7 phase 4. Phases 1-3 livrées. Cette phase = le "4C skippé" du sprint 6 (markers colorisés par qualité actuelle sur la carte). On a maintenant la table de profil perso pour le personaliser ET une bonne compréhension du coût (N appels Open-Meteo). La solution propre = cron Edge Function qui pré-calcule et stocke les scores.

────────────────────────────────────────────────────────────────────────
PARTIE 4A — Migration DB table spot_scores (~30 min)
────────────────────────────────────────────────────────────────────────

1. Créer une nouvelle migration `supabase/migrations/007_spot_scores.sql` :
   ```sql
   CREATE TABLE IF NOT EXISTS spot_scores (
     id            uuid DEFAULT gen_random_uuid() PRIMARY KEY,
     spot_id       uuid NOT NULL REFERENCES spots(id) ON DELETE CASCADE,
     computed_at   timestamptz NOT NULL DEFAULT now(),
     valid_until   timestamptz NOT NULL,
     current_score integer NOT NULL CHECK (current_score BETWEEN 0 AND 100),
     current_quality text NOT NULL CHECK (current_quality IN ('faible','moyenne','bonne','tres_bonne','exceptionnelle')),
     next_window_start timestamptz,
     next_window_quality text,
     day_score     integer CHECK (day_score BETWEEN 0 AND 100),

     UNIQUE(spot_id)  -- une seule ligne par spot, upsert
   );

   -- Index pour lecture rapide par tous les spots
   CREATE INDEX IF NOT EXISTS spot_scores_spot_id_idx ON spot_scores(spot_id);
   CREATE INDEX IF NOT EXISTS spot_scores_valid_until_idx ON spot_scores(valid_until);

   -- RLS : lecture publique (les scores sont publics), écriture réservée au service role
   ALTER TABLE spot_scores ENABLE ROW LEVEL SECURITY;
   CREATE POLICY "spot_scores_read_all" ON spot_scores FOR SELECT USING (true);
   -- Pas de policy INSERT/UPDATE pour les users : seulement le cron via service role peut écrire
   ```

2. Appliquer la migration :
   ```
   pnpm supabase migration up
   ```
   Vérifie que la table est créée sans erreur.

────────────────────────────────────────────────────────────────────────
PARTIE 4B — Edge Function cron de pré-calcul (~2-3 h)
────────────────────────────────────────────────────────────────────────

3. Créer `supabase/functions/compute-spot-scores/index.ts` :
   - Déclenchée toutes les heures par pg_cron ou un cron Vercel (voir note ci-dessous)
   - Logique :
     ```ts
     // 1. Fetch tous les spots publics avec lat/lng
     const spots = await supabase.from('spots').select('id, lat, lng').eq('visibility', 'public')

     // 2. Pour chaque spot (en batch de 10 pour éviter de saturer Open-Meteo) :
     for (const batch of chunk(spots, 10)) {
       await Promise.all(batch.map(async (spot) => {
         // 2a. Fetch SpotForecast (déjà caché 1h par sprint 6)
         const forecasts = await fetchSpotForecastWeek(spot.lat, spot.lng)

         // 2b. Compute weekly (scoring générique, pas de multiplier perso ici)
         const weekly = await computeWeeklyForecast(today, spot.lat, spot.lng, forecasts)

         // 2c. Extraire la fenêtre actuelle (now) et le prochain créneau
         const currentWindow = findCurrentWindow(weekly)  // window dont [start, end] contient now()
         const nextWindow = getNextBestWindow(weekly)

         // 2d. Upsert dans spot_scores
         await supabase.from('spot_scores').upsert({
           spot_id: spot.id,
           computed_at: new Date().toISOString(),
           valid_until: new Date(Date.now() + 3600000).toISOString(),  // +1h
           current_score: currentWindow?.score ?? 0,
           current_quality: currentWindow?.quality ?? 'faible',
           next_window_start: nextWindow?.startTimeISO,
           next_window_quality: nextWindow?.quality,
           day_score: weekly[0].dayScore,
         }, { onConflict: 'spot_id' })
       }))
     }
     ```

   - Gestion d'erreur : si un spot fail (Open-Meteo timeout), log l'erreur et continue le batch. Ne pas planter l'intégralité du cron.
   - Logging : `console.log(`Spot scores computed: ${spots.length} spots in ${elapsed}ms`)` à la fin.

4. Choix du déclencheur cron :
   - **Option A** (recommandée si projet sur Vercel) : Vercel Cron Job dans `vercel.json` :
     ```json
     {
       "crons": [{ "path": "/api/crons/compute-spot-scores", "schedule": "0 * * * *" }]
     }
     ```
     + Route `app/api/crons/compute-spot-scores/route.ts` qui vérifie `CRON_SECRET` header et appelle la logique
   - **Option B** : `pg_cron` dans Supabase (extension disponible sur projets Pro) : `SELECT cron.schedule('compute-spot-scores', '0 * * * *', 'SELECT net.http_post(...)');`
   - **Option C** : Supabase Edge Function scheduled (dans Dashboard → Edge Functions → Schedule)
   - Choisis l'option A si le projet est déjà sur Vercel (plus cohérent, pas d'extension Pro nécessaire). Documente ton choix.

────────────────────────────────────────────────────────────────────────
PARTIE 4C — Markers colorisés sur /carte (~2 h)
────────────────────────────────────────────────────────────────────────

5. Modifier `app/(marketing)/carte/page.tsx` (Server Component) :
   - Après le fetch des spots : join avec `spot_scores` :
     ```ts
     const { data: scores } = await supabase
       .from('spot_scores')
       .select('spot_id, current_quality, current_score, next_window_start')
       .gt('valid_until', new Date().toISOString())  // seulement les scores frais
     ```
   - Mappe les scores sur les SpotMarker (ajoute `currentQuality?: QualityLevel` sur SpotMarker)
   - Si spot sans score (cron pas encore passé ou spot récemment ajouté) : `currentQuality = undefined` → marker gris neutre

6. Modifier `components/map/MapView.tsx` :
   - Accepte `currentQuality?: QualityLevel` dans SpotMarker
   - Couleur du marker selon la qualité :
     * undefined / faible : gray-400
     * moyenne : amber-500
     * bonne : lime-500
     * tres_bonne : teal-500
     * exceptionnelle : emerald-600 + animation ping CSS subtle
   - Pas de changement de la popup (SpotPopup reste inchangé)

7. Légende qualité :
   - Composant `MapLegend` positionné en bas à gauche de la carte (desktop) ou masqué sur mobile (pas assez de place) :
     ```
     ⬤ Exceptionnelle  ⬤ Très Bonne  ⬤ Bonne  ⬤ Moyenne  ⬤ Faible
     ```
   - Position : `fixed bottom-24 left-4 z-20` (au-dessus des FAB de géoloc si mobile)

────────────────────────────────────────────────────────────────────────
TESTS À FAIRE
────────────────────────────────────────────────────────────────────────

1. Migration appliquée sans erreur : `pnpm supabase migration up`
2. Déclenche le cron manuellement (via `curl http://localhost:3000/api/crons/compute-spot-scores -H "Authorization: Bearer $CRON_SECRET"`)
   - Table `spot_scores` peuplée (N rows = N spots publics)
   - `valid_until` dans ~1h
   - `current_score` dans [0, 100]
3. /carte loggé : markers colorisés selon la qualité actuelle
4. Un marker exceptionnelle : animation ping visible
5. Légende visible en bas à gauche (desktop)
6. Spots sans score (valid_until expiré) : marker gris, pas de crash
7. Performance : /carte ne charge pas plus lentement (le join spot_scores est une simple query, pas de calcul)

────────────────────────────────────────────────────────────────────────
COMMITS
────────────────────────────────────────────────────────────────────────

- feat(db): migration 007 table spot_scores
- feat(cron): compute-spot-scores Edge Function / Vercel Cron
- feat(carte): markers colorisés par qualité actuelle
- feat(carte): légende qualité en bas à gauche
- feat(map): SpotMarker accepte currentQuality

NE PUSH PAS.

────────────────────────────────────────────────────────────────────────
NOTES POUR TOI (CLAUDE CODE)
────────────────────────────────────────────────────────────────────────

- Si le projet est sur le plan Vercel gratuit, les cron jobs sont limités à 2/jour (pas toutes les heures). Dans ce cas : schedule `0 */3 * * *` (toutes les 3h) et `valid_until = +3h`. Documente ce choix.
- Le cron ne calcule PAS le scoring perso (multiplier user) — seulement le générique. Les markers colorisés = vue publique, pas personnalisée. Le scoring perso reste côté fiche spot uniquement.
- Si `computeWeeklyForecast` est trop lent pour N=200 spots (chaque appel = 400-600ms Open-Meteo), bascule sur un fetch groupé ou ajoute un délai entre batches. Objectif : cron complet en < 5 min pour 200 spots.
- Si la migration échoue à cause d'un conflit de numérotation (si 007 est déjà pris), adapte le numéro et préviens-moi.
```

---

## ▶ Phase 5 — Tests E2E + récap + push final

> **Budget Claude Code** : 0.5 jour
> **Difficulté** : easy (consolidation)
> **Pré-requis** : phases 1-4 toutes commitées localement, ZÉRO commit pushé

**Copie-colle dans Claude Code :**

```
Contexte : sprint 7 phase 5 — finale. Phases 1-4 commitées en local. On consolide, teste, récap, push.

────────────────────────────────────────────────────────────────────────
PARTIE 5A — Vérifications automatisées (~30 min)
────────────────────────────────────────────────────────────────────────

1. `pnpm typecheck` → 0 erreur
2. `pnpm lint` → 0 erreur
3. `pnpm test lib/scoring lib/solunar` → 100% green (inclut les tests de régression sprint 6)
4. `pnpm build` → succès
   - Cibles bundles First Load JS (ne doivent pas régresser par rapport au sprint 6) :
     * /spots/[slug] : ≤ 265 kB (ajout scoring perso léger)
     * /carte : ≤ 225 kB (join spot_scores = no JS ajouté)
   - Si dépassement de > 20 KB : vérifie que `lib/scoring/` n'est pas bundlé côté client

────────────────────────────────────────────────────────────────────────
PARTIE 5B — Smoke test structuré (~1-2 h)
────────────────────────────────────────────────────────────────────────

5. Setup :
   - Compte test-zero : loggé, 0 catches
   - Compte test-few : loggé, 2 catches (< MIN)
   - Compte test-full : loggé, 10+ catches variées (vent + marée + heures différents)
   - Compte anonyme : non loggé

6. Scénario A — Profil (test-zero) :
   - /profil → PersonalScoreSection avec empty state "Logue X prises de plus"
   - CTA "Logger une prise" fonctionne
   - Aucune jauge ni insight visible

7. Scénario B — Profil (test-few, 2 catches) :
   - /profil → empty state "1 prise de plus" (car MIN = 3)
   - Toujours pas d'insights

8. Scénario C — Profil (test-full, 10+ catches) :
   - Jauges multiplicateurs visibles et cohérentes (aucune à 1.0 exactement = personnalisé)
   - Au moins 2 insights affichés
   - Insights positifs avant négatifs
   - Badge confidence "Basé sur X prises" visible sous chaque insight

9. Scénario D — Fiche spot (test-full) :
   - /spots/{slug} → certaines windows ont le badge "⚡ Perso"
   - InsightChip visible sur les windows concernées
   - Survol (desktop) ou tap (mobile) de l'InsightChip affiche le détail

10. Scénario E — Fiche spot (test-zero / anonyme) :
    - /spots/{slug} → aucun badge Perso, aucun InsightChip
    - Comportement identique au sprint 6 (régression check)

11. Scénario F — Carte (après avoir manuellement déclenché le cron) :
    - /carte → markers colorisés (au moins quelques couleurs différentes si 10+ spots en DB)
    - Légende visible desktop
    - Spots sans score → markers gris (pas de crash)

12. Scénario G — Log d'une nouvelle catch (test-few) :
    - Log une 3ème catch depuis /carnet/nouvelle
    - Va sur /profil → PersonalScoreSection maintenant affiche les données (premier calcul)
    - Si l'invalidation du cache fonctionne correctement : immédiat. Sinon : attendre < 24h (cache TTL)

13. Scénario H — Régressions sprint 6 :
    - /spots/{slug} non loggé : identique au sprint 6
    - /carte non loggé : identique au sprint 6 (sauf markers colorisés — feature ajoutée)
    - TideChart sprint 6 : toujours OK
    - WeeklyCalendar sprint 6 : toujours OK
    - SpotPopup sprint 6 : toujours OK
    - Auth : login/logout toujours fonctionnel

────────────────────────────────────────────────────────────────────────
PARTIE 5C — Récap structuré pour John (~30 min)
────────────────────────────────────────────────────────────────────────

14. Génère `docs/sprint-7/RECAP.md` avec :

    **A. Fichiers créés** :
    - lib/scoring/ : types.ts, personal-config.ts, catch-analysis.ts, insights.ts (computeInsights + multiplier), personal-fetcher.ts, insights-matcher.ts
    - lib/scoring/__tests__/ : catch-analysis.test.ts, insights.test.ts, scoring-integration.test.ts
    - components/scoring/ : InsightCard.tsx, InsightChip.tsx, PersonalScoreSection.tsx, MultiplierGauge.tsx
    - supabase/migrations/007_spot_scores.sql
    - supabase/functions/compute-spot-scores/index.ts (OU app/api/crons/compute-spot-scores/route.ts)

    **B. Fichiers modifiés** :
    - lib/solunar/scoring.ts (paramètre personalMultiplier optionnel)
    - lib/solunar/index.ts (propagation personalMultiplier)
    - app/actions/solunar.ts (enrichissement avec userId)
    - app/(marketing)/spots/[slug]/page.tsx (passage userId)
    - app/(marketing)/carte/page.tsx (join spot_scores)
    - components/spots/SpotBestMomentsSection.tsx (badge Perso)
    - components/solunar/BestMomentCard.tsx (InsightChip)
    - components/map/MapView.tsx (markers colorisés)
    - app/(app)/carnet/nouvelle/actions.ts (invalidation cache profil)
    - app/(app)/profil/page.tsx (PersonalScoreSection)

    **C. Packages ajoutés** :
    - Aucun (pur TypeScript + SQL)

    **D. Migrations DB** :
    - 007_spot_scores.sql : table spot_scores + index + RLS

    **E. Décisions notables prises seul** :
    - Formules de multiplicateur (justification des choix)
    - Choix du déclencheur cron (Vercel / pg_cron / Edge Function + pourquoi)
    - Matching insight → window (approche approximative, pourquoi)
    - Cache 24h pour le profil perso (vs 1h pour le solunar générique)
    - Scoring perso ≠ scoring markers carte (générique pour carte, perso uniquement sur les fiches spots)

    **F. Flaggé pour plus tard** :
    - Affinement des formules de multiplicateur sur vraies données post-beta
    - Scoring perso sur les markers carte (aujourd'hui générique)
    - Score de satisfaction 1-5 sur les catches (sprint 8+) pour mieux noter les "bonnes" prises
    - Corrélations avancées : espèce par espèce, spot par spot
    - Alertes push "Tes conditions idéales sont actives demain" (sprint 12+ mobile)
    - Tests E2E Playwright sur le flow log catch → profil mis à jour (sprint 11)

    **G. Métriques** :
    - Bundle First Load JS par route (vs sprint 6)
    - Temps de calcul computePersonalProfile (doit rester < 5 ms pour 100 catches)
    - Temps cron compute-spot-scores pour N spots
    - Couverture tests lib/scoring (cible 80%+)

    **H. Tests skippés** :
    - Device physique iOS (pas d'app mobile)
    - Validation des multiplicateurs contre des données réelles (à faire post-beta)
    - Performance du cron avec 1000+ spots (hors périmètre v1)

────────────────────────────────────────────────────────────────────────
PARTIE 5D — Push + monitoring (~30 min)
────────────────────────────────────────────────────────────────────────

15. Affiche le récap à John, attends son OK.

16. Si OK :
    ```
    git push origin main
    ```

17. Vercel auto-deploy → surveille build success.
    - Après deploy : déclenche manuellement le cron une fois pour peupler spot_scores en prod.
    - Smoke test prod rapide (1 scénario par tier).

18. Si rouge : rollback ou hotfix selon criticité.

────────────────────────────────────────────────────────────────────────
LIVRABLE FINAL
────────────────────────────────────────────────────────────────────────

- Sprint 7 sur main, déployé sur Vercel
- /profil affiche les insights perso + jauges multiplicateurs (si ≥ 3 catches)
- /spots/[slug] affiche les scores personnalisés + InsightChips (si user loggé avec assez de data)
- /carte affiche les markers colorisés par qualité actuelle (générique, actualisés toutes les heures)
- Lib `lib/scoring/` testée, 80%+ couverture
- Pas de régression sprint 4, 5, 6 (carte, conditions, solunar)
- Récap dans docs/sprint-7/RECAP.md

Si quoi que ce soit n'est pas vert : NE PUSH PAS, corrige d'abord.
```

---

## Notes pour John

### Budget temps cumulé

| Phase | Sujet | Budget Claude Code | Difficulté |
|---|---|---|---|
| 0 | Setup + décisions | 15 min (toi) | easy |
| 1 | Analyse statistique catches (lib pure) | 1-1.5 jour | medium |
| 2 | Cache + Server Action enrichie | 0.5-1 jour | easy-medium |
| 3 | UI Insights sur /profil | 1 jour | medium |
| 4 | Markers colorisés carte (4C reporté) | 1 jour | medium |
| 5 | Final + push | 0.5 jour | easy |
| **TOTAL** | | **~4-5 jours** | |

Sprint 7 comparable en durée au sprint 6. Estimation 1-2 semaines calendrier à raison de 3-4h de Claude Code par jour.

### Ce qui rend ce sprint différent des précédents

C'est le premier sprint qui **consomme les données loguées par l'utilisateur lui-même**. Les sprints 4-6 récupèrent des données externes (Open-Meteo, SunCalc) — ici on exploite ce que l'user a construit. L'effet réseau est unidirectionnel : plus tu pêches ET logues, meilleur est le scoring. C'est ton vrai avantage.

Implication pratique : **pour tester correctement, il faut des données de test réalistes**. Avant la phase 3, assure-toi d'avoir ≥ 10 catches seedées avec des conditions variées (vent différent, marée différente, heures différentes). Si la DB de dev est vide, dis-moi et je te génère un bloc SQL de seed réaliste.

### Pré-requis avant chaque phase

- **Phase 0** : sprint 6 mergé, `catches` table avec colonnes conditions
- **Phase 1** : phase 0 validée + colonnes DB confirmées
- **Phase 2** : phase 1 mergée + test que `computePersonalProfile` tourne sans erreur
- **Phase 3** : phase 2 mergée + ≥ 5 catches seedées pour tester les insights
- **Phase 4** : phase 3 mergée + **migration 007 applicable** (confirme avant de lancer)
- **Phase 5** : phases 1-4 commitées localement

### Décisions produit à trancher avant phase 1

La décision la plus importante : **quelle metric définit une "bonne prise" ?**

- **Option A (défaut, recommandée)** : `length_cm` si renseigné, sinon présence = 1 (toute prise comptée également)
- **Option B** : attendre le sprint 8 qui ajoute un champ `satisfaction 1-5` sur les catches, et utiliser ça comme metric

Si tu pars avec l'Option A maintenant, le code sera simple à adapter vers l'Option B post-sprint 8. C'est ce que suppose le brief ci-dessus.

### Mise en garde sur les multiplicateurs

Les formules de sprint 7 sont **intentionnellement naïves**. Avec seulement 3-10 catches, tout calcul statistique est peu fiable. C'est normal et voulu :

- Avec 3 catches : multiplicateurs très proches de 1.0 (presque neutres)
- Avec 20+ catches : les tendances commencent à être significatives
- Avec 100+ catches (post-beta) : le scoring est vraiment personnalisé

L'objectif sprint 7 c'est de poser les fondations techniques et de montrer à l'utilisateur que quelque chose existe. La précision viendra avec les données.

### Roadmap après sprint 7

D'après CLAUDE.md :
- Sprint 8 = Fil communautaire + signal social ("X prises ici ce week-end") → satisfaction rating sur les catches
- Sprint 9 = Paiements Stripe → vraie gating premium (les tiers sont en dur actuellement)
- Sprint 10 = Guides éditoriaux MDX → contenu SEO
- Sprint 11 = Polish + beta privée → Playwright E2E + Lighthouse audit
- Sprint 12+ = Mobile Expo

Le sprint 8 va **enrichir la qualité du scoring perso** en ajoutant le champ satisfaction — les multiplicateurs sprint 7 vont automatiquement devenir plus pertinents sans refactoring, juste en passant de `length_cm` à `satisfaction` dans la metric "bonne prise".
