# Tests E2E — Playwright (sprint 11 Bloc E)

> ## ✅ STATUT : VERT (2026-06-21)
>
> Toute la suite passe (13/13 : 3 setup + scénarios 01→07) en local contre une
> stack Supabase fraîche, et la CI est **ré-armée** (`push` + `pull_request`).
> Pour itérer/déboguer en local : Docker + `supabase start` (cf « Lancer en
> local » plus bas). Filet complémentaire : workflow **`Check`** (typecheck +
> tests unitaires).
>
> ### Comment la suite a été fiabilisée
>
> - **Auth programmatique** (`auth.setup.ts` + `storageState`) : les comptes se
>   connectent une fois, les scénarios réutilisent la session. Fini la fragilité
>   du login piloté à l'UI (React 19 `<form action>` réinitialisait les champs).
> - **Grants rôles** en CI (tables/vues uniquement — pas les fonctions, pour ne
>   pas casser le verrou GPS de la migration 025) : le stack local ne pose pas
>   les privilèges que Supabase cloud accorde par défaut.
> - **Service worker PWA bloqué** dans les tests (`serviceWorkers: "block"`) :
>   il provoquait des `net::ERR_ABORTED` sur `/carte` et `/spots`.
> - **Sélecteurs robustes** : titres d'étape via `getByRole("heading")` (évite
>   les collisions de sous-chaînes), fiche spot via le `h1` (`level: 1`).
>
> ### 3 bugs de PROD trouvés en chemin (corrigés)
>
> - **Labels d'onboarding non associés** (a11y) : `FormControl` posait l'`id` sur
>   un `<div>` au lieu de l'input → `<label htmlFor>` pointait dans le vide
>   (lecteurs d'écran ET `getByLabel` cassés). Corrigé : `id`+aria portés sur
>   l'input via `cloneElement` (`components/ui/form.tsx`).
> - **Redirection d'auth qui perdait la destination** : le garde-fou du layout
>   `(app)` redirigeait vers `/auth/login` SANS `?redirect=` pour les routes hors
>   `APP_ROUTES` (fil, follows, profil, compte). Ajoutées au middleware (qui
>   préserve la cible). `middleware.ts`.
> - **Autofill / gestionnaire de mots de passe** : le composant `Input` (Base UI)
>   écrasait une valeur posée par programme. Bascule sur input HTML natif.
>
> ---

4 scénarios du brief, exécutés contre un **build de prod local** + une **stack
Supabase locale** (base jetable, migrations + seeds appliqués à chaque
démarrage). **Jamais contre le projet cloud** : les tests créent des comptes,
des prises et des posts.

## Les 4 scénarios

| Spec | Couvre | Comptes |
|---|---|---|
| `01-inscription-onboarding-catch` | Signup → onboarding 6 étapes → 1re prise loguée (coords manuelles, conditions Open-Meteo réelles) | créé à la volée |
| `02-carte-spot-conditions` | Connexion → carte (pas de paywall en tier local) → fiche spot SSR avec marées/météo | `test_local_29` |
| `03-stripe-trial-upgrade` | Webhook `customer.subscription.created` signé → `current_tier` local → carte complète | `test_upgrade_29` (dédié, seed_e2e.sql) |
| `04-fil-discovery-post` | Post sur `/fil/29` en **discovery** (Bloc 0 sprint 10) → visible depuis une session B | `test_disco_29` → `test_local_29` |

## Lancer en local

Prérequis : **Docker** (la stack locale tourne en containers) + CLI Supabase.

```bash
supabase start          # migrations + seeds (spots, comptes test) — 1re fois : long
pnpm build              # les NEXT_PUBLIC_* sont inlinées au build
pnpm e2e                # lance les 4 specs (démarre `pnpm start` tout seul)
```

Env requis (cf `.github/workflows/e2e.yml` pour le jeu complet) :
`NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_ANON_KEY` +
`SUPABASE_SERVICE_ROLE_KEY` pointés sur la stack locale (`supabase status -o env`),
et les 7 vars `STRIPE_TEST_*` (valeurs factices OK — voir le workflow).

⚠️ Sans Docker (machine de dev actuelle) : la CI GitHub Actions est
l'exécuteur de référence de ces tests.

## Arbitrages (décisions Bloc E)

- **Supabase de test = stack locale** (pas de mocks, pas de projet cloud de
  test). C'est l'architecture que `seed_test_accounts.sql` prévoyait déjà.
- **Stripe : webhook signé, pas de Checkout hébergé.** Le scénario 3 signe
  lui-même `customer.subscription.created` (HMAC v1, même algo que
  `constructEvent`). Ça couvre notre chaîne signature → handler → DB →
  `current_tier` → gating UI. Le Checkout hébergé (page Stripe) a été QA
  manuellement en LIVE au sprint 9 — pas de valeur à le re-tester en CI
  contre de fausses clés.
- **Carte : assertions hors-canvas** (paywall/filtres). Le rendu MapLibre
  exige `NEXT_PUBLIC_MAPTILER_KEY` (secret optionnel `MAPTILER_KEY` en CI) ;
  les conditions sont assertées sur la fiche spot (SSR, robuste).
- **Open-Meteo : appels réels en CI** (gratuit, sans clé). Si ça devient
  flaky, mocker via `page.route()` au niveau du fetch serveur n'est pas
  possible — il faudrait un flag env, à arbitrer à ce moment-là.
- **Lighthouse CI : budgets statiques** (FCP < 2 s, LCP < 2,5 s, CLS < 0,1,
  preset desktop, 3 runs). La comparaison « régression > 10 % » du brief
  nécessiterait un serveur LHCI — reporté, les budgets absolus couvrent
  l'essentiel.
