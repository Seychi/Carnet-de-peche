# Plan de croissance SEO — 2026-08-16

> Question : comment monter les impressions, les clics et les visites.
> Base : GSC via Supermetrics sur 28 jours (18/07 → 14/08, données figées), croisée avec
> `lib/seo/`, `app/(marketing)/spots/[slug]/page.tsx`, `content/guides/` et les
> statistiques d'exploration relevées le 15/08.
> Suite du diagnostic `DIAGNOSTIC-SEO-2026-08-16.md`.

---

## ★★★ Le constat qui commande tout le reste

**Le clic se joue en position 3-6. Le site est garé en 8-11.**

Requêtes de noms de lieux, 28 jours, données réelles :

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

La même page, sur la même intention, vaut **11,9 % de CTR en position 5,8 et 0 % en
position 10,3**. Le seuil est brutal parce que sur mobile — **82 % du trafic** — la
position 10 est sous trois écrans de défilement.

Vue d'ensemble sur les requêtes que GSC expose (28 j) :

| Bloc de positions | Impressions | Clics | CTR |
|---|---|---|---|
| 1 à 3 | 396 | **0** | **0 %** |
| 4 à 10 | 1 725 | 31 | 1,8 % |
| 11 à 20 | 657 | 1 | 0,15 % |

★ **Les positions 1 à 3 ne rapportent rien** : 396 impressions, zéro clic. Ce sont
les requêtes de nom d'espèce (« congre » en position 2,25, « poisson barracuda » en
2,04) auxquelles Google répond dans la SERP. Le classement n'y a aucune valeur.

**Conclusion opérationnelle : deux problèmes distincts, deux chantiers distincts.**

| Problème | Contrainte | Chantier |
|---|---|---|
| Trop peu de **clics** pour les impressions | la position (8-11) | Leviers 1 à 3 |
| Trop peu d'**impressions** | le débit d'exploration Google | Leviers 4 à 6 |

Le premier paye en semaines, le second en mois. Faire le second en premier revient à
verser de l'eau dans un seau percé.

---

## Levier 1 — Remonter les fiches spots déjà classées ★★★

**Le plus rentable : zéro nouvelle page, zéro coût d'exploration, gain immédiat.**

Sur le seul échantillon visible, ~505 impressions sont bloquées entre les positions 8
et 11 pour **2 clics**. Au CTR du Grand Minou (11,9 % en position 5,8), c'est **~60
clics par mois** — et ce n'est que les **8 %** de requêtes que GSC nomme, le reste
étant anonymisé. La même mécanique joue sur toute la traîne.

Ce qui fait bouger une page locale de la position 10 à la position 5 :

**a) Densité de maillage interne.** `NearbySpotsSection` existe déjà sur la fiche,
mais `nearby_spots` est **plafonnée à 3 résultats pour un visiteur anonyme** — donc
pour Googlebot. Trois liens sortants par fiche, c'est un maillage trop lâche pour
faire circuler l'autorité. Passer le plafond anonyme à 8-10 et ajouter les liens
remontants (fiche → `/spots?dept=`, fiche → espèce, fiche → guide de technique) coûte
une requête et change la topologie du site.

**b) Profondeur de contenu sur les fiches minces.** Les 191 fiches générées font 761
à 883 caractères. Les fiches curées, qui sont celles qui rankent, en font
davantage. À intention égale, la page la plus complète gagne.

**c) Le titre doit contenir la requête.** Le gabarit actuel est
`Pêche à {commune} ({dept}) : {espèces}`. Pour « pointe de trefeuntec » ou « kastel
koz », l'internaute cherche un **lieu**, pas « pêche à ». Vérifier que le nom du lieu
apparaît en tête de title, avant le mot « Pêche ».

> Mesure : reprendre ces 13 requêtes dans 3 semaines. Si la position moyenne passe
> sous 7, le maillage fonctionne et on l'étend. Sinon, c'est un problème d'autorité
> de domaine et c'est le levier 6 qui prend le relais.

---

## Levier 2 — L'intention « marée à &lt;spot&gt; » ★★★

Deux requêtes dans le top 30 : **« maree pen lan »** (29 impressions, position 10,2)
et **« marée rostiviec »** (25 impressions, position 8,8). Zéro clic sur les deux.

Les gens cherchent **la marée par nom de spot**. C'est une intention à volume,
récurrente (on la refait chaque semaine), et Carnet de Pêche **calcule déjà la donnée
sur chaque fiche** : courbe du jour, PM/BM, coefficient, avec la calibration de port
du sprint 38.

Le mot « marée » n'apparaît aujourd'hui **que dans la meta description**, pas dans le
`<title>`. Quelqu'un qui cherche « marée rostiviec » balaie les titres à la recherche
du mot ; il ne le trouve pas et clique ailleurs.

**Correctif :** faire entrer la marée dans le titre des fiches où elle est calibrée,
par exemple `Rostiviec (29) : marée du jour, spot de pêche et espèces`. Le gabarit de
`lib/seo/spot-title.ts` gère déjà la dégradation par longueur, c'est une variante à
ajouter.

★ **C'est aussi une attaque directe sur Fishing Grid**, dont les marées sont
publiquement critiquées pour leur imprécision (~30 min d'écart à Pornichet, cf
`docs/concurrents/fishing-grid.md`). C'est le seul terrain où la supériorité technique
est déjà construite et non revendiquée.

---

## Levier 3 — Les pages « pêche à &lt;ville&gt; » ★★

Trou béant entre la fiche d'un spot et la landing d'un département :

| Requête | Impressions | Position | Page servie |
|---|---|---|---|
| peche gravelines | 45 | 10,8 | *aucune page dédiée* |
| peche en mer gravelines | 22 | 8,6 | *aucune page dédiée* |
| pêche à dieppe sur la jetée | 40 | 8,7 | *aucune page dédiée* |

Les facettes existantes sont `?dept=` et `?species=` (`app/(marketing)/spots/page.tsx`
ligne 32) : **pas de facette commune**. Or l'échelle à laquelle on cherche un lieu de
pêche est la ville, pas le département.

**Proposition :** une facette `?ville=` ou une route `/spots/ville/<slug>`, générée
uniquement pour les communes ayant **≥ 3 spots approuvés** (garde-fou anti-page
mince). Le contenu existe déjà, il n'est pas regroupé à la bonne échelle. Coût faible,
et ça crée le palier de maillage qui manque entre la fiche et le département.

---

## Levier 4 — Débloquer le débit d'exploration ★★★

C'est **la contrainte dure sur tout gain de volume**. Relevé du 15/08 :

| Mesure | Valeur | Effet |
|---|---|---|
| Découverte de nouvelles URLs | **~10 par jour** | 3 827 spots en attente = **~10 mois** |
| Temps de réponse moyen (30 j) | **1 247 ms**, pic 2 754 ms | Google réduit sa cadence quand le serveur traîne |
| Part HTML des requêtes | 23,55 % (JavaScript : 30,89 %) | un tiers du budget part dans du JS |
| Vercel | **Fluid Active CPU 7 h 34 / 4 h incluses** | plan Hobby dépassé |

Trois actions, par ordre d'effet :

1. **Passer Vercel Pro (~20 $/mois).** Le dépassement CPU est la cause la plus
   probable du temps de réponse à 1 247 ms. C'est vingt dollars contre dix mois de
   latence d'indexation : l'arbitrage n'en est pas un.
2. **Descendre le temps de réponse sous 500 ms.** Les fiches spots sont en
   `revalidate = 1800`. Suspects à mesurer avant de toucher : génération OG par
   requête, pages `force-dynamic`, les 4 crons.
3. **Le maillage interne du levier 1 sert deux fois.** Google découvre autant par les
   liens que par le sitemap. Un maillage dense fait circuler le crawler dans
   l'inventaire sans dépendre du quota de découverte.

> ⚠️ Corollaire de calendrier : les 191 fiches du lot 1 mettront **~19 jours** à être
> découvertes. Tout verdict sur leur performance avant fin août mesure du vide.

---

## Levier 5 — Étendre `/peche` aux espèces méditerranéennes ★★

`/peche/<espèce>/<technique>/<dépt>` tient **5 à 7 % de CTR**, cinq fois `/especes`.
C'est le format qui marche. Il ne couvre que **6 espèces sur 26** :

```
bar · dorade-royale · lieu-jaune · maquereau · sar · orphie
```

Six espèces atlantiques, alors que l'inventaire vient de basculer : **44,6 % de
Méditerranée** après le lot 1. Les fiches spots méditerranéennes existent, mais aucune
page `/peche` ne les capte.

**Proposition :** ouvrir `SPECIES_TECHNIQUES` aux espèces méditerranéennes qui ont
maintenant de l'inventaire (marbré, oblade, pageot, liche, seiche, rouget), avec la
règle existante : une page n'est générée que si des spots réels la portent. Le
garde-fou anti-contenu-mince est déjà écrit (`hasProgrammatic`), il suffit de
l'alimenter.

---

## Levier 6 — Contenu pilier et autorité ★

- **`/techniques` est en `robots: { index: false }`** (`page.tsx` ligne 15), un stub
  « bientôt ». Quatre pages piliers (leurres, surfcasting, flottante, vif) au standard
  des fiches espèces, plus le retrait du noindex : quatre pages génériques et le
  maillage espèces ↔ techniques ↔ spots qui va avec.
- **6 guides** dans `content/guides/`. Les mieux placés sont locaux et réglementaires.
  Cible : 15-20, priorité aux « où pêcher dans le &lt;département&gt; du bord » qui
  s'appuient sur les spots fraîchement curés et les maillent directement.
- **Le filon réglementaire** : « maille &lt;espèce&gt; &lt;année&gt; » est la seule
  famille de requêtes d'espèce qui clique, parce que la réponse est un chiffre qui
  change et que l'internaute veut vérifier. 283 impressions sur le seul mulet, en
  position 5-10. Une page `/reglementation/maille-<espèce>` par espèce, datée et
  sourcée, se re-classe toute seule chaque année.
- **Autorité externe** (César) : c'est ce qui déplace durablement une page de la
  position 9 à la position 4. Sans backlinks, les leviers 1 à 3 ont un plafond.

---

## Ce qu'il ne faut PAS faire

**Ne pas courir après le CTR de `/especes`.** 396 impressions en positions 1 à 3 pour
**zéro clic**. « congre » est en position 2,25 avec 0 clic sur 141 impressions :
Google répond dans la SERP et l'internaute n'a aucune raison de venir. Le seuil de
5 % de CTR sur l'agrégat `/especes` inscrit dans `docs/sprint-78/METRIQUES.md` est
**inatteignable par construction** ; le mesurer ne fera que déclencher de mauvaises
décisions. Seule exception : l'intention « maille », traitée au levier 6.

**Ne pas publier les 3 827 spots en attente au rythme maximum.** À 10 découvertes par
jour, publier plus vite que Google n'explore ne crée pas d'impressions, seulement des
URLs en file d'attente — et le risque de diluer la qualité moyenne du répertoire qui
performe le mieux.

---

## Ordre proposé

| # | Chantier | Effort | Délai de retour | Priorité |
|---|---|---|---|---|
| 1 | Maillage interne : plafond `nearby_spots` anonyme 3 → 8-10, liens remontants | S | 2-4 sem. | ★★★ |
| 2 | Marée dans le `<title>` des fiches calibrées | S | 2-4 sem. | ★★★ |
| 3 | Vercel Pro + temps de réponse sous 500 ms | S (argent) | 4-8 sem. | ★★★ |
| 4 | Facette « pêche à &lt;ville&gt; » (≥ 3 spots) | M | 4-8 sem. | ★★ |
| 5 | `/peche` étendu aux espèces méditerranéennes | M | 6-10 sem. | ★★ |
| 6 | Enrichir les 191 fiches générées | M | 4-8 sem. | ★★ |
| 7 | `/techniques` désindexé → 4 pages piliers | M | 8-12 sem. | ★ |
| 8 | Pages `maille <espèce> <année>` | S | 4-8 sem. | ★ |
| 9 | Guides locaux (6 → 15-20) | L | 3-6 mois | ★ |
| 10 | Backlinks (César) | L | 3-6 mois | ★ |

Les trois premiers sont petits, indépendants, et attaquent les deux contraintes à la
fois. C'est par là qu'il faut commencer.

---

## Réserves d'honnêteté

- Les requêtes nommées ne couvrent que ~8 % du trafic ; les 92 % restants sont
  anonymisés par Google. Les chiffres par requête sont un **échantillon** : la
  direction est fiable, l'extrapolation ne l'est pas.
- Le lien « position 5-6 → 12 % de CTR » repose sur un seul cas mesuré (Grand Minou,
  59 impressions). C'est cohérent avec les courbes de CTR publiques, mais ça reste un
  point, pas une loi.
- La saisonnalité d'août gonfle tous les chiffres actuels. Juger un chantier en
  septembre contre le pic d'août produira un faux échec ; comparer à septembre 2025.
- Aucun de ces leviers ne remplace l'autorité de domaine. Un site jeune plafonne
  autour de la position 7-8 quoi qu'il fasse sur la page : c'est le sens du levier 6.
