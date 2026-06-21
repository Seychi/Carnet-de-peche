# Sprint 11.5 — Brief d'exécution
## Durcissement post-audit (sécurité, build, SEO, tests, hygiène)

> Rédigé le 2026-06-21. Durée cible : 2-4 jours (sprint court de remédiation).
> Contexte : **`docs/audits/AUDIT-2026-06-21.md`** (audit transverse complet). Ce brief corrige **tous** les findings actionnables par Claude Code.
> Décisions John 2026-06-21 : on solde l'audit en un sprint avant de repartir sur le sprint 12-13 (mobile). Priorité absolue au 🔴 GPS.

**Préalable avant de démarrer** (manuel John) : aucun merge requis (on part de `main` = `594567d`). Confirme juste que ton checkout est bien sur `main` propre avant de lancer (l'audit a observé du flottement de branche). Le `.env.local` doit être présent pour les builds locaux.

---

## 🚀 Ligne de lancement (à copier-coller par John)

> ultracode — effort xhigh. Exécute `docs/sprint-11.5/BRIEF.md`. Commence par le **Bloc 0**
> (renormalisation CRLF, solo). Dès qu'il est commité, lance les workstreams **A/B/C/D/E/F en
> parallèle**, en respectant les dépendances du tableau. Termine par le workstream **VERIF** avant
> de me rendre la main. **Ne push pas, n'applique aucune migration en prod sans mon OK.**

---

## Objectif du sprint en une phrase

Fermer le trou GPS critique, réactiver le lint bloquant, aligner build/SEO/perf, ajouter les tests manquants et tuer le bruit CRLF — **sans aucune régression de floutage ni de gating**.

## Workstreams & dépendances

| WS | Périmètre | Durée | Dépend de | Parallèle dès le départ |
|----|-----------|-------|-----------|------------------------|
| **0** | Renormalisation CRLF (`.gitattributes`) | 0,5 j | — | ❌ **en premier, solo** |
| **A** | Sécurité BDD (migrations 025/026/027) | 1 j | Bloc 0 | ✅ |
| **B** | Build / CI / config Vercel | 0,5 j | Bloc 0 (+ C pour le flip lint) | ✅ |
| **C** | Réactivation du lint (apostrophes + flat-config) | 1-1,5 j | Bloc 0 | ✅ |
| **D** | SEO (canonical, JSON-LD, robots, noindex) | 1 j | Bloc 0 (coord. C sur `(marketing)`) | ✅ |
| **E** | Tests (unit `env`/floutage, E2E, Lighthouse) | 1 j | Bloc 0 ; assert sécu dépend de A | ✅ |
| **F** | Hygiène code & docs | 0,5 j | Bloc 0 | ✅ |
| **VERIF** | Revue finale agent indépendant | 0,5 j | tous | ❌ (toujours en dernier) |

> Règle : tout `(marketing)/*.tsx` édité à la fois par C (apostrophes) et D (metadata) → **C passe en premier sur le fichier**, D rebase derrière. Sinon parallèle plein.

---

## Bloc 0 — Renormalisation des fins de ligne (préalable, solo)

L'audit a montré que tout l'arbre apparaît « modifié » à cause de fins de ligne CRLF sans `.gitattributes`. On normalise **avant** de lancer les autres WS, pour que tous les diffs suivants soient propres.

### Tâches
1. Créer `.gitattributes` à la racine : `* text=auto eol=lf` (+ exceptions binaires : `*.png/*.jpg/*.webp/*.ico/*.pdf binary`).
2. `git config core.autocrlf input` (local).
3. `git add --renormalize .` puis un commit dédié `chore: normalise les fins de ligne en LF (.gitattributes)`.

### Critères d'acceptation
- `git diff --stat` est **vide** juste après le commit (plus de bruit CRLF).
- Un `git status` propre hors fichiers non suivis listés en WS F.

### Garde-fous
- Commit **isolé** (rien d'autre dedans). Les WS A-F partent **après** ce commit.

---

## Bloc A — Sécurité base de données

Trois migrations **nouvelles** (ne jamais éditer 001→024). Régénérer `lib/types.ts` à la fin.

### Tâches
1. **`supabase/migrations/025_lock_get_spots_for_scoring.sql`** (🔴 le fix central de l'audit) :
   ```sql
   revoke execute on function public.get_spots_for_scoring() from anon, authenticated, public;
   grant  execute on function public.get_spots_for_scoring() to service_role;
   ```
   Vérifier d'abord que le cron `compute-spot-scores` appelle bien cette fonction via le **client service-role** (`lib/supabase/admin.ts`) — c'est le cas, donc le cron n'est pas impacté.
2. **`supabase/migrations/026_harden_functions.sql`** : ajouter `set search_path = public` (ou `''` qualifié) aux 6 fonctions à search_path mutable : `blur_spot_geom`, `blur_catch_geom`, `bump_likes_count`, `bump_comments_count`, `touch_updated_at`, `get_my_catches_breakdown`. Recréer chaque fonction à l'identique + la clause `SET`.
3. **`supabase/migrations/027_perf_fk_indexes.sql`** : créer les index couvrants sur les FK non indexées : `feed_likes(user_id)`, `feed_posts(moderated_by)`, `reports(reporter_id)`, `reports(resolved_by)`, `spots(created_by)`.
4. Régénérer les types : `pnpm dlx supabase gen types typescript --project-id glgciwwnpmgifyhbvxsw > lib/types.ts`.

### Critères d'acceptation
- Après application (par John, cf. Reste manuel) :
  - `select has_function_privilege('anon','public.get_spots_for_scoring()','EXECUTE')` → **false** ; `service_role` → **true**.
  - Appel REST anon `POST /rest/v1/rpc/get_spots_for_scoring` (clé publique) → **401/403** (plus de coords).
  - `select proname, proconfig from pg_proc where proname in (…les 6…)` → chaque ligne contient `search_path=public`.
  - `get_advisors(security)` ne liste plus les 6 `function_search_path_mutable`.
- Le cron produit toujours `spot_scores` (10 lignes) au run suivant.

### Garde-fous
- ⚠️ **Vues `security_invoker` = HORS PÉRIMÈTRE de ce sprint.** Ne **PAS** basculer `catches_for_viewer` / `spots_for_viewer` / `feed_posts_for_viewer` / `profile_stats` en `security_invoker` ici : ces vues SONT la couche de floutage, le changement est subtil et risqué. À traiter dans un sprint dédié avec tests RLS croisés. Laisser tel quel.
- ⚠️ **Ne PAS** consolider les `multiple permissive policies` ni droper d'index « inutilisés » (faux positifs à faible volume) — risque de régression d'accès, gain nul aujourd'hui.
- RLS jamais désactivée. Aucune autre fonction touchée.

---

## Bloc B — Build / CI / config Vercel

### Tâches
1. `package.json` : ajouter `"engines": { "node": "20.x" }` (force Vercel sur Node 20, aligné `.nvmrc`/CI — fini le Node 24).
2. `vercel.json` : ajouter `"regions": ["dub1"]` (Dublin = région de la base Supabase `eu-west-1`, fin de la latence transatlantique ; `cdg1` Paris acceptable en repli) ; passer `installCommand` à `rm -rf node_modules && pnpm install --frozen-lockfile`.
3. **Gated sur C vert** : dans `next.config.ts`, **retirer** `eslint.ignoreDuringBuilds: true`. Dans `.github/workflows/check.yml`, retirer `continue-on-error: true` du step `pnpm lint` (lint redevient bloquant).
4. Confirmer que `withSentryConfig` n'upload les source maps que si `SENTRY_AUTH_TOKEN` présent (déjà OK, ne pas casser).

### Critères d'acceptation
- `pnpm build` OK en local.
- `next.config.ts` ne contient plus `ignoreDuringBuilds` ; `check.yml` n'a plus `continue-on-error` sur le lint.
- `package.json` → `engines.node = "20.x"` ; `vercel.json` → `regions` + `--frozen-lockfile`.

### Garde-fous
- Le retrait de `ignoreDuringBuilds` (tâche 3) ne se fait **qu'après** que C ait rendu `pnpm lint` vert — sinon le build casse. Coordonner.
- Ne pas toucher au patch `webpack.symlinks=false` (contournement casse Windows) sans test : juste **documenter** par un commentaire dans `next.config.ts` qu'il est spécifique au poste de John.

---

## Bloc C — Réactivation du lint

La dette : ~360 `react/no-unescaped-entities` (apostrophes françaises dans le JSX) + un bug `eslint-config-next` v16 / flat-config (JSON circulaire).

### Tâches
1. Résoudre le bug flat-config : aligner `eslint-config-next` sur la ligne de Next 15 (`^15.x`) au lieu de `^16` (incompatible flat config sur Next 15). `pnpm install`, vérifier que `pnpm lint` s'exécute sans crash de config.
2. Corriger les ~360 `react/no-unescaped-entities` : remplacer les apostrophes droites par `&apos;`/`’` typographique dans le JSX (privilégier `’` pour le rendu FR), ou échapper. Passe mécanique sur tout `app/` + `components/`.
3. Obtenir `pnpm lint` → **0 erreur, 0 warning**.

### Critères d'acceptation
- `pnpm lint` exit code **0**, sortie propre.
- `pnpm typecheck` + `pnpm test` toujours verts (aucune régression introduite par les remplacements).

### Garde-fous
- Ne corriger **que** des problèmes de lint (apostrophes / règles). **Ne pas** refactorer la logique au passage.
- Tutoiement et sens des phrases FR préservés (le `’` ne doit pas casser une chaîne).

---

## Bloc D — SEO

### Tâches
1. **Canonical** sur les pages qui n'en ont pas : `/` , `/carte`, `/tarifs`, `/techniques` (via `alternates.canonical` dans le `metadata`/`generateMetadata` de chaque route).
2. **JSON-LD** :
   - `/` (home) : `WebSite` + `Organization` (+ `SearchAction` si recherche prévue).
   - `/tarifs` : `Product` / `Offer` (les 3 formules, prix 0 / 4,90 / 9,90 €).
   - `/especes` : `ItemList` (les espèces) + `BreadcrumbList`.
3. `/techniques` (stub « Bientôt disponible ») : ajouter `robots: { index: false }` dans son `metadata` tant que la page est vide.
4. `app/robots.ts` : ajouter `/dev/` aux `disallow` (cohérence).

### Critères d'acceptation
- `view-source` (ou `curl`) de `/`, `/carte`, `/tarifs` contient `<link rel="canonical" …>`.
- `/` contient un `<script type="application/ld+json">` de `@type` `WebSite`+`Organization` ; `/tarifs` `Product/Offer` ; `/especes` `ItemList`.
- `/techniques` contient `<meta name="robots" content="noindex">`.
- `/robots.txt` liste `Disallow: /dev/`.
- **Non-régression** : les JSON-LD existants `/spots` (`ItemList`) et `/spots/[slug]` (`Place`) restent valides.

### Garde-fous
- Ne pas modifier la copy marketing (périmètre WS C/contenu). Toucher uniquement `metadata` / blocs JSON-LD.
- Coordonner avec C sur les fichiers `(marketing)` partagés.

---

## Bloc E — Tests

### Tâches
1. **Unitaire `lib/env.ts`** : tester la logique `isProd` (vars serveur requises en prod, optionnelles en dev ; les 2 `NEXT_PUBLIC_SUPABASE_*` requises partout). C'est la logique qui pilote tous les builds.
2. **Régression floutage (la plus importante, post-Bloc A)** : test qui vérifie qu'un appel REST **anon** ne peut plus lire de geom précis — en particulier `get_spots_for_scoring` rejeté, et que `spots_for_viewer`/`catches_for_viewer` ne renvoient que `geom_public` pour un visiteur non abonné. (Intégration : via client anon contre la stack locale CI.)
3. **E2E downgrade Stripe** (`e2e/05-stripe-downgrade.spec.ts`) : webhook `customer.subscription.deleted` auto-signé → `current_tier` repasse `discovery` → la carte re-verrouille les filtres / repasse en 3 spots floutés.
4. **Lighthouse** (`lighthouserc.json`) : ajouter des assertions **a11y ≥ 0,9** et **seo ≥ 0,9** en `error` (best-practices en `warn`), en plus de la perf existante.

### Critères d'acceptation
- `pnpm test` : nouveaux tests verts, suite globale toujours verte (~265 → +N).
- `e2e/05-stripe-downgrade.spec.ts` présent et passant en CI.
- `lighthouserc.json` assert a11y + seo.

### Garde-fous
- Les E2E tournent en CI (Docker absent du poste John) — ne pas exiger d'exécution locale.
- L'assert sécu (tâche 2) suppose la migration 025 appliquée sur la stack de test.

---

## Bloc F — Hygiène code & docs

### Tâches
1. `lib/supabase/admin.ts` : ajouter `import 'server-only'` en tête (parité avec `service-role.ts`). Optionnel : fusionner les deux factories service-role en une seule voie auditée (si bas risque).
2. `app/(app)/carnet/error.tsx` : remplacer le `// TODO` par un vrai `Sentry.captureException(error)` (l'instrumentation est déjà câblée).
3. `CLAUDE.md` : corriger les dérives relevées par l'audit — région Supabase **eu-west-1 (Irlande)** (pas eu-west-3 Paris) ; `main` à `594567d` ; ~**265 tests** (pas 215). Ajouter une ligne « audit 2026-06-21 traité (sprint 11.5) ».
4. Fichiers non suivis : ⚠️ **DEMANDER À JOHN AVANT** de commiter `supabase/seed-spots-lot-1.sql` (28 spots « à valider ») — ne PAS l'insérer en base. Les docs non suivis (`docs/audits/AUDIT-2026-06-21.md`, `docs/contenu/videos/WORKFLOW-PRODUCTION.md`, `docs/sprint-10/lot-1-verification.md`, `docs/sprint-12-13/`) peuvent être commités tels quels.

### Critères d'acceptation
- `admin.ts` importe `server-only` ; `carnet/error.tsx` appelle `Sentry.captureException`.
- `CLAUDE.md` § région/sha/tests corrigés.
- `pnpm build` + `pnpm typecheck` verts.

### Garde-fous
- ⚠️ Ne pas insérer `seed-spots-lot-1.sql` en base (validation spots = John).

---

## Workstream VERIF (obligatoire, agent indépendant)

L'agent VERIF n'a écrit aucun des blocs ci-dessus.

1. `pnpm lint` (0), `pnpm typecheck` (0), `pnpm test` (vert), `pnpm build` (OK).
2. Relire **chaque** critère d'acceptation des blocs 0/A/B/C/D/E/F et cocher ✅/❌ avec preuve (commande, URL, requête SQL).
3. **Passe sécurité (prioritaire)** :
   - `has_function_privilege('anon','public.get_spots_for_scoring()','EXECUTE')` = **false** (sur la base où 025 est appliquée).
   - Aucune nouvelle écriture ne contourne `catches_for_viewer` / `spots_for_viewer`. RLS active partout. Pas de secret commité.
   - **Gating intact** : un visiteur Découverte voit toujours 3 spots/dépt floutés, filtres verrouillés ; un abonné voit le précis. Le floutage 1 km des prises publiques est intact.
4. **Passe copy** : tutoiement partout, messages zod en français, aucune promesse produit mensongère introduite.
5. Livrer **`docs/sprint-11.5/RECAP.md`** : fait / comment tester / reste manuel John, avec la liste des migrations à appliquer dans l'ordre.

---

## Reste manuel John (post-sprint, hors outils Claude Code en autonomie)

1. 🔴 **Appliquer `025` en prod en priorité** (Supabase Studio SQL Editor ou `supabase db push`), puis lancer la requête de vérif `has_function_privilege('anon', …)` = false. Appliquer ensuite `026` et `027`.
2. 🟠 **Vercel → Settings → Environment Variables → Preview** : ajouter `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_ANON_KEY` (débloque les builds de PR/branche).
3. 🟠 **Vercel** : confirmer après déploiement que le build tourne en **Node 20** (forcé par `engines.node`) et prend la **région `dub1`**.
4. 🟡 **Supabase → Auth → Policies** : activer **Leaked Password Protection** (HaveIBeenPwned).
5. Trancher le sort de `seed-spots-lot-1.sql` (commit ? insertion plus tard après validation des 28 spots).
6. Relire le diff, puis **push** (Claude Code ne push pas sans ton OK).

---

## Rappels invariants (ne jamais enfreindre)
- Pas de `push` sans validation de John ; pas d'application de migration en prod sans son OK.
- RLS jamais désactivée ; nouvelle table → RLS d'abord, puis policies.
- Migrations = **nouveaux** fichiers numérotés (jamais éditer un ancien) ; régénérer `lib/types.ts` après toute migration.
- Toujours lire les prises via `catches_for_viewer`, les spots via `spots_for_viewer`.
- Tutoiement dans toute l'UI ; zod en français.
