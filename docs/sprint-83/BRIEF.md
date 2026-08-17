# Sprint 83 — Brief d'exécution
## Sortir de la page 2

> Rédigé le 2026-08-16. Durée : 1,5 semaine (cible 17/08 → 27/08).
> Contexte : `docs/audits/DIAGNOSTIC-SEO-2026-08-16.md` (il n'y a pas eu d'incident SEO :
> le 12-14/08 est une stabilisation après bouffée de découverte) et
> `docs/roadmaps/PLAN-CROISSANCE-SEO-2026-08-16.md` (les 10 leviers chiffrés).
> Sprint 82 (bugs carte) en cours sur `sprint-82` : **ne pas toucher à la carte**.

**Le sprint est une EXPÉRIENCE, pas une livraison.** Chaque bloc porte une hypothèse
falsifiable et son protocole de mesure. Un bloc dont on ne saura pas dire s'il a
marché n'a pas sa place ici.

**Préalable avant de démarrer** (manuel John) :
- Merger `sprint-82` sur `main` et déployer, pour ne pas mélanger deux sprints dans une même fenêtre de mesure.
- **Décider du passage Vercel Pro** (cf « Reste manuel John »). Ce n'est pas bloquant pour coder, ça l'est pour interpréter les résultats.

---

## 🚀 Ligne de lancement (à copier-coller par John)

> ultracode — effort xhigh. Exécute `docs/sprint-83/BRIEF.md`. Lance les workstreams
> A/B/C/F en parallèle dès maintenant, puis D et E, respecte les dépendances du
> tableau, et termine par le workstream VERIF avant de me rendre la main.
> ⚠️ Le Bloc 0 (gel de la base de mesure) doit être TERMINÉ avant tout déploiement,
> sinon le sprint devient immesurable. Ne push pas.

---

## 🧠 Connecteurs & sous-agents (usage systématique — cf `CLAUDE.md` §20)

| Quand | Sous-agent → connecteur | Pourquoi |
|---|---|---|
| Avant de toucher `generateMetadata`, l'App Router, le sitemap | **docs-researcher** → Context7 | Next 15.5 : signatures `Metadata`, `searchParams` async, `generateStaticParams`. Ne pas coder de mémoire. |
| Bloc 2 et Bloc 3 (lecture spots, communes, départements) | **supabase-guard** → Supabase | Lire le schéma live AVANT : colonnes `spots.city` / `commune` existent-elles ? Sinon le Bloc 3 change de forme. `get_advisors` en fin de sprint. |
| Blocs 1, 2, 3 : rendu réel des titres et des liens | **qa-chrome** → Claude in Chrome + Playwright | Vérifier le `<title>` SERVI (SSR brut), pas celui supposé. Desktop + mobile 390. |
| Après déploiement | **deploy-watch** → Vercel + Sentry | Temps de réponse et erreurs runtime : le Bloc 4 ajoute des routes. |
| Clôture | **`/verif-sprint`** | Tests + build + lint + types + revue croisée + passe anti-régression. |

---

## Objectif du sprint en une phrase

Faire passer les fiches spots de la position 8-11 à la position 5-7 sur les requêtes de
nom de lieu, et savoir **lequel** des changements y a contribué.

---

## Le fait qui justifie le sprint

| Requête | Position | Impressions (28 j) | Clics | CTR |
|---|---|---|---|---|
| pointe du grand minou | **5,76** | 59 | **7** | **11,9 %** |
| pointe de trefeuntec | **10,30** | 97 | **0** | **0 %** |

Même type de page, même intention, écart de CTR infini pour 4,5 places. Sur
l'échantillon nommé par GSC (~8 % du trafic), ~505 impressions sont bloquées en
position 8-11 pour 2 clics.

---

## Workstreams & dépendances

| WS | Bloc | Durée | Dépend de | Parallélisable jour 1 |
|----|------|-------|-----------|----------------------|
| A | Bloc 0 — gel de la mesure + seuil | 0,5 j | — | ✅ |
| B | Bloc 1 — marée dans le titre (A/B) | 1,5 j | — | ✅ |
| C | Bloc 2 — maillage interne | 1 j | — | ✅ |
| F | Bloc 5 — titre `/especes/mulet` | 0,5 j | — | ✅ |
| D | Bloc 3 — facette « pêche à &lt;ville&gt; » | 2-3 j | supabase-guard (schéma commune) | ✅ après lecture schéma |
| E | Bloc 4 — `/peche` méditerranéen | 2 j | — | ✅ |
| VERIF | revue finale | 0,5 j | tous | ❌ (toujours en dernier) |

> ⚠️ **Bloc 0 bloque le DÉPLOIEMENT, pas le code.** On peut coder B/C/D/E/F en
> parallèle, mais rien ne part en prod avant que la base de mesure soit gelée.

---

## Bloc 0 — Geler la base de mesure et désamorcer le mauvais seuil

Sans photo d'avant, ce sprint ne prouvera rien. Et il y a une règle en place qui va se
déclencher à tort cette semaine : il faut la corriger avant qu'elle ne fasse des dégâts.

> **Connecteurs** : Supermetrics (GSC, compte `sc-domain:carnet-de-peche.com`). Aucun code, aucun déploiement dans ce bloc.

### Tâches

1. Créer `docs/sprint-83/BASELINE.md` avec, **fenêtre figée 18/07 → 14/08** (ne PAS
   inclure le 15/08 et après : données non consolidées) :
   - impressions / clics / CTR / position par `pathlevel1` ;
   - les **13 requêtes de nom de lieu** du plan de croissance, avec position et clics ;
   - le détail **par page** (`pagepath`) des 40 fiches `/spots/*` les plus vues ;
   - la répartition par bloc de positions (1-3, 4-10, 11-20).
2. Corriger `docs/sprint-78/METRIQUES.md` §1 : remplacer la règle
   *« si le CTR de `/spots` passe sous 6 %, on dépublie le lot S78-MED-01 »* par une
   **comparaison de cohortes** : CTR des fiches `generation_batch='S78-MED-01'` contre
   celui des 416 fiches curées (`generation_batch is null`), sur la même fenêtre, et
   **pas avant le 03/09** (les 191 fiches mettent ~19 jours à être découvertes au débit
   constaté de ~10 URLs/jour).
   Motif à écrire dans le fichier : le CTR `/spots` était déjà à **5,4 % le 13/08 et
   5,0 % le 14/08**, avant que le lot ne parte le 15/08 à 10 h 06. Le seuil agrégé
   mesure la dilution par des pages neuves, pas leur qualité.
3. Marquer les relectures J+3 (18/08) et J+7 (22/08) comme **sans objet** dans ce
   fichier, en renvoyant vers le protocole de cohortes.

### Critères d'acceptation

- `docs/sprint-83/BASELINE.md` existe, chaque tableau porte la fenêtre `18/07 → 14/08` et la mention « données figées (`final_data=true`) ».
- `docs/sprint-78/METRIQUES.md` ne contient plus de seuil de dépublication basé sur le CTR agrégé de `/spots`.
- **Aucune fiche n'a été dépubliée** : `select count(*) from spots where generation_batch='S78-MED-01' and moderation_status='approved'` renvoie toujours 191.

### Garde-fous

- Ne rien déployer depuis ce bloc.
- Ne pas toucher aux fiches du lot 1.

---

## Bloc 1 — La marée dans le titre, en A/B réel ★★★

**Hypothèse** : les gens cherchent la marée **par nom de spot** (« maree pen lan » : 29
impressions position 10,2, zéro clic ; « marée rostiviec » : 25 impressions position
8,8, zéro clic). Le mot « marée » n'existe aujourd'hui que dans la meta description,
jamais dans le `<title>` (`app/(marketing)/spots/[slug]/page.tsx:236`). Le mettre dans
le titre doit faire monter le CTR sur cette intention.

C'est une hypothèse, donc **on la teste, on ne la déploie pas en aveugle**.

> **Connecteurs** : **docs-researcher** (Context7) pour `generateMetadata` en Next 15.5. **qa-chrome** pour lire le `<title>` réellement servi en SSR sur 4 fiches, 2 par variante.

### Tâches

1. Dans `lib/seo/spot-title.ts`, ajouter une **variante B** au gabarit. Actuel :
   `Pêche à {commune} ({dept}) : {espèces}`. Variante B, pour les seuls départements
   à marée calibrée : `{commune} ({dept}) : marée du jour et spot de pêche`.
   Respecter `SPOT_TITLE_MAX = 60`, la dégradation existante, et `CLAUDE.md` §6
   (aucun tiret cadratin dans une chaîne visible).
2. **Périmètre du test** : uniquement les 15 départements présents dans
   `TIDE_REFERENCE_PORTS` de `lib/conditions/tide-calibration.ts` (14, 50, 76, 59, 62,
   35, 22, 29, 56, 44, 85, 17, 33, 40, 64). La Méditerranée en est exclue : marnage
   négligeable, la promesse serait creuse.
3. **Répartition 50/50 déterministe** par hash stable du `slug` (pas d'aléatoire, pas
   de cookie, pas de PostHog : le titre doit être identique à chaque rendu pour un
   même spot, sinon Google voit un site instable). Fonction pure, testée.
4. Consigner dans `docs/sprint-83/AB-MAREE.md` la liste des slugs de chaque cohorte,
   figée au moment du déploiement.

### Critères d'acceptation

- `pnpm test` : la variante B tient en ≤ 60 caractères sur **tous** les spots réels des 15 départements (test sur la donnée, comme `lib/seo/spot-title.ts` le fait déjà pour l'existant).
- Le hash est stable : deux appels sur le même slug donnent la même cohorte ; la répartition est à 50 % ± 5 points.
- Aucun spot méditerranéen ne reçoit la variante B.
- **qa-chrome** : sur 2 fiches cohorte A et 2 fiches cohorte B, le `<title>` du HTML SSR brut correspond à la variante attendue.
- Régression interdite : la meta description, l'OG et la Twitter card sont **inchangées** (sprint 76 Bloc 5).

### Garde-fous

- Ne pas toucher au `<h1>` ni au contenu visible : on teste le titre SERP, rien d'autre.
- ⚠️ Ne pas généraliser la variante B avant la mesure à J+21, même si elle « semble mieux ».

---

## Bloc 2 — Densifier le maillage interne ★★★

**Hypothèse** : le nombre et la qualité des liens internes vers une fiche décident de
sa position sur une requête de nom de lieu. Aujourd'hui la fiche affiche **6 liens
sortants** (`NEARBY_MAX = 6`, `app/(marketing)/spots/[slug]/page.tsx:210`), dont
seulement 3 viennent de `nearby_spots` pour un visiteur anonyme — le reste est comblé
par les spots du même département (`deptSpots`, ligne ~490).

★ **Correction importante par rapport à l'analyse initiale** : il n'est **pas
nécessaire de toucher à la RPC `nearby_spots`**. Le besoin SEO est un *lien*, pas une
*distance*. Le repli départemental fournit déjà slug + nom sans distance. Donc :
**aucune migration, aucune surface de sécurité touchée, aucun impact freemium.**

> **Connecteurs** : **supabase-guard** en LECTURE pour confirmer que `deptSpots` peut remonter ≥ 12 spots approuvés sur les départements les mieux fournis. Ne PAS modifier `nearby_spots` (migrations 029/039 : le plafond 3 est un gating de tier, et 039 est un correctif de fuite GPS par trilatération — on n'y touche pas dans un sprint SEO).

### Tâches

1. Porter `NEARBY_MAX` de **6 à 12**, en laissant le repli départemental combler.
   Vérifier que le rendu mobile (390 px) reste lisible : passer en liste compacte
   au-delà de 6 entrées si nécessaire.
2. Ajouter un bloc de **liens remontants** en bas de fiche, dans le HTML SSR (pas
   derrière un `'use client'` ni un accordéon fermé) :
   - vers la landing département : `/spots?dept=<code>` ;
   - vers la fiche de l'espèce principale : `/especes/<slug>` ;
   - vers le guide de technique correspondant, si un guide existe dans `content/guides/`.
3. Ancres descriptives, jamais « en savoir plus » : « Tous les spots du Finistère »,
   « Pêcher le bar du bord ».

### Critères d'acceptation

- Une fiche d'un département bien fourni (29, 56) sert **≥ 12 liens internes** dans le HTML SSR, vérifiés par **qa-chrome** sur le HTML brut, pas après hydratation.
- Les liens remontants sont présents sur **100 %** des fiches ayant un département et au moins une espèce.
- Aucun lien mort : chaque `href` généré renvoie 200 (script de contrôle sur 30 fiches au hasard).
- Régressions interdites : `nearby_spots` **non modifiée** (`git diff` vide sur `supabase/migrations/`), floutage GPS intact, gating de tier intact, aucune coordonnée exposée dans le nouveau bloc.
- Le rendu mobile 390 px ne casse pas (capture avant/après).

### Garde-fous

- ⚠️ DEMANDER À JOHN AVANT : faut-il aussi relever le plafond anonyme de `nearby_spots` (3 → 10) ? Ce n'est **pas** une question de sécurité (039 calcule déjà `distance_m` sur le point flouté pour un anonyme) mais une question **produit** : « voir les spots proches » fait partie de la valeur payante. Le Bloc 2 atteint son objectif SEO sans y toucher.
- Ne pas toucher à `components/spots/NearbySpotsSection.tsx` au-delà de la mise en page.

---

## Bloc 3 — La facette « pêche à &lt;ville&gt; » ★★

**Hypothèse** : il manque un palier entre la fiche d'un spot et la landing d'un
département, alors que c'est l'échelle à laquelle les gens cherchent.

| Requête | Impressions | Position | Page servie aujourd'hui |
|---|---|---|---|
| peche gravelines | 45 | 10,8 | aucune |
| peche en mer gravelines | 22 | 8,6 | aucune |
| pêche à dieppe sur la jetée | 40 | 8,7 | aucune |

`app/(marketing)/spots/page.tsx:32` ne connaît que `dept` et `species`.

> **Connecteurs** : **supabase-guard** EN PREMIER. Ce bloc suppose une notion de commune sur `spots`. **Si aucune colonne commune/ville n'existe, s'arrêter et demander à John** : la dériver du nom du spot est une heuristique fragile qui produira des pages fausses, et une page fausse coûte plus cher que l'absence de page.

### Tâches

1. Lire le schéma live : `spots` porte-t-elle `city`, `commune`, ou seulement `name` + `department` ?
2. Selon le résultat, implémenter la variante tranchée par John (cf garde-fous).
3. **Seuil anti-contenu-mince : une page n'est générée que pour les communes ayant ≥ 3 spots `approved` et `public`.** Même logique que `hasProgrammatic` sur `/peche`.
4. Déclarer les pages générées dans `app/sitemap.ts`, à côté des facettes `?dept=` et `?species=`, avec un canonical propre.
5. Mailler : fiche spot → page ville (Bloc 2), page ville → landing département.

### Critères d'acceptation

- Une commune à ≥ 3 spots sert une page en 200 avec un `<title>` contenant « Pêche à &lt;commune&gt; », un `<h1>` unique et la liste des spots.
- Une commune à ≤ 2 spots ne génère **aucune** URL et n'apparaît pas dans le sitemap.
- `curl -s https://<preview>/sitemap.xml | grep -c ville` correspond exactement au nombre de communes au-dessus du seuil.
- Aucun doublon de `<title>` entre deux pages ville (test automatisé sur l'ensemble généré).
- Régression interdite : `/spots`, `?dept=` et `?species=` inchangées.

### Garde-fous

- ⚠️ DEMANDER À JOHN AVANT : route dédiée `/spots/ville/<slug>` (meilleure pour le SEO, canonical propre, coût de crawl d'une URL par commune) **ou** facette `?ville=` (cohérente avec l'existant, moins forte en classement) ? **Recommandation : route dédiée**, parce que l'intention « pêche à &lt;ville&gt; » mérite une page, pas un filtre.
- ⚠️ Si le schéma n'expose pas de commune fiable : **s'arrêter**, ne pas deviner à partir du nom du spot.

---

## Bloc 4 — `/peche` étendu aux espèces méditerranéennes ★★

**Hypothèse** : `/peche/<espèce>/<technique>[/<dépt>]` tient **5 à 7 % de CTR**, cinq
fois `/especes`. C'est le format qui marche, et il ne couvre que **6 espèces sur 26**
(`SPECIES_TECHNIQUES`, `lib/seo/programmatic.ts:211`) : bar, dorade-royale, lieu-jaune,
maquereau, sar, orphie — toutes atlantiques. Or l'inventaire est passé à **44,6 % de
Méditerranée** après le lot 1 du sprint 78.

> **Connecteurs** : **supabase-guard** pour compter, par espèce et par département, les spots `approved` qui la portent réellement. C'est cette requête qui décide quelles pages existent, pas une intuition.

### Tâches

1. Compter en base, par espèce méditerranéenne candidate (marbré, oblade, pageot,
   liche, seiche, rouget), le nombre de spots `approved` + `public` par département.
2. Ouvrir `SPECIES_TECHNIQUES` et `hasProgrammatic` **uniquement** pour les couples
   espèce × technique qui ont de la matière, avec le garde-fou existant
   (`speciesDepartments`) : **pas de page sans spots réels derrière**.
3. Vérifier que le contenu généré n'est pas un gabarit interchangeable : le sprint 78
   a déjà attrapé des tournures fabriquées (« se prête à au sar »). Reprendre les tests
   de lisibilité de `lib/spots/__tests__/fiche-generator.test.ts`.
4. Sitemap : les nouvelles pages sortent automatiquement via `getAllProgrammaticPages()`. Le vérifier.

### Critères d'acceptation

- `select count(*)` par espèce × département documenté dans `docs/sprint-83/RECAP.md` : chaque page créée s'appuie sur **≥ 3 spots réels**.
- Zéro page générée pour un couple sans inventaire (test unitaire).
- Aucune tournure fabriquée : les tests de lisibilité du sprint 78 passent sur les nouveaux gabarits.
- Aucun doublon de `<title>` avec une fiche `/especes/*` existante.
- Le nombre d'URLs du sitemap augmente exactement du nombre de pages créées.

### Garde-fous

- ⚠️ Le débit de découverte de Google est de **~10 URLs/jour**. Ne pas créer plus de **150 pages** dans ce bloc : au-delà, on remplit une file d'attente au lieu de gagner des impressions. Si le comptage en propose davantage, prendre les départements à plus fort inventaire d'abord et noter le reste en backlog.
- Ne pas toucher aux 6 espèces existantes.

---

## Bloc 5 — Le titre de `/especes/mulet`

`mulet` est la plus grosse page de `/especes` (1 510 impressions sur 27 jours). Son
`seoTitle` a été fixé au sprint 77 Bloc 9 sur le constat « requêtes dominées par
l'identification ». Les données du 16/08 disent l'inverse :

| Intention | Impressions | Clics | Positions |
|---|---|---|---|
| **maille / taille réglementaire** | **283** | **0** | 5,2 – 10,7 |
| identification (« mulet poisson ») | ~82 | 0 | 16 – 67 |
| pêche / technique | ~20 | 0 | 22 – 58 |

L'intention « maille » pèse 73 % des requêtes visibles et c'est la seule qui accroche
la page 1. Le titre servi, `Où pêcher le mulet du bord : spots et technique au pain`,
ne contient ni « maille » ni de chiffre.

> **Connecteurs** : aucun. Une ligne, plus les tests existants de `lib/especes/__tests__/seo.test.ts`.

### Tâches

1. Retirer la clé `seoTitle` de `lib/especes/content/mulet.ts` (ligne 18) pour retomber
   sur la formule générique de `buildSpeciesTitle`, qui mène par la maille et l'année.
2. Remplacer le commentaire des lignes 13-17 par le relevé du 16/08 ci-dessus, en
   datant la source : c'est ce commentaire qui a fondé la décision inverse, il doit
   porter la donnée qui l'annule.
3. **Vérifier le rendu** : `minSizeCm` vaut `{ 'manche-atlantique': 30, mediterranee: null }`
   (`mulet.ts:37`). Contrôler que `formatMailleShort` ne produit pas un « 30 cm » qui
   laisserait croire à une maille nationale.

### Critères d'acceptation

- Le `<title>` servi sur `/especes/mulet` contient « maille », un nombre et l'année, et tient en ≤ 60 caractères.
- Le titre ne prétend pas à une maille méditerranéenne : la Méditerranée n'en a pas pour le mulet.
- `pnpm test` vert sur `lib/especes/__tests__/seo.test.ts`.
- Aucune autre fiche espèce modifiée.

---

## 📏 Plan de mesure (c'est la raison d'être du sprint)

| Bloc | Hypothèse | Mesure | Témoin | Verdict |
|---|---|---|---|---|
| 1 | La marée dans le titre fait cliquer | CTR + position, cohorte B contre cohorte A, par page | **Cohorte A** (même départements, même intention) | **J+21** |
| 2 | Le maillage fait monter la position | Position moyenne des 13 requêtes de nom de lieu | Base gelée du Bloc 0 | **J+21** |
| 3 | Il manque le palier « ville » | Impressions et position des nouvelles URLs ville | Aucun (création) | **J+30** |
| 4 | `/peche` marche aussi en Méditerranée | CTR des nouvelles pages contre les 6 espèces existantes | Pages `/peche` atlantiques | **J+30** |
| 5 | Le titre doit porter l'intention maille | CTR de `/especes/mulet` | Sa propre base : 1 510 impressions / 20 clics | **J+21** |

### Ce qui rend ce sprint mesurable, et ses limites

- Le **Bloc 1 est un vrai A/B** : deux cohortes de spots comparables, mêmes
  départements, même période, seule la variable du titre change. C'est le seul bloc
  dont on pourra affirmer la causalité.
- Le **Bloc 2 ne peut PAS être testé en A/B** : un lien vers une page du groupe témoin
  la fait monter aussi. Il se mesure contre la base gelée, donc **en corrélation, pas
  en causalité**. À écrire noir sur blanc dans le RECAP.
- ⚠️ **Saisonnalité** : la fin août baisse mécaniquement sur un site de pêche du bord.
  Une position qui monte pendant que les impressions baissent reste un succès. Le
  repère est la **position**, pas le volume.
- ⚠️ Ne rien conclure avant **J+21**. Le débit de découverte est de ~10 URLs/jour.

---

## Workstream VERIF (obligatoire, agent indépendant)

1. Lancer `/verif-sprint` (`pnpm test` + `pnpm build` + `pnpm typecheck` + `pnpm lint` + revue croisée indépendante + passe anti-régression). Puis **deploy-watch** après déploiement.
2. Relire chaque critère d'acceptation et cocher ✅/❌ **avec preuve** (commande, URL, requête SQL).
3. **Passe sécurité, appuyée** : `git diff` sur `supabase/migrations/` doit être **vide** — ce sprint n'a aucune migration. Vérifier que `nearby_spots` est intacte, que le floutage GPS et le gating de tier n'ont pas bougé, et qu'aucune coordonnée n'apparaît dans les nouveaux blocs de liens ni dans les pages ville.
4. **Passe SEO anti-régression** : aucun `<title>` en doublon sur l'ensemble du site ; tous les canonicals corrects sur les nouvelles routes ; `robots.txt` inchangé ; le sitemap ne déclare que des URLs qui répondent 200 (le piège du 05/08).
5. **Passe copy** : tutoiement partout, aucun tiret cadratin dans une chaîne visible (`node scripts/lint-copy-dashes.mjs`), aucune promesse produit mensongère (une page ville ne promet pas des spots qu'elle n'a pas).
6. Livrer `docs/sprint-83/RECAP.md` : fait / comment tester / reste manuel John / **et les requêtes de mesure prêtes à rejouer à J+21**.

---

## Reste manuel John (post-sprint)

1. **Décider du passage Vercel Pro (~20 $/mois).** Temps de réponse moyen à 1 247 ms,
   pics à 2 754 ms, dépassement CPU sur le plan Hobby (7 h 34 pour 4 h incluses).
   Google réduit sa cadence d'exploration quand le serveur traîne : tant que ce n'est
   pas réglé, les Blocs 3 et 4 créent des pages que Google mettra des mois à voir.
   **C'est le levier le plus rentable du plan, et le seul que le code ne peut pas faire.**
2. Merger `sprint-83` → `main` et déployer, **après** le Bloc 0.
3. Resoumettre le sitemap dans Search Console après déploiement.
4. Noter la date exacte du déploiement dans `docs/sprint-83/RECAP.md` : toute la mesure en dépend.
5. Reprogrammer la relecture du lot 1 (protocole de cohortes) au **03/09**, pas au 18/08.

---

## Hors périmètre (backlog, cf `PLAN-CROISSANCE-SEO-2026-08-16.md`)

`/techniques` désindexé → 4 pages piliers · pages `maille <espèce> <année>` ·
guides locaux 6 → 15-20 · backlinks (César) · enrichissement des 191 fiches générées.

Ce ne sont pas des tests, ce sont des constructions : elles ne servent pas l'objectif
de ce sprint, qui est de savoir **ce qui fait bouger une position**.
