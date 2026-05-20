# Sprint 6 — "Meilleurs moments" solunar — Récap technique

> Rédigé par Claude Code · Sprint terminé le 2026-05-20

---

## A. Fichiers créés

### `lib/solunar/` — moteur de calcul (pure TypeScript, zéro API)

| Fichier | Rôle |
|---|---|
| `types.ts` | Types exports : `SolunarEvent`, `FishingWindow`, `DailyForecast`, `QualityLevel`, `ScoringFactors`, `SolunarEventType` |
| `config.ts` | Constantes centralisées : pondérations 40/35/25, seuils qualité, horaires min/max, durée fenêtre 2h |
| `format.ts` | Helpers timezone `Europe/Paris` : `formatLocalTime` (HH:MM), `formatLocalDate` (YYYY-MM-DD), `getParisHour` |
| `astronomy.ts` | `getSolunarEvents(date, lat, lng)` — calcule les 6 types d'événements via SunCalc. Moon apex/nadir : scan 48 points × 30 min sur 24h |
| `scoring.ts` | `scoreWindow(event, …)` — combine solunar (bonus ×1.2 nouvelle/pleine lune), marée neutre 0.5 (Open-Meteo n'a pas de marées), vent optimal 5-15 km/h |
| `index.ts` | `computeDailyForecast` + `computeWeeklyForecast` — orchestration + dédup overlap >50% (garde la meilleure) |
| `next-window.ts` | `getNextBestWindow(daily[])` — retourne le prochain créneau ≥ "bonne" dans les 7 jours, ou le premier dispo sinon |
| `__tests__/astronomy.test.ts` | 12 tests : événements présents, horaires plausibles, tri chronologique, moonrise absent (latitudes polaires) |
| `__tests__/scoring.test.ts` | 22 tests : toutes les branches scoreWind/scoreSolunar/scoreTide, cap 1.0, neutralité marée, qualityFromScore |
| `__tests__/index.test.ts` | 8 tests : DailyForecast bien formé, dédup, computeWeekly 7 jours, windows filtrées par EARLIEST/LATEST |

### `components/solunar/` — UI

| Fichier | Rôle |
|---|---|
| `BestMomentCard.tsx` | Card 80px avec score badge, couleur par qualité, `motion-safe:animate-pulse` pour Exceptionnelle, badge "Maintenant" |
| `DayBestMoments.tsx` | Section journée complète : sous-titre lune (phase + horaires), soleil, liste de cards, empty state CalendarX |
| `WeeklyCalendar.tsx` | Calendrier 7 jours : scroll horizontal snap mobile, grid desktop, icônes météo WMO, dots de pagination, clavier ArrowLeft/Right |

### `components/spots/`

| Fichier | Rôle |
|---|---|
| `SpotBestMomentsSection.tsx` | Section "Meilleurs moments à {spot}" : state selectedDate, HowItWorksDialog (dialog 40/35/25) |

### `app/dev/solunar-preview/`

| Fichier | Rôle |
|---|---|
| `page.tsx` | Page dev-only (`NODE_ENV !== 'development' → notFound()`). Mock conditions Pointe du Raz, WMO variés |
| `SolunarPreviewClient.tsx` | Client wrapper : WeeklyCalendar + DayBestMoments + empty state forcé + debug JSON brut |

### `app/actions/`

| Fichier | Rôle |
|---|---|
| `solunar.ts` | Server Action `getSpotNextWindow(spotId, lat, lng)` — pipeline complet, cached 1h par `(spotId, hourKey)` |

---

## B. Fichiers modifiés

| Fichier | Modifications |
|---|---|
| `lib/conditions/spot-forecast.ts` | Ajout `fetchSpotForecastWeek` (unstable_cache 1h), `groupIndexByDate`, `buildDayConditions`, `buildEmptyConditions`, `fetchForecastDataWeek`, `fetchMarineDataWeek` |
| `app/(marketing)/spots/[slug]/page.tsx` | Ajout `fetchSpotForecastWeek` dans le Promise.all, calcul `weekly` + `weatherCodes`, insertion `<SpotBestMomentsSection>` |
| `components/map/SpotPopup.tsx` | Ajout lazy-load Server Action au clic marker : skeleton → prochain créneau (paid) ou teaser flouté (discovery) |
| `eslint.config.mjs` | Migration de `FlatCompat` (cassé ESLint 10) vers flat config directe `eslint-config-next/core-web-vitals` + downgrade ESLint 10→9 |

---

## C. Packages ajoutés

| Package | Version | Pourquoi |
|---|---|---|
| `suncalc` | 1.9.0 | Calculs astronomiques sun/moon sans API. Léger (9 kB), zéro dépendance |
| `@types/suncalc` | 1.9.4 | Types TypeScript pour suncalc |

---

## D. Migrations DB

**Aucune.** Le sprint 6 est 100% compute côté serveur. Aucun schéma modifié, aucune table ajoutée.

---

## E. Décisions notables prises seul

### Cache à 1h (pas 30 min ni 3h)
`unstable_cache({ revalidate: 3600 })` pour `fetchSpotForecastWeek` et `getSpotNextWindow`. Justification : les données Open-Meteo changent toutes les heures, le résultat solunar varie peu sur 30 min, et 1h est le granulaire naturel de la clé `hourKey` du Server Action.

### Marée neutre à 0.5 (pas 0)
`scoreTide()` retourne 0.5 quand `tidePoints.length === 0`. Un 0 aurait artificiellement pénalisé tous les spots (Open-Meteo Marine ne fournit pas les marées en v1). 0.5 = neutre, sans distortion du score global.

### Lazy fetch popup carte (pas pre-fetch)
Le brief hésitait. Pré-calculer le prochain créneau pour tous les spots de la carte = N requêtes Open-Meteo au chargement de page (20-200 spots × 400 ms = inacceptable). Lazy fetch au clic = 1 requête, bien cachée, UX skeleton propre.

### Moon apex/nadir par scan 48 points
SunCalc n'expose pas le transit lunaire directement. Scan toutes les 30 min sur 24h = 48 appels `getMoonPosition` → précision ≈ 15 min, coût CPU négligeable (< 1 ms). Pas d'interpolation quadratique plus complexe car la précision est suffisante pour la pêche.

### Dédup overlap >50%
Quand deux événements astronomiques sont proches (ex : moonrise + sunrise dans la même demi-journée), leurs fenêtres de 2h se chevauchent. Seuil 50% : garde la meilleure, élimine la moins bonne. Trop bas (20%) = trop permissif, doublons visuels. Trop haut (80%) = fusionne des events légitimement distincts.

### Pas de sync TideChart ↔ WeeklyCalendar
TideChart est un Server Component. Le synchroniser avec `selectedDate` du WeeklyCalendar (Client Component) exigerait de le refactorer en Client Component + fetch côté client. Coût élevé, valeur nulle en v1 (les marées sont vides).

### `export const dynamic = 'force-dynamic'` sur la preview
Sans ça, Next.js essaie de pre-render `/dev/solunar-preview` au build. Le `notFound()` appelé en dehors de la fonction page déclenchait `NEXT_HTTP_ERROR_FALLBACK;404` à la collecte des données statiques.

### 4C markers colorisés → skippé
N+1 requêtes Open-Meteo (une par spot visible = 20-200 requêtes). Solution propre = cron Edge Function qui pré-calcule et persiste les scores en DB. Différé sprint 7+.

---

## F. Flaggé pour plus tard

| Item | Sprint cible | Notes |
|---|---|---|
| **Scoring personnalisé** (overlay tes prises historiques) | Sprint 7 | Vrai différenciateur vs spot-de-peche.com. Nécessite suffisamment de catches loggées |
| **Markers colorisés par qualité actuelle** (4C skippé) | Sprint 7 | Requiert une table `spot_scores` pré-calculée par cron Edge Function, 1h TTL |
| **Notifications push "Créneau exceptionnel demain"** | Sprint 12+ (mobile) | Expo Notifications, calcul quotidien H-24 sur les spots followés |
| **Affinement pondération 40/35/25** | Post-beta | À calibrer sur les vraies prises. Actuellement générique — sprint 7 la rend personnelle |
| **Marée précise (WorldTides / SHOM)** | Sprint 8-9 | Open-Meteo Marine = vagues/houle, pas de marée astronomique. Intégrer WorldTides API (3$/mois) ou SHOM |
| **Coef de marée** | Sprint 8-9 | Non intégré en v1 (absent d'Open-Meteo). Impacte fortement le score "marée" |

---

## G. Métriques

### Bundles First Load JS (production build)

| Route | Taille route | First Load JS | Cible | Statut |
|---|---|---|---|---|
| `/spots/[slug]` | 112 kB | 259 kB | < 320 kB | ✅ |
| `/carte` | 32.6 kB | 219 kB | < 270 kB | ✅ |
| `/dev/solunar-preview` | 2.26 kB | 109 kB | — | — |

> Note : `suncalc` n'est PAS dans le bundle client. Il s'exécute uniquement côté Server Component (`computeWeeklyForecast`) et dans le Server Action (`getSpotNextWindow`).

### Temps de calcul

| Opération | Temps mesuré | Notes |
|---|---|---|
| SunCalc brut 7 jours (48 points/jour) | **~2.6 ms** | Benchmark local Node.js |
| `computeWeeklyForecast` complet | < 15 ms estimé | Scoring + dédup en sus, négligeable |
| `fetchSpotForecastWeek` (Open-Meteo) | ~400-600 ms | Réseau uniquement, caché 1h |

### Tests `lib/solunar`

| Fichier test | Tests | Couverture estimée |
|---|---|---|
| `astronomy.test.ts` | 12 | ~90% des branches astronomy.ts |
| `scoring.test.ts` | 22 | ~95% des branches scoring.ts |
| `index.test.ts` | 8 | ~80% des branches index.ts |
| `next-window.ts` | 0 | Non testé (logique triviale) |
| **Total** | **42** | **~85% du code business** |

---

## H. Tests skippés

| Test | Raison | Action future |
|---|---|---|
| Device physique (iOS/Android) | Pas d'app mobile en v1 | À faire en sprint 13+ quand Expo sera intégré |
| Validation contre données de référence externe (NOAA, IMCCE) | Nécessite une vérité terrain pour les éphémérides | Valider en sprint beta avec 2-3 jours de données réelles |
| Test E2E Playwright WeeklyCalendar | Setup Playwright non fait (sprint 1-4 hors scope) | À ajouter en sprint 11 (polish + beta) |
| Cache behavior `unstable_cache` | Difficile à mocker sans infra complète | Manuel : vérifier que deux requêtes successives ne triggent pas deux appels Open-Meteo |
| `getNextBestWindow` unitaire | Logique de tri/filtre triviale, couverte en intégration | OK à laisser ainsi |
