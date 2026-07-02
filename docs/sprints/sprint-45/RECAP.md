# Sprint 45 — RECAP
## « Le moat visible » (enrichissements quick wins)

> Exécuté le 2026-06-28 (ultracode, 4 workstreams parallèles). **Pas poussé.** **0 migration** (tout app-side). Idée : rendre VISIBLE la donnée perso déjà captée, sans réécrire le moteur. Incopiable par les concurrents génériques.

---

## Décisions John (tranchées avant exécution)
- **D1** = records **app-side** depuis `catches_for_viewer` (0 RPC, 0 migration).
- **D2** = couvrir le **maximum d'espèces** avec a/b FishBase fiables (résultat : **24/26**).
- **D3** = matching `/home` sur **`tide_state` + bucket vent**.
- **D4** = remplacer les listes d'espèces en dur par **`SPECIES_LABELS`** (26).

## Fait par workstream

### WS A — Meilleur leurre par espèce + record (fiche `/especes`)
- `components/especes/species-personal.tsx` : highlight « Sur {espèce}, tu sors surtout au {leurre} ({X} % de tes prises, {confiance}) » au-dessus du bloc générique, gaté par `data.hasEnough` (seuils du moteur respectés). Réutilise `CONFIDENCE_LABELS` depuis le **sous-module** `config` (pas le barrel).
- Record par espèce inline (`fetchSpeciesRecord`, SELECT scopé `user_id`+`species` sur `catches_for_viewer`, **privé**) : « Ton record de {espèce} : X cm » (longueur mesurée préférée, jamais « vérifiée »), + poids si présent. Rien si pas de prise.

### WS C — Records par espèce (carnet) + nettoyage
- `lib/catches/queries.ts` : `getMyRecordsBySpecies()` agrège **app-side** le max de taille (`max(size_cm, measured_length_cm)`) + poids par espèce, scopé serveur (RLS `auth.uid()` + filtre `user_id`). Type `SpeciesRecord[]` trié.
- `components/catches/RecordsBySpecies.tsx` (neuf) : section « Tes records » privée, une ligne par espèce (`SPECIES_LABELS`), `null` si vide. Câblé dans `carnet/page.tsx` après `CatchStatsDetailed`.
- **D4** : `CatchStatsRow.tsx` + `CatchStatsDetailed.tsx` tirent désormais de `SPECIES_LABELS`/`TECHNIQUE_LABELS` (fini les 6 espèces en dur).

### WS B — « Le bon leurre pour aujourd'hui » (`/home`)
- `lib/scoring/personal/best-gear-today.ts` (neuf, serveur) : `getBestGearToday()` lit les prises (`catches_for_viewer` scopé), `toCatchSamples` (réutilisé), **filtre au même `tide_state` ET même `bucketizeWind`** que le jour + gear non null, prend le dominant → `{label, share, sampleCount, confidence}` ou `null` si `< MIN_PER_FACTOR`.
- `TodayForecast.tsx` dérive l'état de marée + vent des **conditions déjà chargées** (pas de 2e fetch), passe le résultat à `TodayPersonalOverlay.tsx` : « En marée descendante et par vent modéré, tu sors surtout le {leurre} ({n} prises) ». **Descriptif**, jamais « utilise ».

### WS D — Conversion taille → poids (estimation FishBase)
- `lib/species/morphometry.ts` (neuf) : table `MORPHOMETRY` (a, b, scientifique, source) **24/26 espèces** avec a/b **réels FishBase** (W = a·Lᵇ, cm TL → g) ; `estimateWeightG()` → `null` si non couverte. Céphalopodes (seiche/calmar) **volontairement exclus** (FishBase mesure le manteau, pas la longueur totale → pas d'estimation faussée).
- Affichage « ~X kg (estimé) » sur détail / carte / ligne (à côté de l'affichage mesure du sprint 44), longueur mesurée préférée. Poids réel saisi affiché en priorité, estimé en complément. **« estimé » toujours visible**, jamais une pesée.

---

## VERIF (gate verte)
- `pnpm typecheck` **0** · `pnpm lint` **0** · `pnpm test` **574 verts** · `pnpm build` **OK** (`/especes/[slug]`, `/carnet`, `/home`).
- **Vérification adverse FishBase indépendante** (agent + WebSearch sur 7 espèces) : **4/7 identiques au chiffre près** aux estimations bayésiennes FishBase (bar, congre, maquereau, orphie), **3/7 dans l'intervalle de confiance** (<8 %), tous les `b` ∈ [2,92 ; 3,28]. **Aucune valeur fabriquée.** → 2 alignements de fidélité appliqués (`dorade_royale` a=0.01202, `chinchard` b=2.97, valeurs bayésiennes centrales).
- **Honnêteté/invariants** : tout **descriptif** (aucun « utilise »/« ça va mordre » en copy visible) ; records **privés** (scoping serveur, zéro leaderboard) ; coefficients **sourcés** ; moat **gratuit** ; imports client depuis les sous-modules (pas le barrel) ; floutage GPS intact.
- **Copy** : 2 warnings copy-dashes = séparateurs `<title>`/OG légitimes (exception §6), pré-existants.

## ⚠️ Suivis / préférences (non bloquants)
1. **WS B** : la ligne « leurre du jour » peut s'afficher dans l'état dégradé (< 3 prises au total) si ≥ 2 prises existent dans ces conditions précises (seuil par-facteur). Volontaire + qualifié (sampleCount + confiance), mais ⚠️ John : restreindre à `hasEnough` si tu préfères ne l'afficher qu'une fois les tendances globales débloquées ?
2. **WS C** : `maxWeightG` = poids max toutes prises de l'espèce (pas forcément le poids de la prise qui détient le record de taille). Ajustement trivial si tu veux le poids DE la prise record.
3. **WS A** : record affiché dans la **sidebar** de la fiche (via le composant déjà câblé), pas dans le hero. Préférence à signaler.
4. **WS D** : coefficients calibrés sur la longueur **totale (TL)** ; une mesure à la fourche surévaluerait un peu. Céphalopodes non couverts. Disclaimer TL plus explicite possible si voulu.

## Reste manuel John
- Relire, merger `sprint-45` → `main`, déployer, QA des 4 surfaces (fiche espèce « meilleur leurre » + record ; `/home` « bon leurre pour aujourd'hui » ; carnet « tes records » ; prise « ~X kg estimé »).

---

> **Invariants tenus** : pas de push · 0 migration · scoring **descriptif jamais prédictif** · coefficients poids **sourcés FishBase, vérifiés, jamais inventés** (libellé « estimé ») · records **privés** (zéro leaderboard) · moat gratuit · imports client depuis sous-modules · copy sans tiret cadratin.
