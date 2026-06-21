# Tests E2E — Playwright (sprint 11 Bloc E)

> ## ⚠️ STATUT : GELÉ (2026-06-21)
>
> Le déclenchement automatique de la CI E2E (`.github/workflows/e2e.yml`) est
> **débranché** (`workflow_dispatch` seul). Raison : la suite ne se reproduit /
> débogue qu'avec une **stack Supabase locale (Docker)**, indisponible sur le
> poste de John → chaque correctif était un tour de CI **à l'aveugle** (~8 min).
> On reprend **en local avec Docker** pour itérer vite. Le filet actif entre-temps
> reste le workflow **`Check`** (typecheck + 273 tests unitaires, vert).
>
> ### Ce qui est résolu (et restera utile à la reprise)
>
> - **Auth programmatique** (`auth.setup.ts` + `storageState`) : les 3 comptes se
>   connectent une fois, les scénarios 02/03/04 réutilisent la session. Fini la
>   fragilité du login piloté à l'UI (cause : React 19 `<form action>` qui
>   réinitialise les champs pendant le `.fill` sous CPU lent).
> - **Grants rôles** en CI : le stack local ne pose pas les privilèges
>   tables/vues que Supabase cloud accorde par défaut → `permission denied` sur
>   les requêtes directes (webhook→`subscriptions`, fil→`feed_posts`). Corrigé,
>   **tables/vues uniquement** (re-granter les fonctions cassait le verrou GPS de
>   la migration 025).
> - **Service worker PWA bloqué** dans les tests (`serviceWorkers: "block"`) : il
>   provoquait des `net::ERR_ABORTED` sur `/carte` et `/spots` en CI.
>
> ### 2 bugs de PROD trouvés en chemin (corrigés)
>
> - **Autofill / gestionnaire de mots de passe** : le composant `Input` (Base UI)
>   écrasait une valeur posée par programme → certains utilisateurs voyaient leur
>   champ se vider. Bascule sur input HTML natif (`components/ui/input.tsx`).
> - **Parité de permissions** local↔prod documentée (grants).
>
> ### Ce qui reste (à reprendre en local Docker)
>
> - **Scénario 01** (inscription → onboarding → 1re prise) : les champs du
>   formulaire d'onboarding sont **contrôlés par react-hook-form** ; sous le CPU
>   lent de la CI, la valeur posée par `.fill` ne « tient » pas de façon fiable
>   (RHF ré-initialise plus vite que l'assertion). À déboguer en local (CPU réel)
>   avec un throttling CDP pour reproduire, puis fiabiliser le remplissage.
> - **Re-armer** `on: [push, pull_request]` une fois 01 stabilisé en local.
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
