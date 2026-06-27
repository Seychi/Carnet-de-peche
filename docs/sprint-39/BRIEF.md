# Sprint 39 — Brief d'exécution
## « Le carnet qui te prévient » (F4 notif Web Push « fenêtre optimale » + F7 fondation prise mesurée · ~5-6 j)

> Rédigé le 2026-06-27. 3ᵉ sprint de la roadmap offensive (`docs/ROADMAP-OFFENSIVE-2026-06-27.md` §6). La killer feature : pendant que spot-de-peche / FishFriender / Fishing Grid poussent du solunaire **générique**, on prévient chacun **selon SON historique**. Et on pose la fondation « prise mesurée » (table stake) côté data, sans attendre le natif.
> Contexte : le **contenu** du push existe déjà (cron `personal-window` qui calcule le créneau + le match perso et insère une notif in-app). Il manque le **canal push** (VAPID + abonnements + handlers SW). Hybride (décision John) : Web Push maintenant, push natif iOS plein écran différé au mobile.
> Décisions John 2026-06-27 : séquencement équilibré, hybride web/mobile. Deux décisions ouvertes (D1, D2).

**Préalable avant de démarrer** (manuel John) : partir de `main` (sprints 37 + 38 mergés de préférence). **Générer les clés VAPID** (`npx web-push generate-vapid-keys`) et les ajouter dans Vercel (Production) : `VAPID_PRIVATE_KEY` + `NEXT_PUBLIC_VAPID_PUBLIC_KEY` (+ un `VAPID_SUBJECT` mailto). L'agent peut générer les clés et te les afficher, mais **toi seul** les mets dans Vercel (cf invariant secrets).

---

## 🚀 Ligne de lancement (à copier-coller par John)

> ultracode — effort xhigh. Exécute `docs/sprint-39/BRIEF.md`. Lance **WS A et WS D en parallèle dès maintenant**, puis WS B (dépend de A) et WS C (dépend de A). Le push est **opt-in strict** (permission déclenchée par un geste utilisateur, jamais à froid), réutilise le **gate de tier existant** du cron (Local/Itinérant) et son **idempotence/jour**. Migrations en fichiers numérotés `063`/`064`, applique, régénère `lib/types.ts`. La route cron doit rester **runtime Node** (web-push a besoin du crypto Node, pas edge). Termine par **VERIF** avec test push réel sur device. **Ne push pas.** Décision ouverte → `⚠️ DEMANDER À JOHN`.

---

## 🧠 Connecteurs & sous-agents (cf `CLAUDE.md` §20)

| Quand | Sous-agent → connecteur | Pourquoi |
|---|---|---|
| `web-push` (VAPID), Web Push API / `pushManager.subscribe`, handlers SW | **docs-researcher** → Context7 | API version-correcte (VAPID, `applicationServerKey`, `urlBase64ToUint8Array`, payload chiffré). |
| Migrations `063`/`064`, RLS own, vue `catches_for_viewer`, RPC badges | **supabase-guard** → Supabase (RO d'abord) | Pattern RLS own + envoi service-role, regen types, `get_advisors`. |
| Test push réel (permission, réception, clic) + form mesure | **qa-chrome** → Claude in Chrome + Playwright | Vérifier l'abonnement, la réception de notif, le deep-link, le fallback navigateurs non supportés. |
| Après déploiement | **deploy-watch** → Vercel + Sentry | Le cron tourne sans erreur, l'envoi push ne casse pas l'insert in-app. |
| Clôture | **`/verif-sprint`** | Tests + build + lint + types + revue indépendante. |

## Objectif en une phrase
Quand le créneau du jour correspond aux **tendances perso** d'un abonné Local/Itinérant, lui envoyer une **notification push** (« Belle fenêtre à 11h30 à Cap Sizun, descendante : c'est TA config gagnante »), opt-in et RGPD, en branchant le canal Web Push sur le contenu déjà produit par le cron ; et permettre de **mesurer une prise** (longueur + objet de référence) pour débloquer un badge privé.

## ⚠️ Garde-fous transverses
1. **Opt-in strict, jamais à froid** : `Notification.requestPermission()` doit être déclenché par un **geste utilisateur** (bouton « Activer les alertes »), au bon moment (après la 1ʳᵉ prise, pas au 1ᵉʳ chargement). Consentement RGPD, révocable.
2. **Runtime Node pour l'envoi** : `web-push` utilise le crypto Node → la route cron et l'util d'envoi restent **server/Node** (ne pas les passer en edge).
3. **Best-effort** : l'envoi push **ne doit jamais faire échouer** l'insert in-app (try/catch isolé, comme `createNotification` qui ne throw jamais, `lib/notifications/create.ts:58-60`). Un abonnement mort (404/410) est purgé, pas une erreur.
4. **Honnêteté** : en v1 la prise est **mesurée** (auto-déclarée avec référence), pas « vérifiée » par un tiers/IA (cf D1). Ne pas sur-promettre.

## Workstreams & dépendances

| WS | Bloc | Durée | Dépend de | Parallèle J1 |
|----|------|-------|-----------|--------------|
| A | Infra push : dép `web-push` + VAPID env + `063_push_subscriptions` + util d'envoi | 1,5 j | — | ✅ |
| B | Abonnement client + handlers SW + opt-in UX | 1,5 j | A | ⚠️ après A |
| C | Brancher le cron + page réglages notif | 1 j | A | ⚠️ après A |
| D | F7 — Fondation prise mesurée + badge (`064_catch_verification`) | 1,5 j | — | ✅ |
| VERIF | revue + test push réel + anti-régression | 0,5 j | tous | ❌ |

**Parallèle jour 1 : A + D.** Puis B (sur A), C (sur A).

---

## WS A — Infra push (`063_push_subscriptions` + util d'envoi)

> **Connecteurs** : docs-researcher (web-push / VAPID) ; supabase-guard (RLS own + lecture service-role pour l'envoi).

### Tâches
1. **Dépendance** : `pnpm add web-push` (absent du repo, vérifié). Générer les clés VAPID (`npx web-push generate-vapid-keys`) ; **afficher à John** pour qu'il les mette dans Vercel (ne PAS commiter).
2. **Env** : `lib/env.ts` — ajouter au schéma (`:20-54`) sur le modèle `CRON_SECRET` (`:25`, requis en prod, optionnel en dev) : `VAPID_PRIVATE_KEY: isProd ? z.string().min(1) : z.string().optional()`, `NEXT_PUBLIC_VAPID_PUBLIC_KEY: isProd ? z.string().min(1) : z.string().optional()`, `VAPID_SUBJECT: isProd ? z.string().min(1) : z.string().optional()`. **Les recopier dans le `safeParse({...})` `:88-114`** (chaque clé listée 2×).
3. **Migration** `supabase/migrations/063_push_subscriptions.sql` (style owner-only `051_outings.sql:1-48`) : table `push_subscriptions` (`id uuid pk default gen_random_uuid()`, `user_id uuid not null references auth.users(id) on delete cascade`, `endpoint text not null unique`, `p256dh text not null`, `auth text not null`, `ua text`, `created_at timestamptz default now()`). RLS : `select`/`insert`/`delete` **own** (`(select auth.uid()) = user_id`). L'**envoi** se fait en **service-role** (bypass RLS, comme le cron), donc pas de policy spéciale. Index `push_subscriptions_user_idx`.
4. **Util d'envoi** `lib/push/send.ts` (server/Node) : `sendPushToUser(admin, userId, payload: { title, body, url })` → lit les `push_subscriptions` du user (client service-role), `webpush.setVapidDetails(VAPID_SUBJECT, public, private)`, `webpush.sendNotification(sub, JSON.stringify(payload))` pour chaque ; **purge** les abonnements morts (statusCode 404/410 → delete). try/catch global (best-effort, ne throw pas).
5. Régénérer `lib/types.ts`.

### Critères d'acceptation
- `push_subscriptions` : un user ne lit/écrit que ses lignes (vérif supabase-guard) ; `endpoint` unique (pas de doublon device).
- `sendPushToUser` envoie à tous les devices d'un user et **supprime** un abonnement expiré (404/410) sans throw.
- Build OK avec `web-push` (vérifier qu'il n'est pas bundlé côté client : import server-only).

### Garde-fous
- `web-push` = **server/Node only** (jamais importé dans un composant client).
- Clés VAPID **jamais commitées** (générées localement, posées dans Vercel par John).

---

## WS B — Abonnement client + handlers SW + opt-in UX

> **Connecteurs** : docs-researcher (pushManager, feature-detect iOS) ; qa-chrome (permission + réception).

### Tâches
1. **Handlers SW** dans `public/sw.js` (aujourd'hui cache only, 109 lignes, pas de handler push) : ajouter `self.addEventListener('push', ...)` → `self.registration.showNotification(title, { body, icon:'/icon-192...', data:{ url } })` ; et `self.addEventListener('notificationclick', ...)` → `clients.openWindow(url)` (focus si déjà ouvert). Bumper `CACHE_VERSION` (`:10`) pour forcer l'update du SW.
2. **Abonnement** : à partir de l'enregistrement existant `components/pwa/PwaProvider.tsx:38` (`navigator.serviceWorker.register('/sw.js')`, prod-only `:29`) : ajouter, **sur action utilisateur**, `registration.pushManager.subscribe({ userVisibleOnly:true, applicationServerKey: urlBase64ToUint8Array(NEXT_PUBLIC_VAPID_PUBLIC_KEY) })` → POST l'abonnement à `app/api/push/subscribe/route.ts` (Node, authentifié, insert own dans `push_subscriptions`). Endpoint `unsubscribe` symétrique.
3. **Opt-in UX** : composant « Activer les alertes » (bouton, **geste requis**). Le proposer **après la 1ʳᵉ prise** (pas à froid). Feature-detect (`'PushManager' in window`, `'Notification' in window`) ; sur iOS Safari hors PWA, afficher l'astuce « installe l'app sur ton écran d'accueil pour activer les alertes » au lieu d'un bouton mort.
4. Gérer les 3 états de permission (`default`/`granted`/`denied`) proprement (si `denied`, expliquer comment réactiver, ne pas reproposer en boucle).

### Critères d'acceptation
- Cliquer « Activer les alertes » crée un abonnement stocké (`select count(*) from push_subscriptions where user_id=...`), et une notif de test arrive (qa-chrome).
- Un clic sur la notif ouvre la bonne URL (deep-link `/carte` ou la cible).
- Sur un navigateur non supporté, l'UI dégrade proprement (astuce PWA iOS), aucune erreur console.

### Garde-fous
- Permission **uniquement** sur geste utilisateur, jamais au mount.
- `userVisibleOnly:true` (obligatoire Chrome) ; ne jamais envoyer de push silencieux.

---

## WS C — Brancher le cron + page réglages notif

> **Connecteurs** : supabase-guard (lecture cron) ; deploy-watch (le cron tourne après déploiement).

### Tâches
1. **Greffe dans le cron** `app/api/crons/personal-window/route.ts` : aujourd'hui il insère la notif in-app à **`:118-123`** (`admin.from('notifications').insert({ type:'optimal_window', ... })`), gate de tier `:62-67` (Local/Itinérant), idempotence/jour `:69-82`. **Juste après** ce INSERT réussi (avant `notified++` `:129`) : appeler `sendPushToUser(admin, userId, { title:'Carnet de Pêche', body: match.previewText, url:'/carte' })`. **Best-effort** (try/catch isolé). Conserver le gate + l'idempotence existants (le push suit la notif in-app, donc 1×/jour). Vérifier que la route est en **runtime Node** (elle utilise déjà `createAdminClient` ; si un `export const runtime` traîne en edge, le retirer).
2. **Page réglages notif** (net-neuf : `app/(app)/notifications/page.tsx` est read-only) : ajouter une section « Réglages » avec le **toggle d'opt-in push** (modelé sur `EmailPrefsToggle` / `setMarketingOptin`, `app/(app)/compte/abonnement/actions.ts:10`) et, si pertinent, des préférences par type. Le toggle OFF = désabonner (`pushManager.getSubscription().unsubscribe()` + delete côté serveur).
3. Le type `optimal_window` **existe déjà** (union `lib/notifications/create.ts:32`, CHECK SQL `060_spot_verification.sql:236`) → **rien à ajouter** côté types pour ce sprint.

### Critères d'acceptation
- En simulant le cron (appel authentifié `Bearer CRON_SECRET`) pour un user abonné Local **opté-in**, une notif push arrive en plus de la notif in-app ; un user **gratuit** n'en reçoit pas (gate tier respecté).
- Relancer le cron le même jour n'envoie **pas** de second push (idempotence/jour intacte).
- Le toggle réglages active/désactive réellement les push (abonnement créé/supprimé).

### Garde-fous
- Ne pas modifier le gate de tier ni l'idempotence du cron (juste greffer l'envoi).
- Si `sendPushToUser` échoue, l'insert in-app et le reste de la boucle continuent (best-effort).

---

## WS D — F7 · Fondation « prise mesurée » + badge (parallèle J1)

Poser la donnée que le mobile remplira automatiquement (caméra + IA espèce/mesure), via un flux **manuel honnête** en web.

> **Connecteurs** : supabase-guard (colonnes + vue + RPC badges) ; docs-researcher si besoin.

### Tâches
1. **Migration** `supabase/migrations/064_catch_verification.sql` : `alter table public.catches add column measured_length_cm smallint check (measured_length_cm > 0 and measured_length_cm < 300), add column reference_object text, add column photo_verified_at timestamptz;` (colonnes absentes, vérifié). **Append** ces colonnes à `catches_for_viewer` (reprendre la déf. complète courante `059_catch_gear.sql:76+`, **garder son `security definer` assumé** `059:74-75`).
2. **Form** `components/catches/CatchForm.tsx` : après le bloc taille (~`:617`, après `<FieldError error={errors.size_cm?.message} />`), ajouter une **aide à la mesure** : champ « longueur mesurée » + « objet de référence » (ex. un leurre de taille connue dans la photo) + une case « prise mesurée ». Étendre le schéma zod `lib/catches/schema` et l'action `createCatch`/`updateCatch` (`lib/catches/actions`) pour persister `measured_length_cm`/`reference_object`/`photo_verified_at`.
3. **Badge** : ajouter le slug `prise_mesuree` dans `BadgeSlug` (`lib/gamification/badges.ts:13-19`) + une entrée `BADGES` (`:32-69`, `{ slug:'prise_mesuree', label:'Prise mesurée', description:'Tu as mesuré une prise avec une référence', icon:... }`). Étendre `recompute_my_badges()` (re-déclarer en migration `064` à partir de `056_gamification.sql:42-87`) : ajouter un agrégat (`count(*) filter (where photo_verified_at is not null)` dans le `SELECT ... INTO` `:60-67`) + la ligne `('prise_mesuree', (v_measured >= 1))` dans le `VALUES` `:73-80`. Le RPC lit **directement `catches`** (own-only, definer), pas la vue.

### Critères d'acceptation
- Loguer une prise avec une longueur mesurée + objet de référence → `photo_verified_at` posé, badge `prise_mesuree` débloqué (privé).
- Le schéma est prêt pour que le **mobile** y branche caméra + IA sans nouvelle migration.
- Badges restent **privés** (RLS own, zéro leaderboard).

### Garde-fous
- Honnêteté (cf D1) : libellé « mesurée », pas « vérifiée », tant que la vérif IA n'existe pas.
- Ne pas casser `catches_for_viewer` (append-only + rester `security definer`).

---

## Workstream VERIF (obligatoire, agent indépendant)
1. `/verif-sprint` : `pnpm test` + `pnpm build` + `pnpm typecheck` + `pnpm lint` + revue croisée.
2. **Test push réel (qa-chrome)** : activer les alertes, déclencher le cron en test (`Bearer CRON_SECRET`), recevoir la notif push, cliquer → deep-link OK. Tester un navigateur non supporté (dégradation propre).
3. **Passe sécurité (non négociable)** : `push_subscriptions` RLS own (un user ne voit pas les endpoints d'autrui) ; `web-push` jamais bundlé client ; clés VAPID hors repo ; `catches_for_viewer` toujours `security definer` + floutage intact ; advisors sans nouvelle alerte ; badges privés (pas de leaderboard).
4. **Passe anti-régression** : le cron garde son gate tier + idempotence (un gratuit ne reçoit rien ; pas de double push/jour) ; l'envoi push best-effort ne casse jamais l'insert in-app ; form de prise legacy intact.
5. **Passe copy** : tutoiement, zod en français, **aucun tiret cadratin en prose** (`node scripts/lint-copy-dashes.mjs`), libellé « mesurée » (pas « vérifiée »), pas de promesse mensongère (couverture push honnête).
6. **deploy-watch** (Vercel + Sentry) : le cron `personal-window` tourne sans erreur après déploiement.
7. Livrer `docs/sprint-39/RECAP.md` : fait / comment tester / reste manuel John (clés VAPID Vercel) / statut D1-D2.

---

## Décisions pour John
- **D1 (honnêteté du badge F7)** — en v1 la prise est **auto-déclarée mesurée** (longueur + objet de référence saisis par l'user), pas vérifiée par un tiers. **Reco** : slug + libellé **« Prise mesurée »** (badge `prise_mesuree`), et réserver la sémantique **« vérifiée »** à la phase mobile (mesure auto par photo + IA espèce). Plus honnête, cohérent avec la valeur « honnêteté » du projet. OK ?
- **D2 (périmètre push v1)** — en v1, le push se limite à **`optimal_window`** (Local/Itinérant, en réutilisant le gate + l'idempotence du cron existant). Les autres canaux (grandes marées, social) viendront ensuite. **Reco** : oui, v1 = `optimal_window` seul ; on élargit une fois le canal éprouvé. OK ?
- **Rappel hybride** : le **push natif iOS plein écran** (hors PWA) reste pour la phase mobile (Expo Notifications). Web Push v1 couvre Android, desktop, et **PWA installée iOS 16.4+** : à dire honnêtement dans l'UI.

## Reste manuel John (post-sprint)
- **Générer/poser les clés VAPID** dans Vercel (Production) : `VAPID_PRIVATE_KEY`, `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_SUBJECT` (mailto). Sans elles, le push est inactif en prod (et c'est voulu : optionnel en dev).
- Relire le diff, merger `sprint-39` → `main`, déploiement, **tester le push sur ton téléphone** (PWA installée), vérifier le cron du matin.

---

> **Invariants (rappel)** : pas de push sans validation de John · RLS jamais désactivé (nouvelle table → RLS d'abord) · migrations = nouveaux fichiers (`063`, `064`) + regen `lib/types.ts` · **opt-in strict + permission sur geste utilisateur** · `web-push` server/Node only, clés VAPID jamais commitées · envoi push **best-effort** (ne casse jamais l'insert in-app) · ne pas modifier le gate tier / l'idempotence du cron · badges privés (zéro leaderboard) · scoring descriptif · copy sans tiret cadratin · libellé « mesurée » pas « vérifiée ».
