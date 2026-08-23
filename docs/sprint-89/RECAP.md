# Sprint 89 — RECAP

> Brief : `docs/sprint-89/BRIEF.md` · Base : `main` = `0e95cfb` (sprint 88 déployé).
> Exécuté le **2026-08-19**.

---

## Résumé en une phrase

Deux blocs sur quatre dépendent entièrement de relevés que seul John peut faire (Search Console, PostHog) ; les deux autres ont été traités, et le **cadre de mesure du Bloc B a dû être refait** parce que celui du brief mesurait quatre changements de title au lieu d'un.

---

## Bloc A — Hygiène de mesure : **entièrement manuel, rien n'est faisable depuis la session**

Les cinq actions du bloc sont toutes hors de portée d'un agent, et pour deux raisons distinctes qu'il faut séparer.

**Les points 1, 3 et 4 sont dans la Search Console**, qui n'a aucun connecteur ici. C'était déjà la limite notée au §7 du plan du 17/08. Rien de neuf, mais rien de contournable.

**Les points 2 et 5 sont dans PostHog, et c'est plus définitif que « pas branché » : ce projet n'a nulle part de clé PostHog en LECTURE.** Seule `NEXT_PUBLIC_POSTHOG_KEY` existe, et c'est une clé PROJET en écriture seule, faite pour capturer des événements, inutilisable pour interroger l'API Query ou modifier un réglage de projet. Ce n'est pas une supposition : c'est vérifié dans `.env.example` et `lib/env.ts`, et c'est déjà écrit noir sur blanc en tête de `scripts/reconcile-signups.mjs:19-25`, qui prend pour cette exact raison le chiffre PostHog en **argument** plutôt que d'aller le chercher.

Donc : **aucun code n'aurait pu faire le Bloc A.** Le voici transformé en liste de clics, pour que ça te coûte dix minutes et pas une recherche.

### 1. Resoumettre le sitemap

Search Console → **Sitemaps** → saisir `https://www.carnet-de-peche.com/sitemap.xml` → Envoyer.
C'est le reste manuel n°5 du RECAP 83, en attente depuis le 17/08. Il porte la découverte des 118 pages `/peche` ajoutées au sprint 83.

### 2. Exclure les auto-référents dans PostHog

PostHog → projet **208730** → Settings → **Project** → section *Referrer domains to exclude* (ou *Discard events / self-referrals* selon la version) → ajouter les **deux** entrées :

```
carnet-de-peche.com
www.carnet-de-peche.com
```

Les deux, pas une : le relevé compte **287 + 31 visiteurs** « référés » qui sont en réalité des sessions recoupées, soit **45 % du tableau d'acquisition**. Tant que ce n'est pas fait, toute lecture de canal est fausse d'un facteur deux.

### 3. Les trois compteurs d'indexation

Search Console → **Pages**. Relever et coller ici :

| Compteur | Valeur au \_\_/08 |
|---|---|
| Indexée | |
| Découverte, actuellement non indexée | |
| Explorée, actuellement non indexée | |

C'est le seul endroit qui dit si les 1 088 pages SEO sont réellement entrées dans l'index.

### 4. Les statistiques d'exploration, avant/après le correctif ISR

Search Console → **Paramètres** → *Statistiques sur l'exploration*. Relever :

| Mesure | Avant le 17/08 | Après le 18/08 |
|---|---|---|
| Requêtes d'exploration / jour (moyenne) | | |
| Temps de réponse moyen (ms) | | |

★ C'est **la seule preuve disponible que le sprint 84 a servi à quelque chose**. Sans ce relevé, l'ISR reste une conviction.

### 5. L'insight « canal IA »

PostHog → Insights → New insight → Trends.
Événement `$pageview`, décomposé ou filtré sur `utm_source` ∈ :

```
chatgpt.com · perplexity · copilot.com · gemini.google.com · claude.ai
```

Série temporelle, **90 jours**. Nommer l'insight `Canal IA`.
Base connue à battre : **18 visiteurs sur 90 j**, dont ChatGPT 15.

### Critères d'acceptation

| Critère | Verdict |
|---|---|
| Plus aucune ligne `*.carnet-de-peche.com` dans les domaines référents (30 j) | ⏳ John |
| L'insight « canal IA » existe, nommé, série non vide | ⏳ John |
| Les 3 compteurs d'indexation et les 2 chiffres d'exploration dans ce RECAP, datés | ⏳ John |

Garde-fou respecté : **le sitemap n'a pas été touché**, le filtre `moderation_status='approved'` du 05/08 reste tel quel.

---

## Bloc B — Verdict CTR des fiches espèces : **aucun title touché, et le plan de mesure a dû être refait**

### La porte de décision n'a pas pu être franchie

L'export Search Console n'est pas accessible depuis la session. **Aucun `title` n'a donc été modifié**, ce qui est le comportement attendu par défaut : le brief interdit d'écrire avant d'avoir lu.

`git diff` ne touche ni `lib/especes/seo.ts` ni aucun fichier de `lib/especes/content/`. Vérifiable.

### ★ Mais le plan de mesure du brief mesurait trois choses à la fois

Le brief propose de comparer 29/07 → 07/08 à 10/08 → 19/08 et d'en tirer un verdict sur le sprint 75. **Vérifié dans l'historique git : le title des fiches espèces a changé QUATRE fois, pas une.**

| Mise en prod | Changement | Fiches |
|---|---|---|
| **09/08 08:59** (`fe31f5c`, S75) | création de `lib/especes/seo.ts` | les 26 |
| **14/08 20:40** (`2f69be1`, S77) | ouverture du **mécanisme** d'override `content.seoTitle` (`seo.ts:110`) + 3 fiches : `congre`, `mulet`, `tassergal` | 3 |
| **15/08 10:37** (`85b7822`, **S78**) | « 8 titres especes portes a l'intention peche » : `bar`, `barracuda`, `liche`, `maigre`, `oblade`, `pageot`, `sar`, `seiche` | 8 |
| **17/08 11:53** (`357c94d`, S83) | retrait de l'override sur `mulet` + nouveau title (A/B S83) | 1 |

La fenêtre « après » du brief contient donc **trois interventions supplémentaires**. Et les trois fiches que le brief range en « intention pêche » et qui devaient porter le verdict — **`bar`, `sar`, `seiche`** — ont été réécrites le **15/08**.

> ⚠️ **Correction apportée après la revue croisée.** Ce tableau annonçait d'abord « trois interventions » et attribuait les 11 overrides au sprint 77 du 14/08. C'était faux : le S77 n'a ouvert que le mécanisme et touché 3 fiches, et ce sont les **8 du sprint 78, le 15/08**, qui portent les fiches décisives. La conclusion pratique ne bouge pas (les 15 fiches propres restent propres), mais un document de mesure qui se trompe de sprint et de date sera relu comme une source dans deux mois. Conséquence concrète : la fenêtre de lecture des 11 contaminées démarre au **16/08**, pas au 15.

Un verdict tiré de ce plan aurait attribué au sprint 75 l'effet cumulé de quatre interventions. C'est exactement l'erreur que le sprint 89 s'appelle « lire avant d'écrire » pour éviter.

### La méthode corrigée

Juger sur les **15 fiches que personne n'a retouchées depuis le 09/08**, pour lesquelles la fenêtre 10/08 → 19/08 est un lecteur propre et comparable :

`calmar` · `chinchard` · `dorade-grise` · **`dorade-royale`** · **`lieu-jaune`** · `lieu-noir` · **`maquereau`** · `marbre` · `merlan` · `orphie` · `plie` · `rouget` · `sole` · `tacaud` · `vieille`

Les trois en gras sont les rescapées du groupe « intention pêche ». Trois fiches propres valent mieux que six dont la moitié a bougé deux fois.

Les 11 contaminées (`bar`, `barracuda`, `congre`, `liche`, `maigre`, `oblade`, `pageot`, `sar`, `seiche`, `tassergal`, plus `mulet`) ne sont pas perdues : elles se lisent sur une fenêtre qui démarre au **16/08**, plus tard.

### Recommandation de calendrier

**Exporter le 22/08, pas maintenant.** La GSC a 2 à 3 jours de retard : au 19/08, trois des dix journées de la fenêtre « après » sont incomplètes, soit 30 % de la mesure, pour un verdict qui se joue sur un point de CTR. Le brief dit lui-même « ne pas conclure sur 3 jours de données ».

Le détail complet — tableau à remplir par `pagepath`, règle de lecture fixée **avant** de voir les chiffres, et les deux branches de la porte de décision — est dans **`docs/sprint-89/especes-ctr.md`**.

### Critères d'acceptation

| Critère | Verdict |
|---|---|
| `docs/sprint-89/especes-ctr.md` existe, avec fenêtres, tableau, segmentation, verdict | ✅ pour tout sauf le verdict, ⏳ en attente des chiffres |
| Si branche 1 : `git diff` ne touche ni `lib/especes/seo.ts` ni `lib/especes/content/` | ✅ aucun des deux touché |
| Le verdict cite la position moyenne des deux fenêtres | ⏳ règle inscrite dans le document, à appliquer |

Garde-fous respectés : `/especes/mulet` **non touché** (A/B S83 ouvert jusqu'au 07/09), aucun `<title>` de `/spots/*` ni le maillage interne touché.

---

## Bloc C — Les 570 réponses 500 : **la cause était déjà corrigée**

### Le relevé, mesuré aujourd'hui

Logs runtime Vercel production, fenêtre **18/08 ~16:30 UTC → 19/08 ~16:30 UTC** :

| Code | Compte |
|---|---|
| 200 | 11 220 |
| 304 | 997 |
| 404 | 51 |
| 307 | 38 |
| 301 | 2 |
| 303 | 2 |
| **5xx** | **0** |

Requête `statusCode=5xx` sur 24 h : table vide. Groupée par route : table vide.
**Taux d'erreur serveur : 0,00 %**, contre 5,6 % au relevé du 18/08. Le critère du brief (« 500 sous 1 % ») est atteint. Le volume de 200 est passé de 8 478 à 11 220, ce qui est le comportement attendu : les rendus qui échouaient servent désormais la page.

### La cause, nommée et prouvée

Ce n'était **pas** Open-Meteo. C'était `Page changed from static to dynamic at runtime`, le `DynamicServerError` de Next, c'est-à-dire **exactement le bug du sprint 88 Bloc 0**. Log tel quel :

```text
Error: Page changed from static to dynamic at runtime /spots/plage-de-la-franqui,
reason: revalidate: 0 fetch https://marine-api.open-meteo.com/v1/marine?...
  { page: '/spots/plage-de-la-franqui' }
```

Le `reason:` porte le coupable en clair. Répartition par route sur le relevé du 17-18/08, 50 groupes d'erreurs, 859 événements :

| Route | Événements | Part |
|---|---|---|
| `/spots/[slug]` (47 slugs distincts) | 692 | 90 % |
| `/` (home, via `/index.rsc`) | 76 | 10 % |
| **Total `static to dynamic`** | **768** | **89 % de tous les événements** |
| Open-Meteo 429 | 91 | 11 % |

Les deux seules routes touchées sont les deux qui appellent Open-Meteo pendant un rendu ISR. Corrélation sur les horodatages de déploiement :

| Moment | Heure UTC |
|---|---|
| Déploiement `31f908f` (S84, allume l'ISR) | 17/08 13:41:49 |
| **Première** erreur | 17/08 14:48:39 (+1 h 07, la 1re régénération de `/`, revalidate 3600) |
| **Dernière** erreur | 18/08 13:32:15 |
| Déploiement `1479200` (S88, retire `revalidate: 0`) | 18/08 13:33:08 |

**53 secondes** entre la dernière erreur et le correctif. Le défaut naît une heure après l'allumage de l'ISR et meurt une minute avant son correctif.

### Répartition par heure : l'hypothèse du cron tombe

Première apparition des 48 groupes, par heure UTC : 00h(2) · 01h(2) · 03h(1) · 05h(1) · 06h(1) · 14h(2) · 15h(1) · 16h(1) · 19h(3) · **20h(17)** · 21h(6) · 22h(6) · 23h(6).

**Étalé sur tout le cadran**, avec un pic à 20h UTC (22h Paris, le pic de trafic du soir) et non à 05h UTC, l'heure du cron. Sonde ciblée sur 18/08 04:30–05:30 UTC, qui encadre le cron : 12 groupes, **tous** `static to dynamic`, **zéro** 429 et zéro 503. L'hypothèse « le cron sature Open-Meteo et les fiches héritent du 429/503 » est **fausse pour les 500**.

### ★ Mais le cron sature bel et bien Open-Meteo, et ça cachait un vrai défaut

Run du 19/08, mesuré : `05:00:03 GET /api/crons/compute-spot-scores 200`, puis **~82 lignes** `Open-Meteo indisponible (status 429) : "Too many concurrent requests"` dans la même invocation, et pour finir `Spot scores computed: 208 spots (208 ok, 0 échec) in 49669ms`.

**« 208 ok » était un mensonge.** Un spot dont l'appel prend un 429 ne lève pas : `fetchOpenMeteo` renvoie `null`, la semaine retombe sur `buildEmptyConditions` (marquée `degraded`), et le job upsertait quand même un score calculé sur les seuls termes qui n'ont pas besoin de la mer, valable **26 h**, puis comptait le spot en `succeeded`.

### ★ Correction : le symptôme est bien pire que ce que ce RECAP décrivait d'abord

La première version de cette section affirmait que le job écrivait `current_score: 0` / `current_quality: 'faible'`. **C'était faux, et la revue croisée l'a établi en interrogeant la base.** Distribution réelle des 208 lignes du run du 19/08 :

| `day_score` | `current_quality` | Spots |
|---|---|---|
| **exactement 64** | **`bonne`** | **81** |
| 74 à 94 | `tres_bonne` etc. | 127 |

Et **zéro ligne `'faible'` dans toute la table**. Les 81 lignes à 64 portent toutes exactement `current_score = 64`, une seule valeur distincte. Un score identique en Méditerranée et sur l'estran charentais est physiquement impossible avec de la marée réelle : c'est la signature du chemin dégradé (`scoreTide` → `NO_DATA_SCORE 0.35`, vent → `UNKNOWN_SCORE 0.7`, il ne reste que le solunaire).

**Ce qui rend le défaut beaucoup plus grave** : la valeur fabriquée n'est pas un 0 qui saute aux yeux, c'est un **64/100 « bonne »** parfaitement crédible. **81 spots sur 208, soit 39 % de la carte**, annonçaient une bonne journée de pêche sur des données absentes, sans que rien ne cloche à l'œil ni dans les logs.

Le correctif est donc plus justifié que l'argumentation ne le disait — mais l'argumentation citait une preuve qui n'existait pas, dans un sprint intitulé « lire avant d'écrire ». La leçon vaut d'être écrite.

Requête de détection à conserver et à rejouer après chaque run :

```sql
select day_score, count(*) from spot_scores
where computed_at >= '<date du run>' group by 1 having count(*) > 20;
```

Une valeur unique partagée par des dizaines de spots est le signe d'un run dégradé, quel que soit le chiffre.

### Ce qui a été corrigé

1. **`lib/scoring/spot-scores-job.ts` — on n'écrase plus un score valide par un score fabriqué.** Si la semaine est `degraded`, le job **s'abstient** : le score de la veille vit jusqu'à son `valid_until`, et à défaut le marqueur reste neutre. « Je ne sais pas » est une information honnête, « faible » est une information fausse. Nouveau compteur `degraded` dans `SpotScoresJobResult`, distinct de `succeeded` et de `failed`, plus un `console.error` quand plus d'un spot sur dix est sans données.
2. **`lib/conditions/spot-forecast.ts` — jitter sur le second essai.** Le cron lance 10 spots en parallèle × 2 appels = **20 requêtes simultanées**. Avec un délai fixe de 400 ms, les 20 qui venaient de prendre un 429 repartaient **exactement ensemble** et se recollisionnaient. Le délai devient `400 + random() * 600` ms. Coût nul pour un appel isolé : une page qui rend n'en fait qu'un.
3. **4 tests** dans `lib/scoring/__tests__/spot-scores-job-degraded.test.ts` : n'upserte rien quand c'est dégradé, upserte normalement sinon, **un seul jour dégradé suffit à s'abstenir** (la semaine alimente `next_window_*`), et une vraie exception reste comptée en `failed` et non en `degraded`.

### Ce qui n'a **pas** été touché, et pourquoi

- **`BATCH_SIZE` reste à 10.** Le run mesuré prend **49 669 ms sur un budget `maxDuration = 60`**, soit 17 % de marge. Passer à 5 double le nombre de lots et peut faire dépasser le budget, ce qui transformerait une dégradation silencieuse en vrai 500 sur le cron. Le comble, pour un bloc qui vise à supprimer des 500.

  ⚠️ **Mais la revue croisée a retourné cet argument contre le sprint lui-même, et elle a raison.** Ce raisonnement sur la marge doit s'appliquer à MES changements aussi :
  1. **Le jitter** fait passer le pire cas d'un réessai de 400 à 1 000 ms. Les lots sont séquentiels et chacun coûte le **max** de ses 20 appels concurrents : environ **+300 à +545 ms par lot touché**, soit **+6 à +11 s** si tous les lots réessaient comme le 19/08.
  2. **Le Bloc D ajoute 4 spots au cron** : `get_spots_for_scoring()` renvoie désormais **212** contre 208, soit 22 lots au lieu de 21, environ **+2,4 s**.

  Total plausible : 49,7 + 8 + 2,4 ≈ **60 s, pile sur la borne**. L'effet recherché est l'inverse (moins de collisions, donc moins de réessais, donc plus court), mais **il n'est ni mesuré ni testé**. C'est le point à surveiller au premier run du 20/08.
- **`maxDuration` reste à 60.** Le commentaire de `app/api/crons/compute-spot-scores/route.ts:11` le justifie par « Borne du plan Hobby ». **Ce commentaire est probablement périmé** : le projet a 4 crons quotidiens à horaires distincts, ce que le plan Hobby n'autorise pas (2 crons max). Si le projet est sur Pro, `maxDuration` peut monter à 300 s et la contrainte ci-dessus disparaît. **À vérifier au dashboard avant de toucher au parallélisme** : c'est la seule chose qui change la solution.
- `weather_cache` non touchée, `dynamic = 'force-static'` non posé, cron non désactivé. Les trois garde-fous du brief.

### Critères d'acceptation

| Critère | Verdict | Preuve |
|---|---|---|
| Répartition des 500 par route et par heure, datée | ✅ | tableaux ci-dessus, relevé du 19/08 16:30 UTC |
| Cause dominante nommée avec preuve | ✅ | log `static to dynamic` cité, corrélation à 53 s du déploiement |
| Nouveau relevé 24 h : 500 sous 1 % | ✅ | **0,00 %** (0 × 5xx sur 12 310 requêtes) |
| `pnpm test` vert, pas de régression `weather_cache` ni `spot-pages-are-static` | ✅ | **1692 / 1692** |

### Limite honnête du relevé

La rétention des logs runtime Vercel a expiré pour la fenêtre de l'incident : **la répartition horaire vient de la table d'erreurs agrégée (7 jours), pas des réponses HTTP elles-mêmes.** On compte donc des *événements d'erreur* (768) et non des *réponses 500* (570) : fenêtres et unités différentes, même ordre de grandeur, et je ne prétends pas que ce sont les mêmes nombres.

⚠️ **Sentry et Supabase MCP n'étaient pas authentifiés** pendant l'analyse : aucun compteur Sentry n'est cité ici. À noter, l'issue que le commit `1479200` associe à ce défaut est **`JAVASCRIPT-NEXTJS-1P`**, pas les quatre nommées par le brief (`1S`/`1R`/`1W`/`1V`), et **aucun 503 Open-Meteo n'apparaît** dans les 7 jours de la table Vercel, uniquement des 429.

---

## Bloc D — Les 9 fiches curées dépubliées : **4 republiées, 5 en attente**

### Le constat qui change la lecture de l'incident

Reverse-geocoding Nominatim sur les 9 coordonnées en base : **4 des 9 tenaient déjà la règle 13** (écart au toponyme sous 1 km). Elles ont été dépubliées par l'heuristique « 2 décimales », pas parce qu'elles étaient fausses.

| slug | où tombait la coordonnée | règle 13 |
|---|---|---|
| `plage-de-penhors` | Kerguernou Bihan, **Plogastel-Saint-Germain** (commune intérieure) | ❌ 7,3 km |
| `le-diben-brest` | Île de l'Aber, **Crozon** — en mer, baie de Douarnenez | ❌ 71,3 km |
| `anse-de-terenez` | Trénaouret, **Beuzec-Cap-Sizun** — dans les terres | ❌ 80,9 km |
| `quiberon-cote-sauvage` | Kernavest, **Saint-Julien** — côté baie, **mauvais versant** | ❌ 2,1 km |
| `cap-sizun` | D7, Belle Vue, Cléden-Cap-Sizun — sur une départementale | ❌ 1,14 km |
| `pointe-de-pen-hir` | Route de Pen-Hir, Camaret-sur-Mer | ✅ 464 m |
| `ile-d-ouessant-lampaul` | Lampaul, Ouessant | ✅ 594 m |
| `belle-ile-pointe-des-poulains` | Sauzon | ✅ 210 m |
| `ile-de-sein-cale-nord` | Rue du Nifran, Île-de-Sein | ✅ 140 m |

### Les 4 republiées

`UPDATE` un par un, avec la clause `and slug=…` obligatoire (décision 15 du playbook). Floutage recalculé par le trigger, vérifié après chaque écriture.

| slug | lat / lng | source | flou mesuré |
|---|---|---|---|
| `plage-de-penhors` | 47.940033 / -4.403622 | 4 objets OSM concordants à 307 m près : cale `node/7956454034`, village `node/279124398`, chapelle `way/262769337`, plage `way/1432324576` | 650 m |
| `ile-de-sein-cale-nord` | 48.039152 / -4.848609 | OSM `node/5933305905` « Cale du Guernic » (nom breton sourcé Ofis Publik ar Brezhoneg) + Inventaire du Patrimoine `IA29131188` | 635 m |
| `ile-d-ouessant-lampaul` | 48.454731 / -5.096257 | OSM `node/2088429687` « Port de Lampaul » + Inventaire du Patrimoine (quai et cale, 1860-1863) | 650 m |
| `belle-ile-pointe-des-poulains` | 47.388278 / -3.251146 | OSM `node/1363003805` « Pointe des Poulains / Beg ar Polen » + peche.com | 768 m |

### Les 5 laissées en `pending`, et pourquoi

**Deux attendent une décision de John :**

- **`le-diben-brest`** — la position `48.713789 / -3.830944` est solide et sourcée (OSM `node/14040007401` « Pointe du Diben », Quai André Déan ; recoupée à 299 m par GuideVoyageur). ★ **Mais le nom est faux** : Le Diben est un port de **Plougasnou**, en baie de Morlaix, à 71 km de Brest. Son nom officiel est « Port de Primel - Le Diben ». Renommer change le `slug`, donc l'URL. La fiche est encore `pending`, c'est donc le bon moment pour le faire, mais **c'est un arbitrage, pas une correction silencieuse.**
- **`pointe-de-pen-hir`** — coordonnée bonne (464 m, critère déjà tenu). Mais **aucune source de pêche ne nomme Pen-Hir comme poste du bord**, et le nœud OSM est au sommet d'un éperon de grès d'environ 70 m. Le site est référencé en escalade et en GR34. Alternative honnête à Camaret : le Veryac'h (960 m au nord-est) ou le Grand Gouin, que MieuxPecher cite explicitement.

**Trois restent en attente parce que republier reviendrait à renommer :**

- **`cap-sizun`** — c'est une **zone de 20 km**. Meilleur point identifié : la cale du port-abri de Brézellec (48.070011 / -4.663085), parking gratuit à 120 m. Mais l'écart est de **1,14 km, juste au-dessus du seuil**. ⚠️ La description « site remarquable pour le bar » vient de `lechasseursousmarin.com`, un site de **chasse sous-marine** : ce n'est pas une preuve de poste de canne du bord.
- **`quiberon-cote-sauvage`** — **zone de 8 km**, et la coordonnée actuelle est sur le **mauvais versant** de la presqu'île. Meilleur point : Beg er Goalennec (47.483934 / -3.145250), parking « Le Vivier » à 161 m, décrit par Peskanim en lancer bar/dorade/vieille. Écart 2,12 km. Les Rochers de Port Bara ont été **écartés volontairement** : Peskanim les décrit en pêche à pied, hors périmètre v1.
- **`anse-de-terenez`** — la coordonnée `48.676134 / -3.851259` est pourtant bien sourcée (Wikipédia et OSM concordent à 35 m, et l'ambiguïté avec le Térénez de l'Aulne a été levée). Ce qui bloque, c'est **la fiche** : écrite pour un point à 81 km, aucune source de pêche ne nomme Térénez comme spot, et le fond de l'anse est en concessions ostréicoles.

### ⚠️ Le risque résiduel que le brief n'avait pas anticipé

Sur les 5 fiches vraiment fausses, **corriger la coordonnée ne corrige pas la fiche**. Une `description` et des `access_notes` écrites pour un point situé à 71 ou 81 km n'ont aucune raison d'être justes. Le texte de `anse-de-terenez`, `le-diben-brest`, `cap-sizun` et `quiberon-cote-sauvage` **est à relire**, pas seulement leur `geom`.

`plage-de-penhors` a été republiée malgré son écart de 7,3 km : son nom et sa commune sont exacts, seule la coordonnée était fausse. Sa description mérite néanmoins une relecture.

### Contrôle Open-Meteo Marine

Fait sur les 9 points proposés. **Les 9 renvoient 24/24 heures de houle et de marée**, donc tous en mer.

★ **Ce contrôle n'a donc rien discriminé ici, et il faut le dire** : il valide qu'un point est assez près de la mer pour tomber dans une maille marine du modèle, pas qu'il est un poste de pêche. Le critère qui a réellement trié, c'est l'écart au toponyme et la question du renommage.

### Critères d'acceptation

| Critère | Verdict | Preuve |
|---|---|---|
| Le compte de `pending` a diminué, ligne par ligne expliquée | ✅ | **9 → 5**, tableaux ci-dessus |
| Les 4 republiées apparaissent dans `/sitemap.xml` | ✅ | **vérifié en direct sur la prod**, sans déploiement (voir ci-dessous) |
| Penhors et Le Diben traités explicitement | ✅ | Penhors republiée à une coordonnée sourcée ; Le Diben laissée de côté, motif nommé |
| Aucune fiche `source='imported'` touchée | ✅ | les 4 `UPDATE` portent `and source='curated'` |
| `geom_public`, `visibility`, `source`, `verified` non touchés | ✅ | seuls `geom`, `moderation_status` et `updated_at` sont dans le `SET` ; `geom_public` recalculée par le trigger |
| Aucune migration | ✅ | ce bloc n'écrit que des données |

### ★ Le Bloc D est DÉJÀ EN LIGNE, sans déploiement

Le sitemap et les fiches lisent la base en direct : les quatre pages sont revenues à l'instant où l'`UPDATE` est passé. Vérifié sur la **production**, depuis la machine de John (le WAF bloque les IP datacenter, cf S88 Bloc 6) :

```text
curl https://www.carnet-de-peche.com/sitemap.xml   → HTTP 200, 1158 URLs
```

**1 154 → 1 158 URLs, soit exactement +4.** Le compte de 1 154 est celui relevé au sprint 88 pendant le travail IndexNow.

| slug | dans le sitemap | page |
|---|---|---|
| `plage-de-penhors` | ✅ présent | **HTTP 200** |
| `ile-de-sein-cale-nord` | ✅ présent | **HTTP 200** |
| `ile-d-ouessant-lampaul` | ✅ présent | — |
| `belle-ile-pointe-des-poulains` | ✅ présent | — |
| `le-diben-brest` | ✅ **absent**, comme voulu | **HTTP 404** |
| `pointe-de-pen-hir` · `anse-de-terenez` · `cap-sizun` · `quiberon-cote-sauvage` | ✅ **absents**, comme voulu | — |

Le test négatif compte autant que le positif : les cinq fiches laissées en `pending` ne fuient ni au sitemap ni en page.

**Conséquence pratique** : ces 4 pages du catalogue le plus qualitatif du site sont sorties de 13 jours d'absence **maintenant**, pas au prochain merge.

⚠️ **Nuance apportée par la revue croisée, et elle compte.** « En ligne à l'instant » est vrai pour le **sitemap** (lecture DB directe) mais pas pour les **fiches** : la revue a mesuré un **404 sur `/spots/belle-ile-pointe-des-poulains`** environ 35 min après la republication, puis un 200 à la requête suivante (`X-Nextjs-Prerender: 1`, `Age: 16`). C'est le 404 ISR figé qui se régénère à la première visite.

Autrement dit, un crawler qui suit le sitemap trop tôt peut encaisser un 404 — exactement le gaspillage de crawl que le Bloc C cherche à supprimer. **`pnpm indexnow` sur les 4 URL n'est donc pas un bonus, c'est nécessaire**, et il faut le faire après avoir visité chaque page une fois.

### Correction portée ailleurs

`docs/contenu/curation-spots/INCIDENT-2026-08-06-coordonnees.md` contenait une **erreur** : la « réalité » de Penhors y était donnée à `~47.976 / -4.374`, soit **4,57 km à côté** de ce que disent quatre objets OSM concordants. Corrigée en `47.940033 / -4.403622`.

---

## ⚠️ Une fausse alerte que j'ai levée moi-même, et qu'il ne faut pas rejouer

En vérifiant le floutage après la première republication, j'ai mesuré `ST_Distance(geom, geom_public)` = **152 m**, puis **202 m de moyenne et 0 m de minimum sur les 4 605 spots**, très en dessous des 500-900 m documentés en `CLAUDE.md` §8. J'ai cru à une régression de l'invariant GPS et je l'ai annoncé comme telle.

**C'était ma mesure qui était fausse.** `geom_public` n'est pas un point mais un **polygone** :

```sql
ST_Buffer(ST_Project(geom, 500 + random() * 400, random() * 2 * pi()), 500)
```

C'est-à-dire un disque de 500 m de rayon dont le centre est à 500-900 m du point vrai. `ST_Distance` d'un point à un polygone rend la distance au **bord**, soit `centre − 500`, donc mathématiquement 0 à 400 m. C'est exactement ce que j'avais mesuré.

La mesure correcte passe par le **centroïde** :

```sql
ST_Distance(geom::geography, ST_Centroid(geom_public::geometry)::geography)
```

Résultat sur les 4 605 spots : **min 500 m, moyenne 701 m, max 900 m, zéro sous 500 m, zéro non-polygone**, sur les trois sources. **L'invariant est intact.**

★ À retenir : **ne jamais mesurer le floutage des spots avec `ST_Distance` nue.** Pour les *catches* c'est différent — `blur_catch_geom` produit bien un **point** (jitter ±0,009°) et `ST_Distance` y est la bonne mesure. Les deux tables n'ont pas le même type de `geom_public`, et confondre les deux fabrique une alerte de sécurité qui n'existe pas.

La revue croisée a refait les deux mesures indépendamment et confirme : `ST_Distance` nue donne min 0,2 m / moy 201,8 m ; par le centroïde, **min 500,1 / moy 700,5 / max 899,9 m, zéro hors bornes, zéro non-polygone**, identique sur les trois sources. Elle a aussi vérifié le HTML servi de `/spots/plage-de-penhors` : la coordonnée exacte **n'y figure pas**, celle qui est servie est à environ 667 m.

---

## Workstream VERIF — revue croisée indépendante

Passe faite par un agent qui n'avait écrit aucun bloc. **Verdict : mergeable.** Elle a trouvé **trois erreurs factuelles dans ce RECAP**, toutes corrigées ci-dessus, et deux nuances de fond intégrées.

| Vérification | Résultat |
|---|---|
| `pnpm typecheck` | ✅ exit 0 |
| `pnpm lint` | ✅ 0 warning |
| `pnpm test` | ✅ **1692 / 1692**, 133 fichiers |
| `pnpm check:prerender` | ✅ 83 routes, 5 témoins |
| `marketing-layout-is-static` · `spot-pages-are-static` | ✅ 6/6 et 10/10 |
| Migrations · secrets · `<title>` sous mesure | ✅ aucun des trois touché |
| `lint-copy-dashes` | ✅ 16 occurrences, **toutes préexistantes** |

⚠️ Première passe de tests : 3 fichiers en timeout 5 000 ms (`security-headers`, `stripe/events`, `anonymous-cta-goes-to-register`), **tous verts en isolation**. C'est le flake de contention déjà documenté au sprint 88, aggravé par la charge, pas une régression.

### Les trois erreurs qu'elle a corrigées

1. **Le symptôme du Bloc C était faux** : pas `0 / 'faible'` mais **`64 / 'bonne'` sur 81 spots**. Le défaut est plus grave que décrit, et l'argumentation citait une preuve inexistante. Corrigé dans ce RECAP **et dans le commentaire du code**.
2. **Quatre interventions sur les titles espèces, pas trois** : le sprint 78 (`85b7822`, 15/08) porte 8 des 11 overrides, dont `bar`, `sar`, `seiche`. Corrigé ici et dans `especes-ctr.md`.
3. **Le budget du cron est mangé par le sprint lui-même** (jitter + 4 spots). Intégré ci-dessus.

### Ce qu'elle a cherché sans rien trouver

Pas de secret, pas de migration cachée, **pas de fuite GPS ni en base ni dans le HTML servi**, pas de contournement de `spots_for_viewer` / `catches_for_viewer`, pas de RLS touchée, aucun `<title>` sous fenêtre de mesure modifié, aucune ligne collatérale écrite en base (`updated_at >= 18/08` → exactement 4 lignes, les 4 attendues), `verified` / `visibility` / `source` intacts sur les 9 fiches.

### Deux remarques laissées telles quelles

- **`.some()` : le vrai déclencheur n'est pas celui que le test décrit.** Dans `_fetchSpotForecastWeek`, les 7 jours partagent la même valeur de `degraded` (elle vient d'un unique objet `marine` hebdomadaire) ; une semaine **mixte** ne peut naître que du padding quand l'API renvoie moins de 7 jours. Le test « un seul jour dégradé suffit » décrit donc un scénario synthétique, et le vrai comportement est « si Open-Meteo renvoie une semaine tronquée, on s'abstient » — ce qui frapperait les 212 spots d'un coup. Le choix conservateur se défend, mais `.every()` aurait le mérite de ne pas transformer un jour manquant en blackout de flotte. À arbitrer si ça se produit.
- **« Trop de prudence tue la fraîcheur », chiffré** : `VALIDITY_MS = 26 h` et le cron est quotidien à 05:00 UTC. Un spot sauté garde son score jusqu'à 07:00, puis reste **gris 22 h**. Au taux du 19/08 (81/208), c'est **39 % de la carte décolorée**. Gris honnête vaut mieux que 64 fabriqué, mais la carte peut visiblement pâlir dès le prochain run. Garde-fous en place : le `console.error` au-delà de 10 % se déclenchera, et les trois consommateurs filtrent déjà `valid_until > now()` — un score périmé n'est jamais servi.

---

## Reste manuel John

### À faire avant tout

1. **Merger et déployer.** Puis, au premier run du cron (**20/08 05:00 UTC**), lire la ligne `Spot scores computed: … (X ok, Y sans données, Z échec) in Nms`. Deux seuils à surveiller :
   - si `N` approche **60 000 ms**, le budget est atteint et il faut monter `maxDuration` ;
   - si `Y` reste au-dessus de **20**, le jitter n'a pas suffi et **39 % de la carte pâlira 22 h**.
2. **Trancher `maxDuration`.** Les 4 crons quotidiens de `vercel.json` prouvent que le projet n'est **pas** sur Hobby (2 crons max) : le commentaire de `app/api/crons/compute-spot-scores/route.ts:11` est périmé et 300 s sont disponibles. C'est la vraie solution, elle est gratuite, et elle rend le débat sur `BATCH_SIZE` sans objet.
3. **Réchauffer les 4 URL republiées** : visiter chaque fiche une fois (l'ISR sert un 404 figé jusqu'à la première requête, mesuré), puis `pnpm indexnow -- --url …` sur les quatre.

### Les relevés sans lesquels le sprint ne peut pas conclure

4. **Bloc A, les 5 actions** : sitemap resoumis, 3 compteurs d'indexation, 2 chiffres d'exploration, exclusion des auto-référents PostHog, insight « canal IA ». Les clics exacts sont plus haut.
5. **Bloc B, l'export `/especes`** — **le 22/08, pas avant** (la GSC a 2 à 3 jours de retard). Tableau prêt dans `docs/sprint-89/especes-ctr.md`.

### Deux arbitrages produit

6. **`le-diben-brest`** : renommer maintenant (la fiche est `pending`, le slug est encore libre) ou republier avec un nom faux ?
7. **`pointe-de-pen-hir`** : republier en assumant falaise et `difficulty=5`, ou basculer sur le Veryac'h / le Grand Gouin ?

### Divers

8. Relire les descriptions de `anse-de-terenez`, `le-diben-brest`, `cap-sizun`, `quiberon-cote-sauvage` (écrites pour des points à 71 ou 81 km) et celle de `plage-de-penhors`.
9. Supprimer `_to_delete/` (deux verrous git vides du 17/08, non suivis, sans rapport avec ce sprint).
