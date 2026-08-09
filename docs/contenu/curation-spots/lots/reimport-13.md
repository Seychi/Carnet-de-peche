# Ré-import OSM — 13 (Bouches-du-Rhône)

> Généré par `scripts/import-osm-spots.ts`, relu et corrigé via les scripts d'audit du scratchpad, inséré via `execute_sql` en 9 lots vérifiés. Fichier source : `supabase/seed-spots-import-osm-11-dept13.sql`. **Dernier département de la campagne** (24/24).

## Chiffres

- **307 objets bruts** extraits d'Overpass pour le 13.
- **2 clusters de doublons internes** fusionnés (Pointe Rouge ×3 objets à 247-295 m, Plage du Rouet ×2 à 158 m — 307 → 304).
- **4 lignes retirées** à la relecture manuelle :
  - « Hôtel de Ville » : bâtiment municipal (Marseille), pas un poste de pêche.
  - « Navette maritime - Arrêt Marché Jonquière » : arrêt de transport en commun maritime.
  - « Transit » et « Quai No. 4 » : libellés d'infrastructure portuaire industrielle, sans valeur toponymique pour un pêcheur.
- **0 réassignement département** (le bbox du 13 ne déborde pas sur un voisin côtier du catalogue).
- **300 lignes candidates** au final, toutes en 13 :

| Département | Candidates | Insérées | Écartées (doublon < 150 m avec l'existant) |
|---|---|---|---|
| 13 — Bouches-du-Rhône | 300 | 277 | 23 |

## Note sur les 23 écartées : l'artefact « calanque + pointe »

Les 23 lignes écartées ont été vérifiées individuellement. Le motif dominant est spécifique au littoral des calanques : **OSM cartographie séparément une calanque (l'anse elle-même) et la pointe/le cap qui la borde**, à quelques dizaines de mètres l'un de l'autre. Le filtre `ST_DWithin(150)` fusionne donc les deux en gardant celui inséré en premier. Exemples : « Calanque de Boulégeade » écartée à 61 m de « Pointe de Boulégeade », « Calanque de Carapègue » à 65 m de « Pointe de Carapègue », « Calanque du Mourre de Can » à 47 m de « Pointe du Mourre de Can ». C'est le comportement voulu (un seul poste par lieu réel), mais c'est à connaître au moment du curage : le spot retenu porte parfois le nom de la pointe alors que le pêcheur cherchera la calanque, et vice-versa. Quelques cas sont aussi des collisions avec le catalogue curé (« Phare de Cap-Couronne » à 4 m de `cap-couronne`, « Calanque de Port-Miou » à 28 m de `cassis-port-miou`).

277 + 23 = 300, rien ne manque.

## Vérification finale

Diff exhaustif slug-par-slug (requête anti-jointure) : 277 insérées, 23 confirmées légitimement exclues, 0 manquantes réelles. Aucune ligne `verified=true` ni `moderation_status='approved'` créée.
