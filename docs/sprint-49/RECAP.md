# Sprint 49 — RECAP
## « Push & engagement » (nouveaux types + digest + réglages + app badge)

> Exécuté le 2026-06-28 (ultracode, 2 agents). **Pas poussé** (pause John). Migrations **085/086 appliquées en prod** + `lib/types.ts` régénéré. Faire du Web Push (sprint 39, honnête au 44) un canal de rétention riche.

---

## Décisions John
- **D1** = big-tide pour **tous les tiers** (gratuit inclus, hook d'engagement).
- **D2** = seuils marnage : **Manche > 9 m, Atlantique > 5 m, Méditerranée jamais**.
- **D3** = followed-catch à **chaque prise publique** mais **rate-limité à 4 push/jour/follower** (au-delà, in-app only).
- **D4** = prefs en **jsonb `profiles.notification_prefs`**.

## Migrations
- **085** : `notifications_type_check` = **20 types** (les 16 existants répétés anti-régression + `big_tide`, `followed_catch`, `species_closure`, `weekly_digest`).
- **086** : `profiles.notification_prefs` jsonb default `{}`.

## Fait — émetteurs (WS A + WS B), zéro 5e cron
- **Union NotificationType** (`create.ts`) : +4 types **+ `recfishing_reminder`** (discordance corrigée : en DB/UI mais absent du union TS).
- **Big-tide** (greffon `personal-window`) : `big-tide.ts`, marnage **RÉEL** = `max(extrema.high) − min(extrema.low)` (réutilise `fetchSpotForecastWeek` caché 1h, **0 appel réseau en plus**, import dynamique server-only). Seuils D2 par façade. **Tous tiers** (avant le gate de tier optimal_window). Idempotence/jour. **Aucun coef inventé.**
- **Followed-catch** (event-driven, `notify-followers.ts` appelé dans `createCatch`/`updateCatch`) : in-app **toujours**, push si pref active ET sous **rate-limit 4/jour/follower**. Sur `updateCatch` : seulement la **transition** non-public→public (anti-spam). **Best-effort total** (try/catch, ne bloque jamais la prise — 23 tests catches verts).
- **Species-closure** (greffon) : `favorite_species ∩ closedWindows` avec **normalisation slug** (`lieu_jaune` underscore → `lieu-jaune` tiret), notif J-7 avant le mois de début de fermeture (bar [2,3], lieu-jaune [1-4]). Idempotence.
- **Digest hebdo** (greffon, lundi matin) : « Ta semaine : N prises, ta plus belle, tes fenêtres à venir », idempotence/semaine, `null` si rien à dire (pas de digest vide).

## Fait — réglages + badge (WS C + WS D)
- **`prefs-meta.ts`** (neutre, **pas 'use server'**) : `NOTIFICATION_PREF_KEYS` + libellés FR + `isNotificationPrefEnabled` (règle partagée émetteurs ↔ UI). Évite le gotcha 'use server' du sprint 48.
- **`notification-prefs.ts`** ('use server', **que des async**) : `getNotificationPrefs` / `setNotificationPref` (scopé `auth.uid()`).
- **UI** (`notifications/page.tsx` + `NotificationTypeToggles`) : 1 toggle par type (5), micro-copy « le maître interrupteur reste l'abonnement push global », toggles **daltonien-safe** (texte + icône + position, pas la couleur seule).
- **App badge** (`useNotificationRealtime.ts`) : `navigator.setAppBadge(unread)` feature-detecté (Android/desktop ; iOS = phase mobile, no-op propre), remis à 0 à la lecture.

## VERIF (gate verte)
- `pnpm typecheck` **0** · `pnpm lint` **0** · `pnpm test` **574 verts** · `pnpm build` **OK** (`/notifications`).
- **Sécurité/honnêteté** : marnage **réel** (`tide_coefficient` jamais touché, reste null) ; **4 crons** (aucun 5e : greffons + event-driven) ; push **best-effort** (ne casse jamais l'action/cron) ; **idempotence** jour/semaine ; chaque type gate sa **pref** + le **maître interrupteur** push ; `setNotificationPref` scopé `auth.uid()` ; `'use server'` propre (const dans `prefs-meta.ts`).
- **Copy** : sans tiret cadratin.

## ⚠️ Suivis (non bloquants)
1. Les 3 greffons cron vivent dans `personal-window` (~07:00 UTC) → le **digest part le matin**. Si tu le préfères le soir, bouger `runWeeklyDigest` dans `recfishing-reminders`.
2. followed-catch = O(followers) requêtes par prise publique (OK beta ; batch possible à l'échelle).

## Reste manuel John
- Relire, merger `sprint-49` → `main`, déployer, **tester les push sur ton téléphone** (PWA installée), vérifier les crons.

---

> **Invariants tenus** : pas de push · migrations + regen types · CHECK types = **liste complète** (anti-régression) · **marnage réel, jamais de coef** · **aucun 5e cron** · push best-effort · chaque type respecte sa pref + l'opt-in global · copy sans tiret cadratin.
