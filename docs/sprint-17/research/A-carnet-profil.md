# Bloc A — Carnet public sur le profil : état réel & plan A.3

> Recherche réalisée le 2026-06-22. Lecture du code + migration 034.
> READ-ONLY STRICT : aucun fichier applicatif modifié.

---

## A.1 — `lib/catches/media.ts` : PRÉSENT et CONFORME

Fichier : `lib/catches/media.ts` (68 lignes).
Il correspond **exactement** au snippet A.1 du brief, avec :
- `ProfileCatch` : mêmes champs (`id, species, size_cm, caught_at, technique, photoUrl`).
- `getProfileCatches` : lit `catches_for_viewer`, `.select('id, species, size_cm, caught_at, technique, photo_path')`, filtre `.neq('privacy', 'private')`, ordre `caught_at DESC`, limit 12.
- Import dynamique `createAdminClient` pour signer les URLs Storage (repli viewer si absent en dev).

**Différence mineure vs snippet du brief** : commentaires plus détaillés et nommage interne (`urls` au lieu de `s`, `x` au lieu de `p`) — fonctionnellement identique.

**Colonnes confirmées OK** (migration `034_catches_viewer_lnglat.sql`) :
- `photo_path` : présent dans la sous-requête de la vue (ligne 52 de la migration), **non renommé**.
- `privacy` : présent (ligne 55), lisible par `security_invoker` via la RLS `catches`.
- `lng`/`lat` ajoutées en fin de vue (034) — non sélectionnées par A.1, pas de conflit.

Floutage : la vue `catches_for_viewer` délègue à `catch_visible_geom()` (colonne `geom_visible`) ; `photo_path` et `privacy` ne contiennent aucun GPS — aucune fuite possible via A.1.

---

## A.2 — `app/(app)/carnet/[id]/page.tsx` : DÉJÀ GATÉ

Fichier : `app/(app)/carnet/[id]/page.tsx`, ligne 87–88 + 102–113.

```ts
// ligne 87
const isOwner = user.id === c.user_id
```

Le bloc « Modifier + CatchActionsMenu » est **déjà enveloppé par `{isOwner && ...}`** (lignes 102–113) :

```tsx
{isOwner && (
  <div className="flex items-center gap-1">
    <Link href={`/carnet/${id}/modifier`} ...>Modifier</Link>
    <CatchActionsMenu catchId={id} />
  </div>
)}
```

A.2 est **fait** — rien à coder.

**Note** : la page redirige (`redirect('/auth/login')`) si non connecté (ligne 66). Un visiteur non connecté ne peut donc pas voir une fiche prise, même publique. Ce comportement est **hors scope A.2** mais à noter pour la QA (qa-chrome avec 2 comptes doit se connecter avec l'un d'eux).

---

## A.3 — `app/(app)/u/[username]/page.tsx` : à brancher

Fichier : `app/(app)/u/[username]/page.tsx` (222 lignes).

**État actuel :**
- Le profil affiche : hero (avatar, nom, bio, chips), compteur `publicCatches` (ligne 80–83, source = `catches` brut — compteur correct car filtre `privacy='public'`), `ProfileFollowStats`, section Posts (grille `PostCard`).
- **Aucune section Prises** : seul un compteur mort (`publicCatches ?? 0`) est affiché dans le hero, mais les prises elles-mêmes ne sont jamais requêtées ni rendues.

**Ce que A.3 demande :**

1. **Import** (à insérer avec les imports existants) :
   ```ts
   import { getProfileCatches, type ProfileCatch } from '@/lib/catches/media'
   import { Fish } from 'lucide-react'
   import Link from 'next/link'  // déjà absent des imports actuels — à ajouter
   ```
   `SPECIES_LABELS` est déjà importé depuis `@/lib/labels` (ligne 7) — réutilisable dans `ProfileCatchTile`.

2. **Appel de données** (après ligne 114 `const enriched = await attachPostMedia(posts, supabase)`) :
   ```ts
   const catches = await getProfileCatches(profile.id, supabase, 12)
   ```

3. **Rendu** : insérer la section `{/* Prises */}` dans le `<div className="mx-auto flex max-w-[680px] ...">` (ligne 185), **avant** la section `{/* Posts */}` (ligne 187).

4. **Composant local** `ProfileCatchTile` : à ajouter après `HeroChip` (ligne 215).

**Localisation précise dans le fichier :**

| Action | Ligne de référence dans le fichier actuel | Insérer |
|---|---|---|
| Imports `Fish`, `Link`, `getProfileCatches` | lignes 1–16 | Après/avec les imports existants |
| `const catches = await getProfileCatches(...)` | ligne 114 (après `attachPostMedia`) | Immédiatement après |
| Section `<section>` Prises | ligne 186 (avant `{/* Posts */}`) | Juste avant |
| Composant `ProfileCatchTile` | ligne 215 (après `HeroChip`) | Juste après |

**Variable `isMe` :** déjà calculée ligne 47 (`const isMe = user?.id === profile.id`) — utilisable telle quelle dans le message vide de la section.

---

## Garde-fous vérifiés

- `catches_for_viewer` (vue) = source correcte : privacy + floutage GPS gérés par la vue, jamais accès brut à `catches`. Filtre `.neq('privacy', 'private')` dans `getProfileCatches` couvre aussi le cas propriétaire.
- Prises `friends` d'autrui : la vue expose les prises `friends` uniquement si `follower_id = auth.uid()` suit l'auteur (WHERE clause de la vue, ligne 74–80 de la migration 034). Comportement correct sans code supplémentaire.
- Prises d'un visiteur non connecté (`auth.uid() = null`) : la vue n'exposera que les prises `public` (le `OR c.user_id = auth.uid()` et le `OR c.privacy = 'friends' AND EXISTS(follows...)` ne matchent pas). Correct.

---

## Résumé

- **A.1** : PRÉSENT et CONFORME (`lib/catches/media.ts`).
- **A.2** : DÉJÀ GATÉ (`carnet/[id]/page.tsx` ligne 102).
- **A.3** : 4 points de modification dans `app/(app)/u/[username]/page.tsx` — import (lignes 1–16), appel données (après ligne 114), section Prises (avant ligne 187), composant `ProfileCatchTile` (après ligne 215).
