# Sprint 43 — Brief d'exécution
## « Le curage » (la file de vérification des spots importés · ~5-6 j + ops continu)

> Rédigé le 2026-06-28. Suite directe du sprint 42 (qui a masqué les 942 imports OSM en `moderation_status='pending'`). Ici on construit l'**outil** qui transforme ce backlog en spots **curés et vérifiés un par un**, à la méthode du sprint originel (sourcé puis vérifié).
> Préalable : sprint 42 déployé (imports en `pending`, donc masqués de la carte). Sinon, les imports sont encore publics et le curage ne fait qu'enrichir des spots déjà visibles (acceptable mais moins propre).
> Le sprint livre la **file de curage** ; le **curage lui-même** (renseigner + vérifier chaque spot) est ton travail ops continu ensuite.

**⚠️ État** : migrations à 072 (post-sprint 42). **Aucune migration de schéma nécessaire ici** (la RLS modérateur et toutes les colonnes existent déjà). Vérifier quand même le dernier numéro avant tout ajout éventuel.

---

## 🚀 Ligne de lancement (à copier-coller par John)

> ultracode — effort xhigh. Exécute `docs/sprint-43/BRIEF.md`. Lance **WS A (action + schéma de curage)** puis **WS B (onglet « Imports à curer » + formulaire d'enrichissement)**. Réutilise au maximum l'existant (modèle `moderateVerifySpot`, chips de `ProposeSpotForm`, RLS `spots_update_moderator`). Invariant : curer = **enrichir + vérifier** un spot et le poser `source='curated'` + `verified=true` + `approved` dans le **même UPDATE** (contrainte `verified⇒curated`). Termine par **VERIF**. **Ne push pas.** Décision ouverte → `⚠️ DEMANDER À JOHN`.

---

## 🧠 Connecteurs & sous-agents

| Quand | Sous-agent → connecteur | Pourquoi |
|---|---|---|
| Action `curateSpot`, RLS, contrainte verified⇒curated | **supabase-guard** → Supabase (RO d'abord) | Vérifier que l'UPDATE passe la RLS `spots_update_moderator` et le CHECK. |
| Form d'enrichissement (chips, location picker, React 19) | **docs-researcher** → Context7 | RHF + zod v4. |
| QA file de curage (curer un import → il apparaît sur la carte) | **qa-chrome** → Claude in Chrome | Parcours bout en bout + 0 régression carte. |
| Clôture | **`/verif-sprint`** | Tests + build + lint + types. |

## Objectif en une phrase
Donner un écran où John liste les imports `pending` par façade et, pour chacun, **renseigne espèces/techniques/description/accès/dangers + vérifie la coordonnée**, ce qui le passe `curated`+`verified`+`approved` et le rend public sur la carte (scoré, coloré, filtrable).

## ⚠️ Garde-fous transverses
1. **Curer = vérifier** : la contrainte `spots_verified_only_curated` (`043:54-56`) impose de poser `source='curated'` ET `verified=true` ensemble. `curateSpot` les met dans le **même UPDATE** + `moderation_status='approved'` (modèle `moderateVerifySpot` `spots.ts:257-304`).
2. **Modérateur only** : réutiliser `viewerIsModerator` (`spots.ts:165-175`) + la garde page (`moderation/page.tsx:276-281`). La RLS `spots_update_moderator` (`043:230-233`, `using public.is_moderator()`) couvre déjà l'UPDATE d'enrichissement, **aucune migration RLS**.
3. **Pas d'invention** : le curage suppose une source vérifiable + une coordonnée contrôlée. Sans ça, le spot reste en backlog (on ne « valide » pas à l'aveugle).

## Workstreams & dépendances

| WS | Bloc | Durée | Dépend de | Parallèle J1 |
|----|------|-------|-----------|--------------|
| A | Action `curateSpot` + schéma `curate-schema` + constante `HAZARDS` | 1,5 j | — | ✅ |
| B | Onglet « Imports à curer » + `CurateSpotForm` + compteur progression | 2,5 j | A | ⚠️ après A |
| VERIF | revue + QA bout en bout | 0,5 j | tous | ❌ |

---

## WS A — Action de curage + schéma + constantes

> **Connecteurs** : supabase-guard (RLS + CHECK).

### Tâches
1. **`curateSpot`** dans `app/actions/spots.ts`, calquée sur `moderateVerifySpot` (`:257-304`) : garde auth + uuid + `viewerIsModerator` (`:203-205`), valide un payload zod d'enrichissement, UPDATE `spots` avec : les champs enrichis (`name?`, `species`, `techniques`, `structure`, `difficulty`, `description`, `access_notes`, `hazards`, `visibility?`) **+** `source:'curated'`, `verified:true`, `verified_at:now()`, `verified_by:user.id`, `moderation_status:'approved'`, **+** `geom` corrigé si lat/lng fournis (`ST_SetSRID(ST_MakePoint(lng,lat),4326)::geography`). `revalidatePath('/moderation')` + `'/carte'`. Réutiliser `loadSpotForModeration`/`ActionResult`/`ok`/`fail`. (Imports OSM ont `created_by IS NULL` → pas de notif, le `if (spot.created_by)` protège déjà.)
   - Option « enregistrer sans vérifier » (cf D1) : un second mode qui pose `source='curated'`, `moderation_status='approved'` mais `verified=false` (enrichir maintenant, vérifier plus tard). À trancher.
2. **`lib/spots/curate-schema.ts`** : étendre l'esprit de `lib/spots/propose-schema.ts:18-50` (réutiliser `spotStructureEnum` `:9-12`, `catchTechniqueEnum`), mais : **espèces sur la liste complète** (pas le `max(6)` de propose), ajouter `difficulty` (1-5), `hazards` (array), `visibility` (enum), `latitude`/`longitude` optionnels (correction de coord). Messages zod en français.
3. **Constante `HAZARDS`** (net-neuf, inexistante) : créer la liste des dangers (`ressac`, `vagues_scelerates`, `courants_forts`, `roches_glissantes`, `maree_montante_rapide`, `acces_falaise`…) + labels dans `lib/labels.ts` (à côté de `STRUCTURE_LABELS:29-37`). Le commentaire `001_init.sql:57` en suggère quelques-uns.

### Critères d'acceptation
- `curateSpot` sur un import `pending` → le spot passe `curated`+`verified`+`approved`, enrichi, et **apparaît sur la carte** (vérif : `get_spots_for_map` le renvoie, popup avec espèces/techniques, marker coloré au prochain scoring).
- Un non-modérateur est refusé (RLS + garde serveur).
- Tenter `verified=true` sans `source='curated'` est impossible (le code les pose ensemble ; le CHECK est le filet).

### Garde-fous
- UPDATE atomique : source/verified/moderation_status/champs enrichis dans le même appel.
- Espèces/techniques validées contre les enums (pas de valeur libre arbitraire).

---

## WS B — Onglet « Imports à curer » + formulaire d'enrichissement

> **Connecteurs** : docs-researcher (form) ; qa-chrome (parcours + carte).

### Tâches
1. **3ᵉ onglet** dans `app/(app)/moderation/page.tsx` : aujourd'hui 2 onglets `reports`/`spots` via `searchParams.tab` (`:268-273`, liens `:375-388`). Ajouter `?tab=imports` + sa branche de chargement : `source='imported'` + `moderation_status='pending'`, **groupé/filtrable par département** (façades sous-couvertes en premier), avec pagination (il y en a ~900). Compteur dédié sur l'onglet.
2. **`components/spots/CurateSpotForm.tsx`** (nouveau) : réutiliser les **chips `<Controller>`** de `ProposeSpotForm.tsx` (structure `:184-201`, espèces `:249-271`, techniques `:279-301`, styles `:29-32`) + `SpotLocationPicker` (`:17-22`,`:220-224`) pour vérifier/corriger la coordonnée. Différences : **liste complète des 26 espèces** (`ALL_SPECIES_DB_KEYS` + `SPECIES_LABELS` de `lib/seo/programmatic.ts:111` / `lib/labels.ts:18`), champs `difficulty` (1-5) et `hazards` (chips), **pré-rempli** avec les données OSM existantes du spot (nom, structure, geom). Submit → `curateSpot`.
3. **Compteur de progression** « X / 942 curés » (net-neuf) : `get_department_stats` (`070`) ne compte que l'approuvé, donc inutilisable ici. Faire une requête serveur `count` des imports `pending` par département (`.from('spots').select('department',{count:'exact'}).eq('source','imported').eq('moderation_status','pending')`) + total curés depuis le départ. Afficher la progression en tête de l'onglet.
4. **Ergonomie curage** : bouton « Rejeter » (import non pêchable / doublon → `moderation_status='rejected'`, réutiliser `moderateRejectSpot`), et navigation « suivant » pour enchaîner les imports d'un département.

### Critères d'acceptation
- L'onglet liste les imports `pending` par façade, avec le compteur de progression.
- Curer un import (renseigner espèces/techniques + vérifier la coord + valider) le fait **disparaître du backlog** et **apparaître sur la carte** enrichi.
- Rejeter un import le sort du backlog (`rejected`).
- 0 régression carte / gating / floutage.

### Garde-fous
- Réutiliser les composants existants (ne pas réécrire un form from scratch).
- Pré-remplir, ne pas écraser, les données OSM utiles (nom, structure, coord).

---

## Workstream VERIF (obligatoire, agent indépendant)
1. `/verif-sprint` : tests + build + typecheck + lint + revue croisée.
2. **QA bout en bout (qa-chrome)** : curer 2-3 imports → ils apparaissent sur la carte (popup espèces/techniques, marker coloré après scoring), le compteur décrémente le backlog ; rejeter un import → il disparaît ; un non-modérateur n'accède pas à l'onglet.
3. **Passe sécurité** : `curateSpot` modérateur-only (RLS + garde) ; UPDATE pose source+verified ensemble (CHECK respecté) ; floutage GPS et gating carte intacts après publication.
4. **Passe copy** : tutoiement, libellés espèces/techniques/structures/hazards en français, pas de tiret cadratin.
5. Livrer `docs/sprint-43/RECAP.md` : fait / comment curer / statut D1-D3 + nombre d'imports curés en test.

---

## Décisions pour John
- **D1 (curer = vérifier ?)** — Reco : oui, curer pose `verified=true` (le geste de curage EST la vérification, méthode « sourcé puis vérifié un par un »). Option secondaire « enregistrer sans vérifier » (enrichir maintenant, badge ✓ plus tard) si tu veux séparer les deux. À trancher.
- **D2 (priorité)** — par quelles façades commencer le curage ? Reco : les départements maigres en curés d'abord, puis le gros des imports (29=222, 56=123, 13=104).
- **D3 (re-scoring immédiat)** — au curage, attendre le prochain run du cron (≤ 26 h) pour scorer, ou déclencher un score immédiat ? Reco : laisser le cron (simple) ; « score now » optionnel plus tard.

## Reste manuel John (ops continu)
- C'est le **travail de curage** lui-même : pour chaque import, sourcer (vérifier la position/info) puis renseigner espèces/techniques/description/accès/dangers et valider. Étalé dans le temps, façade par façade. L'outil est là ; la qualité vient de ta vérification un par un.
- Merger `sprint-43` → `main`, déployer.

---

> **Invariants (rappel)** : pas de push sans validation · RLS jamais désactivé (la modération est déjà couverte) · **curer = enrichir + vérifier dans le même UPDATE** (`source='curated'`+`verified=true`+`approved`) · pas d'invention (source + coord vérifiées) · réutiliser l'existant (action `moderateVerifySpot`, chips `ProposeSpotForm`, RLS `spots_update_moderator`) · copy sans tiret cadratin.
