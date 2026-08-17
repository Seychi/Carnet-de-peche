# Sprint 84 — RECAP
## « Le cache qu'on croyait avoir »

> Exécuté le **2026-08-17**. Branche `main`, **rien n'est poussé, rien n'est commité**.
> Brief : `docs/sprint-84/BRIEF.md`. Mesure d'avant : `docs/sprint-84/BASELINE.md`.
> ⚠️ La fenêtre de mesure du sprint 83 court jusqu'au **07/09** : ni titre, ni maillage,
> ni sitemap n'ont été touchés.

---

## 0. Le chiffre du sprint

| Mesure | Avant | Après |
|---|---|---|
| Routes pré-rendues au build (`prerender-manifest.routes`) | **2** | **73** |
| Motifs ISR (`dynamicRoutes`) | **0** | **3** |
| Fichiers HTML pré-rendus sur disque | **0** | **71** |
| `pnpm check:prerender` | ❌ 4/4 témoins absents | ✅ 4/4 |

Avant, les 2 seules routes « pré-rendues » étaient `/icon.svg` et `/robots.txt`. Autrement
dit : **aucune page du site n'était mise en cache**, et tous les `revalidate` du répertoire
`(marketing)` étaient décoratifs. Depuis des mois, en silence.

**Zéro migration.** `git diff -- supabase/migrations/` vide. Sprint 100 % applicatif.
**1 524 tests verts** (119 fichiers), build vert, `tsc` propre, ESLint propre.

---

## 1. Bloc 0 — la mesure et les verrous

`docs/sprint-84/BASELINE.md` fige l'avant : les deux sorties de manifeste, **15 mesures
prod** (3 tirs × 5 URLs) et les LCP p75 PostHog.

★ **Le résultat le plus parlant de la baseline n'est pas le TTFB, c'est l'en-tête.** Les 15
tirs sont revenus `x-vercel-cache: MISS` avec `Age: 0`, y compris au 3e tir consécutif sur
la même URL, et les réponses portaient `Cache-Control: private, no-cache, no-store,
max-age=0, must-revalidate`. C'est ce que Next émet pour une route rendue dynamiquement :
aucun réglage Vercel ne peut cacher ça. **C'est un critère binaire et non bruité, meilleur
que le TTFB** pour juger l'après.

⚠️ **Le 1 247 ms du brief ne se reproduit pas depuis une ligne fixe française** (mesuré
0,32 à 0,84 s). Ce n'est pas une contradiction, c'est le meilleur cas réseau contre du
terrain mobile. **L'après doit se comparer à la table du BASELINE, pas au 1 247 ms**, sinon
le sprint s'attribuera un gain qu'il n'a pas produit.

Deux verrous automatiques, tous deux prouvés mordants :

- `pnpm check:prerender` : lit `.next/prerender-manifest.json` après un build, sort en 1 si
  un témoin manque. Il distingue les deux voies de pré-rendu (`routes` = HTML au build,
  `dynamicRoutes` = ISR à la demande) et refuse `fallback: false`.
- `__tests__/marketing-layout-is-static.test.ts` : parcourt le graphe d'imports **sans
  build** et affiche le chemin complet du layout jusqu'au module fautif. **Il échouait
  avant le Bloc 1**, avec la chaîne exacte :
  ```
  app/(marketing)/layout.tsx
    → components/layout/Header.tsx
      → lib/supabase/server.ts   ⛔  (appelle cookies() de next/headers)
  ```

---

## 2. Bloc 1 — `HeaderPublic` : sortir l'auth de l'arbre statique

Le header rend désormais **la variante anonyme côté serveur** (ce que voient Googlebot et
100 % du trafic SEO) et bascule après hydratation, sur le modèle de `HeroPrimaryCta`.

- `components/layout/HeaderAuthSlot.tsx` (client) : état initial anonyme, `getSession()`
  et **pas** `getUser()` (lecture locale, zéro aller-retour réseau).
- `components/layout/HeaderPublic.tsx` (serveur pur, aucun import de `lib/supabase/server`).
- `app/(map)/layout.tsx` garde `<Header />` : `/carte` est `force-dynamic`, il n'y a rien à
  gagner et on limite le rayon d'explosion. **Choix délibéré**, verrouillé par un test.

### ★ Le CLS traité par la mesure, pas par l'intuition

La piste du brief (« conteneur à largeur minimale fixe ») **ne marchait pas** : la variante
connectée est **plus large** que l'anonyme (307,35 contre 265,59 px mesurés). Un `min-width`
calé sur l'anonyme n'aurait rien empêché ; calé sur la connectée, il aurait déplacé le
header anonyme en permanence.

Solution retenue : la variante anonyme **reste dans le flux** (`invisible` + `aria-hidden` +
`inert`) et fixe la largeur ; la variante connectée est superposée en absolu. Mesuré dans
Chromium avec Inter chargée, contre un témoin reproduisant l'implémentation actuelle :

| Viewport | Témoin (avant) | Bloc 1 |
|---|---|---|
| 1280 px | **−20,89 px** de décalage | **0** |
| 1024 px | **−20,89 px** | **0** |
| 390 px | 0 | 0 |

---

## 3. Bloc 2 — le middleware

`getUser()` valide le JWT contre le serveur Auth : **un appel réseau par requête HTTP**,
payé aussi par Googlebot, y compris sur une page servie depuis le cache.

### ★ Le brief était à moitié faux sur le rafraîchissement des jetons

Le brief supposait « le client navigateur rafraîchit avec `autoRefreshToken`, donc le
retrait est sûr ». Vérifié via Context7 sur `@supabase/ssr` **0.10.3**, c'est vrai **pour le
navigateur uniquement** : côté serveur, `createServerClient` force `autoRefreshToken: false`,
et `lib/supabase/server.ts` **avale l'écriture du cookie** (un Server Component ne peut pas
en poser). Or les jetons de rafraîchissement Supabase sont **à usage unique**.

Conséquence concrète si on avait suivi le brief : un abonné revenant à froid sur
`/spots/xxx` aurait vu son jeton consommé côté serveur sans être réécrit, donc le
rafraîchissement suivant du navigateur aurait échoué. **Déconnexion.**

Correctif retenu : le early-return est conditionné à **deux** critères, la route n'est
concernée par aucune liste **et** la requête ne porte aucun cookie de session Supabase.
Googlebot et l'écrasante majorité du trafic SEO n'ont pas de cookie, donc le gain est
intégral ; un connecté sur une page publique garde le comportement d'aujourd'hui.

**60 tests** (`middleware-public-routes.test.ts` + l'existant) : 0 appel `createServerClient`
sur 14 routes publiques, ≥ 1 sur les routes app et auth, les 13 entrées d'`APP_ROUTES`
redirigent toujours avec leur `?redirect=`, `/carnet/nouvelle` reste ouvert aux anonymes,
le non-onboardé part toujours sur `/onboarding/1`.

---

## 4. Bloc 3 — `/spots/[slug]` en ISR (go/no-go : GO)

### Les trois faits qui rendent le bloc sûr, vérifiés en base avant d'écrire une ligne

1. `anon` et `authenticated` n'ont **aucun `SELECT`** sur `spots.geom` ni `catches.geom`
   (uniquement sur `geom_public`). Verrous de colonne 028b/041 en place.
2. `get_spot_by_slug` et `nearby_spots` sont `SECURITY DEFINER`, contiennent
   `ST_Centroid(...geom_public...)` et gatent sur `current_tier` :
   `case when precise then ST_X(geom) else ST_X(ST_Centroid(geom_public)) end`.
3. `nearby_spots` plafonne toujours l'anonyme : `where tier <> 'anonymous' or rn <= 3`.

**Le gating vit dans la base, pas dans la page.** Déplacer une lecture vers le navigateur ne
l'affaiblit donc pas.

### ★ Le brief voyait 2 lectures d'auth. Il y en avait 6.

Le parcours du graphe d'imports en a remonté **six** : outre `auth.getUser()` et
`getUserTier()`, il y avait `SpotActivitySection`, `lib/conditions/spot-forecast`,
`lib/conditions/tide-calibration` et `lib/scoring/personal/fetch`. **Retirer les 2 lignes du
brief n'aurait rien débloqué** : la page serait restée dynamique et le sprint aurait été
déclaré fait sans l'être. Les 4 lectures invisibles portent sur des tables publiques
(`weather_cache` et `tide_calibration` sont en `using (true)`), passées sur client anonyme,
résultat identique.

### ★ Le critère de non-fuite n'était pas testable tel qu'écrit

Les liens d'itinéraire sortaient `destination=48.35634512,…` : une coordonnée **floutée**
mais à 7 décimales, indistinguable d'une vraie à l'œil comme au test. Tout ce que le serveur
émet est désormais **arrondi à 3 décimales** (≈ 110 m, très en dessous du flou de 500-900 m,
donc zéro information perdue), ce qui transforme le critère en invariant mécanique.

`__tests__/spot-page-no-coordinate-leak.test.tsx` : **8 tests**. Prouvé mordant en cassant
le code exprès (`roundCachedCoord(spot.lat)` → `spot.lat`) → **3 tests rouges** nommant les
valeurs, puis réparé. Le cas le plus fort : la fixture fait renvoyer à la RPC
`is_precise: true` avec la coordonnée exacte, **comme si le gating SQL était affaibli**, et
le rendu serveur reste sur « ZONE APPROCHÉE ».

### Zéro requête pour un anonyme

Sans garde, chaque page servie par le CDN aurait déclenché une invocation serverless pour
s'entendre répondre « anonyme » : on aurait rendu la page statique et remis le coût par la
fenêtre. Sans cookie de session, aucun `fetch`, et sur `/spots` même pas de chargement du
SDK Supabase.

### ⚠️ `/spots` ne peut PAS redevenir statique, et ce n'est pas l'auth

Le brief annonçait « même traitement, la page redevient statique ». **C'est faux.** La page
attend `searchParams` (les facettes `?dept=` / `?species=`, qui sont des landings indexées),
ce qui interrompt la génération statique **et force `revalidate = 0`**, quoi qu'on écrive
(vérifié dans la source de Next 15.5 : `makeErroringSearchParams` →
`throwToInterruptStaticGeneration`).

Le travail utile a été fait (plus aucune lecture de session, donc un aller-retour Auth en
moins par requête sur la 1re page d'entrée organique) et le fichier dit maintenant la
vérité. **Deux sorties possibles, décision de John** :
- **a.** des segments `/spots/departement/[code]` (statiques, propres pour le SEO) ;
- **b.** un `<Suspense>` autour du sous-arbre qui dépend de `searchParams` — ⚠️ le sprint 78
  a mesuré qu'un `<Suspense>` **change l'ordre du document servi**, ce qui est risqué sur une
  page dont on mesure le CTR jusqu'au 07/09.

---

## 5. Les pages qui restaient dynamiques par elles-mêmes

Le Bloc 1 était nécessaire mais **pas suffisant** : plusieurs pages lisaient les cookies dans
leur propre chargement de données. Chaînes fautives trouvées et traitées :

| Route | Chaîne fautive | Traitement |
|---|---|---|
| `/` | `page.tsx → lib/marketing/home-data.ts → lib/conditions/spot-forecast.ts → server.ts` (lecture de `weather_cache`) | client anonyme |
| `/guides/[slug]` | `page.tsx → components/guides/mdx-components.tsx → server.ts` (composant MDX `<SpotCard>`) | client anonyme |
| `/peche/[...slug]` | `page.tsx → server.ts` (`fetchData`) | client anonyme |
| `/especes/[slug]` | 5 chaînes distinctes | publiques → client anonyme ; visiteur → côté client |

★ **Le « 2 guides sur 6 » était un mystère, la cause n'était pas la page mais son CONTENU** :
exactement 4 fichiers de `content/guides/` emploient `<SpotCard>`, et ce sont exactement les
4 qui ne se pré-rendaient pas.

### ★ Un bug latent que le cache aurait figé

`countSpotsForSpecies` (le « Voir les N spots ») passait par la RLS `spots_select_visible`,
qui ouvre au-delà du public pour `created_by = auth.uid()` **et `is_moderator()`**. Mesuré en
base sur `bar` : **413 spots vus par `anon`, 423 par le modérateur**. Une fois la page en ISR,
un rendu déclenché par la session de John aurait **gelé « 423 » dans le HTML servi à tout le
monde**, alors que `/spots?species=bar` en montre 413. Le client anonyme corrige ça.

### Le piège `catches_for_viewer`, vérifié et non déduit

La vue est `SECURITY DEFINER` : changer de client pouvait changer ce qu'elle renvoie (le
piège « le gating vit à deux endroits » du sprint 77). Les deux requêtes concernées filtrent
déjà `privacy = 'public'`, donc ce que la vue accorde en plus à un connecté est exclu par le
filtre applicatif. **Prouvé en base** par simulation `set role anon` contre `set role
authenticated` avec le compte le plus discriminant (6 prises non publiques) : **7 = 7**.

---

## 6. Passe de sécurité (l'invariant du sprint)

Contrôle mené sur les **71 fichiers HTML réellement pré-rendus sur disque**, pas sur une
intention :

| Contrôle | Résultat |
|---|---|
| Pseudos réels de la base | **0 occurrence** |
| URLs d'avatar Supabase Storage | **0 occurrence** |
| Champ `avatar_url` | **0 fichier** |
| « Mon carnet » (variante connectée) | **0 fichier** |
| « Connexion » (variante anonyme, témoin positif) | **69 fichiers** |
| `git diff -- supabase/migrations/` | **vide** |
| RLS, grants de colonne, RPC | **inchangés** |

⚠️ **Faux positif écarté, à connaître** : un `grep` de coordonnées à 4 décimales remonte
**71 fichiers sur 71**. Ce sont les `47.8709°N · 4.3741°O` du **footer décoratif**
(`aria-hidden="true"`, `text-white/30`), une constante de la charte graphique, pas une donnée
de spot. Ne pas crier à la fuite là-dessus au prochain audit.

---

## 7. Comment tester

```bash
pnpm test              # 1 524 tests, 119 fichiers
pnpm build             # vert
pnpm check:prerender   # 4/4 témoins ✅
pnpm typecheck         # 0 erreur
pnpm lint              # 0 warning
node scripts/lint-copy-dashes.mjs   # 16 warnings, les 16 préexistants
```

⚠️ `__tests__/security-headers.test.ts` peut flaker en timeout 5 s **sous charge de suite
complète** (import dynamique de `next.config` à froid) ; vert en isolation. Connu depuis le
sprint 83, ce n'est pas une régression.

Après déploiement, le contrôle qui compte :

```bash
# doit passer à HIT au 2e tir, et Cache-Control ne doit plus dire "private, no-store"
curl -s -o /dev/null -D - https://www.carnet-de-peche.com/especes/bar | grep -iE 'x-vercel-cache|cache-control|age'
```

★ **Vérification manuelle exigée par le brief, à faire par John** : `curl` d'une fiche spot
**avec le cookie de session d'un compte Itinérant**, puis la même URL **sans cookie**. Les
deux doivent renvoyer **le même HTML** (la version anonyme). Si le HTML diffère selon le
cookie, la mise en cache est cassée ou dangereuse : **arrêter et remonter**.

---

## 8. Reste manuel John

1. **Relever l'Active CPU du mois en cours** dans Vercel → Usage, **avant** de déployer.
   Sans ce chiffre, la comparaison à J+7 sera impossible. Emplacement prêt dans `BASELINE.md`.
2. Merger et déployer. **Noter la date et l'heure exactes ci-dessous** : toute la comparaison
   avant/après en dépend.

   > Déployé le : `_______________`

3. **deploy-watch** juste après : TTFB réel, taux de `HIT`, aucune nouvelle issue Sentry
   (surveiller l'hydratation React #418, déjà connue sur 3 routes).
4. **QA visuelle avec une session réelle** : les blocs qui apparaissent après hydratation pour
   un connecté (frise 7 jours, bande marnage, tendances perso, prises 3-5) décalent encore la
   mise en page. Réserver la place coûterait un trou blanc à ~100 % du trafic, qui est
   anonyme : arbitrage assumé, **à confirmer sur la preview**.
5. **À J+7 : Search Console → Statistiques d'exploration.** C'est le seul endroit qui dira si
   Google a augmenté sa cadence, et **PostHog ne le voit pas** (il ne mesure pas les bots).
   C'est la vraie métrique de succès de ce sprint.
6. **À J+7 : Vercel → Usage → Active CPU.** Attendu : une chute nette. Sinon, le cache ne
   prend pas et il faut rouvrir.
7. **Trancher `/spots`** : segments `/spots/departement/[code]` ou `<Suspense>` (cf §4).
8. **Ne toucher à aucun titre ni lien interne avant le 07/09** (J+21 du sprint 83).

---

## 9. Laissé en l'état, volontairement

- Les `<Suspense>` autour de `SpeciesScore` sur `/especes/[slug]` : les retirer changerait
  l'ordre du document servi (leçon du sprint 78) pendant la fenêtre de mesure du sprint 83.
  **À arbitrer après le 07/09.**
- `lib/supabase/middleware.ts` (`updateSession`) est du **code mort**, aucun import ne le
  référence. Non touché dans ce sprint.
- `components/analytics/VercelAnalytics.tsx` : fichier orphelin, non monté, issu des manips
  Vercel du 17/08. `@vercel/analytics` est dans `package.json` mais **`<Analytics />` n'est
  monté nulle part**, donc Vercel Web Analytics ne collecte rien. À trancher hors sprint.
- Backlog du brief, inchangé : `unstable_cache` sur marée/météo/bathymétrie, géocodage
  inverse BAN, les 7 espèces à maille de façade unique, `llms.txt`.
