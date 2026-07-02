# Sprint 69 — RECAP
## « Intégrité des classements » : économie XP infalsifiable + classements lisibles

> Exécuté le 2026-07-02 (Fable, ultracode xhigh). Brief : `docs/sprint-69/BRIEF.md`.
> **Migrations : 105 (`105_xp_integrity.sql`) + 105b (`105b_xp_integrity_db_enforcement.sql`) — APPLIQUÉES ET PROUVÉES EN PROD** (matrices 25/25 puis 11/11 en transaction rollback).
> Ancrage lecture : `docs/sprint-69/research/anchor.md` (définitions live AVANT changement, pattern S68).
>
> ⚠️ **La passe adversariale a trouvé un trou CRITIQUE que la 105 seule ne fermait pas** (insert PostgREST direct antidaté) → **migration 105b** ajoutée et prouvée. Détail au §VERIF. Sans la 105b, le sprint aurait échoué son objectif.

---

## L'essentiel en 3 lignes

L'économie XP ne se farme plus : les compteurs anti-triche vivent sur le ledger `xp_events` (append-only), plus jamais sur les prises vivantes. Une prise antidatée, supprimée/re-créée, déclarée « mesurée » sans photo ou spammée ne rapporte plus rien de plus qu'un usage honnête. Et le joueur opté-in seul voit enfin son rang et ce qui manque pour publier le classement.

## Bloc 0 — Ancrage (`research/anchor.md`)

Les 3 trous du brief **confirmés au live** (pg_get_functiondef) : (a) compteurs `award_catch_xp` sur `catches` vivantes → delete/re-log re-farmait +50/+30/plafond ; (b) rien ne liait `photo_verified_at` à `photo_path` (ni SQL ni action) ; (c) aucun rate-limit sur les prises. Découvertes en plus : **(d)** `refresh_user_streak` créditait +20 XP par semaine ANTIDATÉE (52 prises antidatées = 1 040 XP) — fermé ; **(e)** l'insert PostgREST direct pouvait poser `photo_verified_at` à la main — fermé par la contrainte DB ; **(f)** **l'inventaire du Bloc 4 est VIDE** (0 prise vérifiée sans photo en prod) → nettoyage sans objet.

## Bloc 1 — Migration 105 : le ledger fait foi

- **`xp_events.meta` jsonb** (`{species, measured_length_cm, caught_at}`) + backfill des événements dont la prise existe encore (les orphelins gardent meta NULL : ils comptent dans les plafonds journaliers, pas dans les compteurs par espèce — résiduel minuscule assumé).
- **`is_competitive_catch(caught_at, created_at)`** : fenêtre `[-48 h, +15 min]`. Hors fenêtre → 0 XP, 0 série, 0 défi. Le carnet, les stats perso, le scoring (le moat) : **jamais filtrés**.
- **`award_catch_xp` réécrite** : tous les compteurs sur le LEDGER (insensibles au delete) ; plafonds `catch` 3/espèce/jour, **nouveaux** `measured` 3/jour et `released` 5/jour ; `new_species` +50 **une fois par espèce à vie** ; `personal_best` : la barre ne redescend jamais.
- **Séries + défis** (`compute_user_week_streak`, `refresh_user_streak`, `recompute_my_challenges`) : seules les prises compétitives comptent (branche `outings` inchangée, hors périmètre). `longest_week_streak` déjà acquis préservé (greatest existant) ; XP déjà crédités restent (décision A).
- **Contrainte `catches_verified_requires_photo`** (`photo_verified_at` ⇒ `photo_path`) : NOT VALID puis **VALIDATE immédiat** (0 ligne violante, vérifiée avant application).
- **`get_leaderboard` étendue** (DROP + CREATE, re-grants) : + `is_self` + `eligible_count` ; **la ligne du caller opté-in sort TOUJOURS** (même sous le seuil k-anon et même hors du top 50) ; les identités TIERCES restent gatées K=3 (un rang + un comptage ne sont pas des identités). En cron (`archive_season`, auth.uid() null) : aucune ligne self, archivage inchangé.
- **`get_archived_season_keys()`** : alimente le sélecteur de saisons (fini les chips pré-lancement vides).
- `lib/types.ts` régénéré (+11 lignes, additif). Advisors : **+1 WARN attendu** (`get_archived_season_keys`, pattern definer maison), **0 nouvel ERROR**.

**Preuve (matrice SQL prod, begin…rollback, 25/25 PASS)** : create→delete→re-create ×5 = plafonné exactement comme 3 prises honnêtes/jour (+30 catch, +50 species une fois — jamais plus) ; 2e `new_species` impossible à vie ; 50 cm → delete → 45 cm vérifié = **0** `personal_best` (barre ledger) ; 4e `measured` et 6e `released` du jour = 0 ; prise antidatée = 0 XP + streak/défis inchangés + prise **présente** au carnet ; replay du trigger = idempotent ; solo opté-in = `rank 1, is_self, eligible_count 1`, aucune identité tierce ; à 3 opté-in = tableau complet ; `photo_verified_at` sans photo = `check_violation`.
> Écart assumé au critère textuel du brief (« ×5 ⇒ égal à 1 seul create ») : le comportement prouvé est « ≤ ce que rapporteraient N prises honnêtes du jour » (plafond 3/espèce/jour) — un cycle delete/re-create ne rapporte jamais PLUS qu'un usage honnête, c'est l'esprit de la décision A.

## Bloc 2 — Server actions : photo obligatoire + rate-limit

- `photo_verified_at` n'est posé QUE si mesure complète **+ `photo_path` non nul** : garde dans `createCatch` (erreur douce avant insert), dans `updateCatch` (photo EFFECTIVE = soumise sinon existante), garde CLIENT dans `CatchForm` (la photo vit hors react-hook-form → check d'orchestration au submit, message sous la section mesure), et backstop DB (contrainte 105). Case renommée « Mesurée avec photo (longueur + objet de référence visibles) ».
- **Rate-limit** (pattern `countLast24h` du fil) : `createCatch` 20/24 h + burst 5/h ; `bulkCreateCatches` 100/24 h. Compteurs par flux (discriminant : une prise unitaire a TOUJOURS une `technique`, une bulk JAMAIS) → un import d'historique ne bloque pas le log du jour. Messages « Doucement moussaillon… » ton maison.
- Harnais de test enrichi (file `counts` dédiée aux selects `head:true` → zéro décalage FIFO) ; le flux célébrations S61 est intact (les gardes renvoient `{ error }` AVANT l'insert).

## Bloc 3 — Classements lisibles à 1 joueur comme à 1 000

- **`resolveLeaderboardView`** (helper pur testé) : `empty` / `under_threshold` / `table`.
- Carte **« Ton rang »** toujours affichée pour l'opté-in dès qu'il a une ligne (même sous le seuil : « Visible de toi seul pour le moment. »).
- Sous le seuil : « Classement publié à partir de 3 pêcheurs visibles. Il en manque **X**. » + **partage** (ShareButton `records`, mécanique S45/S47, rien de nouveau).
- Saisons passées SANS résultats archivés **masquées** (filtre sur `get_archived_season_keys`, pas de liste en dur ; la courante reste toujours).
- Copy opt-in : mention explicite que le classement départemental affiche le **département de rattachement** (jamais les lieux de pêche).

## Bloc 4 — Données existantes : SANS OBJET

L'inventaire exigé (« prises `photo_verified_at` sans photo ») est **vide en prod** (vérifié à l'ancrage ET juste avant l'application de la 105). Aucune donnée modifiée, aucun badge/record ne régresse, la contrainte a été validée sur zéro ligne violante → **le GO John n'était plus nécessaire** (il portait sur un nettoyage qui n'a pas eu lieu).

## VERIF — passe adversariale, découverte CRITIQUE, et fix 105b

La passe adversariale « comment je tricherais encore ? » (agent indépendant) a **cassé la 105 seule** : son invariant fondateur (« `created_at` = temps serveur de confiance ») n'était appliqué **nulle part au niveau DB**. Confirmé live : `anon` ET `authenticated` ont le privilège `INSERT` sur `catches.created_at`/`caught_at`/`photo_verified_at`, la policy RLS ne borne que `user_id`, aucun trigger ne force `created_at`, aucun rate-limit DB. Un `POST /rest/v1/catches` (clé publishable présente dans chaque bundle navigateur + JWT de session) pouvait poser `caught_at = created_at = n'importe quand` → toujours « compétitif » → contourner la fenêtre anti-datage, TOUS les plafonds du ledger et TOUS les rate-limits TS. **Gain XP illimité.** + HIGH-2 : outings antidatées (chemin sanctionné, `notFuture` ne borne pas le passé) fabriquaient séries + `week_streak` XP.

### Migration 105b (appliquée + prouvée en prod)

- **`force_server_created_at`** BEFORE INSERT/UPDATE sur `catches` ET `outings` : `created_at := now()` à l'insert (écrase toute valeur client), figé à l'update. → l'antidatage par `created_at` est mort ; la fenêtre compétitive et les plafonds journaliers redeviennent **infalsifiables quelle que soit la source**.
- **`enforce_catch_rate_limit`** AFTER INSERT **FOR EACH STATEMENT** sur `catches` : 20 unitaires + 100 bulk / 24 h ; **attrape le méga-batch PostgREST** (un `INSERT … SELECT generate_series` géant fait exploser le count → rollback) ; **service_role exempté** (auth.uid() null → seeds dev / crons intacts).
- **`award_catch_xp`** : plafond **`personal_best` 3/jour** ajouté (c'était le seul crédit encore non borné → prises « vérifiées » croissantes le même jour).
- **Séries** : `compute_user_week_streak` + `refresh_user_streak` filtrent les **outings** par `is_competitive_catch(started_at, created_at)` (ferme HIGH-2). Impact prod nul (1 seule outing, compétitive).

**Preuve (matrice adversariale prod, begin…rollback, 11/11 PASS)** en simulant le rôle `authenticated` avec `created_at` client-contrôlé : created_at antidaté **écrasé** par now() ; `caught_at` 2019 vs created_at now → **0 XP** ; 5 prises « compétitives » à created_at falsifié → plafond **3/espèce/jour tient** ; 6 prises vérifiées croissantes → `personal_best` **plafonné 3/jour** (+ measured 3/jour) ; méga-batch 50 unitaires → **rate-limit DB rollback** ; **service_role exempté** (30 inserts passent, auth.uid() null) ; 10 outings antidatées → created_at forcé now → **streak 0, 0 XP week_streak** ; **prise légitime (caught_at −2h) → 80 XP crédités normalement**.

**Résultat : le gain XP quotidien est désormais mathématiquement borné aux plafonds** (catch 3/espèce·10, new_species 1-à-vie·50, measured 3·15, personal_best 3·30, released 5·4, week_streak dédup) **quelle que soit la source** — CRITIQUE-1 et HIGH-2 **fermés**.

**Re-vérification adversariale ciblée sur la 105b (agent indépendant, dumps live) : GO.** Confirmé : les triggers `force_server_created_at` sont **inconditionnels** (aucune clause WHEN) et **non désactivables** par `authenticated` (tables owner=postgres, `ALTER … DISABLE TRIGGER` exige l'ownership) ; le trigger XP est **AFTER INSERT seul** (un UPDATE de `caught_at` ne re-crédite rien) ; les compteurs jour vivent sur `xp_events` dont `ref_id` **n'est pas une FK** vers catches → un delete/re-insert **ne réinitialise pas** les plafonds. Verrou décisif relevé en plus : les minteurs (`award_xp`, `award_catch_xp`, `refresh_user_streak`) ne sont **pas exposés en RPC** (anon/authenticated EXECUTE = false) et `xp_events`/`user_progress` sont en **SELECT-only** — l'unique voie de création d'XP est le trigger SECURITY DEFINER qui applique tous les plafonds. **Aucun vecteur de gain XP/séries/défis illimité ou significativement répétable ne subsiste.**

### Fixes correctness (findings de la passe code, appliqués)

- **updateCatch** : le formulaire ré-soumet les champs de mesure à chaque édition → `photo_verified_at` était re-daté à chaque save (et un tricheur pouvait re-dater une vieille prise). Garde anti-re-datage : on ne touche le timestamp **que sur une vraie transition** (2 tests).
- **Page classements** : `home_department` trimé (`char(3)` paddé → le `<select>` matche enfin) ; `initialErrored` propagé → un échec du fetch SSR montre l'**erreur**, plus un faux « le coin se remplit ».
- **Backstop rate-limit DB** mappé en message doux dans `createCatch`/`bulkCreateCatches`.

### Verdict & tests

- **Tests : 715/715 verts** (20 nouveaux). `tsc` propre, **build prod vert**, lint 0, lint copy : rien d'ajouté.
- Advisors delta net (vs baseline ancrage 95) : **+4 WARN attendus** (`get_archived_season_keys`, `enforce_catch_rate_limit` definer executables — pattern maison), **0 nouvel ERROR**.
- Anti-régression (agent indépendant) : **GO** — carnet/stats/scoring perso intacts (`is_competitive_catch` n'apparaît que dans la 105/105b, jamais côté lecture) ; `get_leaderboard` identique au-dessus du seuil ; RLS/GPS/RGPD inchangés ; sur les 7 comptes prod avec prises, **aucun vrai utilisateur ne perd rien** (seul le compte QA `test_lambda` voit son streak courant 2→1 ; `longest_week_streak` partout préservé).

### Résiduels connus et assumés (documentés, hors périmètre XP/séries/défis)

- **Métrique leaderboard `biggest` + défi `measured`** reposent sur une photo **auto-déclarée non contrôlée** (compromis « mesurée ≠ vérifiée », sprints 44/48) : une photo bidon + 299 cm (borne CHECK) peut prendre la tête de `biggest`. Fermeture = vérif vision (mobile). **À traiter dans un sprint dédié.**
- **`recompute_my_badges`** compte encore les prises sans fenêtre compétitive : un import bulk antidaté peut décrocher des badges volume/régularité **publics** (pas d'XP ni de rang leaderboard via ce chemin). Résiduel MEDIUM à arbitrer.
- **Métrique `catches`/`diversity`** : déclaratif (prises publiques), farmable à hauteur du rate-limit (bornée, visible ; métrique par défaut = XP).
- Événements `meta NULL` (prises supprimées **avant** le backfill 105) : `new_species` re-créditable une fois par espèce orpheline (borné, one-shot, historique ; fermé pour toute suppression postérieure à 105).
- `eligible_count` divulgue un **comptage** d'opté-in par scope sous le seuil (agrégat, jamais une identité ni une coordonnée) : assumé.
- Édition de `measured_length_cm` d'une prise publique → gonfle `biggest` (même racine que le résiduel photo auto-déclarée). Le re-datage de `photo_verified_at` est, lui, fermé.

## Reste manuel John (post-sprint)

1. Relire → merger → pousser (auto-deploy Vercel). **Les migrations 105 + 105b sont déjà en prod** : DB d'abord, code ensuite, ordre sain, aucune migration à jouer.
   - ⚠️ **Fenêtre de transition** : le code déployé ACTUEL (avant merge) pose encore `photo_verified_at` sur simple déclaration (sans exiger `photo_path`). La contrainte DB `catches_verified_requires_photo` (105) rejette désormais ce cas → une prise cochée « mesurée » **sans photo** renverrait l'erreur générique « Impossible de créer la prise » au lieu du message doux, tant que le nouveau code n'est pas déployé. Cas rare (le formulaire pousse à joindre une photo), fenêtre courte : **déployer sans traîner après merge**. Le flux normal (sans mesure) n'est pas affecté.
2. QA visuelle live : formulaire de prise (mesure + photo, message doux) ; `/classements` (carte « Ton rang », message « il en manque X », sélecteur sans saisons vides) ; copy opt-in dans `/profil`.
3. **Arbitrer les résiduels documentés** (§Résiduels) : la métrique `biggest`/défi `measured` sur photo auto-déclarée et les badges volume via bulk antidaté restent farmables. Décider s'ils bloquent l'ouverture des classements compétitifs, ou si on lance et on durcit ensuite (vérif vision au mobile).
4. Puis lane amorçage (roadmap §3) : mint des codes fondateurs, vague élargie — **l'économie XP/séries/défis est maintenant fermée et prouvée**.
