# Lot 16 — Bouches-du-Rhône (13) · Porte 2 : où la pêche est interdite

> Produit le **2026-08-19**, campagne `docs/contenu/curation-spots/BRIEF-CAMPAGNE-MED-2026-08-24.md`.
> **Livrable réutilisable pour TOUS les lots du 13.** Il se fait une fois, il sert ensuite à chaque lot.
> Coordonnées officielles : `coordonnees_gps_znp.pdf`, Parc national des Calanques, consulté le 19/08/2026.

---

## Verdict en trois lignes

1. **Deux spots du backlog sont DANS une zone de non-prélèvement.** Toute pêche y est interdite, en permanence et définitivement. Ce sont des rejets secs, sans discussion.
2. **Trente-trois autres sont à moins d'un kilomètre d'une ZNP, dont onze à moins de 300 m.** Depuis ces postes, un lancer normal tombe **dans** la zone interdite. C'est le vrai piège du département, et aucun nom de calanque ne le signale.
3. **Le secteur des calanques, c'est-à-dire la partie la plus recherchée du 13, est donc le plus risqué à publier.** Le premier lot rédigé doit partir de la Côte Bleue, de la Camargue et du nord de Marseille, pas d'En-Vau.

---

## 1. Les 7 zones de non-prélèvement, coordonnées officielles

Source : [Parc national des Calanques, coordonnées GPS des ZNP et ZPR](https://www.calanques-parcnational.fr/sites/calanques-parcnational.fr/files/atoms/files/coordonnees_gps_znp.pdf) (PDF), consulté le 19/08/2026. Reproduites telles quelles, en degrés et minutes décimales.

| ZNP | Sommets |
|---|---|
| **PLANIER / VEYRON** | 43°12,15'N 5°13,75'E · 43°13,21'N 5°17,53'E · 43°12,70'N 5°17,82'E · 43°11,62'N 5°14,33'E · 43°11,52'N 5°13,10'E |
| **RIOU / PODESTAT** | 43°10,57'N 5°21,93'E · 43°11,42'N 5°22,88'E · 43°12,57'N 5°22,93'E · 43°12,57'N 5°24,68'E · 43°11,15'N 5°24,87'E · 43°10,43'N 5°24,02'E · 43°10,27'N 5°23,65'E |
| **SORMIOU** (zone marine protégée Albert Falco) | 43°12,38'N 5°25,78'E · 43°12,50'N 5°25,88'E · 43°12,40'N 5°26,10'E · 43°12,33'N 5°25,92'E |
| **DEVENSON** | 43°12,28'N 5°28,22'E · 43°12,35'N 5°28,27'E · 43°12,27'N 5°28,85'E · 43°12,13'N 5°28,85'E |
| **POINTE CACAU** | 43°11,77'N 5°30,75'E · 43°11,85'N 5°30,58'E · 43°12,08'N 5°30,80'E · 43°12,03'N 5°31,00'E |
| **CAP SOUBEYRAN** | 43°11,47'N 5°32,67'E · 43°11,63'N 5°32,97'E · 43°11,17'N 5°33,48'E · 43°10,97'N 5°33,20'E |
| **CASSIDAIGNE OUEST** | 43°7,83'N 5°26,35'E · 43°6,55'N 5°28,63'E · 43°3,55'N 5°25,37'E · 43°4,72'N 5°23,00'E |

Et la **ZPR Tête de Cassidaigne Ouest** : 43°7,83'N 5°26,35'E · 43°9,17'N 5°27,80'E · 43°7,95'N 5°30,08'E · 43°6,55'N 5°28,63'E. Seule une liste limitative de navires professionnels aux petits métiers y est autorisée : **sans objet pour la pêche du bord**, mais à connaître.

**Ce qui est interdit dans une ZNP** : « toute sorte de prélèvement est interdite, de façon permanente et définitive, que ce soit pour la pêche professionnelle ou la pêche de loisir », à la seule exception de la recherche scientifique. Ce n'est **pas** une zone Natura 2000 ni une aire marine protégée ordinaire : c'est une interdiction totale.

Deux d'entre elles sont hors de portée d'un pêcheur du bord (**Planier** et **Cassidaigne Ouest** sont au large), une troisième est insulaire (**Riou**). Les quatre qui comptent pour nous sont **Sormiou, Devenson, Pointe Cacau et Cap Soubeyran**, toutes accolées au littoral.

Le test est outillé : `znp.mjs` (scratchpad) contient les polygones et un test point-dans-polygone, rejouable sur n'importe quel lot.

---

## 2. Les deux rejets secs

| Spot | Coordonnée | ZNP | Verdict |
|---|---|---|---|
| **Anse de la Baume** | 43.20419 / 5.47899 | DEVENSON | 🔴 `rejected` — dans la zone |
| **Anse des Enfers** | 43.20515 / 5.47450 | DEVENSON | 🔴 `rejected` — dans la zone |

Ces deux-là ne se publient pas, quel que soit leur intérêt halieutique.

---

## 3. Les 33 postes à moins d'un kilomètre d'une ZNP

★ **C'est le cœur de ce document.** Un poste situé hors de la zone reste légal, mais **le lancer, lui, tombe dedans**. À 100 m d'une limite, un surfcasting normal est un prélèvement en ZNP. La distance ci-dessous est mesurée du point au bord du polygone.

| Distance | Spot | ZNP la plus proche |
|---|---|---|
| **1 m** | Pointe de Cacau | POINTE CACAU |
| **13 m** | Crique des Morgerets | POINTE CACAU |
| **29 m** | Pointe du Vaisseau | RIOU/PODESTAT |
| **56 m** | Pointe de l'Arche | DEVENSON |
| **84 m** | Calanque de la Piade | RIOU/PODESTAT |
| **89 m** | Anse de Lume | SORMIOU |
| **118 m** | Calanque de Podestat | RIOU/PODESTAT |
| **150 m** | Calanque du Devenson | DEVENSON |
| **207 m** | Calanque des Queyrons | RIOU/PODESTAT |
| **220 m** | Le Paridiou | DEVENSON |
| **231 m** | Cap Câble | POINTE CACAU |
| **262 m** | Calanque de l'Escu | RIOU/PODESTAT |
| **293 m** | Pointe d'En-Vau | POINTE CACAU |
| **299 m** | Calanque de Port-Pin | POINTE CACAU |
| 309 à 360 m | Calanque Longue · Calanque du Cancèou · Anse de la Melette · Calanque de Cortiou · Plage de Port Pin · Calanque de l'Œil de Verre | SORMIOU / RIOU / POINTE CACAU / DEVENSON |
| 539 à 941 m | Plage Bleue · Pointe de la Buse · Pointe de Merveille · Anse du Petit Soldat · Pointe du Figuier · Pointe de Castelvieil · Pointe de l'Ilot · Calanque d'En-Vau · Pointe de la Cride · Calanque de Marseilleveyre · Queyrons · Anse de la Figuière · Creux de l'Oule | diverses |

**Règle de la campagne, VALIDÉE PAR JOHN le 19/08/2026** :

- **moins de 300 m d'une ZNP → reste `pending`.** Le lancer tombe dedans, on ne peut pas écrire une fiche honnête sans dire « ne pêche pas vers le large », ce qui vide le poste de son sens. Onze spots sont dans ce cas.
- **300 m à 1 km → publiable, mais la fiche DOIT nommer la ZNP** et sa direction dans `access_notes`. Sans cette mention, la fiche envoie pêcher dans une zone interdite sans le dire.
- **plus d'1 km → pas de contrainte ZNP**, les règles générales du parc s'appliquent quand même (section 4).

---

## 4. Les règles générales, sourcées

Elles s'appliquent à toutes les fiches du 13 situées dans le Parc national des Calanques, et doivent être reflétées dans la copie sans être inventées.

| Règle | Contenu | Source |
|---|---|---|
| **Quota** | **7 kg par personne et par jour**, dans la limite de 20 kg par jour et par bateau pour les embarqués | [Pêche de loisir, PN Calanques](https://www.calanques-parcnational.fr/fr/node/11400/printable/print) |
| **Marquage** | **Découpe obligatoire de la nageoire caudale de toutes les prises de plus de 15 cm** | idem |
| **Déclaration** | Obligatoire depuis le **12 février 2024** pour les pêcheurs de loisir de plusieurs aires marines protégées, via la plateforme CatchMachine | [Réglementations en mer](https://www.calanques-parcnational.fr/fr/node/11383/printable/print) |
| **Chasse sous-marine** | 12 prises maximum par jour | Pêche de loisir |

### ★ La réserve marine des enfants (La Ciotat) : deux spots à rejeter

**Depuis avril 2025, la pêche du bord et la pêche sous-marine sont interdites au Mugel** ([Réglementations en mer](https://www.calanques-parcnational.fr/fr/node/11383/printable/print)). Deux spots du backlog sont concernés :

| Spot | Coordonnée | Verdict |
|---|---|---|
| **Anse du Grand Mugel** | 43.16539 / 5.60799 | 🔴 `rejected` — pêche du bord interdite |
| **Plage Calanque du Grand Mugel** | 43.16601 / 5.60581 | 🔴 `rejected` — pêche du bord interdite |

C'est une interdiction qui vise **explicitement la pêche du bord**, donc exactement notre périmètre. Elle ne serait jamais sortie d'un test de polygone : elle vient d'un arrêté récent, et il fallait la chercher.

---

## 5. La Côte Bleue : deux cantonnements de pêche, et le secteur reste ouvrable

Le parc marin de la Côte Bleue gère **deux réserves intégrales** où « l'exercice de la pêche maritime sous toutes ses formes est interdit » (article 3) : **Carry-le-Rouet** (85 ha) et **Cap Couronne** (210 ha), renouvelées par l'**arrêté du 1er juillet 2014**, sans date d'échéance.

Coordonnées de l'arrêté, WGS 84, degrés et minutes décimales ([texte sur AIDA/INERIS](https://aida.ineris.fr/reglementation/arrete-010714-portant-renouvellement-cantonnements-peche-devant-communes-carry-rouet)) :

| Cantonnement | Sommets |
|---|---|
| **Carry-le-Rouet** | 43°19,656'N 5°09,382'E · 43°19,535'N 5°09,345'E · 43°19,147'N 5°09,641'E · 43°19,382'N 5°10,400'E · 43°19,692'N 5°10,130'E |
| **Cap Couronne** (Martigues) | 43°19,371'N 5°03,083'E · 43°19,523'N 5°03,652'E · 43°18,615'N 5°04,121'E · 43°18,717'N 5°02,679'E |

**Résultat du test sur 22 spots de la Côte Bleue : aucun n'est dans une réserve.** Le secteur est donc bien le bon point de départ du département, contrairement aux calanques.

| Verdict | Spots |
|---|---|
| **< 300 m → reste `pending`** | Calanque du Cap Rousset · Calanque des Bouchons |
| **300 m à 1 km → publiable, mention obligatoire** | Plage des Agoutaou (357 m) · Anse de la Couronne Vieille (366 m) · Plage Fernandel (437 m) · Anse de la Baumaderie (455 m) · Anse du Verdon (728 m) · Plage du Rouet (775 m) · Anse de Ste-Croix (777 m) · Port de Ste Croix (974 m) |
| **> 1 km → aucune contrainte de cantonnement** | Plage du Verdon · Plage de la Saulce · Plage de Carro petite plage · Plage de la Roselière · Calanque des Eaux Salées · Calanque du Puits · Calanque de la Tuilière · Calanque Madrague de Gignac · Calanque La Redonne · Calanque des Anthénors · Calanques de Méjean · Calanque de Figuières |

★ À noter : la même règle des 300 m s'applique, mais **la raison est différente des ZNP**. Ici l'interdiction vient d'un arrêté ministériel et préfectoral de cantonnement, pas du décret du parc national. Les deux se cumulent sur le littoral du 13 et il faut tester contre les deux jeux de polygones, pas l'un ou l'autre.

---

## 6. Ce que je n'ai pas pu établir

À dire plutôt qu'à combler :

- **Les tailles minimales de capture spécifiques à la Méditerranée** (loup, dorade royale, sar, oblade, marbré, barracuda, liche, congre, mulet, calmar) ne sont pas données par les pages consultées. Le parc renvoie à la réglementation nationale sans la reproduire. À croiser avec `lib/especes/content/*.ts` (champ `regulation`) avant d'écrire quoi que ce soit sur les tailles dans une fiche du 13.
- **Les sources de pêche locales** (décision 42 du playbook : guides locaux, forums, clubs) n'ont pas été rassemblées. La recherche a été interrompue par une limite de session. **C'est le préalable à la rédaction des fiches**, pas à leur sélection : sans elle, on ne peut pas écrire d'espèces ni d'accès sourcés sans inventer.
- **Port-Cros et Porquerolles (83)** : hors périmètre de ce document, à traiter quand le Var s'ouvrira.
- Aucune contradiction relevée avec le moteur de réglementation du repo, faute d'avoir pu le croiser.

---

## 6. Conséquence pour la composition des lots du 13

Le brief prévoyait un premier lot « 25 spots, ordre de notoriété ». **L'ordre de notoriété mène droit dans les calanques, donc droit dans le problème.** Ordre recommandé à la place :

1. **Côte Bleue** (Carry, Sausset, Le Rouet, Méjean, La Redonne, Ensuès, Carro, Cap Couronne) — sous réserve du zonage à vérifier.
2. **Camargue et golfe de Fos** (Beauduc, Faraman, Piémanson, Carteau, Napoléon, Port-Saint-Louis) — aucune ZNP, surfcasting réputé.
3. **Marseille nord** (L'Estaque, Saumaty, Corbière, La Lave, La Batterie, Mourepiane) — hors parc.
4. **Marseille corniche et sud urbain** (Catalans, Endoume, Malmousque, Pharo, Prophète, Roucas Blanc, Borély, Pointe Rouge, Montredon) — hors ZNP, à vérifier au cas par cas.
5. **Les calanques en dernier**, avec la mention ZNP obligatoire, et seulement au-delà de 300 m.

Ce n'est pas un contournement : c'est l'ordre qui permet de publier vite ce qui est sûr, et de garder pour la fin ce qui demande une précaution rédactionnelle particulière.

---

## 7. Les 13 fiches publiées — batch `S89-MED-13-01`

Écrites après validation des deux portes, sur le secteur **Côte Bleue** uniquement, comme le recommande la section 6. Toutes en `source='imported'`, `verified=false`, `geom` non modifiée.

| Fiche | Commune | Structure | Diff. | ZNP / cantonnement |
|---|---|---|---|---|
| Plage du Verdon | Martigues | plage | 2 | 1 056 m du Cap Couronne, mentionné |
| Plage de la Saulce | Martigues | plage | 2 | 1 100 m, mentionné |
| **Petite plage de Carro** | Martigues | plage | 2 | 1 184 m |
| Plage des Agoutaou | Martigues | plage | 2 | ⚠️ **357 m**, mention obligatoire |
| Anse de la Couronne Vieille | Martigues | pointe_rocheuse | 3 | ⚠️ **366 m**, mention obligatoire |
| Plage Fernandel | Carry-le-Rouet | plage | 1 | ⚠️ **437 m**, mention obligatoire |
| Plage du Rouet | Carry-le-Rouet | plage | 2 | ⚠️ **775 m**, mention obligatoire |
| Calanque de la Tuilière | Carry-le-Rouet | pointe_rocheuse | 3 | 1 210 m |
| Calanque des Eaux Salées | Carry-le-Rouet | pointe_rocheuse | 3 | 1 291 m |
| Calanque du Puits | Carry-le-Rouet | pointe_rocheuse | 3 | 1 604 m |
| Calanque de Figuières | Ensuès-la-Redonne | pointe_rocheuse | 3 | 3 116 m |
| Calanques de Méjean | Ensuès-la-Redonne | pointe_rocheuse | 3 | 3 729 m |
| Plage de la Roselière | Sausset-les-Pins | plage | 2 | 2 398 m |

**Communes obtenues par géocodage inverse Nominatim**, pas déduites du nom OSM (règle du playbook). Trois spots du secteur (Madrague de Gignac, La Redonne, Anthénors) n'ont pas rendu de commune et **restent `pending`** plutôt que d'être rattachés à vue.

**Un renommage** : « Plage de Carro petite plage » (libellé OSM bancal) devient « **Petite plage de Carro** ». Fait **avant** approbation, le slug reste stable.

### Sources de la matrice espèces

Aucune espèce n'est inventée. Le secteur est documenté ainsi :

- **Carry-le-Rouet** : dorade royale, loup et calmar sont les espèces les plus recherchées ([ComptoirDesPêcheurs](https://comptoirdespecheurs.com/France/coin-de-peche/678-peche-Carry-le-Rouet)).
- **Sausset-les-Pins** : le port débarque loup, dorade, sar, mulet, poulpe et seiche ([ville de Sausset](https://ville-sausset-les-pins.fr/tourisme/flaner-a-sausset__trashed/parc-marin-de-la-cote-bleue/)).
- **De Carro à l'Estaque** : fonds rocheux avec plaques d'herbier, sable et sorties de port ; captures dominantes = poissons de roche, calmar, loup et sparidés ([Parc marin de la Côte Bleue](https://parcmarincotebleue.fr/activites-maritimes/)).
- **Tailles minimales Méditerranée** relevées au passage : **loup 25 cm, dorade royale 20 cm**.

### Contrôles post-lot

| Contrôle | Résultat |
|---|---|
| Descriptions toutes distinctes | ✅ 13 / 13 |
| `access_notes` toutes distinctes | ✅ 13 / 13 |
| Longueur description (300-450) | ✅ 305 à 362 |
| Longueur access_notes (120-250) | ✅ 173 à 196 |
| Espèces 4 à 7 | ✅ 13 / 13 |
| Hazards 2 à 4, vocabulaire fermé | ✅ 13 / 13 |
| Aucun tiret cadratin | ✅ 0 |
| `verified` resté false, `source` inchangée | ✅ 0 anomalie |
| Rendu live `/spots/[slug]` | ✅ 3 testées, HTTP 200 |
| Présence au sitemap | ✅ **13 / 13**, et **1 158 → 1 171 URLs, soit +13 exactement** |
| Les 4 rejets absents du sitemap | ✅ 4 / 4 |

★ **Aucune fiche ne parle de marée, de coefficient ni d'étale.** La Méditerranée est hors du moteur de marées du projet, et c'est l'erreur la plus facile à commettre en recopiant le ton des fiches bretonnes. Le créneau s'y joue sur le mistral, la lumière et la saison.

**Compteurs du 13 après ce lot** : 278 → **261 pending**, 10 → **14 rejected**, 36 → **49 publiées**. Base entière : **624 fiches publiées**.

---

## 8. Second lot — batch `S89-MED-13-02`, Camargue et golfe de Fos

8 fiches de plus, sur le secteur suivant recommandé par la section 6. **Aucune ZNP ni cantonnement du parc des Calanques ici** : la réglementation est différente et il a fallu la chercher séparément.

### La Porte 2 de la Camargue, sourcée

| Règle | Contenu | Source |
|---|---|---|
| **Cantonnement du golfe de Beauduc** | créé en **2013**, délimité par **6 balises jaunes**, « interdiction de toute forme de pêche et interdiction de dragage, mouillage et plongée ». Il est **au large**, pas au rivage : la pêche du bord reste légale sur la plage | [PNR de Camargue, en milieu marin](https://www.parc-camargue.fr/en-milieu-marin.html) |
| **Sternes, pointe de Beauduc** | d'**avril à septembre**, ne pas s'installer à proximité de l'exclos de nidification (piquets de ganivelles) | idem |
| **Marquage** | section de la partie inférieure de la nageoire caudale pour la majorité des espèces pêchées en Méditerranée | idem |
| **Destination des captures** | consommation exclusive du pêcheur et de sa famille | idem |

★ **Le cantonnement de Beauduc ne se traite pas comme une ZNP des Calanques.** Il est situé au large, donc hors de portée d'un lancer depuis le bord : la règle des 300 m ne s'y applique pas. Deux régimes différents sur le même département, encore une fois.

### Les 8 fiches

| Fiche | Commune | Diff. | Particularité portée par la fiche |
|---|---|---|---|
| Pointe de Beauduc ou du Sablon | Arles | 4 | sternes du 1er avril au 30 septembre, aucun secours |
| Phare de Beauduc | Arles | 4 | cantonnement au large, 6 balises jaunes |
| Phare de Faraman | Arles | 4 | isolement, pistes des salins |
| Pointe de Capeau | Arles | 4 | trait de côte mouvant, piste impraticable après la pluie |
| Pointe de Saint-Raymond | Arles | 4 | aucun repère, aucun secours |
| **Plage de Piémanson** | Arles | 2 | courant du Rhône, baïnes |
| **Plage Olga** | Port-Saint-Louis-du-Rhône | 2 | courants d'embouchure |
| Plage de la Goule | Saintes-Maries-de-la-Mer | 3 | secteur exposé, montée du vent |

**Deux renommages**, faits avant approbation : « Zone naturiste de la plage de Piémanson » devient **« Plage de Piémanson »** (le libellé décrivait une sous-zone, pas le poste), et « PLage Olga » devient **« Plage Olga »** (coquille de casse dans l'import).

### ★ Trois spots écartés par la Porte 3, et c'est elle qui les a trouvés

| Spot | Motif | Reste |
|---|---|---|
| **Plage Napoléon** (`osm155285163`) | doublon de la fiche curée **« Port-Saint-Louis — plage Napoléon »** déjà publiée, à 1,4 km, même commune, même toponyme | `pending`, décision de merge à prendre |
| **Anse de Carteau** | même famille de toponyme que **« Carteau »**, déjà publiée à 1,9 km dans la même commune | `pending`, décision de merge à prendre |
| **Phare de la Gacholle** | sur la digue à la mer, **dans la réserve naturelle nationale de Camargue**. Aucune source ne confirme que la pêche du bord y est autorisée | `pending` — le doute ne se publie pas |

C'est exactement le défaut que le lot S78 avait laissé passer : des homonymes qui se cannibalisent. Le contrôle contre les fiches déjà publiées l'attrape.

### Contrôles post-lot

| Contrôle | Résultat |
|---|---|
| Descriptions et accès tous distincts | ✅ 8 / 8 et 8 / 8 |
| Longueurs (300-450 / 120-250) | ✅ 307 à 337 · 169 à 220 |
| Espèces 4-7, hazards 2-4 | ✅ 8 / 8 |
| **Aucune mention de marée, coefficient ou étale** | ✅ **0** (test SQL explicite) |
| Aucun tiret cadratin | ✅ 0 |
| `verified` / `source` intacts | ✅ 0 anomalie |
| Sitemap | ✅ **8 / 8**, 1 171 → **1 179 URLs**, +8 exactement |
| Les 3 écartés absents du sitemap | ✅ 3 / 3 |

---

## 9. Porte 1 — test « en mer », déjà passé

45 candidats testés à Open-Meteo Marine le 19/08 : **45 en mer, 0 écarté** (houle sur 24 h sur les 45).

★ Comme au Bloc D du sprint 89, **ce test n'a rien discriminé**. C'est un filtre grossier qui vérifie qu'un point tombe dans une maille marine, pas qu'il est un poste de pêche. Sur un littoral découpé comme celui du 13, il passe partout. **Le filtre qui trie réellement ici, c'est la Porte 2.** À garder en tête pour ne pas se croire couvert par la Porte 1.
