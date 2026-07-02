# Bloc A — Implémentation A.3 : section « Prises » sur le profil public

> Implémenté le 2026-06-22. Fichier modifié : `app/(app)/u/[username]/page.tsx`.

---

## Ce qui a été fait

### 1. Imports ajoutés (lignes 3, 6, 16)

```ts
import Link from 'next/link'          // ligne 3
import { Fish } from 'lucide-react'   // ligne 6
import { getProfileCatches, type ProfileCatch } from '@/lib/catches/media'  // ligne 16
```

`SPECIES_LABELS` et `format`/`fr` étaient déjà présents — réutilisés dans `ProfileCatchTile`.

### 2. Appel de données (ligne 121, après `attachPostMedia`)

```ts
const catches = await getProfileCatches(profile.id, supabase, 12)
```

Passe le client `supabase` SSR courant. `getProfileCatches` lit `catches_for_viewer`
(jamais la table brute), filtre `.neq('privacy', 'private')`, et signe les URLs Storage
via `service_role` (repli viewer en dev).

### 3. Section `<section>` Prises (avant la section Posts, ligne ~194)

- Titre mono uppercase « Prises » cohérent avec « Posts ».
- Message vide bifurqué sur `isMe` (déjà calculé ligne 50) :
  - Propriétaire : invite à loguer.
  - Visiteur : message neutre.
- Grille `grid-cols-3 sm:grid-cols-4` de `ProfileCatchTile`.

### 4. Composant local `ProfileCatchTile` (après `HeroChip`, ligne ~248)

- Tuile `aspect-square` avec photo ou icône `Fish` fallback.
- Bandeau bas : espèce (`SPECIES_LABELS`) + taille en `font-mono`.
- Date formatée `d MMM yyyy` via `date-fns/fr`.
- `Link href="/carnet/[id]"` — la fiche prise gère auth + privacy côté serveur.
- `eslint-disable-next-line @next/next/no-img-element` sur le `<img>` (pas de domaine Storage
  configurable statiquement dans `next.config.ts` pour les URLs Supabase signées).

---

## Invariants préservés

| Invariant | Comment préservé |
|---|---|
| RLS jamais contournée | Lecture via `catches_for_viewer` (vue `security_invoker`), pas la table `catches` directe. |
| Floutage GPS | `getProfileCatches` ne sélectionne pas `geom` / `geom_visible` — aucune coordonnée exposée. |
| Privacy prises | `.neq('privacy', 'private')` dans `getProfileCatches` + filtres WHERE de la vue pour `friends` (abonnés seulement). |
| Gating de tier | La section Prises n'expose aucune donnée de spot ni de coordonnée GPS — aucun gating de tier requis ici. |
| Modèle social unilatéral | Les prises `friends` d'autrui sont visibles si `follower_id = auth.uid()` suit l'auteur (géré par la vue, pas de code ajouté). |

---

## Avant / après

| Avant | Après |
|---|---|
| Compteur `publicCatches` affiché dans le hero (chiffre mort) | Chiffre hero inchangé + grille de tuiles de prises cliquables |
| `getProfileCatches` existait dans `lib/catches/media.ts` mais n'était jamais appelée depuis ce fichier | Appelée après `attachPostMedia`, résultat rendu dans la section Prises |
| Aucun composant `ProfileCatchTile` | Composant local ajouté après `HeroChip` |
