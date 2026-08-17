# Sprint 84 — Brief d'exécution
## « Le cache qu'on croyait avoir » — rendre l'ISR réellement actif sur les 1 088 pages SEO

> Rédigé le **2026-08-17**. Durée cible : **1 sprint** (WS A/B/C parallèles jour 1, WS D ensuite).
> Contexte : `docs/PLAN-TRAFIC-2026-08-17.md` §3 (la trouvaille), `docs/sprint-83/RECAP.md`
> (fenêtre de mesure en cours, J+21 = 07/09), `docs/sprint-83/AB-MAREE.md` (cohortes à ne pas
> perturber).
> Décisions John 2026-08-17 : passage **Vercel Pro** fait · **Skew Protection activée** dans les
> paramètres Vercel ✅ · ce sprint est prioritaire sur toute nouvelle page SEO.

**Préalable avant de démarrer** (manuel John) :

1. ✅ Skew Protection activée. **Vérifier qu'un redéploiement a eu lieu APRÈS l'activation**
   (sinon `VERCEL_DEPLOYMENT_ID` est absente et `deploymentId` de `next.config.ts` vaut
   `undefined`) : chercher `?dpl=` sur une URL `_next/static/...` du HTML servi en prod.
2. Vérifier que « Enable access to System Environment Variables » est coché (prérequis documenté
   de Skew Protection).
3. Resoumettre le sitemap dans Search Console (reste manuel n°5 du sprint 83), s'il ne l'est pas.

---

## 🚀 Ligne de lancement (à copier-coller par John)

> ultracode — effort xhigh. Exécute `docs/sprint-84/BRIEF.md`. Lance les workstreams A, B et C
> en parallèle dès maintenant, respecte les dépendances du tableau, et termine par le workstream
> VERIF avant de me rendre la main. Le Bloc 3 a un go/no-go explicite : lis-le avant de coder.
> Ne push pas.

---

## 🧠 Connecteurs & sous-agents (cf `CLAUDE.md` §20)

| Quand | Sous-agent → connecteur | Pourquoi |
|---|---|---|
| Avant tout code de rendu/cache Next 15.5 | **docs-researcher** → Context7 | Le comportement exact de `cookies()` / `revalidate` / `generateStaticParams` / `dynamicParams` **en Next 15.5.18 précisément** (pas de mémoire, pas de blog post). Vérifier aussi si `experimental.ppr` est disponible et stable sur cette version avant de l'écarter (cf Bloc 3, option C). |
| Avant tout code d'auth client | **docs-researcher** → Context7 | `@supabase/ssr` 0.10 : différence `getSession()` (local, sans réseau) vs `getUser()` (round-trip serveur Auth), et qui rafraîchit les tokens côté navigateur. |
| Bloc 3 (avant d'écrire une ligne) | **supabase-guard** → Supabase (RO) | **Ancrer en LECTURE** que les RPC spots sont toujours gatées au tier en SQL (migrations 029, 039, 110) et que `anon`/`authenticated` n'ont pas `SELECT` sur `spots.geom` (028b/041). C'est ce qui rend le Bloc 3 sûr. Si ce n'est pas vérifié, le Bloc 3 s'arrête. |
| QA visuelle du header et de la fiche spot | **qa-chrome** → Claude in Chrome + Playwright | Flash / CLS après hydratation, 390 px et desktop, connecté et anonyme. |
| Après déploiement | **deploy-watch** → Vercel + Sentry | TTFB réel, cache HIT/MISS, hydratation React #418, pas de nouvelle issue. |
| Clôture | **`/verif-sprint`** | Tests + build + lint + types + revue croisée indépendante + passe anti-régression. |

---

## Objectif du sprint en une phrase

Faire que le build de production pré-rende réellement les pages SEO — vérifiable par
`Object.keys(require('./.next/prerender-manifest.json').routes).length` qui doit passer de **2**
à **plusieurs centaines** — et que le TTFB des fiches spots tombe des 1 247 ms actuels à un
temps de service CDN.

---

## Le fait qui justifie le sprint (à ne pas re-débattre, c'est mesuré)

`app/(marketing)/layout.tsx` rend `<Header />`. `components/layout/Header.tsx:10-11` fait
`await createClient()` puis `await supabase.auth.getUser()`. `lib/supabase/server.ts:5` appelle
`cookies()`. Accéder aux cookies rend la route dynamique : **tout le groupe `(marketing)` est
dynamique**, donc `revalidate` et `generateStaticParams` sont inertes partout.

Preuve, build du 17/08 09:20 :

```bash
node -e "const m=require('./.next/prerender-manifest.json');
console.log(Object.keys(m.routes), Object.keys(m.dynamicRoutes))"
# → [ '/icon.svg', '/robots.txt' ] []
find .next/server/app -name '*.html' | wc -l
# → 0
```

Le projet le savait à moitié : `app/(marketing)/spots/page.tsx:205` porte déjà le commentaire
« `revalidate = 3600` est déjà inerte ici, le `<Header/>` du layout marketing appelle
`auth.getUser()` ». Ce qui n'avait pas été vu, c'est que ça vaut aussi pour `/especes/[slug]`
(dont le fichier affirme « cette page est ENTIÈREMENT STATIQUE »), `/peche/[...slug]`,
`/guides/[slug]` et la home.

**Le pattern du correctif existe déjà dans le repo** : `components/marketing/HeroPrimaryCta.tsx`
est un composant client auth-aware dont le commentaire dit exactement ce qu'on va généraliser
(« La page reste statique (ISR `revalidate=3600`) : ce composant s'hydrate côté client et lit
la session via le client navigateur. Le rendu INITIAL (statique, servi au CDN et aux bots) est
toujours la variante anonyme »). Le Bloc 1 applique ce pattern au header.

---

## Workstreams & dépendances

| WS | Bloc(s) | Durée | Dépend de | Parallélisable jour 1 |
|----|---------|-------|-----------|----------------------|
| A | Bloc 0 — gel de la mesure + verrous de non-régression | 0,5 j | — | ✅ |
| B | Bloc 2 — middleware : arrêter le round-trip Auth sur les routes publiques | 0,5 j | — | ✅ |
| C | Bloc 1 — `HeaderPublic` statique (le correctif central) | 1,5 j | — | ✅ |
| D | Bloc 3 — `/spots/[slug]` en ISR (go/no-go) | 2-3 j | C (le layout doit déjà être statique) | ❌ |
| E | Bloc 4 — nettoyage des commentaires mensongers | 0,25 j | C, D | ❌ |
| VERIF | revue finale indépendante | 0,5 j | tous | ❌ (toujours en dernier) |

---

## Bloc 0 — Geler la mesure et poser les verrous de non-régression

Sans base chiffrée, on ne saura pas si le sprint a marché ; et sans verrou automatique, un
futur `<Header />` réintroduit dans un layout re-cassera tout en silence. Ce bloc fait les deux.
Il ne modifie **aucun** comportement produit.

> **Connecteurs** : aucun. Bloc autonome, purement local.

### Tâches

1. Créer `docs/sprint-84/BASELINE.md` avec, mesuré **avant** toute modification :
   - la sortie exacte des deux commandes de la section « Le fait » ci-dessus ;
   - `curl -w '%{time_starttransfer}\n' -o /dev/null -s` sur 5 URLs de prod :
     `/`, `/spots`, `/spots/pointe-du-grand-minou`, `/especes/bar`,
     `/peche/bar/leurres/finistere` — **3 tirs chacune**, en notant `x-vercel-cache`
     (`MISS`/`HIT`/`STALE`) de chaque réponse ;
   - le rappel des LCP p75 PostHog du 17/08 (28 j) : `/spots/pointe-du-guern-telgruc` 7 232 ms,
     `/spots/cap-couronne` 4 448 ms, `/spots/jetees-de-dieppe` 3 980 ms,
     `/spots/cap-bear` 3 290 ms, `/spots/pointe-du-grand-minou` 2 789 ms — contre
     `/spots/cap-dramont` 300 ms et `/especes/vieille` 380 ms ;
   - la consommation Active CPU du mois en cours dans Vercel (Usage), pour comparer après.
2. Créer `scripts/check-prerender.mjs` : lit `.next/prerender-manifest.json` après un
   `pnpm build` et **sort en code 1** si une des routes témoins n'est pas pré-rendue.
   Témoins : `/`, `/especes/bar`, `/guides/peche-au-bar-au-leurre`,
   `/peche/bar/leurres/finistere`. Ajouter le script à `package.json`
   (`"check:prerender": "node scripts/check-prerender.mjs"`).
3. ★ Créer `__tests__/marketing-layout-is-static.test.ts` : un test qui **parcourt le graphe
   d'imports statiques** depuis `app/(marketing)/layout.tsx` (et `app/not-found.tsx`) et
   **échoue** si un module atteint `lib/supabase/server` ou `next/headers` sans passer par un
   fichier marqué `'use client'`. C'est LE verrou qui empêche la régression : il attrape le
   problème au niveau du code, sans avoir besoin d'un build.
   - Implémentation attendue : lecture des fichiers + regex sur les `import … from '@/…'`,
     résolution des alias `@/*` via `tsconfig.json`, arrêt de la descente sur tout fichier dont
     la première ligne non vide est `'use client'`.
   - Le test doit **échouer aujourd'hui** (avant le Bloc 1) et passer après. Le prouver dans le
     RECAP : c'est la démonstration qu'il mord vraiment.

### Critères d'acceptation

- `docs/sprint-84/BASELINE.md` existe et contient les 3 tirs × 5 URLs avec la valeur
  `x-vercel-cache` de chacun.
- `pnpm check:prerender` échoue sur le build actuel et passe sur le build final.
- `__tests__/marketing-layout-is-static.test.ts` échoue avant le Bloc 1 (capture du message
  d'erreur dans le RECAP) et passe après.

### Garde-fous

- Ne toucher à aucun fichier de `app/` dans ce bloc.

---

## Bloc 2 — Middleware : arrêter le round-trip Supabase Auth sur les routes publiques

Le middleware tourne aujourd'hui sur **tout** sauf les assets statiques
(`middleware.ts:120-124`) et fait un `supabase.auth.getUser()` **inconditionnel**
(`middleware.ts:67`). Or `getUser()` valide le JWT côté serveur Auth : c'est **un appel réseau
par requête HTTP**, y compris sur `/`, `/spots/*`, `/especes/*`, `/peche/*`, et y compris quand
la page sera servie depuis le cache. C'est de la latence pure, payée aussi par Googlebot.

> **Connecteurs** : **docs-researcher** → Context7 sur `@supabase/ssr` 0.10 — confirmer (a) que
> `getUser()` fait bien un round-trip alors que `getSession()` lit le store local, et (b) qui
> rafraîchit les tokens si le middleware ne tourne plus sur une route (réponse attendue : le
> client navigateur avec `autoRefreshToken`, ce qui rend le retrait sûr — **à vérifier, pas à
> supposer**).

### Tâches

1. Dans `middleware.ts`, **sortir en avance** avant toute création de client Supabase quand le
   chemin ne concerne ni `APP_ROUTES`, ni `PUBLIC_APP_ROUTES`, ni `AUTH_ROUTES` :
   ```ts
   const { pathname } = request.nextUrl
   const concerned =
     APP_ROUTES.some((r) => pathname.startsWith(r)) ||
     AUTH_ROUTES.some((r) => pathname.startsWith(r))
   if (!concerned) return NextResponse.next({ request })
   ```
   ⚠️ Garder l'ordre de lecture actuel des listes : `PUBLIC_APP_ROUTES` est une **exception à
   l'intérieur** de `APP_ROUTES`, pas une troisième famille — ne pas casser la logique du
   sprint 77 Bloc 7 (`/carnet/nouvelle` accessible aux anonymes).
2. **Ne PAS** modifier le `matcher`. Le garder large est le comportement sûr : si une route app
   est ajoutée demain sans être listée, le middleware la voit encore. Le gain de latence vient
   du early-return, pas du matcher.
3. Ajouter un test dans `__tests__/` : pour `/spots/pointe-du-grand-minou`, `/especes/bar`,
   `/peche/bar/leurres/finistere`, `/`, le middleware **ne crée aucun client Supabase**
   (mocker `@supabase/ssr` et asserter que `createServerClient` n'est **pas** appelé) ; pour
   `/home`, `/carnet`, `/auth/login`, `/spots/proposer`, `/carnet/nouvelle`, il l'est.

### Critères d'acceptation

- Le test ci-dessus est vert dans les deux sens (0 appel sur les publiques, ≥ 1 sur les app).
- Les 13 entrées de `APP_ROUTES` gardent leur comportement : un anonyme sur `/classements` est
  toujours redirigé vers `/auth/login?redirect=/classements` (le `?redirect` du sprint 70 Bloc C
  ne doit pas disparaître). À prouver par un test, pas par lecture.
- `/carnet/nouvelle` reste accessible à un anonyme (sprint 77 Bloc 7).
- Un connecté non-onboardé est toujours renvoyé sur `/onboarding/1` depuis une route app.

### Garde-fous

- Ne pas toucher `APP_ROUTES`, `PUBLIC_APP_ROUTES`, `AUTH_ROUTES` : ni ajout, ni retrait, ni
  réordonnancement.
- Ne pas toucher la logique d'onboarding (`middleware.ts:91-114`).

---

## Bloc 1 — ★ `HeaderPublic` : sortir l'auth de l'arbre statique

C'est le cœur du sprint. Le header doit rendre **la variante anonyme côté serveur** (c'est ce
que voient Googlebot et 100 % du trafic SEO) et basculer sur la variante connectée **après
hydratation**, exactement comme `components/marketing/HeroPrimaryCta.tsx` le fait déjà pour le
CTA du hero.

Bonne nouvelle sur la surface : `HeaderShell`, `HeaderNavLinks`, `UserMenu` et `MobileNav` sont
**déjà** des composants client. Seules les lignes 10-21 de `Header.tsx` (le `getUser()` + le
fetch du profil) sont serveur, et seules les lignes 40-68 dépendent du résultat.

> **Connecteurs** : **docs-researcher** → Context7 sur Next **15.5.18** — confirmer qu'aucun
> `cookies()` / `headers()` ne subsiste dans l'arbre serveur du layout après le changement, et
> que `revalidate` reprend effet sans autre directive. Puis **qa-chrome** pour la QA du flash.

### Tâches

1. Créer `components/layout/HeaderAuthSlot.tsx`, composant **client** :
   - état initial = **anonyme** (les deux boutons « Connexion » / « Créer mon carnet » du code
     actuel, lignes 52-66, déplacés tels quels) ;
   - `useEffect` → `createClient()` de `@/lib/supabase/client` → `getSession()` (**pas**
     `getUser()` : lecture locale, aucun round-trip, bascule quasi instantanée) ;
   - si session : récupérer `username` + `avatar_url` depuis `profiles` avec le client
     navigateur (RLS `own` déjà en place), puis rendre le lien « Mon carnet » + `<UserMenu>` ;
   - rend aussi `<MobileNav isAuthenticated={…} username={…} />` (aujourd'hui ligne 68), car il
     dépend du même état.
2. Créer `components/layout/HeaderPublic.tsx`, composant **serveur pur, sans aucun import de
   `@/lib/supabase/server`** : le même markup que `Header.tsx` lignes 24-37 (HeaderShell, Logo,
   HeaderNavLinks), avec `<HeaderAuthSlot />` à la place du bloc conditionnel.
3. Remplacer `<Header />` par `<HeaderPublic />` dans :
   - `app/(marketing)/layout.tsx:7`
   - `app/not-found.tsx:14`
4. **`app/(map)/layout.tsx:21` : laisser `<Header />`.** `/carte` est en `force-dynamic`
   (`app/(map)/carte/page.tsx:19`), il n'y a donc rien à gagner et on limite le rayon
   d'explosion. À noter dans le RECAP comme choix délibéré.
5. Ne **pas** supprimer `components/layout/Header.tsx` : il reste utilisé par `(map)`.
6. ★ **Anti-CLS** : la variante anonyme (deux boutons) et la variante connectée
   (« Mon carnet » + avatar) n'ont pas la même largeur. Réserver la largeur dans
   `HeaderAuthSlot` (conteneur à largeur minimale fixe, ou `visibility` plutôt que montage
   conditionnel) pour que la bascule ne pousse rien. Le header est en haut de page : un shift
   ici dégrade le CLS de **toutes** les pages.

### Critères d'acceptation

- `__tests__/marketing-layout-is-static.test.ts` (Bloc 0) **passe**.
- Après `pnpm build` : `pnpm check:prerender` passe, et
  `Object.keys(require('./.next/prerender-manifest.json').routes).length` est **≥ 30**
  (les 26 fiches espèces + la home + les guides au minimum). Coller le chiffre réel dans le
  RECAP.
- `find .next/server/app -name '*.html' | wc -l` est **> 0**.
- QA **qa-chrome**, 390 px et desktop, dans les deux états :
  - anonyme : header identique au visuel actuel, aucun flash ;
  - connecté : le header part en anonyme puis bascule ; **aucun décalage de mise en page
    mesuré** (comparer deux captures, avant et après bascule, superposables sur le contenu
    sous le header) ;
  - `/especes/bar` en `curl` brut (pas après hydratation) : le HTML SSR contient « Connexion »
    et **ne contient ni `username` ni URL d'avatar**.
- Aucune régression de nav : `aria-current` de `HeaderNavLinks` toujours posé sur la route
  active ; `MobileNav` s'ouvre et affiche les bonnes entrées dans les deux états.
- Zéro nouvelle erreur d'hydratation dans la console sur `/`, `/especes/bar`,
  `/peche/bar/leurres/finistere`, `/spots/pointe-du-grand-minou`.

### Garde-fous

- Ne pas toucher `HeaderShell.tsx`, `HeaderNavLinks.tsx`, `UserMenu.tsx`, `mobile-nav.tsx`
  autrement que par les props déjà existantes.
- Ne pas toucher au groupe `(app)` : `AppHeader`/`AppShell`/`AppSidebar` sont hors périmètre,
  ces pages sont `force-dynamic` et doivent le rester.
- **Aucune donnée utilisateur ne doit apparaître dans un HTML mis en cache.** C'est l'invariant
  du bloc : si le HTML statique contient un pseudo, le sprint est un échec de sécurité, pas une
  optimisation.

---

## Bloc 3 — `/spots/[slug]` en ISR réel (⚠️ go/no-go)

607 pages, la première source de trafic organique, et les pires LCP du site. Mais c'est aussi
la page la plus sensible du produit : elle porte le gating de coordonnées GPS. Un HTML mis en
cache au CDN qui contiendrait des coordonnées précises serait une fuite de spot **permanente et
publique** — exactement ce que les migrations 028, 029, 039 et 110 ont fermé.

Après le Bloc 1, cette page reste dynamique **par elle-même** : `page.tsx:478-480` fait
`supabase.auth.getUser()` et `page.tsx:631` `getUserTier()`. Le Bloc 1 ne la débloque pas.

> **Connecteurs** : **supabase-guard** → Supabase (RO) **AVANT toute ligne de code**. Ancrer en
> lecture, et l'écrire dans le RECAP :
> 1. `anon` et `authenticated` n'ont **pas** `SELECT` sur `spots.geom` (grants de colonne
>    028b/041) ;
> 2. les RPC servant la fiche renvoient bien `ST_Centroid(geom_public)` pour tout tier hors
>    `local`/`itinerant`/propriétaire (029, 039, 110) ;
> 3. `nearby_spots` plafonne toujours un anonyme à 3 voisins (invariant du sprint 83).
>
> **Si l'un des trois n'est pas vérifié, ARRÊTER le bloc et le signaler.** C'est ce qui rend le
> reste sûr : le gating vit **dans la base**, pas dans la page. Déplacer une lecture vers le
> navigateur ne l'affaiblit donc pas — la base refuse la donnée précise à qui n'y a pas droit.

### Décision de conception (pré-arbitrée)

**Option retenue : coquille anonyme statique + deltas connectés côté client.** La version
anonyme est exactement ce que voient Googlebot et tout le trafic SEO ; c'est donc elle qu'on met
en cache, et les blocs réservés se montent après hydratation.

Deux options écartées, motifs à ne pas re-débattre :

- **PPR (`experimental.ppr`)** : ce serait le bon outil conceptuel, mais c'est expérimental.
  On ne met pas la page la plus sensible du produit sur une API expérimentale.
  *Exception* : si **docs-researcher** établit que PPR est passé stable en 15.5.18, remonter
  l'information à John — c'est un `⚠️ DEMANDER À JOHN AVANT` de changer d'option, pas une
  décision d'agent.
- **Laisser la page dynamique** : c'est le statu quo, il coûte 1 247 ms de TTFB et la moitié de
  la cadence de crawl.

### Tâches

1. **Ne pas pré-générer les 607 pages au build.** `generateStaticParams()` renvoie une liste
   **courte** (les fiches déjà connues comme sources de trafic organique : `pointe-du-grand-minou`,
   `jetees-de-dieppe`, `digues-de-sausset-les-pins`, `pointe-de-penmarch`,
   `chenal-de-l-aa-gravelines`, `pointe-du-conguel`, `pointe-de-penvins`, `pointe-de-kerpenhir`,
   `pointe-de-trefeuntec-plonevez-porzay`, `pointe-de-mousterlin`) + `dynamicParams = true`.
   Motif : la page appelle marée, météo et bathymétrie par fiche ; 607 pages au build
   signifierait des milliers d'appels Open-Meteo en quelques minutes, avec un risque de
   rate-limit qui **casserait le build**. Les 597 autres se génèrent à la première visite puis
   restent en cache — c'est déjà le modèle documenté de `/peche/[...slug]:33`.
2. Retirer toute lecture d'auth du rendu serveur de la page : `supabase.auth.getUser()`
   (ligne 480) et `getUserTier()` (ligne 631) sortent. Le rendu serveur se comporte
   **comme un anonyme**, sans exception.
3. Déplacer les deltas connectés dans des composants client, chacun faisant sa propre lecture
   via le client navigateur :
   - `FavoriteSpotButton` (ligne 793) : garde `loginHref` en état anonyme, lit l'état réel après
     hydratation ;
   - `PersonalTendencies` (lignes 570-572, 949) : monté uniquement si session ;
   - le mur d'inscription `showSignupWall` (ligne 487) : rendu **par défaut** dans le HTML
     statique (état anonyme), retiré après hydratation si session ;
   - `fetchViewerConfirmed` / `fetchViewerFavorite` (lignes 505-509) : côté client ;
   - le bloc coordonnées précises `spot.is_precise` (lignes 822, 871, 1282) : **le HTML statique
     rend la branche non-précise**, et la branche précise est demandée côté client via la RPC
     gatée. Aucune coordonnée précise ne doit jamais entrer dans le HTML mis en cache.
4. Garder `revalidate = 1800`. La bande marée du jour (`SpotTodayBand`) a besoin de fraîcheur
   et 30 min est le bon compromis. Ne pas l'augmenter dans ce sprint.
5. Vérifier le même point sur `app/(marketing)/spots/page.tsx` : `getUserTier()` y est lu
   (ligne ~207, commentaire « il était déjà perdu »). Même traitement — le mur d'inscription
   part côté client, la page redevient statique. **`/spots` est la 1re page d'entrée organique
   du site** (21 visiteurs sur 28 j) : elle vaut autant que les fiches.

### Critères d'acceptation

- ★ **Test de non-fuite, obligatoire** : un test qui rend la page en contexte anonyme et
  **échoue si le HTML contient une coordonnée à plus de 3 décimales** ou un champ issu de
  `spots.geom`. Le formuler en assertion sur le HTML, pas sur une intention.
- ★ **Vérification manuelle sur la prod déployée** : `curl` d'une fiche **avec le cookie de
  session d'un compte Itinérant**, puis `curl` de la **même URL sans cookie**. Les deux doivent
  renvoyer **le même HTML** (donc la version anonyme), et les coordonnées précises n'apparaître
  qu'après exécution du JS. Si le HTML diffère selon le cookie, la mise en cache est cassée ou
  dangereuse : **arrêter et remonter à John**.
- `x-vercel-cache` passe à `HIT` au 2e tir sur les 5 URLs du BASELINE, et le
  `time_starttransfer` du 2e tir est **inférieur à 200 ms**. Coller les 3 tirs dans le RECAP.
- `pnpm build` réussit **sans appel Open-Meteo en masse** : durée de build à noter dans le
  RECAP, écart avec le build de référence à commenter.
- Un abonné Local/Itinérant voit **toujours** ses coordonnées précises et son bloc favori après
  hydratation. À prouver par une session **qa-chrome** réelle, pas par lecture de code.
- `nearby_spots`, le floutage, les 12 liens voisins et les 3 liens remontants du sprint 83
  (`SpotUpLinks`) sont **inchangés** — le sprint 83 est en cours de mesure.
- Aucune migration : `git diff -- supabase/migrations/` doit être **vide**.

### Garde-fous

- ⚠️ **DEMANDER À JOHN AVANT** : (a) si PPR s'avère stable en 15.5.18 ; (b) si la coquille
  anonyme statique impose de retirer une fonctionnalité visible à un abonné — on ne dégrade pas
  le produit payant pour gagner du cache ; (c) si le test de non-fuite ne peut pas être écrit
  de façon fiable.
- Ne pas toucher les **titres** de fiches (`lib/seo/spot-title.ts`, cohortes A/B du sprint 83),
  ni le **maillage** (`SpotUpLinks`, `NEARBY_MAX`), ni `app/robots.ts`, ni `app/sitemap.ts`.
  La fenêtre de mesure court jusqu'au **07/09** et le Bloc 1 du sprint 83 est le seul verdict
  causal de ce sprint : le perdre coûterait plus que ce sprint ne rapporte.
- Ne pas toucher aux RPC ni aux policies. Ce sprint est **100 % applicatif**.

---

## Bloc 4 — Nettoyer les commentaires qui mentent

Plusieurs fichiers affirment un comportement de cache qui n'existait pas. Après les Blocs 1 et 3
ils redeviennent vrais — mais il faut les relire un par un, parce que certains **resteront**
faux (les pages `(app)` en `force-dynamic`, par exemple).

> **Connecteurs** : aucun.

### Tâches

1. Relire et corriger : `app/(marketing)/spots/page.tsx:205` (« déjà inerte »),
   `app/(marketing)/especes/[slug]/page.tsx:279` (« ENTIÈREMENT STATIQUE »),
   `components/especes/species-answer.tsx:62`, `components/especes/species-seasons.tsx:35`,
   `lib/especes/seo.ts:62`, `components/marketing/HeroPrimaryCta.tsx`,
   `app/(marketing)/peche/[...slug]/page.tsx:25,33`, `app/(marketing)/guides/[slug]/page.tsx:14`.
2. Mettre `CLAUDE.md` à jour : une ligne dans §2 (état réel) + une ligne dans §6 (conventions)
   disant qu'**aucun composant du layout `(marketing)` ne doit lire les cookies**, avec le
   renvoi vers le test verrou du Bloc 0.
3. `node scripts/lint-copy-dashes.mjs` : ne pas introduire de nouveau tiret cadratin dans une
   copy visible (le header porte de la copy).

### Critères d'acceptation

- Aucun commentaire du repo n'affirme un cache que le `prerender-manifest` ne confirme pas.
- `CLAUDE.md` §2 et §6 mis à jour.
- `lint-copy-dashes.mjs` : pas de nouveau warning par rapport aux 16 préexistants du sprint 83.

---

## Workstream VERIF (obligatoire, agent indépendant qui n'a pas écrit le code)

1. Lancer `/verif-sprint` : `pnpm test` (1 440 tests + les nouveaux), `pnpm build`,
   `pnpm typecheck`, `pnpm lint`, revue croisée indépendante, passe anti-régression.
   ⚠️ `__tests__/security-headers.test.ts` peut flaker en timeout 5 s sous charge de suite
   complète (import dynamique de `next.config` à froid) — connu depuis le sprint 83, à
   re-vérifier en isolation avant de crier à la régression.
2. Relire **chaque** critère d'acceptation et cocher ✅/❌ **avec preuve** (commande + sortie).
3. ★ Passe de sécurité dédiée, la plus importante de ce sprint :
   - le HTML mis en cache d'une fiche spot ne contient **aucune** coordonnée précise, **aucun**
     pseudo, **aucun** avatar, **aucune** donnée de carnet ;
   - le test de non-fuite du Bloc 3 existe et échoue si on le sabote volontairement (le prouver
     en cassant le code exprès une fois, puis en réparant) ;
   - RLS et grants de colonne inchangés ; `git diff -- supabase/migrations/` vide.
4. Passe copy : tutoiement, pas de tiret cadratin en copy visible, aucune promesse produit
   nouvelle.
5. Livrer `docs/sprint-84/RECAP.md` : fait / comment tester / **le chiffre avant-après**
   (nombre de routes pré-rendues, `time_starttransfer` × 3 tirs × 5 URLs, `x-vercel-cache`) /
   reste manuel John.

---

## Reste manuel John (post-sprint)

1. Merger et déployer. **Noter la date et l'heure exactes du déploiement dans le RECAP** — la
   comparaison avant/après en dépend, comme au sprint 83.
2. **deploy-watch** immédiatement après : TTFB réel, taux de `HIT`, aucune nouvelle issue Sentry
   (surveiller particulièrement l'hydratation React #418, déjà connue sur 3 routes).
3. À **J+7** : Search Console → **Statistiques d'exploration**. C'est le seul endroit qui dira
   si Google a augmenté sa cadence. C'est la vraie métrique de succès du sprint, et PostHog ne
   la voit pas (il ne mesure pas les bots).
4. À **J+7** : Vercel → Usage → Active CPU. Attendu : une chute nette. Si ce n'est pas le cas,
   le cache ne prend pas et il faut rouvrir.
5. **Ne toucher à aucun titre ni lien interne avant le 07/09** (J+21 du sprint 83).
6. Rappel de la liste du plan trafic, indépendante de ce sprint : exclure ses propres domaines
   des referrers PostHog, créer l'insight « canal IA » sur `utm_source`, et trancher l'approche
   créateurs / réseaux sociaux (1 visiteur d'Organic Social en 90 jours).

---

## Backlog explicitement hors de ce sprint

- `unstable_cache` sur les appels marée / météo / bathymétrie de la fiche spot (gain
  supplémentaire, mais indépendant : à mesurer une fois l'ISR en place).
- Géocodage inverse BAN → colonne `commune` (débloque la facette ville abandonnée au Bloc 3 du
  sprint 83).
- Les 7 espèces à maille de façade unique qui servent le gabarit du mulet (sprint 83 §6).
- `llms.txt` : non démontré, 10 minutes, à faire un jour de pluie.
