# Sprint 88 — Brief d'exécution
## « Rendre le sprint 84 vrai » — la fiche spot n'est plus statique, et Sentry ne sert plus à rien

> Rédigé le **2026-08-18**. Durée cible : **1 sprint court** (WS A/B/C/D parallèles jour 1, WS E en lecture seule).
> Source : `docs/audits/AUDIT-SENTRY-2026-08-18.md` (36 issues ouvertes, chacune recroisée avec `main` = `573c24f`).
> Contexte : `docs/sprint-84/RECAP.md` (l'ISR que ce sprint répare), `docs/sprint-85/BRIEF.md` (fenêtre de mesure),
> `docs/sprint-83/RECAP.md` (**fenêtre ouverte jusqu'au 07/09** : aucun `<title>`, aucun maillage, aucun sitemap touché ici).
> Décisions John 2026-08-18 : **Bloc 0 part en hotfix séparé**, mergeable et déployable seul, avant le reste ✅ ·
> **le sujet WAF/403 Googlebot entre dans le brief en investigation lecture seule**, sans changement de code ✅ ·
> numérotation sprint 88 ✅.

**Préalable avant de démarrer** (manuel John, ~2 minutes, **bloquant pour la vérification du Bloc 3**) :

1. **Dashboard Vercel → projet `carnet-de-peche` → Settings → Toolbar** : désactiver la toolbar / Vercel Live pour l'environnement **Production**. Preuve que c'est nécessaire : `JAVASCRIPT-NEXTJS-J`, 130 événements, `Document URI: https://www.carnet-de-peche.com/`, sur des IP résidentielles françaises en Chrome 151 — donc de vrais visiteurs, pas des bots. Le script `vercel.live/_next-live/feedback/feedback.js` est injecté par le runtime Next sur la **prod**, et notre CSP le bloque (à raison).
2. Noter l'heure exacte de ce changement : le Bloc 3 doit vérifier que `J` cesse de recevoir des événements après.

---

## 🚀 Ligne de lancement (à copier-coller par John)

> ultracode — effort xhigh. Exécute `docs/sprint-88/BRIEF.md`. **Commence par le Bloc 0 SEUL** : il part en hotfix, sur sa propre branche, et tu me rends la main pour que je le déploie avant de continuer. Une fois que je te dis « hotfix déployé », lance les workstreams B, C, D et E en parallèle, respecte les dépendances du tableau, et termine par le workstream VERIF avant de me rendre la main. Ne push pas.

---

## 🧠 Connecteurs & sous-agents (usage systématique — cf `CLAUDE.md` §20)

| Quand | Sous-agent → connecteur | Pourquoi |
|---|---|---|
| **Bloc 0** — sémantique exacte de `fetch` + `revalidate` + `dynamic` en **Next 15.5** | **docs-researcher** → Context7 | Le cœur du sprint. Ne PAS coder de mémoire : savoir précisément lequel de `next: { revalidate: N }`, « pas d'option du tout » et `export const dynamic = 'force-static'` empêche le bailout, et si un `AbortSignal` passé à `fetch` désactive le Data Cache. C'est la seule question qui décide du correctif. |
| **Bloc 2** — API de config de **zod 4.4.3** | **docs-researcher** → Context7 | Confirmer la signature de `z.config({ jitless: true })` et son point d'application (global vs par schéma). Clé déjà repérée dans `node_modules/zod/v4/core/core.d.cts:67`, mais la doc tranche le « où l'appeler ». |
| **Blocs 0 / 3 / 4 / 5** — après déploiement | **deploy-watch** → Vercel + Sentry | **C'est le critère d'acceptation de ce sprint** : chaque bloc se juge sur l'arrêt d'une issue Sentry nommée, pas sur un test vert. |
| **Bloc 4 / 5** — QA réelle mobile | **qa-chrome** → Claude in Chrome + Playwright | Bannière PWA sur Safari stockage bloqué (Bloc 4), tap pendant démontage de carte (Bloc 5). Deux bugs qui ne se reproduisent qu'au doigt. |
| **Bloc 6** — investigation WAF | **qa-chrome** + **deploy-watch** → Vercel | Lecture seule. Ne touche à aucun fichier. |
| Clôture | **`/verif-sprint`** | Tests + build + lint + types + revue croisée indépendante. |

⚠️ **Aucun bloc de ce sprint ne touche à la base.** Pas de migration, pas de RLS, pas de regen `lib/types.ts`. Si un agent croit avoir besoin de Supabase, il s'est trompé de bloc.

---

## Objectif du sprint en une phrase

**`/spots/[slug]` redevient réellement servie depuis le cache (issue `1P` à zéro événement), et Sentry redescend d'environ 1 600 à moins de 60 événements par mois, dont zéro bruit.**

---

## Workstreams & dépendances

| WS | Bloc(s) | Durée | Dépend de | Parallélisable jour 1 |
|----|---------|-------|-----------|----------------------|
| **A** | **Bloc 0 — HOTFIX ISR** | 0,5 j | — | ✅ **et se déploie SEUL, avant tout le reste** |
| B | Bloc 1 (verrous) | 0,5 j | A (le correctif doit exister pour être verrouillé) | ❌ |
| C | Blocs 2 + 3 (CSP : zod, Vercel Live, report-uri) | 0,5 j | Préalable John n°1 pour la *vérif* du Bloc 3 uniquement | ✅ |
| D | Blocs 4 + 5 (PwaProvider, MapLibre) | 1 j | — | ✅ |
| E | Bloc 6 (investigation WAF, lecture seule) | 0,5 j | — | ✅ |
| F | Bloc 7 (ménage Sentry) | 0,25 j | A, C, D déployés | ❌ (toujours après les déploiements) |
| VERIF | revue finale | 0,5 j | tous | ❌ (toujours en dernier) |

---

## Bloc 0 — HOTFIX : la fiche spot a perdu son ISR le 17/08 à 16 h 48

**Ce bloc part seul, sur sa propre branche, et se déploie avant que le reste du sprint ne commence.** Il fait trois lignes de code. Il est urgent parce que la page concernée porte **80 % des clics Google** et que la dégradation court depuis le déploiement du sprint 84.

### Le fait

`JAVASCRIPT-NEXTJS-1P` — **355 événements**, statut `escalating`, première occurrence **17/08 16 h 48** (= déploiement S84), dernière il y a moins d'une minute.

```
Error: Page changed from static to dynamic at runtime /spots/<slug>,
reason: revalidate: 0 fetch https://marine-api.open-meteo.com/v1/marine?...
→ carnet-de-peche/app/(marketing)/spots/[slug]/page.tsx:535 (SpotPage)
→ lib/conditions/spot-forecast.ts:389 → :355 → :285 (fetchOpenMeteo)
→ next/dist/server/lib/patch-fetch.js:510 → markCurrentScopeAsDynamic
```

### La cause, trois lignes qui se contredisent

| Fichier | Ligne | Contenu |
|---|---|---|
| `app/(marketing)/spots/[slug]/page.tsx` | 281 | `export const revalidate = 1800` |
| `app/(marketing)/spots/[slug]/page.tsx` | 535 | `fetchSpotConditions(...).catch(() => null)` |
| `lib/conditions/spot-forecast.ts` | 283 | `fetch(url, { next: { revalidate: 0 }, signal: ... })` |

Un `fetch` marqué `revalidate: 0` **à l'intérieur** d'une route qui déclare un `revalidate` statique force Next à sortir du rendu statique. Aggravant : `fetchOpenMeteo` enveloppe ce `fetch` dans un `try/catch` générique **avec un retry**, donc il avale le `DynamicServerError` de Next **deux fois** et le traite comme une panne réseau, avant que Next ne rattrape le coup en fin de rendu.

> **Connecteurs** : **docs-researcher** → Context7 **AVANT d'écrire la moindre ligne**. Trois questions à trancher sur la doc Next **15.5** (pas de mémoire, pas de blog post) :
> 1. Un `fetch` **sans aucune option de cache** dans une route à `revalidate` statique déclenche-t-il `markCurrentScopeAsDynamic`, ou seulement un `revalidate: 0` / `cache: 'no-store'` **explicite** ?
> 2. Passer un `signal: AbortSignal.timeout(...)` désactive-t-il le Data Cache (ce qui rendrait un `revalidate: 900` inopérant en silence) ?
> 3. `export const dynamic = 'force-static'` combiné à `export const revalidate = 1800`, `generateStaticParams()` et `dynamicParams = true` : comportement exact, et est-ce que ça neutralise le bailout au lieu de le faire échouer ?

### Tâches

1. **`lib/conditions/spot-forecast.ts:283`** — supprimer le `revalidate: 0`. Variante par défaut, à confirmer par docs-researcher :

   ```ts
   const res = await fetch(url, {
     // Le cache métier est `weather_cache` (readCache, FRESH_TTL_MS = 1 h, ligne 150) :
     // ce fetch ne part qu'une fois par heure et par (spot, date). `revalidate: 0`
     // n'apportait donc RIEN, et coûtait le rendu statique de toute la fiche spot
     // (issue Sentry JAVASCRIPT-NEXTJS-1P, 355 évts en 22 h).
     next: { revalidate: 900 },
     signal: AbortSignal.timeout(OPEN_METEO_TIMEOUT_MS),
   })
   ```

2. **Ne plus avaler les erreurs de contrôle de Next.** Ajouter un garde en tête du `catch` de `fetchOpenMeteo` (`lib/conditions/spot-forecast.ts`, vers la ligne 292) — et **le même garde** sur les `.catch(() => null)` de `app/(marketing)/spots/[slug]/page.tsx:535-545` :

   ```ts
   // lib/conditions/next-errors.ts (nouveau, ~10 lignes, testable)
   /**
    * Next signale « cette route ne peut pas rester statique » en LEVANT une erreur
    * porteuse d'un `digest`. Ce n'est pas une panne : c'est un signal de contrôle.
    * L'attraper et le transformer en `null` masque la régression (S84 → S88) et
    * fait retenter un fetch qui ne peut pas réussir. Toujours le relancer.
    */
   export function rethrowIfNextControlFlow(err: unknown): void {
     const digest = (err as { digest?: unknown } | null)?.digest
     if (typeof digest === 'string' &&
         (digest.startsWith('DYNAMIC_SERVER_USAGE') || digest === 'NEXT_NOT_FOUND' || digest.startsWith('NEXT_REDIRECT'))) {
       throw err
     }
   }
   ```

   ⚠️ Le `digest` exact de `DynamicServerError` en Next 15.5 est à **vérifier via docs-researcher / le code de `next/dist/client/components/hooks-server-context.js`**, pas à supposer. Si la constante diffère, adapter — et la citer en commentaire avec sa source.

3. **Ne PAS toucher** `lib/conditions/openmeteo.ts:92` et `:113`, qui portent le même `revalidate: 0`. Vérifié : ce module n'est importé que par `lib/catches/actions.ts` (server action, toujours dynamique) et par des `import type`. Ajouter un commentaire d'une ligne à ces deux endroits pour que le prochain lecteur ne « corrige » pas un non-problème.

### Critères d'acceptation

- `pnpm test` et `pnpm build` verts.
- `pnpm check:prerender` passe (il passait déjà — voir Bloc 1 pour la raison).
- **Le seul critère qui compte, après déploiement** : via **deploy-watch**, `JAVASCRIPT-NEXTJS-1P` ne reçoit **plus aucun événement** dans les 30 minutes suivant le déploiement. Le compteur était à 355 le 18/08 vers 12 h et montait d'environ **15 événements/heure**. S'il monte encore, le correctif n'a pas pris — ne pas conclure sur un test vert.
- Vérification croisée : `curl -sI https://www.carnet-de-peche.com/spots/pointe-du-grand-minou | grep -i x-vercel-cache` doit donner `HIT` ou `STALE` sur deux appels consécutifs. ⚠️ **À lancer depuis la machine de John ou via qa-chrome**, pas depuis un conteneur : le WAF Vercel répond 403 à toute IP datacenter (cf Bloc 6).

### Garde-fous

- Ne pas toucher à `export const revalidate = 1800`, ni à `generateStaticParams()`, ni à la liste des 10 slugs : trois tests les verrouillent dans `__tests__/spot-pages-are-static.test.ts`.
- Ne pas « optimiser » `weather_cache` en passant : hors périmètre.
- ⚠️ **DEMANDER À JOHN AVANT** de poser `export const dynamic = 'force-static'` sur la page. C'est l'option B si la variante A ne suffit pas, et elle change la sémantique de toute la route (les API dynamiques renvoient des valeurs vides au lieu d'échouer) : ça se décide, ça ne se glisse pas dans un hotfix.

---

## Bloc 1 — Les deux verrous qui auraient dû attraper le Bloc 0

Ce bloc est le vrai enseignement du sprint. **Les deux garde-fous du sprint 84 existent, sont bons, et ne pouvaient structurellement pas voir cette régression.** Tant qu'on ne les élargit pas, le même bug reviendra au prochain module qui appelle une API externe.

### Trou n°1 — le test ne cherche que les cookies

`__tests__/spot-pages-are-static.test.ts` remonte le graphe d'imports serveur des deux pages spots et interdit `next/headers`, `lib/supabase/server.ts` et `lib/auth/tier.ts`. Excellent contre la régression du sprint 84. **Aveugle** au `revalidate: 0`, qui rend la route dynamique par un chemin totalement différent.

### Trou n°2 — le témoin manquant, annoncé dans le script lui-même

`scripts/check-prerender.mjs`, commentaire de la liste `WITNESSES` :

> *« Volontairement PAS de `/spots/[slug]` ici : au moment où ce script est écrit, la fiche spot est un go/no-go (Bloc 3) et n'est pas encore censée passer. **La rajouter le jour où le Bloc 3 est livré.** »*

Le Bloc 3 du sprint 84 **a été livré**. Le témoin n'a jamais été ajouté.

> **Connecteurs** : aucun. Bloc purement local, à faire après le Bloc 0.

### Tâches

1. **Étendre `__tests__/spot-pages-are-static.test.ts`** avec un troisième `describe` qui réutilise le parseur d'imports déjà présent (`findViolations` marche par fichier ; il faut ici parcourir le même graphe mais chercher un **motif dans le source**, pas une cible d'import) :
   - parcourir le graphe d'imports serveur des deux racines `ROOTS` ;
   - échouer si un fichier du graphe contient `revalidate: 0` ou `cache: 'no-store'` **hors commentaire** (le helper `stripComments` existe déjà, ligne ~35) ;
   - message d'échec dans le style de `format()` : expliquer que la conséquence est la bascule dynamique au runtime, invisible au build, et citer l'issue `JAVASCRIPT-NEXTJS-1P` comme précédent.
2. **Ajouter `/spots/pointe-du-grand-minou` aux `WITNESSES`** de `scripts/check-prerender.mjs`, et **réécrire le commentaire** qui disait « à rajouter le jour où le Bloc 3 est livré » pour qu'il ne mente plus.
3. **Test méta** : comme le fichier le fait déjà pour `Header.tsx`, ajouter un cas témoin qui prouve que le nouveau détecteur mord (un fichier de fixture, ou `lib/conditions/openmeteo.ts` qui contient légitimement le motif — dans ce cas le test doit vérifier qu'il est bien détecté **quand on l'ajoute artificiellement au graphe**, pas qu'il déclenche une violation réelle).

### Critères d'acceptation

- Le nouveau test **échoue** si on remet `next: { revalidate: 0 }` dans `lib/conditions/spot-forecast.ts` (le prouver : le remettre, lancer `pnpm test`, montrer l'échec, le retirer).
- `pnpm check:prerender` échoue si `/spots/[slug]` n'est ni dans `routes` ni dans `dynamicRoutes` avec fallback actif.
- Aucun test existant cassé.

### Garde-fous

- Ne pas transformer ce test en interdiction globale de `no-store` dans le repo : `lib/analytics/server.ts:72` et `app/api/seabed/tiles/route.ts:42` en ont **légitimement** besoin. Le test ne doit regarder que le graphe d'imports serveur des deux pages spots.

---

## Bloc 2 — 1 154 violations CSP par le JIT de zod

`JAVASCRIPT-NEXTJS-H` — **l'issue n°1 du projet en volume**, 512 utilisateurs, sur `/carte` (59), `/auth/login` (44), `/auth/register` (30), `/spots` (28), `/carnet/nouvelle` (27), la home, et toutes les fiches spots.

**Rien n'est cassé fonctionnellement** — c'est important à savoir avant de toucher quoi que ce soit. Le chunk exact cité par Sentry (`3906-baab2d33b3a72def.js`) a été retrouvé dans le build local, même hash :

```js
if (r.cr.jitless || navigator?.userAgent?.includes("Cloudflare")) return !1;
try { return Function(""), !0 } catch(e) { return !1 }      // ← sonde bloquée par la CSP
...
compile(){ return Function(...this?.args, ...) }             // ← le JIT lui-même
X = { major: 4, minor: 4, patch: 3 }                         // ← zod 4.4.3
```

zod v4 compile ses validateurs avec le constructeur `Function` et sonde d'abord sa disponibilité. Notre CSP porte `'unsafe-inline'` mais **pas** `'unsafe-eval'` (`next.config.ts:81`, volontaire). La sonde est bloquée, zod retombe proprement sur son chemin interprété — mais laisse une violation CSP **et un POST réseau vers Sentry par visiteur et par page**.

> **Connecteurs** : **docs-researcher** → Context7 sur **zod 4.4.3**. Confirmer la signature de `z.config({ jitless: true })`, sa portée (globale au module `zod` ?), et le moment où le flag doit être posé pour précéder la première construction de schéma.

### Tâches

1. Poser le flag **le plus tôt possible côté client**, dans `instrumentation-client.ts` (fichier chargé par Next avant l'hydratation) :

   ```ts
   import * as z from 'zod'
   // CSP sans 'unsafe-eval' (next.config.ts:81, volontaire) : le JIT de zod v4 sonde
   // `Function("")`, la sonde est bloquée, et chaque page génère un rapport CSP —
   // 1 154 événements / 512 utilisateurs sur l'issue JAVASCRIPT-NEXTJS-H. zod retombe
   // seul sur son chemin interprété, donc on ne perd AUCUNE validation : on lui évite
   // juste de sonder. Ne PAS « corriger » en ajoutant 'unsafe-eval' à la CSP.
   z.config({ jitless: true })
   ```

2. Vérifier que le flag est bien posé **avant** le premier parse. Si `instrumentation-client.ts` s'avère trop tard (à mesurer, pas à supposer), déplacer l'appel dans un module minimal importé en tête du layout racine et le dire dans le RECAP.
3. **Constat annexe à remonter, sans agir** : zod se retrouve dans le chunk partagé chargé sur `/carte` et sur les fiches spots, qui n'ont aucun formulaire. Mesurer le poids (`pnpm analyze`) et **écrire le chiffre dans le RECAP**. Optimisation de bundle = hors périmètre de ce sprint.

### Critères d'acceptation

- Après déploiement, via **deploy-watch** : `JAVASCRIPT-NEXTJS-H` ne reçoit plus d'événement. Base de comparaison : **268 événements / 119 utilisateurs sur les dernières 24 h**.
- **Non-régression fonctionnelle obligatoire** (via **qa-chrome**, sur preview) : soumettre le formulaire de connexion avec un e-mail invalide, le formulaire d'inscription avec un mot de passe trop court, et le formulaire de nouvelle prise avec un champ requis vide → **les messages d'erreur zod en français s'affichent toujours**. C'est la seule chose que ce bloc pourrait casser.
- `pnpm test` vert (les schémas zod sont couverts par les tests d'actions existants).

### Garde-fous

- ⚠️ **Interdit** d'ajouter `'unsafe-eval'` à `script-src`. Un test existant le verrouille (`__tests__/security-headers.test.ts`, « CSP : pas d''unsafe-eval' hors dev ») et c'est très bien ainsi.
- Ne pas changer de version de zod dans ce sprint.

---

## Bloc 3 — Vercel Live sur la prod, et des rapports CSP qui viennent des previews

Deux problèmes distincts, même fichier.

### 3a — Le script Vercel Live tourne sur la production

`JAVASCRIPT-NEXTJS-J`, 130 événements, 23 utilisateurs, dernière occurrence il y a 2 h :

```
Blocked URI : https://vercel.live/_next-live/feedback/feedback.js
Document URI: https://www.carnet-de-peche.com/          ← la VRAIE prod
Source File : /_next/static/chunks/webpack-7bc57932719946a4.js
```

La CSP a raison : `vercel.live` n'est ouvert que si `VERCEL_ENV === 'preview'` (`next.config.ts:85`). Le correctif est **le Préalable John n°1**, pas du code.

À savoir, et à écrire dans le RECAP : `instrumentation-client.ts` a bien un `denyUrls: [/vercel\.live/, /\/_next-live\//]` (sprint 70), **et il ne peut rien faire ici**. Les rapports CSP sont POSTés **directement par le navigateur** au `report-uri`, ils ne passent jamais par `beforeSend`, `ignoreErrors` ni `denyUrls`. C'est vrai pour les **16 issues CSP** du projet. Le sprint 70 a filtré les *erreurs JS* venant de la toolbar, pas ses *rapports CSP* — la confusion est facile et mérite d'être notée pour la prochaine fois.

### 3b — Le bruit CSP des previews protégés

Six issues (`1G`, `1C`, `T`, `1K`, `18`, `1M`), même profil : `Document URI = <deployment>.vercel.app/sw.js`, `blocked-uri` = un asset **du même domaine**, client `HeadlessChrome 141` depuis AWS us-west-1. Mécanisme : sur un déploiement **preview protégé**, la requête est redirigée vers l'authentification Vercel ; la spec CSP masque la cible de la redirection et rapporte l'URL d'origine. **Jamais observé sur le domaine de prod.**

> **Connecteurs** : **deploy-watch** → Sentry pour mesurer avant/après. Aucune lecture Supabase.

### Tâches

1. `next.config.ts:55` — ne poser le `report-uri` **que sur la production** :

   ```ts
   // Les rapports CSP contournent tous les filtres du SDK (ils sont POSTés par le
   // navigateur au report-uri, pas par Sentry.init) : c'est ici, et nulle part
   // ailleurs, qu'on décide de ce qui remonte. Sur les previews protégés, la
   // redirection d'authentification Vercel produit des violations fantômes
   // same-origin (issues 1G/1C/T/1K/18/1M, ~40 évts, toutes en HeadlessChrome).
   const cspReportUri =
     process.env.VERCEL_ENV === "production" ? sentryCspReportUri() : null;
   ```

2. **Mettre à jour `__tests__/security-headers.test.ts`** — deux tests l'exercent (« report-uri dérivé du DSN Sentry quand il est présent » et « pas de report-uri sans DSN ou avec un DSN invalide », lignes ~105-120). Ils doivent maintenant poser `process.env.VERCEL_ENV = 'production'`, et **un troisième test doit être ajouté** : avec `VERCEL_ENV = 'preview'` et un DSN valide, la CSP **ne contient pas** `report-uri`.

### Critères d'acceptation

- `pnpm test` vert, y compris le nouveau cas preview.
- La CSP de prod contient toujours `report-uri` (à vérifier sur le déploiement de prod, pas en local).
- Après le Préalable John n°1 : `JAVASCRIPT-NEXTJS-J` ne reçoit plus d'événement (base : 18 sur les dernières 24 h).
- Après déploiement : plus aucune nouvelle issue `Blocked 'connect' from 'carnet-de-peche-*.vercel.app'`.

### Garde-fous

- Ne pas supprimer le `report-uri` tout court : c'est notre seul canal de détection d'une CSP cassée en prod, et le sprint 70 l'a mis là exprès.
- Ne pas toucher aux autres directives CSP. `__tests__/security-headers.test.ts` en verrouille une vingtaine, et chacune a une raison écrite dans `next.config.ts`.

---

## Bloc 4 — Un fichier, huit issues Sentry : `PwaProvider.tsx`

`components/pwa/PwaProvider.tsx` a **deux défauts sur 60 lignes**, et à eux deux ils produisent 8 des 36 issues du projet.

### Défaut 1 — `register()` sans `.catch()` (ligne 38)

```ts
navigator.serviceWorker.register('/sw.js').then((registration) => {
  ...
  if (registration.waiting) promptUpdate(registration.waiting)
```

Aucun `.catch()` : toute rejection devient une **unhandled rejection** remontée à Sentry. Et `registration` est supposé défini, ce qu'aucune spec ne garantit dans les navigateurs in-app.

| Issue | Message | Évts | Vraie cause |
|---|---|---|---|
| `V` | `Error: Rejected` | 3 | Navigateur in-app — le shim `wrsParams.serviceWorkers.…` est visible dans la stack |
| `13` | `NotSupportedError: … user denied permission to use Service Worker` | 3 | L'utilisateur a refusé. Comportement **normal**. |
| `1H` | `SecurityError: … An SSL certificate error occurred` | 1 | Proxy / antivirus qui casse la chaîne TLS |
| `K` | `TypeError: Script /sw.js load failed` | 2 | Réseau coupé pendant l'enregistrement |
| `15` | `Error: Service worker registration unavailable` | 1 | idem in-app |
| `1A` | `SecurityError: The operation is insecure` | 2 | Stockage bloqué (Safari, mode strict) |
| `Y` | `TypeError: Cannot read properties of undefined (reading 'waiting')` | 1 | `register()` a résolu `undefined` |

### Défaut 2 — `sessionStorage` lu nu (second `useEffect`, ligne ~64)

```ts
const sessions = parseInt(sessionStorage.getItem(SESSION_COUNT_KEY) ?? '', 10)
```

→ `JAVASCRIPT-NEXTJS-14`, `SecurityError: Failed to read the 'sessionStorage' property`, 3 événements. **Et ce n'est pas que du bruit** : l'exception fait planter l'effet **avant** le `window.addEventListener('beforeinstallprompt', onPrompt)` de la ligne 80. Pour tout utilisateur dont le navigateur refuse le stockage, **la bannière d'installation PWA ne s'affiche jamais**. C'est une fonctionnalité morte en silence, pas un log.

> **Connecteurs** : **qa-chrome** → Claude in Chrome. Reproduire le défaut 2 en bloquant les cookies tiers / le stockage du site, vérifier qu'avant correctif la bannière ne monte pas et qu'après elle monte.

### Tâches

1. Créer `lib/storage/safe.ts` (~25 lignes, pur, testable) : `safeGet(store, key)`, `safeSet(store, key, value)`, chacun en `try/catch` renvoyant `null` / `false` en cas de refus. `PwaProvider.tsx` fait **6 accès** `localStorage`/`sessionStorage` (lignes ~64-77, ~97, ~107) : tous doivent passer par ce helper.
2. Rendre l'enregistrement du service worker défensif :

   ```ts
   navigator.serviceWorker.register('/sw.js')
     .then((registration) => {
       // Certains navigateurs in-app résolvent avec `undefined` (issue Y).
       if (!registration) return
       ...
     })
     .catch(() => {
       // Refus utilisateur (13), navigateur in-app (V, 15), TLS cassé par un proxy
       // (1H), réseau coupé (K), stockage interdit (1A) : tous ATTENDUS et hors de
       // notre contrôle. Sans PWA, le site fonctionne. On ne remonte pas.
     })
   ```

3. Réordonner le second `useEffect` pour que **`addEventListener('beforeinstallprompt')` soit posé en premier**, avant toute lecture de stockage. Même avec `safeGet`, l'ordre actuel est fragile.
4. Tests unitaires sur `lib/storage/safe.ts` : `getItem` qui lève, `setItem` qui lève (quota), et cas nominal.

### Critères d'acceptation

- Via **qa-chrome**, stockage du site bloqué : la bannière PWA **s'affiche** à la 2ᵉ session, et la console ne montre aucune exception non gérée.
- Via **deploy-watch**, 7 jours après déploiement : aucun nouvel événement sur `V`, `13`, `1H`, `K`, `15`, `1A`, `Y`, `14`.
- `pnpm test` vert avec les nouveaux tests.

### Garde-fous

- **Ne pas** avaler l'erreur silencieusement côté produit : si le SW ne s'enregistre pas, il ne faut **aucun** toast, aucune bannière cassée. On dégrade, on ne prévient pas.
- Ne pas toucher à `public/sw.js` : sa logique de cache et son protocole `SKIP_WAITING` sont hors périmètre.

---

## Bloc 5 — MapLibre : un handler de clic survit à la carte

`JAVASCRIPT-NEXTJS-12` (2 évts, `/spots/:slug`) et `JAVASCRIPT-NEXTJS-19` (1 évt, `/carte`) — `Cannot read properties of null/undefined (reading 'getLayer')`.

Stack sans ambiguïté : `maplibre-gl` → `rJ.click` → le wrapper de listener **délégué** (`delegates:{mousemove,mouseout}`) fait `t.filter(e => this.getLayer(e))` → `aU.getLayer` → `this.style` vaut `null`. Contexte de l'événement : un `click` sur `div.maplibregl-canvas-container`, Chrome Mobile Android. Un tap qui arrive pendant le démontage du composant suffit.

Volume faible — **mais c'est une vraie erreur dans notre code**, pas du bruit tiers, et sur mobile.

Handlers délégués recensés (ceux qui passent un `layerId`, donc ceux qui empruntent ce chemin) :

| Fichier | Lignes | Couches |
|---|---|---|
| `components/map/MapView.tsx` | 235, 239 | `FUZZY_FILL_LAYER` |
| `components/map/MapView.tsx` | 360, 362, 366, 380 | `CLUSTER_LAYER`, `UNCLUSTERED_LAYER` |
| `lib/map/useQualityLayer.ts` | 229, 230 | `QUALITY_FILL_LAYER` |

À noter : `lib/map/useBathyLayer.ts:101` fait les choses **correctement** (`map.on('click', handler)` non délégué + `map.off` dans le cleanup du `useEffect`, lignes 101-109). C'est le modèle à suivre.

> **Connecteurs** : **docs-researcher** → Context7 sur **MapLibre GL JS 5** : garantie exacte de `map.off(type, layerId, listener)` pour les listeners délégués, et ordre recommandé entre `off` et `remove()` au démontage. **qa-chrome** pour reproduire : ouvrir une fiche spot sur mobile et taper sur la mini-carte pendant une navigation.

### Tâches

1. Pour chaque handler délégué des trois emplacements ci-dessus, garantir un `map.off(...)` symétrique dans le cleanup du `useEffect` correspondant. Vérifier qu'aucun n'est enregistré depuis un callback asynchrone (`style.load`, `once('load')`) sans garde d'annulation.
2. Ajouter en tête de chaque handler délégué un garde bref et commenté :

   ```ts
   // Un tap peut arriver entre le démarrage du démontage et le retrait du listener :
   // MapLibre appelle alors `this.getLayer()` sur un style déjà nul (issues 12 / 19).
   if (!map.getStyle()) return
   ```

3. Vérifier que `SpotMiniMap` (`components/spots/SpotMiniMap.tsx`, `useEffect` ligne 43) appelle bien `map.remove()` dans son cleanup — le fichier ne contient aucun `.on(` propre, donc les handlers viennent d'un composant enfant : **remonter la chaîne et le dire dans le RECAP**.

### Critères d'acceptation

- Via **qa-chrome** sur mobile émulé : naviguer vers une fiche spot, taper sur la mini-carte pendant la transition sortante, 10 fois → aucune exception en console.
- Via **deploy-watch**, 7 jours après : aucun nouvel événement sur `12` et `19`.

### Garde-fous

- Ne pas refactorer `MapView.tsx` : ajouter les gardes et les `off`, rien d'autre. La carte est le composant le plus délicat du produit et `docs/carte-v2/` documente pourquoi.
- Les issues `10` (`Error: Aa`), `16` (`Error: fa`) et `11` (`RangeError: Maximum call stack size exceeded`) **ne sont pas dans ce bloc** : `10` et `11` partagent le même `trace_id` (`8c569194dbba…`), donc une seule session mobile a produit les trois, sans stack exploitable. À laisser, ne pas chasser.

---

## Bloc 6 — Investigation : le WAF Vercel répond 403, y compris à un UA Googlebot

**Lecture seule. Aucun fichier modifié dans ce bloc.** On produit un constat écrit, et une recommandation. Si le constat impose un changement, il fera l'objet d'une décision de John, pas d'un commit de ce sprint.

### Le fait observé

Depuis un conteneur cloud, le 18/08 : `https://www.carnet-de-peche.com/spots/*` répond **`403 Forbidden`**, sans corps, sur trois URL différentes, **avec un UA Chrome 151 standard** puis **avec un UA Googlebot**. C'est le comportement d'un WAF / Attack Challenge qui bloque les plages d'IP datacenter.

Ça recoupe une ligne déjà présente dans `CLAUDE.md` : *« 503 intermittents Vercel Challenge/WAF sur les prefetches RSC (risque crawlers/SEO) »*.

**Ce que ça ne prouve pas** : que Googlebot est bloqué. Google crawle depuis des plages d'IP publiées et vérifiables par DNS inverse, que Vercel connaît et allowliste normalement. Un UA falsifié depuis AWS *doit* être bloqué — c'est le WAF qui fait son travail. **Ne pas conclure à la panne SEO sans preuve.**

> **Connecteurs** : **deploy-watch** → Vercel (lire la config Firewall/WAF du projet et les logs de requêtes bloquées, en lecture). **qa-chrome** si une vérification depuis une IP résidentielle est nécessaire.

### Tâches (dans cet ordre, on s'arrête dès que le constat est tranché)

1. **Search Console — c'est la source de vérité, et elle est gratuite.** Rapport « Pages » → motifs d'exclusion, et surtout les statistiques d'exploration (Paramètres → Statistiques sur l'exploration) : chercher une part de réponses `403`/`5xx` et une éventuelle rupture datée. **Une hausse de 403 côté Google = problème confirmé. Zéro 403 = fausse alerte, on clôt.**
2. **Outil d'inspection d'URL** sur `https://www.carnet-de-peche.com/spots/pointe-du-grand-minou` → « Tester l'URL en direct » → vérifier que Google récupère bien la page et voir le HTML rendu.
3. **Dashboard Vercel → Firewall** : relever l'état de l'Attack Challenge Mode, les règles actives, et si le trafic vérifié des bots (Verified Bots) est allowlisté. Noter la configuration exacte dans le RECAP.
4. Croiser avec l'issue Sentry `JAVASCRIPT-NEXTJS-9` (2 évts, un `<link>` du `<head>` qui échoue à charger) : à rapprocher d'un éventuel blocage d'assets, ou à écarter.

### Critères d'acceptation

- Une section datée dans `docs/sprint-88/RECAP.md`, intitulée « WAF et crawlers », qui répond par **oui ou non** à : *« Googlebot reçoit-il des 403 sur carnet-de-peche.com ? »*, avec la capture ou le chiffre Search Console à l'appui.
- Si **oui** : une recommandation précise (règle Vercel à ajuster) et **⚠️ DEMANDER À JOHN AVANT** toute modification.
- Si **non** : le dire clairement, et retirer ou requalifier la ligne « risque crawlers/SEO » de `CLAUDE.md` pour ne pas laisser traîner une inquiétude périmée.

### Garde-fous

- ⚠️ **Ne rien changer au Firewall Vercel.** Baisser une protection sur la foi d'un 403 vu depuis AWS serait exactement la mauvaise décision.
- Fenêtre de mesure du sprint 83 ouverte jusqu'au **07/09** : aucun `<title>`, aucun maillage, aucun sitemap touché, même « en passant ».

---

## Bloc 7 — Ménage Sentry (après déploiement des blocs 0, 2, 3, 4, 5)

Un dashboard à 36 issues ouvertes dont 30 inactionnables, c'est un dashboard qu'on arrête de lire. Ce bloc le rend utilisable.

> **Connecteurs** : **deploy-watch** → Sentry. **Ne rien résoudre avant d'avoir la confirmation que les blocs correspondants sont déployés et que les compteurs ont cessé de monter.**

### Tâches

1. **Résoudre** dans Sentry les issues traitées par les blocs 0, 2, 3, 4 et 5, en utilisant `Fixes JAVASCRIPT-NEXTJS-<id>` dans les messages de commit correspondants (l'intégration ferme alors automatiquement).
2. **Ignorer** les 12 issues CSP tierces, qui viennent d'extensions et de pages traduites et sur lesquelles nous n'avons aucune prise : `S` (translate.google.com, 17), `Z` (gstatic, 10), `R` (fonts.gstatic, 10), `17` (www.vinci.com, 6), `1E` (dbankcloud.cn / Huawei, 4), `M` (connect.facebook.net, 2), `1J` (i.ytimg.com, 1), `1B` (cdn.jsdelivr.net, 1).
3. **Étendre les filtres** dans `instrumentation-client.ts` (`ignoreErrors`) et `lib/sentry-filters.ts`, avec un commentaire d'une ligne par entrée expliquant *pourquoi* :
   - `'Connection closed.'` → flux RSC interrompu, mobile qui perd le réseau (issue `1Q`).
   - `isReactStreamInterference` est trop étroit : il exige une frame `$RS`/`$RC`/`$RB`, or `1D` (`insertBefore … not a child of this node`) vient du même phénomène — DOM muté par un traducteur — **sans** frame `$RS`. Élargir la détection aux erreurs de commit React (`commitMutationEffectsOnFiber` dans les frames) **sans** avaler les vraies erreurs d'hydratation de notre code : garder le tag `hydration: 'suspect'` posé par `isHydrationError`. Ajouter des tests dans `lib/__tests__/sentry-filters.test.ts` pour les deux cas (droppé / conservé).
4. **Ne PAS filtrer**, et le justifier dans le RECAP :
   - `1F` (`r["@context"].toLowerCase`, 13 évts, **100 % Safari**) : la stack est dans le HTML du document (`global code`), aucune de nos lignes. Notre JSON-LD est correct — `lib/seo/spot-jsonld.ts` émet un **tableau** de deux objets portant chacun `@context`, et un consommateur tiers qui fait `parsed["@context"]` sur un tableau obtient `undefined`. Inactionnable, sans impact, et le laisser visible documente le comportement. **Piste facultative à écrire sans l'appliquer** : émettre deux balises `<script type="application/ld+json">` séparées plutôt qu'un tableau — 12 pages du repo utilisent ce format, donc c'est un chantier à part.
   - `1N` (`Object.hasOwn is not a function`, 2 évts) : Chrome **WebView 91** sur Galaxy S7. `Object.hasOwn` est ES2022, disponible à partir de Chrome 93. C'est un **écran blanc** pour ces utilisateurs. Audience minuscule, mais **c'est un vrai bug de cible de build**. Mesurer la part de trafic concernée dans PostHog et **écrire le chiffre dans le RECAP** ; le correctif (polyfill ou ajustement browserslist) se décide au vu du chiffre, pas ici.

### Critères d'acceptation

- Le dashboard `is:unresolved` du projet contient **moins de 8 issues**, et chacune de celles qui restent a une ligne de justification dans le RECAP.
- `pnpm test` vert avec les nouveaux tests de `lib/sentry-filters.ts`.

---

## Workstream VERIF (obligatoire, agent indépendant qui n'a écrit aucun des blocs)

1. Lancer **`/verif-sprint`** : `pnpm test` + `pnpm build` + `pnpm typecheck` + `pnpm lint` + revue croisée indépendante + passe anti-régression.
2. **`pnpm check:prerender` avec le nouveau témoin `/spots/[slug]`** — c'est le verrou du sprint, il doit être exécuté et son résultat collé dans le RECAP.
3. Relire **chaque** critère d'acceptation et cocher ✅/❌ **avec preuve** (commande + sortie, ou compteur Sentry avec horodatage).
4. **Passe deploy-watch obligatoire, 30 minutes après déploiement puis à J+7.** Ce sprint se juge sur des compteurs Sentry, pas sur des tests verts. Tableau attendu dans le RECAP :

   | Issue | Évts avant | Évts après déploiement | Verdict |
   |---|---|---|---|
   | `1P` | 355 (et +15/h) | ? | |
   | `H` | 268 / 24 h | ? | |
   | `J` | 18 / 24 h | ? | |
   | `V`,`13`,`1H`,`K`,`15`,`1A`,`Y`,`14` | 16 cumulés | ? | |
   | `12`, `19` | 3 cumulés | ? | |

5. **Passe sécurité** : la CSP de prod contient toujours `report-uri` ; `'unsafe-eval'` toujours absent ; aucune directive CSP affaiblie ; aucun secret commité ; aucune migration (il ne doit y en avoir aucune dans ce sprint).
6. **Passe non-régression ciblée** : les formulaires zod affichent toujours leurs messages en français (Bloc 2 est le seul qui peut casser du fonctionnel) ; la carte reste utilisable desktop + mobile.
7. **Passe copy** : tutoiement, pas de nouveau texte utilisateur introduit par ce sprint (il ne devrait y en avoir aucun — le vérifier).
8. Livrer `docs/sprint-88/RECAP.md` : fait / comment tester / reste manuel John, et la section « WAF et crawlers » du Bloc 6.

---

## Reste manuel John (post-sprint)

- **Avant tout** : merger et déployer le **Bloc 0 seul**, puis donner le go pour le reste.
- Désactiver la Vercel Toolbar sur **Production** (Préalable n°1) et noter l'heure.
- Ouvrir la **Search Console** pour le Bloc 6 (l'agent ne peut pas s'y authentifier).
- Vérifier `x-vercel-cache` sur une fiche spot depuis sa machine, après déploiement du Bloc 0.
- Décider, au vu des chiffres du RECAP : le polyfill `Object.hasOwn` (issue `1N`) et l'allègement du chunk zod sur `/carte`.

---

## Annexe — le sort des 36 issues, en un coup d'œil

| Sort | Issues | Bloc |
|---|---|---|
| **Corrigé** | `1P` | 0 |
| **Corrigé** | `H` | 2 |
| **Corrigé** (réglage Vercel) | `J` | 3a + Préalable |
| **Corrigé** (report-uri prod-only) | `1G`, `1C`, `T`, `1K`, `18`, `1M` | 3b |
| **Corrigé** | `V`, `13`, `1H`, `K`, `15`, `1A`, `Y`, `14` | 4 |
| **Corrigé** | `12`, `19` | 5 |
| **Filtré** (bruit réseau / DOM tiers) | `1Q`, `1D` | 7.3 |
| **Ignoré** (CSP tierce, aucune prise) | `S`, `Z`, `R`, `17`, `1E`, `M`, `1J`, `1B` | 7.2 |
| **Laissé visible, justifié** | `1F`, `1N`, `9`, `10`, `11`, `16`, `X` | 7.4 |

**36 issues → moins de 8 restantes, dont zéro non expliquée.**
