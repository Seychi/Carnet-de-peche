# 🎯 Sprint 54 — « Navigation, résilience & auth » — RECAP

> **Statut : CODE-COMPLET. NON commité / NON poussé (feu vert John). 0 migration.**
> Exécuté le 2026-06-30 (ultracode). Base : `docs/sprint-54/BRIEF.md` + investigation live. Prod de départ = `f4bff8f` (sprint-53).
> Vérif : suite **611/611**, typecheck 0, lint 0, build OK (Node 24), revue croisée indépendante = **GO**.

---

## Ce qui a été fait (5 workstreams)

| WS | Objet | Détail | Fichiers |
|---|---|---|---|
| **A** | Pages orphelines | Groupe « Contribuer » (Proposer un spot + Mes propositions) dans MoreMenu **et** AppSidebar ; « Mes sorties » dé-gaté (plus de `totalOutings > 0`, état vide géré) ; test reachability étendu (+2 destinations + test du dé-gate). | `MoreMenu.tsx`, `AppSidebar.tsx`, `carnet/page.tsx`, `nav-reachability.test.ts` |
| **B** | Résilience (plus d'écran blanc ni perte de nav) | `error.tsx` + `loading.tsx` au niveau des **groupes** `(app)` et `(map)` + `error.tsx` `(marketing)` → couvrent tout le sous-arbre en gardant le shell (header/sidebar/tab bar). `'use client'` + `reset` + `Sentry`. **Pas de `min-h-screen`** (le shell/layout fournit la hauteur). `notFound()` non intercepté. | 5 fichiers neufs : `app/(app)/error.tsx`+`loading.tsx`, `app/(map)/error.tsx`+`loading.tsx`, `app/(marketing)/error.tsx` |
| **C** | PWA lancement déconnecté | `start_url` `/home` → `/` (home auth-aware) : plus de login sec au lancement de la PWA déconnecté. | `public/manifest.webmanifest` |
| **D** | Auth ne contourne plus la beta | Bouton **Google masqué** quand `INVITE_ONLY=true` (extraction `login-client.tsx` + wrapper serveur `page.tsx` qui lit l'env) ; **lien magique** `shouldCreateUser:false` en beta (connexion existante OK, création bloquée) ; code d'invitation **consommé après** le succès du signup (un signup raté ne brûle plus de code). | `auth/login/page.tsx` (nouveau, serveur), `auth/login/login-client.tsx` (renommé), `auth/login/actions.ts` |
| **E** | Realtime & pagination robustes | Helper `subscribeResilient` (reconnexion sur coupure durable, retries **bornés** + backoff plafonné, removeChannel avant reconnexion, teardown propre) appliqué aux **5 hooks** Realtime ; curseur fil **composite `created_at\|id`** (tie-breaker anti-saut sur posts au même timestamp) + tolérance legacy. | `lib/supabase/resilient-channel.ts` (neuf), `lib/feed/cursor.ts` (neuf, **module neutre**), `feed.ts` `getFeedPage`, 5 hooks, `cursor.test.ts` (neuf) |

## Migrations

**Aucune.** `lib/types.ts` inchangé.

## Décisions appliquées (recos du brief)

PWA `start_url=/` · masquer Google en beta · curseur composite · WS-D.2 **Voie 1** (réordonner le consume, 0 migration).

## Corrections / ajouts vs brief (investigation + revue)

- **WS-D (ajout)** : le brief ne fermait que Google ; la revue a trouvé que le **lien magique** était un vecteur d'inscription libre identique en beta → fermé aussi (`shouldCreateUser:false` si `INVITE_ONLY`). WS-D atteint donc réellement son but « fermer la beta ».
- **WS-E** : helpers curseur dans un **module neutre** `lib/feed/cursor.ts` (jamais exporter une fonction sync depuis un fichier `'use server'`). Mock Supabase sans `.or()` → test de la **logique pure** du curseur (pas E2E). Curseur **non persisté** (URL/LS) → tolérance legacy suffit au déploiement.
- **WS-B** : `min-h-screen` proscrit dans les boundaries de groupe (shell sticky / `(map)` en `h-dvh`).
- **WS-A** : `/carnet/sorties` n'est pas une surface de nav → testé via un test dédié sur la page carnet (pas ajouté à `REQUIRED_DESTINATIONS`).

## Vérification

- `pnpm test` → **611/611** (+7 : curseur fil composite, reachability étendue + dé-gate).
- `pnpm typecheck` 0 · `pnpm lint` 0 · `pnpm build` OK (Node 24, route `/auth/login` recompile après extraction).
- `node scripts/lint-copy-dashes.mjs` → aucun tiret cadratin introduit.
- **Revue croisée indépendante** → **GO** : 5/5 WS confirmés ; anti-régression OK (0 fuite GPS, gating intact, boucle realtime impossible — retries bornés + teardown, boundaries sans `min-h-screen`, 0 migration).

## Réserves signalées par la revue (latentes, flag OFF — à traiter AVANT d'ouvrir la beta, pas avant le merge)

1. **Lien magique** : corrigé ce sprint (`shouldCreateUser:false` en beta) — réserve **levée**.
2. **WS-D.2 Voie 1** : un code d'invitation **invalide/expiré** ne bloque plus la création de compte (seule la non-vacuité est vérifiée avant `signUp` ; le `consume` après échec ne fait que logguer). C'est l'arbitrage **0 migration** du brief. Si tu veux l'atomicité forte avant la beta fondateurs, il faut la **Voie 2** : une RPC `validate_invite_code` (lecture, non consommante) appelée avant `signUp` → **1 migration** (hors scope « 0 migration » du S54). ⚠️ DÉCISION pour toi avant d'activer `INVITE_ONLY`.

## Reste avant merge (John)

1. **Commit + push** (push manuel, §13) → Vercel auto-deploy.
2. **QA live après deploy** : MoreMenu + sidebar montrent « Proposer un spot »/« Mes propositions » ; « Mes sorties » visible à 0 sortie ; PWA relancée déconnectée → home (pas login) ; fil/chat se resynchronisent après coupure réseau ; provoquer une erreur dans une page app → écran d'erreur **avec la nav**.
