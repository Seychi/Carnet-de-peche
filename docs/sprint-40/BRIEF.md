# Sprint 40 — Brief d'exécution
## « La meute » (F8 muscler le co-pêchage : matching + chat temps réel + statuts + rappel veille · ~5-6 j)

> Rédigé le 2026-06-27. 4ᵉ sprint de la roadmap offensive (`docs/ROADMAP-OFFENSIVE-2026-06-27.md` §7). Garder l'avance sur le collaboratif : Decathlon pousse les « sorties collaboratives » et Fishing Grid les « groupes + chat temps réel ». On muscle le co-pêchage **déjà livré** (sprint 25) sans trahir l'invariant n°1 du projet : **aucune coordonnée exposée**.
> Contexte : le socle existe (`outing_proposals`, `outing_participants`, 5 actions, vue, notifs `outing_join`/`outing_accepted`). Net-neuf = **matching par espèce**, **chat temps réel**, **transitions de statut auto**, **notifs de groupe** + **rappel la veille**.
> Décisions John 2026-06-27 : séquencement équilibré. Trois décisions ouvertes (D1-D3).

**Préalable** (manuel John) : partir de `main` (sprints 37-39 mergés de préférence ; le rappel veille réutilise `lib/push/send.ts` du sprint 39, mais c'est best-effort donc non bloquant si le push n'est pas encore actif).

---

## 🚀 Ligne de lancement (à copier-coller par John)

> ultracode — effort xhigh. Exécute `docs/sprint-40/BRIEF.md`. Lance **WS A et WS B en parallèle dès maintenant** (2 migrations indépendantes `065`/`066`), puis WS C (dépend des types notif de A). Invariant absolu : **zéro coordonnée GPS** dans une proposition, un message de chat ou une notif (réutilise le garde-fou `LOOKS_LIKE_COORD`). Le chat est **fail-closed** : réservé aux participants acceptés + hôte. Migrations en fichiers numérotés, applique, régénère `lib/types.ts`. Termine par **VERIF** avec QA Realtime cross-onglets. **Ne push pas.** Décision ouverte → `⚠️ DEMANDER À JOHN`.

---

## 🧠 Connecteurs & sous-agents (cf `CLAUDE.md` §20)

| Quand | Sous-agent → connecteur | Pourquoi |
|---|---|---|
| Supabase Realtime (`postgres_changes`, channels, RLS comme barrière) | **docs-researcher** → Context7 | API version-correcte (filtre ≠ sécurité, c'est la RLS qui garde). |
| Migrations `065`/`066`, RLS chat fail-closed, publication Realtime, trigger statut | **supabase-guard** → Supabase (RO d'abord) | Pattern RLS scoped + `alter publication`, regen types, `get_advisors`. |
| QA chat temps réel (2 comptes, 2 onglets) + matching + statut | **qa-chrome** → Claude in Chrome + Playwright | Vérifier la diffusion live, l'étanchéité RLS (un non-participant ne voit rien), 0 coord. |
| Après déploiement | **deploy-watch** → Vercel + Sentry | Cron rappel + Realtime sans erreur. |
| Clôture | **`/verif-sprint`** | Tests + build + lint + types + revue indépendante. |

## Objectif en une phrase
Permettre de **trouver** une sortie par espèce/zone, d'en **discuter en temps réel** avec les participants acceptés, de voir le **statut évoluer tout seul** (complet/annulé) et de recevoir un **rappel la veille**, le tout sans jamais exposer une coordonnée.

## ⚠️ Garde-fous transverses
1. **Zéro spot-burning** : `outing_proposals` n'a ni `geom` ni coords (commentaire `053:14-15`), et **on n'en ajoute pas**. Le matching se fait sur **espèce + département + libellé de zone**, jamais sur un point. Réutiliser `LOOKS_LIKE_COORD` (`lib/cofishing/schema.ts:12`) sur les messages de chat aussi.
2. **Chat fail-closed** : `outing_messages` lisible/écrivable **uniquement** par les participants `accepted` + l'hôte (calquer `outing_participants_select_scoped` `053:71-80`). Un `requested`/`declined` ne voit rien. La RLS est la barrière, pas le filtre Realtime.
3. **Pas de tier gating sur les sorties** (invariant sprint 25) : tout authentifié participe. Ne pas en ajouter.

## Workstreams & dépendances

| WS | Bloc | Durée | Dépend de | Parallèle J1 |
|----|------|-------|-----------|--------------|
| A | Matching espèce/zone + transitions de statut auto (`065`) + filtres + badge statut | 1,5 j | — | ✅ |
| B | Chat temps réel (`066` `outing_messages` + hook + action + UI) | 2 j | — | ✅ |
| C | Notifs de groupe (full/annulé) + cron rappel veille + push | 1,5 j | A (types notif) | ⚠️ après A |
| VERIF | revue + QA Realtime + anti-régression | 0,5 j | tous | ❌ |

**Parallèle jour 1 : A + B** (migrations `065`/`066` indépendantes). Puis C après A.

---

## WS A — Matching espèce/zone + transitions de statut auto (`065`)

> **Connecteurs** : supabase-guard (colonne + trigger + CHECK notif) ; docs-researcher au besoin.

### Tâches
1. `supabase/migrations/065_outings_matching.sql` :
   - `alter table public.outing_proposals add column species text[];` (+ `add column technique text;` si tu veux filtrer par technique). **NE PAS** ajouter `spot_id`/`geom`/coords (cf D1 + invariant). Index GIN sur `species` pour le filtre.
   - `add column reminded_at timestamptz;` (anti-doublon du rappel veille, WS C).
   - **Transition `open → full`** : trigger sur `outing_participants` qui, après un passage à `accepted`, compte les `accepted` et pose `outing_proposals.status='full'` quand `accepted_count >= capacity` (et re-`open` si une place se libère et que `status='full'`). Les valeurs `full`/`done` existent déjà dans le CHECK (`053:20`), rien à changer côté contrainte.
   - **Extension du CHECK notif** (repartir de la liste COMPLÈTE des 12 de `060_spot_verification.sql:233-238`) : `drop constraint` + `add` avec en plus `'outing_full'`, `'outing_cancelled'`, `'outing_message'`, `'outing_reminder'`. (`target_type='outing'` déjà autorisé `053:191-192`.)
   - Étendre l'union TS `NotificationType` (`lib/notifications/create.ts:18-35`) des 4 nouveaux types.
2. **Filtres de matching** : `app/(app)/sorties/page.tsx` (board, `:46-55` header / liste `:77`) aujourd'hui **sans filtre** (liste brute par département). Ajouter des filtres **espèce** (+ date/technique) au-dessus de la liste. Étendre la query `getDeptProposals` (`lib/cofishing/queries.ts:27-38`) pour filtrer par `species` (overlap `&&`) en plus du département.
3. **Badge statut** dans `components/cofishing/ProposalCard.tsx` (corps ≥ `:59`) : pastille « Ouverte / Complète / Annulée / Passée » pilotée par `status`.
4. **Anti-spam `requestJoin`** (net-neuf, aujourd'hui aucun rate-limit côté join, seul `proposeOuting` est limité via trigger `053:154-177`) : ajouter un rate-limit léger sur `requestJoin` (`lib/cofishing/actions.ts:59`) (ex. trigger DB ou compteur 10 demandes/24h).

### Critères d'acceptation
- Filtrer le board par espèce ne renvoie que les sorties ciblant cette espèce (vérif requête).
- Quand le nombre d'acceptés atteint `capacity`, `status` passe à `full` **tout seul** (test : accepter le dernier participant) ; libérer une place repasse `open`.
- `requestJoin` spammé est limité proprement (message FR).
- **0 coordonnée** ajoutée au schéma (vérif : pas de `geom`/`lat`/`lng`/`spot_id` sur `outing_proposals`).

### Garde-fous
- Matching sur espèce + département + label, **jamais** sur un point précis.
- Ne pas modifier les policies existantes ni ajouter de tier gating.

---

## WS B — Chat temps réel par sortie (`066`)

> **Connecteurs** : docs-researcher (Supabase Realtime) ; supabase-guard (RLS chat fail-closed + publication) ; qa-chrome (diffusion live + étanchéité).

### Tâches
1. `supabase/migrations/066_outing_chat.sql` :
   - Table `outing_messages` (`id uuid pk default gen_random_uuid()`, `proposal_id uuid not null references outing_proposals(id) on delete cascade`, `user_id uuid not null references auth.users(id) on delete cascade`, `body text not null check (char_length(body) between 1 and 1000)`, `created_at timestamptz default now()`). Index `(proposal_id, created_at)`.
   - **RLS fail-closed** : `select`/`insert` réservés aux **participants acceptés + hôte** (calquer le prédicat `outing_participants_select_scoped` `053:71-80` : `EXISTS(host) OR EXISTS(outing_participants where proposal_id=... and user_id=auth.uid() and status='accepted')`). INSERT `with check (user_id = (select auth.uid()))` + même condition d'appartenance. Pas de update/delete v1 (ou delete-own).
   - **Realtime** : `alter publication supabase_realtime add table public.outing_messages;` (modèle `020_feed_realtime.sql:11`). `replica identity full` si tu filtres des DELETE (`020:15-16`).
2. **Hook** `lib/cofishing/useOutingChatRealtime.ts` calqué sur `lib/feed/useFeedRealtime.ts:17-60` : `supabase.channel(`outing:${proposalId}`).on('postgres_changes', { event:'INSERT', schema:'public', table:'outing_messages', filter:`proposal_id=eq.${proposalId}` }, cb)`, cleanup `removeChannel`. **La RLS garde, pas le filtre.**
3. **Action** `sendOutingMessage(proposalId, body)` dans `lib/cofishing/actions.ts` : valider via zod + **`LOOKS_LIKE_COORD`** (`schema.ts:12`) pour bloquer une coord tapée à la main ; insert ; envoyer une notif `outing_message` aux **autres** participants acceptés (best-effort, `createNotification`).
4. **UI chat** dans `ProposalCard.tsx` (corps ≥ `:59`, derrière une condition « je suis accepté ou hôte ») : fil de messages + champ d'envoi, abonné via le hook. Auto-scroll, état vide propre.

### Critères d'acceptation
- 2 comptes acceptés sur la même sortie : un message envoyé par l'un **apparaît en temps réel** chez l'autre (qa-chrome 2 onglets).
- Un utilisateur `requested` (non accepté) ou tiers **ne voit ni n'envoie** aucun message (RLS : test direct + UI).
- Un message contenant une coordonnée (« 47.123, -3.456 ») est **refusé** (zod `LOOKS_LIKE_COORD`).
- 0 erreur console ; cleanup du channel au démontage.

### Garde-fous
- RLS d'abord, fail-closed. Le `filter` Realtime n'est pas la sécurité.
- Aucune coordonnée poussée par le système dans un message.

---

## WS C — Notifs de groupe + rappel veille (cron)

> **Connecteurs** : supabase-guard (lecture cron) ; deploy-watch (le cron tourne).

### Tâches
1. **Notifs de statut** (les types viennent de WS A) :
   - Dans `cancelOuting` (`lib/cofishing/actions.ts:137-154`) : après le passage `cancelled` (`:145`), notifier les participants `accepted` (type `outing_cancelled`). Best-effort.
   - Dans `respondToParticipant` (`:98-134`) / le trigger de WS A : quand la sortie devient `full`, notifier les acceptés (type `outing_full`).
2. **Cron rappel veille** `app/api/crons/outing-reminders/route.ts` (calque `app/api/crons/recfishing-reminders/route.ts` : `GET`, `force-dynamic:7`, `maxDuration:8`, **auth `CRON_SECRET` `:18-21`**, `createAdminClient:25`, anti-doublon `:58`) : sélectionner les `outing_participants accepted` dont la `outing_proposals.planned_at` tombe **demain** et `reminded_at is null` ; insérer une notif `outing_reminder` à chaque participant ; **brancher `sendPushToUser`** (`lib/push/send.ts:58`, best-effort, no-op si VAPID absent) ; poser `outing_proposals.reminded_at=now()` (anti-doublon). Optionnel : marquer `done` les propositions dont `planned_at` est passé (cf D3).
3. **`vercel.json`** (`:4-9`) : ajouter une 5ᵉ entrée `{ "path": "/api/crons/outing-reminders", "schedule": "0 18 * * *" }`. ⚠️ **Vérifier la limite de crons du plan Hobby** : s'il y a un plafond, **fusionner** la logique rappel dans `recfishing-reminders` (même créneau du soir) plutôt qu'un 5ᵉ cron (cf D2).

### Critères d'acceptation
- Annuler une sortie notifie tous les acceptés (`outing_cancelled`) ; atteindre la capacité notifie les acceptés (`outing_full`).
- Le cron rappel (appel `Bearer CRON_SECRET`) envoie une notif `outing_reminder` + un push aux acceptés d'une sortie de **demain**, **une seule fois** (`reminded_at`).
- Aucune notif si la sortie n'est pas pour demain ; un gratuit reçoit aussi le rappel (pas de gating sorties).

### Garde-fous
- Best-effort : push et notifs ne cassent jamais la boucle ni l'action.
- Anti-doublon strict (`reminded_at`).

---

## Workstream VERIF (obligatoire, agent indépendant)
1. `/verif-sprint` : `pnpm test` + `pnpm build` + `pnpm typecheck` + `pnpm lint` + revue croisée.
2. **QA Realtime (qa-chrome, 2 comptes/2 onglets)** : chat live, étanchéité RLS (un non-participant ne voit rien), matching par espèce, transition `full` auto, badge statut, rappel veille simulé.
3. **Passe sécurité / anti spot-burning (NON négociable)** : aucune coord sur `outing_proposals`/`outing_messages` ; `LOOKS_LIKE_COORD` appliqué aux messages ; chat RLS fail-closed (accepté/hôte only) ; vue `outing_proposals_for_viewer` toujours `security_invoker` (`053:128`) ; advisors sans nouvelle alerte ; pas de tier gating ajouté.
4. **Passe anti-régression** : les 5 actions co-pêchage existantes intactes (propose/join/respond/cancel/withdraw) ; rate-limit `proposeOuting` (trigger `053`) intact ; notifs `outing_join`/`outing_accepted` intactes.
5. **Passe copy** : tutoiement, zod en français, **aucun tiret cadratin en prose** (`node scripts/lint-copy-dashes.mjs`), pas de promesse mensongère.
6. **deploy-watch** (Vercel + Sentry) : cron `outing-reminders` + Realtime sans erreur.
7. Livrer `docs/sprint-40/RECAP.md` : fait / comment tester / reste manuel John / statut D1-D3.

---

## Décisions pour John
- **D1 (périmètre matching)** — **Reco** : matcher sur **espèce + département + libellé de zone**, et **ne PAS** ajouter `spot_id`/coords sur les propositions (préserve l'invariant anti spot-burning : une sortie pinée sur un spot précis revient à cramer le spot). La zone reste un libellé texte. OK ?
- **D2 (5ᵉ cron vs fusion)** — le plan Hobby plafonne peut-être le nombre de crons (on en a déjà 4). **Reco** : tenter un 5ᵉ cron `outing-reminders` à 18h ; si la limite est atteinte, **fusionner** le rappel dans `recfishing-reminders` (17h, même esprit). À trancher selon ce que Vercel accepte.
- **D3 (statut `done`)** — marquer `done` les sorties passées : **Reco** = le faire dans le cron rappel (cheap), ou dériver à la lecture. Pas de cron dédié.
- **Modération du chat** (note) : v1 = groupe fermé (tu choisis qui tu acceptes), faible surface d'abus → pas de modération. Signalement/modération du chat = fast-follow si besoin.

## Reste manuel John (post-sprint)
- Relire le diff, merger `sprint-40` → `main`, déploiement (le cron `outing-reminders` apparaît dans Vercel), **QA réelle** : créer une sortie, faire rejoindre un 2ᵉ compte, accepter, discuter en chat (2 téléphones), vérifier le rappel la veille.
- Vérifier dans Vercel que le 5ᵉ cron est accepté (sinon appliquer D2).

---

> **Invariants (rappel)** : pas de push sans validation de John · RLS jamais désactivé (nouvelles tables → RLS d'abord, **chat fail-closed**) · migrations = nouveaux fichiers (`065`, `066`) + regen `lib/types.ts` · **zéro coordonnée GPS** (propositions, chat, notifs) + `LOOKS_LIKE_COORD` sur le chat · **pas de tier gating sur les sorties** · notifs/push best-effort (ne cassent jamais l'action) · Realtime : la RLS garde, pas le filtre · copy sans tiret cadratin.
