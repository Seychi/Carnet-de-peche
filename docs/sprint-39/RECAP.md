# Sprint 39 — RECAP
## « Le carnet qui te prévient » (F4 notif Web Push + F7 fondation prise mesurée)

> Exécuté le 2026-06-27 (ultracode). **Pas poussé** (John relit + merge + pose les clés VAPID). Migrations **065/066 appliquées en prod** + `lib/types.ts` régénéré.
>
> ⚠️ **Numérotation** : le brief disait migrations `063`/`064`, mais elles ont été consommées au sprint 38 (outing_id sur la vue, residual marées). Ce sprint utilise donc **065_push_subscriptions** et **066_catch_verification**.

---

## Décisions John
- **D1 = badge « Prise mesurée »** (slug `prise_mesuree`), sémantique « vérifiée » réservée au mobile (IA). Honnêteté.
- **D2 = push v1 = `optimal_window` seul** (réutilise le gate de tier + l'idempotence/jour du cron). Autres canaux plus tard.

---

## Fait (code complet, VERIF verte)

### Migrations
- **065_push_subscriptions.sql** — table `push_subscriptions` (`endpoint` unique, p256dh, auth, ua), RLS owner-only (select/insert/update/delete own). L'envoi se fait en service-role.
- **066_catch_verification.sql** — colonnes `catches.measured_length_cm` (CHECK 0<x<300), `reference_object`, `photo_verified_at` ; exposées sur `catches_for_viewer` (append-only, DEFINER préservé) ; RPC `recompute_my_badges()` étendu avec le badge `prise_mesuree` (count(photo_verified_at not null) >= 1).

### F4 — Web Push « fenêtre optimale »
- **WS A** : `web-push` installé, `lib/env.ts` (3 vars VAPID, **optionnelles**), `lib/push/send.ts` → `sendPushToUser(admin, userId, {title,body,url})` (Node, web-push en import dynamique = hors bundle client, purge 404/410, **best-effort jamais throw**, no-op si clés absentes).
- **WS B** : handlers `public/sw.js` (`push` + `notificationclick`, CACHE_VERSION bumpé), routes `app/api/push/subscribe`+`unsubscribe` (Node, RLS own, upsert/delete), hook `components/push/use-push-subscription.ts` (feature-detect + iOS-hors-PWA + permission), composant opt-in `EnablePushAlerts` monté sur `/carnet` **après la 1ʳᵉ prise** (geste requis, jamais à froid).
- **WS C** : greffe dans le cron `personal-window` — `sendPushToUser` appelé **juste après l'insert in-app réussi**, en try/catch best-effort, **gate de tier + idempotence/jour INCHANGÉS** (un gratuit ne reçoit rien, 1 push/jour max), runtime **Node** confirmé. Page `/notifications` : section « Réglages » + toggle push (`PushSettingsToggle` réutilise le hook de WS B).

### F7 — Fondation « prise mesurée »
- **WS D** : `CatchForm` (toggle « Prise mesurée » + longueur mesurée + objet de référence, après le bloc taille), schéma zod (`measured_length_cm`/`reference_object`/`is_measured`), action (`createCatch`/`updateCatch` persistent + dérivent `photo_verified_at` SSI mesurée + longueur + référence), badge `prise_mesuree` au registre (`lib/gamification/badges.ts` + icône `ruler` dans `BadgesGrid`). Libellé « mesurée », jamais « vérifiée ». Schéma prêt pour le mobile (caméra + IA) sans nouvelle migration.

---

## VERIF (gate verte)
- `pnpm typecheck` **0** · `pnpm lint` **0** · `pnpm test` **574 verts** (badges 6→7 + env VAPID mis à jour) · `pnpm build` **OK** (routes `/api/push/*`, cron, `/notifications`, `/carnet`).
- `scripts/lint-copy-dashes.mjs` : 0 nouveau dans les fichiers du sprint.
- **Sécurité** : `push_subscriptions` RLS owner-only ; `web-push` importé UNIQUEMENT par le cron serveur (jamais bundlé client, vérifié par grep) ; clés VAPID hors repo ; `catches_for_viewer` toujours `security_invoker=false` (DEFINER) ; advisors = **2 `security_definer_view`** (aucune nouvelle alerte) ; badges privés (RPC own, zéro leaderboard).
- **Anti-régression** : cron gate tier + idempotence intacts (greffe push best-effort seulement) ; envoi push ne casse jamais l'insert in-app ; form de prise legacy intact (mesure optionnelle derrière le toggle).

### ⚠️ Écart assumé vs brief (à connaître)
- **VAPID optionnelles même en prod** (le brief les voulait `min(1)` en prod). Raison : les rendre requises ferait **throw `env.ts` au chargement → toute l'app casserait** tant que les clés ne sont pas dans Vercel. Avec l'option « optionnelle », déployer **avant** d'avoir posé les clés = **app OK, push juste inactif** (sendPushToUser + abonnement client no-op proprement). C'est l'invariant « sans les clés, push inactif » du brief, en plus sûr. Si tu préfères le fail-fast, dis-le (mais alors : poser les clés AVANT de déployer).

### Test push réel sur device — NON fait (et pourquoi)
Le test push de bout en bout (abonnement → cron → réception sur téléphone) nécessite : (1) les clés VAPID dans Vercel, (2) un déploiement, (3) la PWA installée sur un device. Or je ne pousse pas (consigne) et les clés sont à toi. Le SW est aussi enregistré en prod uniquement (PwaProvider prod-only). → **C'est ton test post-déploiement** (cf ci-dessous). Tout le reste est vérifié (build/types/tests/lint + revue).

---

## 🔑 Clés VAPID (à poser par John dans Vercel — Production)
Les clés ont été générées par le lead et **affichées dans le chat** (jamais commitées). À ajouter dans Vercel Project Settings → Environment Variables (Production) :
- `NEXT_PUBLIC_VAPID_PUBLIC_KEY` = (clé publique, cf chat)
- `VAPID_PRIVATE_KEY` = (clé privée, cf chat — **secret**, serveur uniquement)
- `VAPID_SUBJECT` = `mailto:ton-email@domaine` (ton email de contact)

Pour tester en local : les mettre dans `.env.local` (gitignored), jamais commiter.

---

## Comment tester (post-merge + clés posées)
1. Loguer une prise, cocher « Prise mesurée » + longueur + objet de référence → la prise suivante débloque le badge `prise_mesuree` (privé).
2. Sur `/carnet` (après ≥1 prise) : « Activer les alertes » → accepter la permission → abonnement créé.
3. `/notifications` → section Réglages → toggle push ON/OFF.
4. Déclencher le cron (`Bearer CRON_SECRET`) pour un compte Local opté-in → notif push reçue en plus de l'in-app ; un compte gratuit → rien (gate). Relancer le même jour → pas de 2ᵉ push (idempotence).
5. Cliquer la notif → ouvre `/carte`.
6. Navigateur non supporté / iOS hors PWA → UI dégrade proprement (astuce « installe l'app »).

---

## Reste manuel John (post-sprint)
- **Poser les 3 clés VAPID dans Vercel** (Production) + `VAPID_SUBJECT` mailto. Sans elles, le push reste inactif (volontaire).
- Relire le diff, merger, déployer, **tester le push sur ton téléphone** (PWA installée iOS 16.4+ / Android / desktop), vérifier le cron du matin.
- Brancher César : c'est la killer feature « le carnet qui te prévient selon TON historique » (vs solunaire générique des concurrents).

---

## Rappel hybride (honnêteté UI)
Web Push v1 couvre **Android, desktop, et PWA installée iOS 16.4+**. Le **push natif iOS plein écran hors PWA** reste pour la phase mobile (Expo Notifications). L'UI le dit honnêtement (astuce « installe l'app » sur iOS hors PWA).

---

> **Invariants tenus** : opt-in strict (permission sur geste, jamais à froid) · `web-push` server/Node only (jamais bundlé client) · clés VAPID hors repo · envoi push best-effort (ne casse jamais l'insert in-app) · gate tier + idempotence du cron INCHANGÉS · badges privés (zéro leaderboard) · `catches_for_viewer` DEFINER + floutage intact · libellé « mesurée » pas « vérifiée » · copy sans tiret cadratin · **pas de push**.
