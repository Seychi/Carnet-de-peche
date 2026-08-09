# Audit géographique du 56 + relecture du ré-import (2026-08-06)

> Déclenché par une anomalie repérée en relisant le fichier d'import élargi : « plage du Bile » y figurait à 47.443 / -2.483, alors que le spot publié au lot 6 sous le nom « Pointe du Bile » était à 47.508 / -2.608. **12 km d'écart.**
> Cette note documente l'erreur, l'audit systématique qu'elle a déclenché, et la relecture du fichier d'import avant insertion.

## 1. L'erreur : Pointe du Bile

**Ce qui s'est passé.** L'objet OSM `node/5921994532`, nommé « Pointe du Bile », est positionné à **47.50845 / -2.60819**, soit dans le secteur d'Ambon-Damgan, à l'ouest de la rivière de Pénerf. Or la vraie pointe du Bile est à **47.4415 / -2.4806**, en Pénestin, confirmé par recherche et par deux autres objets OSM du même toponyme dans le ré-import (« plage du Bile » à 47.4429 / -2.4826 et « Baie du Bile » à 47.4440 / -2.4761, distants de 12 km du spot publié).

**Ce que j'ai fait de faux.** J'ai recherché « pointe du Bile Pénestin », trouvé de bonnes sources sur les falaises ocres de Pénestin, et rédigé la fiche à partir de ces sources **sans vérifier que la coordonnée du spot correspondait bien à la commune décrite**. Le playbook §4 impose pourtant une « vérification géo systématique » ; je l'ai faite sur la cohérence avec le trait de côte et sur la distance aux spots déjà approuvés, mais pas sur la concordance toponyme / commune. C'est le trou de la méthode.

**Correction appliquée** : le spot est repassé en `pending`, contenu vidé (`description`, `access_notes`, `species`, `techniques`, `hazards`), nom et slug OSM restaurés (`pointe-du-bile-osm5921994532`). Il ne réapparaîtra que si un lot ultérieur identifie ce qu'est réellement le poste à cette coordonnée.

## 2. Second retrait, par prudence : Beg er Lann

Le spot publié au lot 7 sous « Pointe de Beg er Lann (château Turpault) » est à **47.47294 / -3.13069**, alors que le château Turpault est à environ **47.481 / -3.127**, soit ~1 km plus au nord. L'objet OSM (`beg-er-lan`) est donc probablement un micro-toponyme voisin, pas la pointe de la Lande.

Le poste reste sur le même linéaire de la côte sauvage et la description générique tiendrait, mais deux affirmations de la fiche ne tiennent pas : le château Turpault et « marque l'entrée de la côte sauvage ». Ne pouvant pas trancher, j'applique la règle « le doute ne se publie jamais » : **repassé en `pending`**, contenu vidé, nom et slug OSM restaurés.

## 3. Audit systématique des 22 fiches du 56

Le ré-import fournit un jeu de contrôle inespéré : 522 objets OSM nommés et géolocalisés sur tout le département. Pour chaque fiche publiée, j'ai cherché dans ce jeu les objets partageant le toponyme et mesuré leur distance au spot.

**Principe** : un vrai poste est entouré de ses homonymes (la plage, l'anse, le port du même nom sont à quelques centaines de mètres). Un toponyme dont les homonymes sont à plusieurs kilomètres est un objet mal placé.

| Fiche | Homonymes trouvés | Verdict |
|---|---|---|
| Pointe de Kervoyal | Plage 352 m · Grande Plage 532 m · Baie 1 575 m | ✅ cohérent |
| Pointe de Pen Lan | Phare 247 m · Port 412 m | ✅ cohérent |
| Pointe de Penvins | Petite plage 271 m · Plage 977 m | ✅ cohérent |
| Pointe du Conguel | Anse 878 m · Plage 987 m | ✅ cohérent |
| Pointe Saint-Colomban | Crique sud 170 m · Plage 488 m | ✅ cohérent |
| Pointe de Brouël | Le Brouel 644 m · Plage 1 092 m | ✅ cohérent |
| Pointe de Gâvres | Petite mer de Gâvres 4 806 m (entité étendue, normal) | ✅ cohérent |
| Pointe de Berno | Anse de Bernon 7 522 m (toponyme différent) | ✅ cohérent |
| **Pointe du Bile** | **plage du Bile 11 931 m · Baie du Bile 12 243 m** | 🔴 **objet mal placé** |
| 13 autres fiches | homonyme unique à 0-1 m (l'objet lui-même) | ✅ rien à signaler |

**Conclusion : 1 erreur sur 22 fiches publiées** (plus 1 retrait de prudence). Les 20 autres sont géographiquement saines.

## 4. Nouvelle règle de méthode (à appliquer dès le lot 8)

> **Vérification toponymique croisée.** Avant de rédiger, confronter la coordonnée du spot à une source qui donne la position du toponyme (ou aux objets OSM homonymes du même import). Si l'écart dépasse ~1 km, l'objet OSM est mal nommé ou mal placé : ne pas publier, laisser `pending`. Ne jamais déduire la commune du seul nom de l'objet.

À reporter dans `PLAYBOOK.md` §4 à la prochaine passe documentaire.

**Portée du problème au-delà du 56** : le même contrôle n'a pas été fait sur les 101 fiches du Finistère, faute de jeu de contrôle. Il deviendra possible dès que le ré-import élargi aura été lancé sur le 29. **À planifier** : rejouer cet audit sur le 29 après son ré-import, avant de considérer le département comme définitivement clos.

## 5. Relecture du fichier d'import (`supabase/seed-spots-import-osm-02-56.sql`)

Le script a rendu **522 candidats** pour le 56 (3 062 éléments Overpass, 99 écartés par le filtre de noms). Relecture avant insertion, comme l'exige l'en-tête du fichier.

**Répartition par structure** : 207 `plage` · 158 `NULL` (bay, reef, lighthouse : volontairement non typés) · 103 `pointe_rocheuse` · 27 `digue` · 24 `cale` · 3 `passe`. Les plages arrivent bien, c'était l'objectif du ré-import.

**Deux corrections appliquées au fichier :**

1. **43 lignes réassignées au département 44.** La bbox du 56 déborde au sud du traict de Pen Bé et ramasse toute la presqu'île guérandaise : Le Croisic, Pen Bron, Piriac et la pointe du Castelli, La Turballe, Mesquer, Pen Bé, Assérac. Critère retenu : `lat < 47.435`, la limite 56/44 au littoral suivant le traict de Pen Bé. Les **12 lignes de la zone limite** (Pointe du Bill, plage et Baie du Bile, l'Espernel, Palandrin, Golumer, Lanchale, Loscolo, Maresclé, Poudrantais, Pont Mahé) sont des toponymes de **Pénestin** et restent en 56 ; seul « plage de Pont Mahé » est un cas frontalier assumé, la curation tranchera. Ces 43 lignes alimentent désormais le backlog du 44 au lieu de fausser celui du 56.
2. **7 lignes supprimées** : pontons de marina passés au travers du filtre (« Panne K' » à cause de l'apostrophe, « Ponton Pen Duick », « Ponton d'Honneur », « Ponton Pêche », « Ponton M Ouest », « Ponton de la Découverte », « ponton d'accès »).

**Filtre du script durci en conséquence** (`isInvalidName`) : la ponctuation est retirée avant le test des pannes et quais numérotés, et **tout nom commençant par « Ponton » est rejeté** (un ponton est un appontement de marina, jamais un poste de bord). Re-testé sur 35 cas : 23 rejets et 12 conservations, tous corrects, en conservant les vrais toponymes bretons courts (« Le Poul », « Le Ster », « Le Four ») et les plages de Pénestin.

**Fichier final : 515 lignes, prêt à insérer.** Le `NOT EXISTS ST_DWithin(150 m)` écartera à l'insertion les objets déjà présents (dont les 22 spots du 56 déjà curés, qui figurent dans le fichier avec leur ancien slug OSM).

## 6. État après correction (SQL live, 2026-08-06)

- **320 spots approuvés** au total (contre 322 avant les deux retraits) · **103 importés approuvés**.
- **27 approuvés sur le 56** · **86 pending sur le 56** · **695 pending au total**.
- **101 approuvés sur le 29**, inchangé.
- 0 slug dupliqué · 0 fiche incomplète · 0 badge posé à tort.

## 7. Ce qu'il reste à faire

1. **Insérer le fichier relu** (commande ci-dessous), puis re-mesurer le backlog du 56 et du 44.
2. Lot 8 sur le 56, en appliquant la nouvelle règle de vérification toponymique croisée, avec les plages enfin disponibles.
3. Rejouer l'audit géographique sur le 29 après son ré-import.
4. Toujours ouvert : la grappe d'une dizaine de spots du **premier** import rattachés au 56 mais situés en 44 (secteur Piriac / Castelli), cf `lot-06-56.md` §5. Le critère `lat < 47.435` validé ici donne le prédicat pour les corriger.

```bash
psql "$DATABASE_URL" -f supabase/seed-spots-import-osm-02-56.sql
# ou : Supabase Studio → SQL Editor → coller le fichier → Run
```
