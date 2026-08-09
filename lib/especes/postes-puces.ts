import type { SpeciesSlug } from '@/lib/seo/programmatic'

// ═══════════════════════════════════════════════════════════════════════════════
// « OÙ SE POSTER SELON LES CONDITIONS » — version élaguée (sprint 75, Bloc 2).
//
// La prose d'origine (3 § par espèce dans lib/especes/content/*) reste servie dans
// le HTML, au dépliement. Ces puces en sont la CONDENSATION : chaque puce est
// dérivée d'une phrase existante de la fiche, jamais d'un fait ajouté. Règle
// d'élagage appliquée : une phrase vraie pour n'importe quelle espèce (« l'aube et
// le crépuscule écrasent le reste de la journée », « croise avec tes prises »)
// dégage ; on garde les chiffres, les postes nommés et les seuils.
//
// Format : un label court (mono, DA v2) + une phrase concrète. 4 à 6 puces max.
// ═══════════════════════════════════════════════════════════════════════════════

export type PosteBullet = { label: string; text: string }

/** Record (pas Partial) : ajouter une espèce sans ses puces casse la compilation. */
export const POSTES_PUCES: Record<SpeciesSlug, PosteBullet[]> = {
  bar: [
    {
      label: 'Marée',
      text: 'Les deux dernières heures de montante et la première de descendante, à la reprise du courant après l’étale.',
    },
    {
      label: 'Coefficient',
      text: '70 à 95. Au-delà de 100, courant et turbidité compliquent la présentation.',
    },
    {
      label: 'Vent',
      text: '15 à 25 km/h de mer, qui teinte l’eau et forme un peu d’écume. La mer d’huile sous grand soleil ne donne rien.',
    },
    {
      label: 'Houle',
      text: '1 à 1,5 m au surfcasting : elle creuse les baïnes. Une mer plate vaut dix fois moins.',
    },
    {
      label: 'Fenêtre',
      text: '24 à 48 h après un coup de vent, quand l’eau reclarifie et que les embouchures charrient la nourriture déterrée.',
    },
    {
      label: 'Postes',
      text: 'Pointes rocheuses battues, sorties de parcs ostréicoles, baïnes de nuit, quais à l’ombre des coques. En Méditerranée : digues, graus et sorties d’eau douce, pendant et après un coup d’est.',
    },
  ],

  barracuda: [
    {
      label: 'Postes',
      text: 'Digues portuaires éclairées, quais accessibles de nuit, secs rocheux à portée de lancer, embouchures où s’accumulent les mulets.',
    },
    {
      label: 'Lumière',
      text: 'Prospecte la lisière ombre/lumière sous les lampadaires, pas le plein faisceau.',
    },
    {
      label: 'Heure',
      text: 'Crépuscule (18 h-20 h), première heure du matin, et surtout 21 h-1 h quand les bancs de mulets circulent.',
    },
    {
      label: 'Mer',
      text: 'Calme à peu agitée, eau claire : il chasse à vue. Ce n’est pas un poisson de gros temps.',
    },
    {
      label: 'Marée',
      text: 'Marnage négligeable en Méditerranée : raisonne fourrage. Pas de mulets le long de la digue, pas de bécune.',
    },
  ],

  calmar: [
    {
      label: 'Postes',
      text: 'Digue ou jetée équipée de lampadaires, posté à la limite du cône de lumière.',
    },
    {
      label: 'Fond',
      text: 'Sable, ou langue de sable entre deux enrochements, dans 3 à 8 m d’eau à portée de lancer.',
    },
    {
      label: 'Heure',
      text: 'Aube, crépuscule et premières heures de nuit noire. Vise les nuits sans lune.',
    },
    {
      label: 'Marée',
      text: 'Coefficients moyens et courant modéré : étale, début de montante ou de descendante. Une eau qui file trop plaque la turlutte.',
    },
    {
      label: 'Mer',
      text: 'Calme à peine ridée, plusieurs jours sans coup de vent. Après une tempête, laisse 24 à 48 h que l’eau se décante.',
    },
  ],

  chinchard: [
    {
      label: 'Postes',
      text: 'Là où le courant concentre le menu fretin : pointes de digue, jetées, estacades, sorties de port.',
    },
    {
      label: 'Méditerranée',
      text: 'Digues et quais éclairés la nuit : les lampadaires fixent le plancton, le banc se sert dessous.',
    },
    {
      label: 'Profondeur',
      text: 'Repère la hauteur d’eau où partent les touches et reste-y : le banc tient un étage précis.',
    },
    {
      label: 'Marée',
      text: 'Les deux heures autour de la pleine mer et le début de descendante, depuis les digues.',
    },
    {
      label: 'Heure',
      text: 'Crépuscule surtout, avec prolongation dans la nuit, là où le maquereau s’arrête au coucher du soleil.',
    },
    {
      label: 'Mer',
      text: 'Brise modérée qui ride la surface. Après un gros coup de vent, attends 24 à 48 h que l’eau se clarifie.',
    },
  ],

  congre: [
    {
      label: 'Postes',
      text: 'Pieds de digues et de jetées, enrochements profonds, têtes de roche, failles, blocs immergés. Le sable plat ne donne rien.',
    },
    {
      label: 'Profondeur',
      text: 'Des structures qui plongent vite, avec plusieurs mètres d’eau au pied.',
    },
    {
      label: 'Heure',
      text: 'Du coucher du soleil au milieu de nuit, avec un pic dans les deux premières heures d’obscurité.',
    },
    {
      label: 'Marée',
      text: 'Nuit montante, autour de la pleine mer : plus d’eau sur les enrochements, un courant qui répand l’odeur de l’appât.',
    },
    {
      label: 'Mer',
      text: 'Une mer légèrement formée l’active. Au-delà de 2 m de houle, les enrochements deviennent dangereux et le plomb ne tient plus.',
    },
  ],

  'dorade-grise': [
    {
      label: 'Postes',
      text: 'Têtes de roche, tombants, sèches, et sable à galets et coquilles au pied des digues et des enrochements portuaires.',
    },
    {
      label: 'Transition',
      text: 'La bordure exacte où la roche rencontre le coquillier : c’est là qu’il fouille.',
    },
    {
      label: 'Banc',
      text: 'Le premier poisson marque le poste : reste dessus et ré-amorce. Rien en vingt minutes, décale-toi vers la roche.',
    },
    {
      label: 'Marée',
      text: 'Le montant et les deux heures qui encadrent la pleine mer, quand le courant recouvre les fonds coquilliers.',
    },
    {
      label: 'Mer',
      text: 'Légèrement formée, eau un peu teintée : la touche est plus franche qu’en eau cristalline. Par eau très claire, descends en diamètre.',
    },
    {
      label: 'Méditerranée',
      text: 'Marnage faible : ce sont l’aube, le crépuscule et une légère houle qui décolle la nourriture du fond qui déclenchent.',
    },
  ],

  'dorade-royale': [
    {
      label: 'Marée',
      text: 'Les deux dernières heures avant la pleine mer et l’étale qui suit, sur les zones coquillières que l’eau vient de recouvrir.',
    },
    {
      label: 'Fenêtre',
      text: 'Un coup de vent la veille, puis une mer qui s’assagit avec 0,5 à 1 m de houle résiduelle et une eau encore teintée.',
    },
    {
      label: 'Mer',
      text: 'Grosse houle en cours : le surfcasting est impraticable. Mer d’huile et eau claire : descends en diamètre ou passe aux ports à la flottante.',
    },
    { label: 'Eau', text: 'Vraiment active au-dessus de 14-15 °C.' },
    {
      label: 'Heure',
      text: 'Aube, crépuscule et première partie de nuit. En plein été, la nuit fait la différence sur les beaux poissons.',
    },
    {
      label: 'Ports',
      text: 'Tôt le matin, avant le trafic des bateaux, et discrétion sur le ponton : une royale qui t’a repéré ne mangera plus.',
    },
  ],

  liche: [
    {
      label: 'Postes',
      text: 'Abords des digues, plages avec du fond et de la pente, embouchures et sorties de canaux où s’accumulent les mulets.',
    },
    {
      label: 'Secteur',
      text: 'Le delta du Rhône, autour de Port-Saint-Louis, concentre les meilleurs secteurs de France.',
    },
    {
      label: 'Repère',
      text: 'Le banc de fourrage : un nuage de mulets affolés en surface, des éclaboussures, des oiseaux qui plongent.',
    },
    {
      label: 'Mer',
      text: 'Calme à peu agitée et eau claire, avec une légère brise qui ride la surface. Mer de plomb et eau cristalline la rendent très méfiante.',
    },
    {
      label: 'Heure',
      text: 'L’aube et le coup du soir, quand elle vient chasser en surface en bordure.',
    },
    {
      label: 'Chasse',
      text: 'Pose ton popper en lisière du banc, là où les liches cueillent les retardataires, pas au cœur de la chasse.',
    },
  ],

  'lieu-jaune': [
    {
      label: 'Postes',
      text: 'Pointes rocheuses qui plongent vite (8 m d’eau à moins de 50 m), digues portuaires profondes, tombants avec du courant.',
    },
    {
      label: 'Secteurs',
      text: 'Finistère, Côtes-d’Armor, Cotentin. Les plages et le sable plat ne donnent rien.',
    },
    {
      label: 'Marée',
      text: 'Le montant et les deux heures qui encadrent la pleine mer, coefficients moyens à forts le long des tombants.',
    },
    {
      label: 'Créneau',
      text: 'Cale la session pour que l’aube tombe sur le montant. Aux étales, ralentis encore la récupération.',
    },
    {
      label: 'Mer',
      text: 'Peu agitée, eau claire à légèrement teintée, vent modéré qui casse la luminosité. Au-delà de 1,5 m de houle, la pêche au ras du fond devient impossible.',
    },
  ],

  'lieu-noir': [
    {
      label: 'Postes',
      text: 'Grandes digues et môles qui plongent vite, quais industriels en eau profonde, estuaires creux, pointes balayées par le courant.',
    },
    {
      label: 'Secteurs',
      text: 'Cotentin, pays de Caux (Étretat, Fécamp, Le Havre), ports de Bretagne nord.',
    },
    {
      label: 'Mobilité',
      text: 'Il patrouille en pleine eau : prospecte la colonne, change d’étage. Souvent le banc n’est simplement pas encore passé.',
    },
    {
      label: 'Météo',
      text: 'Ciel couvert et mer un peu agitée déclenchent les chasses en plein jour. La mer d’huile sous grand soleil est le pire scénario.',
    },
    {
      label: 'Marée',
      text: 'Montant et descendant établis, à la reprise du courant après l’étale, sur coefficients moyens à forts. Pas les étales molles.',
    },
  ],

  maigre: [
    {
      label: 'Marée',
      text: 'Fort coefficient (90 et plus), les deux dernières heures de montante et le début de descendante autour de la pleine mer.',
    },
    {
      label: 'Heure',
      text: 'La tombée du jour et la première partie de nuit. Beaucoup de captures dans l’heure qui suit le coucher du soleil.',
    },
    {
      label: 'Eau',
      text: 'Légèrement teintée par le courant ou par un coup de vent. La mer d’huile en plein jour est presque toujours stérile.',
    },
    {
      label: 'Houle',
      text: 'Un léger clapot sur les plages ouvertes, sans excès : il creuse les fosses où le maigre vient fouiller.',
    },
    {
      label: 'Postes',
      text: 'Veines de courant des grands estuaires (la Gironde reste la référence), fosses et chenaux qui bordent les bancs de sable, sorties d’eau douce, abords des digues.',
    },
    {
      label: 'Méditerranée',
      text: 'Grandes plages de sable, graus et sorties d’étangs, de préférence à l’aube et au crépuscule.',
    },
  ],

  maquereau: [
    {
      label: 'Postes',
      text: 'Là où le courant concentre les proies : pointes de digue, jetées, estacades, sorties de port. Ni roche ni herbier.',
    },
    {
      label: 'Repère',
      text: 'Les sternes et les goélands qui piquent à répétition. Un banc à 60 m hors de portée tourne, il reviendra.',
    },
    {
      label: 'Marée',
      text: 'Les deux heures autour de la pleine mer et le début de la descendante, depuis les digues.',
    },
    {
      label: 'Heure',
      text: 'Aube et crépuscule. En Méditerranée, la plupart des coups se jouent aux premières lueurs.',
    },
    {
      label: 'Mer',
      text: 'Brise modérée qui ride la surface. Eau turbide après un coup de vent : attends 24 à 48 h, il chasse à vue.',
    },
  ],

  marbre: [
    {
      label: 'Postes',
      text: 'Sable propre avec un micro-relief : cuvettes creusées par la houle, veines plus sombres entre deux bancs, abords des graus, marches et fosses près du bord.',
    },
    {
      label: 'Repérage',
      text: 'Repère ce relief à marée basse ou par eau claire, puis pose tes lignes dessus. Rien en vingt minutes, décale-toi de quelques mètres.',
    },
    {
      label: 'Mer',
      text: 'Calme à légèrement formée, ou petite houle résiduelle après un coup de vent qui a retourné le fond. Une grosse mer disperse les poissons.',
    },
    {
      label: 'Heure',
      text: 'La tombée du jour et la première partie de nuit, quand il s’approche franchement du bord.',
    },
    {
      label: 'Méditerranée',
      text: 'Marnage négligeable : c’est la lumière, le vent et l’état du sable qui commandent, pas la marée.',
    },
    {
      label: 'Touche',
      text: 'Amorce léger autour des lignes et surveille la bannière : une simple détente ou un tapotement, pas un départ franc.',
    },
  ],

  merlan: [
    {
      label: 'Postes',
      text: 'Grandes plages océanes et fonds sablo-vaseux, si possible près d’une tête de roche ou d’un cassé. Baïnes, fosses, sorties de courant.',
    },
    {
      label: 'Secteurs',
      text: 'Nord, Pas-de-Calais, baie de Somme, plages normandes et bretonnes.',
    },
    {
      label: 'Heure',
      text: 'La nuit, avec un pic qui démarre souvent deux heures avant la basse mer et court sur la descendante.',
    },
    {
      label: 'Mer',
      text: 'Agitée de 0,5 à 1,5 m et vent de mer qui trouble l’eau : contrairement au bar, il n’a pas besoin d’eau claire.',
    },
    {
      label: 'Matériel',
      text: 'Cannes de 4,20 à 5 m, 100 à 200 g, pour tenir le plomb sur le sable malgré le courant.',
    },
    {
      label: 'Montage',
      text: 'Flapper rig à trois empiles courtes, ou empile haute de 50-70 cm doublée d’un traînard de 80-100 cm, perles rouges ou phosphorescentes en teaser.',
    },
  ],

  mulet: [
    {
      label: 'Postes',
      text: 'Bassins de port abrités, quais tapissés d’algues, dessous de pontons, darses, embouchures où l’eau douce se mélange à la mer.',
    },
    {
      label: 'Repère',
      text: 'Les gobages en surface : si les bancs tournent et goûtent le pain qui flotte, tu es au bon poste.',
    },
    {
      label: 'Mer',
      text: 'Calme plat. Un vent fort qui brasse l’eau du port disperse les bancs ; une eau lisse les fait monter et gober.',
    },
    {
      label: 'Marée',
      text: 'En estuaire, la fin de montante et l’étale de pleine mer ramènent les poissons vers le bord. En port fermé, l’effet de marée est moindre.',
    },
    {
      label: 'Amorçage',
      text: 'De petites boulettes de pain trempé, régulièrement, pour fixer le banc et créer une dérive flottante.',
    },
    {
      label: 'Discrétion',
      text: 'Reste en retrait, baisse-toi, évite les vibrations sur le quai : il voit ton ombre et sent tes pas dans le béton.',
    },
  ],

  oblade: [
    {
      label: 'Postes',
      text: 'Pleine eau au contact de la structure : pieds de digues et de jetées, pointes rocheuses, tombants, bordures d’herbiers de posidonie, sorties de port.',
    },
    {
      label: 'Lisière',
      text: 'La frontière entre la roche claire et l’eau bleue, ou la bande de sable qui longe l’herbier.',
    },
    {
      label: 'Mer',
      text: 'Vent sous 15 km/h, mer plate à peine ridée, eau claire. C’est l’inverse du sar, qui veut du ressac.',
    },
    {
      label: 'Heure',
      text: 'Le coup du soir, l’heure qui précède et suit le coucher du soleil, puis la première partie de nuit. En plein cagnard de midi, elle est quasi impêchable.',
    },
    {
      label: 'Méditerranée',
      text: 'Marnage négligeable : c’est la lumière et le courant de bordure qui commandent. Amorce à petites doses pour tenir le poste.',
    },
  ],

  orphie: [
    {
      label: 'Postes',
      text: '2 à 3 m d’eau claire à portée de lancer : digues et jetées portuaires, pointes rocheuses, sorties d’estuaire.',
    },
    {
      label: 'Hauteur',
      text: 'Un poste haut comme une digue te fait repérer les bancs et lancer au-delà. Elle patrouille la pellicule, pas le fond.',
    },
    {
      label: 'Mer',
      text: 'Vent sous 15 km/h et plusieurs jours sans houle : l’eau s’éclaircit et les orphies remontent. Une mer ridée ou teintée décolle les bancs du bord.',
    },
    {
      label: 'Marée',
      text: 'Sur la Manche et l’Atlantique, la montante et le tout début de descendante : les deux heures avant la pleine mer sont souvent les meilleures.',
    },
    {
      label: 'Méditerranée',
      text: 'Petit matin, mer d’huile, avant que le thermique ne se lève.',
    },
  ],

  pageot: [
    {
      label: 'Postes',
      text: 'Fonds meubles et transitions : sable et gravier en pied de digue, plages à fond mixte, marges du coralligène.',
    },
    {
      label: 'Relief',
      text: 'Zones creuses, chenaux, dépressions entre deux barres de sable. Sans touche en vingt à trente minutes, déplace l’appât de quelques mètres.',
    },
    {
      label: 'Mer',
      text: 'Maniable à légèrement formée : un petit clapot libère vers et crustacés. Mer démontée et eau très chargée le poussent au large.',
    },
    {
      label: 'Heure',
      text: 'Aube, crépuscule et nuit, quand il se rapproche du bord et perd sa méfiance.',
    },
    {
      label: 'Atlantique sud',
      text: 'La montante et les deux dernières heures avant la pleine mer, étale comprise.',
    },
  ],

  plie: [
    {
      label: 'Postes',
      text: 'Sable propre ou mêlé de vase, sans relief agressif : plages océanes à pente douce, fonds de baies abritées, estuaires et chenaux.',
    },
    {
      label: 'Repérage',
      text: 'À marée basse de vives-eaux, cherche les tortillons de vers et les coques affleurantes. La roche et les enrochements ne l’intéressent pas.',
    },
    {
      label: 'Marée',
      text: 'Deux à trois heures avant la pleine mer et le début de la descendante. En estuaire, le jusant qui draine la nourriture donne aussi.',
    },
    {
      label: 'Coefficient',
      text: '60 à 90 : assez pour brasser le fond, sans charger l’eau ni rendre le plomb impossible à tenir.',
    },
    {
      label: 'Mer',
      text: 'Peu agitée à modérément formée, houle sous 1 m, eau légèrement teintée. Au-delà de 1,5 m, la touche fine devient indétectable.',
    },
    {
      label: 'Heure',
      text: 'La nuit et les deux heures autour du lever du jour, par temps froid et calme d’hiver.',
    },
  ],

  rouget: [
    {
      label: 'Postes',
      text: 'Les transitions : sable propre mêlé de gravier, bordures d’herbiers, langues sableuses entre deux têtes de roche, abords des digues et des épis.',
    },
    {
      label: 'Repérage',
      text: 'Sur l’Atlantique, repère à marée basse les dépressions et les chenaux qui retiennent l’eau et le gravier.',
    },
    {
      label: 'Mer',
      text: 'Léger clapot, houle résiduelle d’un demi-mètre, eau un peu teintée par un coup de mer qui retombe. Un vent portant de 10 à 20 km/h aide presque toujours.',
    },
    {
      label: 'Eau claire',
      text: 'Plat d’huile en plein soleil : descends en diamètre et vise l’aube ou le crépuscule.',
    },
    {
      label: 'Marée',
      text: 'Sur l’Atlantique, les deux dernières heures du montant et le début du descendant. En Méditerranée, c’est l’état de la mer après un coup de vent qui commande.',
    },
    {
      label: 'Mobilité',
      text: 'Poste muet : décale-toi de quelques dizaines de mètres pour retrouver la bonne nature de fond.',
    },
  ],

  sar: [
    {
      label: 'Postes',
      text: 'Toujours au contact du dur : pieds de digues et de jetées, failles et sorties de calanques, épis, pointes rocheuses, enrochements portuaires.',
    },
    {
      label: 'Zone',
      text: 'L’eau blanche, là où la vague vient de casser et retourne le fond. Rien en vingt minutes, change de bloc.',
    },
    {
      label: 'Mer',
      text: 'Plus ça bouge, mieux il mord : vent de face de 15 à 25 km/h, houle d’un mètre, eau teintée par le ressac.',
    },
    {
      label: 'Méditerranée',
      text: 'Juste après un coup de mistral ou de levant, quand la mer retombe mais que l’eau reste blanchie.',
    },
    {
      label: 'Eau claire',
      text: 'Plat total et eau cristalline en pleine journée : descends en 18-22/100 ou attends le crépuscule.',
    },
    {
      label: 'Atlantique',
      text: 'Le montant, surtout les deux dernières heures avant la pleine mer, quand l’eau recouvre les moulières et les zones à crabes.',
    },
  ],

  seiche: [
    {
      label: 'Postes',
      text: 'Sable propre bordé de structure : lisière plage/herbier, pied de digue qui retombe sur le sable, pointe rocheuse, passe portuaire.',
    },
    {
      label: 'Printemps',
      text: 'Les ports sont des valeurs sûres : quais, darses, abords des bouées. Un herbier de zostères ou de posidonie est un aimant en période de ponte.',
    },
    {
      label: 'Mer',
      text: 'Calme à peu agitée, eau claire à légèrement teintée : elle chasse à vue. Les jours de tempête, elle décolle vers des fonds plus calmes.',
    },
    {
      label: 'Heure',
      text: 'Lever et coucher du jour, et surtout la nuit. En port, les lampadaires créent des postes fixes.',
    },
    {
      label: 'Marée',
      text: 'Sur la Manche et l’Atlantique, courant modéré en fin de montant et début de descendant, ou l’étale de pleine mer.',
    },
    {
      label: 'Méthode',
      text: 'Ratisse méthodiquement : elle tient des micro-postes, quelques mètres à gauche ou à droite changent tout.',
    },
  ],

  sole: [
    {
      label: 'Postes',
      text: 'Sable propre et plat : grandes plages, estrans, baies sableuses, abords d’embouchures. Vise les baïnes et les dépressions qui retiennent l’eau.',
    },
    {
      label: 'Distance',
      text: 'Inutile de lancer à 120 m : par bonne nuit, elle fouille à dix ou quinze mètres du bord. Pose deux cannes à des distances différentes.',
    },
    {
      label: 'Heure',
      text: '90 % des prises du bord tombent une fois la lumière éteinte, avec un créneau en or dans la pénombre du lever et du coucher du soleil.',
    },
    {
      label: 'Marée',
      text: 'Le montant et les deux heures autour de la pleine mer, quand l’eau recouvre les zones à vers.',
    },
    {
      label: 'Mer',
      text: 'Petite houle de 30 à 60 cm qui retourne le sable. Après un gros coup de vent qui charge l’eau, laisse passer une marée ou deux.',
    },
    {
      label: 'Appâts',
      text: 'Renouvelle-les régulièrement : elle repère un ver mou et fatigué.',
    },
  ],

  tacaud: [
    {
      label: 'Postes',
      text: 'La structure : enrochements et musoirs de digue, pieds de jetée portuaire, têtes de roche, épaves accessibles du bord, piles de pont. Le sable nu ne produit presque rien.',
    },
    {
      label: 'Marée',
      text: 'Le montant et les deux heures qui encadrent la pleine mer, coefficients moyens à forts le long des digues.',
    },
    {
      label: 'Heure',
      text: 'La nuit et les premières heures de l’aube, surtout en hiver.',
    },
    {
      label: 'Mer',
      text: 'Il n’a pas peur d’une mer formée : un peu de remous et d’eau teintée le colle aux structures. Évite les grosses tempêtes, les enrochements deviennent dangereux.',
    },
    {
      label: 'Hiver',
      text: 'Une eau froide et brassée signe souvent les meilleures sessions.',
    },
  ],

  tassergal: [
    {
      label: 'Postes',
      text: 'Là où le fourrage se fait piéger : embouchures et graus, pieds de digues et de jetées exposées, plages profondes avec une barre proche, sorties de port.',
    },
    {
      label: 'Repère',
      text: 'Une giclée de sardines, des oiseaux qui plongent, une nappe d’eau qui frémit. Quand ça explose, sois prêt à lancer en trois secondes.',
    },
    {
      label: 'Mer',
      text: 'Vent de mer de 15 à 25 km/h, mer légèrement formée, eau teintée par le ressac. La mer d’huile de midi ne donne rien.',
    },
    {
      label: 'Heure',
      text: 'Aube, crépuscule, et tard dans la nuit chaude d’été.',
    },
    {
      label: 'Marée',
      text: 'Sur l’Atlantique, les bancs suivent le fourrage porté par le courant, souvent sur le montant et autour de la pleine mer. En Méditerranée, marnage négligeable.',
    },
    {
      label: 'Température',
      text: 'Sous 18 °C, inutile d’insister. Au-dessus de 20 °C, l’été et l’automne, c’est la bonne fenêtre.',
    },
  ],

  vieille: [
    {
      label: 'Postes',
      text: 'Toujours au contact du dur : têtes de roche isolées, tombants couverts de laminaires, failles et trous au pied des enrochements, gros blocs près des digues et des pointes granitiques.',
    },
    {
      label: 'Cassure',
      text: 'L’endroit où le fond passe brutalement de la roche plate au trou. Rien en vingt minutes, décale-toi de quelques mètres : elle est fidèle à son trou.',
    },
    {
      label: 'Mer',
      text: 'Petit vent d’ouest, houle résiduelle d’un demi-mètre à un mètre, eau légèrement teintée. La grosse tempête colle l’appât dans les laminaires.',
    },
    {
      label: 'Heure',
      text: 'Le matin tôt et la fin de journée.',
    },
    {
      label: 'Marée',
      text: 'En Manche-Atlantique, le montant et le début de descendante, les deux heures autour de la pleine mer, de préférence en vives-eaux.',
    },
  ],
}
