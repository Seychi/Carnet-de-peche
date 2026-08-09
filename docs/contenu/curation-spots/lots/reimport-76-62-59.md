# Ré-import OSM — vague 4 (76, 62, 59 — Manche / mer du Nord)

> Généré par `scripts/import-osm-spots.ts`, relu et corrigé via les scripts d'audit du scratchpad, inséré via `execute_sql` en 2 lots vérifiés (petit volume). Fichier source : `supabase/seed-spots-import-osm-09-vague4.sql`.

## Chiffres

- **88 objets bruts** extraits d'Overpass pour 76 (Seine-Maritime), 62 (Pas-de-Calais), 59 (Nord) — la plus petite vague de la campagne (façade courte et déjà bien couverte par le catalogue curé existant).
- **4 lignes retirées** à la relecture :
  - « Strait of Dover / Pas de Calais » : nom de la Manche/du détroit lui-même, pas un poste de bord (échelle bien trop large, comparable à nommer « Atlantique » comme spot).
  - « Paserelle Véicule POSTE 10 TN101 » et « ...POSTE 11 TN111 » : passerelles véhicules d'un terminal ferry, infrastructure portuaire industrielle, pas un poste de pêche.
- **1 cluster de doublon interne** fusionné (Port de plaisance du Tréport, 2 objets à 179 m, même nom).
- **1 réassignement département** (spillover mineur, sans conséquence sur le périmètre de la vague).
- **84 lignes candidates** au final :

| Département | Candidates | Insérées | Écartées (doublon < 150 m avec l'existant) |
|---|---|---|---|
| 59 — Nord | 8 | 8 | 0 |
| 62 — Pas-de-Calais | 48 | 46 | 2 |
| 76 — Seine-Maritime | 28 | 27 | 1 |
| **Total** | **84** | **81** | **3** |

Les 3 lignes écartées (Cap Gris-Nez, Cap Blanc-Nez, Phare de Fécamp) sont trois landmarks déjà présents dans le catalogue curé, à 0-142 m des nouveaux points OSM. 81 + 3 = 84, rien ne manque.

## Vérification finale

Diff exhaustif slug-par-slug entre les 84 lignes attendues et une requête ciblée sur la table : 81 présentes, 3 confirmées légitimement exclues, 0 manquantes. Aucune ligne `verified=true` ni `moderation_status='approved'` créée.
