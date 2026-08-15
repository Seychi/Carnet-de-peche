import type { EspeceContent } from '../types'

/**
 * Fiche espèce — BAR (Dicentrarchus labrax).
 * Le roi du bord : la fiche la plus riche du site. Réglementation vérifiée
 * aux sources le 12/06/2026 — ne pas modifier les chiffres sans re-vérifier.
 */
export const barEspece: EspeceContent = {
  slug: 'bar',

  // Sprint 78, Bloc 4 : titre porté à l'intention PÊCHE.
  // Relevé GSC 90 j au 2026-08-15 : 293 impressions pour 1 clic, soit 0,34 %, le pire du répertoire, à la position 10. L'ancien titre menait sur la maille sans porter la pêche.
  // 54 caractères, mesuré. Aucun doublon avec les 25 autres fiches.
  seoTitle: 'Pêche du bar du bord : spots, saisons et taille légale',

  intro: [
    `Le bar est LE poisson du bord en France : présent de Dunkerque à Menton, il chasse dans 50 cm d'eau comme le long des digues. Assez accessible pour ton premier poisson au leurre, assez malin pour t'obséder vingt ans. C'est lui qui remplit les carnets des pêcheurs du bord.`,
    `Quatre techniques le prennent du bord, et aucune autre de nos espèces n'offre ça : leurre souple raclé sur une pointe battue, arénicole posée dans une baïne à 2 h du matin, lançon vivant dérivé dans la veine de courant, crevette sous un flotteur le long d'un quai. Un 45 cm te semblera énorme la première année ; un 70 cm+ reste un événement qu'on raconte encore dix ans après. En Méditerranée on l'appelle loup, même poisson, mais éduqué par l'eau claire et la pression de pêche.`,
    `Le bar ne se donne pas : il impose de lire la marée, le vent et la lumière, puis de revenir au bon créneau. C'est aussi l'espèce la plus encadrée de nos côtes (maille, quota, fermeture hivernale, marquage), alors lis la réglementation ci-dessous avant de garder ton premier poisson.`,
  ],

  identity: {
    famille: 'Moronidés : Dicentrarchus labrax (« loup » en Méditerranée)',
    tailleCourante: '35-55 cm du bord, 70 cm+ pour les beaux sujets',
    tailleMax: 'Environ 1 m pour 10-12 kg, rarissime du bord',
    habitat: "Pointes rocheuses, plages, estuaires, ports : de 0,5 à 15 m d'eau",
    regime: 'Chasseur opportuniste : lançons, sardines, crabes, crevettes, vers',
  },

  regulation: {
    verifiedAt: '21/06/2026',
    source:
      'Arrêté du 1er avril 2026 (pêche de loisir du bar européen) ; arrêté du 26 octobre 2012 modifié (tailles minimales) ; arrêté du 17 mai 2011 modifié (marquage)',
    minSizeCm: { 'manche-atlantique': 42, mediterranee: 30 },
    marquage: true,
    items: [
      '<strong>Maille : 42 cm</strong> en Manche, mer du Nord et Atlantique, <strong>30 cm</strong> en Méditerranée (42 cm dans le Parc naturel marin du Golfe du Lion).',
      '<strong>Quota : 3 bars/jour/pêcheur au nord du 48e parallèle</strong> (≈ Audierne), <strong>2 bars/jour au sud</strong> du 48e parallèle.',
      "<strong>Février et mars : pêcher-relâcher obligatoire au nord du 48e parallèle</strong> : aucun prélèvement ; au sud du 48e, la pêche reste autorisée toute l'année (2/jour).",
      '<strong>Marquage obligatoire</strong> de tout bar conservé : ablation de la partie inférieure de la nageoire caudale.',
    ],
  },

  saisons: {
    'manche-atlantique': [
      {
        saison: 'Printemps',
        activite: 3,
        note: `Les bars reviennent du large dès avril ; mai-juin est le premier grand pic de l'année, leurres souples sur les pointes et plateaux qui se réchauffent.`,
      },
      {
        saison: 'Été',
        activite: 2,
        note: `Poissons présents mais méfiants : aube et coup du soir aux leurres de surface, nuit au surfcasting. Laisse tomber le plein soleil de midi.`,
      },
      {
        saison: 'Automne',
        activite: 3,
        note: `Septembre-octobre, le second pic : les bars se gavent avant l'hiver, chasses en pleine journée, gros sujets au surfcasting de nuit sur mer formée.`,
      },
      {
        saison: 'Hiver',
        activite: 1,
        note: `La majorité des poissons regagne le large ; il reste quelques bars dans les ports et les estuaires tempérés, à chercher à la crevette.`,
      },
    ],
    mediterranee: [
      {
        saison: 'Printemps',
        activite: 2,
        note: `Activité correcte sur les graus et les étangs à la sortie de l'hiver ; pêche fine à l'aube, les loups restent méfiants en eau claire.`,
      },
      {
        saison: 'Été',
        activite: 1,
        note: `La période la plus dure : eau chaude, pression de pêche maximale. Seule la première heure du jour donne régulièrement quelques loups le long des digues.`,
      },
      {
        saison: 'Automne',
        activite: 3,
        note: `LA saison du loup : les coups d'est brassent digues et embouchures, les gros sujets chassent à portée de lancer pendant 48 h après le vent.`,
      },
      {
        saison: 'Hiver',
        activite: 3,
        note: `Les loups se regroupent près du bord pour frayer : digues, ports et sorties d'eau douce donnent les plus beaux poissons de l'année.`,
      },
    ],
  },

  techniques: [
    {
      slug: 'leurres',
      why: `La technique reine : un shad de 10-12 cm raclé sur une pointe battue ou un stickbait sur les chasses prennent des bars d'avril à novembre.`,
    },
    {
      slug: 'surfcasting',
      why: `L'arme des plages océanes la nuit : arénicole ou couteau dans la première baïne, à la remontante, sur une mer formée de 1 à 1,5 m.`,
    },
    {
      slug: 'vif',
      why: `Le filon des gros sujets : un lançon vivant dérivé sous une pointe rocheuse à la reprise du courant après l'étale.`,
    },
    {
      slug: 'flottante',
      why: `La pêche fine des ports et estuaires : crevette vivante sous flotteur le long des quais, redoutable quand tout le reste échoue.`,
    },
  ],

  postes: [
    `Le bar aime l'eau qui bouge. Sur la façade Manche-Atlantique, cale ta session sur la marée de TON spot, pas sur ta montre : les deux dernières heures de montante et la première de descendante concentrent l'essentiel des touches, surtout quand le courant se rétablit après l'étale. Les coefficients moyens à forts (70-95) brassent juste ce qu'il faut ; au-delà de 100, courant et turbidité compliquent la présentation. La courbe de marée et les horaires de pleine et basse mer de chaque spot sont dans l'app. Croise-les avec tes propres prises.`,
    `Côté météo, fuis la mer d'huile sous grand soleil. Un vent de mer de 15 à 25 km/h qui teinte l'eau et forme un peu d'écume met les bars en confiance ; pour le surfcasting, une houle de 1 à 1,5 m qui creuse les baïnes vaut dix sessions sur mer plate. Le créneau en or : 24 à 48 h après un coup de vent, quand l'eau commence à clarifier et que les embouchures regorgent de nourriture déterrée.`,
    `Les postes qui paient : pointes rocheuses battues où la veine de courant accélère, sorties de parcs ostréicoles, baïnes et sorties d'eau des plages océanes la nuit, quais et pontons à l'ombre des coques dans les ports. En Méditerranée, vise les digues, les graus et les sorties d'eau douce, surtout pendant et juste après un coup d'est. Partout, la même règle : l'aube et le crépuscule écrasent le reste de la journée.`,
  ],

  faq: [
    {
      q: 'Quelle est la taille minimale du bar en 2026 ?',
      a: `La maille est de 42 cm en Atlantique, Manche et mer du Nord, et de 30 cm en Méditerranée. Tout bar conservé doit être marqué par l'ablation de la partie inférieure de la nageoire caudale. En dessous de la maille, c'est remise à l'eau immédiate, sans exception.`,
    },
    {
      q: 'Combien de bars peut-on garder par jour ?',
      a: `Le quota est de 3 bars par jour et par pêcheur au nord du 48e parallèle (qui passe vers Audierne), et de 2 bars par jour au sud du 48e parallèle. Attention : en février et mars, c'est pêcher-relâcher obligatoire au nord du 48e parallèle : aucun prélèvement ; au sud, la pêche reste ouverte. Logue aussi tes poissons relâchés : ils comptent dans tes patterns.`,
    },
    {
      q: 'Quel est le meilleur moment de marée pour pêcher le bar ?',
      a: `Les deux dernières heures de montante et la première heure de descendante concentrent la majorité des touches, surtout à la reprise du courant après l'étale. Un poste mort à basse mer peut s'allumer deux heures plus tard : regarde la courbe de marée de ton spot et pêche les renverses, pas les heures creuses.`,
    },
    {
      q: 'Quel leurre choisir pour le bar du bord ?',
      a: `Deux leurres font 90 % du travail : un shad de 10-12 cm en coloris naturel (sardine, lançon) monté sur tête plombée de 7 à 15 g selon le courant, et un stickbait de 9-12 cm pour la surface de juin à octobre. Commence par le souple près du fond, passe en surface dès que ça chasse.`,
    },
  ],
}
