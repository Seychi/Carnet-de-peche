# Sprint 17 — RECAP : Cohérence produit & social (« brancher ce qui est déconnecté »)

> Date : 2026-06-22 · Branche : `sprint-17` (base `18c1774`) · **NON poussé** (merge + déploiement = feu vert John, §13).
> Mode : ultracode (workflows multi-agents) + connecteurs. Sprint à dominante DB (migrations 037/038) + branchement social.

## État : code-complet, gate vert — QA multi-comptes + device = John

- **Gate vert** : `pnpm typecheck` OK · `pnpm lint` clean · **Vitest 350/350** · `pnpm build` OK (`/notifications` + `/moderation` en ƒ dynamic).
- **Migrations 037/038 APPLIQUÉES en prod** (via connecteur, SQL validé par John) + vérifiées en base + advisors RAS + `lib/types.ts` régénéré. ⚠️ Le **code qui les utilise n'est pas encore déployé** (sur la branche) — ordre migration-avant-code respecté, prod intacte en attendant.
- Décision sociale : **modèle Abonnés** (unilatéral public). Aucune migration du graphe de follow.
- **Revue finale whole-branch indépendante (opus) = GO** : 8 invariants confirmés en code ET en base prod (insert notif via client admin uniquement, lecture RLS destinataire-seul, gate modération serveur, carnet profil sans colonne geom, E/F copy-only, recherche sanitisée anti-injection, migrations 037/038 actives RLS enabled).

## Migrations (prod)
- **037** : table `notifications` (RLS stricte — destinataire seul ; **INSERT bloqué pour authenticated** → notifs créées via client admin privilégié uniquement) + 2 index + **Realtime** (publication + replica identity) + **index trigram `profiles.username`** (recherche).
- **038** : fix policy `reports_select_own_or_mod` (`is_ambassador` bug → `is_moderator()`).

## Livré (6 commits, `18c1774..HEAD`)
| Bloc | Contenu |
|---|---|
| `708f8cc` migrations | 037 + 038 appliquées + types régénérés |
| `cab39ad` **A** | Section « Prises » sur le profil public `/u/[username]` — on voit enfin le carnet des autres (via `catches_for_viewer` : privacy + floutage gérés ; zéro colonne geom). |
| `d2912e5` **E** | Cohérence onboarding↔profil (modèle Abonnés) : « Amis »→« Abonnés » (copy), `FREQUENCY_LABELS` + `USERNAME_REGEX` centralisés dans `lib/labels.ts`, `years_practicing` éditable, validation serveur (regex username step 1, ≥1 technique). |
| `53025f9` **F** | Tarifs honnêtes : retrait des promesses inexistantes (hors-ligne, itinéraires multi-spots, push, stats avancées non-gatées), bathy « SHOM premium »→« détaillée (EMODnet) ». 100 % copy, gating intact. |
| `d849663` **BCD** | **B** notifs in-app (insert via client admin privilégié, non-bloquant, anti-auto-notif ; badge `NotificationBell` + Realtime ; page `/notifications` + `markAllRead`). **C** page `/moderation` gatée serveur + `dismissReport` (fix policy 038). **D** recherche de pêcheurs (`searchUsers` ILIKE + index trigram) + `SearchModal` + nav rebranchée (`/follows` + Fil au menu/sidebar) + suggestions enrichies (fallback sans département). |

## Notes process (honnêteté §19)
- **Bug bloquant attrapé au gate** : `lib/notifications/create.ts` avait `import 'server-only'` au top-level → cassait le chargement de 3 fichiers de tests (`feed`/`feed-moderation`/`follow`). Retiré (l'isolation serveur reste assurée par l'import dynamique de `admin`, comme `lib/feed/media.ts`).
- **1 test mis à jour** (`follow.test.ts`) : l'ancien test « liste vide si pas de département » encodait l'ancien comportement ; le bloc D introduit volontairement un **fallback** (suggestions générales sans département, D.5) → test aligné sur le comportement voulu, pas « fait passer » à l'aveugle.
- **Revue indépendante par bloc** : A/E/F OK ; BCD avait 4 findings (target_id acteur→null, revalidate `/moderation` après suppression, dead code `getUnreadCount`, sémantique `catch_commented`) → **tous corrigés** + re-typecheck OK.

## Invariants (vérifiés)
- **Notifications** : INSERT via client admin uniquement (policy `WITH CHECK(false)` côté authenticated) ; lecture/maj via client user (RLS destinataire-seul).
- **Modération** : gate `is_moderator` côté serveur.
- **Carnet profil** : lecture via `catches_for_viewer` ; pas de fuite GPS ni de prise privée d'autrui.
- **E/F** : copy uniquement — `privacy='friends'`, RLS `catches_select_friends`, et le gating de tier inchangés.

## Reste avant merge (manuel John)
1. **qa-chrome 2 comptes** : valider en réel — prise privée d'autrui invisible sur le profil public, notif RLS (A ne voit pas les notifs de B), recherche/nav. (Flux authentifié multi-comptes = ton angle.)
2. **Merge `sprint-17` → `main`** + déploiement, puis **`deploy-watch`** (Vercel + Sentry). Le schéma est déjà migré → pas d'incident migration-avant-code.
3. **Décision E.5** restée sur le défaut « ≥1 technique requise au profil » — dis si tu préfères l'optionnel.
4. **Hors sprint 17, dans ton working tree** : `docs/sprint-10/*` + `supabase/seed-spots-lot-4.sql` (ta curation lot-4) — laissés intacts, non commités, à toi de les gérer.
5. Backlog reporté : React Query / LAY-2 (device-gated, sprint 16) ; upload `/carnet/nouvelle` > 1 Mo (NEXTJS-4/5) ; contrainte `conditions_cache(cache_key)` ; favicon 404 ; dead code `spot-filters.tsx`.
