# Sprint 69 — Brief d'exécution
## « Intégrité des classements » : économie XP infalsifiable + classements lisibles

> Rédigé le 2026-07-02. Durée cible : 1-2 sessions Fable.
> Contexte : `docs/audits/AUDIT-2026-07-02.md` §2.1 + §4.1/4.2 · `docs/roadmaps/ROADMAP-POST-AUDIT-2026-07-02.md` Phase A · RECAP précédent : `docs/sprint-68/RECAP.md` (codes fondateurs, migrations 104/104b, déployé).
> **Pourquoi maintenant** : les codes fondateurs sont en prod. Dès que de vrais pêcheurs arrivent, l'économie XP alimente des classements publics — or elle est falsifiable (vérifié dans le code, cf Bloc 0). On ferme AVANT de distribuer les codes en masse.
>
> **Décisions verrouillées pour ce sprint (roadmap 02/07)** :
> - **Stratégie anti-farm = « ledger fait foi » (option A)** : les compteurs anti-farm se calculent sur `xp_events` (append-only), PAS sur `catches` (vivantes). On CONSERVE la décision 098 « pas de révocation au DELETE » : supprimer une prise reste XP-neutre (pas de level-down punitif), mais ne remet plus aucun compteur à zéro. L'alternative B (révoquer au DELETE) est rejetée : level-down UX punitif + incitation à garder des prises poubelles.
> - **Rate-limit prises** : 20 création(s)/24 h + burst 5/h sur `createCatch` ; 100/24 h sur `bulkCreateCatches` (import). Constantes nommées, ajustables.
> - **Anti-datage** : tout ce qui crédite XP/badge/série/défi exige `caught_at` dans `[created_at − 48 h, created_at + 15 min]`. Les prises hors fenêtre restent ENTIÈREMENT dans le carnet, les stats perso et le scoring (le moat) — elles ne créditent juste pas la compétition. Copy douce si ça arrive.
> - **Photo obligatoire pour « vérifiée »** : `photo_verified_at` ne se pose plus jamais sans `photo_path` non nul.

**Préalable avant de démarrer (manuel John)** :
- ⚠️ **DEMANDER À JOHN — données existantes** : en prod, des prises ont `photo_verified_at` sans photo (design S39 : auto-déclaration + objet de référence). Reco : les repasser à `photo_verified_at = null` (honnête ; l'XP déjà crédité reste au ledger, décision A). Impact : badges « prise mesurée »/records affichés peuvent régresser pour les ~7 comptes actifs. **Le Bloc E écrit et teste le SQL mais ne l'exécute en prod qu'après GO explicite de John.**
- Ne PAS distribuer de codes fondateurs à des inconnus avant la fin de ce sprint (cercle proche OK).

---

## 🚀 Ligne de lancement (à copier-coller par John)

> ultracode — effort xhigh. Exécute `docs/sprint-69/BRIEF.md`. Lance les workstreams A/C en parallèle dès maintenant, puis B → D/E selon le tableau de dépendances, et termine par le workstream VERIF avant de me rendre la main. Le Bloc E n'applique RIEN en prod sans mon GO. Ne push pas.

---

## 🧠 Connecteurs & sous-agents (cf `CLAUDE.md` §20)

| Quand | Sous-agent → connecteur | Pourquoi |
|---|---|---|
| Bloc 0 et avant toute écriture SQL | **supabase-guard** → Supabase | `pg_get_functiondef` des fonctions live AVANT de les remplacer (leçon S68 : la 021 reprise verbatim) ; `get_advisors` baseline. |
| Avant tout code Next/React touché | **docs-researcher** → Context7 | Server Actions Next 15.5 / React 19 (pas de code de mémoire). |
| QA écrans classements + formulaire prise | **qa-chrome** | Captures, console, anti-régression. |
| Après déploiement | **deploy-watch** → Vercel + Sentry | Zéro régression runtime. |
| Clôture | **`/verif-sprint`** | Tests + build + lint + types + revue croisée + anti-régression. |

## Objectif du sprint en une phrase

Prouver par SQL en prod (begin…rollback) qu'aucune boucle create/delete, antidatage, déclaration sans photo ou spam de prises ne peut plus gonfler XP, badges, séries, défis ni classements — et que l'unique joueur opté-in voit enfin son rang et le seuil manquant.

## Workstreams & dépendances

| WS | Bloc(s) | Durée | Dépend de | Parallélisable jour 1 |
|----|---------|-------|-----------|----------------------|
| A | Bloc 0 — Ancrage lecture | 0,25 j | — | ✅ |
| B | Bloc 1 — Migration 105 (SQL intégrité) | 1 j | A | ❌ (mais A est court) |
| C | Bloc 2 — Server Actions (photo + rate-limit) | 0,5 j | — | ✅ |
| D | Bloc 3 — UX classements | 0,5 j | B (RPC étendue) | ❌ |
| E | Bloc 4 — Données existantes | 0,25 j | B + ⚠️ GO John | ❌ |
| VERIF | revue finale | 0,5 j | tous | ❌ (toujours en dernier) |

---

## Bloc 0 — Ancrage (lecture seule, livrable `docs/sprint-69/research/anchor.md`)

Le brief s'appuie sur l'audit du 02/07 ; un agent VÉRIFIE chaque fait contre le live avant d'écrire du SQL. Le brief est un guide, pas une vérité : si un fait ne colle pas, s'arrêter et le signaler.

> **Connecteurs** : supabase-guard (RO) — `pg_get_functiondef` + schéma live.

### Tâches
1. Dumper les définitions LIVE : `award_catch_xp`, `award_xp` (098), fonctions séries (099, calcul sur `caught_at` vers :79-84), fonctions défis (100, :126-151), `get_leaderboard` + `get_season_results` (103), triggers sur `catches` (INSERT/DELETE existants ?).
2. Confirmer le schéma `xp_events` : colonnes `(id, user_id, kind, points, ref_type, ref_id, created_at)` + `unique(user_id, kind, ref_type, ref_id)` — **PAS de colonne espèce/longueur** (d'où le §meta du Bloc 1). Confirmer `on conflict do nothing` dans `award_xp`.
3. Confirmer les 3 trous au live : (a) compteurs `v_same_day`/`v_prior_species`/`v_prior_best` calculés sur `public.catches` vivantes (098:126-179) ; (b) `photo_verified_at` posé par `lib/catches/actions.ts:144-163` sans exiger `photo_path` (idem chemin update, à localiser) ; (c) aucun rate-limit dans `lib/catches/actions.ts` (`createCatch` ~:103, `bulkCreateCatches` ~:547) — identifier le helper de rate-limit réellement utilisé par `app/actions/feed.ts` pour le réutiliser tel quel.
4. Recenser TOUS les chemins d'écriture de `photo_verified_at` (create, update, import bulk, éventuel backfill 066/098) — le Bloc 2 doit tous les couvrir.
5. Baseline advisors (`get_advisors` security + performance) pour mesurer le delta en VERIF.

### Critères d'acceptation
- `anchor.md` existe avec les définitions live collées + verdict ✅/❌ par fait du brief.

---

## Bloc 1 — Migration **105** : le ledger fait foi (+ RPC classements étendue)

Cœur du sprint. Un seul fichier `supabase/migrations/105_xp_integrity.sql` (réserver `105b_*.sql` aux fixes de revue, pattern S68). Ne pas éditer 098/099/100/102/103 : tout en `create or replace` depuis 105, avec commentaires expliquant CE QUI CHANGE et POURQUOI (style maison).

> **Connecteurs** : supabase-guard AVANT (définitions live, cf Bloc 0) ; migration appliquée via connecteur APRÈS validation locale ; regen `lib/types.ts` ; `get_advisors` après.

### Tâches
1. **`xp_events.meta jsonb`** (nullable) : `award_xp` accepte un param `p_meta jsonb default null` et l'écrit. `award_catch_xp` y met `{species, measured_length_cm, caught_at}` pour les kinds catch/new_species/personal_best/measured/released. Backfill du meta des 58 événements existants par JOIN `catches` sur `ref_id` quand la prise existe encore (sinon meta reste null, assumé).
2. **Compteurs sur le ledger** dans `award_catch_xp` :
   - `v_same_day` = count des événements `kind='catch'` du user, `meta->>'species'` identique, même jour (`created_at`) — les événements de prises SUPPRIMÉES comptent toujours → le plafond 3/espèce/jour devient insensible au delete.
   - `v_prior_species` = exists d'un événement `kind='new_species'` du user avec ce species → **+50 une seule fois PAR ESPÈCE À VIE**, même après delete.
   - `v_prior_best` = max de `(meta->>'measured_length_cm')::numeric` sur les événements `kind='measured'` du user pour ce species → la barre du record ne redescend jamais via delete.
   - ⚠️ Rejouabilité : les compteurs se lisent AVANT l'insert des événements de la prise courante (l'ordre actuel du trigger le garantit — vérifier) ; `on conflict do nothing` continue de protéger les replays/backfills.
3. **Plafonds journaliers** : `measured` (+15) max 3/jour, `released` (+4) max 5/jour (count ledger même jour). Constantes commentées en tête de fonction.
4. **Fenêtre anti-datage partagée** : fonction SQL `is_competitive_catch(caught_at, created_at)` = `caught_at between created_at - interval '48 hours' and created_at + interval '15 minutes'`. Appliquée : (a) dans `award_catch_xp` (aucun XP hors fenêtre) ; (b) dans les fonctions séries 099 et défis 100 (remplacées par `create or replace`, ne comptent que les prises compétitives). Le carnet, les stats perso, le scoring, les tendances : **INTACTS** (aucun filtre là-dessus).
5. **RPC classements étendue** (même migration) : `get_leaderboard` renvoie en plus `own_rank int`, `own_value`, `eligible_count int` — calculés pour l'appelant opté-in MÊME quand `eligible_count < K` (le tableau des identités reste vide sous le seuil ; un agrégat de comptage n'est pas une identité, k-anon respecté). Grants inchangés (authenticated only).
6. Regénérer `lib/types.ts` (additif attendu).

### Critères d'acceptation (chacun prouvé par requête SQL en transaction rollback, à coller dans le RECAP)
- create → delete → re-create ×5 (même espèce, même jour) ⇒ `total_xp` strictement égal au scénario 1 seul create (+10, +50 si 1re espèce, pas plus).
- `new_species` : 2e octroi impossible pour la même espèce à vie, même après delete de toutes les prises de l'espèce.
- record : log vérifié 50 cm → delete → log vérifié 45 cm ⇒ **0** événement `personal_best`.
- 4e prise même espèce même jour ⇒ pas d'événement `catch` ; 4e `measured` du jour ⇒ 0 ; 6e `released` ⇒ 0.
- prise antidatée (`caught_at = now() - 52 weeks`) ⇒ 0 XP, série inchangée, défis inchangés ; la prise EST dans le carnet et les stats.
- `get_leaderboard` en solo opté-in ⇒ `own_rank=1`, `eligible_count=1`, tableau identités vide ; aucune colonne coordonnée/spot dans le résultat (inchangé).
- Advisors : aucun nouvel ERROR ; delta WARN documenté.

### Garde-fous
- Ne pas toucher : politiques RLS existantes de `xp_events`/`user_progress` (select-own, zéro écriture client), grants `award_*` (non exécutables par anon/authenticated), notifs de rang (`lib/notifications/rank.ts`), k-anon K=3, archivage saisons 103.
- `search_path = public` + REVOKE/GRANT explicites sur toute fonction créée/remplacée (standard projet).

---

## Bloc 2 — Server Actions : photo obligatoire + rate-limit prises

Indépendant du Bloc 1 (fichiers TS). Défense en profondeur : la contrainte finale vit AUSSI en DB (tâche 4).

> **Connecteurs** : docs-researcher si doute API Next/zod ; le helper de rate-limit est celui identifié au Bloc 0 (réutiliser, pas réinventer).

### Tâches
1. `lib/catches/schema.ts` (~:96-115) + `lib/catches/actions.ts` (~:144-163) : `photo_verified_at` posé UNIQUEMENT si `is_measured` + `measured_length_cm` + `reference_object` + **`photo_path` non nul**. Couvrir TOUS les chemins recensés au Bloc 0 (create, update, bulk).
2. Copy formulaire (`CatchForm`) : la case devient « Mesurée avec photo (longueur + objet de référence visibles) » ; si cochée sans photo jointe → message zod FR doux : « Ajoute la photo pour valider la mesure (c'est elle qui rend le record vérifiable). » Sans photo, la prise se logue normalement (non « vérifiée »).
3. Rate-limit via le helper existant : `createCatch` 20/24 h + burst 5/h ; `bulkCreateCatches` 100/24 h. Erreur FR douce : « Doucement moussaillon : limite de prises atteintes pour aujourd'hui, réessaie dans X h. » (à ajuster au ton maison, sans tiret cadratin).
4. **Contrainte DB miroir** (dans la migration 105, coordonné avec Bloc 1) : `check (photo_verified_at is null or photo_path is not null)` — `NOT VALID` puis `VALIDATE` seulement après le Bloc 4 (sinon les lignes legacy la cassent).
5. Tests Vitest : mesure sans photo → pas de `photo_verified_at` + message ; avec photo → posé ; 21e création/24 h refusée ; burst 6e/h refusé ; bulk 101e refusé ; update ne peut pas poser `photo_verified_at` sans photo.

### Critères d'acceptation
- Impossible de produire `photo_verified_at` sans `photo_path` par AUCUNE action (tests) NI par SQL direct une fois la contrainte validée.
- Le rate-limit ne bloque jamais un usage honnête d'une sortie chargée (5 prises dans l'heure passent ; la 6e attend).
- Régression interdite : le flux de log normal (sans mesure) est inchangé, célébrations S61 incluses.

---

## Bloc 3 — UX classements : lisibles à 1 joueur comme à 1 000

La page vitrine du pivot paraît cassée à son seul joueur opté-in (audit §4.1). Fichiers : `app/(app)/classements/page.tsx`, `app/actions/leaderboard.ts`, composants associés.

> **Connecteurs** : qa-chrome pour la passe visuelle finale (desktop + mobile).

### Tâches
1. Consommer `own_rank`/`own_value`/`eligible_count` (Bloc 1) : carte « Ton rang » toujours affichée pour l'utilisateur opté-in, même sous le seuil.
2. Sous le seuil : remplacer l'état vide muet par « Classement publié à partir de K pêcheurs visibles. Il en manque **X**. » + CTA de partage existant (mécanique cartes S45) — pas de nouvelle mécanique d'invitation dans ce sprint.
3. Masquer du sélecteur les saisons pré-lancement sans aucune donnée (Automne 2025, Hiver 2026…) : filtre sur contenu réel, pas de liste en dur.
4. Copy opt-in : ajouter la mention (audit 🟡) que le classement départemental révèle ton département de rattachement (déjà public par ailleurs, mais on le DIT).
5. Tests : rendu sous seuil (own_rank visible, message X correct), au seuil (bascule tableau complet), non-opté-in (invite à activer, pas de rang).

### Critères d'acceptation
- QA live : compte opté-in seul ⇒ voit son rang + « il en manque 2 » (K=3) ; aucune identité tierce visible sous le seuil ; sélecteur sans saisons vides.
- Aucune coordonnée/spot nulle part (re-vérifié).

---

## Bloc 4 — Données existantes (⚠️ GO John obligatoire avant exécution prod)

> **Connecteurs** : supabase-guard ; exécution finale via connecteur en transaction, APRÈS le GO.

### Tâches
1. Écrire + tester (rollback) le SQL de nettoyage : `update catches set photo_verified_at = null where photo_verified_at is not null and photo_path is null;` — précédé d'un SELECT d'inventaire (combien de lignes, quels comptes) à montrer à John.
2. L'XP déjà crédité RESTE (décision A, ledger append-only). Les badges/records recalculés à la volée peuvent régresser : vérifier ce que ça change concrètement pour les comptes touchés et le dire à John AVANT.
3. Après exécution : `VALIDATE CONSTRAINT` de la contrainte miroir (Bloc 2 tâche 4).

### Critères d'acceptation
- Inventaire présenté, GO reçu, 0 ligne `photo_verified_at NOT NULL AND photo_path IS NULL` en prod, contrainte validée.

---

## Workstream VERIF (obligatoire, agent indépendant)

1. `/verif-sprint` (tests ≥ 695 verts + nouveaux, build, typecheck, lint, lint copy-dashes). Puis **deploy-watch** après déploiement.
2. Relire chaque critère d'acceptation du brief, ✅/❌ avec preuve (requêtes SQL rollback collées, sorties de tests).
3. **Passe adversariale « comment je tricherais encore ? »** par un agent qui n'a pas écrit le code : delete/recreate, antidatage, bulk, update de prises, multi-comptes, replays du trigger, saisons/archives 103, notifs de rang. Tout vecteur restant = finding documenté (fix dans le sprint ou résiduel assumé listé).
4. Passe anti-régression standard : floutage GPS, RLS, gating tier carte, k-anon, RGPD suppression de compte (le meta jsonb suit le cascade `xp_events` → vérifier), copy FR tutoiement sans tiret cadratin.
5. Livrer `docs/sprint-69/RECAP.md` : fait / comment tester / reste manuel John.

## Reste manuel John (post-sprint)

- GO Bloc 4 (nettoyage données) après lecture de l'inventaire.
- Merge → main, déploiement, QA visuelle live (classements + formulaire prise).
- Puis lane amorçage (roadmap §3) : mint des codes, vague fondateurs élargie.
