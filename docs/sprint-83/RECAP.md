# Sprint 83 — RECAP

> Exécuté le **2026-08-17**. Branche : `main`, **rien n'est poussé, rien n'est commité**.
> Brief : `docs/sprint-83/BRIEF.md`. Base de mesure : `docs/sprint-83/BASELINE.md`.
> Cohortes de l'A/B : `docs/sprint-83/AB-MAREE.md`.

**Le sprint était une expérience, pas une livraison.** Ce RECAP dit donc autant ce qui a
été construit que ce qu'on saura en mesurer, et ce qu'on ne saura pas.

---

## 0. Où on en est en une ligne

Quatre blocs sur cinq livrés (0, 1, 2, 4, 5), **le Bloc 3 est abandonné sur décision de
John** parce que la donnée qu'il suppose n'existe pas. **Zéro migration**, `git diff` sur
`supabase/migrations/` vide. 1 440 tests verts, build vert, types propres, lint propre.

| Bloc | État | Vérifiable à |
|---|---|---|
| 0 — gel de la mesure | ✅ livré (partiel assumé, cf §1) | immédiat |
| 1 — marée dans le titre (A/B) | ✅ livré | **J+21** |
| 2 — maillage interne | ✅ livré | **J+21** |
| 3 — facette « pêche à ville » | ❌ **abandonné**, décision John | — |
| 4 — `/peche` méditerranéen | ✅ livré, +118 pages | **J+30** |
| 5 — titre `/especes/mulet` | ✅ livré | **J+21** |

---

## 1. Bloc 0 — la base de mesure est gelée, avec un trou déclaré

`docs/sprint-83/BASELINE.md` fige la fenêtre **18/07 → 14/08**, données `final_data=true`.

**Ce qui est dedans** : les 13 requêtes de nom de lieu (le tableau de référence du Bloc 2),
la répartition par bloc de positions (1-3 / 4-10 / 11-20), le par-répertoire.

**Ce qui n'y est pas, et pourquoi** : le détail par page des 40 fiches `/spots/*`. Il n'y a
**aucun connecteur Supermetrics ni Search Console** accessible depuis Claude Code. La
section existe, vide, avec la requête exacte à jouer. **C'est un reste manuel John**, pas
un oubli. Le Bloc 2 se mesure sur les 13 requêtes, qui elles sont complètes : le sprint
reste mesurable sans ce tableau.

**La règle de dépublication est désamorcée.** `docs/sprint-78/METRIQUES.md` ne contient
plus de seuil actif « CTR `/spots` < 6 % → on dépublie le lot ». Elle est remplacée par une
**comparaison de cohortes** (`generation_batch='S78-MED-01'` contre `generation_batch is
null`, même fenêtre, par `pagepath`), **pas avant le 03/09**. Motif inscrit dans le
fichier : le CTR `/spots` était déjà à **5,4 % le 13/08 et 5,0 % le 14/08**, avant que le
lot ne parte le 15/08 à 10 h 06. Le seuil agrégé mesurait la dilution par des pages
neuves, pas leur qualité. Les relectures J+3 (18/08) et J+7 (22/08) sont barrées « sans
objet », pas supprimées : l'historique de la décision reste lisible.

**Aucune fiche n'a été dépubliée**, vérifié en base :

```sql
select count(*) from spots
where generation_batch='S78-MED-01' and moderation_status='approved';  -- 191 ✅
```

---

## 2. Bloc 1 — l'A/B de la marée dans le titre

Deux gabarits, affectation par **hash pur du slug**, donc identique à chaque rendu. Ni
cookie, ni aléatoire, ni PostHog : un titre instable ferait voir à Google un site qui
change tout le temps.

| Cohorte | Gabarit | Effectif |
|---|---|---|
| **A** (témoin) | `Pêche à {commune} ({dept}) : {espèces}` | **161** (47,9 %) |
| **B** (test) | `{commune} ({dept}) : marée du jour et spot de pêche` | **175** (52,1 %) |
| Hors expérience | variante A forcée | **271** (Méditerranée + Corse) |

607 spots publiés, **336 dans l'expérience**. La Méditerranée est exclue par construction :
marnage négligeable, la promesse serait creuse. Vérifié en remontant la logique et non le
test seul : `spotTitleCohort` renvoie `'A'` inconditionnellement si le département n'est
pas dans `DEPARTMENT_FACADE`, et les codes exotiques (`''`, `'2A'`, `'999'`, `'29 '`)
tombent tous en A. **Zéro fuite méditerranéenne.**

Un module pur `lib/conditions/tide-departments.ts` a été extrait de `tide-calibration.ts`
(qui importe le client Supabase serveur) pour éviter de traîner une dépendance serveur dans
un module de titres. Comportement de `referencePortForDepartment` et
`isLowTidalRangeDepartment` strictement inchangé.

**Repères de lecture à J+21** : les deux requêtes qui motivent l'hypothèse (Pen Lan,
Rostiviec, 54 impressions, 0 clic) tombent **en B**. Les deux spots du tableau « le fait qui
justifie le sprint » (Grand Minou, Tréfeuntec) tombent **en A**.

⚠️ **Déséquilibre à connaître avant d'interpréter** : le hash ignore les strates. Le
Calvados sert **0 B sur 4 spots**, le Morbihan **61 %** pour 105 des 336. Pondérer par
département, ou restreindre la lecture à 22 / 29 / 56. C'est écrit dans `AB-MAREE.md`.

⚠️ **Ne pas généraliser la variante B avant J+21**, même si elle semble mieux.

---

## 3. Bloc 2 — le maillage

`NEARBY_MAX` passe de **6 à 12**, le repli départemental comble. **La RPC `nearby_spots`
n'est PAS touchée** (décision John) : le plafond anonyme reste à 3, les migrations 029 et
039 (gating de tier, correctif de fuite GPS par trilatération) sont intactes.

Nouveau server component `components/spots/SpotUpLinks.tsx`, zéro JS, trois liens
remontants avec ancres descriptives :

| Lien | Couverture |
|---|---|
| `/spots?dept=<code>` « Tous les spots du Finistère » | **607/607** |
| `/especes/<slug>` « Pêcher le bar du bord » | **607/607** |
| `/guides/<slug>` | **508/607** (83,7 %) |

Le lien guide n'est émis que si le guide porte **l'espèce ET la technique** du spot. Le
brief demandait « si un guide existe pour la technique » : appliqué tel quel, un spot varois
à l'oblade aurait reçu une ancre « Pêcher l'oblade au surfcasting » pointant vers un guide
qui parle de la dorade royale, exactement la tournure fabriquée que le sprint 78 a appris à
traquer. Les 99 fiches sans guide correspondant n'en reçoivent aucun.

`NearbySpotsSection` bascule en **liste compacte au-delà de 6 entrées** (la grille de cartes
portée à 12 faisait 1 076 px en 390 px ; la liste en fait 625). Cibles tactiles à 44 px.

### ★ Un mensonge trouvé par la revue croisée, et corrigé

Le titre de section disait « Autres spots à moins de 40 km » dès que **3** entrées portaient
une distance. Or `nearby_spots` plafonne un anonyme, donc **tout le trafic Google**, à 3
voisins : le seuil était satisfait par construction, et le reste de la liste venait du
remplissage départemental, **qui n'a aucune contrainte de distance**. Mesuré sur
`/spots/aber-wrach-sainte-marguerite` : des spots à 59, 87 et **118 km** étaient servis sous
ce titre. Passer `NEARBY_MAX` à 12 faisait passer le mensonge de 3 à 9 entrées, sur les
pages qui font 80 % des clics. Le fichier contredisait son propre invariant écrit trois
lignes plus haut (« Jamais plus de 50 km : au-delà, "spots à proximité" devient un
mensonge »). Corrigé : la promesse n'est tenue que si **toutes** les entrées portent une
distance ; sinon on annonce le département, libellé déjà écrit et exact.

### ⚠️ Limite de mesure à écrire noir sur blanc

**Le Bloc 2 ne peut PAS être testé en A/B** : un lien vers une page du groupe témoin la fait
monter aussi. Il se mesure contre la base gelée, donc **en corrélation, pas en causalité**.
Le Bloc 1 est le seul bloc de ce sprint dont on pourra affirmer la causalité.

---

## 4. Bloc 3 — abandonné, et pourquoi

Le brief supposait une notion de commune sur `spots`. **Elle n'existe pas.** La table ne
porte que `name`, `department`, `region`. J'ai testé l'heuristique du nom avant de conclure :

```sql
-- 597 groupes distincts pour 607 spots, dont UN SEUL atteint 3 spots.
with s as (select trim(split_part(name,'—',1)) commune, trim(department) dept
           from spots where moderation_status='approved' and visibility='public')
select count(*) communes, count(*) filter (where n >= 3) communes_3plus
from (select commune, dept, count(*) n from s group by commune, dept) g;
```

**494 spots sur 607 n'ont aucun cadratin**, et les noms sont des lieux-dits (« Pointe de
Leydé », « Cap Gros », « Digue des Fakirs »), pas des communes. Dériver la commune du nom
aurait produit **une seule page** au seuil de 3 spots, et des pages fausses au-dessous.

Le garde-fou du brief dit de s'arrêter, **John a tranché : on s'arrête**. Aucun résidu de
code : `app/(marketing)/spots/` ne contient que `page.tsx`, `spot-filters.tsx` et `[slug]/`,
`searchParams` reste `{ dept?, species? }`, aucune entrée ville au sitemap.

**Backlog proposé** : enrichir `spots` d'une colonne `commune` par **géocodage inverse BAN**
sur les 607 `geom` (migration + backfill), comme préalable d'un sprint dédié. C'est ce qui
manque, pas la page.

---

## 5. Bloc 4 — `/peche` ouvert à 6 espèces, +118 pages

**337 → 455 pages** (11 nationales + 107 départementales), sous le plafond de 150 sans avoir
eu à élaguer. Sitemap **+118 URLs**, vérifié.

### Le comptage qui décide (SQL live, 2026-08-17)

`moderation_status='approved'` + `visibility='public'` (607 spots), `trim(department)`,
`unnest(species)`. Seuil : **≥ 3 spots réels par page.**

| espèce | total | départements retenus (≥ 3 spots) | écartés (< 3) |
|---|---|---|---|
| **oblade** | 227 | **9** : 2A(34) 2B(32) 83(30) 13(29) 06(28) 66(24) 34(22) 11(19) 30(9) | aucun |
| **seiche** | 225 | **24** : 56(45) 29(40) 44(12) 85(12) 13(9) 22(9) 2A(9) 2B(9) 50(8) 17(7) 34(6) 76(6) 83(6) 06(5) 33(5) 35(5) 62(5) 64(5) 14(4) 30(4) 40(4) 66(4) 11(3) 59(3) | aucun |
| **marbré** | 112 | **9** : 2B(22) 34(18) 11(17) 06(15) 83(10) 30(9) 66(9) 2A(8) 13(4) | aucun |
| **pageot** | 101 | **7** : 13(26) 2A(21) 83(20) 66(12) 06(8) 2B(6) 11(3) | 34(2) 64(2) 30(1) |
| **rouget** | 43 | **5** : 33(5) 85(4) 34(3) 40(3) 44(3) | 18 dépts à 1 ou 2 |
| **liche** | 15 | **2** : 2A(3) 83(3) | 06(2) 11(2) 66(2) 13(1) 30(1) 34(1) |

Répartition des 118 pages : seiche 50, oblade 20, marbré 20, pageot 16, rouget 6, liche 6.

**Aucune technique inventée** : la matrice recopie le tableau `techniques` de chaque fiche
profonde `lib/especes/content/<slug>.ts`. Un test le verrouille.

⚠️ **Correction au brief** : « espèces méditerranéennes » est faux pour deux des six. La
**seiche** est la plus atlantique du lot (56 : 45, 29 : 40) et couvre les 24 départements
côtiers ; le **rouget** est majoritairement atlantique. **56 des 118 pages ne sont pas
méditerranéennes.**

⚠️ **Le périmètre du brief aurait produit 118 URLs en 404.** `peche/[...slug]/page.tsx:143`
fait `if (!content) notFound()` : ouvrir `SPECIES_TECHNIQUES` sans écrire les
`SpeciesContent` correspondants aurait déclaré à Google 118 pages que le site refuse de
servir, exactement le piège du 05/08. Les 6 fichiers `lib/seo/content/*.ts` ont donc été
écrits, et un test verrouille l'invariant à trois branches `hasProgrammatic` ↔ matrice ↔
contenu.

### Deux bugs préexistants trouvés et corrigés au passage

- **Liens départementaux morts sur les pages nationales.** `deptLinks` partait des
  départements bruts de la base sans passer par `resolveProgrammaticSlug`. Déjà cassé en
  prod : `/peche/sar/surfcasting` liait des 404. Le repli codé en dur sur la Bretagne aurait
  en plus envoyé chaque espèce méditerranéenne sur 4 liens morts.
- **`LE {ESPÈCE} AUTREMENT`**, article codé en dur au masculin : sert « LE ORPHIE
  AUTREMENT » et « LE DORADE ROYALE AUTREMENT » en production. Corrigé via `species.article`.

### Backlog de curation

~36 pages à débloquer quand la curation fait passer ces couples à 3 spots (enveloppe
restante sous le plafond : 32) : rouget sur 18 départements, liche sur 6, pageot sur 34, 64
et 30. Aucun redéploiement de code au-delà de la mise à jour de
`SPECIES_DEPARTMENTS_WITH_INVENTORY` et de la table figée du test.

---

## 6. Bloc 5 — le titre de `/especes/mulet`

L'override `seoTitle` est retiré. Le titre servi passe de :

> `Où pêcher le mulet du bord : spots et technique au pain` (aucun « maille », aucun chiffre)

à la formule générique :

> `Mulet : maille 30 cm (2026), saisons et spots du bord` — **53 caractères**

Le commentaire du fichier porte désormais le relevé du 16/08 qui annule la décision du
sprint 77 : l'intention maille pèse **283 impressions** contre ~82 pour l'identification, et
c'est la seule qui accroche la page 1.

**Honnêteté de la maille, vérifiée.** Le mulet vaut 30 cm en Manche-Atlantique et **rien** en
Méditerranée. `formatMailleShort` ne rend que les façades où la donnée existe : la
Méditerranée n'est jamais citée, et le titre ne revendique aucune portée nationale. La meta
description qualifie explicitement (« Maille du mulet : 30 cm **en Manche et Atlantique** »)
et le bloc réglementation porte le « pas de taille minimale en Méditerranée ». Un test le
verrouille dans les deux sens.

À noter, hors périmètre : **7 autres espèces servent déjà ce même gabarit à façade unique**
(lieu-jaune, orphie, plie, marbré, lieu-noir, merlan, pageot). C'est un motif systémique
préexistant, à trancher globalement avec John un jour, pas dans ce sprint.

### ★ Effet de bord trouvé par la revue croisée, et corrigé

`/especes/<slug>` émettait un lien `/peche` pour **chaque** technique de la fiche, sans
demander si la page existe : **56 liens émis, 30 en 404 dur.** `/especes/mulet` en émettait
2, dans la section « Comment le pêcher du bord », et c'est justement la page que le Bloc 5
va faire cliquer. Corrigé : on ne lie que ce qui se résout, la carte reste affichée mais non
cliquable sinon. Mesuré après correctif : **26 liens émis, tous résolvent, 30 liens morts
supprimés.**

---

## 7. Comment tester

```bash
pnpm test        # 1 440 tests, 113 fichiers
pnpm build       # vert
pnpm typecheck   # 0 erreur
pnpm lint        # 0 warning
node scripts/lint-copy-dashes.mjs   # 16 warnings, tous préexistants et tolérés (§6)
```

⚠️ `__tests__/security-headers.test.ts` peut échouer en timeout 5 s **sous charge de suite
complète** : c'est un import dynamique de `next.config` à froid. En isolation il passe en
597 ms. Flake de démarrage, pas une régression.

À la main, après déploiement :
- `/spots/<slug>` d'un spot du 29 ou du 56 : compter **12 liens spot → spot** + 3 remontants
  dans le HTML SSR brut (`curl`, pas après hydratation).
- `/especes/mulet` : le `<title>` doit contenir « maille », « 30 » et « 2026 ».
- 2 fiches cohorte A et 2 cohorte B (listes dans `AB-MAREE.md`) : le `<title>` SSR doit
  correspondre au gabarit attendu.
- `/peche/oblade/flottante/herault` : doit répondre 200.

---

## 8. Passe anti-régression (preuves)

| Contrôle | Résultat |
|---|---|
| `git diff -- supabase/migrations/` | **vide** (aucune migration dans ce sprint) |
| RPC `nearby_spots` | **intacte**, plafond anonyme toujours à 3 |
| Floutage GPS / gating de tier | inchangés. Passer `NEARBY_MAX` à 12 n'ouvre aucune surface de trilatération : la migration 110 calcule déjà `distance_m` depuis `ST_Centroid(geom_public)` pour tout tier hors `local`/`itinerant`/propriétaire |
| Coordonnées dans les nouveaux blocs | **aucune**. `SpotUpLinks` ne reçoit qu'un `char(3)` et des clés d'espèces/techniques |
| `app/robots.ts` | **inchangé** |
| `app/sitemap.ts` | filtre `moderation_status='approved'` toujours en place (correctif du 05/08) |
| Sitemap → 200 | **455/455** pages `/peche` servables, aller-retour `programmaticUrl` → `resolveProgrammaticSlug` → `SPECIES_CONTENT`, vérifié deux fois par deux méthodes indépendantes |
| Doublons de `<title>` | **1 088 titres uniques pour 1 088 pages** (`/spots` + `/especes` + `/peche` confondus) |
| Tiret cadratin dans un titre servi | **0** |
| Meta description / OG / Twitter card des fiches spots | **inchangées** (sprint 76 Bloc 5) |

**Restes connus, non corrigés, assumés** : 3 titres de spots dépassent 60 caractères
(68, 66, 61). Ce sont des noms importés d'OSM au lot S78-MED-01 (« Navette Portuaire -
Visite Touristique de Port Camargue », deux « Poste de secours »), séparés par un trait
d'union espacé et non par un cadratin, donc la dégradation n'a nulle part où couper. La
vraie racine est que ce ne sont pas des spots de pêche : **c'est de la dette de curation**,
pas un défaut de gabarit. Un test les liste explicitement pour que ça ne pourrisse pas.

---

## 9. Les requêtes de mesure, prêtes à rejouer

### J+21 — Bloc 1 (le seul verdict causal du sprint)

Dans GSC / Supermetrics, filtrer par `pagepath`, croiser avec les listes de cohortes de
`AB-MAREE.md` :

- CTR et position moyenne des **175 fiches cohorte B** contre les **161 fiches cohorte A**,
  même fenêtre de 28 jours, **pondérés par département** (cf le déséquilibre du §2).
- Zoom sur « maree pen lan » et « marée rostiviec » (cohorte B) : le CTR décolle-t-il de 0 ?
- **Ne rien conclure avant J+21.** Le débit de découverte est de ~10 URLs/jour.

### J+21 — Bloc 2 (corrélation, pas causalité)

Rejouer les **13 requêtes de nom de lieu** de `BASELINE.md` §2, même fenêtre, même source.
**Le repère est la position, pas le volume** : la fin août baisse mécaniquement sur un site
de pêche du bord. Une position qui monte pendant que les impressions baissent reste un
succès. Position moyenne du groupe à figer comme cible : elle vaut **8,60** dans la base.

### J+21 — Bloc 5

CTR de `/especes/mulet` contre sa propre base : **1 510 impressions / 20 clics**.

### J+30 — Bloc 4

CTR des 118 nouvelles pages contre les pages `/peche` atlantiques existantes (témoin), par
`pathlevel1` + `pagepath`.

### 03/09 — le lot S78-MED-01 (protocole de cohortes, remplace le seuil supprimé)

CTR des fiches `generation_batch='S78-MED-01'` contre `generation_batch is null`, même
fenêtre, par `pagepath`.

```sql
-- Témoin produit : les fiches curées n'ont pas bougé
select count(*) from spots where moderation_status='approved' and generation_batch is null;
-- doit rester 416
```

---

## 10. Reste manuel John

1. **Décider du passage Vercel Pro (~20 $/mois).** Temps de réponse moyen à 1 247 ms, pics à
   2 754 ms, dépassement CPU sur le plan Hobby (7 h 34 pour 4 h incluses). Google réduit sa
   cadence d'exploration quand le serveur traîne : tant que ce n'est pas réglé, le Bloc 4
   crée 118 pages que Google mettra des mois à voir. **C'est le levier le plus rentable du
   plan, et le seul que le code ne peut pas faire.**
2. **Extraire le tableau par page des 40 fiches `/spots/*`** dans Supermetrics et le coller
   dans `BASELINE.md` §3 (la requête exacte y est écrite). À faire **avant** le déploiement,
   sinon la fenêtre de mesure est polluée.
3. Merger et déployer, **après** le point 2.
4. **Noter la date et l'heure exactes du déploiement ici même** : toute la mesure en dépend.

   > Poussé sur `main` le **17/08/2026 à 11:53** (commit `357c94d`).
   > Vercel déploie automatiquement depuis `main` : **la fenêtre de mesure démarre là.**
   > J+21 = **07/09/2026**. J+30 = **16/09/2026**.
   >
   > ⚠️ Le point 2 ci-dessus (extraction des 40 pages) n'était **pas fait** au moment du
   > push : la baseline par page manque donc pour de bon sur la fenêtre d'avant. Les 13
   > requêtes de nom de lieu, elles, sont figées et suffisent au verdict du Bloc 2.

5. Resoumettre le sitemap dans Search Console après déploiement.
6. Reprogrammer la relecture du lot 1 (protocole de cohortes) au **03/09**, pas au 18/08.
7. **QA visuelle à finir** : le rendu mobile 390 px de la liste compacte a été mesuré dans
   un Chromium réel (390 × 844, DPR 2), avec le markup exact du composant, le thème Tailwind
   compilé, les vraies polices et les 12 noms les plus longs du Finistère tirés de la base.
   Relevé complet et captures : `docs/sprint-83/QA-390-BLOC2.md`. Résultat : 0 px de
   débordement, cibles à 44 px, section de 1 076 px ramenée à 625 px. **Ce que ça ne prouve
   pas** : l'intégration dans la page complète (sections voisines, hydratation, position
   dans le défilement). Une passe sur la page déployée reste à faire.
8. Trancher un jour, hors sprint : les 7 autres espèces à maille de façade unique qui
   servent le même gabarit que le mulet (§6).
