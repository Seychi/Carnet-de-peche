# Correction de l'audit du ré-import — §3.3, les « 9 spots en Italie » du 06

> Rédigé le **2026-08-19**, en réponse à la question « et pour le département 06 ? ».
> Corrige : `lots/lot-13-audit-reimport.md` §3.3, verdict proposé le 08/08, **jamais exécuté**
> (en attente de GO John). Mesures faites en SQL live le 19/08 sur `spots`, département `06`.
> **Rien n'a été écrit en base.** Ce document propose des verdicts corrigés, il ne les applique pas.

---

## 1. Ce que disait l'audit

> ### 3.3 — 9 spots situés en Italie, rattachés au 06
> « Spiaggia del Darsenún », « Spiaggia di Capo Mortola », « Punta Garavano », « Plage Hawaï »,
> « Plage du Casino », « Plage du Marché », « Plage Rondelli », « Plage du Buse »,
> « Plage des Sablettes » : la bbox du 06 déborde la frontière et ramasse **Vintimille et Grimaldi**.
> **Les toponymes italiens ne laissent aucun doute.**
> **Verdict proposé : `rejected`, raison « hors France (Ligurie) ».**

---

## 2. Ce que disent les coordonnées

La frontière franco-italienne atteint la mer au **pont Saint-Louis / pointe Saint-Ludovic**, à
**≈ 7,5266 °E**. Tout ce qui est à l'ouest est en France.

| Spot | Longitude | Latitude | Côté | Commune réelle |
|---|---|---|---|---|
| Spiaggia del Darsenún | **7,54068** | 43,78427 | 🇮🇹 **Italie** | Ventimiglia |
| Punta Garavano | **7,53990** | 43,78247 | 🇮🇹 **Italie** | Ventimiglia |
| Spiaggia di Capo Mortola | **7,53687** | 43,78374 | 🇮🇹 **Italie** | Ventimiglia (Grimaldi) |
| Plage Hawaï | 7,52543 | 43,78499 | 🇫🇷 **France** | **Menton** (Garavan) |
| Plage Rondelli | 7,50986 | 43,77992 | 🇫🇷 **France** | **Menton** |
| Plage des Sablettes | 7,50834 | 43,77904 | 🇫🇷 **France** | **Menton** |
| Plage du Marché | 7,50532 | 43,77452 | 🇫🇷 **France** | **Menton** |
| Plage du Casino | 7,49373 | 43,76978 | 🇫🇷 **France** | **Menton** |
| Plage du Buse | 7,46179 | 43,76069 | 🇫🇷 **France** | **Roquebrune-Cap-Martin** |

**Trois spots sur neuf sont en Italie. Six sont en France**, dont cinq dans Menton même, à
2,5 km au maximum de la frontière. Plage Hawaï est à **600 m** à l'ouest du poste frontière.

Contrôle indépendant du nom : la plage Hawaï est référencée à **Menton 06500**, et la plage des
Sablettes est présentée par l'office de tourisme de Menton et labellisée Handiplage à Menton.

---

## 3. Pourquoi l'erreur est passée, et ce qu'elle apprend

Le playbook porte déjà la règle qui l'aurait évitée, dans l'autre sens :
*« Ne jamais déduire la commune du seul nom de l'objet OSM. »*

Ici l'inférence s'est faite au niveau de la **grappe** : trois toponymes italiens voisins ont
donné leur nationalité aux six voisins immédiats, dont les noms sont pourtant français
(« Plage du Casino », « Plage du Marché »…). La phrase « les toponymes italiens ne laissent aucun
doute » est vraie pour trois lignes sur neuf et a été appliquée aux neuf.

★ **Règle à ajouter au playbook §4** : *une décision de rattachement (pays, département, commune)
se prend spot par spot sur sa coordonnée, jamais par contagion de grappe. Un voisin de 600 m peut
être dans un autre pays.*

Si le verdict d'origine avait été exécuté, **6 postes réels de Menton et de Roquebrune-Cap-Martin
partaient en `rejected`** dans un département dont la cible est 60 fiches et qui en compte 34.

---

## 4. Ce que l'audit n'avait pas vu : Monaco

Aucune des cinq familles ne mentionne Monaco. Or la bbox du 06 englobe la Principauté, qui est un
**État souverain** : la pêche y relève du droit monégasque, et la **réserve marine du Larvotto** y
est réglementée. Deux lignes tombent dans le périmètre monégasque et sont à écarter au même titre
que l'Italie :

| Spot | Longitude | Latitude | À vérifier |
|---|---|---|---|
| Plage du Solarium | 7,42928 | 43,73392 | Larvotto, **Monaco** |
| Anse de la Grue | 7,42130 | 43,72990 | Fontvieille, **Monaco** |

⚠️ **Ne pas élargir le filtre à toute la tranche de longitude.** « Plage Marquet » (7,41068) et
« Plage Pointe des Douaniers » (7,40561) sont à **Cap d'Ail**, en France, et « Pointe de la Veille »
(7,44458) est à Cap Martin, en France. Le même piège de contagion que §3 : chaque ligne se tranche
sur sa coordonnée, contre le tracé réel de la frontière monégasque, pas sur une tranche.

---

## 5. Verdicts corrigés proposés

| Lot | Spots | Verdict proposé | Raison |
|---|---|---|---|
| **A** | Spiaggia del Darsenún · Punta Garavano · Spiaggia di Capo Mortola | `rejected` | Hors France (Ligurie, Ventimiglia) |
| **B** | Plage du Solarium · Anse de la Grue | `rejected` | Hors France (Principauté de Monaco) **après vérification du tracé** |
| **C** | Plage Hawaï · Plage Rondelli · Plage des Sablettes · Plage du Marché · Plage du Casino · Plage du Buse | **rester `pending`, à curer normalement** | France, Menton et Roquebrune-Cap-Martin. Postes réels. |

Le lot C n'a **pas** besoin d'un arbitrage : ces six spots retournent simplement dans le flux de
curation ordinaire, avec les quatre portes de qualité. Seuls A et B demandent ton GO, et ils portent
sur **5 lignes**, pas 9.

---

## 6. Effet sur le reste de l'audit

Les autres familles de `lot-13-audit-reimport.md` ne sont pas remises en cause par ce document, mais
elles méritent le même contrôle avant exécution, pour la même raison :

- **§3.1 — 35 spots du Marais poitevin (85)** : à vérifier ligne par ligne, la longitude jusqu'à
  −0,612 est un argument fort mais la grappe peut mélanger de vrais postes littoraux.
- **§3.2 — 26 spots 22/35** : déjà re-mesuré au lot 15 et éclaté en trois familles. Bon exemple de
  ce qu'il faut faire.
- **§3.4 — 3 spots de Scandola** : double motif (département **et** réserve intégrale), verdict solide.
- **§3.5 — 49 noms de quais** : l'audit prévoit déjà l'examen au cas par cas de « Quai des Pêcheurs »
  (06) et « Quai Saint-Laurent » (29). À maintenir.
- **§3.6 — 5 spots d'eau douce** : « La Piscine » (06) est bien à écarter. « Étang de la Dame » (13)
  relève de la question saumâtre ouverte au §9.1 du brief de campagne.

---

## 7. Ce qu'il reste à faire

1. **John** : GO sur les lots A et B (5 rejets), ou demande de vérification supplémentaire sur B.
2. Une fois le GO donné, exécution en 2 UPDATE ciblés, avec la clause `and slug='…'` obligatoire.
3. Reporter la règle du §3 dans `PLAYBOOK.md` §4.
4. Le lot C repart dans le backlog du 06 sans action particulière.
