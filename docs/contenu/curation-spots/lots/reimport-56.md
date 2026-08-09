# Ré-import OSM — 56 (Morbihan)

> Fichier source : `supabase/seed-spots-import-osm-04-56.sql`. Ce fichier avait déjà été généré et relu lors du lot 8 (audit géo) ; cette session a fait une **seconde passe de relecture** avant insertion, qui a trouvé deux pollutions supplémentaires.

## Chiffres

- **508 lignes** insérées (fichier final, après les retraits ci-dessous).
- **Retraits de la seconde passe** (au-delà de ceux du lot 8) :
  - « Navix » : compagnie de vedettes à passagers (Arzon), jamais un poste de bord.
  - « L'Estacade » / « l'estacade » ×2 : appontement de marina déjà rejeté au lot 12, qui repassait par une faille du filtre de noms.

## ★ Correction durable apportée au script

Ces deux retraits ont révélé **deux failles du filtre `isInvalidName()`** de `scripts/import-osm-spots.ts`, corrigées à la source pour bénéficier à toutes les vagues suivantes :

1. `navix` n'était pas dans `GENERIC_NAMES` → ajouté.
2. **L'apostrophe empêchait le match** : « l'estacade » ne correspondait pas à l'entrée `estacade` de `GENERIC_NAMES` parce que la normalisation ne remplaçait pas les apostrophes. Ajout d'une comparaison supplémentaire sur le nom apostrophes-remplacées-par-espaces, plus un rejet des noms purement numériques (« 2 », « 11 », « 16 »).

C'est la raison pour laquelle les vagues 2 à 4, le 29 et le 13 n'ont plus jamais fait remonter d'« estacade » ou de nom générique de ce type : le correctif est en amont, dans le générateur.

## Vérification

Insertion vérifiée par comptage en base après coup. Aucune ligne `verified=true` ni `approved` créée.
