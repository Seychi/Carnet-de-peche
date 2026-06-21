# Sprints 12-13 — Brief d'exécution
## Mobile : monorepo Turborepo + app Expo + auth

> Rédigé le 2026-06-12. Durée : 4 semaines (cible 2026-07-20 → 2026-08-14, sous réserve Gate 1).
> Contexte : `docs/ROADMAP.md` §Sprints 12-13 + ⛳ Gate 1 · DA mobile : `docs/maquette-v2/mobile.html` (référence produit) + `docs/maquette-v2/DA.md` · Tokens implémentés : `docs/sprint-10.5/RECAP.md` (phase 1-2).
> Décisions John 2026-06-12 : brief préparé en avance pendant l'exécution du sprint 11 ; exécution conditionnée au **Go de Gate 1** (~16 juillet).

**Préalable avant de démarrer** (manuel John, certains avec délai — à lancer DÈS MAINTENANT, pas au jour 1) :
1. **⛳ Gate 1 = Go** (critères dans `docs/ROADMAP.md`). Si No-Go, ce brief est gelé tel quel.
2. **Compte Apple Developer** (99 $/an) — validation Apple 24-48h, parfois plus. Sans lui : pas d'Apple Sign-In testable sur device, pas de TestFlight. ⚠️ DEMANDER À JOHN : compte **individuel** (rapide) ou **organisation** (exige un numéro DUNS, délai 1-2 semaines, mais nom d'éditeur propre sur l'App Store). Recommandation : individuel maintenant, migration organisation possible plus tard.
3. **Compte Google Play Console** (25 $ une fois) — nécessaire au sprint 19, mais la vérification d'identité Google peut prendre des jours : ouvrir maintenant.
4. **Compte Expo / EAS** (free tier suffit pour les builds preview de ces 2 sprints).
5. **Google Cloud Console** : créer les OAuth client IDs **iOS** et **Android** (en plus du client web existant). L'Android exige le SHA-1 du keystore EAS → se fait après le premier `eas build`, prévoir un aller-retour.
6. Sprint 11 mergé sur `main`, suite verte, prod stable (les e2e Playwright du sprint 11 servent de filet anti-régression web pendant la migration monorepo).

---

## 🚀 Ligne de lancement (à copier-coller par John)

> ultracode — effort xhigh. Exécute `docs/sprint-12-13/BRIEF.md`. Lance les workstreams
> A/C en parallèle dès maintenant, B dès que le squelette workspace de A est commité,
> respecte les dépendances du tableau, et termine par le workstream VERIF avant de me
> rendre la main. Ne push pas. Zéro régression web : c'est le critère n°1 du sprint.

---

## Objectif du sprint en une phrase

À J+20 : une app Expo qui démarre sur iOS Simulator et Android Emulator, où un utilisateur se connecte (email/password, Google, Apple) avec session persistée, dans un monorepo où le web continue de builder, tester et déployer **sans aucune régression**.

## Workstreams & dépendances

| WS | Contenu | Durée | Dépend de | Parallélisable jour 1 |
|----|---------|-------|-----------|----------------------|
| A | Migration monorepo Turborepo (web intact) | 3-4 j | merge sprint 11 | ✅ |
| B | Scaffold Expo SDK 56 + Expo Router + shell DA v2 | 3-4 j | A1 (squelette workspace commité) | ⚠️ J1 après-midi |
| C | `packages/config` (tokens) + `packages/db` (types + clients) | 2-3 j | — (extraction depuis le code web actuel) | ✅ |
| D | Auth mobile (email/password + Google + Apple + persistance) | 4-5 j | B + C | ❌ |
| E | EAS Build (profils dev/preview) + CI monorepo | 2 j | B | ❌ |
| VERIF | Revue finale indépendante | 1 j | tous | ❌ (toujours en dernier) |

Jalon **fin sprint 12 (J+10)** : A + B + C livrés — monorepo stable, app Expo démarre, tokens partagés.
Jalon **fin sprint 13 (J+20)** : D + E + VERIF — auth complète, builds EAS partageables.

---

## Bloc A — Migration monorepo Turborepo

Le repo actuel est un projet Next.js à la racine (un `pnpm-workspace.yaml` existe déjà — vérifier son contenu et le réutiliser). On migre vers la structure cible de CLAUDE.md §Sprints 12-13 **sans toucher au comportement du web**. Le web reste déployé par Vercel depuis `main`.

### Tâches
1. **A1 (premier commit, débloque B)** : squelette — `apps/`, `packages/`, `pnpm-workspace.yaml` (`apps/*`, `packages/*`), `turbo.json` (pipelines `build`, `dev`, `lint`, `test`, `typecheck` avec `dependsOn` et caches).
2. Déplacer le projet Next.js dans `apps/web/` : `app/`, `components/`, `lib/`, `hooks/`, `content/`, `emails/`, `e2e/`, `public/`, `scripts/`, `supabase/` (⚠️ voir garde-fous), configs (`next.config.ts`, `tsconfig.json`, `vitest.config.ts`, `playwright.config.ts`, `eslint.config.mjs`, configs Sentry, `vercel.json`, `lighthouserc.json`, `middleware.ts`, `instrumentation*.ts`). Utiliser `git mv` pour préserver l'historique.
3. Racine : `package.json` racine minimal (turbo + scripts proxy `pnpm build` → `turbo build`), `.nvmrc` conservé, `tsconfig.base.json` partagé si utile.
4. Adapter `.github/workflows/*` : install pnpm à la racine, `turbo lint typecheck test build`, e2e Playwright avec `working-directory: apps/web`. Profiter du cache Turborepo.
5. Documenter dans `docs/sprint-12-13/MONOREPO.md` : nouvelle arbo, commandes (`pnpm dev --filter web`, `--filter mobile`), et le réglage Vercel à faire (voir Reste manuel John).
6. Mettre à jour `CLAUDE.md` §6 (structure du repo) une fois la migration stabilisée.

### Critères d'acceptation
- `pnpm install && pnpm build` à la racine → build web OK (turbo).
- `pnpm test` à la racine → suite Vitest complète verte (même nombre de tests qu'avant migration, vérifié contre le RECAP sprint 11).
- `pnpm --filter web exec playwright test` → e2e verts en local.
- CI GitHub Actions verte sur la branche.
- `git log --follow apps/web/app/layout.tsx` montre l'historique pré-migration (= `git mv` utilisé).
- Aucun changement de comportement web : `next build` produit le même nombre de routes qu'avant (comparer la sortie de build avant/après).

### Garde-fous
- **Ne pas toucher** : code applicatif web (aucun refactor opportuniste pendant le déplacement), `supabase/migrations/*` (les fichiers bougent avec le dossier mais leur contenu est intouchable).
- `supabase/` : le déplacer dans `apps/web/supabase/` OU le garder à la racine (la DB est partagée web/mobile). **Tranché : racine** — `supabase/` reste à la racine du monorepo, c'est une ressource partagée, pas un artefact web.
- Vercel : le changement de **Root Directory** → `apps/web` se fait dans le dashboard (manuel John). Jusqu'à ce réglage, ne pas merger sur `main` — le déploiement casserait.
- ⚠️ DEMANDER À JOHN AVANT : si `vercel.json` (crons) entre en conflit avec le Root Directory, proposer les options plutôt que d'improviser.

## Bloc B — Scaffold Expo (SDK 56)

L'app mobile naît dans `apps/mobile/`. **Décision : Expo SDK 56** (stable juin 2026, React Native 0.85, React 19.2 — alignée sur le React 19 du web). CLAUDE.md §4 dit « SDK 51 » : c'est une décision de planification 2025, obsolète — mettre à jour CLAUDE.md dans ce sprint. Vérifier au démarrage qu'un SDK plus récent n'est pas sorti ; si oui, prendre le stable courant et le noter au RECAP.

### Tâches
1. `pnpm create expo-app apps/mobile` (template TypeScript + Expo Router), intégré au workspace pnpm. Suivre la doc Expo monorepo (metro config `watchFolders` + résolution des `node_modules` hoistés).
2. Expo Router : structure de routes calquée sur la cible produit — `(auth)/login`, `(auth)/register`, `(tabs)/` avec les 4 onglets + FAB de la DA mobile (`docs/maquette-v2/mobile.html`) : Carnet, Carte, Fil, Profil. Les écrans métier sont des **placeholders** (« Disponible bientôt ») — le contenu vient aux sprints 14-15. Seuls les écrans auth sont réels (Bloc D).
3. Shell visuel DA v2 : tab bar + FAB central conformes à la maquette mobile, fond navy/sand, JetBrains Mono chargée via `expo-font` pour les futurs chiffres métier. Consommer les tokens de `packages/config` (Bloc C) — pas de couleurs en dur.
4. `app.json` / `app.config.ts` : nom « Carnet de Pêche », slug, scheme `carnetdepeche` (deep linking sprint 19), icône + splash provisoires générés depuis le logo (`docs/logo/`), `bundleIdentifier` / `package` (voir garde-fous).
5. Lint + typecheck branchés dans turbo pour `apps/mobile`.

### Critères d'acceptation
- `pnpm --filter mobile exec expo start` → app démarre sur iOS Simulator **et** Android Emulator sans warning rouge.
- Navigation entre les 4 onglets fonctionne ; FAB visible ; aucune couleur en dur dans les écrans (grep `#0` dans `apps/mobile/app/` → 0 résultat hors config).
- `pnpm build` racine toujours vert (le mobile ne casse pas le pipeline web).

### Garde-fous
- ⚠️ DEMANDER À JOHN AVANT de figer le **bundle identifier** (proposition : `com.carnetdepeche.app` iOS et Android). Très coûteux à changer après le premier build TestFlight.
- Ne pas installer de lib de carto, de paiement, de notifications — hors périmètre (sprints 15, 17, 18).
- Pas de `react-native-web` : le partage de composants UI cross-platform est explicitement écarté (ROADMAP : « tokens partagés, composants dupliqués »).

## Bloc C — Packages partagés (`config` + `db`)

Fonder le partage de code web/mobile sur deux packages, en extrayant **sans modifier le comportement** ce qui existe côté web.

### Tâches
1. `packages/config` :
   - Design tokens DA v2 extraits de `apps/web/app/globals.css` (@theme) → source TypeScript unique (`tokens.ts` : couleurs navy-950/gold-500/coral-500/teal-300, sémantique score, radius, spacing). Le CSS web peut soit consommer ce fichier (script de génération), soit rester la copie de référence avec un test de cohérence — trancher au setup, documenter le choix.
   - Constantes partagées : whitelist départements côtiers (`lib/geo/departments.ts` actuel), espèces, techniques.
2. `packages/db` :
   - `lib/types.ts` (types Database Supabase) déplacé ici, regénéré (`supabase gen types`) ; web et mobile l'importent depuis `@carnet/db`.
   - Schémas zod partagés réutilisables (validation catch, profil) — uniquement ceux qui n'ont pas de dépendance web.
3. Adapter les imports web (`@/lib/types` → `@carnet/db`) par codemod, sans autre changement.

### Critères d'acceptation
- `pnpm test` racine vert après bascule des imports.
- `packages/config` et `packages/db` n'importent **rien** de `next`, `react-dom` ou d'API browser (vérifiable : `grep -r "from 'next" packages/` → 0).
- Un changement de token dans `packages/config` se reflète côté web (ou fait échouer le test de cohérence si option « copie de référence »).

### Garde-fous
- Ne pas déplacer `lib/supabase/client.ts`/`server.ts` web (couplés à `@supabase/ssr`, web-only). Le client mobile est créé dans le Bloc D, pas ici.
- Pas de package `ui` partagé — décision ROADMAP, ne pas la rouvrir.

## Bloc D — Auth mobile

Le cœur du sprint 13. Client Supabase mobile + 3 méthodes de connexion + persistance + respect du gate onboarding.

### Tâches
1. `apps/mobile/lib/supabase.ts` : `createClient` de `@supabase/supabase-js` (PAS `@supabase/ssr`) avec storage AsyncStorage (`@react-native-async-storage/async-storage`), `autoRefreshToken: true`, `detectSessionInUrl: false`. Vars d'env via `app.config.ts` + `process.env.EXPO_PUBLIC_*` (mêmes valeurs publiques que le web : URL + publishable key — **aucun secret**).
2. Écrans `(auth)/login` + `(auth)/register` : email/password, validation zod en français (messages identiques au web, réutiliser les schémas de `packages/db` si extraits), reset password par email (deep link différé : v1 = message « vérifie tes mails et finis sur le web »).
3. **Google Sign-In** : `expo-auth-session` avec les client IDs iOS/Android créés en préalable. Flux natif → `supabase.auth.signInWithIdToken`.
4. **Apple Sign-In** : `expo-apple-authentication` → `signInWithIdToken`. Obligatoire pour l'App Store dès qu'un login tiers (Google) est proposé — non négociable. Config Supabase Dashboard : provider Apple activé avec le bundle ID (manuel John, guidé par le RECAP).
5. Magic link : **désactivé sur mobile v1** (décision ROADMAP, UX cassante).
6. Session : persistée après kill de l'app ; refresh automatique au foreground (`AppState` listener, pattern doc Supabase RN).
7. Gate onboarding : si `profile.onboarded = false` → écran bloquant « Finis ton onboarding sur le web » avec lien `https://www.carnet-de-peche.com/onboarding` (l'onboarding mobile natif = sprint 19). Si `true` → `(tabs)`.
8. Déconnexion depuis l'onglet Profil (placeholder enrichi : avatar + pseudo + bouton logout).

### Critères d'acceptation
- Login email/password sur simulateur → arrivée sur `(tabs)`, kill app, relance → toujours connecté (AsyncStorage vérifié).
- Mauvais mot de passe → message d'erreur zod/Supabase **en français**, pas de crash.
- Google Sign-In fonctionne sur émulateur Android (et iOS si client ID prêt).
- Apple Sign-In fonctionne sur **device physique iOS** (critère ROADMAP — nécessite le compte Apple Developer ; si non livré à temps, marquer ❌ au RECAP avec la procédure de test restante).
- Un compte `onboarded=false` voit l'écran de renvoi web et ne peut PAS atteindre `(tabs)`.
- Logout → retour `(auth)/login`, session purgée.
- La même ligne `auth.users` sert web et mobile : se connecter mobile puis web avec le même compte = même profil, mêmes catches.

### Garde-fous
- **Aucun secret dans le repo** : seules les valeurs `EXPO_PUBLIC_*` (déjà publiques côté web) sont committables. `GoogleService-Info.plist` / `google-services.json` s'ils s'avèrent nécessaires → gitignore + doc.
- Ne toucher à **aucune** RLS policy, à aucune table. L'auth mobile consomme l'existant.
- Ne pas implémenter de biométrie (Face ID) — backlog, pas v1.

## Bloc E — EAS Build + CI

1. `eas.json` : profils `development` (dev client), `preview` (internal distribution, lien partageable John/César). Pas de profil `production` (sprint 19).
2. Premier `eas build --profile preview` iOS + Android. Récupérer le SHA-1 du keystore Android → finaliser le client ID Google (boucle avec le préalable 5).
3. CI : job GitHub Actions `mobile-check` (lint + typecheck `apps/mobile`) sur PR. Les builds EAS restent manuels (quota free tier).
4. Doc `docs/sprint-12-13/MOBILE-DEV.md` : comment lancer le simulateur, installer un build preview, ajouter une var d'env.

### Critères d'acceptation
- 2 liens de build EAS preview (iOS + Android) fonctionnels, installés sur au moins 1 device réel.
- CI verte incluant le job mobile.

## Workstream VERIF (obligatoire, agent indépendant)

1. `pnpm test` racine (suite complète verte, compter les tests vs RECAP sprint 11) + `pnpm build` racine OK + `pnpm --filter web exec playwright test` vert.
2. Relire chaque critère d'acceptation du brief et cocher ✅/❌ avec preuve (commande, capture, lien build EAS).
3. Passe sécurité : aucun secret commité (`git log -p` sur les nouveaux fichiers de config, grep `sk_`, `service_role`, keystores) ; aucune RLS modifiée (`git diff main -- supabase/` vide hors déplacement) ; le client mobile n'utilise que la publishable key.
4. Passe copy : tutoiement partout dans l'app mobile, zod en français, aucun écran qui promet une feature non livrée (placeholders honnêtes « bientôt »).
5. Passe régression web : sortie `next build` (nb de routes) identique à l'avant-migration ; spot-check prod preview Vercel sur `/`, `/carte`, `/carnet`, `/fil`, `/tarifs`.
6. Mettre à jour `CLAUDE.md` (§4 stack : Expo SDK 56 ; §6 structure monorepo) + `docs/ROADMAP.md` (statut sprints 12-13).
7. Livrer `docs/sprint-12-13/RECAP.md` : fait / comment tester / reste manuel John.

## Risques

| Risque | Impact | Mitigation |
|---|---|---|
| Migration monorepo casse le deploy Vercel | Prod web down | Root Directory changé AVANT merge ; deploy preview validé sur la branche ; rollback = revert du merge |
| Metro + pnpm hoisting (résolution modules en monorepo) | App ne bundle pas | Suivre la doc Expo monorepo officielle ; `node-linker=hoisted` dans `.npmrc` si nécessaire (documenter) |
| Compte Apple Developer pas prêt à temps | Apple Sign-In non testable sur device | Préalable lancé avant le sprint ; sinon critère marqué ❌ au RECAP, testé dès réception |
| Boucle SHA-1 keystore ↔ client ID Google | Google Sign-In Android retardé | Faire le premier build EAS dès le Bloc E jour 1 de la 3e semaine |
| SDK 56 trop récent, lib incompatible | Blocage scaffold | Périmètre volontairement réduit (auth only) ; libs utilisées = packages Expo officiels, alignés SDK |

## Reste manuel John (post-sprint)

- Vercel dashboard : Root Directory → `apps/web` (à faire au moment du merge, coordonné avec Claude Code).
- Supabase Dashboard : activer le provider Apple (bundle ID + key Apple), ajouter les client IDs Google iOS/Android au provider Google.
- Tester Apple Sign-In sur ton iPhone (build preview EAS).
- Relecture + merge → `main` + vérification du deploy.
- Tenir Gate 1 à jour : ce brief ne s'exécute que sur un Go.
