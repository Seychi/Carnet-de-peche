# Sprint 12 — RECAP (Réseau social joignable)

> Exécuté le 2026-06-21 sur la branche `sprint-12-ux-social`. **Pas encore mergé ni déployé.**
> Mode : exécution directe (le message de lancement ne contenait pas `ultracode`). Tous les blocs A→F faits.

## État vérifié

- ✅ `pnpm typecheck` (tsc --noEmit) : **vert**
- ✅ `pnpm test` (vitest) : **327 tests verts / 27 fichiers**
- ✅ `pnpm build` (next build) : **vert** (voir §Vérif)
- ⚠️ Migration 034 **écrite mais PAS appliquée en prod** (connecteur Supabase absent de la session) → `lib/types.ts` patché à la main en attendant. **Reste manuel John.**

## Ce qui a été fait, par bloc

### Bloc A — `lng`/`lat` sur `catches_for_viewer` ✅
- `supabase/migrations/034_catches_viewer_lnglat.sql` : recrée la vue **à l'identique** de la 015 (corps enveloppé dans une sous-requête `v`, car on ne peut pas référencer l'alias `geom_visible` dans la même liste SELECT), + 2 colonnes `lng = ST_X(geom_visible::geometry)`, `lat = ST_Y(geom_visible::geometry)`. `security_invoker = true` ré-affirmé (perdu par le DROP/CREATE).
- **Sécurité** : `lng/lat` dérivent de `geom_visible` (= `COALESCE(catch_visible_geom(c.*), geom_public)`), qui floute déjà selon le droit du viewer. `geom` brut n'est jamais exposé. Vérifié : `catch_visible_geom` (migration 004) renvoie NULL pour un non-ami/non-proprio → `geom_visible = geom_public` (flouté) → `lng/lat` floutés.
- `lib/types.ts` : `catches_for_viewer.Row` gagne `lat: number | null` et `lng: number | null` (ordre alpha, comme le ferait la régénération).

### Bloc B — Mini-carte sur la fiche prise ✅
- `components/catches/CatchMiniMap.tsx` (nouveau) : wrapper client, **lazy** `MapView` via `next/dynamic({ ssr:false })` + skeleton dégradé navy (pattern `TideChartLazy`). Construit un `SpotMarker` neutre depuis `lng/lat` + `species`.
- `app/(app)/carnet/[id]/page.tsx` : monte `<CatchMiniMap>` quand `c.lng != null && c.lat != null`, dans un conteneur `aspect-[16/7] rounded-[14px] overflow-hidden`. `isPrecise = isOwner || reveal_precise_to_public` (le proprio voit le point précis sans disque de flou). Pas de carte si pas de position.

### Bloc C — Bouton Suivre dans le fil ✅
- `lib/feed/types.ts` : `FeedPost` gagne `author_is_following?: boolean` (optionnel, injecté hors-vue).
- `app/actions/feed.ts` → `getFeedPage` : **une** requête `follows` par page (`.in('following_id', auteurs distincts ≠ moi)`) → `author_is_following` par post. **Pas de N+1.**
- `components/feed/PostCard.tsx` : `<FollowButton size="sm">` dans l'en-tête si `showFollow && currentUserId && !isMine && author_id && author_username`. Bascule **optimiste** (état interne du FollowButton). Nouveau prop `showFollow` (défaut `true`).

### Bloc D — `/follows` réparé (BUG-04) ✅
- Le fix **action-level** (ne plus avaler l'erreur du select profiles) était déjà en place + testé (`follow.test.ts`).
- `app/(app)/follows/page.tsx` : **fix page-level** — distingue désormais erreur (message rouge `role="alert"`) de vide réel (« Tu ne suis personne »). Le titre n'affiche plus le compteur trompeur `(0)` en cas d'erreur. Désabonnement optimiste déjà géré par `FollowingList`.

### Bloc E — Profil riche `/u/[username]` ✅
- `app/(app)/u/[username]/page.tsx` : compte `followersCount` / `followingCount` via `follows` (RLS select-all authentifié ; pas `profile_stats` qui a perdu son SELECT en 031). Charge aussi les ids suivis par le viewer.
- `components/feed/ProfileFollowStats.tsx` (nouveau) : « N abonnés · M abonnements » cliquables → modale `Dialog` qui **charge la liste à la demande** (`listFollowers`/`listFollowing`), chaque entrée = `UserCard` + `FollowButton` (état du viewer, optimiste). Gère loading / erreur / vide.
- État « tu le suis » : le `FollowButton` du hero affiche déjà « Suivi(e) » (inchangé).
- ⏭️ **Différé** (tâche E4 « (si pas déjà fait) ») : onglets profil Posts / Prises publiques — hors critères d'acceptation E, non bloquant.

### Bloc F — Onglet « Abonnements » du fil ✅
- L'onglet `follows` (« Tes follows ») + `getFeedPage({ tab:'follows' })` existaient déjà.
- `app/(app)/fil/[department]/page.tsx` : distingue maintenant **« tu ne suis personne »** (`follows-none`, CTA « Trouver des pêcheurs ») de **« tes follows n'ont rien posté »** (`follows-empty`, calme plat) via le nombre d'abonnements. Avant, l'onglet affichait toujours `follows-empty` (sans CTA).
- Realtime : reste sur l'onglet département uniquement (v1, documenté dans `FeedClient`).

## Comment tester (QA John, multi-comptes)

1. **A/B** : ouvre une prise géolocalisée dans `/carnet/[id]` → mini-carte MapLibre non interactive centrée sur le point. Prise sans position → pas de carte.
2. **C** : sur `/fil/[dept]` (connecté), chaque post d'autrui montre « Suivre » / « Suivi(e) », clic = bascule sans reload. Pas de bouton sur tes posts.
3. **D** : compte A suit B → `/follows` (A) liste B, « Tu suis (1) ». Désabonne → disparaît sans reload.
4. **E** : `/u/<B>` affiche « N abonnés · M abonnements ». Clic → modale liste cliquable.
5. **F** : onglet « Tes follows » → posts des suivis ; si tu ne suis personne → CTA « Trouver des pêcheurs ».

## Reste manuel John (post-sprint)

1. **Appliquer la migration 034 en prod** (`supabase migration repair`/`apply` ou SQL Editor), puis **régénérer `lib/types.ts`** depuis la prod (le patch manuel devrait donner un diff nul). Sans ça, `lng/lat` sont absents en prod → la mini-carte (B) ne s'affiche pas (dégradé propre, aucune erreur).
2. QA manuelle multi-comptes (ci-dessus).
3. Merge `sprint-12-ux-social` → `main` + déploiement.
4. **Renommer `docs/sprint-12-13/` (mobile) → `docs/sprint-16-17/`** + MAJ `CLAUDE.md` §9 et `docs/ROADMAP.md` (le track Excellence occupe 12-15, le mobile décale). NB : `docs/sprint-12-13/BRIEF.md` apparaît déjà supprimé dans le working tree (réorg en cours côté John).

## Notes / décisions

- Pas de `ultracode` dans le message de lancement → exécution séquentielle directe, pas de workflow multi-agents.
- Connecteur Supabase absent → migration non appliquée par l'agent (fallback documenté = manuel John, prévu par le brief §Reste).
- Lint : `aria-pressed={liked}` (bouton like de `PostCard`) remonte un faux positif jsx-a11y dans l'IDE — **pré-existant**, non introduit par ce sprint.
