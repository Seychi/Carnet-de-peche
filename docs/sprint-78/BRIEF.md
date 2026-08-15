# Brief — Plus de trafic, plus de comptes

> Rédigé le 2026-08-14 au soir, après la QA du sprint 77 en production.
> Tous les chiffres viennent d'une mesure faite ce soir : SQL live sur la production,
> DNS, ou navigateur. Aucun n'est repris de mémoire d'un brief précédent.
> À lire avec `QA-AUDIT-2026-08-14.md`, dont ce brief reprend les correctifs en Bloc 1.

---

## Objectif en une phrase

Faire passer le site de **416 pages qui rankent** à un inventaire d'un ordre de
grandeur au-dessus, **sans ajouter une seule page mince**, et débloquer les quatre
verrous mécaniques qui empêchent aujourd'hui le tunnel d'inscription de convertir ce
trafic.

---

## Le constat, en chiffres mesurés ce soir

### Ce qui marche

| Repère | Valeur | Commentaire |
|---|---|---|
| Clics Google / semaine | **691**, +153 % | Le moteur d'acquisition fonctionne |
| CTR `/spots` | **7,4 %** à la position 7,4 | Au-dessus de la moyenne de la position |
| Fiches de spots approuvées | **416**, sur 24 départements | 414 ont une description, 416 ont des espèces |
| Maillage interne | 97,6 % des fiches reçoivent un lien | Réparé au sprint 77 |
| Pages programmatiques `/peche/{espèce}/{technique}/{dépt}` | système déjà en place | Actif, avec garde anti-thin-content |

### Où est le plafond

| Fait mesuré | Chiffre | Ce que ça veut dire |
|---|---|---|
| Spots **en attente** de curation | **4 018** *(+ 171 rejetés)* | ~10× l'inventaire actuel dort |
| …dont avec une description | **3 sur 4 018** | Ce n'est pas un backlog à approuver, c'est du contenu à fabriquer |
| …dont avec des espèces renseignées | **9 sur 4 018** | Idem |
| Fiches **sans aucune prise déclarée** | **413 sur 416** | Les fiches n'ont aucune matière fraîche et unique |
| Spots avec au moins une prise publique | **3** | La preuve sociale n'existe pas |
| CPU Vercel | 7 h 34 consommées / 4 h incluses | Et des **503 servis aux crawlers** |
| Comptes | **45** au total, 16 / semaine | 42 onboardés |
| **Abonnés payants** | **4** | 3 `itinerant` + 1 `local` datent de mai ; 1 essai `local` le 10/08 |
| Emails d'auth | **en indésirables** | Cf QA §1.8 |
| Apex `carnet-de-peche.com` | répond **200** | Pas de 301 vers `www` |

### Le déséquilibre géographique, qui n'avait pas été chiffré

| Zone | Approuvés | En attente | Ratio |
|---|---|---|---|
| **Bretagne** (56, 29, 22, 35) | **237** *(57 % du site)* | 1 416 | 1 pour 6 |
| **Méditerranée** (83, 13, 06, 2A, 2B, 66, 34, 30, 11) | **80** *(19 %)* | **1 647** | **1 pour 21** |
| Atlantique hors Bretagne (17, 44, 85, 33, 40, 64, 50) | 82 | 856 | 1 pour 10 |
| Manche / Nord (14, 62, 76, 59) | 18 | 169 | 1 pour 9 |

Les cas extrêmes valent d'être nommés : le **Var (83) a 11 fiches pour 448 en
attente**, les **Bouches-du-Rhône (13) 11 pour 313**, la **Corse-du-Sud (2A) 9 pour
375**. Ce sont, en France, parmi les zones où la pêche du bord est la plus pratiquée
et la plus touristique, et où la saison dure toute l'année.

---

## L'ordre de ce brief est contraint, il ne se réarrange pas

**On ne peut pas ajouter de pages tant que Google reçoit des 503.** Le budget de
crawl est déjà en déficit (7 h 34 de CPU pour 4 h incluses), et l'apex non redirigé
fait crawler chaque page **deux fois**. Publier 4 000 fiches dans cet état, c'est les
publier pour qu'elles ne soient pas explorées — et aggraver la facture.

**Et on ne peut pas approuver l'inventaire tel quel.** 3 descriptions sur 4 018 : ce
sont des coquilles. Les approuver produirait 4 000 pages minces d'un coup, ce qui est
le meilleur moyen connu de faire chuter la qualité perçue de tout un domaine — y
compris des 416 fiches qui rankent aujourd'hui à 7,4 %.

D'où : **Bloc 0 (le plafond) → Bloc 1 (le tunnel qui ne convertit pas) → Bloc 2
(l'usine à contenu) → le reste.**

---

## Bloc 0 — Lever le plafond de crawl (prérequis absolu)

Sans ce bloc, tout le reste du brief est du travail publié dans le vide.

### Tâches

1. **301 apex → www** dans Vercel (`Settings → Domains`, marquer `www` comme
   principal). Aujourd'hui chaque URL du site existe sur deux hôtes : autorité
   diluée, crawl doublé. C'est un réglage, pas du code.
   ⚠️ Vérifier ensuite que les **Redirect URLs** de Supabase Auth et la **Site URL**
   suivent, sinon les liens d'auth cassent (cf `supabase/email-templates/README.md`).
2. **Instruire la question des 503.** Relever dans GSC `Paramètres → Statistiques
   d'exploration` le taux de réponses non-200 sur 30 jours, et dans Vercel la
   répartition CPU par route. Le suspect n°1 est `/spots` : **1,42 Mo de HTML**, 416
   fiches rendues en une passe, 68 459 px de haut.
3. **Trancher la question Vercel Pro.** Elle est reportée depuis le sprint 76. Elle
   ne l'est plus : elle conditionne tout ce brief. Soit on paie le palier, soit on
   réduit le coût de rendu de `/spots`, mais on ne peut plus ne pas décider.
4. **Brancher Supabase Auth sur Resend en SMTP personnalisé**, ajouter Resend au SPF
   et un `rua` au DMARC (cf QA §1.8). Trois flux du sprint 77 en dépendent.

### Critères d'acceptation

- `curl -I https://carnet-de-peche.com/` renvoie **301** vers `https://www.…`.
- Taux de non-200 servis aux robots **relevé et consigné**, avec sa cause identifiée.
- Un lien magique envoyé à une adresse Gmail neuve arrive **en boîte de réception**.
- `dig TXT carnet-de-peche.com` contient Resend ; `_dmarc` contient un `rua`.

### Garde-fous

- ⚠️ Ne pas publier une seule fiche nouvelle avant que le taux de 503 soit connu.
- Le 301 change l'hôte canonique : vérifier que le sitemap, les canonicals et les
  liens d'auth pointent tous vers **le même** hôte après bascule.

---

## Bloc 1 — Les quatre correctifs qui débloquent le sprint 77

Détail complet, preuves et correctifs dans `QA-AUDIT-2026-08-14.md`. Résumé :

| # | Défaut | Effet | Effort |
|---|---|---|---|
| 1 | Les 3 CTA « Loguer une prise » d'une fiche pointent vers `/auth/login`, jamais vers `/carnet/nouvelle?spot_id=…` | **Le Bloc 7 du sprint 77 est inatteignable** | 1 ligne × 3 |
| 2 | Le champ date naît invalide (`value` local > `max` UTC figé par le SSR) | **Le formulaire de prise ne peut pas être soumis** au chargement, en France, connecté ou non | 3 lignes |
| 3 | Le bandeau cookies recouvre 83 % du CTA collant et le rend incliquable | Le CTA principal est mort pour **tout nouveau visiteur** | CSS |
| 4 | `/auth/register` ne rappelle pas le brouillon en attente | Perte au dernier mètre | ~10 lignes |

**Ce bloc ne se sacrifie jamais.** Une demi-journée, et c'est la différence entre un
sprint 77 qui produit son effet et un sprint 77 qui n'en produit aucun.

---

## Bloc 2 — L'usine à fiches : transformer 4 018 coquilles en pages qui méritent d'exister

C'est le bloc le plus lourd et le plus rentable. **C'est aussi celui où on peut faire
le plus de dégâts**, donc il est cadré serré.

### Le principe

Une fiche ne se publie que si elle apporte quelque chose qu'aucune autre page du web
n'apporte. On dispose déjà, sans rien inventer, de : la position et le type de poste
(OSM), les espèces plausibles par façade et par saison, les marées calées SHOM, la
météo, le score du jour, les spots voisins, et la réglementation (mailles).
**Assemblés, ces éléments font une fiche unique par construction.** Ce qui manque
n'est pas la donnée, c'est la rédaction.

### Tâches

1. **Écrire un générateur de fiche** qui, pour un spot en attente, produit
   description, accès, dangers et espèces à partir des données existantes — jamais
   d'affirmation non sourcée. Réutiliser la discipline de `lib/especes/seo.ts` :
   fonctions pures, dégradation propre quand une donnée manque, aucune invention.
2. **Poser une porte de qualité automatique** avant publication. Un spot ne passe que
   si : coordonnées valides et en mer/sur le littoral, type de poste identifié, au
   moins 2 espèces plausibles, description ≥ 400 caractères, marées calculables, et
   **pas de doublon à moins de 150 m** d'un spot déjà approuvé.
3. **Publier par lots de 200**, pas d'un coup. Un lot, puis 7 jours d'observation
   dans GSC avant le suivant.
4. **Traiter les doublons.** 4 018 imports OSM sur 24 départements contiennent
   forcément des quasi-doublons. Écrire la requête de détection **avant** de publier
   quoi que ce soit, et consigner le nombre trouvé.
5. **Ne pas toucher aux 416 existantes.** Ce sont elles qui rankent.

### Critères d'acceptation

- Le générateur tourne sur les 4 018 et **rapporte combien passent la porte**, avec
  la raison de rejet pour les autres. Ce chiffre est le vrai livrable du bloc.
- Sur un échantillon de 20 fiches générées tirées au hasard, **relecture humaine** :
  zéro affirmation fausse, zéro texte qui pourrait s'appliquer tel quel à un autre
  spot.
- Le premier lot de 200 est publié, dans le sitemap, et **indexé à plus de 70 % à
  J+14**. Si c'est moins, on s'arrête et on comprend pourquoi avant le lot suivant.
- CTR moyen des nouvelles fiches à J+14 **> 4 %**. En dessous, le contenu ne mérite
  pas sa position et on retravaille le gabarit avant d'en publier d'autres.

### Garde-fous

- ⚠️ **Le CTR des 416 fiches historiques est le témoin.** S'il baisse sous **6 %**
  après une publication de lot, on dépublie le lot. C'est le même seuil que le
  sprint 77, pour la même raison.
- ⚠️ Aucune fiche publiée sans passer la porte. « On verra bien » est exactement ce
  qui produit 4 000 pages minces.
- Une fiche générée est marquée comme telle en base : on doit pouvoir dépublier un
  lot en une requête.

---

## Bloc 3 — Aller chercher la Méditerranée

Le site est un site breton qui s'ignore : 57 % de l'inventaire sur 4 départements.
La Méditerranée a **1 647 spots en attente pour 80 publiés** — et c'est là que se
trouvent la densité de population, le tourisme, et une saison qui ne s'arrête pas.

### Tâches

1. **Prioriser les lots du Bloc 2 par déficit** : 83, 2A, 13, 2B, 06, 66, 34 d'abord.
   Le Var seul (448 en attente) vaut plus que tout le reste d'un lot.
2. **Vérifier que le contenu tient en Méditerranée.** Le marnage y est faible : toute
   la copie construite autour de la marée y perd son sens. Contrôler que le score, les
   « meilleurs moments » et les textes générés se dégradent proprement quand le
   marnage est négligeable, et parlent alors de ce qui compte vraiment là-bas (vent,
   houle, lumière, saison). `facadeOf()` existe déjà pour brancher ça.
3. **Espèces méditerranéennes** : vérifier que sar, oblade, marbré, barracuda, liche,
   pageot, orphie sont aussi bien servis que bar et dorade. Le référentiel les
   contient déjà.

### Critères d'acceptation

- Part de la Méditerranée dans l'inventaire publié : de **19 % à > 35 %**.
- Sur 10 fiches méditerranéennes tirées au hasard, aucune ne met en avant un
  argument de marée sans pertinence.

### Garde-fous

- ⚠️ Ne pas publier en Méditerranée un gabarit pensé pour l'Atlantique. Une fiche qui
  parle de coefficient de marée à Marseille signale à un pêcheur local que le site
  ne connaît pas son terrain — et c'est irrattrapable.

---

## Bloc 4 — `/especes` : 2 771 impressions par semaine à 1,05 %

Le sprint 77 a traité 3 pages sur 26. Le gisement est intact.

### Tâches

1. **Étendre le traitement du sprint 75/77** aux 5 à 8 pages suivantes par
   impressions. La méthode est écrite et testée dans `lib/especes/seo.ts` ; il ne
   reste qu'à alimenter `seoTitle` / `seoDescription` dans `lib/especes/content/*.ts`.
   **C'est du contenu, pas du code.**
2. **Remonter `SpeciesTopSpots` en tête** sur les pages à intention d'identification.
   Sur `/especes/bar`, les spots nommés arrivent aujourd'hui **après** la FAQ, les
   autres espèces et les guides.
3. **Segmenter la mesure par intention.** Une position 2-3 à 0 % de clic sur une
   requête-définition n'est pas une page à optimiser, c'est une requête à abandonner —
   l'AI Overview de Google a déjà répondu. Juger `/especes` sur le CTR des requêtes
   d'intention pêche uniquement, sinon la cible « 1,05 % → 2 % » sera ratée alors même
   que le travail aura payé.

### Critères d'acceptation

- CTR `/especes` sur les requêtes d'intention pêche : **> 3 %** à J+14.
- Aucun titre > 60 caractères, aucun doublon.

---

## Bloc 5 — La matière fraîche : 413 fiches sur 416 n'ont aucune prise

C'est le chaînon qui décide si le site devient défendable ou reste substituable.

Une fiche de spot alimentée par des prises réelles et datées est une page que
personne ne peut copier. Une fiche sans prise est une compilation de données
publiques — et une compilation de données publiques finit par être remplacée par un
résumé d'IA dans le SERP.

Le sprint 77 a construit ce qu'il faut (prise publique par défaut, inscription
différée). Le Bloc 1 le débloque. Ce bloc l'amorce.

### Tâches

1. **Amorcer avec ce qui existe déjà.** 28 prises pour 416 fiches. Les 10 spots les
   plus visités méritent d'avoir de la matière : identifier lesquels, et y consacrer
   l'effort éditorial.
2. **Rendre visible la rareté** : sur une fiche sans prise, une invitation directe et
   contextualisée — « Personne n'a encore déclaré de prise ici. Sois le premier » —
   plutôt qu'une section vide. C'est le geste le moins cher du brief.
3. **Boucler la relance J+2** du sprint 77 : elle ne servira à rien tant que les
   emails partent en indésirables (Bloc 0 tâche 4).
4. **Mesurer la boucle** : part des fiches avec ≥ 1 prise publique, aujourd'hui
   **0,7 %** (3/416). Toute cible au-dessus de 5 % à 3 mois serait un vrai succès.

### Garde-fous

- ⚠️ Ne jamais fabriquer de fausses prises, ni de « prises d'exemple ». Le jour où un
  pêcheur s'en aperçoit, la confiance ne revient pas.
- Le k-anon K=3 et le floutage restent intouchables — ce sont eux qui rendent le
  partage acceptable.

---

## Bloc 6 — Mesure

Sans repère pris **avant**, ce brief n'est pas évaluable.

| Repère | Base 14/08 | Cible |
|---|---|---|
| Clics Google / semaine | 691 | — |
| CTR `/spots` (416 fiches historiques) | 7,4 % | **ne pas descendre sous 6 %** |
| Fiches publiées | 416 | + 200 par lot validé |
| Part Méditerranée de l'inventaire | 19 % | > 35 % |
| CTR `/especes` (intention pêche) | à segmenter | > 3 % |
| Fiches avec ≥ 1 prise publique | **3 (0,7 %)** | > 5 % |
| Comptes / semaine | 16 | — |
| Comptes ayant logué ≥ 1 prise | 15 % | > 35 % |
| Non-200 servis aux robots | **à relever** | ~ 0 |
| Emails d'auth en boîte de réception | non | oui |

---

## Hors périmètre, et pourquoi

- **La refonte de `/tarifs`.** Cf section suivante : 4 abonnés payants, ce n'est pas
  là que se joue quoi que ce soit ce trimestre.
- **Les apps iOS / Android.** Annoncées « en préparation » sur `/tarifs`. À ne pas
  démarrer avant que le web convertisse.
- **Le lien magique cross-device** (QA §1.7) : à vérifier, pas à refondre.

---

## Ordre de sacrifice, s'il faut couper

**Bloc 0 et Bloc 1 ne se sacrifient jamais** : l'un est un prérequis physique,
l'autre est une demi-journée qui décide du sort du sprint précédent.

Ensuite, dans l'ordre où on coupe : Bloc 5, puis Bloc 4, puis Bloc 3. Le Bloc 2 se
réduit en nombre de lots, jamais en exigence de qualité.

**Si tu ne devais garder qu'une chose : le Bloc 1.** Trois lignes de code et une
règle CSS rendent utilisable un sprint entier déjà déployé.
