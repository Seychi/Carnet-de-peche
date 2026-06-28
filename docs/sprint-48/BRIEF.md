# Sprint 48 — Brief d'exécution
## « Confiance visible » (badge + marées au port · ~4-5 j)

> Rédigé le 2026-06-28. Enrichissement (roadmap `docs/ROADMAP-CORRECTIFS-ENRICHISSEMENTS-2026-06-28.md` §8). Rendre lisibles et solides les deux arguments de confiance : **badge spot vérifié** (anti-Decathlon « spots flous ») et **marées précises au port** (anti-Fishing Grid « marées imprécises ~30 min »).
> **Déjà fait par le sprint 44 (NE PAS refaire)** : « Vérifié le JJ/MM » est affiché (encart fiche `page.tsx:651-668`, `verified_at` exposé par `get_spot_by_slug` via 075), et l'offset marées est appliqué partout (calendrier 7j compris). Ce sprint ajoute les **enrichissements** restants.
> **Constats clés (re-vérifiés)** : `reports` accepte déjà `target_type='spot'` (`001_init.sql:178`) + RLS agnostiques → le report d'erreur réutilise tout. `moderateVerifySpot` (`spots.ts:258-305`) agit **déjà** sur un spot approuvé (pas de filtre statut) → il ne manque que la vue admin. Pipeline marées complet (`tide_calibration` 062/064, `verify-tides.ts`, `TideCalibrationNote`).

**⚠️ État** : migrations à **079** (46 a posé `078/079`) ; le sprint 47 (en cours) en prend quelques-uns → ce sprint démarre ~`082`+. **Confirmer le dernier numéro avant de créer.**

---

## 🚀 Ligne de lancement (à copier-coller par John)

> ultracode — effort xhigh. Exécute `docs/sprint-48/BRIEF.md`. **Confirme le dernier numéro de migration.** Réutilise `reports`/`reportPost` (report coord), `moderateVerifySpot` (re-vérif), et le pipeline `tide_calibration`/`verify-tides`/`TideCalibrationNote`. Invariants : **données marées SHOM réelles, jamais inventées** ; floutage GPS intact (report = pas de coord exposée) ; modération = `is_moderator` only. Migrations numérotées + regen `lib/types.ts`. Termine par **VERIF**. **Ne push pas.** Décision ouverte → `⚠️ DEMANDER À JOHN`.

---

## 🧠 Connecteurs & sous-agents

| Quand | Sous-agent → connecteur | Pourquoi |
|---|---|---|
| Migrations (verification_level, seed ports), RLS, RPC | **supabase-guard** → Supabase (RO d'abord) | Confirmer numéros ; seed marées en service-role ; regen types. |
| Données SHOM par port (calibration) | **WebSearch / SHOM officiel** | Vraies heures PM/BM par port (shom.fr / almanach officiel), jamais inventées. |
| QA (report coord, vue admin, badge précision marées) | **qa-chrome** → Claude in Chrome | Vérifier les parcours + 0 fuite de coordonnée. |
| Clôture | **`/verif-sprint`** | Build + typecheck + lint + tests. |

## Workstreams & dépendances

| WS | Bloc | Effort | Migration | Parallèle J1 |
|----|------|--------|-----------|--------------|
| A | Report d'erreur de coordonnée (réutilise `reports`) | S-M | — | ✅ |
| B | Niveaux de vérification + page admin re-vérifier | M | verification_level | ✅ |
| C | Historique de fiabilité (« il y a N mois · K prises depuis ») | S | — | ✅ |
| D | Marées au port (calibration + badge précision + fraîcheur) | M | seed ports | ✅ |
| VERIF | revue + QA | S | — | ❌ |

Tous indépendants. WS A et C sont app-side ; B et D ont une migration.

---

## WS A — Report d'erreur de coordonnée (« cette position est fausse »)

**Réutilise `reports`** (zéro migration : `target_type='spot'` déjà accepté `001:178`, RLS agnostiques, colonne `details` 019).

### Tâches
1. **Action** `reportSpotCoordinate(spotId, reason, details?)` dans `app/actions/spots.ts`, calquée sur `reportPost` (`app/actions/feed.ts:571-610`) : insert `reports` avec `target_type:'spot'`, `target_id:spotId`, `reporter_id=auth.uid()`. Nouvel enum de raisons orienté coord : `['coord_fausse','acces_change','danger_manquant','autre']` (cf D1). Garde authentifié + alerte volume (modèle `feed.ts:600-607`).
2. **Dialog** `components/spots/ReportSpotDialog.tsx` calqué sur `components/feed/ReportDialog.tsx` (radios + textarea ≤1000).
3. **Bouton** « Signaler une erreur de position » sur la fiche spot (`app/(marketing)/spots/[slug]/page.tsx`, zone sidebar près de l'encart vérifié ~`:668`).
4. **Modération** : les reports `target_type='spot'` apparaissent dans l'onglet `reports` (`moderation/page.tsx:363-368`, déjà filtré `status='pending'`, agnostique au type) — vérifier l'affichage du contexte spot (lien vers la fiche, action « ouvrir en re-vérif » → WS B).

### Critères d'acceptation
- Un utilisateur signale une coordonnée fausse → un `report` `target_type='spot'` est créé et visible en modération.
- **Aucune coordonnée exposée** dans le flux (le report ne contient pas de geom).

### Garde-fous
- ⚠️ **DEMANDER À JOHN (D1)** : valider l'enum de raisons (coord_fausse / accès changé / danger manquant / autre).

---

## WS B — Niveaux de vérification + page admin re-vérifier

**Aujourd'hui** : `verified` est binaire ; la modération ne liste que les `pending` ; `moderateVerifySpot` est **idempotent** (no-op si déjà vérifié, `spots.ts:271`).

### Tâches
1. **Migration — `verification_level`** : `ALTER TABLE public.spots ADD COLUMN verification_level text CHECK (verification_level IN ('communaute','ambassadeur','equipe') OR verification_level IS NULL);`. **Dérivation** (au moment de la vérif) : modérateur → `equipe` ; (réveil de `profiles.is_ambassador`, déjà existant `001:32`) → `ambassadeur` ; sinon `communaute`. Backfill les curés vérifiés en `equipe`. Exposer dans `get_spot_by_slug` (DROP+CREATE) + le badge.
2. **Badge gradué** : sur la carte/fiche, distinguer visuellement `equipe` (✓ premium) vs `ambassadeur` vs `communaute` (le ✓ actuel `MapView`/fiche reste pour `equipe`). Légende mise à jour.
3. **Page admin « re-vérifier »** : nouvel onglet/vue dans `moderation/page.tsx` listant **tous les spots** (au-delà des `pending`), filtrable par nom/dépt/source/statut, avec un bouton « re-vérifier la coordonnée ». Backend : **action `moderateReverifySpot(spotId)`** (nouvelle, sur le modèle `moderateVerifySpot` `spots.ts:258`) qui **re-horodate `verified_at`/`verified_by` même si déjà vérifié** (sans la garde idempotente `:271`). Garde `viewerIsModerator` (`spots.ts:166`).

### Critères d'acceptation
- Un spot affiche son niveau (équipe/ambassadeur/communauté) ; la légende l'explique.
- Un modérateur peut re-vérifier un spot **déjà approuvé/curé** (re-horodatage visible).

### Garde-fous
- ⚠️ **DEMANDER À JOHN (D2)** : v1 = niveaux **dérivés** (équipe/ambassadeur/communauté) sans compteur de confirmations communautaires (table `spot_confirmations` = fast-follow), ou on construit dès maintenant le compteur « K pêcheurs confirment » ?
- Ne pas casser la contrainte `verified ⇒ source='curated'`.

---

## WS C — Historique de fiabilité

« Vérifié il y a N mois · K prises confirmées depuis ». **App-side, données existantes.**

### Tâches
1. Sur la fiche spot, sous l'encart vérifié (`page.tsx:651-668`) : afficher la **fraîcheur relative** « audité il y a N mois » à partir de `spot.verified_at` (aujourd'hui seul le JJ/MM absolu, `page.tsx:662`).
2. **K prises depuis** : compter les prises publiques postérieures à `verified_at` (`catches_for_viewer.eq('spot_id').gte('caught_at', verified_at).eq('privacy','public')`, modèle `fetchCatchCount` `page.tsx:98-106`, ou `get_spot_activity` `018` avec `p_days` calculé). Afficher « N prises confirmées depuis la vérification ».
3. Idem pour la **fraîcheur de la calibration marées** (WS D) : « audité il y a N mois » depuis `tide_calibration.verified_at`.

### Critères d'acceptation
- La fiche montre « Vérifié il y a 8 mois · 23 prises confirmées depuis » (ou l'état réel).
- Zéro coordonnée précise (compteur agrégé via la vue floutée).

---

## WS D — Marées au port (extension + badge précision + fraîcheur)

**Aujourd'hui** : 5 ports calibrés (`064:22-31`), 15 départements mappés (`tide-calibration.ts:34-53`), Méditerranée non couverte. Le résidu + la date sont affichés (`TideCalibrationNote`).

### Tâches
1. **Étendre la calibration (ops/data)** : pour les départements côtiers non couverts (Manche/Atlantique mappés sur un port lointain, et façades manquantes), **sourcer les heures PM/BM SHOM officielles** (shom.fr / almanach), les ajouter aux fixtures `scripts/fixtures/shom-tides.json`, lancer `pnpm verify-tides` (génère le bloc seed `:365-384`), puis **migration de seed service-role** (modèle `064`) pour insérer les nouveaux ports. **Étendre le mapping** `ATLANTIC_PORT_BY_DEPARTMENT`/`DEPARTMENT_FACADE` (`tide-calibration.ts:23-53`) pour rattacher chaque dépt à son port le plus proche. ⚠️ **Données SHOM réelles, jamais inventées** ; Méditerranée reste un cas séparé (marnage faible).
2. **Badge de précision visible** : un chip compact « marées ±N min · calé SHOM » (depuis `residual_min`) dans le hero/sidebar de la fiche (aujourd'hui seulement l'encart `TideCalibrationNote:34-40`). Rendre le travail invisible **visible** au moment de la décision.
3. **Fraîcheur** (cf WS C) : « audité il y a N mois ».

### Critères d'acceptation
- Plus de départements côtiers calés sur un port proche (couverture élargie, sourcée SHOM, datée).
- Un chip « marées ±N min, calé SHOM » visible sur la fiche.

### Garde-fous
- ⚠️ **DEMANDER À JOHN (D3)** : priorité des ports à ajouter (Manche/Atlantique mal couverts d'abord) ? Médit traitée comme « marnage faible » plutôt que calibrée ?
- Jamais inventer une heure de marée ni un coef (`tide_coefficient` reste null).

---

## Workstream VERIF (obligatoire, agent indépendant)
1. `/verif-sprint` : build + typecheck + lint + tests verts.
2. **QA (qa-chrome)** : report d'erreur de coordonnée → modération ; niveau de vérification affiché ; admin re-vérifie un spot approuvé ; fiche « vérifié il y a N mois · K prises » ; chip « marées ±N min ».
3. **Passe sécurité** : report sans coord exposée ; modération `is_moderator` only ; `verified ⇒ curated` respectée ; floutage GPS et compteurs agrégés (vue floutée) intacts ; calibration en service-role only.
4. **Passe honnêteté** : marées SHOM réelles + datées (jamais inventées) ; niveaux dérivés de signaux réels.
5. **Passe copy** : tutoiement, pas de tiret cadratin (`node scripts/lint-copy-dashes.mjs`).
6. Livrer `docs/sprint-48/RECAP.md` : fait / comment tester / statut D1-D3 + ports SHOM ajoutés (sources).

---

## Décisions pour John
- **D1 (raisons report)** — enum coord_fausse / accès changé / danger manquant / autre ?
- **D2 (niveaux)** — v1 dérivés (équipe/ambassadeur/communauté) sans compteur de confirmations (reco), ou construire le compteur « K pêcheurs confirment » (table `spot_confirmations`) maintenant ?
- **D3 (marées)** — priorité des ports à calibrer ; Méditerranée = « marnage faible » plutôt que calibrée ?
- **D4 (leaderboard anonymisé, roadmap §8)** — rappel : on **s'abstient** du classement compétitif (ADN anti-comparaison) ; le partage records/Wrapped (sprint 47) couvre déjà l'angle, descriptif. OK ?

## Reste manuel John (post-sprint)
- **Sourcer + saisir les fixtures SHOM** des nouveaux ports (données officielles), lancer `verify-tides`, appliquer la migration de seed.
- Flagger les comptes ambassadeurs (`UPDATE profiles SET is_ambassador=true` comme pour `is_moderator`).
- Appliquer les migrations, regen types, merger `sprint-48` → `main`, déployer, QA.

---

> **Invariants (rappel)** : pas de push sans validation · RLS jamais désactivé (modération `is_moderator`) · migrations = nouveaux fichiers + regen `lib/types.ts` · **données marées SHOM réelles, jamais inventées** (ni coef) · report/compteurs **zéro coordonnée exposée** (vue floutée) · `verified ⇒ curated` · pas de leaderboard compétitif · copy sans tiret cadratin.
