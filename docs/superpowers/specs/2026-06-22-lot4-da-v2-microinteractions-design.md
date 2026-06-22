# Lot 4 (track Excellence) — Onboarding/Auth en DA v2 + micro-interactions du fil

> Date : 2026-06-22 · Branche : `sprint-14-home` (HEAD `026b4c7`, sprint 15) · Statut : design validé par John, prêt pour plan d'implémentation.

## 1. Contexte & objectif

Le track « Excellence » polit l'app pour un rendu premium cohérent (DA v2 « instrument de précision marine »). Lots 1 et 2 livrés et déployés. Lot 3 (fiche spot) reporté. **Lot 4** = finir la cohérence DA v2 sur les écrans **onboarding** et **auth** (les seuls non encore passés), et apporter trois **micro-interactions** au fil qui rendent l'app vivante : like animé, press states, commentaire optimiste affichant la vraie identité.

Constat d'exploration : onboarding/auth sont déjà ~92 % conformes (Lot 1 a fait le gros). Les corrections restantes sont **cosmétiques et à très bas risque**. Côté fil, le like est déjà optimistic, l'identité du viewer **descend déjà** jusqu'à `FeedClient` — donc pas de plomberie serveur à inventer.

## 2. Périmètre

**IN** : les 3 points du Lot 4 + corrections DA v2 incidentes rencontrées dans les mêmes fichiers (cœur hors-token, `hover:bg-slate-50` hors-token).
**OUT** : Lot 3 (fiche spot), tout refactor non lié, l'ombre bleue de marqueur carte (`globals.css:199`, hors sujet), l'emoji du sujet d'email de bienvenue (charte email, hors sujet).

## 3. Bloc A — Onboarding + Auth en DA v2

Risque : **très bas** (HTML/CSS uniquement, zéro logique métier touchée).

### Couleurs d'erreur → token coral
`text-red-600` et `text-destructive` → `text-coral-500` :
- `app/auth/login/page.tsx` : 88, 408, 492, 575, 597, 665
- `app/auth/reset-password/page.tsx` : 123
- `app/(app)/onboarding/[step]/onboarding-step.tsx` : 148, 576 (`text-destructive`)

### Ombres inline → tokens existants
`boxShadow: "0 6px 24px rgba(10,47,61,.14)"` (et variantes) → `var(--shadow-sm)` ; la grosse ombre du CTA final (step 6) → `var(--shadow-lg)`. Tokens déjà définis (`globals.css:59-60`).
- `app/auth/login/page.tsx` : 123, 347
- `app/auth/reset-password/page.tsx` : 25, 88
- `app/(app)/onboarding/[step]/onboarding-step.tsx` : 618 (CTA → `--shadow-lg`), 676 (SubmitButton → `--shadow-sm`, garder `none` quand disabled)

### Chiffres métier → font-mono
- `onboarding-step.tsx:331` : `{Math.round((step/totalSteps)*100)}%` → wrapper `<span className="font-mono">`.
- `onboarding-step.tsx:596` : input « années de pratique » → ajouter `font-mono` à la className.

### Symboles texte → icônes lucide
- `auth/login/page.tsx:143` : `✓ Pseudo disponible` → `<Check size={13} />` (déjà importé) + texte.
- `auth/login/page.tsx:380` : `← Retour à la connexion` → `<ChevronLeft size={16} />` + « Retour à la connexion ».
- `onboarding/fini/page.tsx:177` : `Ouvrir mon carnet →` → texte + `<ArrowRight size={16} />`.

## 4. Bloc B — Like animé + press states

Risque : **bas**.

### Like animé (pop + halo discret)
Fichier : `components/feed/PostCard.tsx` (bouton like ~l.296-305 ; optimistic déjà en place l.158-171).
- Couleur on-token : `fill-red-500 text-red-500` → `fill-coral-500 text-coral-500`.
- Keyframe `like-pop` dans `globals.css` : `scale(1) → scale(1.25) → scale(1)`, ~250 ms, cubic-bezier déjà utilisé dans le fichier. Halo : un élément frère (pseudo-anneau coral) qui `scale + fade-out` une fois.
- **Déclenchement** : un flag d'animation armé **uniquement dans le `onClick` local** (puis désarmé après la durée). **Jamais** sur tout changement de l'état `liked` — sinon les échos Realtime des autres re-déclenchent l'anim (double-flash).
- **`prefers-reduced-motion: reduce`** : pas d'anim (transition de couleur seule). Suit le pattern déjà présent dans `globals.css`.

### Press states
Ajouter un retour tactile sur les boutons d'action du fil :
- Gros boutons (like, commentaires, soumettre commentaire, suivre) : `active:scale-95`.
- Petits boutons ronds (signaler, partager, supprimer commentaire) : `active:opacity-70` (évite les sauts de layout).
- Fichiers : `PostCard.tsx`, `FollowButton.tsx`, `CommentThread.tsx`.
- Bonus DA : `hover:bg-slate-50` → `hover:bg-ink-50` (hors-token) là où présent.

## 5. Bloc C — Commentaire optimiste avec vraie identité

Risque : **moyen** (flux de données), mais **dé-risqué** : l'identité existe déjà en amont.

État actuel : `components/feed/CommentThread.tsx` (lazy-loadé) crée un commentaire optimiste avec `author_display_name: 'Toi'`, `author_username: null`, `author_avatar_url: null` (l.71-80), puis refetch tous les commentaires.

Fait acquis : `app/(app)/fil/[department]/page.tsx` construit déjà `currentUser = { id, username, display_name, avatar_url }` (l.69-73) et le passe à `<FeedClient currentUser=… />` (l.114).

Plan :
1. Propager la prop `currentUser` (type `{ id: string; username: string | null; display_name: string | null; avatar_url: string | null }`) de `FeedClient` → `PostList` → `PostCard` → `CommentThread`. (Vérifier le même besoin pour `/u/[username]` et tout autre point qui rend `PostCard`/`CommentThread` ; brancher `currentUser` partout où `PostCard` est rendu, sinon fallback propre.)
2. Dans `CommentThread`, construire l'optimiste avec les vraies valeurs de `currentUser` au lieu de `'Toi'`/null. Le refetch existant réconcilie via l'id temporaire (comportement inchangé).
3. Fallback : si `currentUser.display_name` ET `username` sont null (profil incomplet), garder « Toi » comme dernier recours — pas de plantage.

Pas d'hydration mismatch : la donnée traverse la frontière client en prop pure (sérialisable), comme le reste de `currentUser`.

## 6. Bloc D — Vérification & anti-régression

- `pnpm typecheck` OK ; `pnpm lint` clean ; suite **Vitest verte** ; `pnpm build` OK.
- Passe adversariale :
  - **Like** : pas de double-comptage ni double-flash sur écho Realtime (le flag d'anim est local au clic).
  - **Commentaire** : l'optimiste affiche la vraie identité ; le refetch ne crée pas de doublon ; profil incomplet → fallback « Toi ».
  - **Auth/onboarding** : écrans intacts (validation form, navigation, server actions inchangées) ; messages d'erreur coral lisibles sur fond clair (contraste AA).
  - **a11y** : `prefers-reduced-motion` respecté ; icônes lucide porteuses d'info avec `aria-label`/texte.
- Tests : ajuster/ajouter un test sur la construction de l'optimiste avec identité si la logique est extractible ; sinon couverture via les tests `feed` existants.

## 7. Critères d'acceptation

1. Aucune occurrence de `text-red-600`/`text-destructive` ni de `boxShadow` inline non-tokenisé dans les 4 fichiers onboarding/auth visés.
2. % de progression et années de pratique rendus en `font-mono` ; `✓ ← →` remplacés par des icônes lucide.
3. Le like joue le pop + halo coral au clic local, jamais sur écho Realtime, et rien sous `prefers-reduced-motion`.
4. Tous les boutons d'action du fil ont un press state.
5. Un commentaire posté apparaît instantanément avec le **vrai** pseudo/avatar de l'utilisateur.
6. Gate vert (typecheck, lint, Vitest, build) ; aucune régression sur auth/onboarding/fil.

## 8. Fichiers touchés (prévision)

- `app/globals.css` (keyframe `like-pop` + halo)
- `app/auth/login/page.tsx`, `app/auth/reset-password/page.tsx`
- `app/(app)/onboarding/[step]/onboarding-step.tsx`, `app/(app)/onboarding/fini/page.tsx`
- `components/feed/PostCard.tsx`, `components/feed/CommentThread.tsx`, `components/feed/FollowButton.tsx`, `components/feed/FeedClient.tsx`, `components/feed/PostList.tsx`
- Points secondaires rendant `PostCard` (ex. `app/(app)/u/[username]/page.tsx`) pour propager `currentUser`.
    