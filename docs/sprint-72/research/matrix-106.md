# Matrice de preuve — Migration 106 (sprint 72, WS B)

> Exécutée LIVE en prod le 2026-07-02 via `execute_sql`, transaction `begin; … rollback;`
> (leçon S66-69 : smoker le SQL réel, simuler le rôle `authenticated` avec
> `set local role authenticated` + `set_config('request.jwt.claims', …)`).
> Users et spot de test ÉPHÉMÈRES (créés puis rollback) ; vérifié après coup :
> 0 résidu (`matrix106%@test.invalid` = 0, `spot-prive-matrice-106` = 0,
> `favorite_spots`/`alert_settings`/`alerts_sent` = 0 lignes en prod).

## Résultats (16 tests passe 1 + 2 tests passe 2 = 17/17 ✅)

| # | Test | OK | Preuve |
|---|------|----|--------|
| 1 | (a2) favori sur le spot PRIVÉ d'autrui refusé (EXISTS sous RLS spots) | ✅ | `42501 new row violates row-level security policy for table "favorite_spots"` |
| 2 | (a) 10 favoris OK puis 11e refusé (trigger cap) | ✅ | `P0001 max_favorite_spots / detail=Maximum 10 spots favoris. Retire un favori pour en ajouter un autre.` |
| 3 | (a3) delete own favori puis re-insert | ✅ | `row_count delete=1` |
| 4 | (b1) isolation lecture favoris : B voit 0 / A voit 10 | ✅ | `B=0 A=10` |
| 5 | (b2 passe 1) B écrit un favori au nom de A | ⚠️→✅ | passe 1 : refusé par `P0001 max_favorite_spots` (A avait déjà 10 favoris : le trigger BEFORE INSERT se déclenche AVANT l'évaluation du WITH CHECK). **Rejoué passe 2 avec A sous le cap** → `42501 new row violates row-level security policy for table "favorite_spots"` : c'est bien la RLS qui refuse. |
| 5bis | (b2 bis) B écrit des RÉGLAGES au nom de A | ✅ | `42501 new row violates row-level security policy for table "alert_settings"` |
| 6 | (b3) defaults réglages : `alerts_enabled=false` (opt-in OFF), `channel_push=true`, `channel_email=true`, `alert_threshold=70` | ✅ | `enabled=false push=true email=true seuil70=true` |
| 7 | (e) seuil hors bornes refusé, bornes acceptées | ✅ | `95→23514 49→23514`, 50/90/70 acceptés (CHECK `between 50 and 90`) |
| 8 | (b4) réglages de A invisibles/intouchables pour B | ✅ | `select=0 update=0 delete=0` (row_count) |
| 9 | (c) insert direct `alerts_sent` par `authenticated` (même SA propre ligne) | ✅ | `42501 new row violates row-level security policy for table "alerts_sent"` |
| 10 | (dédup) doublon service-role sur `(user, spot, window_date)` refusé | ✅ | `23505` (PK composite = contrainte d'unicité) |
| 11 | (checks) `kind='autre'` et `score=101` refusés | ✅ | `kind→23514 score→23514` |
| 12 | (b5) isolation `alerts_sent` : A voit SA ligne, B rien | ✅ | `A=1 B=0` |
| 13 | (g) RPC `get_favorite_spot_coords()` refusée à `authenticated` | ✅ | `42501 permission denied for function get_favorite_spot_coords` (EXECUTE = service_role uniquement) |
| 14 | (g2) RPC côté service : uniquement les spots favorisés, dept trimmé, coords/nom/slug non null | ✅ | `count=10 trim=true nonnull=true` (le spot privé non favorisé n'apparaît pas) |
| 15 | (h) `notifications` : type `spot_alert` accepté / type inconnu refusé | ✅ | insert `spot_alert` + `target_type='spot'` + preview OK ; `bogus_type→23514` |
| 16 | (d) cascade RGPD : `delete from auth.users` purge les 3 tables | ✅ | `favoris=0 réglages=0 alerts_sent=0` |

## (d) `delete_my_account` : AUCUNE modification requise

Définition live relue (033) : la fonction fait uniquement
`delete from auth.users where id = auth.uid();` et s'appuie sur les cascades FK.
Les 3 nouvelles tables portent toutes `references auth.users(id) on delete cascade`
sur `user_id` → couvertes automatiquement (prouvé au test 16).

## Advisors post-application

- **security** : 100 lints = 3 ERROR + 1 INFO + 96 WARN.
  - Les 3 ERROR = baseline pré-existante assumée (`security_definer_view`
    `catches_for_viewer` + `spots_for_viewer`, `rls_disabled_in_public`
    `spatial_ref_sys`). L'INFO = `season_results` (voulu, 103c).
  - **Aucun nouvel ERROR.** ✅
  - 2 WARN nouveaux : `anon/authenticated_security_definer_function_executable`
    sur `favorite_spots_enforce_limit` — même classe que le pattern maison
    assumé (mêmes WARN pré-existants sur `feed_post_photos_enforce_limit`,
    `enforce_catch_rate_limit`, `handle_new_user`). Non exploitable : une
    fonction `RETURNS trigger` n'est pas appelable via PostgREST
    (« trigger functions can only be called as triggers »).
- **performance** : indisponible, erreur plateforme Supabase reproduite
  (`42601 syntax error at or near 'storage.buckets'` côté linter Supabase),
  identique à la baseline WS A du 02/07. Compensé par design : FK toutes
  couvertes par index (PK `(user_id, …)` + `favorite_spots_spot_idx` +
  `alerts_sent_spot_idx`, leçon 097) et policies en `(select auth.uid())`
  (initplan, leçon 024).

## Note d'ordre trigger vs RLS (documentée, pas un bug)

Le trigger cap 10 (BEFORE INSERT) s'évalue AVANT le WITH CHECK de la policy :
si la cible a déjà 10 favoris, un insert usurpé renvoie `max_favorite_spots`
au lieu de `42501`. La ligne n'est JAMAIS écrite dans les deux cas (prouvé
tests 5 passe 1 ET passe 2). Micro-oracle résiduel : un tiers peut apprendre
qu'un user arbitraire a ≥ 10 favoris (aucune info spot, aucune coordonnée) —
assumé.
