# Sprint 19 — Diagnostic du vent figé à 25/25 (WS-A)

> Preuve de la cause racine **avant** correction. Établi le 2026-06-23 (lecture de code + connecteurs supabase-guard RO + docs-researcher Open-Meteo + script de repro).

## TL;DR
La composante vent du score était **figée à 25/25** parce que (a) un **scalaire unique de vent** (celui de **midi**) était propagé à **toutes** les fenêtres de pêche d'un jour, et (b) la **courbe `scoreWind` saturait à 1.0** sur toute la bande **5–15 km/h** (fréquente à midi sur le littoral). Les deux se cumulaient : un seul vent, dans la zone qui sature → 25/25 partout, tout le temps.

## Correction au brief (constat WS-A)
Le brief supposait lire les vraies valeurs de vent dans `conditions_cache.payload`. **supabase-guard a constaté que `conditions_cache` est VIDE en prod (0 ligne)** : la donnée météo n'est **pas persistée** là — elle est fetchée **live** depuis Open-Meteo (`wind_speed_10m`) et réduite à un scalaire **avant** scoring, puis le score est pré-calculé par le cron dans `spot_scores` (via `unstable_cache` Next, pas via cette table). La cause racine est donc **100% dans le code**, prouvée ci-dessous — pas de données DB à relever. Aucune migration (le `payload` est `jsonb`, déjà flexible).

## La cause racine (chaîne de code)
`lib/scoring/spot-scores-job.ts` → `fetchSpotForecastWeek` → `computeWeeklyForecast` → `buildWindow` → `scoreWindow` → `scoreWind`.

1. **`SpotConditions.weather.wind_speed_kmh` = scalaire unique par jour.** Dans `lib/conditions/spot-forecast.ts`, `buildDayConditions()` ne garde que **l'heure de référence** (`refLocalHour = isToday ? currentHourIdx : 12` → **midi** pour les jours futurs) et **jette le reste** du tableau horaire `wind_speed_10m`.
2. **Toutes les fenêtres reçoivent ce même scalaire.** Dans `lib/solunar/index.ts`, `buildWindow` passait `conditions.weather.wind_speed_kmh` (identique) à chaque fenêtre, qu'elle soit à 6h, 12h ou 21h → composante vent **constante sur la journée**.
3. **La courbe saturait.** `scoreWind` (`lib/solunar/scoring.ts`) renvoyait `1.0` plat pour **tout 5–15 km/h** (`if (v <= IDEAL_MAX_KMH) return 1.0`, `IDEAL_MAX_KMH = 15`). Contrib affichée = `round(factor × 0.25 × 100)` → dès que le vent de midi tombait dans 5–15, **25/25**. Comme les spots d'une région partagent une météo proche, ça paraissait « partout ».

## Preuve chiffrée (script de repro)
`pnpm tsx scripts/wind-scoring-smoke.ts` — Pointe du Raz, profil horaire synthétique (matin calme → après-midi ventu) :

```
─── APRÈS (vent par fenêtre) ───
  05:36–07:36 (centre 06h) · vent  8 km/h · factors.wind 0.957 · contrib 24/25
  20:56–22:56 (centre 21h) · vent  9 km/h · factors.wind 0.979 · contrib 24/25
  04:30–06:30 (centre 05h) · vent  7 km/h · factors.wind 0.936 · contrib 23/25
  08:26–10:26 (centre 09h) · vent 12 km/h · factors.wind 0.927 · contrib 23/25
  17:00–19:00 (centre 18h) · vent 20 km/h · factors.wind 0.633 · contrib 16/25
  → 5 fenêtres, 3 contribs vent DISTINCTES : {16, 23, 24}

─── AVANT (scalaire unique = vent de midi 20 km/h) ───
  toutes les 5 fenêtres → contrib 16/25  (1 valeur = le bug figé)
```

La même journée, avant le fix, donnait **une seule** valeur sur les 5 fenêtres ; après, **3 valeurs distinctes**. Le bug et sa correction sont démontrés sur le même jeu.

## Évidence en base (cohérence)
`spot_scores` (157 lignes, supabase-guard) : `current_quality` ∈ {bonne 80, faible 62, moyenne 15}, **aucune « exceptionnelle » ni « très bonne »** ; `day_score` min 57 / max 94 / **moy 77**. Le **plancher haut** (min 57, moy 77) est cohérent avec une composante vent collée à ~0.25 qui **rehausse tout le monde** — symptôme attendu du bug.

## Multiplicateur perso (vérifié)
La fiche spot publique (`app/(marketing)/spots/[slug]/page.tsx`) ne passe **pas** de multiplicateur perso (contexte public) → le `Math.min(windRaw * mult.wind, 1.0)` n'intervient pas ici. La saturation venait bien du couple scalaire + courbe, pas du perso.

## Open-Meteo (docs-researcher)
`hourly=wind_speed_10m` renvoie bien un **tableau horaire** aligné sur `hourly.time` (24 valeurs/jour), **unité par défaut km/h**, index = **heure locale** avec `timezone=Europe/Paris`. ⚠️ Piège DST : aux changements d'heure (23/25 entrées), **dériver l'heure depuis `time`** plutôt que supposer `index == heure` (appliqué dans `buildWindByHour`). Valeurs `null` possibles → fallback géré.

## Correction livrée (WS-B + WS-C)
- **WS-B** — `SpotConditions.weather.wind_speed_by_hour: (number|null)[]` (24, heure locale), rempli depuis `forecast.hourly.wind_speed_10m` ; `buildWindow` échantillonne le vent à **l'heure centrale** de la fenêtre, avec **fallback** scalaire → null. Rétro-compat : un payload antérieur (sans le tableau) retombe proprement sur le scalaire.
- **WS-C** — `scoreWind` devient une **courbe continue à pic unique** (pic 10 km/h, décroissance dès 10, plus aucun palier plat). `scoreWind(13)=22/25`, `scoreWind(18)=18/25`, `scoreWind(15)=20/25` → le vent **discrimine**. Seuls les ~10 km/h vraiment idéaux donnent 25/25.
- **D1 (décision John — défaut appliqué)** : périmètre = **vent seul** (verrouillé au brief) ; **pas de pénalité forte du calme** (mer d'huile = 0.85, pas pénalisée comme un coup de vent). À ré-arbitrer librement (constantes centralisées et commentées dans `lib/solunar/config.ts`).
