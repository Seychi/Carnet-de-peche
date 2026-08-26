# Verdict Search Console — 23/08/2026

> Exports fournis par John : `docs/export gsc/` (Couverture, Statistiques d'exploration, Performances).
> Répond aux relevés en attente du Bloc A, à la question WAF du sprint 88 Bloc 6, et au Bloc B.

---

## 1. ★ Le sprint 84 a marché, et c'est enfin mesuré

C'était la seule preuve disponible, elle manquait depuis six jours. La voici.

| Mesure | Avant (21/07 → 15/08) | Après (18/08 → 21/08) | Delta |
|---|---|---|---|
| **Temps de réponse moyen** | **812 ms** | **386 ms** | **−52 %** |
| **Demandes d'exploration / jour** | 133 | 506 | **×3,8** |

Sur la seule dernière semaine avant le correctif (09 → 15/08), le temps de réponse était de 883 ms : la chute à 386 ms n'est donc pas un artefact de moyenne longue.

**Attribution honnête** : l'export n'a **aucune ligne pour le 16 et le 17/08**, ce qui masque la bascule. Le 18/08 est le premier jour complet après **deux** déploiements : le sprint 84 (17/08 15h36, qui allume l'ISR) et le hotfix du sprint 88 (18/08 13h33, qui le rend réellement effectif sur la fiche spot). Le gain est celui des deux ensemble, et c'est cohérent : le S84 a allumé le cache, le S88 a réparé la fuite qui le vidait.

---

## 2. ★★ L'indexation a doublé, les impressions ont été multipliées par cinq

Rapport de couverture, série complète :

| Date | Pages dans l'index | Impressions/jour |
|---|---|---|
| 13/06 | 123 | 11 |
| 11/07 | 331 | 320 |
| 25/07 | 337 | 360 |
| 06/08 | 496 | 1 094 |
| 09/08 | 542 | 2 004 |
| **15/08** | **751** | 1 647 |
| 17/08 | 751 | 1 840 |

**337 → 751 pages indexées** entre le 25/07 et le 15/08. **360 → ~1 900 impressions par jour.**

Le repère cité dans le brief du sprint 89 pour justifier le Bloc C était « 176 impressions/jour ». Le chiffre réel est **plus de dix fois supérieur**. Cette prémisse était périmée.

Le saut du 15/08 (546 → 751 indexées) correspond exactement à la publication des 191 fiches du lot S78 ce jour-là.

---

## 3. ★ La question du WAF est définitivement tranchée : Googlebot n'est pas bloqué

Le sprint 88 Bloc 6 concluait « non » sur la foi de sondes depuis l'IP de John. Google le confirme avec ses propres données.

Répartition des réponses vues par Googlebot :

| Réponse | Part |
|---|---|
| OK (200) | **98,68 %** |
| Introuvable (404) | 1,06 % |
| Redirection permanente (301) | 0,19 % |
| Redirection temporaire (302) | 0,05 % |
| **Erreur serveur (5xx)** | **0,02 %** |
| **403** | **absent du tableau** |

**Zéro 403.** Et 0,02 % de 5xx, ce qui valide aussi le Bloc C du sprint 89 côté crawl.

Les deux hôtes sont en « Aucun problème » : `www` 10 410 demandes, l'apex 407.

★ **Conséquence** : la ligne « 503 intermittents Vercel Challenge/WAF sur les prefetches RSC (risque crawlers/SEO) » de `CLAUDE.md` §2 est **définitivement fausse** et doit être retirée. Elle a déjà coûté du temps à deux audits.

---

## 4. Le goulot d'étranglement réel : la découverte, pas la vitesse

| Objectif du crawl | Part |
|---|---|
| Actualisation de pages connues | **89,42 %** |
| **Découverte de nouvelles pages** | **10,58 %** |

Google consacre neuf dixièmes de son budget à re-crawler ce qu'il connaît déjà. En face, le rapport de couverture montre :

| Motif de non-indexation | Pages |
|---|---|
| **Détectée, actuellement non indexée** | **305** |
| Explorée, actuellement non indexée | 65 |
| Page en double sans URL canonique | 17 |
| Introuvable (404) | 9 |
| Page avec redirection | 3 |
| Erreur serveur (5xx) | 1 |
| Exclue par « noindex » | 1 |

**305 pages que Google connaît et n'a pas encore explorées.** C'est le vrai plafond de croissance aujourd'hui, et il ne se règle ni par la vitesse ni par le contenu : il se règle par la **soumission active** (le sitemap resoumis, IndexNow) et par le maillage interne, qui augmente la valeur perçue des pages profondes.

Les **17 pages en double sans canonique** méritent un coup d'œil séparé : c'est un défaut réparable, pas une attente.

---

## 5. ❌ Mon plan de mesure du Bloc B est inutilisable, et il faut le dire

Le sprint 89 proposait de juger le correctif du sprint 75 sur **les 15 fiches que personne n'a retouchées**, pour éviter de mélanger quatre interventions. L'idée était bonne. Les volumes la tuent.

Sur 28 jours, filtre `/especes/` :

| Groupe | Fiches | Clics | Impressions | Part des impressions | CTR |
|---|---|---|---|---|---|
| **Propre** (jamais retouché) | 13 | **11** | **935** | **11,1 %** | 1,18 % |
| **Contaminé** (S77, S78 ou S83) | 11 | 97 | 7 511 | 88,9 % | 1,29 % |
| **Total** | 24 | 108 | 8 446 | | **1,28 %** |

**11 clics sur 28 jours.** On ne détecte pas un écart d'un point de CTR sur onze clics : l'intervalle de confiance est plus large que l'effet cherché. Le groupe propre est propre et il est vide.

Ce n'est pas une erreur de raisonnement, c'est une donnée que je n'avais pas : je savais quelles fiches étaient contaminées, je ne savais pas qu'elles portaient **89 % du trafic**.

**Le verdict sur le sprint 75 est donc définitivement inaccessible.** Il faut cesser de le chercher.

### Ce qu'on peut mesurer à la place, et qui vaut mieux

Le sprint 78 a réécrit 8 titles le 15/08 « à l'intention pêche », et **ce sont eux qui portent le trafic**. La comparaison **10 → 14/08 contre 16 → 22/08** est courte mais elle porte sur des volumes réels. C'est ça qu'il faut exporter, en deux fenêtres.

---

## 6. ★★ Le vrai problème de `/especes`, et ce n'est pas le gabarit de title

| Page | Impressions | Clics | CTR | Position |
|---|---|---|---|---|
| mulet | 1 932 | 27 | 1,40 % | 9,22 |
| tassergal | 1 109 | 17 | 1,53 % | 8,89 |
| congre | 947 | 11 | 1,16 % | 9,32 |
| maigre | 912 | 9 | 0,99 % | 7,83 |
| oblade | 732 | 6 | 0,82 % | 8,77 |
| seiche | 639 | 15 | **2,35 %** | 7,58 |

**Le CTR global est de 1,28 % à une position moyenne de 8 à 9.** À cette position, un CTR normal se situe entre 2 et 4 %. Les pages sont donc **vues et pas cliquées**, ce qui est un problème d'intention servie, pas de formule de title. C'est exactement la « branche 2 » que le brief du sprint 89 avait anticipée.

Repère : le sprint 78 mesurait 1,42 % sur sa fenêtre. À 1,28 % aujourd'hui, **rien ne s'est amélioré**, malgré quatre réécritures de titles.

★ **La seule page au-dessus de 2 % est `seiche`** (2,35 % à la position 7,58). C'est la piste à creuser : qu'est-ce que son title et sa requête dominante ont que les autres n'ont pas ? Le fichier `Requêtes.csv` du même export contient la réponse et n'a pas encore été dépouillé.

---

## 7. Une incohérence de l'export, à ne pas interpréter

L'onglet **Appareils** annonce 1 586 impressions et **1 clic** au total, quand l'onglet **Pages** en compte 8 446 et 108. Les deux ne peuvent pas décrire la même chose.

Le plus probable est que l'export « Appareils » a été pris avec un filtre supplémentaire encore actif. **Je ne l'interprète pas**, et le chiffre de 82 % de mobile du sprint 75 n'est ni confirmé ni infirmé ici. À réexporter proprement si la répartition par appareil compte.

---

## Ce qu'il faut faire de tout ça

1. **Retirer la ligne WAF de `CLAUDE.md` §2.** Elle est fausse, prouvée par Google.
2. **Arrêter de chercher le verdict du sprint 75.** Il est inaccessible, le groupe témoin est vide.
3. **Exporter 10 → 14/08 contre 16 → 22/08** pour juger le sprint 78, qui lui porte du volume.
4. **Dépouiller `Requêtes.csv`** : comprendre pourquoi `seiche` fait 2,35 % quand la moyenne fait 1,28 %.
5. **Traiter les 17 pages en double sans canonique**, c'est le seul défaut d'indexation réparable par du code.
6. **Le plafond de croissance est la découverte** (10,6 % du budget de crawl, 305 pages en attente), pas la vitesse ni le contenu.
