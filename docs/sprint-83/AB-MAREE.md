<!-- généré par le Bloc 1 du sprint 83, ne pas éditer à la main -->
# Sprint 83 / Bloc 1 — cohortes de l'A/B « la marée dans le titre »

> Figé le **2026-08-17**, sur l'inventaire de prod du même jour :
> **607 spots** `moderation_status='approved'` et `visibility='public'`.

## Ce qui est testé

| | Cohorte A (témoin) | Cohorte B (traitement) |
|---|---|---|
| Gabarit | `Pêche à {nom} ({dept}) : {espèces}` | `{nom} ({dept}) : marée du jour et spot de pêche` |
| Le mot « marée » dans le `<title>` | non | **oui** |
| Liste d'espèces | oui | non |

Rien d'autre ne change : la meta description, l'OG, la Twitter card, le `<h1>` et
le contenu de la page sont identiques dans les deux cohortes.

## Périmètre

Seuls les **15 départements à marée calibrée** sur un port audité participent
(`DEPARTMENT_FACADE`, `lib/conditions/tide-departments.ts`) : 14, 50, 76, 59, 62,
35, 22, 29, 56, 44, 85, 17, 33, 40, 64.

La Méditerranée et la Corse en sont exclues et restent **toutes** en cohorte A :
leur marnage est négligeable et non audité, promettre « la marée du jour » y
serait une promesse creuse. Cela met **271 spots hors expérience**.

| | spots |
|---|---|
| Inventaire publié | 607 |
| Hors périmètre (Méditerranée, Corse) | 271 |
| **Dans l'expérience** | **336** |
| dont cohorte A | 161 (47.9 %) |
| dont **cohorte B** | **175 (52.1 %)** |

## Comment la répartition est faite

`spotTitleCohort(slug, department)` dans `lib/seo/spot-title.ts` : hash FNV-1a
32 bits du **slug**, suivi du finaliseur murmur3, puis `% 2`. Fonction **pure** :

- **reproductible** : rejouer le hash sur les slugs ci-dessous redonne exactement
  ces deux listes, sur n'importe quelle machine ;
- **stable dans le temps** : aucun aléatoire, aucun cookie, aucun feature flag. Un
  spot ne change jamais de cohorte, donc Google ne voit jamais un titre danser ;
- **insensible aux ajouts** : les spots curés plus tard (941 en attente) recevront
  leur cohorte par le même hash sans déplacer une seule affectation existante.

Le finaliseur murmur3 n'est pas décoratif : FNV-1a nu termine par une
multiplication par un nombre impair, donc son bit 0 vaut la parité du XOR des
bits de poids faible de tous les caractères, et `% 2` ne lit que ce bit. Sans
finaliseur, la cohorte serait une parité de slug, corrélable au nommage d'un lot.

## Répartition par département

| Dépt | | Total | A | B | part B |
|---|---|---:|---:|---:|---:|
| 14 | Calvados | 4 | 4 | 0 | 0 % |
| 17 | Charente-Maritime | 14 | 10 | 4 | 29 % |
| 22 | Côtes-d'Armor | 33 | 16 | 17 | 52 % |
| 29 | Finistère | 94 | 46 | 48 | 51 % |
| 33 | Gironde | 13 | 6 | 7 | 54 % |
| 35 | Ille-et-Vilaine | 5 | 2 | 3 | 60 % |
| 40 | Landes | 10 | 7 | 3 | 30 % |
| 44 | Loire-Atlantique | 12 | 7 | 5 | 42 % |
| 50 | Manche | 8 | 5 | 3 | 38 % |
| 56 | Morbihan | 105 | 41 | 64 | 61 % |
| 59 | Nord | 3 | 1 | 2 | 67 % |
| 62 | Pas-de-Calais | 5 | 2 | 3 | 60 % |
| 64 | Pyrénées-Atlantiques | 12 | 6 | 6 | 50 % |
| 76 | Seine-Maritime | 6 | 2 | 4 | 67 % |
| 85 | Vendée | 12 | 6 | 6 | 50 % |
| | **Total** | **336** | **161** | **175** | **52 %** |

⚠️ **À lire avant d'interpréter à J+21.** La répartition globale est équilibrée
(52.1 %), mais elle ne l'est pas département par département : le hash
ne connaît pas les strates. Le Morbihan (56), qui porte à lui seul 105 des 336
spots, penche du côté B. Les petits départements (3 à 14 spots) sont du bruit
binomial pur, et le Calvados (4 spots) n'a **aucun** représentant en B.
Conséquence pratique : **comparer les CTR à volume comparable** (pondérer par les
impressions, ou restreindre l'analyse aux départements 22, 29 et 56 qui portent
232 des 336 spots), et ne surtout pas lire une moyenne simple des positions par
cohorte.

## Les spots repères du sprint

Le tirage, purement dérivé des slugs, place les quatre spots cités par le brief
de part et d'autre. C'est une coïncidence, mais elle rend les cas qui ont motivé
le sprint directement observables.

| Spot | Requête citée | Impressions / clics (28 j) | Position | Cohorte |
|---|---|---|---|---|
| Pointe de Pen Lan (56) | « maree pen lan » | 29 / 0 | 10,2 | **B** |
| Pointe de Rostiviec (29) | « marée rostiviec » | 25 / 0 | 8,8 | **B** |
| Pointe de Tréfeuntec (29) | « pointe de trefeuntec » | 97 / 0 | 10,3 | A |
| Pointe du Grand Minou (29) | « pointe du grand minou » | 59 / 7 | 5,8 | A |

Les deux requêtes à intention « marée » explicite, celles qui portent l'hypothèse
et qui ne prennent aujourd'hui **aucun clic**, reçoivent donc le traitement. Les
deux requêtes de nom de lieu nu, dont le contraste de CTR justifie le sprint,
restent au témoin. À J+21, regarder ces quatre lignes en premier, puis seulement
les agrégats.

## Limites connues du protocole

- L'affectation est indépendante du trafic (elle ne dépend que du slug), donc
  **sans biais**. Mais elle n'égalise pas les impressions : si une fiche à fort
  volume tombe d'un côté, elle pèse. Regarder la distribution, pas la moyenne.
- **7 spots sur 336** descendent jusqu'au palier le plus court, `{nom} ({dept}) : marée`,
  parce que leur nom dépasse 39 caractères et n'a pas de tiret cadratin où couper.
  Ils sont dans les listes ci-dessous, titre affiché : on voit exactement ce qui
  est servi.
- Saisonnalité : fin août baisse mécaniquement sur un site de pêche du bord. **Le
  repère est la position, pas le volume.**

## Comment rejouer la mesure à J+21

Les listes ci-dessous sont la clé de jointure : une fiche vit à `/spots/<slug>`.

1. Exporter GSC par `pagepath`, filtré sur `/spots/`, sur la fenêtre J → J+21
   (et la même longueur de fenêtre AVANT déploiement, pour la lecture en écart).
2. Étiqueter chaque ligne A ou B en joignant sur le slug.
3. Comparer **CTR et position**, pondérés par les impressions, cohorte contre
   cohorte, puis restreints aux départements 22, 29 et 56.
4. Regarder séparément les 4 spots repères ci-dessus.

Le code peut réétiqueter n'importe quel slug sans consulter ce fichier :
`spotTitleCohort(slug, department)` est pur et n'a aucun état.

## Cohorte B (traitement, 175 spots) — le `<title>` servi

**17 Charente-Maritime (4)**

- `estacade-de-chatelaillon` → Estacade de Châtelaillon-Plage (17) : marée et spot de pêche
- `phare-de-chassiron` → Phare de Chassiron (17) : marée du jour et spot de pêche
- `pointe-de-la-coubre` → Pointe de la Coubre (17) : marée du jour et spot de pêche
- `pointe-du-fier-la-patache` → Pointe du Fier, La Patache (17) : marée et spot de pêche

**22 Côtes-d'Armor (17)**

- `cap-frehel` → Cap Fréhel, plateformes basses (22) : marée et spot de pêche
- `digue-du-port-d-erquy` → Digue du port d'Erquy (22) : marée du jour et spot de pêche
- `mole-du-port-d-armor` → Môle du port d'Armor (22) : marée du jour et spot de pêche
- `phare-de-mean-ruz-ploumanach` → Phare de Mean Ruz : pointe de Ploumanac'h (22) : marée
- `plage-de-la-ville-berneuf-pleneuf` → Plage de la Ville Berneuf (22) : marée et spot de pêche
- `plage-de-trestraou-perros-guirec` → Plage de Trestraou (22) : marée du jour et spot de pêche
- `plage-des-godelins-etables-sur-mer` → Plage des Godelins (22) : marée du jour et spot de pêche
- `plage-du-portuais-erquy` → Plage du Portuais (22) : marée du jour et spot de pêche
- `plage-du-val-andre-pleneuf` → Plage du Val André (22) : marée du jour et spot de pêche
- `pointe-de-bihit-trebeurden` → Pointe de Bihit (22) : marée du jour et spot de pêche
- `pointe-de-chateau-renard-plevenon` → Pointe de Château Renard (22) : marée et spot de pêche
- `pointe-de-l-arcouest` → Pointe de l'Arcouest (22) : marée du jour et spot de pêche
- `pointe-de-la-garde-saint-cast` → Pointe de la Garde (22) : marée du jour et spot de pêche
- `pointe-de-sehar-locquemeau` → Pointe de Séhar (22) : marée du jour et spot de pêche
- `pointe-du-chateau-plougrescant` → Pointe du Château, Gouffre de Plougrescant (22) : marée
- `pointe-du-dourven-tredrez-locquemeau` → Pointe du Dourven (22) : marée du jour et spot de pêche
- `sillon-de-talbert` → Sillon de Talbert (22) : marée du jour et spot de pêche

**29 Finistère (48)**

- `aber-wrach-sainte-marguerite` → Aber Wrac'h, dunes de Sainte-Marguerite (29) : marée du jour
- `beg-ar-billou-santec` → Beg ar Billou (29) : marée du jour et spot de pêche
- `beg-ar-c-hale-ile-de-sein` → Beg ar C'hale (29) : marée du jour et spot de pêche
- `beg-ar-galeti-portsall` → Beg ar Galeti (29) : marée du jour et spot de pêche
- `beg-ar-garreg-plonevez-porzay` → Beg ar Garreg (29) : marée du jour et spot de pêche
- `beg-ar-groas-aber-ildut` → Beg ar Groas (29) : marée du jour et spot de pêche
- `beg-ar-groaz-landunvez` → Beg ar Groaz (29) : marée du jour et spot de pêche
- `beg-ar-rip-postolonnec` → Beg ar Rip (pointe de Postolonnec) (29) : marée du jour
- `beg-ar-skeiz-guisseny` → Beg ar Skeiz (29) : marée du jour et spot de pêche
- `beg-ar-spins-plouguerneau` → Beg ar Spins (29) : marée du jour et spot de pêche
- `cale-de-beg-meil` → Cale de Beg-Meil (29) : marée du jour et spot de pêche
- `cale-de-kerglonou-aber-ildut` → Cale de Kerglonou (29) : marée du jour et spot de pêche
- `cale-de-moulin-mer` → Cale de Moulin-Mer (29) : marée du jour et spot de pêche
- `cale-du-vil-ile-de-batz` → Cale du Vil (île de Batz) (29) : marée et spot de pêche
- `cap-coz-fouesnant` → Cap Coz (29) : marée du jour et spot de pêche
- `mole-du-raoulic-audierne` → Môle du Raoulic (Audierne) (29) : marée et spot de pêche
- `phare-du-petit-minou` → Phare du Petit Minou (29) : marée du jour et spot de pêche
- `pointe-de-beg-meil` → Pointe de Beg-Meil (29) : marée du jour et spot de pêche
- `pointe-de-bloscon-roscoff` → Pointe de Bloscon (29) : marée du jour et spot de pêche
- `pointe-de-brenterc-h-ploumoguer` → Pointe de Brenterc'h (29) : marée du jour et spot de pêche
- `pointe-de-doubidy` → Pointe de Doubidy (29) : marée du jour et spot de pêche
- `pointe-de-kastel-koz-beuzec` → Pointe de Kastel Koz (29) : marée du jour et spot de pêche
- `pointe-de-kermorvan` → Pointe de Kermorvan (29) : marée du jour et spot de pêche
- `pointe-de-l-armorique-plougastel` → Pointe de l'Armorique (29) : marée du jour et spot de pêche
- `pointe-de-la-torche` → Pointe de la Torche (29) : marée du jour et spot de pêche
- `pointe-de-lanveoc` → Pointe de Lanvéoc (29) : marée du jour et spot de pêche
- `pointe-de-lostmarc-h-crozon` → Pointe de Lostmarc'h (29) : marée du jour et spot de pêche
- `pointe-de-luguenez-beuzec` → Pointe de Luguénez (29) : marée du jour et spot de pêche
- `pointe-de-penmarch` → Pointe de Penmarc'h (29) : marée du jour et spot de pêche
- `pointe-de-portzen-crozon` → Pointe de Portzen (29) : marée du jour et spot de pêche
- `pointe-de-rostiviec-loperhet` → Pointe de Rostiviec (29) : marée du jour et spot de pêche
- `pointe-de-rostudel-crozon` → Pointe de Rostudel (29) : marée du jour et spot de pêche
- `pointe-de-souc-h-plouhinec` → Pointe de Souc'h (29) : marée du jour et spot de pêche
- `pointe-de-trevignon` → Pointe de Trévignon (29) : marée du jour et spot de pêche
- `pointe-des-capucins-roscanvel` → Pointe des Capucins (29) : marée du jour et spot de pêche
- `pointe-des-grottes-morgat` → Pointe des Grottes (29) : marée du jour et spot de pêche
- `pointe-du-chateau-logonna` → Pointe du Château (29) : marée du jour et spot de pêche
- `pointe-du-cleguer` → Pointe du Cleguer (29) : marée du jour et spot de pêche
- `pointe-du-diable-plouzane` → Pointe du Diable (29) : marée du jour et spot de pêche
- `pointe-du-dolmen-crozon` → Pointe du Dolmen (29) : marée du jour et spot de pêche
- `pointe-du-grand-gouin-camaret` → Pointe du Grand Gouin (29) : marée du jour et spot de pêche
- `pointe-du-guern-telgruc` → Pointe du Guern (29) : marée du jour et spot de pêche
- `pointe-du-raz` → Pointe du Raz (29) : marée du jour et spot de pêche
- `pointe-saint-gilles-benodet` → Pointe Saint-Gilles (29) : marée du jour et spot de pêche
- `pointe-saint-samson-plougasnou` → Pointe Saint-Samson (29) : marée du jour et spot de pêche
- `port-de-carantec` → Port de Carantec (29) : marée du jour et spot de pêche
- `quai-du-rosmeur-douarnenez` → Quai du Rosmeur (29) : marée du jour et spot de pêche
- `rochers-de-saint-guenole` → Rochers de Saint-Guénolé (29) : marée et spot de pêche

**33 Gironde (7)**

- `digue-de-port-medoc` → Le Verdon-sur-Mer, digue de Port-Médoc (33) : marée du jour
- `jetee-de-grand-piquey` → Lège-Cap-Ferret, jetée de Grand-Piquey (33) : marée du jour
- `jetee-du-canon` → Lège-Cap-Ferret, jetée du Canon (33) : marée du jour
- `lacanau-ocean` → Lacanau-Océan (33) : marée du jour et spot de pêche
- `plage-du-cap-ferret` → Plage du Truc Vert (Cap Ferret) (33) : marée du jour
- `pointe-de-grave` → Pointe de Grave (33) : marée du jour et spot de pêche
- `wharf-de-la-salie` → Plage de la Salie Sud (33) : marée du jour et spot de pêche

**35 Ille-et-Vilaine (3)**

- `mole-des-noires` → Môle des Noires (35) : marée du jour et spot de pêche
- `pointe-de-la-varde` → Pointe de la Varde (35) : marée du jour et spot de pêche
- `pointe-du-grouin` → Pointe du Grouin (35) : marée du jour et spot de pêche

**40 Landes (3)**

- `estacade-de-capbreton` → Estacade de Capbreton (40) : marée du jour et spot de pêche
- `plage-de-mimizan` → Embouchure du courant de Mimizan (40) : marée du jour
- `plage-de-moliets-lette-blanche` → Plage de Moliets, Lette Blanche (40) : marée du jour

**44 Loire-Atlantique (5)**

- `jetee-du-trehic` → Jetée du Tréhic (44) : marée du jour et spot de pêche
- `mole-de-pornichet` → Môle de Pornichet (44) : marée du jour et spot de pêche
- `plage-de-saint-brevin` → Plage de Saint-Brevin (44) : marée du jour et spot de pêche
- `pointe-de-chemoulin` → Pointe de Chémoulin (44) : marée du jour et spot de pêche
- `pointe-de-penchateau` → Pointe de Penchâteau (44) : marée du jour et spot de pêche

**50 Manche (3)**

- `cap-de-carteret` → Cap de Carteret (50) : marée du jour et spot de pêche
- `digue-de-dielette` → Diélette, digue du port (50) : marée et spot de pêche
- `pointe-d-agon` → Pointe d'Agon (50) : marée du jour et spot de pêche

**56 Morbihan (64)**

- `barre-d-etel` → Barre d'Étel, rive Plouhinec (56) : marée et spot de pêche
- `beg-en-argol-hoedic` → Beg en Argol (56) : marée du jour et spot de pêche
- `beg-en-vertech-bangor` → Beg en Vertech (56) : marée du jour et spot de pêche
- `beg-er-faut-hoedic` → Beg er Faut (56) : marée du jour et spot de pêche
- `beg-er-goalennec` → Pointe de Beg er Goalennec (56) : marée et spot de pêche
- `beg-er-gorle-houat` → Beg er Gorlé (56) : marée du jour et spot de pêche
- `beg-er-sennerion-hoedic` → Beg er Sennerion (56) : marée du jour et spot de pêche
- `beg-er-skeul-groix` → Beg er Skeul (56) : marée du jour et spot de pêche
- `beg-er-vil-quiberon` → Beg er Vil (56) : marée du jour et spot de pêche
- `beg-rohu` → Pointe de Beg Rohu (56) : marée du jour et spot de pêche
- `beg-run-er-vilaine-houat` → Beg Run er Vilaine (56) : marée du jour et spot de pêche
- `beg-salus-houat` → Beg Salus (56) : marée du jour et spot de pêche
- `cale-de-langle-sene` → Cale de Langle (56) : marée du jour et spot de pêche
- `cale-du-badel-sene` → Cale du Badel (56) : marée du jour et spot de pêche
- `grande-plage-damgan` → Grande Plage de Damgan (56) : marée du jour et spot de pêche
- `jetee-de-locmaria-groix` → Jetée de Locmaria (Groix) (56) : marée et spot de pêche
- `mole-eric-tabarly` → Môle Éric Tabarly (La Trinité-sur-Mer) (56) : marée du jour
- `plage-de-kerguelen-larmor-plage` → Plage de Kerguelen (56) : marée du jour et spot de pêche
- `plage-de-l-anse-du-stole-ploemeur` → Plage de l'Anse du Stole (56) : marée et spot de pêche
- `plage-de-la-falaise-guidel` → Plage de la Falaise (56) : marée du jour et spot de pêche
- `plage-de-la-mine-d-or-penestin` → Plage de la Mine d'Or (56) : marée du jour et spot de pêche
- `plage-de-port-melite-groix` → Plage de Port Mélite (56) : marée du jour et spot de pêche
- `plage-de-sainte-barbe-plouharnel` → Plage de Sainte-Barbe (56) : marée du jour et spot de pêche
- `plage-de-suscinio-sarzeau` → Plage de Suscinio (56) : marée du jour et spot de pêche
- `plage-du-perello-ploemeur` → Plage du Pérello (56) : marée du jour et spot de pêche
- `pointe-churchill-carnac` → Pointe Churchill (56) : marée du jour et spot de pêche
- `pointe-de-beg-en-aud` → Pointe de Beg en Aud (56) : marée du jour et spot de pêche
- `pointe-de-berno-ile-d-arz` → Pointe de Berno (56) : marée du jour et spot de pêche
- `pointe-de-brannec-ile-aux-moines` → Pointe de Brannec (56) : marée du jour et spot de pêche
- `pointe-de-brouel-ile-aux-moines` → Pointe de Brouël (56) : marée du jour et spot de pêche
- `pointe-de-casperaquiz-hoedic` → Pointe de Casperaquiz (56) : marée du jour et spot de pêche
- `pointe-de-gavres` → Pointe de Gâvres (56) : marée du jour et spot de pêche
- `pointe-de-kerners` → Pointe de Kerners (56) : marée du jour et spot de pêche
- `pointe-de-kerpenhir` → Pointe de Kerpenhir (56) : marée du jour et spot de pêche
- `pointe-de-kervoyal` → Pointe de Kervoyal (56) : marée du jour et spot de pêche
- `pointe-de-l-enfer-groix` → Pointe de l'Enfer (56) : marée du jour et spot de pêche
- `pointe-de-l-ours-sarzeau` → Pointe de l'Ours (56) : marée du jour et spot de pêche
- `pointe-de-la-garenne-le-hezo` → Pointe de la Garenne (56) : marée du jour et spot de pêche
- `pointe-de-la-palisse` → Pointe de la Palisse (56) : marée du jour et spot de pêche
- `pointe-de-liouse` → Pointe de Liouse (56) : marée du jour et spot de pêche
- `pointe-de-locmiquel` → Pointe de Locmiquel (56) : marée du jour et spot de pêche
- `pointe-de-marie-venell-saint-pierre-quiberon` → Pointe de Marie Venell (56) : marée du jour et spot de pêche
- `pointe-de-pen-lan-billiers` → Pointe de Pen Lan (56) : marée du jour et spot de pêche
- `pointe-de-penbert` → Pointe de Penbert (56) : marée du jour et spot de pêche
- `pointe-de-penmarch-sauzon` → Pointe de Penmarc'h (56) : marée du jour et spot de pêche
- `pointe-de-penvins` → Pointe de Penvins (56) : marée du jour et spot de pêche
- `pointe-de-roquenec` → Pointe de Roquenec (56) : marée du jour et spot de pêche
- `pointe-de-scouro` → Pointe de Scouro (56) : marée du jour et spot de pêche
- `pointe-de-taillefer-belle-ile` → Pointe de Taillefer (56) : marée du jour et spot de pêche
- `pointe-de-trech` → Pointe de Trec'h (56) : marée du jour et spot de pêche
- `pointe-du-belure` → Pointe du Béluré (56) : marée du jour et spot de pêche
- `pointe-du-berchis-larmor-baden` → Pointe du Berchis (56) : marée du jour et spot de pêche
- `pointe-du-castel-ploemeur` → Pointe du Castel (56) : marée du jour et spot de pêche
- `pointe-du-conguel` → Pointe du Conguel (56) : marée du jour et spot de pêche
- `pointe-du-grand-guet-bangor` → Pointe du Grand Guet (56) : marée du jour et spot de pêche
- `pointe-du-grand-mont` → Pointe du Grand Mont (56) : marée du jour et spot de pêche
- `pointe-du-grognon-groix` → Pointe du Grognon (56) : marée du jour et spot de pêche
- `pointe-du-listrec-locoal-mendon` → Pointe du Listrec (56) : marée du jour et spot de pêche
- `pointe-du-nioul-ile-aux-moines` → Pointe du Nioul (56) : marée du jour et spot de pêche
- `pointe-du-percho` → Pointe du Percho (56) : marée du jour et spot de pêche
- `pointe-du-spernec-groix` → Pointe du Spernec (56) : marée du jour et spot de pêche
- `pointe-du-sperneguy-ile-aux-moines` → Pointe du Spernéguy (56) : marée du jour et spot de pêche
- `pointe-du-vieux-chateau-hoedic` → Pointe du Vieux Château (56) : marée et spot de pêche
- `pointe-er-hastellic-houat` → Pointe er Hastellic (56) : marée du jour et spot de pêche

**59 Nord (2)**

- `jetee-de-malo-les-bains` → Dunkerque, digue de Malo-les-Bains (59) : marée du jour
- `plage-de-bray-dunes` → Bray-Dunes, grande plage (59) : marée et spot de pêche

**62 Pas-de-Calais (3)**

- `cap-gris-nez` → Cap Gris-Nez (62) : marée du jour et spot de pêche
- `digue-carnot-boulogne` → Boulogne-sur-Mer, digue Carnot (62) : marée et spot de pêche
- `jetee-ouest-de-calais` → Calais, jetée Ouest (62) : marée du jour et spot de pêche

**64 Pyrénées-Atlantiques (6)**

- `digue-de-socoa` → Digue de Socoa (64) : marée du jour et spot de pêche
- `embouchure-de-l-adour-anglet` → Anglet (64) : marée du jour et spot de pêche
- `fort-de-socoa-ciboure` → Fort de Socoa (64) : marée du jour et spot de pêche
- `plage-du-centre-bidart` → Bidart, plage du Centre (64) : marée et spot de pêche
- `pointe-saint-martin` → Pointe Saint-Martin (64) : marée du jour et spot de pêche
- `pointe-sainte-barbe` → Pointe Sainte-Barbe (64) : marée du jour et spot de pêche

**76 Seine-Maritime (4)**

- `jetee-du-treport` → Le Tréport, jetée Ouest (76) : marée et spot de pêche
- `jetees-de-dieppe` → Dieppe, jetées de l'avant-port (76) : marée et spot de pêche
- `jetees-de-saint-valery-en-caux` → Saint-Valery-en-Caux, jetées (76) : marée et spot de pêche
- `plage-d-etretat` → Étretat, plage de galets (76) : marée et spot de pêche

**85 Vendée (6)**

- `estacade-de-saint-jean-de-monts` → Estacade de Saint-Jean-de-Monts (85) : marée du jour
- `jetee-de-jard-sur-mer` → Jetée de Jard-sur-Mer (85) : marée du jour et spot de pêche
- `plage-de-la-tranche` → Plage de La Tranche-sur-Mer (85) : marée et spot de pêche
- `plage-des-conches` → Plage des Conches (85) : marée du jour et spot de pêche
- `pointe-du-payre-le-veillon` → Pointe du Payré, Le Veillon (85) : marée et spot de pêche
- `rochers-de-la-normandeliere` → Rochers de la Normandelière (85) : marée et spot de pêche

## Cohorte A (témoin, 161 spots) — le `<title>` servi

**14 Calvados (4)**

- `embouchure-de-l-orne-ouistreham` → Pêche à Ouistreham, embouchure de l'Orne (14) : Bar
- `jetees-de-courseulles` → Pêche à Courseulles-sur-Mer, jetées du chenal (14) : Bar
- `jetees-de-port-en-bessin` → Pêche à Port-en-Bessin, jetées (14) : Bar, Maquereau
- `jetees-de-trouville` → Pêche à Trouville, jetée de la Touques (14) : Bar

**17 Charente-Maritime (10)**

- `digue-de-saint-martin-de-re` → Pêche à Saint-Martin-de-Ré, digue extérieure (17) : Bar
- `digue-richelieu-la-rochelle` → Pêche à La Rochelle, digue Richelieu (Le Mail) (17) : Bar
- `jetee-du-chateau-d-oleron` → Pêche à Le Château-d'Oléron, jetée du port (17) : Bar
- `la-cotiniere` → Pêche à La Cotinière (17) : Bar, Maquereau
- `mole-de-la-flotte` → Pêche à La Flotte, môle du port (17) : Bar, Dorade royale
- `phare-des-baleines` → Pêche à Phare des Baleines (17) : Bar, Sar
- `plage-des-saumonards` → Pêche à Plage des Saumonards (17) : Bar, Dorade royale
- `pointe-de-la-fumee` → Pêche à Pointe de la Fumée (17) : Bar, Dorade royale
- `pointe-de-suzac` → Pêche à Pointe de Suzac (17) : Maigre, Bar
- `pointe-du-chay` → Pêche à Pointe du Chay (Angoulins) (17) : Bar, Dorade royale

**22 Côtes-d'Armor (16)**

- `grande-plage-saint-cast-le-guildo` → Pêche à Grande Plage de Saint-Cast (22) : Bar, Sole
- `phare-de-la-petite-muette-dahouet` → Pêche à Phare de la Petite Muette : digue de Dahouët (22)
- `phare-de-la-pointe-a-l-aigle-plerin` → Pêche à Phare de la Pointe à l'Aigle : jetée du Légué (22)
- `plage-bonaparte-plouha` → Pêche à Plage Bonaparte (22) : Bar, Lieu jaune
- `plage-de-brehec-plouha` → Pêche à Plage de Bréhec (22) : Bar, Lieu jaune
- `plage-de-caroual-erquy` → Pêche à Plage de Caroual (22) : Bar, Sole
- `plage-de-lourtuais-erquy` → Pêche à Plage de Lourtuais (22) : Dorade grise, Bar
- `plage-de-saint-pabu-erquy` → Pêche à Plage de Saint-Pabu (22) : Bar, Sole
- `plage-de-tresmeur-trebeurden` → Pêche à Plage de Tresmeur (22) : Bar, Sole
- `plage-des-rosaires-plerin` → Pêche à Plage des Rosaires (22) : Bar, Sole
- `plage-des-vallees-pleneuf` → Pêche à Plage des Vallées (22) : Bar, Dorade grise
- `plage-du-palus-plouha` → Pêche à Plage du Palus (22) : Bar, Vieille
- `pointe-de-la-latte-plevenon` → Pêche à Pointe de la Latte (22) : Bar, Lieu jaune
- `pointe-du-roselier` → Pêche à Pointe du Roselier (22) : Bar, Maquereau
- `port-de-gwin-zegal` → Pêche à Port de Gwin Zégal (22) : Bar, Lieu jaune
- `port-morvan-baie-de-saint-brieuc` → Pêche à Port Morvan : grève et bordures (22) : Bar

**29 Finistère (46)**

- `beg-an-douzig-landeda` → Pêche à Beg an Douzig (29) : Bar, Lieu jaune
- `beg-an-tour-moelan-sur-mer` → Pêche à Beg an Tour (29) : Bar, Lieu jaune
- `beg-an-ty-guard-plonevez-porzay` → Pêche à Beg an Ty-Guard (29) : Bar, Lieu jaune
- `beg-ar-bereneg-camaret` → Pêche à Beg ar Bereneg (29) : Bar, Lieu jaune
- `beg-ar-manac-h-landunvez` → Pêche à Beg ar Manac'h (29) : Bar, Lieu jaune
- `cale-de-mousterlin` → Pêche à Cale de Mousterlin (29) : Bar, Mulet
- `cale-de-saint-pierre-penmarch` → Pêche à Cale de Saint-Pierre (Penmarc'h) (29) : Bar, Mulet
- `cale-de-sainte-evette` → Pêche à Cale de Sainte-Évette (29) : Bar, Mulet
- `cale-des-mareyeurs-camaret` → Pêche à Cale des Mareyeurs (29) : Bar, Mulet
- `cale-du-commandant-bizien` → Pêche à Cale du Commandant Bizien (29) : Bar, Mulet
- `cap-de-la-chevre-crozon` → Pêche à Cap de la Chèvre (29) : Bar, Lieu jaune
- `jetee-du-vieux-port-de-roscoff` → Pêche à Jetée du vieux port de Roscoff (29) : Maquereau
- `plage-de-la-torche` → Pêche à Plage de la Torche / Pors Carn (29) : Bar, Seiche
- `pointe-de-beg-an-fry-guimaec` → Pêche à Pointe de Beg An Fry (29) : Bar, Lieu jaune
- `pointe-de-cameulet` → Pêche à Pointe de Cameulet (29) : Bar, Lieu jaune
- `pointe-de-combrit` → Pêche à Pointe de Combrit (29) : Bar, Mulet
- `pointe-de-cornouaille-roscanvel` → Pêche à Pointe de Cornouaille (29) : Bar, Lieu jaune
- `pointe-de-corsen` → Pêche à Pointe de Corsen (29) : Bar, Lieu jaune
- `pointe-de-creac-hmeur-plougonvelin` → Pêche à Pointe de Créac'hmeur (29) : Bar, Lieu jaune
- `pointe-de-dinan` → Pêche à Pointe de Dinan (29) : Bar, Lieu jaune
- `pointe-de-kerfany-moelan` → Pêche à Pointe de Kerfany (29) : Bar, Dorade royale
- `pointe-de-la-tavelle-camaret` → Pêche à Pointe de la Tavelle (29) : Bar, Lieu jaune
- `pointe-de-landunvez-argenton` → Pêche à Pointe de Landunvez (29) : Bar, Lieu jaune
- `pointe-de-langoz-loctudy` → Pêche à Pointe de Langoz (29) : Bar, Dorade royale
- `pointe-de-lervily-audierne` → Pêche à Pointe de Lervily (29) : Bar, Lieu jaune
- `pointe-de-leyde-douarnenez` → Pêche à Pointe de Leydé (29) : Bar, Lieu jaune
- `pointe-de-men-meur-guilvinec` → Pêche à Pointe de Men Meur (29) : Bar, Dorade royale
- `pointe-de-mousterlin` → Pêche à Pointe de Mousterlin (29) : Bar, Congre
- `pointe-de-penn-al-lann-carantec` → Pêche à Pointe de Penn al Lann (29) : Bar, Mulet
- `pointe-de-perherel-plougasnou` → Pêche à Pointe de Perhérel (29) : Bar, Lieu jaune
- `pointe-de-primel` → Pêche à Pointe de Primel (29) : Bar, Lieu jaune
- `pointe-de-roch-louet` → Pêche à Pointe de Roc'h Louët (29) : Bar, Lieu jaune
- `pointe-de-trefeuntec-plonevez-porzay` → Pêche à Pointe de Tréfeuntec (29) : Bar, Lieu jaune
- `pointe-des-renards` → Pêche à Pointe des Renards (29) : Bar, Lieu jaune
- `pointe-du-cabellou-concarneau` → Pêche à Pointe du Cabellou (29) : Bar, Dorade royale
- `pointe-du-coq-benodet` → Pêche à Pointe du Coq (29) : Bar, Mulet
- `pointe-du-dellec` → Pêche à Pointe du Dellec (29) : Bar, Mulet
- `pointe-du-grand-minou` → Pêche à Pointe du Grand Minou (29) : Bar, Lieu jaune
- `pointe-du-kador-crozon` → Pêche à Pointe du Kador (Beg ar Gador) (29) : Bar
- `pointe-du-menhir-crozon` → Pêche à Pointe du Menhir (29) : Bar, Lieu jaune
- `pointe-du-millier` → Pêche à Pointe du Millier (29) : Bar, Lieu jaune
- `pointe-du-van` → Pêche à Pointe du Van (29) : Bar, Lieu jaune
- `pointe-saint-mathieu` → Pêche à Pointe Saint-Mathieu (29) : Bar, Lieu jaune
- `port-de-mogueriec` → Pêche à Port de Moguériec (29) : Bar, Mulet
- `port-de-paluden-lannilis` → Pêche à Port de Paluden (aber Wrac'h) (29) : Bar, Mulet
- `quai-victoria-portsall` → Pêche à Quai Victoria (29) : Bar, Mulet

**33 Gironde (6)**

- `carcans-plage` → Pêche à Carcans-Plage (33) : Bar, Maigre
- `hourtin-plage` → Pêche à Hourtin-Plage (33) : Bar, Maigre
- `plage-de-la-corniche-pilat` → Pêche à La Teste-de-Buch (33) : Bar, Dorade royale
- `plage-de-montalivet` → Pêche à Plage de Montalivet (33) : Bar, Dorade royale
- `plage-de-soulac` → Pêche à Plage de Soulac-sur-Mer (33) : Bar, Dorade royale
- `pointe-de-l-aiguillon-arcachon` → Pêche à Arcachon, pointe de l'Aiguillon (33) : Sole

**35 Ille-et-Vilaine (2)**

- `plage-du-sillon` → Pêche à Plage du Sillon (35) : Bar, Dorade royale
- `pointe-du-moulinet` → Pêche à Pointe du Moulinet (35) : Bar, Sar

**40 Landes (7)**

- `biscarrosse-plage` → Pêche à Biscarrosse-Plage (40) : Bar, Dorade royale
- `courant-d-huchet` → Pêche à Courant d'Huchet (embouchure) (40) : Bar
- `embouchure-courant-de-contis` → Pêche à Contis, embouchure du courant (40) : Bar
- `embouchure-courant-de-soustons` → Pêche à Vieux-Boucau, embouchure du courant de Soustons (40)
- `le-gouf-de-capbreton` → Pêche à Capbreton, le Gouf (depuis la passe) (40) : Bar
- `plage-d-hossegor` → Pêche à Plage d'Hossegor (40) : Bar, Dorade royale
- `plage-de-messanges` → Pêche à Plage de Messanges (40) : Bar, Dorade royale

**44 Loire-Atlantique (7)**

- `corniche-de-gourmalon` → Pêche à Corniche de Gourmalon (44) : Bar, Dorade royale
- `jetee-de-la-turballe` → Pêche à Jetée de La Turballe (44) : Maquereau, Orphie
- `mole-du-pouliguen` → Pêche à Môle du Pouliguen (44) : Maquereau, Orphie
- `plage-de-la-courance` → Pêche à Plage de la Courance (44) : Bar, Dorade royale
- `plage-de-tharon` → Pêche à Plage de Tharon (44) : Bar, Dorade royale
- `pointe-du-croisic` → Pêche à Pointe du Croisic, Côte Sauvage (44) : Bar, Sar
- `pointe-saint-gildas` → Pêche à Pointe Saint-Gildas (44) : Bar, Maquereau

**50 Manche (5)**

- `cap-de-la-hague-goury` → Pêche à Cap de la Hague, Goury (50) : Bar, Lieu jaune
- `digue-de-querqueville` → Pêche à Digue de Querqueville (50) : Bar, Maquereau
- `digue-de-saint-vaast` → Pêche à Saint-Vaast-la-Hougue, digue de la Hougue (50) : Bar
- `pointe-de-barfleur-gatteville` → Pêche à Pointe de Barfleur, phare de Gatteville (50) : Bar
- `pointe-du-roc-granville` → Pêche à Pointe du Roc, Granville (50) : Bar, Maquereau

**56 Morbihan (41)**

- `beg-er-lannegui-hoedic` → Pêche à Beg er Lannegui (56) : Bar, Vieille
- `beg-er-vachif-houat` → Pêche à Beg er Vachif (56) : Bar, Lieu jaune
- `beg-er-vir-groix` → Pêche à Beg er Vir (56) : Bar, Lieu jaune
- `beg-lagad-hoedic` → Pêche à Beg Lagad (56) : Bar, Lieu jaune
- `cale-de-la-garenne-le-hezo` → Pêche à Cale de la Garenne (56) : Bar, Mulet
- `grande-plage-carnac` → Pêche à Grande Plage de Carnac (56) : Bar, Dorade royale
- `grande-plage-de-gavres` → Pêche à Grande plage de Gâvres (56) : Bar, Dorade royale
- `la-grande-plage-quiberon` → Pêche à La Grande Plage de Quiberon (56) : Bar
- `plage-d-herlin-bangor` → Pêche à Plage d'Herlin (56) : Bar, Lieu jaune
- `plage-de-betahon-ambon` → Pêche à Plage de Bétahon (56) : Bar, Mulet
- `plage-de-donnant-bangor` → Pêche à Plage de Donnant (56) : Bar, Lieu jaune
- `plage-de-kerhillio-erdeven` → Pêche à Plage de Kerhillio (56) : Bar, Sole
- `plage-de-kerpape-ploemeur` → Pêche à Plage de Kerpape (56) : Bar, Lieu jaune
- `plage-de-kervillen-la-trinite-sur-mer` → Pêche à Plage de Kervillen (56) : Dorade royale, Bar
- `plage-de-penvins-sarzeau` → Pêche à Plage de Penvins (56) : Bar, Dorade royale
- `plage-de-toulhars-larmor-plage` → Pêche à Plage de Toulhars (56) : Bar, Mulet
- `plage-des-grands-sables-belle-ile` → Pêche à Plage des Grands Sables (56) : Bar, Dorade royale
- `pointe-d-en-tal-houat` → Pêche à Pointe d'En Tal (56) : Bar, Sole
- `pointe-de-bilgroix` → Pêche à Pointe de Bilgroix (56) : Bar, Dorade royale
- `pointe-de-bilherve-ile-d-arz` → Pêche à Pointe de Bilhervé (56) : Bar, Dorade royale
- `pointe-de-duer-sarzeau` → Pêche à Pointe de Duer (56) : Bar, Mulet
- `pointe-de-goulvars-quiberon` → Pêche à Pointe de Goulvars (56) : Bar, Dorade royale
- `pointe-de-ker-biscart-ploemeur` → Pêche à Pointe de Ker Biscart (56) : Bar, Lieu jaune
- `pointe-de-kerbihan-la-trinite-sur-mer` → Pêche à Pointe de Kerbihan (56) : Bar, Dorade royale
- `pointe-de-kergroix-saint-pierre-quiberon` → Pêche à Pointe de Kergroix (56) : Bar, Lieu jaune
- `pointe-de-kervihan` → Pêche à Pointe de Kervihan (56) : Bar, Lieu jaune
- `pointe-de-mane-hellec-sainte-helene` → Pêche à Pointe de Mané-Hellec (56) : Bar, Mulet
- `pointe-de-nenezic-ile-d-arz` → Pêche à Pointe de Nénézic (56) : Bar, Dorade royale
- `pointe-de-saint-nicolas-arzon` → Pêche à Pointe de Saint-Nicolas (56) : Bar, Dorade royale
- `pointe-de-toulvern` → Pêche à Pointe de Toulvern (56) : Bar, Dorade royale
- `pointe-des-chats-groix` → Pêche à Pointe des Chats (56) : Bar, Lieu jaune
- `pointe-du-beche-arzon` → Pêche à Pointe du Béché (56) : Bar, Mulet
- `pointe-du-dibenn-damgan` → Pêche à Pointe du Dibenn (56) : Bar, Dorade royale
- `pointe-du-guern-baden` → Pêche à Pointe du Guern (56) : Bar, Mulet
- `pointe-du-monteno` → Pêche à Pointe du Monteno (56) : Bar, Dorade royale
- `pointe-du-talud` → Pêche à Pointe du Talud (56) : Bar, Maquereau
- `pointe-du-verdon-sainte-helene` → Pêche à Pointe du Verdon (56) : Bar, Mulet
- `pointe-saint-colomban-carnac` → Pêche à Pointe Saint-Colomban (56) : Bar, Dorade royale
- `pointe-saint-nicolas-groix` → Pêche à Pointe Saint-Nicolas (56) : Bar, Lieu jaune
- `port-blanc-saint-pierre-quiberon` → Pêche à Port Blanc (56) : Bar, Sar
- `port-navalo` → Pêche à Port-Navalo, passe du Golfe (56) : Bar

**59 Nord (1)**

- `chenal-de-l-aa-gravelines` → Pêche à Gravelines, Petit-Fort-Philippe (59) : Bar

**62 Pas-de-Calais (2)**

- `cap-blanc-nez` → Pêche à Cap Blanc-Nez (62) : Bar, Maquereau
- `digue-de-wimereux` → Pêche à Wimereux, digue de promenade (62) : Bar, Maquereau

**64 Pyrénées-Atlantiques (6)**

- `baie-de-txingudi-hendaye` → Pêche à Hendaye, baie de Txingudi (Bidassoa) (64) : Bar
- `digue-aux-chevaux-saint-jean-de-luz` → Pêche à Saint-Jean-de-Luz, digue aux Chevaux (64)
- `plage-d-hendaye` → Pêche à Plage d'Hendaye (64) : Bar, Dorade royale
- `port-de-guethary` → Pêche à Guéthary, port et estran rocheux (64) : Bar, Sar
- `recif-de-parlementia` → Pêche à Bidart, récif de Parlementia (64) : Bar, Sar
- `rocher-de-la-vierge` → Pêche à Rocher de la Vierge (64) : Bar, Sar

**76 Seine-Maritime (2)**

- `jetee-de-fecamp` → Pêche à Fécamp, jetée du phare (76) : Bar, Maquereau
- `sainte-adresse-cap-de-la-heve` → Pêche à Sainte-Adresse, Cap de la Hève (76) : Bar, Maquereau

**85 Vendée (6)**

- `corniche-vendeenne` → Pêche à Corniche vendéenne (Sion-sur-l'Océan) (85) : Bar
- `grande-jetee-de-saint-gilles` → Pêche à Grande jetée de Saint-Gilles-Croix-de-Vie (85) : Bar
- `jetee-de-l-herbaudiere` → Pêche à Jetée de L'Herbaudière (85) : Bar, Dorade royale
- `jetee-de-la-chaume` → Pêche à Jetée de la Chaume (85) : Bar, Dorade royale
- `plage-de-notre-dame-de-monts` → Pêche à Plage de Notre-Dame-de-Monts (85) : Bar
- `pointe-de-grosse-terre` → Pêche à Pointe de Grosse Terre (85) : Bar, Sar
