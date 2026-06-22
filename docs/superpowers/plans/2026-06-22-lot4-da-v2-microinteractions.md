# Lot 4 — Onboarding/Auth DA v2 + micro-interactions du fil — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Finir la cohérence DA v2 sur onboarding/auth et rendre le fil vivant (like animé, press states, commentaire optimiste avec la vraie identité).

**Architecture:** Surtout du cosmétique à bas risque (swaps de tokens, icônes lucide, `font-mono`). Deux changements de comportement isolés côté fil : une animation CSS de like déclenchée *uniquement au clic local*, et le passage de l'identité du viewer (`ComposerUser`, déjà construite côté serveur) jusqu'à `CommentThread` pour un commentaire optimiste fidèle.

**Tech Stack:** Next.js 15 (App Router), React 19, Tailwind v4 (CSS-first @theme), lucide-react, Vitest.

## Global Constraints

- DA v2 : bordures plutôt qu'ombres ; ombres uniquement via `var(--shadow-sm)` / `var(--shadow-lg)` (définis `app/globals.css:59-60`). Tokens couleur via `--color-*` / utilitaires Tailwind tokenisés (`coral-500`, `ink-*`, `teal-*`…), jamais de couleurs brutes (`red-*`, `slate-*`, `destructive`).
- Tout chiffre métier en `font-mono`.
- Icônes = lucide-react (pas d'emoji ni symbole texte porteur d'info).
- `prefers-reduced-motion: reduce` : aucune animation décorative.
- Token coral canonique : `var(--color-coral-500)` = `#E5604F`.
- Type identité réutilisé : `ComposerUser` de `components/feed/PostComposer.tsx` = `{ id: string; username: string | null; display_name: string | null; avatar_url: string | null }`.
- Commits : Conventional Commits, préfixe `feat(excellence-lot4):` ou `style(excellence-lot4):`. Stager **explicitement** les fichiers (jamais `git add -A` ; `CLAUDE.md` et `.gitignore` ont des modifs locales à NE PAS committer).
- Ne pas pousser (John pousse).

---

## File Structure

- `app/globals.css` — keyframes `like-pop` + `like-halo` + garde reduced-motion (nouveau bloc).
- `components/feed/PostCard.tsx` — anim like, couleur on-token, press states, `font-mono` compteurs, nouvelle prop `currentUser`.
- `components/feed/CommentThread.tsx` — prop `currentUser`, optimiste avec vraie identité, press states.
- `components/feed/FollowButton.tsx` — press state.
- `components/feed/FeedClient.tsx` — passe `currentUser` à `PostCard`.
- `components/feed/PostList.tsx` — accepte + passe `currentUser`.
- `app/(app)/u/[username]/page.tsx` — fournit `currentUser` à `PostCard`/`PostList`.
- `lib/feed/optimistic-comment.ts` (nouveau) — helper pur testable `buildOptimisticComment`.
- `lib/feed/optimistic-comment.test.ts` (nouveau) — test du helper.
- `app/auth/login/page.tsx`, `app/auth/reset-password/page.tsx` — tokens DA v2.
- `app/(app)/onboarding/[step]/onboarding-step.tsx`, `app/(app)/onboarding/fini/page.tsx` — tokens DA v2.

---

## Task 1 : Keyframes du like (CSS infra)

**Files:**
- Modify: `app/globals.css` (ajout après les keyframes existants, ~zone `@keyframes nearby-ping`/`exceptional-ping`)

**Interfaces:**
- Produces: classes `.animate-like-pop` et `.animate-like-halo` (consommées par Task 2).

- [ ] **Step 1 : Ajouter les keyframes + garde reduced-motion**

Repérer la zone des `@keyframes` existants dans `app/globals.css` (chercher `@keyframes nearby-ping`) et ajouter à la suite :

```css
/* Like (Lot 4) — pop discret + halo coral, déclenchés au clic local uniquement */
@keyframes like-pop {
  0%   { transform: scale(1); }
  35%  { transform: scale(1.3); }
  70%  { transform: scale(0.92); }
  100% { transform: scale(1); }
}
@keyframes like-halo {
  0%   { transform: scale(0.5); opacity: 0.5; }
  100% { transform: scale(2.2); opacity: 0; }
}
.animate-like-pop {
  animation: like-pop 320ms cubic-bezier(0.2, 0.8, 0.2, 1);
}
.animate-like-halo {
  background: radial-gradient(circle, var(--color-coral-500) 0%, transparent 70%);
  animation: like-halo 450ms ease-out forwards;
}
@media (prefers-reduced-motion: reduce) {
  .animate-like-pop { animation: none; }
  .animate-like-halo { display: none; }
}
```

- [ ] **Step 2 : Vérifier que le build CSS passe**

Run: `pnpm typecheck` (sanity — pas d'erreur de parse côté app) puis visuellement plus tard.
Expected: pas d'erreur.

- [ ] **Step 3 : Commit**

```bash
git add app/globals.css
git commit -m "style(excellence-lot4): keyframes like-pop + halo (reduced-motion safe)"
```

---

## Task 2 : Like animé + on-token + press states + compteurs mono (PostCard)

**Files:**
- Modify: `components/feed/PostCard.tsx`

**Interfaces:**
- Consumes: `.animate-like-pop`, `.animate-like-halo` (Task 1) ; `cn` (déjà importé).
- Produces: rien de nouveau pour les autres tasks (la prop `currentUser` arrive en Task 5).

- [ ] **Step 1 : Ajouter l'état d'animation**

Dans le corps de `PostCard`, près des autres `useState` (après `const [liked, setLiked] = ...`), ajouter :

```tsx
const [likePop, setLikePop] = useState(false)
```

- [ ] **Step 2 : Armer l'animation uniquement au clic local (pas sur écho Realtime)**

Dans `handleLike` (actuellement l.153-171), après `const next = !liked`, ajouter le déclenchement *uniquement quand on like* :

```tsx
const next = !liked
if (next) {
  setLikePop(false)
  // double rAF : garantit un reflow pour que l'animation rejoue à chaque like
  requestAnimationFrame(() => requestAnimationFrame(() => setLikePop(true)))
}
```

(Le reste de `handleLike` est inchangé. `likePop` n'est jamais touché par `usePostInteractionsRealtime` → pas de double-flash.)

- [ ] **Step 3 : Markup du bouton like (couleur on-token + pop + halo + compteur mono + press)**

Remplacer le bouton like actuel (l.296-305) par :

```tsx
<button
  type="button"
  onClick={handleLike}
  aria-pressed={liked}
  aria-label="Aimer"
  className="flex min-h-11 items-center gap-1.5 rounded-full px-2.5 text-[13px] transition-colors hover:bg-ink-50 active:scale-95 motion-reduce:active:scale-100"
>
  <span className="relative inline-flex">
    <Heart
      size={18}
      className={cn(
        liked && 'fill-coral-500 text-coral-500',
        likePop && 'animate-like-pop',
      )}
      onAnimationEnd={() => setLikePop(false)}
    />
    {likePop && (
      <span aria-hidden className="animate-like-halo pointer-events-none absolute inset-0 rounded-full" />
    )}
  </span>
  {likeCount > 0 && <span className="font-mono">{likeCount}</span>}
</button>
```

- [ ] **Step 4 : Press states + compteur mono sur les autres boutons d'action**

Sur le bouton commentaires (l.307-315) : ajouter `active:scale-95` à la className et envelopper le compteur en mono :
```tsx
className="flex min-h-11 items-center gap-1.5 rounded-full px-2.5 text-[13px] transition-colors hover:bg-ink-50 active:scale-95"
...
{commentCount > 0 && <span className="font-mono">{commentCount}</span>}
```
Sur Signaler (l.317-327) et Partager (l.329-336) : remplacer `hover:bg-slate-50` par `hover:bg-ink-50` et ajouter `active:opacity-70`.
Sur le trigger du menu (l.242) : remplacer `hover:bg-slate-100` par `hover:bg-ink-100` et ajouter `active:opacity-70`.

- [ ] **Step 5 : Vérifier**

Run: `pnpm typecheck`
Expected: PASS (aucune erreur de type).

- [ ] **Step 6 : Commit**

```bash
git add components/feed/PostCard.tsx
git commit -m "feat(excellence-lot4): like animé (pop+halo coral) + press states + compteurs mono"
```

---

## Task 3 : Press states (FollowButton + CommentThread)

**Files:**
- Modify: `components/feed/FollowButton.tsx`
- Modify: `components/feed/CommentThread.tsx`

- [ ] **Step 1 : FollowButton**

Ajouter `active:scale-95` à la className du bouton (là où sont déjà `transition-colors disabled:opacity-60`). Conserver tout le reste.

- [ ] **Step 2 : CommentThread — bouton envoyer + supprimer**

Bouton envoyer (l.182-190) : ajouter `active:scale-95` ; remplacer `border-slate-200` de l'input (l.180) par `border-ink-200`.
Bouton supprimer (l.143-150) : remplacer `hover:text-red-500` par `hover:text-coral-500` et ajouter `active:opacity-70`.

- [ ] **Step 3 : Vérifier**

Run: `pnpm typecheck`
Expected: PASS.

- [ ] **Step 4 : Commit**

```bash
git add components/feed/FollowButton.tsx components/feed/CommentThread.tsx
git commit -m "feat(excellence-lot4): press states fil (follow, commentaire) + tokens"
```

---

## Task 4 : Helper optimiste avec vraie identité (TDD)

**Files:**
- Create: `lib/feed/optimistic-comment.ts`
- Test: `lib/feed/optimistic-comment.test.ts`

**Interfaces:**
- Consumes: `FeedComment` (de `@/app/actions/feed`), `ComposerUser` (de `@/components/feed/PostComposer`).
- Produces: `buildOptimisticComment(currentUser: ComposerUser, text: string, tempId: string): FeedComment` (consommé en Task 5).

- [ ] **Step 1 : Écrire le test qui échoue**

```ts
// lib/feed/optimistic-comment.test.ts
import { describe, it, expect } from 'vitest'
import { buildOptimisticComment } from './optimistic-comment'

const base = { id: 'u1', username: 'jean', display_name: 'Jean', avatar_url: 'https://x/a.webp' }

describe('buildOptimisticComment', () => {
  it('reprend la vraie identité du viewer', () => {
    const c = buildOptimisticComment(base, 'salut', 'temp-1')
    expect(c).toMatchObject({
      id: 'temp-1',
      text: 'salut',
      author_id: 'u1',
      author_username: 'jean',
      author_display_name: 'Jean',
      author_avatar_url: 'https://x/a.webp',
    })
    expect(typeof c.created_at).toBe('string')
  })

  it('garde un libellé de repli quand le profil est incomplet', () => {
    const c = buildOptimisticComment({ id: 'u2', username: null, display_name: null, avatar_url: null }, 'hey', 'temp-2')
    expect(c.author_display_name).toBe('Toi')
    expect(c.author_username).toBeNull()
  })
})
```

- [ ] **Step 2 : Lancer le test → échec**

Run: `pnpm vitest run lib/feed/optimistic-comment.test.ts`
Expected: FAIL (`buildOptimisticComment` introuvable).

- [ ] **Step 3 : Implémenter**

```ts
// lib/feed/optimistic-comment.ts
import type { FeedComment } from '@/app/actions/feed'
import type { ComposerUser } from '@/components/feed/PostComposer'

/** Construit le commentaire affiché immédiatement (optimiste) avec l'identité
 *  réelle du viewer. Repli « Toi » si le profil n'a ni nom ni pseudo. */
export function buildOptimisticComment(
  currentUser: ComposerUser,
  text: string,
  tempId: string,
): FeedComment {
  return {
    id: tempId,
    text,
    created_at: new Date().toISOString(),
    author_id: currentUser.id,
    author_username: currentUser.username,
    author_display_name: currentUser.display_name || currentUser.username || 'Toi',
    author_avatar_url: currentUser.avatar_url,
  }
}
```

- [ ] **Step 4 : Lancer le test → succès**

Run: `pnpm vitest run lib/feed/optimistic-comment.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 5 : Commit**

```bash
git add lib/feed/optimistic-comment.ts lib/feed/optimistic-comment.test.ts
git commit -m "feat(excellence-lot4): helper commentaire optimiste avec vraie identité (+test)"
```

---

## Task 5 : Brancher l'identité jusqu'à CommentThread

**Files:**
- Modify: `components/feed/CommentThread.tsx`
- Modify: `components/feed/PostCard.tsx`
- Modify: `components/feed/FeedClient.tsx`
- Modify: `components/feed/PostList.tsx`
- Modify: `app/(app)/u/[username]/page.tsx`

**Interfaces:**
- Consumes: `buildOptimisticComment` (Task 4), `ComposerUser`.
- Produces: prop `currentUser?: ComposerUser | null` sur `PostCard` et `PostList`.

- [ ] **Step 1 : CommentThread accepte `currentUser`**

Changer la signature (l.19-25) :
```tsx
import { buildOptimisticComment } from '@/lib/feed/optimistic-comment'
import type { ComposerUser } from './PostComposer'
// ...
export function CommentThread({
  postId,
  currentUser,
}: {
  postId: string
  currentUser: ComposerUser | null
}) {
  const currentUserId = currentUser?.id ?? null
```
Dans `handleAdd` (l.65-94), remplacer la création de l'optimiste par :
```tsx
const value = text.trim()
if (!value || !currentUser) return
const tempId = `temp-${crypto.randomUUID()}`
const optimistic = buildOptimisticComment(currentUser, value, tempId)
```
(Le reste — push optimiste, `addComment`, rollback, `load` — est inchangé ; `currentUserId` reste utilisé pour le bouton supprimer et la gating de l'input.)

- [ ] **Step 2 : PostCard reçoit + transmet `currentUser`**

Ajouter à la signature de `PostCard` (après `currentUserId`) :
```tsx
currentUser = null,
// ...
currentUser?: ComposerUser | null
```
avec `import type { ComposerUser } from './PostComposer'`.
Mettre à jour le rendu de `CommentThread` (l.340) :
```tsx
<CommentThread
  postId={postId}
  currentUser={currentUser ?? (currentUserId ? { id: currentUserId, username: null, display_name: null, avatar_url: null } : null)}
/>
```
(Repli sûr : si un appelant ne fournit pas encore `currentUser`, le comportement « Toi » est conservé — aucune régression.)

- [ ] **Step 3 : FeedClient passe `currentUser`**

Dans le `.map` (l.136-144), ajouter la prop :
```tsx
<PostCard
  key={p.id}
  post={p}
  currentUserId={currentUserId}
  currentUser={currentUser}
  viewerIsModerator={viewerIsModerator}
  catchPhotoUrl={p.catchPhotoUrl}
  photoUrls={p.photoUrls}
  onDeleted={handleDeleted}
/>
```
(`currentUser` est déjà une prop de `FeedClient`, type `ComposerUser`.)

- [ ] **Step 4 : PostList accepte + passe `currentUser`**

Lire `components/feed/PostList.tsx`. Ajouter une prop `currentUser?: ComposerUser | null` (à côté de `currentUserId`), `import type { ComposerUser } from './PostComposer'`, et la transmettre au `<PostCard ... currentUser={currentUser} />`.

- [ ] **Step 5 : u/[username] fournit l'identité du viewer**

Lire `app/(app)/u/[username]/page.tsx`. Identifier comment le viewer est obtenu. Construire (s'il n'existe pas déjà) le profil viewer comme dans `app/(app)/fil/[department]/page.tsx:63-73` :
```tsx
const { data: viewerProfile } = await supabase
  .from('profiles')
  .select('username, display_name, avatar_url')
  .eq('id', viewerId)
  .single()
const currentUser = viewerId
  ? { id: viewerId, username: viewerProfile?.username ?? null, display_name: viewerProfile?.display_name ?? null, avatar_url: viewerProfile?.avatar_url ?? null }
  : null
```
puis passer `currentUser={currentUser}` au `PostCard`/`PostList` rendu sur cette page. Si le viewer n'est pas connecté, `currentUser = null` (repli « Toi » jamais atteint car l'input de commentaire est masqué hors connexion).

- [ ] **Step 6 : Vérifier**

Run: `pnpm typecheck && pnpm vitest run lib/feed/optimistic-comment.test.ts`
Expected: PASS.

- [ ] **Step 7 : Commit**

```bash
git add components/feed/CommentThread.tsx components/feed/PostCard.tsx components/feed/FeedClient.tsx components/feed/PostList.tsx "app/(app)/u/[username]/page.tsx"
git commit -m "feat(excellence-lot4): commentaire optimiste avec la vraie identité du viewer"
```

---

## Task 6 : Auth en DA v2

**Files:**
- Modify: `app/auth/login/page.tsx`
- Modify: `app/auth/reset-password/page.tsx`

- [ ] **Step 1 : login — couleurs, ombres, symboles**

Dans `app/auth/login/page.tsx` :
- `text-red-600` → `text-coral-500` (l.88, 408, 492, 575, 597, 665).
- `boxShadow: "0 6px 24px rgba(10,47,61,.14)"` (l.123) et `boxShadow: "0 4px 24px rgba(10,47,61,.06)"` (l.347) → `boxShadow: "var(--shadow-sm)"`.
- l.143 `✓ Pseudo disponible` → `<Check size={13} className="text-teal-600" />` + texte (`Check` déjà importé).
- l.380 `← Retour à la connexion` → `<ChevronLeft size={16} />` + « Retour à la connexion » (importer `ChevronLeft` de lucide-react ; mettre l'icône `aria-hidden`).

- [ ] **Step 2 : reset-password**

Dans `app/auth/reset-password/page.tsx` :
- `boxShadow` l.25 → `var(--shadow-sm)` ; l.88 → `var(--shadow-sm)`.
- `text-red-600` l.123 → `text-coral-500`.

- [ ] **Step 3 : Vérifier**

Run: `pnpm typecheck`
Expected: PASS. (Vérifier visuellement plus tard : messages d'erreur coral lisibles.)

- [ ] **Step 4 : Commit**

```bash
git add app/auth/login/page.tsx app/auth/reset-password/page.tsx
git commit -m "style(excellence-lot4): auth en DA v2 (coral, ombres tokenisées, icônes lucide)"
```

---

## Task 7 : Onboarding en DA v2

**Files:**
- Modify: `app/(app)/onboarding/[step]/onboarding-step.tsx`
- Modify: `app/(app)/onboarding/fini/page.tsx`

- [ ] **Step 1 : onboarding-step — couleurs, ombres, mono**

Dans `app/(app)/onboarding/[step]/onboarding-step.tsx` :
- `text-destructive` → `text-coral-500` (l.148, 576).
- `boxShadow` CTA step 6 (l.618) → `var(--shadow-lg)` ; SubmitButton (l.676) → `disabled ? "none" : "var(--shadow-sm)"`.
- l.331 : envelopper le pourcentage en mono → `<span className="font-mono">{Math.round((step / totalSteps) * 100)}%</span>`.
- l.596 : input années de pratique → ajouter `font-mono` à la className.

- [ ] **Step 2 : onboarding/fini — flèche**

Dans `app/(app)/onboarding/fini/page.tsx` l.177 : `Ouvrir mon carnet →` → texte + `<ArrowRight size={16} aria-hidden />` (importer `ArrowRight`).

- [ ] **Step 3 : Vérifier**

Run: `pnpm typecheck`
Expected: PASS.

- [ ] **Step 4 : Commit**

```bash
git add "app/(app)/onboarding/[step]/onboarding-step.tsx" "app/(app)/onboarding/fini/page.tsx"
git commit -m "style(excellence-lot4): onboarding en DA v2 (coral, ombres tokenisées, mono, flèche lucide)"
```

---

## Task 8 : Gate final + passe anti-régression

**Files:** aucun (vérification ; petits correctifs si besoin).

- [ ] **Step 1 : Suite complète**

Run: `pnpm typecheck && pnpm lint && pnpm vitest run && pnpm build`
Expected: typecheck PASS · lint « No ESLint warnings or errors » · tous tests verts · build OK.

- [ ] **Step 2 : Revue adversariale (relire les diffs)**

Vérifier :
- Like : l'anim ne se déclenche qu'au clic local (jamais via `usePostInteractionsRealtime`) ; pas de double incrément ; `aria-pressed` conservé.
- Commentaire : optimiste affiche la vraie identité ; pas de doublon après `load()` ; profil incomplet → « Toi ».
- Aucun reste de `text-red-600` / `text-destructive` / `slate-` / `boxShadow` inline non-tokenisé dans les fichiers touchés (`grep`).
- Auth/onboarding : validation, navigation, server actions inchangées.
- `prefers-reduced-motion` respecté.

Run (contrôle) : `grep -rnE "text-red-600|text-destructive|hover:bg-slate-50|fill-red-500" app/auth app/\(app\)/onboarding components/feed`
Expected : aucune occurrence dans les fichiers traités.

- [ ] **Step 3 : Corriger les éventuels reliquats puis re-gate**

Si le grep ou le build remonte quelque chose, corriger et relancer Step 1.

- [ ] **Step 4 : Commit final (si correctifs)**

```bash
git add <fichiers corrigés>
git commit -m "fix(excellence-lot4): reliquats DA v2 / gate"
```

(Ne pas pousser — John pousse.)

---

## Self-Review (effectué)

- **Couverture spec** : Bloc A → Tasks 6-7 ; Bloc B (like) → Tasks 1-2 ; Bloc B (press) → Tasks 2-3 ; Bloc C → Tasks 4-5 ; Bloc D → Task 8. ✅
- **Placeholders** : aucun — code réel à chaque step ; les 2 fichiers lus en cours d'impl (PostList, u/[username]) ont un pattern concret fourni (fetch viewer profile de `fil/[department]:63-73`). ✅
- **Cohérence des types** : `ComposerUser` unique partout ; `buildOptimisticComment(currentUser, text, tempId)` identique en Task 4 (définition) et Task 5 (usage). ✅
