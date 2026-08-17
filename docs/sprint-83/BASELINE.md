# Sprint 83 · Bloc 0 — Baseline gelée

> **Fenêtre de référence : 18/07 → 14/08/2026 (28 jours).** Données figées
> (`final_data=true` côté Google Search Console : GSC ne consolide que jusqu'au 14/08,
> le 15/08 et après restent provisoires et sont exclus de cette baseline).
> **Source** : Google Search Console via le connecteur Supermetrics, compte
> `sc-domain:carnet-de-peche.com`, relevé du 16/08/2026.
> **Date de gel de ce document : 17/08/2026.**
>
> Ce fichier n'ajoute aucune donnée nouvelle : il consolide et référence ce qui a déjà
> été extrait le 16/08 dans `docs/audits/DIAGNOSTIC-SEO-2026-08-16.md` et
> `docs/roadmaps/PLAN-CROISSANCE-SEO-2026-08-16.md`. Zéro chiffre inventé : tout ce qui
> n'a pas pu être retrouvé dans ces deux documents est marqué « non extrait ».
> Aucun connecteur GSC/Supermetrics n'est disponible côté Claude Code pour ce sprint,
> ce document ne peut donc pas produire de nouvelle extraction (cf section 3 et le
> rapport final).

---

## 1. Par `pathlevel1`

### 1a. Vue d'ensemble, fenêtre 16/07 → 14/08 (30 jours)

⚠️ **Fenêtre différente de la baseline du sprint 83.** Ce tableau est repris tel quel
de `docs/sprint-78/METRIQUES.md` §1, dont la fenêtre est le **16/07 → 14/08 (30
jours)**, pas le 18/07 → 14/08 (28 jours) qui encadre le reste de ce document. Les deux
jours de plus font qu'il n'est **pas directement comparable** aux tableaux 2 et 4
ci-dessous, notamment sur les volumes bruts. Il donne la position moyenne par
répertoire, donnée absente ailleurs dans les sources disponibles.

| Répertoire | Impressions | Clics | CTR | Position moy. |
|---|---|---|---|---|
| **`/spots`** | **12 894** | **928** | **7,2 %** | 7,13 |
| `/especes` | 7 474 | 106 | 1,42 % | 8,57 |
| `/peche` | 4 967 | 295 | 5,94 % | 7,09 |
| `/` (racine) | 2 100 | 146 | 6,95 % | 7,16 |
| `/guides` | 545 | 20 | 3,67 % | 8,43 |
| `/auth` · `/legal` | 15 | 0 | 0 % | non extrait |
| **Total** | **~27 985** | **~1 495** | non extrait | non extrait |

### 1b. Décomposition hebdomadaire des impressions par répertoire

⚠️ **Fenêtre encore différente** : ce tableau vient de
`docs/audits/DIAGNOSTIC-SEO-2026-08-16.md` §2. Les colonnes sont des semaines
calendaires se terminant au 14/08, S33 ne compte que **5 jours** (10/08 → 14/08, les
données figées s'arrêtant au 14). Aucune date de début n'est donnée pour S30 dans les
sources : marqué « non extrait ». Ce tableau sert uniquement à situer *où* le
mouvement se produit (répertoire par répertoire), pas à recalculer un total 28 jours.

| Répertoire | S30 | S31 | S32 (03-09/08, 7 j) | S33 (10-14/08, 5 j) | Par jour, S32→S33 |
|---|---|---|---|---|---|
| **`/spots`** | 813 | 1 337 | 4 358 | **6 012** | 623 → 1 202 (+93 %) |
| `/especes` | 820 | 1 519 | 2 638 | 1 936 | 377 → 387 (stable) |
| `/peche` | 732 | 1 059 | 1 595 | 1 249 | 228 → 250 (stable) |
| racine | 352 | 539 | 569 | 443 | 81 → 89 (stable) |
| `/guides` | 45 | 127 | 180 | 156 | 26 → 31 (stable) |

À retenir pour la mesure à J+21 (cf `docs/audits/DIAGNOSTIC-SEO-2026-08-16.md` §2/§3) :
`/spots` concentre tout le mouvement d'août (+93 % par jour S32→S33), le reste des
répertoires est stable. La position moyenne globale, elle, n'a pas bougé sur la même
période (7,44 le 11/08, 7,46 le 14/08, cf diagnostic §2).

---

## 2. Les 13 requêtes de nom de lieu (fenêtre 18/07 → 14/08, 28 jours)

C'est le tableau de référence du Bloc 2 (maillage interne) et, plus largement, du
constat qui ouvre `docs/roadmaps/PLAN-CROISSANCE-SEO-2026-08-16.md` : « le clic se joue
en position 3-6, le site est garé en 8-11 ». Rejoue-le tel quel à J+21, même fenêtre
glissante de 28 jours, même source.

| Requête | Position | Impressions | Clics | CTR |
|---|---|---|---|---|
| pointe du grand minou | **5,76** | 59 | **7** | **11,9 %** |
| pointe de rostiviec | 8,79 | 29 | 2 | 6,9 % |
| pointe de landunvez | 4,79 | 39 | 1 | 2,6 % |
| pointe de l'armorique | 7,78 | 32 | 0 | 0 % |
| kastel koz | 8,44 | 27 | 0 | 0 % |
| marée rostiviec | 8,76 | 25 | 0 | 0 % |
| pêche à dieppe sur la jetée | 8,70 | 40 | 0 | 0 % |
| maree pen lan | 10,21 | 29 | 0 | 0 % |
| **pointe de trefeuntec** | **10,30** | **97** | **0** | **0 %** |
| peche gravelines | 10,82 | 45 | 0 | 0 % |
| pointe de leyde | 10,41 | 39 | 0 | 0 % |
| pointe du berchis | 10,95 | 39 | 0 | 0 % |
| pointe de beg an fry | 10,91 | 33 | 0 | 0 % |

Position moyenne du groupe (calcul simple, non pondéré par les impressions) :
**8,60**. C'est le repère du Bloc 2 : « si la position moyenne passe sous 7, le
maillage fonctionne » (`PLAN-CROISSANCE-SEO-2026-08-16.md`, Levier 1).

Deux requêtes de la liste (« marée rostiviec » et « maree pen lan ») sont aussi le
repère du Bloc 1 (marée dans le titre) : elles pointent vers des fiches situées dans
des départements à marée calibrée, cf `lib/conditions/tide-calibration.ts`.

---

## 3. Détail par page des 40 fiches `/spots/*` les plus vues

✅ **Extrait le 2026-08-17**, avant tout déploiement du sprint 83.

- Source : Google Search Console via Supermetrics, compte `sc-domain:carnet-de-peche.com`.
- Dimension `pagepath` filtrée sur `/spots/`, tri impressions décroissantes, 40 lignes.
- Fenêtre **18/07 → 14/08/2026**, `final_data=true` (données consolidées — le 15/08 et
  au-delà sont exclus, ils n'étaient pas figés au moment du relevé).
- Total sur ces 40 pages : **6 474 impressions, 363 clics, CTR 5,61 %**.

| # | Page | Impr. | Clics | CTR | Position |
|---|---|---|---|---|---|
| 1 | `/spots/chenal-de-l-aa-gravelines` | **803** | 31 | **3,86 %** | 7,69 |
| 2 | `/spots/jetees-de-dieppe` | **634** | 20 | **3,15 %** | 7,64 |
| 3 | `/spots/digue-carnot-boulogne` | 263 | 7 | 2,66 % | 5,71 |
| 4 | `/spots/digues-de-sausset-les-pins` | 259 | 25 | 9,65 % | 6,04 |
| 5 | `/spots/mole-de-pornichet` | 248 | 20 | 8,06 % | 7,13 |
| 6 | `/spots/pointe-de-trefeuntec-plonevez-porzay` | 216 | 8 | 3,70 % | 8,79 |
| 7 | `/spots/gruissan-plage` | 207 | 2 | 0,97 % | 8,19 |
| 8 | `/spots/digue-de-cavalaire` | 205 | 17 | 8,29 % | 6,82 |
| 9 | `/spots/pointe-de-penmarch` | 184 | 14 | 7,61 % | 6,02 |
| 10 | `/spots/pointe-saint-gildas` | 167 | 12 | 7,19 % | 7,96 |
| 11 | `/spots/quai-victoria-portsall` | 164 | 2 | 1,22 % | 4,57 |
| 12 | `/spots/plage-napoleon-port-saint-louis` | 143 | 11 | 7,69 % | 5,15 |
| 13 | `/spots/embouchure-de-l-orb-valras` | 142 | 12 | 8,45 % | 6,38 |
| 14 | `/spots/pointe-de-pen-lan-billiers` | 141 | 6 | 4,26 % | 9,09 |
| 15 | `/spots/plage-du-cavaou` | 139 | 13 | 9,35 % | 6,72 |
| 16 | `/spots/digue-de-saint-vaast` | 135 | 9 | 6,67 % | 6,70 |
| 17 | `/spots/grande-plage-saint-cast-le-guildo` | 126 | **0** | **0 %** | 7,21 |
| 18 | `/spots/pointe-du-grand-minou` | 119 | 9 | 7,56 % | 4,86 |
| 19 | `/spots/pointe-de-rostiviec-loperhet` | 115 | 6 | 5,22 % | 9,15 |
| 20 | `/spots/pointe-de-kastel-koz-beuzec` | 114 | 1 | 0,88 % | 8,92 |
| 21 | `/spots/pointe-de-penvins` | 114 | 20 | **17,54 %** | 6,23 |
| 22 | `/spots/digue-du-port-du-lavandou` | 109 | 8 | 7,34 % | 7,28 |
| 23 | `/spots/jetees-de-saint-valery-en-caux` | 108 | 6 | 5,56 % | 6,17 |
| 24 | `/spots/plage-du-centre-bidart` | 108 | 8 | 7,41 % | 6,69 |
| 25 | `/spots/port-d-argeles` | 108 | 2 | 1,85 % | 8,81 |
| 26 | `/spots/pointe-de-beg-meil` | 107 | 5 | 4,67 % | 6,48 |
| 27 | `/spots/embouchure-courant-de-soustons` | 106 | 11 | 10,38 % | 6,80 |
| 28 | `/spots/pointe-de-lostmarc-h-crozon` | 106 | 8 | 7,55 % | 9,03 |
| 29 | `/spots/pointe-de-landunvez-argenton` | 103 | 6 | 5,83 % | 5,76 |
| 30 | `/spots/plage-sud-port-camargue` | 99 | 1 | 1,01 % | 7,99 |
| 31 | `/spots/pointe-de-leyde-douarnenez` | 97 | 5 | 5,15 % | 8,40 |
| 32 | `/spots/belle-ile-pointe-des-poulains` | 95 | 4 | 4,21 % | 6,18 |
| 33 | `/spots/pointe-du-conguel` | 95 | 11 | 11,58 % | 5,24 |
| 34 | `/spots/pointe-de-mousterlin` | 93 | 10 | 10,75 % | 6,24 |
| 35 | `/spots/pointe-du-cabellou-concarneau` | 90 | 6 | 6,67 % | 5,27 |
| 36 | `/spots/pointe-de-beg-an-fry-guimaec` | 84 | 1 | 1,19 % | 9,90 |
| 37 | `/spots/quiberon-cote-sauvage` | 84 | 3 | 3,57 % | 8,68 |
| 38 | `/spots/grande-plage-damgan` | 82 | 4 | 4,88 % | 7,41 |
| 39 | `/spots/grande-plage-carnac` | 81 | 7 | 8,64 % | 8,63 |
| 40 | `/spots/plage-de-penvins-sarzeau` | 81 | 12 | **14,81 %** | 5,64 |

### 3a. Courbe position → CTR sur ces 40 pages

| Position moyenne | Pages | Impressions | Clics | CTR |
|---|---|---|---|---|
| < 5 | 2 | 283 | 11 | 3,9 % |
| 5 à 6 | 6 | 775 | 53 | 6,8 % |
| **6 à 7** | **13** | **1 795** | **154** | **8,6 %** |
| 7 à 8 | 8 | 2 268 | 96 | 4,2 % |
| 8 à 9 | 7 | 907 | 28 | 3,1 % |
| ≥ 9 | 4 | 446 | 21 | 4,7 % |

⚠️ **La courbe n'est pas monotone, et il faut le dire avant que quelqu'un ne s'en
serve à J+21 comme d'une loi.** Trois réserves :

1. Le bloc « < 5 » ne contient que **2 pages**, dont `quai-victoria-portsall` (position
   4,57 pour 1,22 % de CTR). Deux pages ne font pas une moyenne : ce bloc n'est pas
   exploitable.
2. Le bloc « 7 à 8 » est écrasé par Gravelines et Dieppe, qui pèsent **63 % de ses
   impressions** avec un CTR de 3 à 4 %.
3. Le signal robuste est l'écart entre **6-7 (8,6 %)** et **8-9 (3,1 %)**, sur 20 pages
   et 2 700 impressions. C'est lui qui fonde l'objectif du sprint, pas le reste de la
   courbe.

### 3b. Trois choses à surveiller à J+21

**★ Gravelines et Dieppe sont les deux plus grosses pages du site et sous-performent.**
1 437 impressions à elles deux (22 % du total de ce tableau) pour 51 clics. Au CTR du
bloc 6-7, elles en feraient **124**, soit **+73 clics/mois sur deux pages**. Leur
position (7,6-7,7) n'explique pas tout : les pages voisines en position 7-8 font mieux.
Hypothèse à tester : ce sont des requêtes de **ville** (« peche gravelines »,
« pêche à dieppe sur la jetée ») servies par une fiche de **spot unique** — exactement
le trou que le Bloc 3 doit combler. Ces deux pages sont donc le meilleur témoin du
Bloc 3, à suivre nommément.

**`grande-plage-saint-cast-le-guildo` : 126 impressions, 0 clic, position 7,21.** Seule
page du tableau à zéro clic alors qu'elle est correctement placée. À inspecter à la
main (titre, snippet, concurrence sur la SERP) : c'est le cas le plus pur d'un
problème qui n'est PAS un problème de position.

**Les fiches méditerranéennes traînent en bas de tableau côté CTR** : gruissan-plage
(0,97 %), port-d-argeles (1,85 %), plage-sud-port-camargue (1,01 %). Ce sont des
fiches curées, pas des fiches du lot 1 — donc ce n'est pas un effet du lot. À recouper
avec le Bloc 4 (`/peche` méditerranéen) : si l'intention méditerranéenne clique moins
par nature, le Bloc 4 rendra moins que prévu.

---

## 4. Répartition par bloc de positions (fenêtre 18/07 → 14/08, 28 jours)

Source : `docs/roadmaps/PLAN-CROISSANCE-SEO-2026-08-16.md`, section « Le constat qui
commande tout le reste ». Porte sur l'échantillon de requêtes que GSC nomme
individuellement (~8 % du trafic total, le reste étant anonymisé).

| Bloc de positions | Impressions | Clics | CTR |
|---|---|---|---|
| 1 à 3 | 396 | **0** | **0 %** |
| 4 à 10 | 1 725 | 31 | 1,8 % |
| 11 à 20 | 657 | 1 | 0,15 % |

Les positions 1 à 3 ne rapportent rien : 396 impressions, zéro clic. Ce sont des
requêtes de nom d'espèce auxquelles Google répond directement dans la SERP (« congre »
en position 2,25, « poisson barracuda » en position 2,04) : le classement n'y a aucune
valeur commerciale. L'essentiel du volume cliqué vit dans le bloc 4-10 (31 clics), et
le sprint vise à faire glisser une partie du bloc 4-10 (et surtout des requêtes
proches de 10, cf section 2) vers 3-6.

---

## Comment rejouer cette mesure à J+21 (≈ 07/09/2026)

1. **Mêmes fenêtres, mêmes sources.**
   - Section 1a : GSC/Supermetrics, `pathlevel1`, fenêtre glissante de 30 jours
     terminée au jour du relevé, `final_data=true` uniquement.
   - Section 1b : GSC/Supermetrics, `pathlevel1` par semaine calendaire.
   - Section 2 : GSC/Supermetrics, les 13 mêmes requêtes nommées, fenêtre glissante de
     28 jours terminée au jour du relevé.
   - Section 3 : la requête Supermetrics documentée ci-dessus, mêmes dimensions et
     métriques.
   - Section 4 : GSC/Supermetrics, répartition par bloc de positions sur le même
     échantillon de requêtes nommées.
2. **Le repère est la position, pas le volume.** Fin août fait mécaniquement baisser
   les impressions sur un site de pêche du bord (saisonnalité, cf
   `docs/audits/DIAGNOSTIC-SEO-2026-08-16.md`, Réserves d'honnêteté, et
   `docs/roadmaps/PLAN-CROISSANCE-SEO-2026-08-16.md`, Réserves d'honnêteté). Une
   position qui monte pendant que les impressions baissent reste un succès pour les
   Blocs 1 et 2. Ne pas comparer les volumes bruts à ce pic d'août : comparer à
   septembre 2025 si la donnée existe, sinon comparer les positions et les CTR, pas
   les impressions.
3. **Ne rien conclure avant J+21.** Le débit de découverte de Google est d'environ
   10 URL/jour (`docs/sprint-78/METRIQUES.md` §5) : un maillage nouveau ou un titre
   modifié met du temps à se refléter dans un nouveau classement.
