# Lot 13 — Audit du ré-import massif (2026-08-08)

> **Ce lot n'est PAS un lot éditorial.** La recherche web était indisponible (quota de session atteint), et le playbook §4 fait de la recherche l'étape qui décide du verdict. Publier 20 fiches `light` sur les plages les plus notoires du Morbihan aurait grillé le meilleur du backlog en thin content, exactement ce que le garde-fou §3 interdit. Le lot éditorial est donc reporté au run suivant, et la session a été réaffectée à l'audit du ré-import, qui n'avait jamais eu sa passe de relecture en base.

---

## 1. Fait nouveau majeur : le ré-import est inséré

Vérifié en SQL live : **3 400 lignes `source='imported'` créées le 2026-08-08**, dernière à 16h11 UTC. Ce ne sont pas seulement les deux fichiers connus (`04-56` et `05-vides`) : **les 24 départements ont été ré-importés**.

Conséquence directe sur la stratégie : **le blocage du 56 est levé**, et les 4 départements jamais importés (85, 06, 2A, 2B) ont désormais du backlog. Le tableau de couverture de `LOTS.md` est entièrement périmé et a été réécrit.

| | Avant (07/08) | Après (08/08) |
|---|---|---|
| Backlog `pending` | 624 | **4 069** |
| Total spots en base | 1 160 | **4 605** |
| 56 : spots de structure `plage` | 0 | **191** |
| Départements à backlog nul | 4 (85, 06, 2A, 2B) | **0** |

Le niveau 2 du playbook §9.1 (plages et grandes anses nommées), **jamais traité sur aucun département**, est donc ouvert. C'était la condition posée au lot 12 pour reprendre le 56.

## 2. Contrôles qui passent ✅

Sur les 4 069 `pending` :

- **0 coordonnée arrondie à 2 décimales.** La règle issue de l'incident du 06/08 tient : aucune position saisie à la main n'est entrée.
- **0 nom commençant par « Ponton »** (décision 14) et **0 nom d'une seule lettre ou de moins de 3 caractères**. Le filtre `isInvalidName` du script a bien tourné.
- **0 débordement de bbox sur le 56** : les 372 `pending` du Morbihan tiennent tous entre 47.30 et 47.77 N, 3.53 et 2.44 O. Les 42 lignes de la presqu'île guérandaise réassignées au 44 à la relecture du lot 8 ne sont pas revenues.
- **Correctif `out geom` visible** : les plages sont bien positionnées sur l'objet, pas au centre de leur boîte englobante.

## 3. Anomalies trouvées 🔴 (aucune corrigée : elles demandent un arbitrage)

### 3.1 — 35 spots du Marais poitevin rattachés au 85 (hors périmètre)

Le tag `natural=beach` et les ouvrages de digue ont ramassé les embarcadères du **Marais poitevin**, en eau douce, à 40 à 60 km de la mer : « Port de Irleau », « Port du Vanneau », « Port de l'Abbaye », « Port de Sainte-Christine », « Port de St Georges de Rex », « Levée du Bois Dieu », « Digue du Marais Bas »… La longitude maximale du 85 monte à **-0,612**, soit la région de Fontenay-le-Comte.

CLAUDE.md §15 exclut explicitement l'eau douce de la v1. **Verdict proposé : `rejected`, raison « hors périmètre v1, eau douce (Marais poitevin) ».** 35 lignes sur les 184 du 85, soit 19 % du backlog du département.

### 3.2 — 13 spots rattachés au 22 mais situés en Ille-et-Vilaine (35)

Anomalie de rattachement départemental, traitée selon la consigne : **signalée, pas corrigée**. Il s'agit de la Rance et du pays malouin.

| Spot | Réalité géographique |
|---|---|
| Digue de Rochebonne | Saint-Malo |
| Pointe de la Vicomté, Pointe de la Briantais, Pointe du Coudray, Pointe de Cancaval, Pointe de l'Aiguille, Pointe de la Jument, Pointe de la Brebis, Pointe Béchard, Pointe des Corbières | estuaire de la Rance (Dinard, Saint-Suliac, La Richardais) |
| Cale de Dinan, Cale de Taden, Cale du Bas Bout | Rance en amont, Dinan et Taden |

Tous ont une longitude supérieure à **-2,05**, alors que la côte des Côtes-d'Armor s'arrête à l'ouest de cette valeur. Deux sous-cas à distinguer si tu donnes un GO : les spots de la Rance maritime relèvent bien du 35, mais **Dinan et Taden sont en amont de l'écluse du Châtelier**, donc en eau douce, donc hors périmètre comme le 3.1.

⚠️ Le 22 est le prochain département de la vague 1. Cette correction est à trancher **avant** de l'ouvrir, sinon la curation écrira des fiches bretonnes nord sous le mauvais département.

### 3.3 — 9 spots situés en Italie, rattachés au 06

« Spiaggia del Darsenún », « Spiaggia di Capo Mortola », « Punta Garavano », « Plage Hawaï », « Plage du Casino », « Plage du Marché », « Plage Rondelli », « Plage du Buse », « Plage des Sablettes » : la bbox du 06 déborde la frontière et ramasse **Vintimille et Grimaldi**. Les toponymes italiens ne laissent aucun doute.

**Verdict proposé : `rejected`, raison « hors France (Ligurie) ».**

### 3.4 — 3 spots de la réserve de Scandola rattachés au 2A

« Baie d'Elbo », « Marina d'Elbo », « Cala di Ficaccia » sont au nord de 42,36 N, donc en **Haute-Corse (2B)**, sur la commune d'Osani. Double motif d'exclusion : mauvais département **et** réserve naturelle intégrale de Scandola, où l'accès et la pêche sont réglementés. **Verdict proposé : `rejected`**, sans même trancher le département.

### 3.5 — 49 noms d'équipement portuaire

Prolongement direct des décisions 14 et 27. Ce sont des quais d'exploitation, pas des postes ouverts à la ligne : « Quai de Normandie » et « Quai de France » (terminal ferry de Cherbourg), « Quai des croisières fluviales » (17), « Quai du Maroc » (Sète, commerce), « Quai n°1 », « Quai n°2 », « Quai n°3 », « Quai n°6 », « Quai nul », « Quai est », « Quai sud », « Quai nord », « Slipway »…

Répartition : 06 (10), 34 (7), 29 (7), 22 (5), 17 (4), 50 (4), 83 (3), 66 (3), 13 (2), 2B, 56, 59, 85 (1 chacun).

**Verdict proposé : `rejected` en masse**, avec une exception à examiner au cas par cas quand le département sera ouvert : « Quai des Pêcheurs » (06) et « Quai Saint-Laurent » (29) peuvent désigner de vrais postes. Le filtre `isInvalidName` du script mérite d'être durci sur le préfixe « Quai » suivi d'un numéro ou d'un nom propre.

### 3.6 — 5 spots d'eau douce ou de bassin

« Étang de la Dame » (13), « Étang du Hénant » (29), « Plage du Lac Marin » (40), « La Piscine » (06), « Dieppe - plage de la piscine » (76). Hors périmètre, sauf à vérifier que l'étang de la Dame est bien une lagune saumâtre reliée à la mer.

## 4. Audit géographique des fiches déjà publiées : non concluant par cette méthode

`LOTS.md` demandait de rejouer sur le 29 l'audit qui avait attrapé la « Pointe du Bile » (fiche décrivant une commune située 12 km plus loin). Le croisement par homonymie de nom entre les 162 fiches publiées et les 4 069 objets OSM du ré-import **ne trouve que 2 correspondances sur 83 pour le 29, et 0 sur 79 pour le 56**.

L'explication est mécanique et rassurante : le `NOT EXISTS ST_DWithin(150 m)` du script a écarté à l'insertion tout objet proche d'un spot existant. Un objet OSM correctement placé face à une fiche correctement placée ne rentre donc jamais en base, et ne peut plus servir de témoin. Les 2 correspondances restantes (« Pointe du Diable » à 1 027 km, « Pointe du Château » à 85 km) sont de simples homonymes d'autres départements, sans valeur de contrôle.

**Conclusion honnête : cet audit ne remonte aucune anomalie, mais il ne prouve rien non plus.** Le contrôle de position des fiches publiées doit passer par une autre voie, et la piste déjà notée reste la bonne : soumettre les coordonnées à Open-Meteo Marine, qui renvoie une erreur sur un point terrestre. C'est un test exhaustif, automatisable, et il couvrirait aussi les 4 069 `pending` avant curation.

## 5. Contrôles de proximité posés sur le lot 13 éditorial (à réutiliser)

La sélection des plages du 56 avait été faite et passée au contrôle de proximité (décision 20) avant que la recherche ne tombe. Le travail est conservé pour le run suivant :

| Candidat | Plus proche spot publié | Verdict de proximité |
|---|---|---|
| Plage de Locmaria (Groix) | Jetée de Locmaria @ **285 m** | **merge** : la fiche publiée décrit déjà « une plage incurvée de 530 mètres orientée plein sud » |
| Plage de Kervoyal | Pointe de Kervoyal @ **311 m** | **merge** : même toponyme, même anse, fiche existante qui traverse l'anse |
| Plage de Saint-Colomban | Pointe Saint-Colomban @ 467 m | **merge** : la fiche publiée couvre déjà explicitement le surfcasting sur le sable de la baie |
| Plage de Bétahon | Pointe de Pen Lan @ 678 m | à garder, postes distincts |
| Plage de Kerbihan | Pointe de Kerbihan @ 671 m | à garder, postes distincts |
| Plage de Port Mélite | Pointe du Spernec @ 659 m | à garder, postes distincts |

Deux doublons internes au ré-import, à trancher au lot éditorial : **« Plage de Donnant » en double** (858194051 et 858194052, 484 m d'écart, même plage de Bangor) et **« Plage de Kerhilio » / « plage de Kerhillio »** (1504434651 et 12118350560, 213 m d'écart, deux graphies du même poste d'Erdeven). Garder une ligne par poste, rejeter l'autre en doublon d'import.

## 6. Ce qui est écrit en base ce jour

**Rien.** Aucun UPDATE, aucun DDL, aucun rejet. Les anomalies du §3 sont toutes réversibles et sans urgence : les 4 069 lignes sont en `pending`, donc masquées de la carte, des fiches, de `nearby` et du sitemap. Elles ne salissent rien côté produit tant qu'elles ne sont pas curées.

## 7. Ce qu'il faut de John

1. **GO sur les rejets du §3.1, §3.3, §3.4, §3.6** (52 lignes hors périmètre ou hors France). Sans arbitrage contraire, ils seront appliqués au prochain run.
2. **Arbitrage sur le §3.2** (13 spots du 22 qui sont en 35) : réassigner `department`, ou rejeter les 3 spots d'eau douce et réassigner les 10 autres. À trancher **avant d'ouvrir le 22**.
3. **Confirmation du §3.5** (49 quais d'exploitation) et, si tu veux éviter que ça revienne, durcissement du filtre à l'import.
