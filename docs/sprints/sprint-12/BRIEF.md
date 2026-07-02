# Sprint 12 — Brief d'exécution
## Réseau social joignable

> Rédigé le 2026-06-21. Durée : 1,5-2 semaines.
> Contexte : `docs/excellence/ROADMAP.md` (track « Excellence UX + Réseau social ») · audit transverse 2026-06-21 (zones fil / profils / follow) · `docs/concurrents/fishing-grid.md` (eux : 209 groupes locaux + chat ; nous : la mécanique de follow existe mais est **injoignable**). Quick wins déjà sur `main` (session 2026-06-21, non commités) : clic profil dans `PostCard` + `CommentThread`, rond du toggle `CatchForm`, contraste `Footer`, placeholder carte retiré dans `carnet/[id]`.
> Décisions John 2026-06-21 : on exécute tout le track, découpé en sprints ; photos du fil = **upload direct** (Sprint 13, PAS ici).

**Préalable avant de démarrer** (manuel John) :
1. Brancher les quick wins de la session 2026-06-21 (5 fichiers : `CatchForm.tsx`, `carnet/[id]/page.tsx`, `PostCard.tsx`, `CommentThread.tsx`, `Footer.tsx`) sur `sprint-12-ux-social`, `pnpm typecheck && pnpm test` verts.
2. Confirmer le **prochain numéro de migration libre**. L'historique `list_migrations` s'arrête à 024, mais le schéma prod va jusqu'à 033 (cf `CLAUDE.md` §2 ; 025-027 à réconcilier via `supabase migration repair`). Première migration de ce sprint = **prochain numéro libre (≥ 034)** — vérifier `supabase/migrations/`.
3. ⚠️ Collision de numérotation : `docs/sprint-12-13/` est l'ancien brief **MOBILE**. Ce track prend 12-15 ; le mobile décale en 16-17 (à renommer, cf §Reste manuel John). Ne pas exécuter le brief mobile par erreur.

---

## 🚀 Ligne de lancement (à copier-coller par John)

> ultracode — effort xhigh. Exécute `docs/sprint-12/BRIEF.md`. Lance les workstreams A, C, D, E, F en parallèle dès maintenant ; B démarre dès que A (migration mini-carte) est appliquée et `lib/types.ts` régénéré. Respecte les dépendances du tableau, et termine par le workstream VERIF avant de me rendre la main. Ne push pas. Invariants : RLS jamais désactivé, jamais d'accès direct à une table là où une vue `*_for_viewer` existe, régénère `lib/types.ts` après toute migration.

---

## Objectif du sprint en une phrase

Depuis le fil, un pêcheur peut cliquer un auteur, voir son profil avec ses compteurs d'abonnés, **le suivre sans quitter le fil**, retrouver ses abonnements dans `/follows` (réparé), lire un onglet « Abonnements », et la fiche d'une prise affiche une **vraie mini-carte**.

## Workstreams & dépendances

| WS | Bloc | Durée | Dépend de | Parallélisable jour 1 |
|----|------|-------|-----------|----------------------|
| A | Migration : `lng`/`lat` sur `catches_for_viewer` | 0,5 j | numéro migration confirmé | ✅ |
| B | Vraie mini-carte sur la fiche prise | 1 j | A (migration + types) | ❌ |
| C | Bouton Suivre dans le fil (+ `is_following` en batch) | 2 j | — | ✅ |
| D | Réparer `/follows` (BUG-04) | 1 j | — | ✅ |
| E | Profil riche : compteurs + listes + état « tu le suis » | 2 j | — | ✅ |
| F | Onglet « Abonnements » du fil | 1,5 j | C (données follow exposées) | ⚠️ UI dès J1 |
| VERIF | Revue finale indépendante | 0,5 j | tous | ❌ (toujours en dernier) |

---

## Bloc A — Migration : exposer `lng`/`lat` sur `catches_for_viewer`

La vue `catches_for_viewer` expose `geom_visible` (déjà flouté/précis selon le viewer, `security_invoker = true` depuis migration 031) mais **pas** de colonnes numériques lng/lat — d'où l'impossibilité actuelle de brancher une carte. On ajoute `lng`/`lat` dérivés de `geom_visible` : c'est **sûr** car `geom_visible` encode déjà la précision à laquelle le viewer a droit. Ne PAS exposer `geom` (précis brut).

### Tâches
1. Nouvelle migration `supabase/migrations/0NN_catches_viewer_lnglat.sql` (NN = prochain libre ≥ 034). Recréer `public.catches_for_viewer` **à l'identique** (toutes les colonnes actuelles, cf migration 017 pour le corps + 031 pour `security_invoker`) en ajoutant deux colonnes : `st_x(geom_visible::geometry) as lng`, `st_y(geom_visible::geometry) as lat`. Conserver `security_invoker = true`.
2. Appliquer en prod (connecteur Supabase `apply_migration`) puis régénérer `lib/types.ts` (`generate_typescript_types` ou la commande CLI documentée).
3. Vérifier qu'`anon` ne gagne aucun accès : la vue reste `security_invoker`, les RLS sous-jacentes s'appliquent.

### Critères d'acceptation
- `select id, lng, lat from catches_for_viewer limit 1` renvoie des nombres pour une prise non privée.
- `lib/types.ts` : `catches_for_viewer.Row` contient `lng: number | null` et `lat: number | null`.
- Régression interdite : une prise `private` d'un autre user reste invisible ; une prise `public` d'un autre renvoie un point **flouté** (lng/lat = centre du flou, pas la position exacte). Vérifier en comparant `lng/lat` de `geom_visible` vs `geom` pour une prise publique d'autrui (doivent différer).

### Garde-fous
- Ne pas toucher `geom` ni la vue `spots_for_viewer`.
- Migrations = nouveau fichier, jamais éditer un ancien.

## Bloc B — Vraie mini-carte sur la fiche prise

Remplacer (le placeholder a déjà été retiré) par une vraie carte dans `app/(app)/carnet/[id]/page.tsx`. Le composant `components/spots/SpotMiniMap.tsx` existe (wrappe `MapView`, `interactive={false}`) et attend `lng`/`lat` + métadonnées.

### Tâches
1. Dans `lib/catches/queries.ts` → `getCatchById`, s'assurer que `lng`/`lat` (Bloc A) sont bien sélectionnés (le `select('*')` les inclut une fois la vue migrée).
2. Dans `carnet/[id]/page.tsx`, là où était le placeholder (≈ l.233), monter `<SpotMiniMap>` quand `c.lng != null && c.lat != null`. Réutiliser un wrapper léger `CatchMiniMap` si les props de `SpotMiniMap` sont trop spot-centrées (passer `isPrecise` = `c.reveal_precise_to_public ?? false`, `name = location ?? 'Position'`, `species = c.species ? [c.species] : []`, le reste neutre).
3. Conteneur : `aspect-[16/7] rounded-[14px] overflow-hidden`, lazy (la carte ne doit pas alourdir le first load — réutiliser le pattern `dynamic`/lazy de `TideChartLazy.tsx`).

### Critères d'acceptation
- `/carnet/[id]` d'une prise géolocalisée affiche une carte MapLibre avec un marqueur, non interactive, centrée sur la prise.
- Une prise sans position n'affiche aucune carte (pas de placeholder, pas d'erreur).
- Aucune fuite : pour ma propre prise je vois le point précis ; le composant ne reçoit jamais `geom` brut, seulement `lng/lat` de la vue.

### Garde-fous
- ⚠️ Ne jamais passer de coordonnées issues d'une autre source que `catches_for_viewer` (sinon risque de fuite GPS — cf audit 2026-06-21).

## Bloc C — Bouton Suivre dans le fil

`FollowButton` (`components/feed/FollowButton.tsx`) fonctionne (action `toggleFollow` dans `app/actions/follow.ts`) mais n'est rendu QUE sur `/u/[username]` et `/follows`. On l'ajoute au `PostCard`. Problème de données : `FeedPost` (`lib/feed/types.ts`) ne dit pas si le viewer suit déjà l'auteur → à fournir en **batch** (pas de N+1).

### Tâches
1. `app/actions/feed.ts` → `getFeedPage` : après avoir chargé les posts, faire **une** requête `follows` (`select following_id where follower_id = viewer and following_id in (auteurs distincts)`) et injecter `author_is_following: boolean` dans chaque `FeedPost`. Étendre le type `FeedPost` (`lib/feed/types.ts`).
2. `components/feed/PostCard.tsx` : à droite de l'en-tête (avant/à côté du menu `…`), afficher `<FollowButton>` si `currentUserId && !isMine && post.author_username`. Taille `sm`. État initial = `post.author_is_following`.
3. Ne pas afficher le bouton pour ses propres posts ni en non-connecté.

### Critères d'acceptation
- Sur le fil connecté, chaque post d'autrui montre « Suivre » / « Suivi(e) » ; le clic bascule l'état **optimiste** sans recharger le fil.
- Aucune requête par post (vérifier : `getFeedPage` fait O(1) requête follow par page, pas O(n)).
- Mes propres posts n'ont pas de bouton.

### Garde-fous
- RLS `follows` inchangées (select all, insert/delete own — migration 002).
- Ne pas régresser le `memo` de `PostCard` (perf INP) : la prop `author_is_following` doit être stable.

## Bloc D — Réparer `/follows` (BUG-04)

Audit 2026-06-21 : `/follows` affiche « Tu suis (0) » alors que des abonnements existent en base. `app/(app)/follows/page.tsx` appelle `listFollowing/listFollowers/getFollowSuggestions` (`app/actions/follow.ts`).

### Tâches
1. Reproduire : créer un follow (compte A → B), ouvrir `/follows` côté A. Logger le retour de `listFollowing` (succès/erreur, longueur).
2. Diagnostiquer la cause (hypothèses audit : `listFollowing` renvoie `{ ok:false }` silencieux, ou la page ne lit pas `.data`, ou jointure profils KO). Corriger `app/(app)/follows/page.tsx` et/ou `app/actions/follow.ts`.
3. Afficher une **vraie erreur** si `!ok` (au lieu du vide trompeur).

### Critères d'acceptation
- Compte A suit B → `/follows` (A) liste B immédiatement, compteur « Tu suis (1) ».
- Unfollow → B disparaît sans reload.
- Si la requête échoue, message d'erreur visible (pas « Tu ne suis personne »).

### Garde-fous
- Ne pas changer les RLS ; le bug est applicatif.

## Bloc E — Profil riche `/u/[username]`

`app/(app)/u/[username]/page.tsx` existe mais n'affiche **aucun compteur social**. La vue `profiles_stats` (migration 003) expose `followers_count`/`following_count` mais n'est pas utilisée.

### Tâches
1. Charger `profiles_stats` (ou compter via `follows`) pour le profil affiché → « N abonnés · M abonnements ».
2. Rendre les compteurs cliquables : ouvrir la liste followers / following (réutiliser `UserCard` + une modale `Dialog`, ou une sous-route `/u/[username]/abonnes`). Chaque entrée = `UserCard` avec `FollowButton`.
3. Afficher l'état « Tu le suis » sur le header (le `FollowButton` reflète déjà l'état ; ajouter un libellé si suivi).
4. (Si pas déjà fait) onglets profil : « Posts » / « Prises publiques ».

### Critères d'acceptation
- `/u/x` affiche « N abonnés · M abonnements » corrects (vérifiable vs `select count(*) from follows`).
- Clic sur « N abonnés » → liste cliquable, chaque pêcheur mène à son profil.
- Le `FollowButton` du header reflète l'état réel et bascule en optimiste.

### Garde-fous
- Ne jamais exposer l'email ou des données privées du profil.
- `profiles_stats` : vérifier qu'elle est lisible par le viewer (sinon compter via `follows`, RLS select all).

## Bloc F — Onglet « Abonnements » du fil

`components/feed/FeedTabs.tsx` gère les onglets du fil (`app/(app)/fil/[department]/page.tsx`). Ajouter un onglet listant les posts des pêcheurs suivis.

### Tâches
1. `app/actions/feed.ts` : variante `getFollowingFeedPage` → posts où `author_id in (select following_id from follows where follower_id = viewer)`, même shape que `getFeedPage` (donc `author_is_following = true`).
2. `FeedTabs` + `FeedClient` : ajouter l'onglet « Abonnements » (visible si connecté). Vide soigné si l'utilisateur ne suit personne (CTA « Découvre des pêcheurs » → `/follows` ou découverte).
3. Realtime : l'onglet peut rester non-realtime en v1 (documenté), focus sur l'onglet département existant.

### Critères d'acceptation
- L'onglet « Abonnements » liste les posts des comptes suivis, triés par date.
- Ne suivant personne → état vide avec CTA, pas d'erreur.
- Onglet « Département » inchangé (régression interdite : realtime + tier gating intacts).

### Garde-fous
- Réutiliser `feed_posts_for_viewer` (jamais la table brute).

## Workstream VERIF (obligatoire, agent indépendant)

1. `pnpm test` (suite complète verte) + `pnpm build` (OK) + `pnpm typecheck`.
2. Relire chaque critère d'acceptation A→F, cocher ✅/❌ avec preuve (URL, requête SQL, capture).
3. Passe sécurité : migration A ne donne aucun accès `geom` brut à `anon` ; mini-carte (B) ne consomme que `catches_for_viewer` ; `follows` RLS intactes ; pas de N+1 dans `getFeedPage`.
4. Passe copy : tutoiement, « Suivre / Suivi(e) », zod FR, aucune promesse mensongère.
5. Livrer `docs/sprint-12/RECAP.md` : fait / comment tester / reste manuel John.

## Reste manuel John (post-sprint)

- Appliquer la migration A en prod si l'agent ne l'a pas fait, régénérer `lib/types.ts`.
- QA manuelle multi-comptes (follow A↔B, profils, onglet abonnements).
- Merge `sprint-12-ux-social` → `main` + déploiement.
- **Renommer `docs/sprint-12-13/` (mobile) → `docs/sprint-16-17/`** et mettre à jour `CLAUDE.md` §9 + `docs/ROADMAP.md` (le track Excellence occupe 12-15, le mobile décale).
