# Audit Sentry — 18/08/2026

Org `carnet-de-peche`, projet unique `javascript-nextjs` (région `de.sentry.io`).
**36 issues ouvertes, 0 résolue, 0 ignorée.** Plus ancienne trace : 28/06/2026 (rétention).
Chaque erreur ci-dessous a été rouverte dans Sentry (stack + tags + agrégats) **puis confrontée au code réel** de `main` (`573c24f`).

---

## Verdict en une ligne

Sur ~1 600 événements, **86 % sont des rapports CSP** (dont la moitié est du bruit de bots et de previews), **282 sont une régression de prod ouverte hier**, et il reste ~50 vraies erreurs JS réparties sur 20 issues, dont **la moitié vient d'un seul fichier** : `components/pwa/PwaProvider.tsx`.

Autrement dit : **1 vrai incident (P0), 2 problèmes de config (P1), 1 fichier à durcir (P2), et beaucoup de bruit à couper.**

---

## P0 — `/spots/[slug]` n'est plus rendue statiquement (régression sprint 84)

**`JAVASCRIPT-NEXTJS-1P` · 282 événements en 19 h · statut `escalating` · première occurrence 17/08 à 16 h 48 (heure de Paris).**

```
Error: Page changed from static to dynamic at runtime /spots/plage-de-golfe-bleu-osm24648192,
reason: revalidate: 0 fetch https://marine-api.open-meteo.com/v1/marine?...
```

### Cause racine, vérifiée dans le code

Trois lignes qui se contredisent :

| Fichier | Ligne | Contenu |
|---|---|---|
| `app/(marketing)/spots/[slug]/page.tsx` | 281 | `export const revalidate = 1800` |
| `app/(marketing)/spots/[slug]/page.tsx` | 535 | `fetchSpotConditions(...).catch(() => null)` |
| `lib/conditions/spot-forecast.ts` | 283 | `fetch(url, { next: { revalidate: 0 } })` |

Un `fetch` déclaré `revalidate: 0` **à l'intérieur** d'une route qui a un `revalidate` statique force Next à sortir du rendu statique. Next lève `DynamicServerError` depuis `patch-fetch`, et comme `fetchOpenMeteo` enveloppe son `fetch` dans un `try/catch` générique (avec **retry**), l'erreur est avalée deux fois — puis Next la rattrape en fin de rendu et fait échouer la page.

### Pourquoi ça compte

`/spots/[slug]` porte **80 % des clics Google** (ton propre chiffre, brief S75). Le sprint 84 a été fait pour rendre ces pages statiques. La date de première occurrence — 17/08 16 h 48 — colle au déploiement du sprint 84. **Le bénéfice du sprint est annulé sur la route qui compte le plus**, en silence, exactement comme le bug que le sprint 84 corrigeait.

Le verrou `pnpm check:prerender` ne l'a pas vu : il lit `prerender-manifest.json` **après le build**, or ici les 10 slugs de `generateStaticParams` sont bien pré-rendus au build. La bascule se produit **au runtime**, lors de la régénération ISR et sur les 597 autres slugs (`dynamicParams = true`).

### Correctif

Dans `lib/conditions/spot-forecast.ts:283`, remplacer `revalidate: 0` par une valeur > 0 :

```ts
const res = await fetch(url, {
  // Le cache métier est `weather_cache` (readCache, en amont). Ce revalidate n'est
  // là que pour ne PAS forcer les pages ISR à basculer en dynamique (issue 1P).
  next: { revalidate: 900 },
  signal: AbortSignal.timeout(OPEN_METEO_TIMEOUT_MS),
})
```

Deux garde-fous à ajouter dans la foulée :

1. **Ne plus avaler `DynamicServerError`** dans `fetchOpenMeteo` : le `catch` doit relancer les erreurs Next (`err?.digest?.startsWith('DYNAMIC_SERVER_USAGE')`) au lieu de les traiter comme une panne réseau et de les retenter.
2. Ajouter un test qui échoue si un `next: { revalidate: 0 }` réapparaît dans un module importé par une page du groupe `(marketing)` — même logique que `__tests__/marketing-layout-is-static.test.ts`.

`lib/conditions/openmeteo.ts:92` et `:113` ont le même `revalidate: 0`, mais ce module n'est appelé que depuis `lib/catches/actions.ts` (server action, toujours dynamique) : **pas touché, pas à corriger**.

### Vérification à faire côté John (2 min)

`curl -I https://www.carnet-de-peche.com/spots/pointe-du-grand-minou` et regarder `x-vercel-cache`. `HIT`/`STALE` = ISR vivant, `MISS`/`BYPASS` répété = confirmation. **Je n'ai pas pu le faire moi-même** : depuis ce conteneur, le WAF Vercel répond **403 sur toutes les requêtes**, y compris avec un UA Googlebot (voir « Angle mort » en fin de doc).

---

## P1 — La CSP casse le JIT de zod sur chaque page (1 154 événements, 512 utilisateurs)

**`JAVASCRIPT-NEXTJS-H` — `Blocked 'script' from 'eval:'`, directive `script-src`, disposition `enforce`.**

C'est **l'issue n°1 en volume de tout le projet**, et elle touche quasiment chaque visiteur : `/carte` (59), `/auth/login` (44), `/auth/register` (30), `/spots` (28), `/carnet/nouvelle` (27), `/onboarding/1` (15), la home, et toutes les fiches spots.

### Cause racine, identifiée dans le bundle

J'ai retrouvé **le chunk exact cité par Sentry** dans ton build local (`3906-baab2d33b3a72def.js`, même hash) :

```js
if(r.cr.jitless || navigator?.userAgent?.includes("Cloudflare")) return !1;
try { return Function(""), !0 } catch(e) { return !1 }
...
compile(){ return Function(...this?.args, ...) }
```

C'est **zod 4.4.3** (`{major:4,minor:4,patch:3}` juste à côté). Zod v4 compile ses validateurs avec le constructeur `Function`, et sonde d'abord sa disponibilité avec `Function("")`. Ta CSP porte `'unsafe-inline'` mais **pas** `'unsafe-eval'` (volontairement, `next.config.ts:81`) : la sonde est bloquée.

### Bonne nouvelle / mauvaise nouvelle

- **Rien n'est cassé fonctionnellement** : la sonde est dans un `try/catch`, zod retombe proprement sur son chemin interprété. Aucune validation ne saute.
- **Mais** : une violation CSP + un POST réseau vers Sentry **par visiteur et par page**, et ~1 150 événements qui bouffent ton quota gratuit et noient les vraies erreurs. Et une CSP `enforce` qui hurle en permanence, c'est une CSP qu'on finit par ne plus lire.

### Correctif

Dire à zod de ne pas tenter le JIT, une fois, au plus haut niveau client :

```ts
// instrumentation-client.ts (ou un module importé par le layout racine)
import * as z from 'zod'
z.config({ jitless: true })   // clé confirmée présente dans zod 4.4.3 : v4/core/core.d.cts:67
```

Surtout **ne pas** ajouter `'unsafe-eval'` à la CSP : ce serait payer une régression de sécurité réelle pour un problème cosmétique.

⚠️ À vérifier au passage : zod tourne côté client sur `/auth/*`, `/onboarding/*`, `/carnet/nouvelle`, et **sur `/carte` et les fiches spots**. Si zod n'a rien à y faire, il y a aussi un chunk à alléger.

---

## P1 — Le script Vercel Live tourne sur la production

**`JAVASCRIPT-NEXTJS-J` — 130 événements, 23 utilisateurs, dernière occurrence il y a 20 minutes.**

```
Blocked URI : https://vercel.live/_next-live/feedback/feedback.js
Document URI: https://www.carnet-de-peche.com/          ← la VRAIE prod
Source File : /_next/static/chunks/webpack-7bc57932719946a4.js
```

Ta CSP n'autorise `vercel.live` **que si `VERCEL_ENV === 'preview'`** (`next.config.ts:85`) — c'est le bon choix. Mais le runtime Next injecte quand même le script de feedback Vercel **sur le domaine de production**, sur des visiteurs réels (IP résidentielles FR, Chrome 151, pas des bots).

Deux conséquences : un script tiers essaie de se charger chez tes utilisateurs, et 130 rapports CSP de plus.

**Correctif** : désactiver la Vercel Toolbar / Vercel Live pour l'environnement **Production** dans le dashboard Vercel (Settings → Toolbar). C'est un réglage, pas du code. Ne pas ouvrir `vercel.live` dans la CSP de prod pour faire taire l'alerte.

À noter : `instrumentation-client.ts` a bien un `denyUrls: [/vercel\.live/]`, mais il ne sert à rien ici — **les rapports CSP sont POSTés directement par le navigateur au `report-uri`**, ils ne passent jamais par `beforeSend`, `ignoreErrors` ni `denyUrls`. C'est vrai pour les 16 issues CSP de la liste.

---

## P2 — `PwaProvider.tsx` : un fichier, sept issues Sentry

Le bloc d'enregistrement du service worker (`components/pwa/PwaProvider.tsx:38`) est écrit sans aucune défense :

```ts
navigator.serviceWorker.register('/sw.js').then((registration) => {
  ...
  if (registration.waiting) promptUpdate(registration.waiting)
```

Pas de `.catch()`. Toute rejection devient une **unhandled rejection** remontée à Sentry. Et `registration` est supposé défini, ce qu'aucune spec ne garantit dans les navigateurs in-app.

Ça produit à soi seul :

| Issue | Message | Évts | Vraie cause |
|---|---|---|---|
| `V` | `Error: Rejected` | 3 | Navigateur in-app (shim `wrsParams.serviceWorkers.…` visible dans la stack) |
| `13` | `NotSupportedError: … user denied permission to use Service Worker` | 3 | L'utilisateur a refusé — comportement normal |
| `1H` | `SecurityError: … SSL certificate error` | 1 | Proxy / antivirus qui casse la chaîne TLS |
| `K` | `TypeError: Script /sw.js load failed` | 2 | Réseau coupé pendant l'enregistrement |
| `15` | `Error: Service worker registration unavailable` | 1 | idem in-app |
| `1A` | `SecurityError: The operation is insecure` | 2 | Stockage bloqué (Safari, mode strict) |
| `Y` | `TypeError: Cannot read properties of undefined (reading 'waiting')` | 1 | `register()` a résolu `undefined` |

Et dans le **second** `useEffect` du même fichier, `sessionStorage.getItem(...)` est appelé nu, sans `try/catch` → **`14` — `SecurityError: Failed to read the 'sessionStorage' property`** (3 événements, Safari/iframes où le stockage est refusé). Ce bug-là fait planter l'effet **avant** l'`addEventListener('beforeinstallprompt')` : la bannière d'installation PWA ne s'affiche jamais pour ces utilisateurs.

**Correctif** (une passe, ~20 lignes) :

```ts
navigator.serviceWorker.register('/sw.js')
  .then((registration) => {
    if (!registration) return
    ...
  })
  .catch(() => {
    // Refus utilisateur, navigateur in-app, TLS cassé, réseau coupé : tous
    // attendus et hors de notre contrôle. On ne remonte pas, on n'a pas de PWA.
  })
```

+ envelopper l'accès `sessionStorage` / `localStorage` dans un helper `safeStorage` avec `try/catch` (il est utilisé 6 fois dans ce fichier).

**8 issues fermées d'un coup**, dont une qui casse silencieusement la bannière PWA.

---

## P2 — MapLibre : handler de clic sur une carte déjà détruite

**`12` (2 évts, `/spots/:slug`) et `19` (1 évt, `/carte`) — `Cannot read properties of null/undefined (reading 'getLayer')`.**

Stack sans ambiguïté : `maplibre-gl` → `rJ.click` → `aU.getLayer` → `this.style` est `null`. Un handler délégué (`map.on('click', layerId, …)`) reste branché après le teardown du style. Sur mobile, un tap qui arrive pendant le démontage du composant suffit.

Volume faible (3 événements), mais c'est **une vraie erreur dans ton code**, pas du bruit : le teardown MapLibre est incomplet quelque part entre `SpotMiniMap` et la carte de `/carte`. À corriger avec un garde `if (!map.getStyle()) return` en tête des handlers délégués, ou en s'assurant que `map.remove()` est bien appelé au `useEffect` cleanup avant que les listeners ne puissent tirer.

Probablement la même famille que `10` (`Error: Aa`) et `16` (`Error: fa`) — erreurs minifiées sans stack, mêmes routes, et `10` partage exactement le `trace_id` de `11` (`RangeError: Maximum call stack size exceeded`), donc une seule session mobile a produit les trois.

---

## P3 — Bruit CSP à couper (≈ 90 événements, aucun impact utilisateur)

**Six issues** (`1G`, `1C`, `T`, `1K`, `18`, `1M`) du type `Blocked 'connect' from 'carnet-de-peche-<hash>-seychis-projects.vercel.app'`.

Toutes ont le même profil : `Document URI = <deployment>.vercel.app/sw.js`, `blocked-uri` = un asset **du même domaine**, et un client `HeadlessChrome 141` depuis AWS us-west-1. Explication : sur un déploiement **preview protégé**, la requête est redirigée vers l'authentification Vercel ; la spec CSP masque la cible de la redirection et rapporte l'URL d'origine. Ça ne se produit **jamais sur le domaine de prod**.

**Correctif propre** : ne poser le `report-uri` que quand `VERCEL_ENV === 'production'`. Une ligne dans `next.config.ts` (`cspReportUri`), et ça supprime aussi les rapports `eval` des bots headless sur les previews.

Même sac, tiers injectés par des extensions ou des pages traduites, rien à faire côté code : `S` (translate.google.com, 17), `Z` (gstatic, 10), `R` (fonts.gstatic, 10), `17` (www.vinci.com, 6), `1E` (dbankcloud.cn — Huawei, 4), `M` (connect.facebook.net, 2), `1J` (i.ytimg.com, 1), `1B` (cdn.jsdelivr.net, 1).

---

## P3 — Le reste, expliqué et classé

| Issue | Message | Évts | Diagnostic |
|---|---|---|---|
| `1F` | `undefined is not an object (evaluating 'r["@context"].toLowerCase')` | 13 | **100 % Safari**, stack dans le HTML du document (`global code`), aucune de nos lignes. Ton JSON-LD est correct (`lib/seo/spot-jsonld.ts` : les deux objets portent bien `@context`). Hypothèse la plus probable : un consommateur tiers (extension Safari) fait `parsed["@context"]` sur notre tableau JSON-LD de niveau racine, et un tableau n'a pas de clé `@context`. **Inactionnable, sans impact.** Si tu veux couper court : émettre deux balises `<script type="application/ld+json">` séparées au lieu d'un tableau. |
| `1N` | `Object.hasOwn is not a function` | 2 | Chrome **WebView 91** (Galaxy S7, Android 11). `Object.hasOwn` est ES2022, dispo à partir de Chrome 93. Ta cible browserslist laisse passer une API trop récente. Audience minuscule, mais c'est un **écran blanc** pour ces gens. |
| `1D` | `insertBefore … not a child of this node` | 1 | Hydratation React perturbée par un tiers (page traduite). Déjà connu dans CLAUDE.md. `handled: yes`. `isReactStreamInterference` ne l'attrape pas car il n'y a pas de frame `$RS` : filtre à élargir. |
| `X` | `Cannot read properties of null (reading 'replace')` | 1 | Stack GSAP (`.from`/`.to`/`scope`/`render`) sur la home. Une cible d'animation vaut `null`. `handled: yes`, 1 occurrence en 3 semaines. |
| `1Q` | `Error: Connection closed.` | 1 | Flux RSC interrompu (mobile qui perd le réseau). À ajouter aux `ignoreErrors`. |
| `11` | `RangeError: Maximum call stack size exceeded` | 3 | Stack `undefined:185:70`, aucune de nos frames. Script injecté. |
| `9` | `Event (type=error) captured as promise rejection` | 2 | Un `<link>` du `<head>` a échoué à charger. Possible symptôme de skew pendant un déploiement, sinon réseau. |

---

## Plan d'action, dans l'ordre

| # | Action | Où | Effet |
|---|---|---|---|
| 1 | `revalidate: 0` → `900` + ne plus avaler `DynamicServerError` | `lib/conditions/spot-forecast.ts:283` | Rétablit l'ISR sur 80 % du trafic Google. **À faire aujourd'hui.** |
| 2 | Test anti-régression `revalidate: 0` dans le graphe `(marketing)` | `__tests__/` | Empêche le retour du #1 |
| 3 | `z.config({ jitless: true })` | `instrumentation-client.ts` | −1 150 évts, −1 POST réseau par page/visiteur |
| 4 | Couper la Vercel Toolbar sur Production | Dashboard Vercel | −130 évts, −1 script tiers en prod |
| 5 | `.catch()` + `safeStorage` dans `PwaProvider` | `components/pwa/PwaProvider.tsx` | Ferme 8 issues, répare la bannière PWA sur Safari |
| 6 | `report-uri` uniquement si `VERCEL_ENV === 'production'` | `next.config.ts` | −90 évts de bruit preview/bots |
| 7 | Garde `getStyle()` sur les handlers MapLibre délégués | `SpotMiniMap` + carte | Ferme 2 vraies erreurs |
| 8 | Résoudre en masse les 12 issues CSP tierces | Sentry | Dashboard lisible |

Les points 1 à 6 sont tous petits et indépendants : ça tient dans un sprint 85 « Bloc A — hygiène Sentry ».

---

## Angle mort à connaître

Depuis ce conteneur, **`www.carnet-de-peche.com` répond `403 Forbidden` à toute requête**, y compris avec un UA Chrome standard et avec un UA Googlebot. C'est le WAF / Vercel Challenge qui bloque la plage d'IP datacenter — cohérent avec le point déjà noté dans CLAUDE.md (« 503 intermittents Vercel Challenge/WAF sur les prefetches RSC, risque crawlers/SEO »).

Deux conséquences :

1. Je n'ai **pas pu** confirmer en live l'état de cache des fiches spots (point 1 ci-dessus). L'analyse repose sur le message d'erreur explicite de Next et sur le code — c'est solide, mais un `x-vercel-cache` le prouverait.
2. Si ce WAF s'applique aussi aux crawlers légitimes, c'est un problème SEO à part entière. **Un `403` servi à Googlebot, ça se paie.** À vérifier dans la Search Console (couverture / exploration) avant toute autre optimisation SEO.

---

*Audit réalisé le 18/08/2026 à partir du connecteur MCP Sentry, croisé avec `main` = `573c24f` et le build local `.next/`. Dashboard : https://carnet-de-peche.sentry.io/issues/?project=javascript-nextjs*
