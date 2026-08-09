# Incident qualité — coordonnées fausses (2026-08-06)

> Signalé par John : « certains spots étaient complètement faux, par exemple Plage de Penhors qui est au milieu de la terre », puis « Le Diben (Brest) qui est au milieu de la mer ».
> **Deux causes distinctes, sans rapport l'une avec l'autre. Les deux sont traitées.**

## Cause 1 — Le catalogue curé contient des coordonnées saisies à la main, arrondies

Ce n'est **pas** un problème d'import. Les deux spots signalés sont `source='curated'`, créés le 2026-05-11, parmi les 215 fiches de référence du catalogue.

| Spot | Coordonnée en base | Réalité | Écart |
|---|---|---|---|
| Plage de Penhors | `47.96000 / -4.31000` | ~47.976 / -4.374 (Pouldreuzic) | **~5 km dans les terres** |
| Le Diben (Brest) | `48.21000 / -4.43000` | Le Diben est un port de **Plougasnou**, baie de Morlaix, ~48.71 / -3.83 | **~60 km, et en pleine mer** |

Le signal qui les trahit : **des coordonnées à deux décimales pile**. Une latitude à deux décimales, c'est une grille de 1,1 km : personne ne relève un point GPS comme ça. C'est une saisie approximative faite de mémoire ou d'après une carte.

**Mesure du problème sur toute la base :**

| Source | Total | Coord. à 2 décimales | Coord. à 3 décimales |
|---|---|---|---|
| `curated` | 215 | **9** | 20 |
| `imported` | 942 | 0 | 0 |
| `community` | 3 | 0 | 0 |

Les imports sont propres sur cet axe (coordonnées OSM à 7 décimales). Le problème est **circonscrit au catalogue curé, et aux 9 fiches à 2 décimales**.

**Action : les 9 fiches sont dépubliées** (`moderation_status='pending'`, réversible, aucune suppression). Sur les deux que John a vérifiées, deux étaient fausses : il n'y a aucune raison de faire confiance aux sept autres tant qu'elles n'ont pas été re-géocodées.

| Spot dépublié | Dépt | Coordonnée suspecte |
|---|---|---|
| Anse de Térénez | 29 | 48.09 / -4.50 |
| Belle-Île - Pointe des Poulains | 56 | 47.39 / -3.25 |
| Cap Sizun | 29 | 48.06 / -4.66 |
| Île d'Ouessant - Lampaul | 29 | 48.45 / -5.10 |
| Île de Sein - Cale Nord | 29 | 48.04 / -4.85 |
| Le Diben (Brest) | 29 | 48.21 / -4.43 |
| Plage de Penhors | 29 | 47.96 / -4.31 |
| Pointe de Pen-Hir | 29 | 48.26 / -4.62 |
| Quiberon - Côte Sauvage | 56 | 47.50 / -3.13 |

**À faire ensuite** : re-géocoder ces 9 spots un par un (coordonnée sourcée, pas arrondie), corriger le nom quand il est faux (« Le Diben (Brest) » désigne un port de Plougasnou : nom ET département à revoir), puis republier. Les 11 fiches à 3 décimales (~100 m de grille) restent publiées mais sont à contrôler au même passage.

⚠️ **Effet de bord assumé** : ces 9 slugs sortent du sitemap et renvoient 404 le temps de la correction. Publier une coordonnée qui envoie un pêcheur dans un champ ou à l'eau est pire qu'un 404 temporaire.

## Cause 2 — Le script d'import plaçait les objets étendus au centre de leur boîte englobante

Défaut réel, introduit ou aggravé par le ré-import élargi que je viens de livrer, et qui aurait produit exactement le même symptôme sur les 207 plages du 56.

Le script demandait `out center` à Overpass. Pour un `node`, c'est exact. Pour un **`way`**, `center` renvoie le **centre de la boîte englobante**, pas un point sur l'objet :

- une **plage en arc de cercle** : le centre de la bbox tombe dans les terres, derrière la dune ;
- un **polygone d'anse ou de baie** : le centre tombe au large ;
- un **cap tracé en polygone** : le centre tombe à l'intérieur des terres.

Tant que le script ne requêtait que des digues, jetées et quais (objets linéaires courts), l'écart restait de quelques dizaines de mètres. **En ajoutant `natural=beach`, `bay` et `reef`, l'élargissement transformait ce détail en défaut majeur.**

**Correctif appliqué** dans `scripts/import-osm-spots.ts` :

- la requête passe de `out center tags` à **`out geom tags`**, qui renvoie la polyligne complète ;
- `toLonLat` prend désormais le **sommet médian** de cette géométrie. Pour une plage ou une digue tracée en ligne, c'est le milieu de l'ouvrage. Pour un polygone, c'est un point de son contour, donc sur le rivage. Par construction, jamais dans les terres ;
- `center` n'est plus qu'un dernier recours pour les relations ;
- le script **rapporte en fin d'exécution** le nombre d'objets dont le sommet retenu s'écarte de plus de 300 m de l'ancien centre de bbox, avec l'écart maximum. C'est la mesure directe de ce que l'ancienne méthode plaçait n'importe où.

**Les deux fichiers déjà générés sont périmés et renommés en conséquence** (aucun n'a été inséré, donc aucune donnée fausse en base) :

- `supabase/seed-spots-import-osm-02-56.PERIME-NE-PAS-INSERER.sql` (515 lignes, le 56)
- `supabase/seed-spots-import-osm-03-vides.PERIME-NE-PAS-INSERER.sql` (566 lignes, 85/06/2A/2B)

Vérifié en SQL : les départements 85, 06, 2A et 2B ont toujours **0 spot importé**, la seconde tentative n'a pas été insérée non plus. Aucun dégât.

**À relancer avec le script corrigé :**

```bash
pnpm tsx scripts/import-osm-spots.ts --dept=56 --out=supabase/seed-spots-import-osm-04-56.sql
pnpm tsx scripts/import-osm-spots.ts --dept=85,06,2A,2B --out=supabase/seed-spots-import-osm-05-vides.sql
```

Regarde la ligne « Positionnement » du rapport de fin : elle dit combien d'objets l'ancienne méthode plaçait de travers.

## Ce que l'incident change dans la méthode

Deux règles s'ajoutent à celles de `LOTS.md` :

1. **Une coordonnée arrondie est une coordonnée fausse jusqu'à preuve du contraire.** Deux décimales = grille de 1,1 km. Tout spot dont la position n'a pas la précision d'un relevé réel est suspect, quelle que soit sa source.
2. **Ne jamais dériver une position d'un centre de boîte englobante.** Pour tout objet étendu, la position doit être un point appartenant à l'objet.

À reporter dans `PLAYBOOK.md` §4 avec la règle de vérification toponymique croisée du `lot-08-audit-geo.md`.

## Limite de ce que j'ai pu vérifier, à dire franchement

Il n'existe **aucune donnée de trait de côte dans la base** et l'environnement de session n'a pas d'accès réseau. Je n'ai donc **pas** pu faire tourner un test automatique « ce point est-il en mer ou à terre » sur les 1 160 spots. Ce que j'ai fait est plus étroit mais démontrable : détecter les coordonnées arrondies, ce qui a suffi à isoler les deux cas que tu avais repérés et sept autres du même lot de saisie.

**Le contrôle exhaustif reste à faire**, et il demande une source de trait de côte. Deux pistes, par ordre de simplicité :

- **Open-Meteo Marine** renvoie une erreur pour un point terrestre : une passe sur les 1 160 spots donnerait la liste des spots à terre pour un coût nul. Le projet appelle déjà cette API.
- Charger un trait de côte OSM dans une table PostGIS et calculer `ST_Distance` pour chaque spot : plus lourd, mais réutilisable comme garde-fou permanent, y compris sur les spots communautaires.

Je recommande la première, et de la brancher comme contrôle automatique du playbook plutôt que comme opération ponctuelle.
