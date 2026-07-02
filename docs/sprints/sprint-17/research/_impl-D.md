# Bloc D — Implémentation : rapport précis

> Agent d'exécution. Date : 2026-06-22.
> Branche : sprint-14-home (arbre partagé avec d'autres agents en parallèle).
> Aucun git add/commit effectué.

---

## Fichiers modifiés

| Fichier | Statut | Ce qui a changé |
|---|---|---|
| `app/actions/follow.ts` | modifié | `getFollowSuggestions` enrichi + `searchUsers` ajouté |
| `components/layout/AppSidebar.tsx` | modifié | import `Users` + entrée `Mes pêcheurs` dans ITEMS |
| `components/layout/UserMenu.tsx` | modifié | import `MessageCircle, Users` + 2 liens (Fil régional, Mes pêcheurs) |
| `components/layout/AppHeader.tsx` | modifié | import `SearchModal` + `{user && <SearchModal />}` |
| `components/layout/SearchModal.tsx` | **créé** | composant client loupe + modale debounced |

---

## D.1 — `searchUsers` (`app/actions/follow.ts` après L185)

**Avant** : fonction inexistante.

**Après** :
```ts
export async function searchUsers(term: string): Promise<ActionResult<UserSummary[]>>
```
- Auth gate : `supabase.auth.getUser()` → fail si non connecté.
- Sanitisation : regex `[^\p{L}\p{N}_\-]/gu` → strip tout sauf lettres unicode, chiffres, `_`, `-`. Min 2 chars → `ok([])`.
- Requête : `.from('profiles').select(PROFILE_COLS).ilike('username', '%…%').eq('onboarded', true).order('username').limit(10)`.
- `username` est `citext` → ILIKE est nativement case-insensitive, pas de `.toLowerCase()`.
- Index `profiles_username_trgm_idx` (GIN gin_trgm_ops, migration 037 déjà appliquée en prod) couvre cette requête.
- RLS `profiles_select_all` (authenticated SELECT sur `profiles`) laisse passer sans rien changer.
- Invariants GPS : `profiles` ne contient aucune coordonnée — zéro fuite.

---

## D.2 — `SearchModal` (`components/layout/SearchModal.tsx`, nouveau fichier)

Composant `'use client'` autonome :
- Bouton loupe `min-h-[44px] min-w-[44px]` (tap target ≥ 44 px, WCAG 2.5.5).
- Modale positionnée `absolute right-0 top-full` — reste dans le flux du header, pas de portail nécessaire.
- Debounce 300 ms via `useRef<ReturnType<typeof setTimeout>>` + `useTransition` pour l'appel Server Action.
- Fermeture : Escape (keydown), clic en dehors (mousedown sur `containerRef`), navigation (`router.push` + `setOpen(false)`).
- États : invite initiale (< 2 chars) / spinner (`isPending`) / résultats / vide / erreur.
- Résultats : avatar (`Avatar`/`AvatarFallback` shadcn), nom, département (`DEPARTMENT_LABELS`). Clic → `/u/[username]`.
- `aria-label` sur le bouton + `role="dialog"` sur la modale + `role="listbox/option"` sur la liste.
- Branchement dans `AppHeader` : `{user && <SearchModal />}` entre Loguer et NotificationBell.

---

## D.3 — `UserMenu` (`components/layout/UserMenu.tsx`)

**Avant** L82 (après Mon carnet, avant Mon abonnement) :
```tsx
// rien
```

**Après** : deux `<Link>` insérés :
```tsx
<Link href="/fil"     …><MessageCircle size={15} … />Fil régional</Link>
<Link href="/follows" …><Users size={15} … />Mes pêcheurs</Link>
```
Imports ajoutés : `MessageCircle, Users` depuis `lucide-react`.
Liens existants (Mon profil, Mon carnet, Mon abonnement, Modération) **non touchés**.

---

## D.4 — `AppSidebar` (`components/layout/AppSidebar.tsx`)

**Avant** ITEMS :
```
Accueil · Mon carnet · Carte · Fil · Profil
```

**Après** :
```
Accueil · Mon carnet · Carte · Fil · Mes pêcheurs · Profil
```
Import `Users` ajouté. Tableau `as const` — TypeScript inférera le nouveau type automatiquement, aucun cast nécessaire.

---

## D.5 — `getFollowSuggestions` (`app/actions/follow.ts` L88-125)

**Avant** :
- Retourne `ok([])` si `home_department` absent → `/follows` affichait une section vide sans explication.
- Pas de tri par activité récente.
- Limit 20 candidats, pas de filtre `onboarded`.

**Après** :
- Plus de `return ok([])` sur absence de département : on élargit à tous les profils.
- Filtre `.eq('onboarded', true)` ajouté.
- `.order('updated_at', { ascending: false })` — proxy d'activité récente (sans sous-requête coûteuse sur `feed_posts`/`catches`).
- Si `home_department` connu → filtre département ajouté (suggestions locales plus pertinentes).
- Limit 30 candidats → filtre followedIds → slice(0, 5).
- Résultat : max 5 suggestions, jamais `[]` artificiel pour un compte sans département.

---

## Invariants vérifiés

| Invariant | Comment préservé |
|---|---|
| RLS jamais contournée | `searchUsers` passe par `createClient()` (JWT user) + RLS `profiles_select_all` (SELECT authenticated) — aucun bypass |
| Jamais accès brut à la place d'une vue | `searchUsers` et `getFollowSuggestions` touchent uniquement `profiles` (pas de coords) et `follows`. Aucune vue `*_for_viewer` en jeu ici. |
| Floutage GPS préservé | `profiles` ne contient pas de coordonnées GPS. Aucun champ `geom` sélectionné. |
| Gating de tier préservé | La recherche et les follows sont 100 % gratuits (décision §8 CLAUDE.md). Aucun check tier ajouté. |
| Modèle social = abonnés unilatéraux | `searchUsers` renvoie des profils → l'UI les affiche avec `FollowButton` existant (unilatéral). La modale ne présume pas de réciprocité. |
| Liens existants non cassés | Sidebar : Profil toujours en dernier. UserMenu : Mon profil / Mon carnet / Mon abonnement / Modération inchangés. TabBar non touché (trop de tabs serait contre-productif sur mobile). |

---

## Ce qui reste hors périmètre Bloc D

- TabBar mobile : `/follows` délibérément **non ajouté** — la tab bar a déjà 4 onglets + FAB et ajouterait un 5e qui déborderait. Accès via UserMenu (mobile) ou Sidebar (desktop).
- Chips espèces sur les suggestions (`/follows/page.tsx`) : `profiles` n'expose pas `favorite_species` dans `PROFILE_COLS` — nécessiterait d'élargir le SELECT et d'ajouter la colonne à `UserSummary`. Laissé au prochain sprint (non bloquant).
- Index `profiles_username_trgm_idx` : migration 037 confirmée appliquée en prod (brief §"Migrations 037…déjà appliquées"). Aucune migration à créer ici.
