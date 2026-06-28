# Sprint 49 — Brief d'exécution
## « Push & engagement » (nouveaux types + digest + réglages + app badge · ~3-4 j)

> Rédigé le 2026-06-28. Enrichissement (roadmap `docs/ROADMAP-CORRECTIFS-ENRICHISSEMENTS-2026-06-28.md` §9). Faire du Web Push (sprint 39, rendu honnête au 44) un canal de rétention riche, au-delà de la seule « fenêtre optimale ».
> Features : (A) **nouveaux types de push** (grandes marées via marnage, prise d'un pêcheur suivi, rappel fermeture d'espèce), (B) **digest hebdo**, (C) **réglages granulaires par type**, (D) **app badge + purge**.
> **Constats clés (re-vérifiés)** : tout réutilise `sendPushToUser` (`lib/push/send.ts:58`), le cron `personal-window` (gate tier + idempotence/jour + push best-effort), et le pipeline forecast dépt **caché 1h** (`dept-window.ts`, zéro appel Open-Meteo en plus). **Aucun coefficient de marée** (proxy = marnage `tide_range_m`).

**⚠️ Contrainte CRON** : **4 crons sur Vercel Hobby, AUCUN slot libre** (`vercel.json:4-9`). → **on greffe** dans `personal-window` (07:00) + de l'**event-driven** ; on n'ajoute **pas** de 5e cron (modèle de fusion : `recfishing-reminders/route.ts:66-97`).

**⚠️ État** : migrations à **082** (47 a posé `080/081/082`) ; le sprint 48 (en cours) en prend → ce sprint démarre ~`084`+. **Confirmer le dernier numéro avant de créer.**

---

## 🚀 Ligne de lancement (à copier-coller par John)

> ultracode — effort xhigh. Exécute `docs/sprint-49/BRIEF.md`. **Confirme le dernier numéro de migration.** Réutilise `sendPushToUser` + le cron `personal-window` (greffon) + `getFollowers`. **Aucun 5e cron** : big-tide/digest/fermeture se greffent dans des crons existants, `followed_catch` est event-driven. Marnage = `tide_range_m` (pas de coef inventé). Réglages par type = colonne jsonb `profiles.notification_prefs`. Migration : CHECK types (liste COMPLÈTE) + `notification_prefs`. Regen `lib/types.ts`. Termine par **VERIF**. **Ne push pas.** Décision ouverte → `⚠️ DEMANDER À JOHN`.

---

## 🧠 Connecteurs & sous-agents

| Quand | Sous-agent → connecteur | Pourquoi |
|---|---|---|
| Migration CHECK types + `notification_prefs`, RLS | **supabase-guard** → Supabase (RO d'abord) | Répéter la liste COMPLÈTE des types (anti-régression 067:80) ; regen types. |
| Web Push (greffon cron, payload), seuil marnage | **docs-researcher** → Context7 | API web-push / patterns cron Node. |
| QA (réception des nouveaux push, réglages, app badge) | **qa-chrome** → Claude in Chrome | Vérifier chaque type + opt-in par type + badge PWA. |
| Clôture | **`/verif-sprint`** | Build + typecheck + lint + tests. |

## Workstreams & dépendances

| WS | Bloc | Effort | Migration | Parallèle J1 |
|----|------|--------|-----------|--------------|
| A | Nouveaux types de push (big-tide, followed-catch, fermeture) | M | CHECK types | ✅ |
| B | Digest hebdo (greffon cron) | S-M | — | ✅ |
| C | Réglages granulaires par type (`notification_prefs`) | M | jsonb profiles | ✅ |
| D | App badge + purge | S | — | ✅ |
| VERIF | revue + QA | S | — | ❌ |

WS A et B lisent les prefs de WS C → coordonner l'ordre des `notification_prefs->>'...'`. La migration (CHECK + jsonb) est commune.

---

## WS A — Nouveaux types de push

### Tâches
1. **Migration `083` — CHECK types** : `DROP/ADD CONSTRAINT notifications_type_check` en **répétant les 16 types actuels** (`067_outings_matching.sql:82-90`) **+** `'big_tide'`, `'followed_catch'`, `'species_closure'`. Aligner le union TS `NotificationType` (`lib/notifications/create.ts:18-41`) + **ajouter `recfishing_reminder`** (discordance existante : présent en DB/UI, absent du union). `target_type` : `'catch'` (followed_catch), `'spot'`/null (big_tide), null (species_closure).
2. **Big-tide** (greffon `personal-window/route.ts`) : nouveau helper `getDeptTideRangeForDay(dept, dateKey)` qui réutilise `fetchSpotForecastWeek(coords.lat, coords.lng)` (cache 1h via `dept-window.ts`, **zéro appel réseau en plus**) et dérive le marnage = `max(extrema.high) − min(extrema.low)` (`SpotConditions.tide.extrema`, `spot-forecast.ts`). Si marnage > **seuil** (constante par façade, cf D2), pousser « Grande marée aujourd'hui (marnage N m) ». Idempotence/jour comme `optimal_window`. **Gate tier** : cf D1 (big-tide intéresse tous les pêcheurs → potentiellement hors gate Local/Itinérant).
3. **Followed-catch (event-driven, PAS de cron)** : dans `createCatch` (`lib/catches/actions.ts:97`, insert privacy `:165`) **et** `updateCatch` (`:189`, transition privacy `:279`), après un insert/maj **public** réussi, best-effort : `getFollowers(user.id)` (`app/actions/follow.ts:191`) → boucle `createNotification({type:'followed_catch', targetType:'catch', targetId})` + `sendPushToUser`. Isoler par destinataire (modèle `runOutingReminders`). Respecter la pref `followed_catch` (WS C) + anti-spam (cf D3).
4. **Species-closure** (greffon cron, faible fréquence) : croiser `profiles.favorite_species` (`001:28`) ∩ espèces à `closedWindows` (`lib/regulation/data.ts:71` — **seules `bar` mois [2,3] et `lieu-jaune` mois [1-4]**). À J-N jours avant le 1er du mois de fermeture, pousser « La fermeture du {espèce} commence bientôt ». ⚠️ **Normaliser le slug** `lieu_jaune` (favorite_species, underscore) vs `lieu-jaune` (SpeciesSlug, tiret) avant de croiser (piège réel).

### Critères d'acceptation
- Un jour de grande marée → push big-tide (marnage réel, jamais de coef inventé) selon la pref.
- Publier une prise → les followers reçoivent une notif (in-app + push opt-in).
- Une fermeture d'espèce favorite qui approche → rappel.

### Garde-fous
- ⚠️ **DEMANDER À JOHN (D1)** : big-tide pour **tous les tiers** (reco, hook d'engagement gratuit) ou Local/Itinérant seulement ?
- ⚠️ **(D3)** : followed-catch — push pour **chaque** prise publique d'un suivi, ou seulement notable / batché (anti-fatigue) ?

---

## WS B — Digest hebdo

### Tâches
1. **Greffon** (pas de 5e cron) : un test de jour de semaine en tête de `personal-window` (ou `recfishing-reminders` à 17:00 pour un envoi en soirée) → une fois/semaine, composer « Ta semaine : N prises · ta plus belle · tes fenêtres à venir » depuis `getMyCatchStats` + `getDeptUpcomingWindows`. In-app (`createNotification` type `weekly_digest`) + push.
2. Type `weekly_digest` ajouté au CHECK (WS A migration). Respecter la pref `weekly_digest`.
3. Idempotence/semaine (compter le digest de la semaine courante avant d'envoyer).

### Critères d'acceptation
- Un digest hebdo arrive une fois/semaine (in-app + push), récapitulant la semaine + les fenêtres à venir ; jamais deux fois la même semaine.

### Garde-fous
- Faible risque de fatigue (1/semaine) ; respecter l'opt-out.

---

## WS C — Réglages granulaires par type

### Tâches
1. **Migration** : `ALTER TABLE public.profiles ADD COLUMN notification_prefs jsonb NOT NULL DEFAULT '{}'::jsonb;` (RLS `profiles` own déjà OK, aucune policy à ajouter ; modèle `054` pour les prefs). Clés : `optimal_window, big_tide, followed_catch, species_closure, weekly_digest` (défauts à la lecture = true).
2. **UI réglages** : étendre la section « Réglages » de `app/(app)/notifications/page.tsx:180-185` (aujourd'hui juste `<PushSettingsToggle />`) avec un **toggle par type** ; server action `setNotificationPref(type, enabled)` (update `notification_prefs`, scoping `auth.uid()`).
3. **Gate par pref** : chaque émetteur (cron big-tide/digest/optimal-window, event followed_catch/species_closure) lit `profiles.notification_prefs->>'<type>'` (déjà en contexte, profil chargé) et saute si `false`. L'abonnement push global (sprint 39/44) reste le maître interrupteur.

### Critères d'acceptation
- Couper un type (ex. followed_catch) dans les réglages → plus aucune notif/push de ce type ; les autres continuent.

### Garde-fous
- ⚠️ **DEMANDER À JOHN (D4)** : colonne jsonb sur `profiles` (reco, cohérent `054`) ou table dédiée ?

---

## WS D — App badge + purge

### Tâches
1. **App badge** (net-neuf) : piloter `navigator.setAppBadge(unread)` / `clearAppBadge()` depuis le compteur non-lu de `useNotificationRealtime` (`lib/notifications/useNotificationRealtime.ts:21`) via un `useEffect([unread])`, gardé `'setAppBadge' in navigator` (Android/desktop ; **iOS = phase mobile**). Compteur sur l'icône PWA.
2. **Purge endpoints morts** (faible priorité) : la purge à l'envoi (`send.ts:102-112`) suffit. Si besoin, greffer un bloc best-effort dans un cron existant (pas de 5e cron). Optionnel v1.

### Critères d'acceptation
- L'icône PWA porte le compteur de notifs non lues (là où c'est supporté), remis à 0 à la lecture.

---

## Workstream VERIF (obligatoire, agent indépendant)
1. `/verif-sprint` : build + typecheck + lint + tests verts.
2. **QA (qa-chrome)** : réception big-tide (jour de marnage fort) ; followed-catch (publier une prise → un follower notifié) ; digest hebdo ; couper un type dans les réglages → plus de ce type ; app badge PWA.
3. **Passe sécurité/honnêteté** : marnage réel (jamais de coef inventé) ; push best-effort (ne casse jamais l'action ni le cron) ; idempotence (pas de doublon/jour ou /semaine) ; CHECK types = liste complète (0 régression) ; prefs scopées `auth.uid()`.
4. **Passe anti-fatigue** : volumes raisonnables (followed-catch selon D3 ; digest 1/semaine) ; chaque type respecte sa pref + le maître interrupteur push.
5. **Passe copy** : tutoiement, pas de tiret cadratin (`node scripts/lint-copy-dashes.mjs`).
6. Livrer `docs/sprint-49/RECAP.md` : fait / comment tester / statut D1-D4 + seuils marnage retenus.

---

## Décisions pour John
- **D1 (big-tide tier)** — tous les tiers (reco, engagement gratuit) ou Local/Itinérant ?
- **D2 (seuil marnage)** — seuil « grande marée » par façade (le projet n'a pas de coef ; à fixer en constante honnête, ex. marnage > X m). Quelle valeur par façade ?
- **D3 (followed-catch)** — chaque prise publique d'un suivi, ou notable/batché (anti-fatigue) ?
- **D4 (prefs)** — jsonb sur `profiles` (reco) ou table dédiée ?
- **Rappel** : push natif iOS plein écran = **phase mobile** (Expo) ; ici Web Push (Android/desktop/PWA iOS 16.4+).

## Reste manuel John (post-sprint)
- Appliquer les migrations (CHECK types + `notification_prefs`), regen types, merger `sprint-49` → `main`, déployer, **tester les push sur ton téléphone** (PWA installée), vérifier les crons.

---

> **Invariants (rappel)** : pas de push sans validation · migrations = nouveaux fichiers + regen `lib/types.ts` · CHECK types = **liste COMPLÈTE répétée** (anti-régression) · marnage réel, **jamais de coef inventé** · **aucun 5e cron** (greffon/event-driven) · push best-effort (ne casse jamais l'action) · chaque type respecte sa pref + l'opt-in global · copy sans tiret cadratin.
