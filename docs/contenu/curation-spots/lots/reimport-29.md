# Ré-import OSM — 29 (Finistère)

> Généré par `scripts/import-osm-spots.ts`, relu et corrigé via les scripts d'audit du scratchpad, inséré via `execute_sql` en 22 petits lots vérifiés. Fichier source : `supabase/seed-spots-import-osm-10-dept29.sql`. Département volontairement traité en avant-dernier (avant le 13) : sa propre ré-importation fournit le groupe de contrôle nécessaire pour rejouer l'audit toponymique du lot 8 sur les 94 fiches publiées du 29.

## Chiffres

- **768 objets bruts** extraits d'Overpass pour le 29 (le plus gros fichier de toute la campagne).
- **4 clusters de doublons internes** fusionnés automatiquement (Port blanc, Anse de Rospico, Trez Rouz, Plage de Kerveltrec — 768 → 764).
- **8 lignes retirées** à la relecture manuelle :
  - « Passerelle Ponton Plaisance » et « Passerelle Ro-Ro » : infrastructure de marina/terminal ferry, pas des postes de pêche.
  - « Kerurus Poste SNSM » : station de sauvetage en mer (SNSM), pas un poste de pêche.
  - « Sentier Côtier » : nom d'un sentier de randonnée (linéaire), pas un poste ponctuel.
  - « Appontement liquides » et « Appontement sablier » : infrastructure industrielle portuaire (terminaux vrac).
  - « Accès Sécurité Littoral N°2 » : accès de sécurité municipal numéroté, générique.
  - « Cale de mise à l'eau réservée aux professionnels » : explicitement hors usage amateur/loisir.
  - « Jetée ponton annexes » : ponton privé pour annexes de plaisance, pas un poste public.
- **26 réassignements département** par contrôle point-in-polygon (22 vers le 22, 4 vers le 56, spillover mineur en bordure de département).
- **756 lignes candidates** au final, réparties :

| Département | Candidates | Insérées | Écartées (doublon < 150 m avec l'existant) |
|---|---|---|---|
| 29 — Finistère | 730 | ~629 | ~101 |
| 22 — Côtes-d'Armor (reçu par réassignement) | 22 | 22 | 0 |
| 56 — Morbihan (reçu par réassignement) | 4 | 4 | 0 |
| **Total** | **756** | **655** | **101** |

## Taux de doublon nettement plus élevé que les autres vagues (101/756 ≈ 13 %)

Contrairement aux départements des vagues 1-4 (jamais importés/curés avant cette campagne), le **29 possède déjà un catalogue curé étoffé** (des centaines de spots à slugs descriptifs du type `pointe-de-langoz-loctudy`, `cap-de-la-chevre-crozon`, `beg-ar-manac-h-landunvez`…). Le ré-import OSM redécouvre naturellement ces mêmes points sous leur identifiant OSM brut. Vérification exhaustive : les 101 lignes écartées ont été contrôlées individuellement (requête `slug_collision` + `near_dup_150m`) — la quasi-totalité correspond à une correspondance **à 0 m** avec un spot déjà curé sous le même nom (ex. « Pointe de Penmarc'h » ↔ `pointe-de-penmarch`, « Cap Coz » ↔ `cap-coz-fouesnant`), le reste étant à 5-149 m d'un point distinct mais visiblement de la même zone (même quai, même petite anse). 655 + 101 = 756, rien ne manque et aucune duplication réelle n'a été créée.

## Vérification finale

Diff exhaustif slug-par-slug (requête anti-jointure) : 655 insérées, 101 confirmées légitimement exclues (0 manquantes réelles). Aucune ligne `verified=true` ni `moderation_status='approved'` créée.

## Prochaine étape

Le contrôle de groupe fourni par ce ré-import (candidats OSM correctement positionnés via `out geom` + médiane des sommets) permet de rejouer l'audit toponymique du lot 8 sur les 94 fiches déjà publiées du 29 : comparer chaque fiche publiée à ses homonymes OSM fraîchement importés, dépublier celles dont l'écart dépasse ~1 km. Voir RECAP dédié si des dépublications sont trouvées.
