# Sprint 17 — Brief d'exécution
## Cohérence produit & social (brancher ce qui est déconnecté)

> Rédigé le 2026-06-22, réécrit le 2026-06-22 pour exploiter les connecteurs (cf `CLAUDE.md` §20) et ancrer les faits sur le schéma live. Durée : 2 semaines.
> Contexte : `docs/audits/AUDIT-COHERENCE-2026-06-22.md`. Le produit a une plomberie solide mais **des objets qui ne se rencontrent jamais** (la prise et le social) et **des promesses qui mènent dans le vide**. Presque tout ici est du **branchement**, pas de la construction.

> ✅ **Faits vérifiés en prod le 2026-06-22 via le connecteur Supabase (read-only)** — à re-confirmer par supabase-guard au lancement, le repo bouge :
> - **Dernière migration appliquée = `036_avatars_storage`** → les prochains numéros libres sont **037, 038** (et non `0NN`). Gap connu 025-027 non tracké, sans impact sur la suite.
> - **Bug policy confirmé** : `reports_select_own_or_mod` filtre sur **`profiles.is_ambassador`** (faux), alors que `reports_update_moderator` utilise déjà la fonction **`is_moderator()`**. Le fix du Bloc C est réel.
> - **Table `notifications` confirmée absente** → le Bloc B la crée bien.
> - `is_moderator` ET `is_ambassador` existent sur `profiles` ; une fonction `is_moderator()` existe. Le fix C est **purement une policy**, pas une colonne.

**Préalable avant de démarrer** (manuel John) :
1. Repo stable, suite verte. (Numéros de migration libres confirmés : 037, 038.)
2. **Décision produit attendue** (Bloc E) : modèle social = **« abonnés »** (public, façon Insta — actuel) **ou** **« amis mutuels »** (documenté) ? `⚠️ DEMANDER À JOHN AVANT` de coder E.

---

## 🚀 Ligne de lancement (à copier-coller par John)

> ultracode — effort xhigh. Exécute `docs/sprint-17/BRIEF.md`. Lance A, D, F en parallèle dès maintenant ; B et C (migrations) via le sous-agent **supabase-guard** après lecture du schéma live ; E après la décision John. **Câblé connecteurs (CLAUDE.md §20)** : toute la base passe par **supabase-guard** (lecture RLS d'abord, migrations en fichiers 037/038, regen `lib/types.ts`, `get_advisors` à la fin) ; avant toute lib (Realtime, recherche) → **docs-researcher** ; QA réelle → **qa-chrome**. Termine par **`/verif-sprint`**. Ne push pas. **Docker dispo si besoin** (`supabase start`) — optionnel, utile pour jouer 037/038 en local d'abord. **Effort maximal, très attentif et critique** : vérifie le vrai code (le repo bouge — un autre agent y travaille), passe adversariale (RLS, floutage GPS, gating). Invariants : RLS d'abord sur toute table, jamais d'accès brut à la place d'une vue `*_for_viewer`, régénère `lib/types.ts` après migration.

## ⚙️ Environnement & posture d'exécution (transverse — exigence John 2026-06-21)

**Docker disponible** (optionnel, seulement si nécessaire — ex. jouer une migration sensible en local avant la prod). **Effort maximal + esprit critique** : le brief est un guide ; vérifie chaque hypothèse contre le vrai code, remets-le en cause s'il se trompe, passe adversariale anti-régression (gating de tier, floutage GPS, RLS, SEO), `⚠️ DEMANDER À JOHN` plutôt qu'inventer.

## 🧠 Connecteurs & sous-agents (usage systématique — cf `CLAUDE.md` §20)

> Sprint à dominante **base de données** : on ne devine pas le schéma, on le **lit en live**. Délègue aux sous-agents pour garder le contexte principal propre.

| Quand | Sous-agent → connecteur | Pourquoi (ce que ça rend « intelligent ») |
|---|---|---|
| **A, B, C, E** (toute la base) | **supabase-guard** → Supabase (RO) | Confirmer colonnes/policies/vues AVANT de coder ; écrire 037/038 en **fichiers numérotés** ; RLS d'abord ; regen `lib/types.ts` ; `get_advisors` (security+perf) à la fin. |
| Avant **Realtime** (badge notif), **recherche** (pg_trgm/ilike) | **docs-researcher** → Context7 | API version-correcte (@supabase Realtime v2, pg_trgm) — pas de code de mémoire. |
| **A, D** (rendu réel multi-comptes) | **qa-chrome** → Claude in Chrome | Vérifier avec 2 comptes (prise privée d'autrui invisible, notif RLS, recherche) — preuves à l'appui. |
| Après déploiement (post-merge John) | **deploy-watch** → Vercel + Sentry | Confirmer que 037/038 + le code ne cassent rien en prod (rappel incident 2026-06-13 : code promu avant migration appliquée). |
| Clôture | **`/verif-sprint`** | Tests + build + lint + types + revue indépendante + passe anti-régression, en une commande. |

---

## Objectif du sprint en une phrase

Une prise publique **vit** (sur le profil de l'auteur), on **voit le carnet des autres**, les signalements et les follows **servent à quelque chose**, on peut **chercher un pêcheur**, et plus aucune promesse (surtout payante) ne ment.

## Workstreams & dépendances

| WS | Bloc | Durée | Dépend de | Parallèle J1 |
|----|------|-------|-----------|--------------|
| A | Carnet public sur le profil (le trou central) | 1 j | — (helpers déjà faits) | ✅ |
| B | Notifications in-app (migration **037**) | 3 j | schéma (supabase-guard) | ⚠️ après lecture schéma |
| C | Modération : page + fix policy (migration **038**) | 1,5 j | schéma (supabase-guard) | ⚠️ après lecture schéma |
| D | Recherche + découverte + nav | 2-3 j | — | ✅ |
| E | Cohérence onboarding↔profil + modèle social | 1,5 j | décision John | ⚠️ |
| F | Tarifs vs réalité (retirer/gater le vide) | 1 j | — | ✅ |
| VERIF | `/verif-sprint` + qa-chrome + supabase-guard (`get_advisors`) | 1 j | tous | ❌ (dernier) |

---

## Bloc A — Carnet public sur le profil 🔴 (le trou central)

LE branchement : aujourd'hui une prise publique ne s'affiche nulle part et on ne voit pas le carnet des autres (`/u/[username]` ne montre que des posts + un compteur mort). On ajoute une **section « Prises »** au profil. **Aucune migration** — `catches_for_viewer` gère déjà privacy + floutage.

> **Connecteurs** : **supabase-guard** confirme en lecture que la vue `catches_for_viewer` expose bien les colonnes du snippet A.1 (`id, species, size_cm, caught_at, technique, photo_path`) — ⚠️ la vue a été modifiée récemment (migration `034_catches_viewer_lnglat`), donc **vérifier le schéma réel, pas le brief**. **qa-chrome** valide le rendu avec 2 comptes (prise privée d'autrui invisible).
>
> ℹ️ A.1 et A.2 ont peut-être déjà été posés en working tree le 2026-06-22. **Vérifie leur présence avant de recréer** (Grep + supabase-guard). A.3 reste à faire (le fichier profil était en cours d'édition par un autre agent au moment de la rédaction).

### A.1 — `lib/catches/media.ts` (créer si absent)
```ts
import type { SupabaseClient } from '@supabase/supabase-js'

export type ProfileCatch = {
  id: string; species: string | null; size_cm: number | null
  caught_at: string | null; technique: string | null; photoUrl: string | null
}

export async function getProfileCatches(
  userId: string, viewer: SupabaseClient, limit = 12,
): Promise<ProfileCatch[]> {
  const { data } = await viewer
    .from('catches_for_viewer')
    .select('id, species, size_cm, caught_at, technique, photo_path')
    .eq('user_id', userId)
    .neq('privacy', 'private') // jamais les privées, même au proprio sur son profil public
    .order('caught_at', { ascending: false })
    .limit(limit)
  const rows = (data ?? []) as Array<ProfileCatch & { photo_path: string | null }>

  let signer: SupabaseClient = viewer
  try {
    const { createAdminClient } = await import('@/lib/supabase/admin')
    signer = createAdminClient() // service_role : un visiteur voit les photos d'autrui
  } catch { /* dev sans service_role → client viewer */ }

  const paths = [...new Set(rows.map((r) => r.photo_path).filter((p): p is string => Boolean(p)))]
  const signed = new Map<string, string>()
  if (paths.length > 0) {
    const { data: s } = await signer.storage.from('catches').createSignedUrls(paths, 3600)
    for (const it of s ?? []) if (it.path && it.signedUrl) signed.set(it.path, it.signedUrl)
  }
  return rows.map(({ photo_path, ...c }) => ({ ...c, photoUrl: photo_path ? (signed.get(photo_path) ?? null) : null }))
}
```
> ⚠️ **supabase-guard d'abord** : confirme que `catches_for_viewer` expose `photo_path` (et pas un nom différent depuis la migration 034) et que `privacy` y est lisible. Si la colonne a changé, adapte le `.select()`.

### A.2 — `carnet/[id]/page.tsx` : gater l'édition (faire si absent)
`isOwner` est déjà calculé. Envelopper le bloc « Modifier + `CatchActionsMenu` » par `{isOwner && ( … )}` → plus de boutons d'édition sur la prise d'un autre.

### A.3 — `app/(app)/u/[username]/page.tsx` : brancher la section
**Imports** : `import Link from 'next/link'` · `import { Fish } from 'lucide-react'` · `import { getProfileCatches, type ProfileCatch } from '@/lib/catches/media'`.
**Après** `const enriched = await attachPostMedia(posts, supabase)` :
```ts
const catches = await getProfileCatches(profile.id, supabase, 12)
```
**Dans le conteneur `max-w-[680px]`, AVANT `{/* Posts */}`** :
```tsx
{/* Prises — le carnet public de ce pêcheur */}
<section className="flex flex-col gap-3">
  <h2 className="font-mono text-[12px] font-medium uppercase tracking-[0.08em] text-ink-400">
    Prises{catches.length > 0 ? ` · ${catches.length}` : ''}
  </h2>
  {catches.length === 0 ? (
    <p className="text-[14px] text-ink-400">
      {isMe
        ? 'Tes prises publiques apparaîtront ici. Passe une prise en « Publique » pour la partager.'
        : 'Aucune prise publique pour l’instant.'}
    </p>
  ) : (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      {catches.map((c) => (<ProfileCatchTile key={c.id} c={c} />))}
    </div>
  )}
</section>
```
**Composant local** (à côté de `HeroChip`) :
```tsx
function ProfileCatchTile({ c }: { c: ProfileCatch }) {
  const species = SPECIES_LABELS[c.species ?? ''] ?? c.species ?? 'Prise'
  const dataLine = [species.toUpperCase(), c.size_cm ? `${c.size_cm} CM` : null].filter(Boolean).join(' · ')
  return (
    <Link href={`/carnet/${c.id}`} className="group relative block aspect-square overflow-hidden rounded-[14px] border border-sand-200 bg-navy-900">
      {c.photoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={c.photoUrl} alt={species} className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-105" />
      ) : (
        <div className="absolute inset-0 bg-gradient-to-br from-navy-800 to-navy-950">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_30%,rgba(94,234,212,.18),transparent_60%)]" />
          <Fish size={26} strokeWidth={1.6} className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-teal-300/70" aria-hidden="true" />
        </div>
      )}
      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-navy-950/85 to-transparent px-2.5 pt-6 pb-2">
        <p className="truncate font-mono text-[9.5px] font-medium tracking-[0.06em] text-teal-300">{dataLine}</p>
      </div>
    </Link>
  )
}
```
**Vérifier** que `/carnet/[id]` rend pour un non-propriétaire (oui : `getCatchById` passe par `catches_for_viewer`, édition gatée en A.2).

### Critères d'acceptation
- Sur `/u/<autre>`, je vois une **grille de ses prises publiques** (photos visibles via URL signée), cliquables vers la fiche prise (sans bouton Modifier).
- Une prise **privée** d'autrui n'apparaît jamais (vérifier en base via supabase-guard) ; mes propres prises privées n'apparaissent pas non plus sur mon profil public.
- Un follower voit en plus les prises `friends` de l'auteur ; un non-follower non. (qa-chrome avec 2 comptes.)

### Garde-fous
- ⚠️ Ne JAMAIS requêter `catches` brut pour autrui — toujours `catches_for_viewer` (floutage + privacy). Pas de fuite GPS.
- (Option, si le temps) onglet « Prises près de toi » dans le fil = vrai flux de prises publiques par département — ce qui donne tout son sens à « passer une prise en public ». À cadrer séparément si gros.

## Bloc B — Notifications in-app 🔴 (migration 037)

Aucune notif n'existe (audit #2, **confirmé live : table `notifications` absente**) ; un like/commentaire/follow ne prévient personne, et « notifications push » est **vendu** (Local). On construit le **minimum in-app** (le push reste backlog natif).

> **Connecteurs** : **supabase-guard** écrit la migration `037`, RLS d'abord, regen types ; **docs-researcher** confirme l'API Realtime (`@supabase/supabase-js` v2) si tu veux le badge en temps réel.

### Tâches
1. **supabase-guard** → migration **`037_notifications.sql`** : table `notifications` (`id`, `user_id` destinataire, `type` enum `like|comment|follow`, `actor_id`, `post_id?`, `read_at?`, `created_at`), **RLS d'abord** (lecture/maj = destinataire only). Écriture applicative depuis `toggleLike`/`addComment`/`toggleFollow` (`app/actions/feed.ts`, `follow.ts`).
2. UI : badge de compteur (cloche dans `AppHeader`/`TabBar`) + page/feuille `/notifications` listant les notifs (groupées, marquage lu).
3. **supabase-guard** → régénérer `lib/types.ts` après application.

### Critères d'acceptation
- Un like/commentaire/follow crée une notif chez le destinataire ; le badge s'incrémente (realtime ou au refetch) ; ouvrir la liste marque lu.
- Un utilisateur ne lit **que** ses notifs (RLS, vérifié par supabase-guard). Pas de notif pour ses propres actions.

### Garde-fous
- RLS avant policies. Anti-bruit : pas de notif si l'acteur = destinataire.

## Bloc C — Modération : surface + fix policy 🔴 (migration 038)

Les `reports` partent dans le vide (audit #3). **Bug confirmé live le 2026-06-22** : `reports_select_own_or_mod` filtre sur `profiles.is_ambassador = true` alors que `reports_update_moderator` utilise déjà la fonction `is_moderator()`. Incohérence à corriger.

> **Connecteurs** : **supabase-guard** a déjà lu les policies (voir l'encart de faits en tête de brief) — re-confirme avant d'écrire, puis migration `038`.

### Tâches
1. **supabase-guard** → migration **`038_moderation_reports_policy.sql`** : remplacer dans `reports_select_own_or_mod` le test `profiles.is_ambassador` par la **fonction `is_moderator()`** (pour rester cohérent avec `reports_update_moderator`). Vérifier la cohérence avec la migration `023_moderation`.
2. Page `/moderation` (réservée `is_moderator()`) : liste des `reports` `status='pending'` avec lien vers le post, actions « ignorer » / « supprimer le post » (réutiliser `moderatorDeletePost`), passage du report en `resolved`.
3. **supabase-guard** → régénérer `lib/types.ts`.

### Critères d'acceptation
- Un modérateur voit la file des signalements et peut résoudre depuis là ; un non-modérateur n'accède pas à `/moderation` ni ne lit `reports` (vérifié par supabase-guard : la SELECT policy vise bien `is_moderator()` après 038).

## Bloc D — Recherche, découverte & navigation 🟠

Audit #9-10-12 : aucune recherche, `/follows` et le Fil mal reliés à la nav.

> **Connecteurs** : **docs-researcher** pour la recherche texte (pg_trgm / `ilike` / `websearch_to_tsquery` selon le choix) ; **supabase-guard** confirme l'index dispo sur `profiles.username` (pg_trgm déjà en place ?) ; **qa-chrome** valide qu'on trouve un pêcheur sans le croiser dans le fil.

### Tâches
1. **Recherche** de pêcheurs par pseudo (au minimum) : champ + résultats (route `/recherche` ou modale). Optionnel : spots. (Confirmer l'index trigram via supabase-guard avant de coder la requête.)
2. **Découverte** enrichie sur `/follows` (« récemment actifs », par espèce/technique), pas seulement les 5 suggestions du même département.
3. **Nav** : ajouter « Mes pêcheurs » (`/follows`) et « Fil régional » au `UserMenu` (`components/layout/UserMenu.tsx`) + s'assurer que `/follows` est joignable depuis l'app, pas seulement via un état vide.

### Critères d'acceptation
- Je peux trouver un pêcheur par pseudo sans le croiser dans le fil.
- Depuis le menu (même sur une page marketing connecté), j'atteins le Fil et mes pêcheurs.

## Bloc E — Cohérence onboarding↔profil + modèle social 🟠 (⚠️ décision John d'abord)

> **Connecteurs** : si « amis mutuels » est choisi, **supabase-guard** modifie la RLS `catches_select_friends` (réciprocité) en migration — RLS d'abord, regen types. Sinon, pas de migration.

### Tâches
1. **Centraliser** les listes (value+label) techniques/espèces/fréquence/niveau dans `lib/labels.ts` ; faire pointer onboarding ET profil dessus (corrige les libellés de fréquence divergents).
2. **Aligner** : regex username identique, `years_practicing` éditable au profil, **zod partagé** côté serveur pour l'onboarding (actuellement `update` brut), `≥1` technique/espèce exigé aussi au profil.
3. **Modèle social** (selon décision John) : « abonnés » → aligner copy/doc/schéma sur l'unidirectionnel actuel ; OU « amis mutuels » → ajouter la réciprocité dans la RLS `catches_select_friends` (via supabase-guard) + l'UI.

### Critères d'acceptation
- Mêmes libellés partout ; `jean.pecheur` accepté (ou refusé) de façon identique inscription/édition ; années de pratique modifiables ; onboarding rejette les valeurs hors enum.
- Copy « abonnés/amis » cohérente avec le comportement réel.

## Bloc F — Tarifs vs réalité 🔴 (avant pub LIVE)

Audit #4-5-6. Pour chaque promesse : **livrer un MVP crédible OU retirer le bullet**. Tranché par défaut = **retirer/requalifier** maintenant, livrer plus tard.
1. **Offline** (carte+marées) : retirer des 3 emplacements (`tarifs/pricing-cards.tsx:44`, home `:522`, `:537`) tant que le SW ne cache pas les données (cf. Sprint 16 ne l'inclut pas).
2. **Bathy « SHOM »** → requalifier en « profondeur (EMODnet) » et/ou gater ; **« itinéraires multi-spots »** → retirer « multi-spots » (mono-destination aujourd'hui).
3. **« Stats avancées »** : soit gater réellement `CatchStatsDetailed` derrière le tier, soit retirer du plan Local.
4. **Notifications push** : retirer la mention « push » tant que c'est in-app only (Bloc B).

> **Connecteurs** : **qa-chrome** relit les 3 emplacements en live (preview) pour confirmer qu'aucune promesse retirée ne traîne ; **docs-researcher** pour vérifier la source EMODnet si tu requalifies la bathy.

### Critères d'acceptation
- Aucune ligne de tarif ne décrit une capacité absente ou déjà gratuite.

## Workstream VERIF (obligatoire, agent indépendant)

1. Lance **`/verif-sprint`** : `pnpm test` + `pnpm build` + `pnpm typecheck` + `pnpm lint` verts, revue croisée indépendante du diff contre ce brief, passe anti-régression.
2. Cocher A→F avec preuve (URL, requête SQL via supabase-guard : prise privée d'autrui invisible sur le profil ; report lu par modérateur seulement ; notif RLS).
3. **supabase-guard `get_advisors`** (security + perf) : nouvelles tables (`notifications`) → RLS d'abord, zéro nouvelle alerte ; aucune fuite GPS via la grille de prises ; policy `reports` bien sur `is_moderator()` après 038.
4. **qa-chrome** : passe copy en live (tutoiement, tarifs honnêtes, aucune promesse mensongère) + rendu carnet public avec 2 comptes.
5. Après déploiement (post-merge John) : **deploy-watch** (Vercel + Sentry) — rappel incident 2026-06-13.
6. `docs/sprint-17/RECAP.md` : fait / comment tester / reste manuel John.

## Reste manuel John (post-sprint)
- Appliquer les migrations **037 + 038** en prod (CLI/Studio) **AVANT** de promouvoir le code + régénérer `lib/types.ts`. Vérifier le rendu du carnet public sur un vrai compte. Merge → `main` + déploiement. Lancer **deploy-watch** après le déploiement.
