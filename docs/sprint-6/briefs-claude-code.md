# Sprint 6 — "Meilleurs moments" solunar

> Brief découpé en **6 phases**. Chaque phase est un bloc copier-coller pour Claude Code (entre triples backticks). Donne-lui les phases dans l'ordre — chaque phase a ses propres commits et peut être validée + pushée avant la suivante.
>
> **Périmètre du sprint** : ajouter le calcul des "meilleurs moments" pour pêcher (fenêtres horaires de 2h avec score qualitatif + justification astronomique) ET un calendrier 7 jours par spot avec scoring quotidien. Match minimum la feature équivalente de spot-de-peche.com. Aucun appel API externe : tout est calculé à partir de suncalc (lever/coucher lune/soleil, phases lunaires) + données déjà cachées de Open-Meteo (marées + vent).
>
> **Ce sprint n'est PAS** : le scoring personnalisé "Tu pêches mieux quand…" (= sprint 7, basé sur l'historique catches de l'utilisateur). On reste sur du scoring générique solunar+conditions pour ce sprint. Le différenciateur personnalisé vient APRÈS.
>
> **Pré-requis** : sprint 4 mergé et pushé (carte + fiches spots avec conditions Open-Meteo opérationnelles). Helper `lib/conditions/spot-forecast.ts` existe et retourne `SpotForecast` avec marées + vent.

---

## ▶ Phase 0 — Setup + décisions produit (15 min — fait par toi)

> **Budget** : 15 min
> **Difficulté** : easy
> **Pré-requis** : sprint 4 mergé

### Partie 0A — Décisions produit à valider

Avant de lancer Claude Code, valide ces choix par défaut (ou dis-moi si tu veux changer) :

| Décision | Valeur par défaut proposée | Alternative possible |
|---|---|---|
| Échelle qualitative | 5 niveaux : Faible / Moyenne / Bonne / Très Bonne / Exceptionnelle | 4 niveaux à la spot-de-peche |
| Durée fenêtre | 2 heures, centrée sur l'événement solunar | 1h30, 3h |
| Max fenêtres par jour | 6 (déduplication si overlap > 50%) | 4 ou 8 |
| Pondération scoring | 40% solunar + 35% marée + 25% vent | Ajustable par data plus tard |
| Plage horaire fenêtres | 04:00 à 23:00 (skip la nuit profonde) | 24h/24 |
| Seuils qualitatifs | Faible 0-39 / Moyenne 40-59 / Bonne 60-74 / Très Bonne 75-89 / Exceptionnelle 90-100 | À tuner après tests |

Ces valeurs sont **modifiables a posteriori** via constantes dans `lib/solunar/config.ts`. On peut tuner après tests.

### Partie 0B — Vérifier les pré-requis du sprint 4

Avant de lancer Claude Code, confirme :
- [ ] `lib/conditions/spot-forecast.ts` existe et retourne `SpotForecast` avec `tide.points[]` (24 entrées horaires) + `weather.windSpeed_kmh` + `weather.windDirection_deg`
- [ ] La fiche spot `/spots/[slug]` affiche déjà les sections TideChart + WeatherGrid + WavesCard
- [ ] Le sprint 4 est sur `main` (pas sur une branche en cours)

Si un de ces points est manquant, ALERTE-MOI avant la phase 1 — on ajustera.

### Partie 0C — Pas d'API externe nécessaire

Bonne nouvelle : suncalc est une lib pure JS (~20 KB), pas d'API key, pas de quota, fonctionne offline. Toute la complexité est dans le calcul + le scoring, pas dans l'infra.

### Checkpoint pré-phase 1

- [ ] Décisions produit Partie 0A validées (ou modifiées)
- [ ] Pré-requis 0B confirmés
- [ ] Sprint 4 stable en prod sur Vercel
- [ ] Prêt à donner le prompt phase 1

---

## ▶ Phase 1 — Engine solunar pur (lib + tests)

> **Budget Claude Code** : 1-1.5 jour
> **Difficulté** : medium (algorithmique, pas d'UI)
> **Pré-requis** : phase 0 OK

**Copie-colle dans Claude Code :**

```
Contexte : sprint 6 du Carnet de Pêche. Objectif global du sprint : ajouter la feature "Meilleurs moments" (fenêtres horaires 2h scorées Faible→Exceptionnelle avec justification astronomique) + calendrier 7 jours par spot. Match minimum de ce que fait spot-de-peche.com.

ATTENTION naming : ce sprint EST "sprint 6 (solunar)" dans la roadmap CLAUDE.md révisée. Ce n'est PAS le "sprint 7 (scoring personnalisé)" — qui viendra après et nécessite l'historique catches de l'utilisateur. Ici on fait du scoring générique basé sur solunar + conditions.

Cette phase 1 = la couche métier pure : aucun composant UI, aucune route, juste la lib `lib/solunar/` avec calcul des événements astronomiques + scoring des fenêtres. Le tout testable unitairement.

────────────────────────────────────────────────────────────────────────
PARTIE 1A — Dépendances + types de base (~30 min)
────────────────────────────────────────────────────────────────────────

1. Installer suncalc :
   ```
   pnpm add suncalc
   pnpm add -D @types/suncalc
   ```

2. Créer `lib/solunar/types.ts` :
   ```ts
   export type SolunarEventType =
     | 'sunrise' | 'sunset'
     | 'moonrise' | 'moonset'
     | 'moon_apex' | 'moon_nadir'  // transit / antitransit lunaire

   export type SolunarEvent = {
     type: SolunarEventType
     timeISO: string            // ex: "2026-05-20T06:23:00.000Z"
     localTime: string          // ex: "08:23" (formaté Europe/Paris)
     moonPhase?: number         // 0-1, seulement pour les events lune
     moonIllumination?: number  // 0-1
   }

   export type FishingWindow = {
     startTimeISO: string
     endTimeISO: string
     startLocal: string         // "07:39"
     endLocal: string           // "09:39"
     centerEvent: SolunarEvent  // L'événement central (lever lune, etc.)
     score: number              // 0-100
     quality: QualityLevel
     factors: ScoringFactors    // détail pour debug + tooltip
   }

   export type QualityLevel = 'faible' | 'moyenne' | 'bonne' | 'tres_bonne' | 'exceptionnelle'

   export type ScoringFactors = {
     solunar: number   // 0-1
     tide: number      // 0-1
     wind: number      // 0-1
     reasons: string[] // ex: ["Lever de lune", "Marée montante coef 84"]
   }

   export type DailyForecast = {
     date: string                // "2026-05-20" (local Paris)
     windows: FishingWindow[]    // typiquement 3-6, triés par startTimeISO
     dayScore: number            // 0-100 (max score des windows, ou pondéré)
     dayQuality: QualityLevel
     sunrise: string             // "06:23"
     sunset: string              // "21:42"
     moonPhaseLabel: string      // "Premier croissant", "Pleine lune", etc.
     moonIllumination: number    // 0-1
   }
   ```

3. Créer `lib/solunar/config.ts` (toutes les constantes ajustables) :
   ```ts
   export const SOLUNAR_CONFIG = {
     WINDOW_DURATION_HOURS: 2,        // ±1h autour de l'événement
     MAX_WINDOWS_PER_DAY: 6,
     OVERLAP_DEDUP_THRESHOLD: 0.5,    // 50% overlap = on garde la meilleure
     EARLIEST_HOUR: 4,                // pas de fenêtre avant 04:00 local
     LATEST_HOUR: 23,                 // pas de fenêtre après 23:00 local

     WEIGHTS: {
       solunar: 0.40,
       tide: 0.35,
       wind: 0.25,
     },

     QUALITY_THRESHOLDS: {
       faible: 0,
       moyenne: 40,
       bonne: 60,
       tres_bonne: 75,
       exceptionnelle: 90,
     },

     // Bonus solunar par type d'événement (utilisé pour calculer factors.solunar)
     SOLUNAR_WEIGHTS: {
       moon_apex: 1.0,    // transit lunaire = pic
       moon_nadir: 1.0,   // anti-transit = pic
       moonrise: 0.8,
       moonset: 0.8,
       sunrise: 0.6,
       sunset: 0.6,
     },

     // Bonus marée
     TIDE: {
       RISING_BONUS: 0.4,
       FALLING_BONUS: 0.2,
       SLACK_BONUS: 0.0,
       COEF_THRESHOLD_GOOD: 70,      // coef ≥ 70 = bon
       COEF_THRESHOLD_EXCEPTIONAL: 95, // coef ≥ 95 = exceptionnel
     },

     // Vent : pic à ~10 km/h, dégrade après 25
     WIND: {
       IDEAL_KMH: 10,
       ACCEPTABLE_MAX_KMH: 25,
       DEGRADATION_PER_KMH_ABOVE_IDEAL: 0.05,
     },
   } as const
   ```

────────────────────────────────────────────────────────────────────────
PARTIE 1B — Calcul des événements astronomiques (~2-3 h)
────────────────────────────────────────────────────────────────────────

4. Créer `lib/solunar/astronomy.ts` :
   - Fonction `getSolunarEvents(date: Date, lat: number, lng: number): SolunarEvent[]`
   - Utilise suncalc :
     * `SunCalc.getTimes(date, lat, lng)` → sunrise, sunset (+ dawn, dusk, nauticalDawn etc. dont on n'a pas besoin)
     * `SunCalc.getMoonTimes(date, lat, lng)` → moonrise, moonset
     * `SunCalc.getMoonPosition(date, lat, lng)` → altitude, azimuth, distance
     * `SunCalc.getMoonIllumination(date)` → fraction (0-1), phase
   - Pour moon_apex / moon_nadir : suncalc ne les expose pas directement. Algo :
     * Pour chaque demi-heure de la journée (48 samples), calcule l'altitude lune avec getMoonPosition
     * Le moon_apex = sample avec altitude max (locale, ≠ horizon)
     * Le moon_nadir = sample avec altitude min
     * Si moon_apex/nadir tombe entre EARLIEST_HOUR et LATEST_HOUR, retient-le ; sinon ignore
   - Output : tableau d'événements triés par timeISO
   - Inclus moonPhase + moonIllumination sur les events lune

5. Helper `getMoonPhaseLabel(phase: number): string` dans le même fichier :
   - 0 / 1 = "Nouvelle lune"
   - 0.0-0.125 = "Premier croissant"
   - 0.125-0.25 = "Premier quartier"
   - 0.25-0.375 = "Lune gibbeuse croissante"
   - 0.375-0.5 = "Pleine lune"
   - etc.

6. Gestion timezone :
   - Toutes les dates en entrée/sortie sont des Date JS (UTC interne)
   - Pour formater en local Europe/Paris : utilise `Intl.DateTimeFormat('fr-FR', { timeZone: 'Europe/Paris', hour: '2-digit', minute: '2-digit' }).format(date)`
   - Helper `formatLocalTime(date: Date): string` dans `lib/solunar/format.ts`

────────────────────────────────────────────────────────────────────────
PARTIE 1C — Scoring des fenêtres (~2-3 h)
────────────────────────────────────────────────────────────────────────

7. Créer `lib/solunar/scoring.ts` avec 3 fonctions de scoring atomic :

   a. `scoreSolunar(centerEvent: SolunarEvent): number` (0-1)
      - Lookup `SOLUNAR_WEIGHTS[centerEvent.type]`
      - Bonus si phase lunaire = 0 (nouvelle) ou 0.5 (pleine) : multiplier ×1.2 (cap à 1.0)

   b. `scoreTide(windowStartISO, windowEndISO, tidePoints, tideExtrema): number` (0-1)
      - tidePoints = de SpotForecast.tide.points (24 entrées horaires)
      - Détermine si la fenêtre est en marée montante / descendante / étale en regardant les valeurs de tidePoints sur le range de la fenêtre
      - Si pic de marée (extremum) dans la fenêtre : bonus
      - Récupère le coefficient (pas dispo direct dans tidePoints — calcul approximatif : range = max-min sur 24h, coef = (range / 13.5) * 120 grossier... ou utilise un coef passé en param depuis Open-Meteo si dispo)
      - Pour cette phase, si pas de coef fiable : ignore le coef, score juste sur l'état de marée. À améliorer plus tard.

   c. `scoreWind(windowStartISO, windowEndISO, windSpeed_kmh): number` (0-1)
      - Si vent < 5 km/h : 0.9 (un peu trop calme pour la pêche au leurre, idéal pour surfcasting)
      - 5-15 km/h : 1.0 (idéal pour leurre)
      - 15-25 km/h : décroissance linéaire de 1.0 à 0.5
      - 25-35 km/h : décroissance linéaire de 0.5 à 0.2
      - > 35 km/h : 0.1 (dangereux)
      - Note : on n'a qu'une valeur de vent moyenne pour la journée actuellement. À raffiner quand on aura du vent horaire.

8. Composer le scoring final :
   ```ts
   export function scoreWindow(
     centerEvent: SolunarEvent,
     windowStartISO: string,
     windowEndISO: string,
     forecast: SpotForecast
   ): { score: number; factors: ScoringFactors } {
     const solunar = scoreSolunar(centerEvent)
     const tide = scoreTide(windowStartISO, windowEndISO, forecast.tide.points, forecast.tide.extrema)
     const wind = scoreWind(windowStartISO, windowEndISO, forecast.weather.windSpeed_kmh)

     const score01 = (
       solunar * SOLUNAR_CONFIG.WEIGHTS.solunar +
       tide * SOLUNAR_CONFIG.WEIGHTS.tide +
       wind * SOLUNAR_CONFIG.WEIGHTS.wind
     )
     const score = Math.round(score01 * 100)

     const reasons: string[] = []
     // Construire les raisons :
     if (solunar > 0.7) reasons.push(formatEventReason(centerEvent))  // ex: "Lune au zénith"
     if (tide > 0.7) reasons.push("Marée favorable")  // affiner
     if (wind > 0.8) reasons.push("Vent idéal")
     // etc.

     return { score, factors: { solunar, tide, wind, reasons } }
   }
   ```

9. Helper `qualityFromScore(score: number): QualityLevel` :
   - Mapping direct via SOLUNAR_CONFIG.QUALITY_THRESHOLDS

────────────────────────────────────────────────────────────────────────
PARTIE 1D — Assemblage : DailyForecast complet (~1-2 h)
────────────────────────────────────────────────────────────────────────

10. Fonction principale `lib/solunar/index.ts` :
    ```ts
    export async function computeDailyForecast(
      date: Date,
      lat: number,
      lng: number,
      forecast: SpotForecast
    ): Promise<DailyForecast>
    ```
    - Récupère les events via `getSolunarEvents(date, lat, lng)`
    - Pour chaque event :
      * Calcule la fenêtre [event - 1h, event + 1h]
      * Si la fenêtre est hors plage [EARLIEST_HOUR, LATEST_HOUR] : skip
      * Appelle scoreWindow pour avoir score + factors
      * Crée un FishingWindow
    - Dédup overlap :
      * Trie windows par score décroissant
      * Pour chaque paire avec overlap > OVERLAP_DEDUP_THRESHOLD : garde celle avec le meilleur score
    - Tri final par startTimeISO ascendant
    - Limite à MAX_WINDOWS_PER_DAY
    - Calcule `dayScore` = max(windows.map(w => w.score)) (ou moyenne pondérée, à choisir)
    - Calcule `dayQuality` via qualityFromScore
    - Récupère sunrise/sunset/moonPhase pour les champs principaux

11. Wrapper 7 jours : `computeWeeklyForecast(startDate: Date, lat: number, lng: number, forecasts: SpotForecast[]): Promise<DailyForecast[]>` :
    - forecasts[i] = SpotForecast pour startDate + i jours
    - Map chaque jour vers computeDailyForecast
    - Note : Open-Meteo donne 7 jours en une seule requête, à toi de partitionner les data par jour côté `spot-forecast.ts` (si pas déjà fait, étend ce helper en phase 2)

────────────────────────────────────────────────────────────────────────
PARTIE 1E — Tests unitaires (~1-2 h)
────────────────────────────────────────────────────────────────────────

12. Crée `lib/solunar/__tests__/astronomy.test.ts` :
    - Test getSolunarEvents pour Pointe du Raz (48.04 N, -4.73 E) au 21 juin 2026 (solstice) :
      * sunrise vers 04h05 UTC
      * sunset vers 20h05 UTC
      * moon_apex vers... (à calculer)
    - Test getSolunarEvents pour Camargue (43.4 N, 4.4 E) au 21 décembre 2026 (solstice hiver)
    - Test getMoonPhaseLabel pour valeurs limites (0, 0.25, 0.5, 0.75, 1)

13. Crée `lib/solunar/__tests__/scoring.test.ts` :
    - Test scoreSolunar pour chaque type d'événement
    - Test scoreTide avec marée montante coef 80
    - Test scoreWind à 10, 20, 30, 50 km/h
    - Test scoreWindow avec un mock SpotForecast

14. Crée `lib/solunar/__tests__/index.test.ts` :
    - Test computeDailyForecast retourne 3-6 windows triées
    - Test dédup overlap (deux events proches → une seule fenêtre)
    - Test fenêtres hors plage horaire skippées

────────────────────────────────────────────────────────────────────────
TESTS À FAIRE
────────────────────────────────────────────────────────────────────────

1. `pnpm test lib/solunar` → 100% green
2. `pnpm typecheck` → 0 erreur
3. Smoke test manuel :
   - Crée un script `scripts/solunar-smoke.ts` qui appelle computeDailyForecast pour Pointe du Raz aujourd'hui + un mock SpotForecast minimal
   - `pnpm tsx scripts/solunar-smoke.ts` → affiche les windows dans la console
   - Vérifie que les heures locales sont cohérentes (sunrise ≈ 06h ou 04h selon saison)

────────────────────────────────────────────────────────────────────────
COMMITS
────────────────────────────────────────────────────────────────────────

- chore(deps): ajoute suncalc + types
- feat(solunar): types + config (constantes ajustables)
- feat(solunar): astronomy.ts — événements solaires/lunaires
- feat(solunar): scoring.ts — scoring solunar/tide/wind
- feat(solunar): index.ts — assemblage DailyForecast + dédup
- test(solunar): tests unitaires astronomy + scoring + index

NE PUSH PAS. Préviens-moi quand c'est commité, je relirai.

────────────────────────────────────────────────────────────────────────
NOTES POUR TOI (CLAUDE CODE)
────────────────────────────────────────────────────────────────────────

- Si suncalc ne donne pas un moonrise pour une date donnée (lune visible 24h en haute altitude polaire), retourne juste sans cet event. Ne plante pas.
- Le scoring du vent ne dépend pas vraiment de la fenêtre horaire (on a une seule valeur jour). Documente que c'est une simplification v1.
- Si tu trouves que mes formules de scoring donnent des résultats bizarres au smoke test (ex: tout est "Faible"), tune les WEIGHTS et préviens-moi des ajustements.
- TypeScript strict : pas de `any`. Si tu galères sur le typage de suncalc, regarde @types/suncalc ou crée un .d.ts ponctuel.
```

---

## ▶ Phase 2 — Composants UI standalone

> **Budget Claude Code** : 1 jour
> **Difficulté** : medium (responsive + a11y)
> **Pré-requis** : phase 1 mergée

**Copie-colle dans Claude Code :**

```
Contexte : sprint 6 phase 2. Phase 1 a livré la lib `lib/solunar/` avec computeDailyForecast + computeWeeklyForecast. Maintenant on crée les composants UI standalone (testables sans intégration). On les intégrera dans /spots/[slug] en phase 3.

Référence visuelle : voir docs/sprint-4/concurrent-spot-de-peche-screenshots/ si présent, sinon recall :
- Section "Pêche à la canne / Meilleurs moments" avec cards horizontales empilées
- Chaque card : range horaire (ex "07:39 - 09:39") + label qualitatif + badge raison astronomique + score
- Calendrier 7 jours : 7 cards horizontales, chacune avec date + score + label + icône météo

────────────────────────────────────────────────────────────────────────
PARTIE 2A — Composant BestMomentCard (~1-2 h)
────────────────────────────────────────────────────────────────────────

1. Créer `components/solunar/BestMomentCard.tsx` (Server Component possible) :
   - Props :
     ```ts
     type BestMomentCardProps = {
       window: FishingWindow
       isCurrent?: boolean  // highlight si fenêtre = "maintenant"
     }
     ```
   - Layout horizontal (mobile) ou compact (desktop) :
     ```
     ┌──────────────────────────────────────────┐
     │ 07:39 - 09:39                  [95]      │
     │ Très Bonne                               │
     │ ⓘ Lever de lune · Marée montante         │
     └──────────────────────────────────────────┘
     ```
   - Score : badge rond (40x40px) dans le coin haut droit, couleur selon quality :
     * Faible : gray-400
     * Moyenne : amber-500
     * Bonne : lime-500
     * Très Bonne : teal-500
     * Exceptionnelle : emerald-600 + animation pulse subtle
   - Label qualitatif en gras
   - Raisons astronomiques : icône info (i Lucide) + texte concaténé via ` · `
   - Si `isCurrent` : bordure teal-500 + label "Maintenant" en badge

2. Variante compacte `BestMomentRow` (pour usage dense dans tooltip / sidebar) :
   - Une seule ligne : `07:39 - 09:39 · Très Bonne · 95`
   - Pas de raisons, juste le score numérique

────────────────────────────────────────────────────────────────────────
PARTIE 2B — Composant DayBestMoments (~2 h)
────────────────────────────────────────────────────────────────────────

3. Créer `components/solunar/DayBestMoments.tsx` :
   - Props :
     ```ts
     type DayBestMomentsProps = {
       daily: DailyForecast
       showMoonInfo?: boolean  // affiche phase lunaire + illumination
     }
     ```
   - Layout :
     * Header : nom du jour + date complète ("Mardi 19 mai") + dayQuality badge global
     * Sub-header (si showMoonInfo) : "🌒 Premier croissant · 18% illuminée · Lever 04:23 · Coucher 16:42"
     * Liste de BestMomentCard empilées verticalement (gap 8px sur mobile, 12px desktop)
     * Si aucune window : empty state "Pas de créneau optimal aujourd'hui" + suggestion "Reviens demain"
   - Détection "isCurrent" : compare la fenêtre à `new Date()` en timezone Paris → si maintenant ∈ [start, end] : isCurrent=true

────────────────────────────────────────────────────────────────────────
PARTIE 2C — Composant WeeklyCalendar (~3 h)
────────────────────────────────────────────────────────────────────────

4. Créer `components/solunar/WeeklyCalendar.tsx` (Client Component) :
   - Props :
     ```ts
     type WeeklyCalendarProps = {
       weekly: DailyForecast[]   // 7 entrées, [aujourd'hui, +1j, +2j, ...]
       selectedDate?: string     // "2026-05-20", contrôlé par parent
       onSelectDate?: (date: string) => void
       weatherIcons?: Record<string, string>  // optionnel : icône météo par jour (Lucide name)
     }
     ```
   - Layout :
     * 7 cards horizontales, scrollable sur mobile (scroll-snap-x)
     * Chaque card (largeur ~110px mobile, ~140px desktop) :
       ```
       ┌────────────┐
       │   Mar.     │  ← jour court
       │   19       │  ← chiffre du jour, gros
       │   mai      │  ← mois court
       │            │
       │   🌤️       │  ← icône météo (si fournie)
       │            │
       │   [95]     │  ← score badge
       │ Très Bonne │  ← label
       │            │
       │ ↑ 09:51    │  ← marée haute du jour
       │ ↓ 16:21    │  ← marée basse
       └────────────┘
       ```
     * Click sur card → onSelectDate(card.date), highlight la card sélectionnée (bordure teal)
     * État au mount : selectedDate = première card (aujourd'hui)
   - Mobile : scrollable horizontal avec indicators (dots) sous les cards
   - Desktop : 7 cards visibles en grid sans scroll

5. Helper `getWeatherIconName(weatherCode: number): string` dans le composant ou dans lib/conditions/weather-codes.ts (probablement déjà fait sprint 4)

────────────────────────────────────────────────────────────────────────
PARTIE 2D — Accessibilité + tests visuels (~30 min)
────────────────────────────────────────────────────────────────────────

6. A11y :
   - Toutes les couleurs respectent WCAG AA (contraste min 4.5:1 sur texte normal)
   - WeeklyCalendar : navigation au clavier (flèches gauche/droite changent selectedDate)
   - BestMomentCard : `aria-label="Fenêtre de pêche de 07:39 à 09:39, qualité Très Bonne, score 95 sur 100"`
   - Si reduced motion : disable les animations pulse

7. Test visuel rapide :
   - Crée une route `app/dev/solunar-preview/page.tsx` (Server Component) qui appelle computeDailyForecast pour Pointe du Raz aujourd'hui + un mock SpotForecast
   - Render DayBestMoments + WeeklyCalendar avec mock data
   - URL `/dev/solunar-preview` accessible en dev uniquement (block en prod via env check ou middleware)
   - Permet de tester l'UI sans avoir besoin d'intégrer dans /spots/[slug]

────────────────────────────────────────────────────────────────────────
TESTS À FAIRE
────────────────────────────────────────────────────────────────────────

1. `pnpm typecheck` → 0 erreur
2. `pnpm dev`, va sur `/dev/solunar-preview` :
   - WeeklyCalendar 7 cards visibles, scrollable mobile, click change selectedDate
   - DayBestMoments affiche 3-6 windows, badges qualité avec bonnes couleurs
   - Empty state si aucune window (forcer manuellement en mockant)
3. Mobile (DevTools iPhone 14) :
   - Scroll horizontal du calendar fluide
   - Cards lisibles (taille min 110px)
   - BestMomentCard pleine largeur, pas tronquée
4. A11y :
   - Tab dans WeeklyCalendar : focus visible, flèches G/D changent selection
   - Lecteur d'écran (test rapide) : annonce des cards correcte
   - DevTools Lighthouse a11y > 95

────────────────────────────────────────────────────────────────────────
COMMITS
────────────────────────────────────────────────────────────────────────

- feat(solunar): BestMomentCard + BestMomentRow
- feat(solunar): DayBestMoments avec empty state
- feat(solunar): WeeklyCalendar scroll-snap mobile + clavier desktop
- feat(dev): route /dev/solunar-preview pour test UI standalone

NE PUSH PAS.

────────────────────────────────────────────────────────────────────────
NOTES POUR TOI (CLAUDE CODE)
────────────────────────────────────────────────────────────────────────

- Pour la prévisualisation : `/dev/solunar-preview` doit être visible UNIQUEMENT en dev (vérifie `process.env.NODE_ENV === 'development'` + return notFound() sinon). Sinon en prod ça leak un endpoint dev.
- Le score badge avec animation pulse pour Exceptionnel : utilise CSS animation, pas de lib externe.
- Les couleurs Tailwind utilisées doivent exister dans la config (vérifie qu'on a bien amber-500, lime-500, etc. — sinon utilise les équivalents charte).
```

---

## ▶ Phase 3 — Intégration dans /spots/[slug]

> **Budget Claude Code** : 0.5-1 jour
> **Difficulté** : easy-medium (data wiring + layout)
> **Pré-requis** : phases 1+2 mergées

**Copie-colle dans Claude Code :**

```
Contexte : sprint 6 phase 3. Phases 1+2 livrées. Maintenant on intègre WeeklyCalendar + DayBestMoments dans la fiche spot `/spots/[slug]`. Le calendrier devient le hub : on clique sur un jour → DayBestMoments affiche ses fenêtres.

────────────────────────────────────────────────────────────────────────
PARTIE 3A — Extension de spot-forecast.ts pour 7 jours (~1 h)
────────────────────────────────────────────────────────────────────────

1. Étend `lib/conditions/spot-forecast.ts` (créé en sprint 4) :
   - Actuellement la fonction renvoie SpotForecast pour 1 jour (`forecast_days=1`)
   - Ajoute une nouvelle fonction `fetchSpotForecastWeek(lat, lng): Promise<SpotForecast[]>` qui :
     * Appelle Open-Meteo avec `forecast_days=7`
     * Split la réponse en 7 SpotForecast (1 par jour)
     * Cache via `unstable_cache` 1h
   - Note : tide.points pour J+1 doit utiliser les hours indexées correctement (pas index 0-23 de la même journée)
   - Type `SpotForecastWeek = SpotForecast[]` (array de 7)

────────────────────────────────────────────────────────────────────────
PARTIE 3B — Calcul du weekly forecast côté Server Component (~1 h)
────────────────────────────────────────────────────────────────────────

2. Dans `app/(marketing)/spots/[slug]/page.tsx` :
   - En plus du fetch existant (spot + conditions du jour + catches récentes) :
     * Appelle `fetchSpotForecastWeek(spot.lat, spot.lng)` → forecasts[]
     * Appelle `computeWeeklyForecast(today, spot.lat, spot.lng, forecasts)` → weekly: DailyForecast[]
   - Passe `weekly` en prop au nouveau composant client SpotBestMomentsSection (créé en 3C)

────────────────────────────────────────────────────────────────────────
PARTIE 3C — Composant SpotBestMomentsSection (~2 h)
────────────────────────────────────────────────────────────────────────

3. Créer `components/spots/SpotBestMomentsSection.tsx` (Client Component) :
   - Props : `weekly: DailyForecast[]`
   - useState selectedDate, init à weekly[0].date (aujourd'hui)
   - Layout :
     ```
     ┌─────────────────────────────────────────┐
     │ Meilleurs moments                       │
     │                                         │
     │ <WeeklyCalendar 7 jours>                │
     │                                         │
     │ ─────────────────────────────────────── │
     │                                         │
     │ <DayBestMoments daily={selected}>       │
     └─────────────────────────────────────────┘
     ```
   - Click sur une card du WeeklyCalendar → update selectedDate, DayBestMoments re-render
   - Header : "Meilleurs moments à [nom du spot]" + petit lien "Comment c'est calculé ?" (tooltip ou drawer avec explication courte)

4. Tooltip "Comment c'est calculé ?" :
   - Modal léger ou dialog Sheet :
     ```
     Le score combine :
     - 40% astronomique (lever/coucher lune et soleil, transits lunaires)
     - 35% marée (montante > descendante > étale, coefficient)
     - 25% vent (idéal 5-15 km/h)
     
     Pour des recommandations personnalisées basées sur TES prises,
     active le scoring personnalisé (sprint 7, à venir).
     ```

────────────────────────────────────────────────────────────────────────
PARTIE 3D — Intégration dans le layout de la fiche spot (~1 h)
────────────────────────────────────────────────────────────────────────

5. Modifier `app/(marketing)/spots/[slug]/page.tsx` :
   - Ordre des sections (top→bottom) :
     1. Hero (nom + dépt + verified + difficulty)
     2. Carte mini (existant)
     3. Bouton Itinéraire GPS (existant)
     4. **NOUVEAU : SpotBestMomentsSection** (le hub Meilleurs moments + calendrier)
     5. Section "Conditions du jour" existante (TideChart + WeatherGrid + WavesCard)
     6. Prises récentes (existant)
     7. Infos pratiques (existant)
     8. CTA collant "Logger une prise ici" (existant)
   - Justification de l'ordre : les "Meilleurs moments" doivent être les plus visibles parce que c'est ce que les users viennent chercher. Les conditions techniques (marée, météo) restent accessibles juste en-dessous pour les pêcheurs avancés qui veulent les détails.

6. Sync entre selectedDate du WeeklyCalendar et la TideChart existante :
   - Si la TideChart est sur "aujourd'hui" en dur, modifie-la pour accepter un prop `date` et fetch les data du jour correspondant
   - Sinon, simplement laisse les deux séparés pour cette phase (TideChart = aujourd'hui ; SpotBestMomentsSection = jour sélectionné)
   - À ton choix selon complexité — j'accepte les deux options, documente celle que tu prends

────────────────────────────────────────────────────────────────────────
TESTS À FAIRE
────────────────────────────────────────────────────────────────────────

1. `pnpm typecheck` → 0 erreur
2. Va sur /spots/{un-slug-existant} :
   - Section "Meilleurs moments" visible entre la carte mini et la section Conditions
   - WeeklyCalendar 7 cards visibles
   - Click sur un jour → DayBestMoments update avec les windows de ce jour
   - Aujourd'hui en surbrillance par défaut
   - Si une fenêtre est "maintenant" : badge "Maintenant" visible sur la card
3. Cache Open-Meteo : 1ère visite = ~500ms fetch, 2ème visite < 50ms (cache hit)
4. Mobile :
   - Calendar scrollable horizontalement
   - DayBestMoments pleine largeur
   - Pas de débordement
5. SEO source :
   - Le contenu solunar est rendu SSR (Server Component fetch les weekly avant render)
   - Vérifie dans view source que les windows apparaissent en HTML (pas seulement JS)

────────────────────────────────────────────────────────────────────────
COMMITS
────────────────────────────────────────────────────────────────────────

- feat(conditions): fetchSpotForecastWeek pour 7 jours
- feat(spots): SpotBestMomentsSection avec WeeklyCalendar + DayBestMoments
- feat(spots): tooltip "Comment c'est calculé ?" avec mention sprint 7
- refactor(spots): intégration solunar dans layout fiche spot

NE PUSH PAS.

────────────────────────────────────────────────────────────────────────
NOTES POUR TOI (CLAUDE CODE)
────────────────────────────────────────────────────────────────────────

- Si Open-Meteo te bloque (rate limit, 7j pas dispo), bascule sur 3 jours et marque le reste "Bientôt disponible". Mais normalement 7j est dans le plan gratuit.
- Le cache 1h sur 7 jours peut être un peu agressif côté pertinence vs charge serveur. Si tu hésites, fais 30 min.
- Si la TideChart actuelle ne supporte pas un prop `date`, garde-la statique sur aujourd'hui. Pas de regression.
```

---

## ▶ Phase 4 — Enrichissement carte (popup + hint)

> **Budget Claude Code** : 0.5 jour
> **Difficulté** : easy
> **Pré-requis** : phase 3 mergée

**Copie-colle dans Claude Code :**

```
Contexte : sprint 6 phase 4. Phases 1-3 livrées. Maintenant on enrichit la carte /carte pour exposer le "prochain meilleur moment" directement dans le SpotPopup. Objectif : que l'utilisateur voie sur la carte "Ce spot est à exploiter dans X heures" sans cliquer sur la fiche complète.

────────────────────────────────────────────────────────────────────────
PARTIE 4A — Calcul du "prochain créneau" léger (~1 h)
────────────────────────────────────────────────────────────────────────

1. Créer `lib/solunar/next-window.ts` :
   - Fonction `getNextBestWindow(daily: DailyForecast[]): FishingWindow | null`
   - Logique :
     * Aplati toutes les windows des 7 jours
     * Filtre celles dont endTimeISO > now()
     * Trie par startTimeISO ascendant
     * Retourne la première qui a quality ≥ 'bonne' (≥ 60)
     * Si aucune : retourne la prochaine quelle que soit la quality
     * Si tableau vide : null

────────────────────────────────────────────────────────────────────────
PARTIE 4B — Ajout dans SpotPopup (~2 h)
────────────────────────────────────────────────────────────────────────

2. Étend `components/map/SpotPopup.tsx` :
   - Ajoute un prop `nextWindow?: FishingWindow | null`
   - Si présent ET tier !== 'anonymous'/'discovery' :
     * Section dédiée au-dessus du CTA :
       ```
       ┌──────────────────────────────────────┐
       │ ⏰ Prochain créneau                  │
       │ Aujourd'hui 18:30 - 20:30            │
       │ Très Bonne · Coucher de soleil       │
       └──────────────────────────────────────┘
       ```
   - Si tier === 'discovery' : version teaser floutée + CTA upsell

3. Calcul de nextWindow côté Server Component `app/(map)/carte/page.tsx` :
   - C'est COÛTEUX de calculer pour tous les spots affichés sur la carte (chaque appel = 7 jours Open-Meteo + suncalc)
   - Stratégie : NE PAS pré-calculer pour tous. Calcule à la demande quand l'utilisateur clique sur un marker.
   - Implémentation : transforme `SpotPopup` en lazy-loaded :
     * Au click marker, déclenche un fetch via Server Action `getSpotNextWindow(spotId)`
     * Pendant le fetch : skeleton dans la popup
     * Une fois reçu : affiche le créneau
   - Cache la Server Action via `unstable_cache` clé spotId + heure courante arrondie

────────────────────────────────────────────────────────────────────────
PARTIE 4C — Indicateur visuel sur les markers (optionnel, ~2 h)
────────────────────────────────────────────────────────────────────────

4. **Si time permits** : colore les markers selon la qualité du créneau actuel
   - Pour chaque spot affiché sur la carte, fetch en arrière-plan (queue lente) le score du créneau actuel
   - Map color : gray=Faible, amber=Moyenne, lime=Bonne, teal=Très Bonne, emerald=Exceptionnelle
   - Si tu sens que c'est trop lourd (N+1 requêtes), skip et fais en sprint 7 ou plus tard

5. Si tu skip 4 : ajoute juste une icône horloge ⏰ sur les markers pour signaler que cliquer = voir le prochain créneau

────────────────────────────────────────────────────────────────────────
TESTS À FAIRE
────────────────────────────────────────────────────────────────────────

1. /carte loggé en local : click un marker → popup ouvre avec skeleton → ~500ms plus tard affiche le prochain créneau
2. Si nextWindow = null (cas peu probable, tous spots indisponibles) : message "Pas de créneau optimal cette semaine"
3. Discovery loggé : popup affiche version floutée avec CTA upsell
4. Mobile : sheet glisse, prochain créneau visible, lisible
5. Performance : ouvre 5 popups successifs sur 5 spots différents → cache fonctionne (2ème ouverture du même spot = instant)

────────────────────────────────────────────────────────────────────────
COMMITS
────────────────────────────────────────────────────────────────────────

- feat(solunar): getNextBestWindow utility
- feat(map): SpotPopup affiche le prochain créneau optimal
- feat(carte): server action getSpotNextWindow cachée
- feat(map): icône horloge sur markers (ou variante colorée si 4C fait)

NE PUSH PAS.

────────────────────────────────────────────────────────────────────────
NOTES POUR TOI (CLAUDE CODE)
────────────────────────────────────────────────────────────────────────

- Si la partie 4C te paraît lourde (latence N appels Open-Meteo), skip et flag pour sprint 11 (polish beta).
- Le cache de getSpotNextWindow doit avoir une clé qui inclut l'heure arrondie (ex: timestamp arrondi à 30 min) sinon le "prochain créneau" devient stale rapidement.
```

---

## ▶ Phase 5 — Tests E2E + récap + push final

> **Budget Claude Code** : 0.5 jour
> **Difficulté** : easy (consolidation)
> **Pré-requis** : phases 1-4 toutes mergées localement, ZÉRO commit pushé

**Copie-colle dans Claude Code :**

```
Contexte : sprint 6 phase 5 — finale. Phases 1-4 commitées en local. On consolide, teste, récap, push.

────────────────────────────────────────────────────────────────────────
PARTIE 5A — Vérifications automatisées (~30 min)
────────────────────────────────────────────────────────────────────────

1. `pnpm typecheck` → 0 erreur
2. `pnpm lint` → 0 erreur (warnings tolérables, document)
3. `pnpm test lib/solunar` → 100% green
4. `pnpm build` → succès
   - Cibles bundles :
     * /spots/[slug] : < 320 KB (ajout solunar + composants)
     * /carte : < 270 KB (ajout SpotPopup enrichie)
   - Si dépassement de > 30 KB sur l'une : check si suncalc est dans le bundle client (devrait l'être seulement quand SpotBestMomentsSection est rendu côté client)

────────────────────────────────────────────────────────────────────────
PARTIE 5B — Smoke test manuel structuré (~1 h)
────────────────────────────────────────────────────────────────────────

5. Setup :
   - `pnpm dev`
   - Compte test-local@... loggé
   - Quelques spots seedés (≥ 3 dans le dépt de l'user)

6. Scénario A — Fiche spot :
   - Va sur /spots/{slug}
   - Section "Meilleurs moments" visible entre carte mini et Conditions
   - WeeklyCalendar : 7 cards horizontales, scrollable mobile
   - Click sur "demain" : DayBestMoments update
   - Click sur "aujourd'hui" : retour à today
   - Si une window est en cours : badge "Maintenant" visible
   - Tooltip "Comment c'est calculé ?" fonctionne

7. Scénario B — Carte :
   - /carte, click un marker
   - Popup affiche section "Prochain créneau" (skeleton puis data)
   - Cohérent avec ce qu'affiche la fiche spot pour ce spot
   - Discovery : version floutée + upsell

8. Scénario C — Edge cases :
   - Spot avec lat haute (ex Dunkerque 51°N) en hiver : moonrise peut être absent → DayBestMoments doit afficher les windows quand même (sunrise/sunset) ou empty state propre
   - Spot Méditerranée en été : windows nombreuses → vérifie le dédup overlap, pas de doublon visuel

9. Scénario D — Régression sprint 4 :
   - Tide chart fonctionne toujours
   - Weather grid OK
   - Map filters OK
   - Auth OK

────────────────────────────────────────────────────────────────────────
PARTIE 5C — Récap structuré pour John (~30 min)
────────────────────────────────────────────────────────────────────────

10. Génère `docs/sprint-6/RECAP.md` avec :

    **A. Fichiers créés** par catégorie :
    - lib/solunar/ : types, config, astronomy, scoring, index, next-window, format, tests
    - components/solunar/ : BestMomentCard, BestMomentRow, DayBestMoments, WeeklyCalendar
    - components/spots/ : SpotBestMomentsSection
    - app/dev/solunar-preview/ : route de prévisualisation dev

    **B. Fichiers modifiés** :
    - lib/conditions/spot-forecast.ts (ajout fetchSpotForecastWeek)
    - app/(marketing)/spots/[slug]/page.tsx (intégration section)
    - components/map/SpotPopup.tsx (prochain créneau)
    - app/(map)/carte/page.tsx (server action prochain créneau)

    **C. Packages ajoutés** :
    - suncalc + @types/suncalc

    **D. Migrations DB** :
    - Aucune (pure compute, pas de schéma)

    **E. Décisions notables prises seul** :
    - Liste exhaustive avec justification (ex: cache 7j à 1h vs 30 min, lazy fetch popup vs pre-fetch, etc.)

    **F. Trucs flaggés pour plus tard** :
    - Scoring personnalisé (sprint 7)
    - Markers colorisés par qualité actuelle (si skipped en 4C)
    - Notifications push "Créneau exceptionnel demain" (sprint 12+ mobile)
    - Affinement pondération scoring après collecte vraie data
    - Coef de marée précis (actuellement approximé)

    **G. Métriques** :
    - Bundle First Load JS par route
    - Temps de calcul computeWeeklyForecast (devrait être < 50ms — suncalc est rapide)
    - Couverture tests `lib/solunar` (cible 80%+)

    **H. Tests skippés** :
    - Test sur device physique
    - Test contre données solunar de référence externe (NOAA, IMCCE) — à valider en sprint beta

────────────────────────────────────────────────────────────────────────
PARTIE 5D — Push + monitoring (~30 min)
────────────────────────────────────────────────────────────────────────

11. Affiche le récap à John, attends son OK.

12. Si OK :
    ```
    git push origin main
    ```

13. Vercel auto-deploy → surveille build success + smoke test prod (1 scénario par tier)

14. Si rouge : rollback ou hotfix selon criticité.

────────────────────────────────────────────────────────────────────────
LIVRABLE FINAL
────────────────────────────────────────────────────────────────────────

- Sprint 6 sur main, déployé sur Vercel
- /spots/[slug] affiche "Meilleurs moments" + calendrier 7 jours
- /carte popup affiche le prochain créneau
- Lib solunar testée, score 80%+ couverture
- Match minimum la feature équivalente de spot-de-peche.com
- Pas de régression sur sprint 4 (carte + conditions)

Récap consigné dans docs/sprint-6/RECAP.md.

Si quoi que ce soit n'est pas vert : NE PUSH PAS, corrige d'abord ou ping-moi.
```

---

## Notes pour John

### Budget temps cumulé

| Phase | Sujet | Budget Claude Code | Difficulté |
|---|---|---|---|
| 0 | Setup + décisions | 15 min (toi) | easy |
| 1 | Engine solunar pur | 1-1.5 jour | medium |
| 2 | Composants UI standalone | 1 jour | medium |
| 3 | Intégration fiche spot | 0.5-1 jour | easy-medium |
| 4 | Enrichissement carte | 0.5 jour | easy |
| 5 | Final + push | 0.5 jour | easy |
| **TOTAL** | | **~4-5 jours** | |

Sprint 6 plus court que sprint 4 (pas d'intégration API externe, pas de routing fullscreen, pas de SEO programmatique massif). Estimation 1-2 semaines calendrier si tu fais 3-4h de Claude Code par jour.

### Décisions produit à valider AVANT phase 1

Vérifie dans la Partie 0A si tu acceptes :
- Échelle 5 niveaux qualitatifs (Faible → Exceptionnelle)
- Fenêtres de 2h centrées sur l'événement
- Pondération 40/35/25 (solunar/marée/vent)
- Max 6 fenêtres par jour
- Pas de fenêtres entre 23h-04h

Tu peux dire "OK tout" ou ajuster une valeur précise.

### Différenciation vs spot-de-peche

Ce sprint te met **à parité** sur la feature solunar/meilleurs moments. Le différenciateur (scoring personnalisé "Tu pêches bien quand…") vient au sprint 7. Donc à la fin du sprint 6 :
- ✅ Données environnementales (sprint 4) — parité
- ✅ Carte interactive (sprint 4) — parité
- ✅ Solunar / Meilleurs moments (sprint 6) — parité
- ❌ Scoring personnalisé (sprint 7) — différenciation
- ❌ Carnet personnel + social (sprint 8) — différenciation

Tu commences à matcher leur baseline. Le coup d'avance vient des deux sprints suivants.

### Pré-requis avant chaque phase

- **Phase 0** : sprint 4 mergé et stable en prod
- **Phase 1** : `lib/conditions/spot-forecast.ts` existe et retourne SpotForecast complet
- **Phase 2** : phase 1 mergée
- **Phase 3** : phases 1+2 mergées + fetch 7 jours possible (vérifie en phase 3A)
- **Phase 4** : phase 3 mergée (sinon pas de DailyForecast disponible)
- **Phase 5** : phases 1-4 toutes commitées localement

### Outils externes à configurer toi

- Aucun ! Pas d'API externe, pas de clé, pas de service tier. C'est la beauté du solunar : tout est calculable offline.

### Workflow recommandé

Identique au sprint 4 :
1. Tu fais la phase 0 (valider décisions)
2. Tu colles le prompt phase 1, Claude Code bosse, te ping quand commité local
3. Tu relis les commits, smoke test, push si OK
4. Tu enchaînes phase 2
5. Push à chaque phase mergée (pas tout à la fin)

### Si une phase te paraît trop grosse ou floue

Ping-moi avant de la donner à Claude Code. La phase 1 (algorithme + scoring) est la plus risquée — c'est là que les bugs vont se nicher si on est trop ambitieux sur les formules. Reste sur les pondérations par défaut, on tunera après vraie data.

### Roadmap après sprint 6

D'après CLAUDE.md révisé :
- Sprint 7 = Scoring personnalisé (ton différenciateur) — overlay sur conditions = "Tu pêches mieux quand…" basé sur historique catches
- Sprint 8 = Fil communautaire + signal social ("X prises ici aujourd'hui")
- Sprint 9 = Paiements Stripe
- Sprint 10 = Guides éditoriaux MDX
- Sprint 11 = Polish + Beta privée
- Sprint 12-19 = Mobile

Le sprint 7 va consommer DIRECTEMENT les patterns d'historique catches de l'user → c'est là que ton moat se construit. Plus tu logues, plus c'est utile pour TOI.
