# Sprint 27 — RECAP (IA & Navigation : relier ce qui existe)

> Statut : **code-complet sur branche `sprint-27-quickwins-nav`, NON poussé** (conforme : « Ne push pas »).
> Périmètre tenu : **nav/UI only** — 0 migration, 0 RLS, 0 changement de schéma, 0 fichier de données touché.
> Verif : `pnpm build` vert (66/66 pages, exit 0) · **511/511 tests** · typecheck 0 · lint 0 · revue indépendante = GO.

## Commits (branche `sprint-27-quickwins-nav`, sur `84b325e` = main post-sprint-26)

| Commit | Bloc | Contenu |
|---|---|---|
| `ee0cd15` | 0 | Reprise des 4 quick-wins : Co-pêchage + groupe « Découvrir » (Espèces/Guides) dans `AppSidebar` ; Accueil/Co-pêchage/Espèces/Guides dans `UserMenu` ; Co-pêchage dans `mobile-nav` ; stat home 6 → 20. |
| `ffaece3` | 1 + 3 | **Notifications** libellée dans `UserMenu` (cloche conservée) ; stat home **dynamique** (`SPECIES_SLUGS.length`) ; `HeroPrimaryCta` auth-aware ; lien « Mon carnet » → /home dans le header marketing/carte. |
| `26dcce4` | 2 | TabBar = **Carnet · Carte · [+] · Fil · Plus** ; `MoreMenu` (overflow bottom-sheet) ; `isModerator` filé layout → AppShell → TabBar → MoreMenu. |
| `5c3f352` | 3 + 4 | Test d'atteignabilité (`nav-reachability.test.ts`, 17 tests) + note `notes-unification-shells.md`. |

## Fait, par bloc (avec preuve)

### Bloc 0 — reprise quick-wins ✅
4 fichiers relus, lint + typecheck verts, committés. Sidebar : Co-pêchage + « Découvrir » (Espèces/Guides). Menu avatar : Accueil/Co-pêchage/Espèces/Guides. Stat home « 20 espèces ».

### Bloc 1 — atteignabilité ✅
- **Notifications** : entrée libellée (icône `Bell`) → `/notifications` dans `UserMenu` (avatar, présent dans le shell app **et** marketing/carte). La cloche `NotificationBell` (badge + Realtime) reste dans `AppHeader` — inchangée.
- **Stat home dynamique** : `app/(marketing)/page.tsx` dérive le compte d'espèces de `SPECIES_SLUGS.length` (`lib/seo/programmatic.ts` = référentiel unique, **liste légère de slugs**). Ajouter/retirer un slug fait bouger la stat **sans édition manuelle**. Aucune fiche éditoriale (`lib/especes/content/*`) tirée dans le bundle (vérifié au build : `/` = 267 kB, pas gonflée).
- **États actifs** : `pathname.startsWith` — `/especes/bar` allume « Espèces », pas de collision de préfixes (vérifié).
- ⚠️ **Brief obsolète sur `/spots/mes-propositions`** : la tâche 4 demandait d'ajouter un lien — il **existe déjà** (`app/(app)/spots/proposer/page.tsx:38-40` → `/spots/mes-propositions`, et retour). **Rien à faire** (confirmé par le scout). Page non orpheline.

### Bloc 2 — tab bar + « Plus » ✅
- **Composition validée par John** : `Carnet · Carte · [FAB +] · Fil · Plus`. Le **Profil quitte la tab bar** (toujours 1 tap via l'avatar du header + listé dans « Plus »).
- **`components/layout/MoreMenu.tsx`** : bottom-sheet (primitive `Sheet` base-ui, mode Dialog ancré en bas → **focus-trap + Esc + fermeture au tap extérieur** natifs) listant : Accueil · Profil · Mes pêcheurs · Co-pêchage · Notifications — « Découvrir » : Espèces · Guides · Techniques — Mon abonnement · Modération (si `is_moderator`) · Déconnexion. Cibles **≥ 44 px** (`min-h-11`), `aria-current` sur l'item actif, `motion-reduce:transition-none`.
- **Onglet « Plus » actif** quand la route courante appartient à l'overflow (`overflowMatches.some(startsWith)`).
- **FAB « + »** central/surélevé **inchangé** (→ `/carnet/nouvelle`). `pb-[88px]` du `<main>` conservé (hauteur tab bar stable → safe-area OK).
- **`isModerator`** lu une fois dans `app/(app)/layout.tsx` (`profiles.is_moderator`, filtré `auth user`) et filé `AppShell → TabBar → MoreMenu` pour gater l'item « Modération ».

### Bloc 3 — ponts inter-shells ✅
- **`HeroPrimaryCta`** (Client Component) : connecté → « Aller à mon carnet » → `/home` ; sinon → « Créer mon carnet — gratuit » → `/auth/register`. Lit la session **côté client** (`getSession`, sans round-trip réseau) → n'ajoute **aucun fetch serveur** à la home, rendu initial = variante anon (bon SEO, pas de hydration mismatch, cleanup `useEffect` propre).
- **Header marketing/carte** : lien discret « Mon carnet » → `/home` quand connecté (à gauche de l'avatar, desktop).
- **`docs/sprint-27/notes-unification-shells.md`** : cadrage coût/bénéfice unification des 3 shells — **décision reportée** au cadrage Expo (reco : rester en « 3 shells + ponts » jusque-là).

### Bloc 4 — tests nav + a11y ✅
- **`components/layout/__tests__/nav-reachability.test.ts`** (17 tests) : filet anti-régression permanent — échoue si une des 11 destinations finies (`/home /carnet /carte /fil /follows /sorties /especes /guides /notifications /profil /compte/abonnement`) n'est plus reliée par **aucune** surface (`AppSidebar/UserMenu/MoreMenu/TabBar/MobileNav`) ; + FAB présent ; + invariants a11y statiques (`aria-current` sur rails persistants, `min-h-11`/Sheet/`motion-reduce` sur MoreMenu).
- ⚠️ **Brief obsolète sur l'infra de test** : le brief supposait Testing Library. Le harness Vitest du projet est en **environnement `node`, sans RTL/jsdom**. Plutôt que d'ajouter une infra lourde et fragile (mocks next/navigation + portails base-ui + Server Actions) sur un sprint quick-wins, le test est un **scan de source** qui couvre exactement le critère d'acceptation. L'a11y **runtime** (focus/clavier/Esc/pouce) → **qa-chrome** (reste John, ci-dessous), comme prévu par le Bloc 4 tâche 3.

## ⚠️ Findings à connaître (non bloquants)

1. **La home `/` est rendue `ƒ Dynamic` (pas statique) — PRÉEXISTANT, pas causé par le sprint 27.** Le build montre `/` (et **toutes** les pages marketing : `/especes`, `/guides`, `/tarifs`…) en dynamique. Cause racine : le `<Header/>` du layout marketing est un **server component qui lit le cookie de session** (`createClient()` + `getUser()`), ce qui sort tout le groupe `(marketing)` du rendu statique. C'est dans des fichiers que le sprint 27 **n'a pas touchés** → la home avait déjà ce mode sur `main`. Le sprint 27 est **render-mode-neutral** (CTA client-only + import léger ; `revalidate=3600` conservé). Le critère « `/` reste statique » du brief reposait sur une **prémisse fausse** (la home n'était pas statique au départ). **Optimisation possible (séparée, hors périmètre nav)** : rendre l'auth du header / le bandeau de consentement non bloquants pour le rendu statique des pages marketing — vrai gain SEO/CDN, à cadrer en sprint perf.
2. **Bundle (app) sain** : aucune fiche éditoriale embarquée dans le shell connecté (tailles First Load JS normales ; les fiches restent isolées dans `/especes/[slug]` & `/guides/[slug]`).
3. La revue indépendante a d'abord soulevé un « fix flash Fil » — **non retenu** : cette tâche **n'existe pas** dans le brief (confusion avec l'audit). Le Bloc 3 du brief ne demande que CTA conditionnel + lien header + note d'étude, tous faits.

## Comment tester (rapidement)
- `pnpm test` → 511/511. `pnpm build` → vert, 66/66 pages. `pnpm typecheck` / `pnpm lint` → 0.
- Desktop connecté `/home` : sidebar montre Co-pêchage + « Découvrir » (Espèces/Guides) ; avatar montre Accueil/Co-pêchage/Notifications/Espèces/Guides.
- Mobile (< 960 px) connecté : tab bar `Carnet · Carte · + · Fil · Plus` ; « Plus » ouvre la feuille (Esc/clavier/tap-extérieur la ferme) → tout est atteignable en ≤ 2 taps.
- Connecté, revenir sur `/` : le CTA primaire devient « Aller à mon carnet » ; lien « Mon carnet » dans le header sur `/especes`/`/carte`.

## Reste manuel John (post-sprint)
1. **qa-chrome / mobile réel** : valider au pouce l'overflow « Plus » (focus, clavier, Esc, safe-area iPhone à encoche) + le flash CTA connecté — **après** un déploiement/preview (pas faisable en local sans session). Déjà prévu au brief.
2. **Trancher** : accepter le reste (rien) ou non. La composition tab bar est déjà validée (reco retenue).
3. **Relire la branche → merge `sprint-27-quickwins-nav` → `main` → déploiement Vercel** (puis `deploy-watch`).
4. **Décider plus tard** sur `notes-unification-shells.md` (unification des shells, à rouvrir au cadrage Expo).
5. **(Optionnel, séparé)** ouvrir un mini-chantier perf/SEO pour re-statifier les pages marketing (finding #1).
6. Artefacts non trackés à ignorer/nettoyer : `.playwright-mcp/*.yml`, `qa-s26/` (sprint 26).
