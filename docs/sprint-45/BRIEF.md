# Sprint 45 — Brief d'exécution
## « Le moat visible » (enrichissements quick wins · ~4-5 j)

> Rédigé le 2026-06-28. 1ᵉʳ sprint d'**enrichissement** (roadmap `docs/ROADMAP-CORRECTIFS-ENRICHISSEMENTS-2026-06-28.md` §5). Suit les correctifs (42/42.1/43/44).
> Idée directrice : **on ne construit presque rien de nouveau, on rend VISIBLE la donnée déjà captée.** Le moteur de scoring perso est déjà scopable par espèce et calcule déjà le facteur « leurre » ; on le surface. C'est le meilleur ratio impact/effort et c'est **incopiable** par les concurrents génériques (FishFriender, spot-de-peche, Fishing Grid).
> **Constat clé (re-vérifié)** : `getPersonalTendencies({species})` existe (`lib/scoring/personal/fetch.ts:26`), le facteur `gear` est déjà exposé et trié par part. La fiche espèce l'affiche déjà s'il domine. **Aucune migration obligatoire** (tout est app-side ; 1 RPC records optionnelle).

**⚠️ État** : migrations à **074** ; le sprint 44 (en cours) prend `075/076/077` → ce sprint démarre à **`078`** si besoin (mais a priori 0 migration). **Coordination 44** : WS D (poids estimé) s'affiche **là où le sprint 44 ajoute l'affichage de `measured_length_cm`** (`carnet/[id]/page.tsx:189-214`) → mieux vaut le faire **après** que 44 soit mergé. `supabase-guard` confirme l'état avant de démarrer.

---

## 🚀 Ligne de lancement (à copier-coller par John)

> ultracode — effort xhigh. Exécute `docs/sprint-45/BRIEF.md`. Tout est **app-side, descriptif (jamais prédictif)**, et réutilise le moteur `lib/scoring/personal/`. Les 4 workstreams sont indépendants (WS D après que 44 soit mergé). Pour la conversion taille→poids, **sourcer de vrais coefficients FishBase** par espèce, ne RIEN inventer ; afficher comme « estimation ». Termine par **VERIF**. **Ne push pas.** Décision ouverte → `⚠️ DEMANDER À JOHN`.

---

## 🧠 Connecteurs & sous-agents

| Quand | Sous-agent → connecteur | Pourquoi |
|---|---|---|
| Avant de coder le scoring scopé / le matching conditions | **docs-researcher** → Context7 | API React 19 / patterns server-component (le barrel `index.ts` tire `next/headers` → importer `config`/`types` par sous-module en client). |
| Coefficients longueur-poids par espèce | **WebSearch** (FishBase) | Vraies valeurs `a`/`b` (W = a·Lᵇ) par espèce, sourcées et datées. Pas d'invention. |
| Lecture stats/carnet (records par espèce) | **supabase-guard** → Supabase (RO) | Vérifier la forme de `catches_for_viewer` ; arbitrer RPC vs app-side. |
| QA des écrans (fiche espèce, /home, carnet, prise) | **qa-chrome** → Claude in Chrome | Vérifier le rendu + l'honnêteté descriptive. |
| Clôture | **`/verif-sprint`** | Build + typecheck + lint + tests. |

## Workstreams & dépendances

| WS | Bloc | Effort | Migration | Parallèle J1 |
|----|------|--------|-----------|--------------|
| A | Meilleur leurre par espèce (highlight) sur `/especes` | S | — | ✅ |
| B | « Le bon leurre pour aujourd'hui » sur `/home` (croisement leurre×conditions) | M | — | ✅ |
| C | Records perso par espèce (carnet + fiche) | M | optionnelle | ✅ |
| D | Conversion taille→poids (coefficients + affichage) | M | — | ⚠️ après 44 |
| VERIF | revue + QA | S | — | ❌ |

## ⚠️ Invariant transverse
**Descriptif, jamais prédictif.** On dit « sur tes bars, tu sors surtout le Black Minnow » (fait observé), jamais « utilise le Black Minnow » ni « ça va mordre ». Aucun chiffre 0-100 perso. Seuils de confiance respectés (`MIN_PER_FACTOR=2`, confiance low/medium/high) : pas de message fort sur 2 prises sans le qualifier.

---

## WS A — Meilleur leurre par espèce (highlight) sur `/especes`

**Déjà à 80%.** `components/especes/species-personal.tsx:8-9` appelle `getPersonalTendencies({ species: dbKey })` et délègue à `PersonalTendencies` qui affiche **tous** les facteurs triés par part — donc le leurre s'affiche **s'il domine**. Le manque : il n'est pas **mis en avant** comme « ton meilleur leurre sur cette espèce ».

### Tâches
1. Dans `components/especes/species-personal.tsx` (ou un petit sous-composant), lire explicitement la tendance leurre : `data.tendencies.find(t => t.factor === 'gear' && t.hasData)` et l'afficher en **highlight** distinct : « 🎣 Ton meilleur leurre sur {espèce} : {t.label} ({Math.round(t.share*100)} % de tes prises, {confiance}) ». Garder le bloc générique en dessous.
2. Réutiliser `FACTOR_LABELS`/`CONFIDENCE_LABELS` (`lib/scoring/personal/config.ts:67-74`) importés **par sous-module** (pas le barrel, qui tire `next/headers`).
3. État vide honnête si pas assez de prises (réutiliser la logique `hasEnough`/`minToUnlock` de `PersonalTendencies.tsx`).
4. Monté déjà : `app/(marketing)/especes/[slug]/page.tsx:413-415` (sidebar) — rien à déplacer.

### Critères d'acceptation
- Sur `/especes/bar`, un utilisateur avec ≥ prises au leurre voit « Ton meilleur leurre sur le bar : … » en évidence ; sinon état vide propre.
- Descriptif, gratuit (le moat reste gratuit).

---

## WS B — « Le bon leurre pour aujourd'hui » sur `/home`

**Le morceau net-neuf.** Le moteur scope par espèce/spot mais **pas par conditions**. Il faut croiser les **conditions du jour** (marée + vent) avec l'historique leurre de l'utilisateur, descriptivement.

### Tâches
1. **Récupérer les conditions du jour** : `components/home/TodayForecast.tsx:84,93-97` charge déjà `fetchSpotConditions(lat,lng)` (type `SpotConditions`, `lib/conditions/spot-forecast.ts`). En dériver l'état de marée courant (`tide_state` montante/descendante) et un **bucket vent** grossier (faible/modéré/fort), avec les mêmes seuils que `buckets.ts`.
2. **Helper net-neuf** (server) `lib/scoring/personal/best-gear-today.ts` : lire les prises de l'utilisateur (`catches_for_viewer`, comme `fetch.ts:33-37`), filtrer celles aux **conditions similaires** (même `tide_state` + même bucket vent), et trouver le **leurre dominant** (réutiliser `gearFromRow`, `buckets.ts:89-98` + `dominant()`, `tendencies.ts:20-33`). Renvoyer `{ label, share, sampleCount, confidence }` ou `null` si < seuil.
3. **Afficher** dans `TodayPersonalOverlay.tsx` (`:55-69`) ou un bloc dédié : « En marée descendante et vent modéré, tu sors surtout le {leurre} ({n} prises) ». Gate de confiance : pas de message si `sampleCount < MIN_PER_FACTOR`.
4. Strictement **descriptif** (« tu sors surtout »), jamais « utilise ».

### Critères d'acceptation
- Avec un historique suffisant, `/home` affiche le leurre gagnant **pour les conditions du jour**, daté et chiffré.
- Conditions insuffisantes ou peu de prises → rien (ou message « pas encore assez de prises dans ces conditions »).

### Garde-fous
- ⚠️ **DEMANDER À JOHN (D3)** : finesse du matching — `tide_state` seul (simple) ou `tide_state` + vent (reco) ? Ajouter la saison plus tard.
- Ne pas ré-écrire le moteur : un helper qui réutilise `gearFromRow`/`dominant`.

---

## WS C — Records perso par espèce

**Aujourd'hui** : `getMyCatchStats()` (`lib/catches/queries.ts:70-78`) ne donne qu'**un** record global (`biggestCatch`, sur `size_cm`). On veut le **max par espèce** (taille et/ou poids).

### Tâches
1. **Calcul des records par espèce** : agréger depuis `catches_for_viewer` (scopé `auth.uid()` serveur) le `max(size_cm)` (et `max(measured_length_cm)`, `max(weight_g)`) **par `species`**. **App-side** (la donnée est dans la vue) ou RPC `get_my_records_by_species` (cf D1).
2. **Afficher** :
   - Sur le **carnet** : une section « Tes records » (à côté de `CatchStatsDetailed`, `app/(app)/carnet/page.tsx:169`), une ligne par espèce pêchée (« Bar : 62 cm · Dorade : 41 cm »).
   - Sur la **fiche espèce** (`/especes/[slug]`) : « Ton record de {espèce} : X cm » (réutilise WS A).
3. **🟡 Nettoyage** : `components/catches/CatchStatsRow.tsx:3-10` et `CatchStatsDetailed.tsx:9-16` ont une liste de **6 espèces en dur** (legacy) → remplacer par `SPECIES_LABELS` (`lib/labels.ts:18`, 26 espèces) (cf D4).

### Critères d'acceptation
- Le carnet montre le record (taille) par espèce pêchée ; la fiche espèce montre « ton record de … ».
- Privé (RLS owner, scoping serveur), pas de classement inter-pêcheurs (anti-leaderboard).

### Garde-fous
- ⚠️ **DEMANDER À JOHN (D1)** : records en app-side (reco v1) ou RPC dédiée ?

---

## WS D — Conversion taille → poids (estimation)

**Net-neuf intégral** : aucun coefficient longueur-poids n'existe (`grep` exhaustif négatif). `weight_g` est une saisie manuelle ; on ajoute une **estimation** à partir de la taille.

### Tâches
1. **Coefficients** `lib/species/morphometry.ts` (net-neuf) : table `{ [dbKey]: { a, b, source } }` pour les espèces du carnet, **valeurs réelles sourcées FishBase** (relation W = a·Lᵇ, L en cm, W en g). **Ne RIEN inventer** : pour une espèce sans `a`/`b` fiable, pas d'estimation. Citer la source.
2. **Fonction** `estimateWeightG(species, lengthCm): number | null`.
3. **Afficher** le poids estimé là où la taille est rendue (coordonner avec le sprint 44 qui ajoute l'affichage `measured_length_cm`) : `app/(app)/carnet/[id]/page.tsx:189-214` (détail), `CatchCard.tsx:99-105`, `CatchRowItem.tsx:44-47`. Libellé **« ~X kg (estimé) »** distinct du `weight_g` saisi. Si l'utilisateur a saisi un poids réel, afficher le réel en priorité, l'estimé en complément.
4. (option) Pré-remplir le champ poids du form en estimation modifiable quand l'utilisateur saisit une taille (`CatchForm.tsx`), clairement « estimation, ajuste si tu pèses ».

### Critères d'acceptation
- Une prise avec une taille affiche « ~X kg (estimé) » pour les espèces couvertes ; rien pour les non couvertes.
- Les coefficients sont **sourcés** (commentaire + source dans `morphometry.ts`), jamais inventés ; libellé « estimé ».

### Garde-fous
- ⚠️ **DEMANDER À JOHN (D2)** : on couvre d'abord les 6 espèces cœur (sûres) puis on étend, ou les 26 d'emblée ?
- Honnêteté : « estimé » toujours visible, jamais présenté comme une pesée.

---

## Workstream VERIF (obligatoire, agent indépendant)
1. `/verif-sprint` : build + typecheck + lint + tests verts.
2. **QA (qa-chrome)** : fiche espèce « meilleur leurre » ; `/home` « bon leurre pour aujourd'hui » selon conditions ; carnet records par espèce ; prise « ~X kg (estimé) ».
3. **Passe honnêteté/invariants** : tout est **descriptif** (aucun « utilise » / « ça va mordre ») ; coefficients poids **sourcés** ; records **privés** (pas de leaderboard) ; moat gratuit ; floutage GPS intact.
4. **Passe perf** : pas de requête lourde au mount `/home` (le helper best-gear réutilise le fetch existant, pas un appel en plus si possible).
5. **Passe copy** : tutoiement, pas de tiret cadratin (`node scripts/lint-copy-dashes.mjs`).
6. Livrer `docs/sprint-45/RECAP.md` : fait / comment tester / statut D1-D4 + sources des coefficients poids.

---

## Décisions pour John
- **D1 (records)** — app-side depuis `catches_for_viewer` (reco v1) ou RPC `get_my_records_by_species` (migration `078`, perf/réutilisable) ?
- **D2 (poids)** — couvrir d'abord les 6 espèces cœur (sûres, sourcées) puis étendre, ou viser les 26 d'emblée ?
- **D3 (matching /home)** — leurre par `tide_state` seul ou `tide_state` + vent (reco) ?
- **D4 (nettoyage)** — remplacer les listes d'espèces en dur (`CatchStatsRow`/`CatchStatsDetailed`) par `SPECIES_LABELS` (reco oui, cheap) ?

## Reste manuel John (post-sprint)
- (Si D1 = RPC) appliquer `078`, regen types. Sinon 0 migration.
- Relire le diff, merger `sprint-45` → `main`, déployer, QA des 4 surfaces.

---

> **Invariants (rappel)** : pas de push sans validation · **scoring descriptif jamais prédictif** · coefficients poids **sourcés FishBase, jamais inventés** (libellé « estimé ») · records **privés** (zéro leaderboard) · moat gratuit · imports client depuis sous-modules `lib/scoring/personal/*` (pas le barrel en composant client) · copy sans tiret cadratin.
