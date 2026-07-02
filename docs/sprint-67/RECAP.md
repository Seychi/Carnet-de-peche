# Sprint 67 — RECAP « Saisons & rangs vivants »

> Exécuté le 2026-07-02 (Fable, effort xhigh). Phase E (dopamine multi-joueur). **Prérequis Sprint 66 mergé : OK** (`a5699d2` sur `main`). **CODE-COMPLET, NON poussé** (décision « ne pas push » du brief).

## Décisions John (début de sprint)
1. **Cadence de saison = TRIMESTRIELLE NOMMÉE** (Hiver / Printemps / Été / Automne + année, ex. « Été 2026 »), frontière Europe/Paris (trimestre civil). Remplace « année civile » du Sprint 66.
2. **Archivage COMPLET** : table `season_results` (podium figé) + cron de bascule + badge public permanent **« Champion de saison »** (national XP #1 de chaque saison).

## Migration 103 (`103_seasons_rank_rarity.sql`) — APPLIQUÉE + SMOKE-TESTÉE en prod
Additive/non-destructive (+ correctif `103b_dept_trim` appliqué, cf ci-dessous). `lib/types.ts` régénéré.

**Volet A — Saisons**
- `season_window(offset)` : bornes `[starts_at, ends_at)` d'une saison trimestrielle, clé `2026-Q3`, **frontière heure murale Europe/Paris** (leçon anti-décalage UTC de 101/102, DST géré : vérifié 22:00Z en été, 23:00Z en hiver).
- `get_leaderboard` **v2** : ancienne signature 6-arg **droppée**, remplacée par 7-arg (+ `p_season_offset`, + **borne haute exclusive** indispensable pour consulter une saison passée). k-anon K=3 conservé (national/département), pas sur `follows`. Recalcul exact d'une saison passée depuis le ledger `xp_events`.
- `season_results` (table) : podium figé national/département × 4 métriques, top 10. **RLS ON, lecture directe VERROUILLÉE** (0 policy, pattern `user_badges`/`invite_codes` — cf revue ci-dessous) : la lecture passe UNIQUEMENT par `get_season_results` (definer, qui filtre l'opt-out), l'écriture par `archive_season` (definer). 2 index (lookup + FK).
- `get_season_results(...)` : lecture d'un podium archivé, **respecte l'opt-out RGPD** (`public_ranking`) même sur l'historique (prouvé : opt-out → l'utilisateur passe de 3 à 2 lignes lues, sa ligne restant physiquement archivée mais invisible ; suppression de compte = cascade FK).
- `archive_season(offset)` : fige le podium + attribue le badge `season_champion` au national XP #1, **idempotent** (`ON CONFLICT DO NOTHING`), retourne les lignes FRAÎCHES du board flagship (national XP) → notifs de récap une seule fois.

**Volet B — Notifs de rang**
- `get_overtaken_followers(actor, delta)` : followers **opt-in** que l'auteur vient de dépasser en **XP de saison** (fenêtre `[now-delta, now)`). Spot-safe (`{user_id, username}`). Grantée `service_role` seulement.
- Types de notif `rank_overtake` + `season_recap` ajoutés au CHECK (réécriture complète de la liste, pattern 085/101).

**Volet C — Rareté des badges**
- `get_badge_rarity()` : `{slug, holders, total}` où **total = pêcheurs actifs (≥ 1 prise)** — agrégat opaque, **jamais QUI**. Grantée `anon`+`authenticated` (badges déjà publics via `get_public_badges`).

**★ Bug latent hérité du Sprint 66 corrigé (`103b`)** : `home_department` est `char(3)` (padding « `06 ` »). La comparaison `home_department = p_dept` en **sémantique texte** rendait `'06 ' != '06'` → **le classement département renvoyait toujours 0** (masqué par la faible densité). Corrigé par `trim()` des deux côtés dans `get_leaderboard`, `archive_season` (dept stocké trimé) et `get_season_results`. Prouvé : board dept 06 = 3 après fix (0 avant).

**Smoke-tests (via `begin; … ; rollback;` → prod jamais mutée)** : `season_window` (offsets 0/-1/-3, DST OK) ; `get_leaderboard` national/dept/all_time/saison-passée (k-anon vérifié : dept 11 à 1 joueur → vide, dept 06 à 3 → 3 lignes) ; `archive_season(0)` (4 lignes fraîches, champion #1, badge attribué) ; `get_overtaken_followers` (delta 600 → `[lechat]`, positif ; delta 250 → vide, correct) ; `get_season_results` (podium lu, param `06 ` et `06` OK) ; `get_badge_rarity` (7 actifs, first_catch 100 %). Advisors sécurité : **0 nouvelle ERROR** (baseline 3 inchangée : 2 `security_definer_view` + `spatial_ref_sys`) ; les RPC definer sont dans la catégorie assumée `*_security_definer_function_executable` (comme `get_user_xp`/`get_public_badges`) ; `season_results` ajoute un WARN `rls_enabled_no_policy` **intentionnel** (verrou lecture, même état que `invite_codes`).

## Implémentation applicative
**Bloc 0 (seasons UI + champion)**
- `lib/gamification/season.ts` (neuf, pur, testé) : `seasonLabelFromKey` (Q1→Hiver…), `shiftSeasonKey`, `seasonOptions`.
- `/classements` : récupère la saison courante via `season_window(0)` (source SQL unique), dérive libellé + saisons passées en TS ; **sélecteur de saison** (courante + 3 précédentes) dans `LeaderboardTable` (visible en mode « Saison »).
- `app/actions/leaderboard.ts` : param `seasonOffset` borné `[-40, 0]` (positif interdit).
- `badges.ts` : famille **`season_champion`** (mono-palier, icône `crown`, métrique `seasonTitles` non dérivée du carnet) ; `BadgesGrid` : icône Crown.
- **Cron** : PAS de 5e cron (contrainte Hobby, cf sprint 49) → greffon `archive_season(-1)` + `emitSeasonRecapNotifications` dans **`personal-window`** (quotidien, best-effort strict, idempotent).

**Bloc 1 (notifs de rang)**
- `lib/notifications/rank.ts` (neuf) : `emitRankChangeNotifications` — RPC overtake + dédup 24h anti ping-pong + in-app (acteur humain via `createNotification`) + push gaté par la pref `ranking`. Best-effort STRICT.
- `lib/notifications/season-recap.ts` (neuf) : `emitSeasonRecapNotifications` — récap/champion (self-notif `actor_id NULL`), push gaté `ranking`.
- Hooks au log : `lib/catches/actions.ts` + `lib/outings/actions.ts` (xpAfter hissé, partagé dopamine + rang).
- `prefs-meta.ts` : clé de pref `ranking` + libellé. `create.ts` : union étendue.
- `/notifications` : rendu + routage des 2 types (icône Trophy → `/classements`).

**Bloc 2 (rareté)**
- `lib/gamification/badge-rarity.ts` (neuf) : `getBadgeRarity` → `Record<slug, {holders,total,pct}>`, best-effort.
- Fil : `queries.ts` (aggregate) → `DopamineCockpit` → `BadgesGrid` affiche « X % des pêcheurs l'ont » (palier le plus haut obtenu, sinon bronze en teaser ; masqué si personne ne le détient → pas de « 0 % » trompeur).

## Vérification
- **typecheck** : 0 erreur.
- **Vitest** : **670 tests** verts (+13 vs 657 : `season.test.ts` neuf + `leaderboard` seasonOffset + `badges` référentiel 8 familles/15 paliers).
- **build** Next : OK.
- **lint** : clean (hook `lint-changed` par fichier, 0 warning).
- **Revue adversariale** (workflow, 4 lentilles indépendantes : anti-fuite / RGPD / honnêteté / correction). Lentille honnêteté = 0 finding. **2 findings réels corrigés** (les autres étaient soit auto-réfutés par le relecteur — « no bug here » —, soit des comportements best-effort voulus par le brief) :
  1. **[fuite + RGPD]** `season_results` avait une policy SELECT `using(true)` → un client authentifié pouvait lire la table en direct, **contournant le filtre `public_ranking`** de `get_season_results` (un opté-OUT restait visible) + exposant la métadonnée `dept` en brut. **Corrigé (`103c`)** : verrou lecture (RLS ON, 0 policy) → lecture uniquement via la RPC definer qui filtre l'opt-out. Prouvé en rollback.
  2. **[UX/daltonisme]** `rank_overtake` et `season_recap` partageaient l'icône Trophy → `season_recap` passe à Medal (deux types visuellement distincts ; les libellés texte étaient déjà distincts).
  - Finding « critical » delta total vs saison = **non-bug** : `award_xp` (098) horodate toujours `created_at=now()` → le delta total du log est égal au delta de saison (invariant documenté dans `rank.ts`).

## Garde-fous tenus
- **Anti spot-burning** : aucune fonction/route n'expose de coordonnée ; `dept` reste un filtre grossier déjà public, stocké/comparé trimé, jamais une sortie de localisation.
- **RGPD opt-in** : `public_ranking` respecté sur le live ET l'historique (`get_season_results` filtre `public_ranking`) ; notifs de rang uniquement entre comptes opt-in (garanti par la RPC).
- **Honnêteté** : rareté = vrai agrégat (dénominateur = pêcheurs actifs) ; saisons recalculées depuis le ledger (aucun chiffre inventé) ; badge champion réellement mérité.
- **Daltonisme** : rang (chiffre + médaille), badges (icône + libellé + pips), rareté (texte mono) — jamais la teinte seule.
- **Best-effort STRICT** : les émetteurs de notif ne throw jamais → un échec n'interrompt jamais le log de prise/sortie ni le cron.

## Reste manuel John (post-sprint)
- Confirmer la **migration 103** (déjà appliquée + smoke-testée) ; `lib/types.ts` déjà régénéré.
- **Merge → déploiement** (aucun changement `vercel.json` : pas de nouveau cron). Le badge champion / les notifs de récap ne s'activeront qu'à la 1re bascule de trimestre AVEC ≥ 3 joueurs opt-in (k-anon) — dormant tant que le réservoir est maigre (cf Sprint 66 : « ne pas mettre en avant avant amorçage Sprint 68 »).
- (Info) le classement **département** était cassé depuis le Sprint 66 (char(3)) et est réparé ici.
