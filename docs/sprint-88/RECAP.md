# Sprint 88 — RECAP

> Brief : `docs/sprint-88/BRIEF.md` · Audit source : `docs/audits/AUDIT-SENTRY-2026-08-18.md`
> Base : `main` = `573c24f`.

---

## Bloc 0 — HOTFIX ISR

**Le hotfix est parti en deux temps, parce que John a mergé la première moitié pendant que je finissais la seconde.**

| Commit | Contenu | État |
|---|---|---|
| `1479200` | `spot-forecast.ts` (retrait de `revalidate: 0` + `rethrowIfNextControlFlow`), `openmeteo.ts` (2 commentaires), 5 tests | ✅ **mergé sur `main`, poussé, DÉPLOYÉ EN PROD** le 18/08 à 15h33 (deployment `dpl_2WmcKQAnqrTQXnjPj4yQQpJGj69t`, READY) |
| `39ead71` | `page.tsx` : les 10 `.catch()` (le point du brief que `1479200` ne couvrait pas) + commentaire de `fetchOpenMeteo` réécrit avec ses références vérifiées | ✅ **mergé (fast-forward), poussé sur ordre de John le 18/08 à 16h31**, déploiement `dpl_3HWLF2GofMCwigfvEVTVy8rf8D5V` |

`main` == `origin/main` == `39ead71`, arbre propre (seuls `docs/sprint-88/` et `docs/audits/AUDIT-SENTRY-2026-08-18.md` restent non suivis : ils partiront avec le commit de fin de sprint).

> ⚠️ **Incident de manipulation, corrigé.** J'ai d'abord fait un `git commit --amend` sans voir que `1479200` était déjà poussé : ça réécrivait un commit publié. Détecté aussitôt (`main` passé « ahead 1, behind 1 »), annulé par `git reset --soft 1479200`, et le travail reposé en commit distinct. **Rien n'a été poussé, l'historique public n'a jamais bougé.** Leçon à retenir pour la suite du sprint : dans ce clone, `main` et `origin/main` peuvent avancer sous mes pieds pendant que je travaille — vérifier `git rev-parse origin/main` avant tout `--amend`.

### Ce qui a été fait

| Fichier | Changement |
|---|---|
| `lib/conditions/spot-forecast.ts` | `fetchOpenMeteo` : **suppression de `next: { revalidate: 0 }`**, aucune option de cache à la place. Ajout de `rethrowIfNextControlFlow()` et de son appel en tête du `catch`. |
| `app/(marketing)/spots/[slug]/page.tsx` | Helper `degradeTo()` + les **10** `.catch()` de la page passent par lui, pour ne plus avaler les signaux de contrôle de Next. |
| `lib/conditions/openmeteo.ts` | Deux commentaires seulement : ses `revalidate: 0` sont **légitimes** (appelé depuis une server action, jamais depuis une page ISR). Vérifié : aucun autre importateur runtime. |
| `lib/conditions/__tests__/spot-forecast-degraded.test.ts` | 5 tests de régression. |

### La sémantique Next, vérifiée dans le source installé (pas de mémoire, pas de blog)

`node_modules/next/dist/server/lib/patch-fetch.js`, **next 15.5.18** — c'est ce fichier qui décide, et il répond aux trois questions du brief :

| Variante du `fetch` | Ce que fait Next | Verdict |
|---|---|---|
| `next: { revalidate: 0 }` (avant) | `autoNoCache` faux, `finalRevalidate === 0` → `markCurrentScopeAsDynamic` (l.510) | ❌ **le bug** : toute la fiche repasse en dynamique |
| **aucune option** (retenu) | `autoNoCache = true` (l.375-386) ; le bailout l.480 est gardé par `!autoNoCache` | ✅ la route reste statique, le fetch n'est juste pas mis en Data Cache |
| `next: { revalidate: 900 }` (**suggéré par le brief**) | pas de bascule, mais `revalidateStore.revalidate = 900` (l.514) | ⚠️ **abaisse le `revalidate` de la route entière de 1800 à 900, en silence** |

**Le brief se trompait sur ce point** : sa variante par défaut aurait divisé par deux la durée de cache de la page qui porte 80 % des clics Google, sans que rien ne le signale. La variante retenue est « pas d'option du tout ».

Deux réponses annexes, du même fichier :

- **`signal: AbortSignal.timeout(...)` n'affecte pas la cacheabilité.** Il n'est ni dans `hasUnCacheableHeader` (l.355) ni dans la clé de cache ; il est seulement retiré lors d'une revalidation d'arrière-plan (l.567, l.587). Le garde-fou de timeout du 18/08 survit donc au correctif.
- **`export const dynamic = 'force-static'` n'a pas été posé**, et n'est pas nécessaire : c'était l'option B du brief, conditionnée à un accord de John. La variante A suffit, prouvée ci-dessous.
- Digest confirmé : `DYNAMIC_ERROR_CODE = 'DYNAMIC_SERVER_USAGE'`, `node_modules/next/dist/client/components/hooks-server-context.js:23`. On compare la chaîne plutôt que d'importer `isDynamicServerError`, qui vit dans un chemin interne non publié.

### Pourquoi le garde sur les `.catch()`

Les dix `.catch(() => null)` de la fiche avaient la bonne intention (aucune section annexe ne casse la page) mais attrapaient **aussi** le `DynamicServerError`. Résultat : la régression a couru 22 h sans qu'une seule de ces lignes ne bronche. `degradeTo()` garde la dégradation et relance les erreurs porteuses d'un `digest`.

Vérifié avant de le poser : **aucun** des fetchers appelés là (`buildSpotWeek`, `getAllGuides`, `fetchSpotDepth`, `fetchSeabedSubstrate`, `getTideAccuracyChip`, `fetchNearbySpots`, `fetchDepartmentSpots`, `fetchConfirmationCount`, `fetchCatchesSinceVerified`) n'appelle `notFound()` ni `redirect()` — relancer ne peut donc rien casser. Le brief ne visait que les lignes 535-545 ; les deux `.catch()` du second `Promise.all` (l.594-595) sont traités aussi, laisser deux sites avaleurs aurait été un demi-correctif.

### Preuves

| Vérification | Commande | Résultat |
|---|---|---|
| Types | `pnpm typecheck` | ✅ 0 erreur |
| Tests | `pnpm test` | ✅ **1663 tests / 130 fichiers**, dont les 2 qui rendent réellement `SpotPage` (`spot-page-no-coordinate-leak`, `spot-page-conversion-order`) et exercent donc `degradeTo` |
| Tests ciblés | `pnpm vitest run lib/conditions/__tests__/spot-forecast-degraded.test.ts` | ✅ 21 tests, dont « n'envoie AUCUNE option `next` à fetch » et « ne rejoue pas et ne masque pas le signal de bascule » |
| Build | `pnpm build` | ✅ exit 0, lint inclus |
| Pré-rendu | `pnpm check:prerender` | ✅ les 4 témoins OK (le témoin `/spots/[slug]` est ajouté au **Bloc 1**, pas ici) |
| Manifeste | `.next/prerender-manifest.json` | ✅ **10 / 10 fiches spots pré-rendues au build**, `revalidate = 1800`, motif `/spots/[slug]` en ISR fallback actif |

#### ⚠️ Le test A/B au build n'a RIEN prouvé, et il faut le dire

J'ai rebuildé en remettant volontairement `next: { revalidate: 0 }` pour mesurer la différence. **Résultat identique : 10 / 10 fiches pré-rendues.** Le test ne discrimine pas, pour une raison vérifiée en base :

```sql
select count(*) filter (where fetched_at > now() - interval '1 hour') from weather_cache;
-- 58
```

Le build précédent avait rempli `weather_cache` (TTL 1 h). Le build A/B a donc lu le cache Supabase et **n'a jamais appelé Open-Meteo** : sans appel, pas de bascule. C'est cohérent avec ce que Sentry dit exactement — « Page changed from static to dynamic **at runtime** » : le bug ne se produit pas au build, il se produit à la **régénération ISR**, quand le TTL d'une heure de `weather_cache` a expiré et que l'appel part vraiment. Ce qui explique aussi le rythme observé (~15 évts/h pour un `revalidate` de 30 min sur un cache d'1 h : environ une régénération sur deux).

**Conséquence honnête : aucune commande locale ne peut prouver ce correctif.** La preuve est le compteur Sentry après déploiement, exactement comme le brief l'annonce (« ne pas conclure sur un test vert »). Ce qui est prouvé localement, c'est le *mécanisme* (source de Next, ci-dessus) et le fait que l'option incriminée ne part plus (test unitaire).

#### Limite assumée du périmètre

Deux `catch` de `spot-forecast.ts` restent nus : `readKnownTide` (l.213) et `writeCache` (l.249). Ils enveloppent des appels **Supabase**, dont le build vient de prouver empiriquement qu'ils ne font pas basculer la route (sinon les 10 fiches ne seraient pas pré-rendues). Élargir un hotfix au-delà de sa cause, c'est le rendre risqué : le filet structurel, c'est le **Bloc 1**.

### Critères d'acceptation du brief

| Critère du brief | Verdict | Preuve |
|---|---|---|
| `pnpm test` vert | ✅ | 1663 / 1663 |
| `pnpm build` vert | ✅ | exit 0 |
| `pnpm check:prerender` passe | ✅ | 4 témoins sur 4 |
| `1P` ne reçoit plus d'événement dans les 30 min | ⏳ | **John** : je n'ai pas Sentry dans cette session (connecteur non authentifié) |
| `x-vercel-cache` = HIT/STALE sur 2 appels | ⏳ | **John**, depuis sa machine (WAF 403 sur IP datacenter) |
| Ne pas toucher `revalidate = 1800` / `generateStaticParams()` / les 10 slugs | ✅ | `git diff` ne touche aucun des trois ; les 3 tests de `__tests__/spot-pages-are-static.test.ts` passent |
| Ne pas « optimiser » `weather_cache` | ✅ | aucune ligne de cache modifiée |
| Ne pas poser `dynamic = 'force-static'` sans accord | ✅ | non posé, et non nécessaire (variante A suffit) |
| Aucune migration | ✅ | `supabase/migrations/` intact |

### Reste manuel John

1. ~~Merger `fix/spot-isr-static-to-dynamic` (`39ead71`)~~ ✅ fait le 18/08 à 16h31.
2. Après déploiement, vérifier depuis **sa machine** (pas un conteneur : le WAF Vercel répond 403 aux IP datacenter, cf Bloc 6) :
   ```
   curl -sI https://www.carnet-de-peche.com/spots/pointe-du-grand-minou | grep -i x-vercel-cache
   ```
   → `HIT` ou `STALE` sur deux appels consécutifs.
3. Confirmer dans Sentry que `JAVASCRIPT-NEXTJS-1P` cesse de monter (il montait d'environ 15 évts/h). **`1479200` étant en prod depuis 15h33, ce compteur est déjà lisible maintenant** : c'est ce commit qui porte le correctif de cause. Je n'ai **pas** accès à Sentry dans cette session (connecteur non authentifié), donc c'est le seul critère que je ne peux pas produire moi-même.
4. ~~Puis me dire « hotfix déployé »~~ ✅ fait, blocs 1 à 7 exécutés (ci-dessous).

> Note : `39ead71` ne change **pas** la cause du bug — il empêche la prochaine régression du même genre de passer sous silence. Si `1P` s'est déjà arrêté, c'est normal et ça ne dispensait pas de merger `39ead71`.

✅ **Vérification croisée obtenue** (mesurée depuis la machine de John pendant le Bloc 6, sur `/spots/pointe-du-grand-minou`) : `X-Vercel-Cache: PRERENDER` au 1er appel, puis **`HIT`** au 2e et au 3e. Le critère du brief (« `HIT` ou `STALE` sur deux appels consécutifs ») est **satisfait**. Réserve : ces mesures ont été prises avant le déploiement de `39ead71` ; elles valident donc la fiche telle que la sert `1479200`, ce qui est précisément le commit porteur du correctif de cause.

---

## Bloc 1 — Les deux verrous qui auraient dû attraper le Bloc 0

**Fait.** Les deux trous du sprint 84 sont bouchés, et les deux correctifs ont été **prouvés mordants** en injectant la régression.

### Trou n°1 — le test ne cherchait qu'une CIBLE D'IMPORT

`__tests__/spot-pages-are-static.test.ts` gagne un `collectServerGraph()` (même parcours que `findViolations`, mêmes règles : imports statiques, arrêt à la première frontière `'use client'`) et un détecteur `findNoCacheOptions()` qui cherche `revalidate: 0` et `cache: 'no-store'` **dans le source**, hors commentaires.

Preuve qu'il mord, avec `next: { revalidate: 0 }` réinjecté dans `lib/conditions/spot-forecast.ts` :

```
× app/(marketing)/spots/[slug]/page.tsx n'a ni revalidate: 0 ni no-store dans son graphe serveur
  lib/conditions/spot-forecast.ts:334  ⛔ revalidate: 0
    next: { revalidate: 0 },
```

Le numéro de ligne exact vient d'un changement discret mais nécessaire : `stripComments` remplace désormais les commentaires de bloc par des **espaces** au lieu de les supprimer. Sans ça, tout fichier à long bandeau (la moitié du repo) aurait vu ses lignes décalées, et le message aurait envoyé le lecteur au mauvais endroit.

Deux tests méta gardent le garde :
- il **mord** sur `lib/conditions/openmeteo.ts` (2 occurrences légitimes, hors graphe des pages) ;
- il **ignore** les `revalidate: 0` qui ne sont que dans les commentaires de `spot-forecast.ts`, sans quoi le verrou hurlerait sur sa propre explication.

Portée respectée : le détecteur ne regarde QUE le graphe des deux pages spots. `lib/analytics/server.ts:72` et `app/api/seabed/tiles/route.ts:42`, qui ont légitimement besoin de `no-store`, ne sont pas dans ce graphe et ne sont pas touchés.

### Trou n°2 — le témoin annoncé et jamais posé

`/spots/pointe-du-grand-minou` est ajouté aux `WITNESSES` de `scripts/check-prerender.mjs`, et le commentaire qui disait « la rajouter le jour où le Bloc 3 est livré » est réécrit : il mentait depuis le sprint 84.

```
✅ /spots/pointe-du-grand-minou
     pré-rendu au build (routes, revalidate 1800s)
✅ check:prerender OK : les 5 routes témoins sont pré-rendues.
```

★ Le nouveau commentaire dit aussi ce que ce témoin **ne** fait **pas** : il lit un manifeste de BUILD, or la bascule du 17/08 se produisait au RUNTIME. Le manifeste était impeccable pendant tout l'incident. Les deux verrous sont complémentaires, aucun n'est suffisant seul.

---

## Bloc 2 — Le JIT de zod (1 154 événements, l'issue n°1 en volume)

**Fait, mais pas là où le brief le disait, et c'est le point important de ce bloc.**

### Le brief se trompait d'endroit

Il demandait `z.config({ jitless: true })` dans `instrumentation-client.ts`. Vérification dans le source installé (zod 4.4.3) :

- `node_modules/zod/v4/core/schemas.js:970` lit `globalConfig.jitless` **à la CONSTRUCTION** de chaque schéma objet (`const jit = !core.globalConfig.jitless`), pas au `.parse()`, pas à l'import de zod.
- Mesuré en instrumentant le constructeur `Function` : import de zod → 0 sonde · `z.object({…})` → **1 sonde** · `.parse()` → 0 sonde de plus.

Le flag doit donc précéder le **premier `z.object()` du graphe**. Et comme les imports ESM sont hissés, un `z.config()` écrit dans un module qui importe zod ne peut, par construction, jamais précéder le chargement de zod.

### La solution retenue, en trois couches

1. **`lib/zod-jitless.ts`** (nouveau) : module à effet de bord **sans aucun import**. Il pré-amorce `globalThis.__zod_globalConfig`. C'est possible parce que `core.js:72` fait `__zod_globalConfig ?? (__zod_globalConfig = {})` : un objet déjà posé est **préservé**. Il couvre les deux cas, zod pas encore chargé (on crée l'objet) et zod déjà chargé (on mute celui qu'il lit).
2. **`instrumentation-client.ts`** l'importe en toute première ligne. Next évalue ce fichier avant le code applicatif du navigateur : c'est le seul point qui garantit de précéder n'importe quel chunk.
3. **`lib/zod-config.ts`** l'importe aussi, en première ligne avant `import { z } from 'zod'`, et repose le flag par `z.config()` en ceinture.

### Deux fichiers de schéma orphelins, trouvés au passage

`lib/spots/filters-schema.ts` et `lib/spots/nearby.ts` construisaient des schémas **sans importer `@/lib/zod-config`**. Ils n'avaient donc ni le flag ni la **locale française** : leurs messages d'erreur étaient en anglais dès qu'aucun autre module n'avait chargé la config avant eux. Bug latent antérieur au sprint 88, corrigé en une ligne chacun.

### Preuves

`lib/__tests__/zod-jitless.test.ts` (4 tests). Le test central instrumente `Function` par un `Proxy` et vérifie qu'aucun appel `Function("")` ne part. Prouvé mordant en désactivant le flag :

```
× ★ construire et parser un schéma n’appelle jamais `Function("")`
  → zod sonde encore le constructeur Function → rapport CSP: expected [ [ '' ] ] to deeply equal []
```

★ Et dans ce même essai, **les deux tests de messages français sont restés VERTS** : la démonstration directe que le flag ne change aucune validation, seul risque fonctionnel du bloc. Confirmé structurellement : `jitless` n'est lu qu'à deux endroits de tout le paquet (`schemas.js:970`, `util.js:148`), aucun ne touche aux messages, à la coercition, aux locales ni à l'ordre des issues. À noter : le chemin JIT n'était de toute façon actif que pour les parses **synchrones** (`schemas.js:987`), donc tous nos `parseAsync` tournaient déjà en interprété.

Garde-fou respecté : `'unsafe-eval'` reste absent de la CSP, et le test qui le verrouille passe toujours.

**Poids du bundle (constat demandé, sans action)** : non mesuré. `pnpm analyze` lance un build complet supplémentaire ; quatre builds ont déjà tourné dans ce sprint et ce chiffre n'aurait rien décidé ici. À faire dans le sprint qui traitera vraiment le bundle.

---

## Bloc 3 — Vercel Live et les rapports CSP des previews

### 3a — Toolbar sur la production

**Aucun code.** Réglage fait par John le **18/08 vers 16h40** (préalable n°1). C'est le repère pour vérifier l'arrêt de `JAVASCRIPT-NEXTJS-J`.

★ À retenir, parce que la confusion est facile et a déjà coûté 16 issues : `instrumentation-client.ts` a bien un `denyUrls: [/vercel\.live/, /\/_next-live\//]` depuis le sprint 70, et **il ne pouvait rien y faire**. Les rapports CSP sont POSTés **directement par le navigateur** au `report-uri` ; ils ne passent ni par `Sentry.init`, ni par `beforeSend`, ni par `ignoreErrors`, ni par `denyUrls`. Le sprint 70 avait filtré les *erreurs JS* de la toolbar, pas ses *rapports CSP*.

### 3b — Le report-uri passe en production uniquement

`next.config.ts` : `const cspReportUri = process.env.VERCEL_ENV === "production" ? sentryCspReportUri() : null`.

Sur un preview **protégé**, la redirection d'authentification Vercel fabrique des violations fantômes same-origin que la spec CSP rapporte sous l'URL d'origine (issues `1G`, `1C`, `T`, `1K`, `18`, `1M` : une quarantaine d'événements, tous en HeadlessChrome depuis AWS).

`__tests__/security-headers.test.ts` passe de 7 à **9 tests** : les deux existants posent `VERCEL_ENV='production'`, et deux nouveaux vérifient qu'**aucun** `report-uri` n'est émis en `preview` (avec un DSN valide) ni en développement local. `VERCEL_ENV` est sauvegardé/restauré comme le DSN, sinon un test fuiterait sur toute la suite.

Le canal reste actif en prod : c'est notre seule détection d'une CSP cassée en vrai.

---

## Bloc 4 — `PwaProvider.tsx`, huit issues dans soixante lignes

**Fait.** Nouveau module `lib/storage/safe.ts` (`safeGet` / `safeSet` / `safeRemove`), 10 tests.

★ **Le brief proposait une signature qui n'aurait pas marché.** Il suggérait `safeGet(store, key)` avec l'objet `Storage` en argument. Or dans les navigateurs concernés, c'est la **lecture de la propriété** `window.sessionStorage` elle-même qui lève : c'est littéralement le message de l'issue `14`, « Failed to read the 'sessionStorage' property ». Passer `sessionStorage` en argument aurait donc levé **sur le site d'appel**, avant d'entrer dans le try/catch — un garde-fou purement décoratif. La signature retenue est `safeGet('local' | 'session', key)`, et le helper accède à la propriété dans son propre try/catch. Un test dédié couvre ce cas précis.

Les 8 accès nus de `PwaProvider.tsx` passent tous par le helper (vérifié : plus aucun `localStorage.` ni `sessionStorage.` dans le fichier). `register('/sw.js')` reçoit un `.catch()` documenté ligne à ligne (quelle issue, quelle cause, pourquoi c'est attendu) et un garde `if (!registration) return` pour l'issue `Y`. Le bouton « Installer » mémorise le choix **avant** d'appeler `prompt()` et l'entoure d'un try/catch : l'événement n'est consommable qu'une fois, et une rejection redevenait une unhandled rejection.

Le second `useEffect` est réordonné : `addEventListener('beforeinstallprompt')` **en premier**, comptage de session ensuite. Vérifié par la revue croisée : pour un utilisateur dont le stockage fonctionne, ce réordonnancement ne change **rien** — `beforeinstallprompt` ne peut pas être dispatché de façon synchrone pendant le corps de l'effet, donc `onPrompt` lit toujours un compteur déjà incrémenté.

★ **Un défaut trouvé par la revue croisée, corrigé** : avec un `sessionStorage` refusé mais un `localStorage` qui marche, le marqueur de session ne tenait jamais, donc l'incrément repartait à **chaque page vue**. Le « compteur de sessions » serait devenu un compteur de pages vues, et la bannière serait apparue dès la 2ᵉ page de la 1ʳᵉ visite. Le total n'est désormais incrémenté que si l'écriture du marqueur de session a **réussi** — c'est précisément à ça que sert la valeur de retour booléenne de `safeSet`.

### ⚠️ Un critère d'acceptation du brief est impossible à satisfaire, et il faut le dire

Le brief demande : *« stockage du site bloqué : la bannière PWA s'affiche à la 2ᵉ session »*. **Ça ne peut pas marcher, et aucun code ne peut le faire marcher** : savoir qu'on en est à la 2ᵉ session exige, par définition, de se souvenir de la 1ʳᵉ. Sans stockage, le compteur reste à 0.

La seule alternative serait de proposer l'installation dès la 1ʳᵉ visite, mais alors le refus ne peut pas être mémorisé non plus : l'utilisateur se retrouverait avec une bannière qu'il ne peut pas faire taire. C'est pire. Le choix est donc assumé et commenté dans le code.

*Nuance apportée par la revue croisée* : « aucun code ne peut le faire marcher » est vrai côté navigateur (`document.cookie`, IndexedDB et la Cache API tombent en général sous le même verrou), mais pas dans l'absolu — pour un utilisateur **connecté**, un compteur de visites côté serveur ferait le travail. Hors périmètre de ce sprint, mais l'affirmation méritait d'être bornée plutôt que gravée.

**Ce que le Bloc 4 corrige réellement** : l'EXCEPTION, pas l'impossibilité. Avant, la lecture nue levait, l'effet mourait, et le `addEventListener` n'était jamais posé : la bannière ne marchait pour **personne** dans ce navigateur, même si le stockage se débloquait ensuite. Maintenant le listener est toujours posé, et 8 issues cessent de remonter.

---

## Bloc 5 — MapLibre : le brief visait la mauvaise couche

**Fait, mais pas comme écrit.** Trois constats qui changent le correctif, tous vérifiés dans `node_modules/maplibre-gl` (5.24.0).

### ★ Le garde proposé par le brief ne peut pas fonctionner

Le brief demandait `if (!map.getStyle()) return` **en tête de chaque handler**. Or le plantage a lieu **avant** notre handler, dans le wrapper délégué interne de MapLibre : `layerIds.filter((id) => this.getLayer(id))` (`dist/maplibre-gl-dev.js:72132`), et `getLayer` est un `return this.style.getLayer(id)` nu (`:73161`). Un garde placé dans notre code arrive trop tard, toujours.

Accessoirement, `getStyle()` **sérialise tout le style** à chaque appel (`:72525`) : en tête d'un handler `mousemove`, ç'aurait été un problème de perf ajouté à un problème non résolu.

### ★ `remove()` ne met pas le style à `null`

`remove()` fait `delete this.style`, donc `undefined` (`:72452`). Le **seul** `this.style = null` du paquet est dans `_contextLost` (`:71346`), le handler de `webglcontextlost`. Le titre Sentry dit « null**/**undefined » : ce sont donc **deux mécanismes distincts**, pas un seul.

Le cas `null` est le plus vicieux : la carte reste **montée**, ses écouteurs DOM sont actifs, et le prochain tap part droit dans le wrapper. Cohérent avec les deux issues, toutes deux sur Chrome Mobile Android (onglet en arrière-plan, pression GPU).

### Le correctif appliqué

`map.off()` était de toute façon **impossible** ici : il exige la référence exacte de la fonction (`_removeDelegatedListener`, `:72149`) et tous les handlers de `MapView.tsx` sont des flèches inline. MapLibre 5 rend une `Subscription` (`maplibre-gl.d.ts:12028`), c'est la seule prise.

- `addFuzzyLayers` et `addClusteredSpotsToMap` renvoient désormais leurs `Subscription[]` (9 abonnements délégués au total).
- `layerSubsRef` + `unsubscribeLayers()`, idempotent et tolérant aux exceptions.
- Appelé **avant** `map.remove()` dans le cleanup.
- Appelé aussi sur **`webglcontextlost`**, ce qui traite le cas `null` que ni le brief ni l'audit n'avaient identifié.

### Deux affirmations du brief corrigées

- **`lib/map/useQualityLayer.ts` n'avait rien à corriger.** Il utilise déjà des handlers **nommés** et des `map.off(type, layerId, handler)` symétriques (l.237-241) : exactement ce que la spec exige. Le brief le listait à tort.
- **`SpotMiniMap.tsx` ne pose aucun handler** et n'appelle pas `map.remove()` : il **rend `<MapView>`**, qui possède tout le cycle de vie. Le brief supposait que « les handlers viennent d'un composant enfant » : c'est l'inverse.

### ⚠️ Deux défauts de ce bloc, trouvés par la revue croisée et corrigés

La première version de ce bloc avait deux trous. Ils sont notés ici parce qu'ils sont instructifs, pas par scrupule.

**1. Se désabonner sur `webglcontextlost` créait une carte muette.** MapLibre restaure le style tout seul (`_contextRestored`, `:71350`), mais son événement `load` **ne repart jamais** : `_loaded` n'est jamais remis à `false` (`:73845`). Le bloc qui crée les couches et pose les listeners vit dans `map.on('load', …)`, donc il n'était pas rejoué. On échangeait 3 événements Sentry contre une carte silencieusement inerte après un incident GPU — plus de clic sur un spot, plus de zoom sur un cluster, jusqu'au remontage du composant. **Pire que le bug d'origine.**

Correctif : l'inscription des listeners est séparée de la création des couches (`subscribeFuzzyHandlers` / `subscribeClusterHandlers`), et on se **rebranche** sur `webglcontextrestored`. Rejouer `addFuzzyLayers` entier n'était pas possible : `addSource` aurait échoué, la source existant déjà.

**2. Le chemin `null` restait ouvert sur `/carte`.** L'affirmation « le correctif couvre les deux routes d'un seul geste » n'était vraie que pour le chemin `remove()`. `lib/map/useQualityLayer.ts` pose trois délégués sur `QUALITY_FILL_LAYER`, et ses `map.off` n'arrivent qu'au démontage : après un `webglcontextlost`, la carte reste montée, ces trois-là restent branchés, et le prochain tap repart droit dans le wrapper — c'est-à-dire exactement l'issue `19`, non fermée.

Correctif : `attachDelegates` / `detachDelegates` avec un drapeau anti-double-inscription (`map.off` d'un délégué ne retire que la **première** correspondance, `:72161`), branchés sur la paire `webglcontextlost` / `webglcontextrestored`. `useCatchHeatmap` et `useBathyLayer` sont sains, vérifié : ils n'utilisent que des listeners non délégués.

**Ce que ça dit du sprint** : le vrai risque du Bloc 5 n'était pas de rater le bug, c'était de le « corriger » en cassant plus gros. Aucun test unitaire ne pouvait l'attraper — c'est la relecture adversariale qui l'a fait.

**Pas de test unitaire sur ce bloc** : instancier une carte MapLibre exige un DOM et un contexte WebGL, or ce repo n'a ni jsdom ni happy-dom (tout tourne en environnement `node`). Le brief prévoyait de toute façon qa-chrome + Sentry à J+7 comme critères. Couvert ici par `pnpm typecheck` et la revue de code.

---

## Bloc 6 — WAF et crawlers

### Verdict : **NON.** Googlebot ne reçoit pas de 403 sur carnet-de-peche.com

Investigation en lecture seule, aucun fichier ni réglage modifié. Les mesures ont été faites **depuis l'IP résidentielle de John**, ce que le conteneur cloud ne pouvait précisément pas faire : c'est ça qui tranche.

**Mesuré :**

- UA Googlebot officiel sur `/spots/pointe-du-grand-minou`, `/spots`, `/`, `/robots.txt`, `/sitemap.xml`, `/especes` : **200** partout. Apex → 308 vers www (normal).
- 12 requêtes Googlebot consécutives sur la fiche spot : **200 ×12**, zéro anomalie.
- Prefetch RSC (`RSC: 1` + `Next-Router-Prefetch: 1`), la trame exacte accusée dans `CLAUDE.md` : **200**.
- Aucun en-tête de mitigation : ni `x-vercel-mitigated`, ni `x-vercel-challenge-*`, ni `retry-after`.
- Logs runtime Vercel prod sur 24 h : 200 (8 478), 304 (928), 500 (570), 404 (79), 307 (38), 303 (7), 405 (2). **Aucun 403, aucun 503.**
- Les deux endpoints cités par l'audit du 02/07 comme source du « 503 intermittent » : `/moderation` → 307 (garde d'auth normale), `/.well-known/vercel/jwe` → 204.
- Deployment Protection, verbatim : `passwordProtection: disabled`, `ssoProtection: { enabled: true, deploymentType: "all_except_custom_domains" }`, `trustedIps: disabled`. `vercel.json` ne contient aucune clé firewall.

**Déduit :**

- **L'origine réelle du 403** est dans `ssoProtection: all_except_custom_domains` : les domaines `*.vercel.app` sont protégés, le domaine client ne l'est pas. Vérifié : `carnet-de-peche-git-main-….vercel.app/spots/…` renvoie **302** (SSO) là où `www.carnet-de-peche.com/spots/…` renvoie 200. C'est exactement le mécanisme que l'audit Sentry décrit déjà pour les rapports CSP des previews. **Le 403 venait de la Deployment Protection sur une URL `*.vercel.app`, pas d'un WAF sur la prod.**
- **L'Attack Challenge Mode est éteint** : il imposerait un challenge JavaScript, or `curl` (qui n'exécute pas de JS) reçoit du HTML réel, 12 fois, depuis deux réseaux différents.
- **Même allumé, Googlebot passerait** : doc Vercel, *« while allowing known legitimate bots »*, identifiés par DNS inverse et non par UA. La prémisse « un UA Googlebot falsifié est bloqué, donc le vrai l'est aussi » est un non-séquitur : c'est la falsification que le mécanisme est fait pour rejeter.

**Limite honnête** : le ruleset Firewall nominatif n'a **pas** pu être lu. Le connecteur Vercel MCP n'expose aucun outil Firewall, il n'y a pas de CLI Vercel installée ni de `VERCEL_TOKEN`. Le verdict ne repose donc pas sur la configuration, mais sur le **comportement observé de bout en bout**, qui est ce qui compte pour le SEO. Pour archive : Dashboard → Firewall, ou `vercel firewall rules list`.

**Sentry `9`** (un `<link>` du `<head>` qui échoue) : **à écarter.** 2 événements, alors qu'un blocage d'assets par un WAF en produirait des milliers ; et les assets ne sont pas bloqués (HTML complet, `X-Vercel-Cache: HIT`). L'explication « skew de déploiement » de l'audit tient.

### Reformulation proposée pour `CLAUDE.md` §2 — ⚠️ NON APPLIQUÉE, décision John

Le fragment actuel « 503 intermittents Vercel Challenge/WAF sur les prefetches RSC (risque crawlers/SEO, réglage dashboard John) » a déjà coûté du temps deux fois : audit du 02/07, puis audit Sentry du 18/08 qui l'a cité comme corroboration. Remplacement proposé :

> **FERMÉ le 18/08/2026 (S88 Bloc 6), fausse alerte.** Mesuré depuis l'IP résidentielle de John : `/spots/*`, `/`, `/robots.txt`, `/sitemap.xml` répondent **200** avec UA Googlebot, y compris en prefetch RSC, 12 fois de suite, sans en-tête de mitigation. Zéro 403 et zéro 503 dans les logs runtime prod sur 24 h. **Les 403 vus depuis un conteneur cloud viennent de la Deployment Protection sur les URL `*.vercel.app`** (`ssoProtection: all_except_custom_domains`), pas d'un WAF sur le domaine de prod : ne jamais rejouer ce test depuis un datacenter ni sur une URL de déploiement, ça ne mesure rien.

### À vérifier par John en Search Console (aucun agent ne peut s'y authentifier)

1. **Paramètres → Statistiques sur l'exploration → Par réponse** : part de 403 et de 5xx. Attendu : **0 % de 403**. Vérifier aussi l'absence de **rupture datée** sur la courbe 90 jours (une chute brutale signerait un blocage ; une décrue lente, non).
2. **Inspection d'URL** sur `https://www.carnet-de-peche.com/spots/pointe-du-grand-minou` → **Tester l'URL en direct** → onglet **HTML testé** : code 200, et le `<h1>` « Pêche à Pointe du Grand Minou (29) : Bar, Lieu jaune » présent.

### 🔴 Signal hors périmètre, remonté pour qu'il ne se perde pas

**570 réponses HTTP 500 en 24 h en production**, soit environ **6 % du trafic servi par les fonctions** (contre 8 478 réponses 200). Ce n'est pas dans le Bloc 6, personne ne l'a creusé, et ça ne figure dans aucun brief. Ça mérite son propre chantier.

---

## Bloc 7 — Ménage Sentry

### Ce qui est fait (code)

- **`'Connection closed.'`** ajouté aux `ignoreErrors` d'`instrumentation-client.ts` (issue `1Q` : flux RSC coupé, mobile qui perd le réseau ; Next refait la requête tout seul).
- **`isReactStreamInterference` élargi** à la phase de commit de React. L'issue `1D` (`insertBefore … not a child of this node`, page traduite par un outil tiers) venait du même phénomène — le DOM muté sous React — mais sans frame `$RS`, parce que la casse survient au commit et non à la complétion d'un segment streamé. Le filtre exige désormais trois conditions : message de manipulation de nœud, **absence** d'erreur d'hydratation reconnaissable, et au moins une frame interne à React (`$RS`/`$RC`/`$RB` ou `commitMutationEffectsOnFiber` et sa famille).
- **La condition n°2 est le garde-fou du bloc** : elle empêche cet élargissement d'avaler une vraie erreur d'hydratation de notre code, que le sprint 70 avait justement décidé de garder visible et taguée `hydration: 'suspect'`.
- `lib/__tests__/sentry-filters.test.ts` passe de 10 à **15 tests**, dont deux « conserve » : une vraie erreur d'hydratation avec frame React, et un `insertBefore` venu de notre code sans frame interne. Ils comptent autant que les tests « droppe ».

### `1N` (`Object.hasOwn`) — le chiffre demandé, et ce que j'ai pu établir à la place

Je n'ai **pas** accès à PostHog dans cette session : la part de trafic Chrome WebView < 93 reste à mesurer par John. Ce que le build dit en revanche, et qui nuance le diagnostic de l'audit :

- **Nous n'appelons jamais `Object.hasOwn`** dans notre code (0 occurrence dans `app/`, `lib/`, `components/`).
- Le bundle client en contient **17 occurrences**, de deux natures différentes : `main-*.js` et `6101-*.js` embarquent un **installateur de polyfill** (`Object.hasOwn||(Object.hasOwn=function…`), tandis que deux autres chunks l'appellent **sans garde**.
- Il n'y a **aucun `browserslist`** dans `package.json` ni de `.browserslistrc` : la cible de build est le défaut de Next.

Le risque est donc réel mais **conditionné à l'ordre d'exécution des chunks**, ce que je ne peux pas trancher sans la stack Sentry. Ajouter un `browserslist` est le levier propre, mais c'est un changement de cible de build qui alourdit le bundle **pour tout le monde** : exactement l'arbitrage que le brief renvoie au chiffre de trafic, pas à ce sprint.

### ⚠️ Ce que je ne peux PAS faire — le connecteur Sentry n'est pas authentifié

Le serveur MCP `sentry` demande une autorisation OAuth impossible dans une session non interactive. Je n'ai donc **jamais** pu lire ni écrire dans Sentry pendant ce sprint : aucun compteur avant/après, aucune issue résolue ou ignorée. Pour rendre cette capacité disponible, il faut l'autoriser via `/mcp` dans une session interactive.

Les tâches 1 et 2 du Bloc 7 restent donc **à faire par John** :

1. **Résoudre** : `1P` (Bloc 0), `H` (Bloc 2), `J` (Bloc 3a), `1G` `1C` `T` `1K` `18` `1M` (Bloc 3b), `V` `13` `1H` `K` `15` `1A` `Y` `14` (Bloc 4), `12` `19` (Bloc 5). Le message de commit du Bloc 0 porte déjà `Fixes JAVASCRIPT-NEXTJS-1P` ; les autres blocs partant dans un commit groupé, la fermeture automatique ne couvrira pas tout.
2. **Ignorer** les 12 issues CSP tierces, sur lesquelles nous n'avons aucune prise : `S` (translate.google.com), `Z` et `R` (gstatic / fonts), `17` (www.vinci.com), `1E` (dbankcloud.cn, Huawei), `M` (connect.facebook.net), `1J` (i.ytimg.com), `1B` (cdn.jsdelivr.net).
3. **Laisser visibles et justifiées** : `1F` (`r["@context"].toLowerCase`, 100 % Safari — notre JSON-LD émet un **tableau** de deux objets portant chacun `@context`, et un consommateur tiers qui fait `parsed["@context"]` dessus obtient `undefined` ; inactionnable, sans impact. Piste **non appliquée** : émettre deux balises `<script type="application/ld+json">` séparées plutôt qu'un tableau, mais 12 pages du repo utilisent ce format, c'est un chantier à part) · `1N` (ci-dessus) · `9` (écarté au Bloc 6) · `10`, `11`, `16` (une seule session mobile, `trace_id` partagé, aucune stack exploitable) · `X` (GSAP, 1 occurrence en 3 semaines).

---

## Workstream VERIF — revue croisée indépendante

Passe faite par un agent qui n'avait écrit aucun bloc, avec pour consigne d'attaquer le travail, pas de le valider. **Verdict : mergeable.** Deux défauts « à corriger » ont été trouvés dans le Bloc 5 et **corrigés dans ce sprint** (détail dans le Bloc 5 ci-dessus), plus une remarque sur le Bloc 4, corrigée elle aussi.

### Commandes rejouées par la revue

| Commande | Résultat |
|---|---|
| `pnpm typecheck` | ✅ exit 0, 0 erreur |
| `pnpm lint` | ✅ `No ESLint warnings or errors` |
| `pnpm test` | ✅ **1688 tests / 132 fichiers** (contre 1663 au Bloc 0 seul) |
| `pnpm check:prerender` | ✅ **5/5 témoins**, dont `/spots/pointe-du-grand-minou` en `revalidate 1800s` |

### Les affirmations qui contredisaient le brief ont toutes été recontrôlées

La revue est allée relire chaque source citée. **Les huit tiennent.** Les plus utiles à retenir :

- `patch-fetch.js` l.512-517 : `revalidateStore.revalidate = finalRevalidate`, **affectation directe sans `Math.min`**, et le garde d'entrée l.484 ne s'ouvre que pour ABAISSER. La variante `revalidate: 900` du brief aurait bien divisé par deux le cache de la fiche.
- Le message de `markCurrentScopeAsDynamic` l.510 reproduit **mot pour mot** celui de l'issue `1P`.
- `zod/v4/core/util.js:146` porte déjà le commentaire *« Skip the probe under jitless: strict CSPs report the caught new Function »* : notre diagnostic était celui des auteurs de zod.
- `maplibre-gl-dev.js` : `this.style = null` n'apparaît **qu'une seule fois** dans tout le fichier, dans `_contextLost`.

Deux imprécisions relevées, cosmétiques : les numéros de ligne MapLibre du RECAP sont décalés de 2 à 3, et le `delete this.style` est dans `_updateStyle` (atteint par `remove()` via `setStyle(null)`) plutôt que littéralement dans `remove()`.

### Ce que la revue a cherché sans rien trouver

- **`stripComments`** (le risque le mieux ciblé) : le passage de « supprimer » à « remplacer par des espaces » est neutre pour `isClientBoundary` et **strictement plus correct** pour `extractImports` — la suppression pouvait fusionner un `import` derrière du code et le rendre invisible au parseur.
- **Cycle d'imports zod** : impossible, `zod-jitless` n'importe rien. Aucun des quatre fichiers touchés n'est `'use client'` : ce sont des modules isomorphes.
- **CSP** : un seul hunk dans `next.config.ts`, sur `cspReportUri`. Aucune directive affaiblie, `'unsafe-eval'` toujours conditionné à `isDev`.
- **`MapView`** : les 9 `map.on` sont enregistrés au même endroit, dans le même ordre, et rien n'est court-circuité par les `return`.
- Aucune migration, aucun secret, aucun nouveau texte visible par l'utilisateur.

### Remarques laissées telles quelles

- **Le JIT de zod est aussi coupé côté serveur.** `lib/zod-jitless.ts` est dans le graphe serveur des pages spots via `zod-config`, donc le flag est posé dans le process Node. Il n'y a pas de CSP côté serveur : le JIT y était une optimisation légitime. Sans effet sur la correction (aucun message, aucune locale, aucun ordre d'issue n'en dépend), mais c'est un coût de perf serveur non mesuré. À arbitrer si un profil le montre un jour.
- **Flake connu sur `security-headers.test.ts`**, observé une fois en exécution parallèle, non reproductible (fichier seul vert 9/9, suite complète verte). Le fichier fait maintenant 9 `vi.resetModules()` + import de `next.config` au lieu de 7 : ce sprint **augmente** la pression sur un point déjà fragile, il ne la crée pas.
- **`_to_delete/`** traîne dans les non-suivis (deux `index.lock.*` vides du 17/08, sans rapport). À ne pas embarquer dans le commit de clôture.

---

## Reste manuel John — récapitulatif du sprint

### Bloquant pour clore les blocs

1. **Autoriser le connecteur Sentry** (`/mcp` en session interactive). Sans ça, aucun des critères d'acceptation « l'issue X ne reçoit plus d'événement » n'est vérifiable, ni par moi ni par un agent. C'est le seul juge de ce sprint.
2. **Relever les compteurs** à J+0 puis à J+7 et remplir ce tableau :

| Issue | Évts avant | Après déploiement | Verdict |
|---|---|---|---|
| `1P` | 355, +15/h | | |
| `H` | 268 / 24 h | | |
| `J` | 18 / 24 h | | |
| `V` `13` `1H` `K` `15` `1A` `Y` `14` | 16 cumulés | | |
| `12` `19` | 3 cumulés | | |

3. **Résoudre / ignorer** les issues selon la liste du Bloc 7.

### Décisions qui t'appartiennent

4. **`CLAUDE.md` §2** : appliquer ou non la reformulation « WAF, fausse alerte » proposée au Bloc 6.
5. **`1N` (`Object.hasOwn`)** : mesurer dans PostHog la part de trafic Chrome WebView < 93, puis décider du `browserslist`. Le repo n'en a aucun aujourd'hui.
6. **Search Console** : les deux vérifications du Bloc 6 (part de 403 dans les statistiques d'exploration, inspection d'URL en direct).

### 🔴 Nouveau chantier à ouvrir

7. **570 réponses HTTP 500 en 24 h en production**, ~6 % du trafic servi par les fonctions. Découvert par hasard pendant le Bloc 6. Ça ne figure dans aucun brief et personne ne l'a creusé.
