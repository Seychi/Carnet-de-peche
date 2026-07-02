# 🎯 Sprint 54 — « Navigation, résilience & auth »

> **Brief exécutable** (format Fable `ultracode` / effort `xhigh`). Source : `docs/ROADMAP-CORRECTIFS-2026-06-29-SPRINTS-51-58.md` §7.
> **Prod = HEAD `7c23f5c` (sprint-50).** Objectif : rendre **toutes les pages atteignables**, l'app **robuste aux erreurs** (plus d'écran blanc / de perte de nav), et **fermer la beta** (OAuth ne contourne plus l'invitation). **Aucune migration** (100 % code).

---

## 🚀 Ligne de lancement (copier-coller)

```
ultracode effort xhigh — Exécute le Sprint 54 (docs/sprint-54/BRIEF.md). Workstreams parallèles : WS-A nav orphelines (MoreMenu/AppSidebar + dé-gate Mes sorties + test), WS-B error.tsx/loading.tsx par groupe (app)/(map), WS-C PWA start_url, WS-D OAuth/invite, WS-E realtime reconnect + curseur fil. Finis par WS-F (vérif : /verif-sprint + QA live nav/erreurs). Esprit critique : vérifie chaque ancre contre le vrai code (HEAD a pu bouger). NE PUSH PAS sans validation.
```

**Prérequis** : dépôt local réparé (index git corrompu).

---

## Posture & invariants

Effort max + critique. Pas de migration, pas de schéma touché. Invariants : zéro coordonnée exposée, **pas de tiret cadratin dans la copy visible**, a11y (cibles ≥ 44 px, `aria-current`, `prefers-reduced-motion`), pas de push sans John.

---

## WS-A — Pages orphelines : tout atteignable depuis une surface persistante 🟠 [finding F]

**Fichiers** : `components/layout/MoreMenu.tsx`, `components/layout/AppSidebar.tsx`, `app/(app)/carnet/page.tsx`, `components/layout/__tests__/nav-reachability.test.ts`.

**A.1 — Ajouter « Proposer un spot » + « Mes propositions » à la nav.**
Aujourd'hui ces 2 pages ne sont atteignables **que depuis l'intérieur de la carte** (`MapShell`). Les ajouter dans :
- `MoreMenu.tsx` `buildGroups()` : nouveau groupe « Contribuer » (après « Découvrir ») :
  ```ts
  { title: 'Contribuer', items: [
    { label: 'Proposer un spot', href: '/spots/proposer', match: '/spots/proposer', Icon: MapPinPlus },
    { label: 'Mes propositions', href: '/spots/mes-propositions', match: '/spots/mes-propositions', Icon: ClipboardList },
  ]},
  ```
  (importer `MapPinPlus`, `ClipboardList` depuis `lucide-react`).
- `AppSidebar.tsx` : ajouter un groupe « Contribuer » (même pattern que `DISCOVER`) avec les 2 entrées (icônes idem).

**A.2 — Dé-gater « Mes sorties » (`/carnet/sorties`).**
`carnet/page.tsx` (~ligne 158) : le lien est sous `{outingStats && outingStats.totalOutings > 0 && (…)}` → inatteignable à 0 sortie. **Retirer la condition `> 0`** : afficher le lien dès que `outingStats` existe (le sous-texte « tes sorties loguées… » fait office d'état vide), ou afficher un état vide « Aucune sortie loguée — note ta première ». Ne PAS toucher au garde `totalCount > 0` du bloc « Mon année » (recap) ni à `EnablePushAlerts` (logique différente).

**A.3 — Étendre le filet anti-orphelin.**
`nav-reachability.test.ts` : ajouter à `REQUIRED_DESTINATIONS` (ligne 37-49) : `'/spots/proposer'`, `'/spots/mes-propositions'`, `'/carnet/sorties'`. Le test vérifie que chaque destination est reliée par au moins une surface (`AppSidebar`/`TabBar`/`MoreMenu`) → empêche la ré-orphelinisation.

**Critères** : depuis n'importe quelle page (mobile MoreMenu + desktop sidebar), on atteint Proposer un spot, Mes propositions, Mes sorties ; le test de reachability couvre les 3.

---

## WS-B — Résilience : plus d'écran blanc ni de perte de nav 🟠

**Constat (vérifié)** : seuls `app/(app)/carnet/` (error+loading), `onboarding/loading`, `guides/loading` et la racine `app/error.tsx` + `app/global-error.tsx` existent. Une erreur serveur dans `carte`, `fil`, `sorties`, `notifications`, `follows`, `home`, `profil`, `moderation`, `u/[username]`, `compte` remonte à la **racine** → perte du shell (header/sidebar/tab bar) ; et plusieurs blank-flash sur réseau lent.

**Correctif (élégant) : poser les boundaries au niveau du GROUPE de route**, ce qui couvre tout le sous-arbre d'un coup tout en gardant le `layout` (donc la nav) :
- `app/(app)/error.tsx` (client, avec `reset`) + `app/(app)/loading.tsx` (skeleton) → couvre **toutes** les pages app sans la leur.
- `app/(map)/error.tsx` + `app/(map)/loading.tsx` → `/carte`.
- (Option) `app/(marketing)/error.tsx` + `loading.tsx` → especes/guides/spots fiches.

Template `error.tsx` (garde la nav car rendu dans le `layout` du groupe) :
```tsx
'use client'
export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="mx-auto max-w-md px-4 py-16 text-center">
      <h1 className="font-display text-xl font-bold text-navy-900">Une erreur est survenue</h1>
      <p className="mt-2 text-sm text-ink-500">Réessaie, ou reviens dans un instant.</p>
      <button onClick={reset} className="mt-4 rounded-full bg-navy-900 px-4 py-2 text-sm font-medium text-white">Réessayer</button>
    </div>
  )
}
```
`loading.tsx` : un skeleton neutre (réutiliser les skeletons existants du carnet/carte si dispo). Respecter `prefers-reduced-motion`.

**Critères** : forcer une erreur dans une page app (ex. throw temporaire) → l'écran d'erreur s'affiche **avec la nav**, bouton « Réessayer » fonctionnel ; pas de blank-flash sur navigation lente.

---

## WS-C — PWA : lancement déconnecté utile 🟢

**Constat** : `public/manifest.webmanifest:6` `"start_url": "/home"` — or `/home` est auth-gated (`(app)/layout.tsx` redirige les anonymes vers `/auth/login`, et `/home` est `Disallow` robots). Lancer la PWA installée déconnecté tombe sur une redirection login.

**Correctif** : `"start_url": "/"` (la home est auth-aware : hero connecté/déconnecté). *(Alternative `/carte` si tu préfères ouvrir sur la carte ; reco `/`.)* Garder `scope: "/"`.

**Critères** : ouvrir la PWA déconnecté → page d'accueil utile (pas un login sec).

---

## WS-D — Auth : l'OAuth ne contourne plus la beta 🟢→🟠 (avant d'activer INVITE_ONLY)

**Fichiers** : `app/auth/login/actions.ts`, la page login/register (boutons), éventuellement `app/auth/callback/route.ts`.

**D.1 — Google contourne `INVITE_ONLY`.**
`signUpWithPassword` (`actions.ts:179`) applique le gate `INVITE_ONLY` (`:221-246`, consomme le code via RPC `consume_invite_code`). Mais `signInWithGoogle` (`:358-370`) n'a **aucun** gate, et `auth/callback/route.ts` exchange le code et redirige sans vérifier l'invitation → **inscription Google libre** même en beta.
- **Correctif (simple et robuste)** : **masquer le bouton Google** sur les pages login/register quand `process.env.INVITE_ONLY === 'true'` (l'OAuth n'a pas d'endroit pour saisir un code d'invitation ; le pont email/mot-de-passe reste le seul chemin d'inscription en beta). Rendre le bouton conditionnellement (server component lit l'env, ou flag passé en prop).
- *(Alternative plus lourde : porter le code d'invitation dans le `state` OAuth puis le valider/consommer dans le callback. Non recommandé v1.)*

**D.2 — Le code d'invitation est consommé AVANT le succès du signup.**
`signUpWithPassword` consomme le code (`:234`) **avant** `auth.signUp` → un signup raté (email déjà pris, mot de passe rejeté) **brûle** un code à usage unique.
- **Correctif** : réordonner — d'abord `auth.signUp`, et **consommer le code seulement si le signup réussit**. Si l'atomicité contre le double-usage t'inquiète : ajouter une RPC `validate_invite_code` (lecture, non consommante) avant signUp, puis `consume_invite_code` après succès. *(Latent aujourd'hui : flag OFF en prod, mais à corriger avant d'ouvrir la beta fondateurs.)*

**Critères** : avec `INVITE_ONLY=true`, aucun bouton Google visible ; un signup email raté ne consomme pas de code. (Tester avec le flag local.)

---

## WS-E — Realtime & pagination robustes 🟢

**Fichiers** : `lib/feed/useFeedRealtime.ts`, `lib/cofishing/useOutingChatRealtime.ts` (et `usePostInteractionsRealtime`, `useNotificationRealtime` si même pattern), `app/actions/feed.ts`.

**E.1 — Gérer le statut de souscription / reconnexion.**
Les hooks souscrivent et n'inspectent pas le statut → sur coupure dure, le realtime s'arrête en silence (fil/chat figé jusqu'à navigation). Dans le `.subscribe((status) => …)`, traiter `CHANNEL_ERROR` / `TIMED_OUT` / `CLOSED` : tenter un `removeChannel` + re-souscription (backoff léger), et/ou exposer un petit état « reconnexion… » à l'UI. (Supabase auto-reconnecte les coupures transitoires ; viser les coupures durables.)

**E.2 — Curseur fil avec tie-breaker.**
`getFeedPage` (`app/actions/feed.ts:699`) ordonne `created_at desc` (`:713`) et filtre `.lt('created_at', cursor)` (`:729`), nextCursor = `created_at` du dernier (`:766`). Deux posts au **même `created_at`** à cheval sur une page peuvent être **sautés** (le dedup-by-id de `FeedClient` évite les doublons, pas le saut). Risque réel surtout sur **seed/bulk insert** (le plan d'amorçage du réservoir).
- **Correctif** : curseur composite `created_at|id`. Ordonner `created_at desc, id desc` (`.order('created_at',{ascending:false}).order('id',{ascending:false})`) et filtrer `created_at < X OR (created_at = X AND id < Y)` (`.or('created_at.lt.X,and(created_at.eq.X,id.lt.Y)')`). nextCursor = `${last.created_at}|${last.id}`. Adapter `FeedClient` au format du curseur.

**Critères** : couper le réseau puis le rétablir → le fil/chat se resynchronise sans reload ; un seed de N posts au même timestamp paginé page par page ne saute aucun post (test).

---

## WS-F — Vérification (obligatoire, en dernier) ✅

1. **`/verif-sprint`** : Vitest vert (dont `nav-reachability` étendu + test pagination fil), `pnpm build` OK, lint + types OK. (Aucune migration → pas de regen types.)
2. **Anti-régression** (agent indépendant) : la nav ne casse aucune route existante ; les error/loading de groupe n'interceptent pas indûment (le `not-found` reste OK) ; gating/floutage inchangés ; OAuth password toujours fonctionnel hors beta.
3. **QA live ciblée** (desktop) : MoreMenu + sidebar montrent Proposer/Mes propositions ; « Mes sorties » visible à 0 sortie ; provoquer une erreur app → écran d'erreur **avec nav** ; PWA `start_url` = `/`.
4. **NE PAS PUSH** : laisser à John (résumé « fait / à tester »).

---

## Récap

| WS | Findings | Fichiers clés | Migration |
|---|---|---|---|
| A | nav orphelines (proposer/mes-propositions/mes-sorties) | `MoreMenu.tsx`, `AppSidebar.tsx`, `carnet/page.tsx`, `nav-reachability.test.ts` | — |
| B | error/loading manquants | `app/(app)/error.tsx`+`loading.tsx`, `app/(map)/…` | — |
| C | PWA start_url auth-gated | `public/manifest.webmanifest` | — |
| D | OAuth contourne INVITE_ONLY + code brûlé | `auth/login/actions.ts`, pages login/register | — |
| E | realtime reconnect + curseur fil | `lib/feed/useFeedRealtime.ts`, `lib/cofishing/useOutingChatRealtime.ts`, `feed.ts` | — |

**Décisions ouvertes (mineures)** :
1. **WS-C** : `start_url` = `/` (reco) ou `/carte` ?
2. **WS-D** : masquer Google en beta (reco) ou porter l'invite dans le `state` OAuth ?
3. **WS-E** : curseur composite maintenant (reco, avant l'amorçage) ou différer si l'effort est jugé > gain.

**Parallélisme** : WS-A à E indépendants (fichiers disjoints) → 5 agents en parallèle, puis WS-F. **Aucune dépendance** aux sprints 51-53. Effort ~2-3 j.

---

*Brief Sprint 54 rédigé le 2026-06-29. Vérifié contre HEAD `7c23f5c` : MoreMenu/AppSidebar (pas d'entrée proposer/mes-propositions), garde `totalOutings>0` carnet, inventaire error/loading, manifest start_url, `signInWithGoogle`/`signUpWithPassword`/callback, `getFeedPage` curseur, hooks realtime. Prochain : Sprint 55 sur demande.*
