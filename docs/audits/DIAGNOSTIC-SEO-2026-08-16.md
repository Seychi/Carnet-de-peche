# Diagnostic SEO — 2026-08-16

> Déclencheur : « depuis mardi les impressions et les clics chutent, 2 100 → 1 500 vendredi ».
> Source : Google Search Console via le connecteur Supermetrics (`sc-domain:carnet-de-peche.com`),
> relevé le 16/08. Croisé avec `git log`, `app/robots.ts`, `app/sitemap.ts`, `middleware.ts` et
> les fiches `lib/especes/content/*`.

---

## ★★★ Verdict : il n'y a pas d'incident SEO. La courbe se lit à l'envers.

**Semaine sur semaine, les clics par jour sont en hausse de 43 %.** La « chute » est le
sommet d'une courbe qui monte, pas le début d'une descente.

| | S32 (03–09/08, 7 j) | S33 (10–14/08, **5 j**) | Par jour |
|---|---|---|---|
| Impressions | 9 060 | **9 497** | 1 294 → **1 899** (+47 %) |
| Clics | 478 | **490** | 68,3 → **98,0** (+43 %) |
| Position moyenne | 7,59 | 7,55 | stable |

S33 ne contient que 5 jours (les données figées s'arrêtent au 14/08) et dépasse déjà
une semaine pleine.

---

## 1. Trois choses que le graphique GSC ne montre pas

**a) Les deux derniers jours ne sont pas figés.** Requête `final_data=true` : GSC ne
consolide que jusqu'au **14/08**. Le 15 et le 16 sont provisoires et ne peuvent que
monter.

**b) Le 15/08 est déjà remonté.** Chiffres bruts qui ne sont pas encore sur ta courbe :

| Jour | Impressions | Clics |
|---|---|---|
| 11/08 (mar) — **pic** | 2 188 | 115 |
| 12/08 | 2 018 | 103 |
| 13/08 | 1 861 | 86 |
| 14/08 (ven) — **le « 1 500 »** | 1 507 | 71 |
| 15/08 *(non figé)* | **1 655** | **95** |
| 16/08 *(journée en cours)* | 530 | 37 |

Le point bas est le 14, pas « depuis mardi ». Le 15 repart.

**c) L'échelle du mois.** Le 21/07 : **410 impressions/jour**. Le 15/08 : **1 655**.
En dix semaines : 24 → 9 497 impressions hebdomadaires.

---

## 2. Où le mouvement se produit vraiment : `/spots`, et nulle part ailleurs

Impressions par répertoire (S33 = 5 jours) :

| Répertoire | S30 | S31 | S32 | S33 (5 j) | Par jour S32→S33 |
|---|---|---|---|---|---|
| **`/spots`** | 813 | 1 337 | 4 358 | **6 012** | 623 → 1 202 · **+93 %** |
| `/especes` | 820 | 1 519 | 2 638 | 1 936 | 377 → 387 · stable |
| `/peche` | 732 | 1 059 | 1 595 | 1 249 | 228 → 250 · stable |
| racine | 352 | 539 | 569 | 443 | 81 → 89 · stable |
| `/guides` | 45 | 127 | 180 | 156 | 26 → 31 · stable |

`/spots` fait **80 % du delta pic→14/08** (1 430 → 888) et **+93 % par jour** en
semaine sur semaine. Tout le reste est plat. Une pénalité ou une panne technique
frappe le site entier ou fait plonger la position : **la position moyenne n'a pas
bougé (7,44 le 11/08 → 7,46 le 14/08)**.

---

## 3. Cause : une bouffée de découverte qui se stabilise, plus la volatilité du 12-13/08

1. **Le correctif sitemap du 05/08** (`8c79327`, 941 URLs mortes retirées + sitemap
   resoumis) a déclenché une réévaluation : `/spots` passe de 233 impressions/jour
   le 05/08 à 1 430 le 11/08, ×6 en six jours. Google donne une visibilité
   temporaire aux URLs (re)découvertes, puis les repose à leur niveau réel. Le
   plateau à 900–1 050 est ce niveau réel — soit toujours **4× le point de départ**.
2. **Volatilité Google documentée les 12-13/08**, non confirmée par Google, relevée
   par SEMrush, Sistrix, Mozcast et AccuRanker. Le calendrier colle exactement.
3. Rien côté code : aucun déploiement entre le 09/08 et le 14/08 (`git log`).
   `robots.txt` sain, `middleware.ts` ne touche pas les routes publiques, statistiques
   d'exploration à **98,22 % de 200 et 0,00 % de 5xx** sur 64 jours.

**Ce qu'il ne faut pas faire : « corriger » quelque chose.** Toucher au sitemap, aux
canoniques ou aux titres en réaction à cette courbe ne peut que casser une hausse en
cours.

### Le pic du 11/08 était gonflé par de la page 2

Répartition des impressions `/spots` par page de résultats (échantillon de requêtes
visibles, ~8 % du trafic) :

| Jour | Positions 11-20 |
|---|---|
| 08/08 | 21 |
| 09/08 | 27 |
| 10/08 | 19 |
| **11/08 (le pic)** | **55** |
| **12/08** | **85** |
| 13/08 | 44 |

Le bloc page 2 double puis quadruple exactement les deux jours du sommet, avant de
retomber. C'est la signature d'un moteur qui teste des URLs fraîchement découvertes :
il les affiche, mesure, puis les repose. **Ces impressions-là ne cliquent jamais** —
0 clic sur les 55 et les 85. Une partie du « 2 188 » du 11/08 n'était donc pas du
trafic gagné, mais du trafic en cours d'évaluation. Comparer le plateau à ce sommet
surestime mécaniquement la baisse.

---

## 4. ⚠️ Le vrai risque de la semaine : la règle de dépublication va se déclencher à tort

`docs/sprint-78/METRIQUES.md` fixe : *« si le CTR de `/spots` passe sous 6 %, on
dépublie le lot S78-MED-01 »*, relecture au **J+3 (18/08)**.

Le lot est parti le **15/08 à 10 h 06**. Or le CTR `/spots` était **déjà** sous
le seuil avant :

| Jour | CTR `/spots` | Lot publié ? |
|---|---|---|
| 12/08 | 6,6 % | non |
| 13/08 | **5,4 %** | non |
| 14/08 | **5,0 %** | non |
| 15/08 | 6,3 % | oui (à 10 h 06) |

Deux raisons pour lesquelles le test agrégé est le mauvais test :

- Le CTR `/spots` baissait **avant** le lot, mécaniquement : les impressions ont été
  multipliées par 6, et le volume gagné est de la longue traîne, moins cliquée que le
  noyau initial. Un CTR qui baisse pendant que les clics montent de 69 % par jour
  n'est pas un signal de qualité.
- Ajouter 191 pages neuves, qui démarrent forcément en bas de classement, **dilue la
  moyenne du répertoire par construction**, quelle que soit leur qualité.

**Recommandation :** remplacer le seuil agrégé par une comparaison de cohortes —
CTR des 191 fiches `generation_batch='S78-MED-01'` contre les 416 fiches curées, sur
la même fenêtre, une fois les nouvelles indexées (leur découverte prendra ~19 jours
au débit constaté de ~10 URLs/jour). Avant ça, le J+3 du 18/08 ne peut rien décider.

---

## 5. Ce qui mérite vraiment du travail

### ★ a) `/especes/mulet` : le titre ne répond pas à la requête qui le fait ranker

`/especes` sur 27 jours (20/07 → 15/08) : **7 255 impressions, 92 clics, CTR 1,27 %**.
Les trois plus grosses pages sont `mulet` (1 510), `tassergal` (1 099) et `congre` (774) —
soit **3 383 impressions, plus que les 3 070 des 8 fiches retitrées au Bloc 4** (bar,
barracuda, liche, maigre, oblade, pageot, sar, seiche), et aucune des trois n'en faisait
partie.

Le cas `mulet` est le plus net. Répartition des requêtes visibles :

| Intention | Impressions | Clics | Positions |
|---|---|---|---|
| **Maille / taille réglementaire** | **283** | **0** | 5,2 – 10,7 |
| Identification (« mulet poisson ») | ~82 | 0 | 16 – 67 |
| Pêche / technique | ~20 | 0 | 22 – 58 |

L'intention « maille » pèse **73 %** des requêtes visibles et c'est la seule qui
accroche la page 1. Le titre actuel :

> `Où pêcher le mulet du bord : spots et technique au pain`

Le commentaire de `lib/especes/content/mulet.ts` justifie ce choix par des « requêtes
GSC dominées par l'identification » — c'était le constat du sprint 77. **Les données
des 27 derniers jours disent l'inverse** : le mix a basculé vers la maille. Quelqu'un
qui cherche « maille mulet atlantique » balaie la SERP à la recherche d'un chiffre en
cm ; on lui propose une technique au pain, il ne clique pas. Zéro clic sur 283
impressions dont une partie en position 5-6.

**Correctif :** retirer l'override `seoTitle` de `mulet.ts` pour revenir à la formule
générique (`Mulet : maille 30 cm (2026), saisons et spots du bord`) — en vérifiant le
rendu, la maille du mulet vaut 30 cm en Manche-Atlantique et `null` en Méditerranée.
Une ligne, réversible, testable au J+14.

**À l'inverse, ne pas insister sur `tassergal` et `congre` :** leurs requêtes sont de
l'identification pure, et `congre` fait **0 clic sur 141 impressions en position 2,25** —
la réponse est donnée dans la SERP (panneau de connaissance / AI Overview). Le plafond
est bas quoi qu'on fasse. Le seuil de 5 % de CTR sur l'agrégat `/especes` inscrit dans
`METRIQUES.md` est hors d'atteinte pour cette raison, exactement comme le brief le
pressentait.

### b) Le CTR `/especes` a été divisé par deux, à surveiller

S32 : 34 clics / 2 638 impressions (1,29 %). S33 : 13 clics / 1 936 (0,67 %). Faibles
volumes absolus (3 % des clics du site), donc pas une urgence — mais si ça persiste
après le 22/08, c'est le signe que les AI Overviews mangent les requêtes d'espèce, et
la stratégie `/especes` doit être révisée plutôt que retitrée.

### c) Desktop : position 10-20 contre 7 sur mobile

15-18 % des impressions, CTR 2,5 % contre 6-7 % sur mobile, position moyenne erratique
(20,4 le 06/08, 10,9 le 15/08) alors que le mobile tient 7,0. À creuser une fois le
lot 1 indexé — le mobile pèse 82 %, ce n'est pas prioritaire.

---

## 6. Décisions proposées

| # | Action | Quand |
|---|---|---|
| 1 | **Ne rien « corriger »** sur la base de la courbe du 12-14/08 | maintenant |
| 2 | Remplacer le seuil agrégé `/spots < 6 %` par une comparaison de cohortes lot vs curées | avant le J+3 du 18/08 |
| 3 | Retirer l'override `seoTitle` de `mulet.ts` (retour à la formule maille) | prochain déploiement |
| 4 | Reporter le verdict sur le lot 1 à J+14 minimum (découverte ≈ 19 jours) | 29/08 |
| 5 | Vérifier si le CTR `/especes` reste sous 1 % | 22/08 |

---

## Ce qui me ferait changer d'avis

Le diagnostic ci-dessus est réfutable, et voici comment. Si, sur les relevés du 16 au
18/08 **une fois figés** :

- les impressions passent durablement **sous 1 400/jour**, **et**
- la position moyenne dérive **au-delà de 8,5** (elle est à 7,4–7,8 depuis dix jours), **et**
- la baisse touche `/peche` et la racine, pas seulement `/spots`,

alors ce n'est plus une stabilisation, c'est une perte de classement, et il faut
chercher une cause côté Google (mise à jour non annoncée) ou côté site. Tant que la
position tient et que seul `/spots` bouge, l'hypothèse « bouffée de découverte qui se
repose » reste la plus économique.

À l'inverse, ce qui la confirmerait : un 17 et un 18/08 entre 1 500 et 2 000, et un
`/spots` qui repart à la hausse fin août quand les 191 fiches du lot 1 finiront d'être
découvertes.

---

## Réserves d'honnêteté

- Les requêtes détaillées ne couvrent que la part que GSC expose : ~8 % du trafic,
  le reste est anonymisé en `(unknown)`. Le déséquilibre 283 vs 82 sur `mulet` est net,
  mais c'est un échantillon.
- Une part de la croissance d'août est **saisonnière** (pêche du bord + vacances
  littorales). Attendre un tassement en septembre et ne pas le confondre, là non plus,
  avec un problème SEO. Le repère à garder est la comparaison à septembre 2025, pas au
  pic du 11/08.
- La volatilité Google des 12-13/08 n'est pas confirmée par Google ; elle est cohérente
  avec le calendrier mais ne peut pas être isolée de l'effet de stabilisation.
