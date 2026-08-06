# Lot 3 — note de réconciliation (deux sessions concurrentes)

> Écrite le 2026-08-06. **À lire avant de repartir sur le lot 4.**

## Ce qui s'est passé

Deux sessions ont préparé un lot 3 pour le Finistère **en parallèle, sans se voir** :

- **Session A** (tâche planifiée Cowork) : sélection de 22 spots, RECAP écrit, GO de John reçu, **écriture en base effectuée**.
- **Session B** (Claude Code) : sélection de 23 spots, partiellement différente, RECAP écrit dans `lots/lot-03-29.md`, **resté en attente de GO, rien écrit en base**.

Le fichier `lots/lot-03-29.md` de la session B a écrasé celui de la session A sur le disque. **Le fichier décrit donc une sélection qui n'est pas exactement celle qui est en base.** Cette note rétablit la vérité.

## L'état réel de la base fait foi

**19 spots publiés** par la session A (après correction, voir plus bas) :

Cap de la Chèvre · Pointe de Lostmarc'h · Pointe des Capucins · Pointe du Grand Gouin · Pointe du Diable · Pointe du Cabellou · Pointe de Combrit · Pointe de Langoz · Pointe de Lervily · Pointe de Leydé · Pointe du Menhir · Pointe de Penn al Lann · Pointe de Beg An Fry · Pointe de l'Armorique · Pointe de Rostiviec · Cale de Moulin-Mer · Cale de Mousterlin · Pointe de Brenterc'h · Pointe des Grottes (light).

## Deux corrections appliquées, en faveur de l'analyse de la session B

La session B a été **plus prudente et mieux documentée** sur deux spots que la session A avait publiés. Conformément à l'invariant « dans le doute on ne publie pas », les deux ont été retirés de la publication et leur contenu remis à vide :

| Spot | Session A | Session B | Décision retenue |
|---|---|---|---|
| **Pointe du Portzic** (Brest) | publié, difficulté 3 | reject : phare et fort en usage militaire, seul accès cité par la porte des Quatre Pompes de l'enceinte du port militaire, sentier en haut de falaise sans descente vers l'eau | **`rejected`**, contenu vidé, slug OSM restauré |
| **Pointe de Kerdéniel** (Plougastel) | publié, difficulté 3, avec une mention de « descente vers la bordure » | reste `pending` : le site est décrit partout comme un belvédère accessible à pied, sans aucune source décrivant un accès à l'eau | **`pending`**, contenu vidé, slug OSM restauré |

La fiche Kerdéniel de la session A affirmait une descente vers l'eau qu'aucune source ne documente. C'est un manquement à l'invariant §2.1 du playbook (ne jamais inventer un fait local), corrigé.

## Ce qui reste disponible pour le lot 4

Les spots sélectionnés par la session B et non publiés sont toujours `pending`, avec leur recherche déjà faite dans `lots/lot-03-29.md` : **Pointe de Rostudel, Pointe de Tréfeuntec, Pointe Saint-Gilles, Pointe du Coq, Pointe de Landunvez**. Le lot 4 devrait les reprendre en priorité, la moitié du travail est déjà écrite.

Deux spots restent volontairement de côté : **Pointe de Barnénez** (sentier fermé par arrêté municipal) et **Pointe de Castelmeur** (passage volontairement limité par le Conservatoire du littoral, verdict reject de la session B, non appliqué en base à ce stade : à trancher).

## Leçon de méthode

**Ne pas lancer deux sessions de curation en parallèle.** L'état vit dans la base et dans `LOTS.md`, mais rien n'empêche deux sessions de sélectionner les mêmes spots et de s'écraser mutuellement sur le disque. Si tu veux paralléliser, découpe par département (une session sur le 29, une sur le 56), jamais deux sessions sur le même département.
