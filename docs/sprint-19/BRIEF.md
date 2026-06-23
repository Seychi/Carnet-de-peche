# Sprint 19 — Brief d'exécution
## Précision du scoring — composante vent (fini le 25/25)

> Rédigé le 2026-06-22. Durée cible : ~2-3 jours (le diagnostic conditionne le recalibrage).
> Contexte : remontée John 2026-06-22 — sur **toutes** les fiches spots, la composante **vent du score est figée à 25/25**. Le scoring ne discrimine plus sur le vent.
> Périmètre verrouillé (décision John 2026-06-22) : **ce sprint = scoring du vent uniquement**. Le chantier carte (rendu des spots gaté au zoom/viewport) est **reporté à un sprint ultérieur** — analyse conservée plus bas dans « Hors périmètre (reporté) ».
> Fichiers cœur : `lib/solunar/scoring.ts`, `lib/solunar/config.ts`, `lib/conditions/spot-forecast.ts`, `lib/solunar/index.ts`, `components/scoring/ScoreBreakdown.tsx`.
> Décisions John 2026-06-22 : ce sprint **prépare** le travail (brief). Rien n'est codé tant que John ne lance pas la ligne ci-dessous.

**Positionnement** : numéroté **19**, après la file actuellement planifiée 12→18 (Excellence UX 12-15, mobile + remédiation 16-18). C'est un **hotfix autonome** sans dépendance sur les sprints 12-18 : comme un score faux est directement visible par les utilisateurs, il peut être **avancé** dans la file si tu veux le traiter plus tôt.

**Préalable avant de démarrer (manuel John)** :
1. Décider du périmètre du recalibrage (vent seul vs. revoir aussi poids/marée) — cf. **Décision D1**.
2. Confirmer qu'**aucune migration** n'est attendue (le scoring est 100% TypeScript). Le payload `conditions_cache` est du JSON libre → l'enrichir n'est pas une migration de schéma. À vérifier en lecture par **supabase-guard**.

---

## 🚀 Ligne de lancement (à copier-coller par John)

> **ultracode — effort xhigh.** Exécute `docs/sprint-19/BRIEF.md`. Lance **WS-A (diagnostic)** en tout premier ; dès qu'il a confirmé la cause racine, lance **WS-B et WS-C** en parallèle (les deux dépendent des constats de WS-A et touchent `lib/solunar/*` → coordination : B = échantillonnage/plomberie, C = courbe/config). Termine **obligatoirement** par le **workstream VERIF** (agent indépendant) avant de me rendre la main. **Ne push pas**, ne déploie pas, n'applique rien en prod : tout est dans « Reste manuel John ». Invariants : tutoiement partout, pas de migration (régénérer `lib/types.ts` seulement si une migration réelle est ajoutée — a priori aucune).

---

## 🧠 Connecteurs & sous-agents (usage systématique — cf `CLAUDE.md` §20)

| Quand | Sous-agent → connecteur | Pourquoi |
|---|---|---|
| Avant de toucher les params Open-Meteo | **docs-researcher** → Context7 | Confirmer que l'API Open-Meteo Forecast renvoie `wind_speed_10m` en **tableau horaire** + unité par défaut km/h. Pas de code de mémoire. |
| Lire les vraies données avant de changer le modèle | **supabase-guard** → Supabase (RO) | `select payload from conditions_cache limit 5` (vraies valeurs de vent), `select current_quality, day_score from spot_scores`. Confirme que le vent stocké n'est pas déjà cassé en amont. **Lecture seule.** |
| QA réelle des scores fiche spot | **qa-chrome** → Claude in Chrome | Vérifier sur `/spots/[slug]` que la composante vent **varie** d'une fenêtre à l'autre (captures « Meilleurs moments »). |
| Après déploiement (par John) | **deploy-watch** → Vercel + Sentry | Zéro régression runtime sur `/spots/[slug]`. |
| Clôture | **`/verif-sprint`** | `pnpm test` + `pnpm build` + `pnpm typecheck` + `pnpm lint` + revue indépendante + passe anti-régression. |

---

## Objectif du sprint en une phrase

Le vent **varie d'une fenêtre de pêche à l'autre** (fini le 25/25 partout) grâce à un échantillonnage horaire + une courbe recalibrée qui discrimine réellement.

---

## Diagnostic (déjà établi par lecture du code — point de départ de WS-A)

**Vent figé à 25/25.** Asymétrie dans `lib/solunar/` :
- `scoreTide()` lit le **tableau horaire** des points de marée et le **filtre sur la fenêtre** (`tidePoints.filter(p => p.hour >= startHour && p.hour <= endHour)`) → la marée varie correctement par fenêtre.
- `scoreWind()` reçoit `conditions.weather.wind_speed_kmh`, qui est un **scalaire unique pour toute la journée** : dans `lib/conditions/spot-forecast.ts`, `buildDayConditions()` ne garde que **l'heure de référence** (`refLocalHour = isToday ? currentHourIdx : 12`, soit midi pour les jours futurs) et jette le reste du tableau horaire `wind_speed_10m`.
- Conséquence : dans `lib/solunar/index.ts`, `computeDailyForecast()` construit jusqu'à 6 fenêtres (`MAX_WINDOWS_PER_DAY`) qui réutilisent **toutes la même valeur de vent** → composante vent **identique** sur toutes les fenêtres d'un jour.
- Aggravant : `scoreWind()` (`lib/solunar/scoring.ts`) renvoie un **plateau plat à 1.0 pour tout 5–15 km/h** (`if (v <= IDEAL_MAX_KMH) return 1.0`). Comme le contrib affiché = `Math.round(v01 * 0.25 * 100)`, dès que le vent de midi tombe dans 5–15 km/h (fréquent sur le littoral en journée), **toutes les fenêtres affichent 25/25**. Et comme les spots d'une même région partagent une météo proche, ça paraît « partout, tout le temps ».

→ La correction n'est donc pas un seul réglage : il faut (a) **échantillonner le vent par fenêtre** (comme la marée) et (b) **recalibrer la courbe** pour qu'elle ne sature plus aussi vite. WS-A confirme sur données réelles avant de toucher au modèle.

---

## Workstreams & dépendances

| WS | Bloc | Durée | Dépend de | Parallèle J1 |
|----|------|-------|-----------|--------------|
| **A** | Diagnostic vent sur données réelles (repro + preuve) | 0,5 j | préalable John | ✅ (en 1er) |
| **B** | Vent **par fenêtre** (échantillonnage horaire) | 1-1,5 j | A (constats) | ⚠️ démarre après A |
| **C** | Recalibrage **courbe vent** | 1 j | A (constats) | ⚠️ démarre après A |
| **VERIF** | revue finale indépendante | 0,5 j | tous | ❌ (toujours en dernier) |

> Règle ultracode : **WS-A** part en premier ; **WS-B et WS-C** s'enclenchent dès que WS-A a livré ses constats. Ils touchent les mêmes fichiers `lib/solunar/*` → se coordonner pour éviter les conflits : B sur l'échantillonnage/plomberie, C sur la courbe/config.

---

## WS-A — Diagnostic du vent sur données réelles (preuve avant correction)

Avant de changer le modèle, **prouver** la cause racine sur de vraies données (ne pas coder sur hypothèse). Ce bloc ne modifie aucun code de prod : il instrumente et documente.

> **Connecteurs** : **supabase-guard** (RO) pour lire `conditions_cache.payload` (vraies valeurs `weather.wind_speed_kmh`) et `spot_scores`. **docs-researcher** (Context7) pour confirmer que l'API Open-Meteo Forecast renvoie bien `wind_speed_10m` en **tableau horaire** (et l'unité par défaut = km/h).

### Tâches
1. Via **supabase-guard**, lire 5-10 lignes de `conditions_cache` (différents spots/jours) et relever les valeurs réelles de `weather.wind_speed_kmh`. Confirmer qu'elles tombent souvent dans 5–15 km/h.
2. Écrire un **script de repro** (`scripts/wind-scoring-smoke.ts`, sur le modèle de `scripts/scoring-smoke.ts`) qui, pour un spot donné, affiche pour chaque fenêtre du jour : heure centrale, vent utilisé, `factors.wind`, contrib `/25`. Démontrer que les 6 fenêtres ont **le même vent**.
3. Vérifier si le **multiplicateur perso** peut aussi saturer le vent (`scoreWindow` : `Math.min(windRaw * mult.wind, 1.0)`) — noter si la fiche spot publique (`app/(marketing)/spots/[slug]/page.tsx`) passe ou non un multiplicateur (a priori non, contexte public).
4. Écrire les constats dans `docs/sprint-19/DIAGNOSTIC-vent.md` (2-3 paragraphes + le tableau des valeurs relevées).

### Critères d'acceptation
- `docs/sprint-19/DIAGNOSTIC-vent.md` existe et montre, chiffres à l'appui, que (a) le vent est constant sur les fenêtres d'un même jour et (b) la courbe sature dans la bande commune 5–15 km/h.
- Le script `scripts/wind-scoring-smoke.ts` tourne (`pnpm tsx scripts/wind-scoring-smoke.ts`) et imprime le vent par fenêtre.

### Garde-fous
- Lecture seule sur la base. **Aucune écriture SQL.**
- Ne pas encore modifier `lib/solunar/*` ni `spot-forecast.ts` (c'est WS-B/C).

---

## WS-B — Échantillonner le vent **par fenêtre** (aligner sur la marée)

Faire varier le vent fenêtre par fenêtre, exactement comme la marée le fait déjà. C'est la correction structurelle principale.

> **Connecteurs** : **docs-researcher** (Context7) pour la forme exacte de la réponse Open-Meteo (indices horaires). Coordination avec WS-C sur `lib/solunar/scoring.ts`.

### Tâches
1. `lib/conditions/spot-forecast.ts` : enrichir le type `SpotConditions.weather` d'un **tableau horaire** du vent, p. ex. `wind_speed_by_hour: (number | null)[]` (24 entrées indexées par heure locale 0-23), **en plus** du scalaire existant (rétro-compat). Le remplir dans `buildDayConditions()` **et** `fetchSpotConditions()` à partir de `forecast.hourly.wind_speed_10m` (les indices horaires sont déjà calculés via `hourIndices`).
2. `lib/solunar/index.ts` (`buildWindow`) : calculer l'**heure centrale** de la fenêtre (déjà dispo via `centerEvent` / `getParisHour`) et passer à `scoreWindow` le vent **de cette heure** (`conditions.weather.wind_speed_by_hour[centerHour]`), avec **fallback** sur le scalaire puis `null` si absent.
3. `lib/solunar/scoring.ts` (`scoreWindow`/`scoreWind`) : accepter le vent de la fenêtre (signature inchangée si on continue de passer un `number | null`, seul l'appelant change). Vérifier que le `conditions_cache` plus ancien (sans le tableau) **dégrade proprement** (fallback scalaire).
4. Mettre à jour `lib/scoring/spot-scores-job.ts` si nécessaire (il appelle `computeWeeklyForecast` → bénéficie automatiquement, mais vérifier qu'aucune hypothèse de payload ne casse).
5. Tests : `lib/solunar/__tests__/scoring.test.ts` + `lib/scoring/__tests__/scoring-integration.test.ts` — ajouter un cas « deux fenêtres, même jour, vents horaires différents → contributions vent différentes ».

### Critères d'acceptation
- Sur un spot où le vent horaire varie (ex. 8 km/h le matin, 22 km/h l'après-midi), **deux fenêtres du même jour affichent des contribs vent différentes** (vérifiable via le script de WS-A mis à jour, ou un test).
- Aucun crash si `conditions_cache` ne contient pas encore `wind_speed_by_hour` (entrée pré-sprint) → fallback scalaire.
- `pnpm typecheck` vert (type `SpotConditions` mis à jour partout où il est consommé).

### Garde-fous
- Garder le scalaire `wind_speed_kmh` (utilisé par `components/conditions/WeatherGrid.tsx` etc.) — **ne pas le supprimer**, juste ajouter le tableau.
- ⚠️ Pas de migration : `conditions_cache.payload` est du JSON. Le cache se régénère tout seul (TTL 1h). Ne **pas** purger la table.

---

## WS-C — Recalibrer la **courbe** du vent

Rendre la courbe moins saturante pour que le vent **discrimine** vraiment, au lieu de coller à 1.0 sur toute la bande 5–15.

> **Connecteurs** : pur calcul (pas de lib externe). Coordination avec WS-B sur `scoring.ts`.

### Tâches
1. `lib/solunar/config.ts` (`WIND`) : resserrer le plateau idéal et lisser la décroissance. Proposition de départ (à valider en VERIF avec le script de repro) :
   - pic à ~8-12 km/h, **décroissance dès 12 km/h** (pas 15), pénalité plus marquée au-delà de 25.
   - éventuellement une **légère pénalité du vent quasi nul** (< 3 km/h : mer d'huile = souvent moins de touche selon l'espèce) — `⚠️ DÉCISION D1` (le brief ne tranche pas la philosophie halieutique sans John).
2. `lib/solunar/scoring.ts` (`scoreWind`) : remplacer le plateau plat par une courbe **continue** (pas de palier à 1.0 sur 10 km/h de large). Garder `UNKNOWN_SCORE` pour `null`.
3. Réajuster si besoin `QUALITY_THRESHOLDS` (déjà recalibrés au sprint 10.6) pour que la nouvelle distribution du vent ne fasse pas tout chuter — vérifier via le script qu'on n'a pas sur-corrigé (le vent ne doit pas devenir « toujours faible »).
4. Tests : remplacer/ajouter dans `lib/solunar/__tests__/scoring.test.ts` les cas de `scoreWind` (calme, idéal, modéré, fort, tempête, null) avec les nouveaux seuils + un test anti-saturation (« un vent de 18 km/h ne doit PAS donner 25/25 »).

### Critères d'acceptation
- `scoreWind(18)` (modéré) donne une contrib **strictement < 25** (anti-saturation), `scoreWind(10)` reste haut, `scoreWind(35)` est bas, `scoreWind(null)` = neutre.
- Sur le script de repro (WS-A), la **distribution des contribs vent sur 7 jours n'est plus constante** (écart-type > 0).
- Les tests Vitest scoring passent (mis à jour avec les nouveaux seuils — ne pas laisser d'anciens seuils en dur).

### Garde-fous
- ⚠️ **DÉCISION D1 (DEMANDER À JOHN AVANT de figer les seuils)** : (a) périmètre = vent seul, ou recalibrage plus large (revoir aussi poids 40/35/25, marée) ? (b) pénalise-t-on le vent quasi nul ? → Par défaut, **vent seul + courbe continue, sans pénalité forte du calme**. L'agent applique ce défaut si John ne répond pas, et le signale dans le RECAP.
- **Direction du vent** (offshore/onshore) = **hors périmètre** ici (nécessite l'orientation du trait de côte par spot, pas en base) → idée pour le track Excellence (Sprint 15 « Instruments marins »). Ne pas l'implémenter ce sprint.
- Ne pas toucher au scoring solunar (`scoreSolunar`) ni à la marée (`scoreTide`) sans accord — hors périmètre.

---

## Workstream VERIF (obligatoire, agent indépendant)

1. Lance **`/verif-sprint`** : `pnpm test` + `pnpm build` + `pnpm typecheck` + `pnpm lint` + revue croisée par un agent qui n'a pas écrit le code.
2. Relire chaque critère d'acceptation (WS-A → C) et cocher ✅/❌ **avec preuve** (sortie de test, capture qa-chrome, sortie du script de repro).
3. **Passe anti-régression ciblée (scoring)** : le vent **varie** sur 7 jours et entre fenêtres ; aucune fenêtre « moyenne » ne ressort en 25/25 ; les seuils qualité ne sont pas cassés (pas 7j/7 « Exceptionnelle » ni 7j/7 « Faible ») ; la marée et le solunar sont **inchangés**.
4. **Passe copy** : tutoiement, zod FR le cas échéant. Aucune promesse produit mensongère.
5. Confirmer **aucune migration** introduite (ou, si une l'a été par erreur, l'isoler en fichier numéroté ≥ 034 et régénérer `lib/types.ts`).
6. Livrer `docs/sprint-19/RECAP.md` : fait / comment tester / décision D1 retenue / **reste manuel John**.

---

## Reste manuel John (post-sprint)

- Trancher **D1** (périmètre/seuils scoring vent) si pas déjà fait — sinon le défaut du brief s'applique.
- Relire la branche, `pnpm test`/`build` verts en local.
- **Merge → `main`** puis déploiement Vercel (le cron `compute-spot-scores` recalculera les `spot_scores` au prochain run ; pour voir l'effet tout de suite, **déclencher le cron manuellement** ou attendre le run quotidien). Le `conditions_cache` se régénère seul (TTL 1h).
- QA finale en prod via **deploy-watch** (Sentry propre sur `/spots/[slug]`).
- Confirmer la position dans la file (numéroté 19 ; avançable avant les sprints 12-18 si tu veux le traiter plus tôt — hotfix autonome).

---

## Hors périmètre (reporté à un sprint ultérieur)

**Carte — rendu des spots gaté au zoom + viewport.** Retiré de ce sprint (décision John 2026-06-22), à reprendre plus tard. Le diagnostic reste valable pour ne pas le refaire :
- `components/map/MapView.tsx` pose **un marqueur DOM HTML par spot** (`createPins()`) en dessous de `MAX_HTML_MARKERS = 200`, **tous rendus en permanence**, sans seuil de zoom ni découpage viewport → lag qui grossit avec la curation (cible 100-120 spots).
- Le mode cluster GeoJSON (GPU, peu coûteux) n'est activé qu'au-dessus de 200 spots → jamais en pratique. Aucun `minzoom` sur les couches spots.
- Piste : couche GeoJSON `circle` gatée par `minzoom` (spots individuels visibles seulement zoomé sur une zone) + clustering en dessous ; décisions à trancher (seuil de zoom, sort des pins DA v2 / badge ✓). À ouvrir comme son propre sprint quand John le voudra.

---

## Rappels invariants (cf `CLAUDE.md` §11/§13/§14)

- Pas de push sans validation de John. RLS jamais désactivé. Migrations = nouveaux fichiers numérotés (a priori **aucune ici**). Régénérer `lib/types.ts` **seulement** si migration réelle.
- Le brief est un guide : si un agent constate que la cause racine diffère du diagnostic ci-dessus (WS-A), il **met à jour le diagnostic** et adapte WS-B/C — il ne force pas une correction fausse.
