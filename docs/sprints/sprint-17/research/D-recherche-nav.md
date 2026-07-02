# Bloc D — Recherche, découverte & navigation
## État réel au 2026-06-22

---

## 1. Recherche de pêcheurs : ABSENTE

**Aucune barre de recherche dans tout le produit.** Grep repo-wide sur `recherche`, `searchUsers`, `search_profiles`, `username.*ilike`, `display_name.*ilike` → 0 résultat applicatif.

- Pas de route `/recherche` (Glob `app/**/recherche*` → vide).
- Pas d'action `searchUsers` ni de RPC côté Supabase.
- La seule recherche existante est dans `app/actions/feed.ts:743-745` — un `ilike` sur `species`/`location_label` dans le fil (pas les profils).
- On atteint un profil `/u/[username]` **uniquement** en cliquant un auteur déjà visible dans le fil.

**Index trigram disponibles en base** :
- `spots_name_trgm_idx` sur `spots.name` (`003_indexes_views.sql:37-38`) — gin trgm_ops, pour les spots.
- `feed_posts_text_trgm_idx` sur `feed_posts.text` (`017_feed_tier_gating.sql:157-158`) — pour le fil.
- **Aucun index trigram sur `profiles.username` ni `profiles.display_name`** — à créer dans la migration (ou en DB-only pour commencer). Extension `pg_trgm` déjà active (`001_init.sql:10`).

---

## 2. Navigation morte / pages inaccessibles

### `/follows` introuvable dans la nav
- **TabBar** (`components/layout/TabBar.tsx:8-14`) : Carnet · Carte · Fil · Profil. Pas de `/follows`.
- **AppSidebar** (`components/layout/AppSidebar.tsx:8-13`) : Accueil · Mon carnet · Carte · Fil · Profil. Pas de `/follows`.
- **UserMenu** (`components/layout/UserMenu.tsx:64-89`) : Mon profil · Mon carnet · Mon abonnement · Déconnexion. Pas de `/follows`, **pas de « Fil régional »** non plus.
- Seule entrée vers `/follows` : `EmptyFeed.tsx:21` — CTA « Trouver des pêcheurs » sur l'état vide du fil onglet Suivis. **Une fois le fil rempli, la page disparaît de l'horizon.**

### Fil absent du UserMenu
- Un utilisateur connecté sur une page marketing (ex. `/tarifs`, `/especes`) voit le `UserMenu` (via `Header.tsx` + `HeaderShell.tsx`) mais n'a **aucun lien vers `/fil/[dept]`**. Il doit deviner l'URL ou naviguer via `/home`.

### Compteur de prises mort sur `/u/[username]`
- `app/(app)/u/[username]/page.tsx:80-86` : `count(catches WHERE privacy='public')` affiché comme chiffre seul. Pas de lien, pas de grille — cf. Bloc A.

---

## 3. Plan d'implémentation (sans coder)

### D.1 — Action `searchUsers` (Server Action)
**Fichier** : `app/actions/follow.ts` (déjà le fichier de toutes les actions sociales).

- Ajouter **après `listFollowers` (l.173)** une fonction `searchUsers(query: string): Promise<ActionResult<UserSummary[]>>`.
- Requête : `.from('profiles').select(PROFILE_COLS).ilike('username', '%' + sanitized + '%').limit(10)` — fallback simple, ou `.textSearch('username', query, { type: 'plain', config: 'french' })` si trigram.
- Ajout d'un **index trigram sur `profiles.username`** à écrire dans la prochaine migration disponible (037 si non prise par supabase-guard pour les notifs, sinon 038 ou 039). DDL : `create index if not exists profiles_username_trgm_idx on public.profiles using gin (username gin_trgm_ops);` — index DB-only, pas de colonne nouvelle, aucune RLS à modifier.
- RLS existante `profiles_select_all` (`002_rls.sql`) : `SELECT` on `profiles` for `authenticated` → la requête passe sans rien changer.
- Input sanitization : strip tout sauf `\p{L}\p{N}_` (comme `feed.ts:743`), min 2 chars.

### D.2 — UI de recherche : modale depuis le header
**Fichier** : `components/layout/AppHeader.tsx` (l.11-51).

- Ajouter une `SearchButton` (icône `Search` lucide, `min-h-[44px]`) entre « Loguer » et `UserMenu` (l.38-46).
- `onClick` → ouvre une modale `SearchModal` (composant `'use client'`, state local) :
  - `<input>` debounced (300 ms) → appelle `searchUsers` en Server Action.
  - Résultats : liste de `UserCard` (composant déjà disponible `components/feed/UserCard.tsx`) avec avatar + username + département.
  - Clic sur un résultat → `router.push('/u/' + result.username)` + fermeture modale.
  - Fermeture : Escape, clic en dehors, croix.
- **Desktop** : afficher dans le header (entre les deux boutons existants).
- **Mobile** : identique (le header est présent partout dans `(app)` via `AppShell`).

### D.3 — Ajouter `/follows` et le Fil au `UserMenu`
**Fichier** : `components/layout/UserMenu.tsx` (l.64-89).

Insérer deux `<Link>` dans le `<nav>` (l.64) **après « Mon carnet »** (l.73-80) :
```
{ href: '/fil', label: 'Fil régional', Icon: MessageCircle }
{ href: '/follows', label: 'Mes pêcheurs', Icon: Users }
```
Import à ajouter : `MessageCircle, Users` depuis `lucide-react` (l.6, déjà `LogOut, User, BookOpen, CreditCard, ChevronDown`).

### D.4 — Ajouter `/follows` à la Sidebar desktop
**Fichier** : `components/layout/AppSidebar.tsx` (l.8-13, tableau `ITEMS`).

Insérer `{ label: 'Mes pêcheurs', href: '/follows', match: '/follows', Icon: Users }` entre `Fil` et `Profil`. Import `Users` depuis lucide-react (l.6, actuellement `Home, NotebookText, Map, MessageCircle, User`).

### D.5 — Découverte enrichie sur `/follows`
**Fichier** : `app/(app)/follows/page.tsx` + `app/actions/follow.ts`.

Enrichir `getFollowSuggestions` (`follow.ts:76-113`) :
- **Actuellement** : 5 profils du même département, hors suivis, sans critère supplémentaire. Renvoie `[]` si `home_department` absent (`l.88`).
- **Cible** : ajouter 2 critères de ranking secondaires (récemment actifs : profils avec un `feed_posts.created_at` ou `catches.caught_at` récent ; overlap d'espèces favorites). Requête en deux temps : d'abord les profils du département (comme maintenant), puis tri par `last_active` via une sous-requête ou une vue à créer.
- **Fallback gracieux** si pas de `home_department` : élargir à tous les profils actifs récents (pas de `[]` vide).
- Affichage sur `/follows/page.tsx` : section « Suggestions pour toi » déjà présente (l.59-65), à enrichir avec des chips « Bar · Lieu jaune » pour contextualiser.

---

## 4. Invariants vérifiés

- La recherche requêtera `profiles` via RLS `profiles_select_all` (authenticated) — jamais la table brute `catches` ni `catches.geom`. Pas de fuite GPS.
- `catches_for_viewer` non touchée dans ce bloc.
- Pas de migration de schéma obligatoire pour la navigation (D.3/D.4) — uniquement du JSX.
- L'index trigram sur `profiles.username` (D.1) est un `CREATE INDEX IF NOT EXISTS`, sans effet sur les données ni sur RLS.
- Modèle social = abonnés unilatéraux (cf. décision John, CLAUDE.md §8) — la recherche et les suggestions restent cohérentes : `FollowButton` existant s'applique tel quel.

---

## 5. Ordre d'exécution recommandé

1. **D.3 + D.4** (UserMenu + Sidebar) — 30 min, 0 dépendance, impact nav immédiat.
2. **D.1** (action `searchUsers` + index) — 1 h, dépend de la migration numérotée libre.
3. **D.2** (SearchModal dans AppHeader) — 1,5 h, dépend de D.1.
4. **D.5** (découverte enrichie) — 1 h, indépendant.

Total estimé : **~4 h** (dans la fourchette « 2-3 j » du brief, en comptant les tests).

---

## Sources file:line

| Constat | Source |
|---|---|
| Aucun index trgm sur `profiles.username` | `supabase/migrations/003_indexes_views.sql:37-38` (spots seulement) |
| Extension pg_trgm active | `supabase/migrations/001_init.sql:10` |
| TabBar sans `/follows` | `components/layout/TabBar.tsx:8-14` |
| Sidebar sans `/follows` | `components/layout/AppSidebar.tsx:8-13` |
| UserMenu sans Fil ni follows | `components/layout/UserMenu.tsx:64-89` |
| Seule entrée `/follows` = état vide | `components/feed/EmptyFeed.tsx:21` |
| Suggestions limitées au même dépt | `app/actions/follow.ts:86-112` |
| Suggestions vides si pas de dépt | `app/actions/follow.ts:88` |
| Compteur prises mort sans grille | `app/(app)/u/[username]/page.tsx:80-86` |
| Recherche feed (espèce/lieu, pas pseudo) | `app/actions/feed.ts:743-745` |
