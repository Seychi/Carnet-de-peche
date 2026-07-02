# A — Auth queries & redondances (Sprint 16 Bloc A)

Date d'inspection : 2026-06-22  
Branche : sprint-14-home (HEAD 3a67636)  
Perimetre : routes `(app)` + `(map)/carte` uniquement — marketing non concerne.

---

## 1. Cartographie des aller-retours auth sur un tap d'onglet

Chemin d'execution : middleware → layout (app) → page.

### 1.1 Middleware (`middleware.ts`)

| # | Type | Code | Detail |
|---|---|---|---|
| MW-1 | `auth.getUser()` | `middleware.ts:37` | Verif session JWT — 1 round-trip Supabase Auth |
| MW-2 | `profiles.select("onboarded")` | `middleware.ts:60-64` | SELECT sur `profiles` uniquement si user connecte ET route app |

MW-2 ne se declenche QUE si `isAppRoute === true` (liste `APP_ROUTES` ligne 9).  
Routes concernees : `/home`, `/carnet`, `/onboarding`, `/fil/`, `/follows`, `/profil`, `/compte`.  
Route `/carte` est dans `(map)` — elle n'est PAS dans `APP_ROUTES`, donc MW-2 ne s'y execute jamais.

### 1.2 Layout `(app)` (`app/(app)/layout.tsx`)

| # | Type | Code | Detail |
|---|---|---|---|
| LAY-1 | `auth.getUser()` | `layout.tsx:31` | Doublon de MW-1 — defense in depth |
| LAY-2 | `subscriptions.select(...)` | `layout.tsx:39-43` | SELECT sur `subscriptions` pour le bandeau trial J-3 |

LAY-2 ramene `plan, status, trial_end, stripe_price_id` pour TOUTES les routes `(app)`.

### 1.3 Pages — `auth.getUser()` supplementaires (troisieme exemplaire)

Chaque page effectue sa propre verif `auth.getUser()` comme garde-fou secondaire.  
Ces appels sont dedupliques par `react.cache()` **seulement si** `createClient()` retourne le meme client — ce qui est le cas car `lib/supabase/server.ts` instancie via `cookies()` de Next.js (reference stable dans la meme requete RSC). En pratique, les appels `supabase.auth.getUser()` dans les pages sont gratuits en latence reseau grace a ce cache React.

| Page | Ligne getUser | Requetes supplementaires tier-dependantes |
|---|---|---|
| `home/page.tsx` | 26 | aucune — pas de tier |
| `carnet/page.tsx` | 26 | aucune — pas de tier |
| `carnet/[id]/page.tsx` | 60 | aucune — pas de tier (geom filtre par RLS/vue) |
| `carnet/[id]/modifier/page.tsx` | non inspecte | — |
| `carnet/nouvelle/page.tsx` | non inspecte | — |
| `fil/[department]/page.tsx` | 47 | aucune — social gratuit (migration 022) |
| `follows/page.tsx` | 18 | aucune — pas de tier |
| `profil/page.tsx` | 23 | aucune — pas de tier |
| `u/[username]/page.tsx` | 37 | `profiles.select is_moderator` (l.55-66) |
| `compte/abonnement/page.tsx` | 73 | `subscriptions.select(...)` (l.78-83) + Stripe API (l.96) |
| `compte/abonnement/success/page.tsx` | — | Stripe API uniquement (pas de getUser) |
| `onboarding/[step]/page.tsx` | 20 | `profiles.select("onboarded,...")` (l.24-27) |
| `(map)/carte/page.tsx` | 94 | `getUserTier()` → `auth.getUser()` + RPC `current_tier` |

---

## 2. Redondances identifiees

### 2.1 Double (et triple) `auth.getUser()`

**MW-1 (`middleware.ts:37`) → LAY-1 (`layout.tsx:31`) → page**

Tous les appels `supabase.auth.getUser()` dans les pages sont dedupliques par `React.cache()` (cf. `lib/auth/tier.ts:14` — pattern identique : `cache(async () => { const supabase = await createClient(); ... getUser() })`). MAIS : `auth.getUser()` dans les pages n'est pas lui-meme enveloppe dans `cache()` — c'est le SDK Supabase qui deduplique via son propre mecanisme de session en memoire (le JWT est verifie localement si valide, pas un aller-retour reseau supplementaire).

**Verdict** : LAY-1 et les `getUser()` en page sont redondants avec MW-1 en termes de logique de controle d'acces. En termes de latence reseau, le SDK Supabase deduplique les appels JWT dans la meme requete. Cependant, le pattern `if (!user) redirect(...)` en page (defense in depth) est intentionnel et documenté (`layout.tsx:21`). Ce n'est pas un bug mais une redondance deliberee.

**Gain potentiel** : faible en latence, mais si on supprime les guards en page (risque), on economise 0 round-trip reseau (JWT local). Recommandation : **ne pas toucher** — le guard en page est la ceinture sous la bretelle, il protege contre une mauvaise configuration du middleware.

### 2.2 `subscriptions` charge sur TOUTES les pages `(app)`

LAY-2 (`layout.tsx:39-43`) fait un SELECT `subscriptions` a chaque navigation vers une route `(app)`, pour afficher le bandeau trial J-3.

Pages qui n'ont **pas besoin** du tier pour leur contenu propre : `/home`, `/carnet`, `/carnet/[id]`, `/fil/[dept]`, `/follows`, `/profil`, `/u/[username]`, `/onboarding/*`.

Pages qui ont besoin du tier : `/carte` (gating des spots), `/compte/abonnement` (affichage plan).

**Verdict** : LAY-2 charge `subscriptions` systematiquement pour un bandeau qui ne s'affiche QUE si `status = 'trialing'` ET `daysLeft <= 3`. Cas rare en production normale (7 jours/utilisateur, 1 fois). Ce SELECT frappe la DB a chaque tap d'onglet pour 100% des utilisateurs.

**C'est le plus gros gain sur.**

### 2.3 `getUserTier()` sur `/carte` — appel `auth.getUser()` en plus

`(map)/carte/page.tsx:99` appelle `getUserTier()` (`lib/auth/tier.ts`) qui fait en interne :
1. `auth.getUser()` (`tier.ts:21`)
2. RPC `current_tier` (`tier.ts:25`)

Puis la page fait aussi `supabase.auth.getUser()` ligne 94 pour le `user.id`. Deux appels `getUser()` dans la meme page — attenuation : `getUserTier()` est wrappé dans `React.cache()`, donc le second appel au SDK est dedupliqué. **Pas de double round-trip reseau.** Mais l'architecture est fragile : si on extrait `getUserTier` hors de la page, le cache React ne vit que le temps du render RSC de la requete courante.

### 2.4 `profiles.select("onboarded")` dans le middleware + `profiles.select(...)` dans la page

Le middleware fait MW-2 (`profiles.onboarded`) et certaines pages font leur propre SELECT profiles (ex: `home/page.tsx:29-33`, `carnet/page.tsx:65`, `onboarding/[step]/page.tsx:24-27`). Ce sont des colonnes differentes donc pas de doublon strict — mais on touche la meme table deux fois par requete sur ces pages.

---

## 3. Ruling surete-cache — routes a maintenir dynamiques

**Regle** : toute route dont la sortie depend du tier de l'utilisateur ou de coordonnees GPS doit etre `force-dynamic` (ou sans revalidation partagee). Un cache CDN partage entre utilisateurs = fuite cross-user.

| Route | Tier-dependent | GPS/geom | Statut actuel | Verdict |
|---|---|---|---|---|
| `(map)/carte/page.tsx` | Oui — spots limites (3/dept vs tous), geom floutee vs precise, filtres | Oui — `geom_public` vs `geom` via RPC `get_spots_for_map` | Pas de `force-dynamic` explicite | **DOIT etre force-dynamic** — la carte n'a pas la directive, risque de cache partage |
| `(app)/carnet/page.tsx` | Non | Oui — `catches_for_viewer` filtre par `user_id` (RLS), geom adaptee | `force-dynamic:14` | OK |
| `(app)/carnet/[id]/page.tsx` | Non | Oui — `getCatchById` via `catches_for_viewer`, `geom_visible` depend du viewer | Pas de `force-dynamic` | **DOIT etre force-dynamic** — la geom affichee depend de `user_id` et `reveal_precise_to_public` |
| `(app)/fil/[department]/page.tsx` | Non (social gratuit) | Non | `force-dynamic:12` | OK |
| `(app)/follows/page.tsx` | Non | Non | `force-dynamic:9` | OK |
| `(app)/compte/abonnement/page.tsx` | Oui — affiche le plan, factures | Non | `force-dynamic:14` | OK |
| `(app)/compte/abonnement/success/page.tsx` | Non direct | Non | `force-dynamic:8` | OK |
| `(app)/home/page.tsx` | Non | Non (pas de geom) | Pas de `force-dynamic` | OK pour l'instant — contenu 100% user_id, mais `catches_for_viewer` est RLS-protege. Serait a securiser si on ajoutait du cache. |
| `(app)/profil/page.tsx` | Non | Non | Pas de `force-dynamic` | OK — pas de geom, pas de tier |
| `(app)/u/[username]/page.tsx` | Non | Non | `force-dynamic:17` | OK |
| `(app)/onboarding/[step]/page.tsx` | Non | Non | Pas de `force-dynamic` | OK — onboarding bloque avant d'acceder aux donnees sensibles |

### Routes a corriger en priorite

1. `app/(map)/carte/page.tsx` — manque `export const dynamic = 'force-dynamic'`. C'est la route la plus exposee : les spots retournes et les coordonnees changent selon le tier. Sans la directive, Next.js peut mettre en cache le rendu serveur initial.

2. `app/(app)/carnet/[id]/page.tsx` — pas de `force-dynamic`. La page affiche `c.lng`/`c.lat` depuis `catches_for_viewer` (geom_visible adaptee au viewer) et le flag `isOwner`. Si jamais le rendu est cache, un utilisateur B verrait la geom precise de A.

---

## 4. Invariants a preserver par tout refactor

| Invariant | Ou il est implemente | Ce qu'on ne doit jamais casser |
|---|---|---|
| **RLS activee sur toutes les tables** | Migrations 002, 017-033 | Ne jamais ajouter `DISABLE ROW LEVEL SECURITY`. Toute nouvelle table : RLS + policies avant le premier SELECT. |
| **Gating de tier sur les spots** | `(map)/carte/page.tsx:99-119` via `getUserTier()` + `limitSpotsPerDept` | `getUserTier()` doit etre appele avant tout fetch de spots. Ne jamais bypasser le tier pour un utilisateur `anonymous` ou `discovery`. |
| **Floutage GPS spots** | RPC `get_spots_for_map` (migration 028/028b) + vue `spots_for_viewer` | `geom` ne doit jamais etre expose directement. Seul `geom_public` (flouté ~500-900m) est visible pour les tiers non-payes. Verrou colonne : `anon` n'a pas SELECT sur `spots.geom`. |
| **Floutage GPS catches** | Vue `catches_for_viewer` (securite_invoker, migrations 028/031) | Toujours passer par `catches_for_viewer`, jamais la table `catches` directe pour afficher des prises. `geom_visible` est le champ securise. |
| **Social 100% gratuit** | Migration 022 + `feed.ts` sans checks tier | Ne pas reintroduire de checks `current_tier` dans les actions feed/follow. |
| **Moderation** | `profiles.is_moderator` (migration 023) | Ne jamais exposer le bouton moderation sans verifier `viewerIsModerator === true` cote serveur. |
| **Source de verite tier = webhook Stripe** | RPC `current_tier` (migration 021) | Ne pas lire `subscriptions.plan` directement pour des decisions de gating — toujours passer par `getUserTier()` qui appelle `current_tier`. |

---

## 5. Synthese des gains

| Gain | Impact | Effort | Sur/Risque |
|---|---|---|---|
| Ajouter `force-dynamic` a `carte/page.tsx` | Critique (securite) | Trivial — 1 ligne | SUR, zero regression |
| Ajouter `force-dynamic` a `carnet/[id]/page.tsx` | Eleve (GPS) | Trivial | SUR |
| Supprimer LAY-2 (`subscriptions` en layout) ou le conditionner | ~1 SELECT/tap d'onglet elimine pour 99% des users | Moyen — deplacer le bandeau en Client Component avec lazy-load | Necessite de passer le bandeau en RSC conditionnel ou SWR cote client |
| Deduplication des `getUser()` en page | Nul en latence (SDK cache) | — | Ne pas toucher (defense in depth) |

---

**Plus gros gain sur (1 ligne, zero risque)** : ajouter `export const dynamic = 'force-dynamic'` dans `app/(map)/carte/page.tsx` — c'est la seule route tier+GPS sans cette protection, et c'est la route la plus frequentee de l'app.
