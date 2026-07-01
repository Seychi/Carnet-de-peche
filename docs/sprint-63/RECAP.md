# Sprint 63 — RECAP

## Défis, cockpit & notifs dopamine (capstone Phase B)

> Exécuté le 2026-07-01 (effort xhigh). **CODE-COMPLET, NON poussé** (consigne John). Migrations **100 + 101 APPLIQUÉES en prod** (glgciwwnpmgifyhbvxsw). Décisions produit validées par John en amont (cf `RESUME-STATE.md`). Clôture de la **Phase B (dopamine solo)**.

---

## Décisions John (validées avant exécution)

1. **Barème XP des défis = « calé sur l'existant »** : 3 espèces/mois = 40, mesure une prise = 15, lever du soleil = 20, sortie loguée = 20, événement « Saison du bar » = 50.
2. **Cadence notifs = « tasteful »** : level up / badge / record / défi complété à l'événement (in-app + push si activé) ; série en danger 1×/semaine max.
3. **Défis conservation = 0 XP** (rappels descriptifs inchangés).

---

## Ce qui a été fait

### Bloc 0 — DB & domaine (migration 100)
- **`challenges`** (défs seedées, lecture publique des actifs) + **`user_challenge_progress`** (RLS own-only en SELECT ; écriture via RPC definer ou service_role uniquement). Pattern RLS migration 084 : `(select auth.uid())`, FK `auth.users ON DELETE CASCADE`.
- **RPC `recompute_my_challenges()`** (SECURITY DEFINER, `search_path=public`) : recalcule les défis SQL-calculables (3 espèces/mois, prise mesurée, sortie loguée, saison du bar) et crédite `reward_xp` via `award_xp` à la complétion. **Idempotent** : `ref_id = ch.id` pour once/seasonal (1× à vie), `md5(ch.id||mois)` pour monthly (1×/mois, re-complétable). `completed_at` reset au changement de mois.
- **Défi « lever du soleil »** : NON calculable en SQL (aucune heure solaire stockée) → évalué en **TS** (`lib/gamification/challenges-solo.ts`, suncalc sur les prises PROPRES via `catches_for_viewer`, écriture en **service_role**). Anti-triche = logique serveur sur de vraies prises, jamais un argument client.
- **Seed** : 5 défis (species_3_month, first_measured, sunrise_catch, first_outing, season_bar_2026). Regen `lib/types.ts`.
- **Wiring** : `createCatch` (recompute + célébration + notifs) et `createOuting` (recompute), best-effort STRICT (jamais de throw qui casse le log).

### Bloc 1 — ChallengesBoard + célébration
- **`ChallengeRing`** (anneau SVG pur, motion-safe, daltonien-safe : Check + chiffre, pas la teinte) + **`ChallengeCard`** + **`ChallengesBoard`** (événement saisonnier mis en avant, « ta meilleure prise » solo).
- **Célébration** : la complétion d'un défi est fêtée AU LOG via `CelebrationOverlay` (moment « Défi relevé ! » ajouté à `buildCatchMoments`, `CatchCelebration.newChallenges`).

### Bloc 2 — Cockpit & profil
- **`DopamineCockpit`** (`/home`) : rang + XP, série, **défis actifs**, badges, Pokédex, défis conservation. Fond l'ex-`HomeProgressCard` + `GamificationHub` en UNE surface (plus de double carte « progression »). Pokédex/badges/séries **réintégrés, pas supprimés**.
- **`ProfileCompetitiveHeader`** (`/u/[username]`) : rang + XP (60) + **série** (62) + 3 badges phares (62). Remplace l'ajout minimal du sprint 60. Tout public mais via RPC definer gatées (zéro fuite).
- **Supprimés (orphelins)** : `GamificationHub.tsx`, `HomeProgressCard.tsx`.

### Bloc 3 — Notifications dopamine proactives (migration 101)
- **CHECK `notifications_type_check`** étendu (+ `level_up`, `badge_earned`, `new_record`, `streak_danger`, `challenge_completed`) + union TS `NotificationType`.
- **`lib/notifications/dopamine.ts`** : self-notifs (`actor_id NULL`) en service_role, **in-app toujours** + **push gaté par pref**. Émises depuis `createCatch` (level up via XP avant/après, record, badge, défi).
- **Prefs** : 2 clés groupées `progress` + `streak_reminder` (`NOTIFICATION_PREF_KEYS` + META → toggles auto dans les réglages).
- **`streak_danger`** : greffon dans le cron `personal-window` (dimanche, série active + semaine vide, idempotent ≤ 1×/semaine). **⚠️ Timing MATINAL assumé** (le cron tourne à ~07:00 ; pas de cron du soir dédié — John voulait « le soir J-1 »). Voir « Reste John ».

---

## Vérifications (toutes vertes)

- **typecheck** `tsc --noEmit` : OK.
- **tests** `vitest run` : **638 passés** (62 fichiers).
- **lint** `next lint` : 0 warning / 0 erreur.
- **build** `next build` : OK (routes /home, /u/[username], /profil incluses).
- **advisors** (post-migration) : **3 ERROR = baseline** (vues definer + spatial_ref_sys), aucune nouvelle classe ; `recompute_my_challenges` n'ajoute que le WARN `security_definer_function_executable` déjà assumé ; `user_challenge_progress` a bien sa policy.
- **Idempotence XP défi** (SQL, rollback) : 2 crédits même `ref_id` → +15 puis +0. **Confirmé.**
- **CHECK notifs** (SQL, rollback) : les 5 nouveaux types + `actor_id NULL` acceptés. **Confirmé.**
- **Bornes mois Europe/Paris** (SQL) : `month_start = 30/06 22:00 UTC` = 1er juillet 00:00 Paris. **Confirmé.**
- **Revue adversariale** (workflow 4 lentilles : sécurité / correction / anti-régression / honnêteté, 13 agents, chaque finding vérifié) : **8 findings confirmés (2 medium, 6 low), 4 corrigés, 1 accepté par design.** ZÉRO finding sécurité (pas de fuite GPS, RLS/definer/service_role OK).

### Correctifs post-revue
1. **[medium] Faux `level_up`** : `getUserXp` repliait sur `0` en cas d'erreur (ne throw pas) → un pêcheur établi dont la lecture « XP avant » échouait recevait une fausse notif de palier. Fix : nouvelle `getUserXpOrNull` (renvoie `null` sur erreur) ; le level-up n'est détecté QUE si les deux lectures réussissent.
2. **[medium] Défi complété par une SORTIE en silence** : `createOuting` créditait l'XP mais n'émettait ni notif ni fête (le type `challenge_completed` était mort côté sortie). Fix : `createOuting` passe `sinceIso`, lit les complétions fraîches et émet les notifs dopamine (émetteur renommé `emitDopamineNotifications`, générique prise/sortie ; pas de CelebrationOverlay côté sortie, le moment passe par la notif in-app).
3. **[low] Défi mensuel borné en UTC** au lieu d'Europe/Paris (incohérent avec les séries) → une prise loguée peu après minuit local basculait de mois. Fix : bornes de mois en Europe/Paris dans `recompute_my_challenges` (fonction ré-appliquée en prod).
4. **[low] « Série en danger » surestimait l'urgence** (ignorait le joker mensuel). Fix : copie positive et honnête (« Ta série attend un petit geste cette semaine »), sans promettre de perte certaine.
5. **[low, ACCEPTÉ] Sunrise pas recalculé au load du board** (`/home`) : par design, forward-looking (évalué au log de prise, coûteux à refaire à chaque render). Les prises post-feature sont toujours correctes ; seules d'éventuelles prises « lever du soleil » historiques attendent le prochain log. Documenté.

---

## Reste manuel John (post-sprint)

- **Merge → déploiement** (rien poussé). Migrations 100 + 101 déjà en prod.
- **`streak_danger`** : décider si le créneau matinal (07:00, greffé au cron existant) convient, ou provisionner un **cron du soir** pour un rappel « soir J-1 ». Le type + la pref sont déjà en place.
- **QA cockpit** (`/home`) + **profil** (`/u/<pseudo>` : rang + série + badges) + déclenchement des célébrations/notifs au log (défi, level up, record).
- **Push** : les notifs dopamine partent en push **si les clés VAPID sont dans Vercel** (sinon in-app seul, no-op propre).
- **Bilan Phase B** : la dopamine solo est en prod → prochaine étape = **Phase F (amorçage `invite_codes`)** puis **Phase E (classements)** quand le réservoir se remplit.

## Notes / dette

- **Perf `/home`** : le cockpit recompute les défis SQL on-read (idempotent, comme les badges). Acceptable (streamé en Suspense) ; à surveiller si /home ralentit.
- **Records dans le cockpit** : laissés sur `/carnet` + `/profil` (pas de doublon) plutôt qu'empilés sur `/home`.
- **« Défi qui se termine »** (rappel avant fin de période) : non implémenté (éviter un cron de plus) ; repliable dans le récap hebdo plus tard.
