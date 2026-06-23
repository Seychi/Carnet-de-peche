import type { EspeceContent } from "../types"

/**
 * Fiche espèce — Sole (Solea solea).
 * Le poisson plat de la nuit : surfcasting au ver/couteau au ras du sable,
 * sur les plages et les estrans. Façades : Manche-Atlantique (cœur de zone,
 * du printemps à l'automne) + Méditerranée (secondaire, présence côtière
 * surtout à la fraîche). Réglementation vérifiée le 23/06/2026.
 */
export const soleEspece: EspeceContent = {
  slug: "sole",

  intro: [
    `La sole, c'est la prise de la nuit par excellence : un poisson plat couché sur le sable, invisible le jour, qui se met en chasse dès que la lumière tombe. Du bord, on ne la voit jamais venir — la touche est discrète, une pression molle qui plombe la bannière plutôt qu'un coup franc. Toute la pêche tient là : savoir lire ce petit poids qui s'installe et ferrer en douceur, sans arracher.`,
    `Tu la trouves sur les grandes plages de sable et les estrans de la Manche et de l'Atlantique, là où le fond est propre, plat, parfois mêlé de vase. Elle reste collée au substrat, à l'affût des vers, des petits couteaux et des coquillages que la marée remue. En Méditerranée elle existe aussi, plus discrète et surtout côtière à la fraîche, près des embouchures et des fonds sableux abrités. Partout, c'est un poisson de fond pur : ce qui se passe dans les vingt premiers centimètres au-dessus du sable décide de ta soirée.`,
    `Une seule approche la prend vraiment du bord : le surfcasting de nuit, appât naturel posé au ras du fond. Pas de leurre qui tienne, pas de flottante — la sole fouille le sable le nez en bas. La recette est simple et exigeante à la fois : un montage discret, un ver ou un morceau de couteau bien frais, et la patience d'attendre que la nuit fasse son travail. Le bon pêcheur de soles ne mitraille pas : il pose, il surveille sa bannière, et il ferre quand le poids s'installe.`,
  ],

  identity: {
    famille: `Soléidés (Solea solea)`,
    tailleCourante: `25-35 cm du bord, 40 cm+ pour une belle sole`,
    tailleMax: `~50 cm pour près de 1,5 kg`,
    habitat: `Fonds de sable et de vase, plages et estrans — au contact du substrat, surtout de nuit`,
    regime: `Vers, petits couteaux, mollusques et crustacés fouillés dans le sable`,
  },

  regulation: {
    verifiedAt: "23/06/2026",
    source: "Arrêté du 26 octobre 2012 modifié (harmonisé par l'arrêté du 12 mai 2023) ; arrêté du 17 mai 2011 modifié (marquage)",
    minSizeCm: { "manche-atlantique": 25, mediterranee: 24 },
    marquage: true,
    items: [
      `<strong>Taille minimale : 25 cm</strong> en Manche et Atlantique, <strong>24 cm</strong> en Méditerranée (maille harmonisée par l'arrêté du 12 mai 2023) — en dessous, remise à l'eau immédiate.`,
      `<strong>Marquage obligatoire</strong> de chaque sole conservée : ablation de la partie inférieure de la nageoire caudale, dès la capture.`,
      `<strong>Pas de quota national</strong> de captures pour la pêche de loisir. Prélève avec mesure : la sole se reproduit lentement et un poste vidé met du temps à se repeupler.`,
    ],
  },

  saisons: {
    "manche-atlantique": [
      {
        saison: "Printemps",
        activite: 3,
        note: `Le grand retour : à partir de mars-avril, les soles reviennent vers la côte pour frayer et se nourrir. Les nuits de fin de printemps comptent parmi les meilleures de l'année.`,
      },
      {
        saison: "Été",
        activite: 2,
        note: `Présente mais plus calée la nuit profonde par eau chaude : vise les heures sombres et les plages calmes, loin de la fréquentation diurne.`,
      },
      {
        saison: "Automne",
        activite: 3,
        note: `Second pic : les soles se gavent avant de regagner le large pour l'hiver. Nuits fraîches, mer légèrement formée, beaux poissons au rendez-vous.`,
      },
      {
        saison: "Hiver",
        activite: 1,
        note: `Le creux : la majorité des soles a filé vers les fonds plus profonds. Quelques poissons restent capturables sur les estrans doux entre deux coups de froid.`,
      },
    ],
    mediterranee: [
      {
        saison: "Printemps",
        activite: 2,
        note: `Activité côtière correcte de nuit près des embouchures et des plages de sable : c'est la meilleure fenêtre méditerranéenne.`,
      },
      {
        saison: "Été",
        activite: 1,
        note: `Présence discrète et profonde par eau chaude : poisson secondaire, à chercher aux toutes premières heures sombres sur les fonds sableux abrités.`,
      },
      {
        saison: "Automne",
        activite: 2,
        note: `Le rafraîchissement de l'eau ramène quelques soles vers le bord, surtout autour des sorties de lagunes et des estuaires.`,
      },
      {
        saison: "Hiver",
        activite: 1,
        note: `Activité minimale du bord : cible occasionnelle, à tenter de nuit lors des redoux sur les plages abritées.`,
      },
    ],
  },

  techniques: [
    {
      slug: "surfcasting",
      why: `La seule vraie technique du bord. Canne de 4 m en puissance 100-150 g, bas de ligne fin (16-22/100) à un ou deux hameçons fins de fer n°2 à 1/0, plomb grappin pour fixer le montage dans le courant. L'appât se pose au ras du sable : ver de chalut, dur, américain, ou lanière de couteau bien frais — la sole fouille le nez en bas. Bannière tendue, scion sous les yeux : la touche est une pression molle qui plombe le fil, jamais un coup sec. Laisse-la prendre, puis ferre en douceur pour ne pas décrocher cette petite bouche.`,
    },
  ],

  postes: [
    `La sole se pêche sur le sable propre et plat : grandes plages, estrans, baies sableuses, abords d'embouchures où la marée brasse les vers et les coquillages. Cherche les zones légèrement creuses, les baïnes, les dépressions qui retiennent l'eau et concentrent la nourriture quand la mer monte. Inutile de lancer à 120 m : par bonne nuit, la sole vient fouiller à dix ou quinze mètres du bord, dans très peu d'eau. Pose deux cannes à des distances différentes pour trouver la veine où elle circule, puis concentre-toi dessus.`,
    `Le moment, c'est la nuit, point. La sole est un poisson nocturne : 90 % des prises du bord tombent une fois la lumière éteinte, avec un créneau en or autour du lever et du coucher du soleil dans la pénombre. Côté marée, vise le montant et les deux heures autour de la pleine mer, quand l'eau recouvre les zones à vers et que le courant remet la nourriture en mouvement. Les nuits sombres, sans lune, sont souvent les meilleures — la sole chasse à l'odeur et à la pression, pas à la vue.`,
    `Côté conditions, la sole aime une mer animée mais pas démontée : une petite houle de 30 à 60 cm qui retourne le sable et libère les proies est idéale, alors qu'un plat d'huile complet ralentit souvent les touches. Un vent de travers modéré qui ride la surface aide. À l'inverse, après un gros coup de vent qui charge l'eau de sable en suspension, laisse passer une marée ou deux que ça se calme. Et garde tes appâts frais : la sole repère un ver mou et fatigué — renouvelle-les régulièrement plutôt que de laisser traîner un hameçon mort.`,
  ],

  faq: [
    {
      q: `Quelle est la taille minimale de la sole ?`,
      a: `La taille minimale est de 25 cm en Manche et Atlantique, et de 24 cm en Méditerranée (maille harmonisée par l'arrêté du 12 mai 2023). Tout poisson en dessous se remet à l'eau immédiatement. Chaque sole conservée doit aussi être marquée par ablation de la partie inférieure de la nageoire caudale, dès la capture.`,
    },
    {
      q: `Quand pêcher la sole du bord ?`,
      a: `De nuit avant tout, sur la Manche et l'Atlantique, avec deux pics nets : le printemps (mars à juin) et l'automne (septembre-novembre). Vise la marée montante et les deux heures autour de la pleine mer, idéalement par nuit sombre sans lune. En Méditerranée, c'est une cible plus discrète, surtout au printemps et en automne près des embouchures.`,
    },
    {
      q: `Quel appât et quel montage pour la sole ?`,
      a: `Le ver est roi : ver de chalut, ver dur, ver américain, ou lanière de couteau bien frais — toujours présenté au ras du fond. Monte un bas de ligne fin (16-22/100) à un ou deux hameçons fins de fer n°2 à 1/0, sur plomb grappin pour tenir dans le courant. Garde l'appât frais et renouvelle-le souvent : la sole boude un ver mou.`,
    },
    {
      q: `Pourquoi la sole se pêche-t-elle surtout la nuit ?`,
      a: `Parce que c'est un poisson nocturne qui fouille le sable à l'odeur et à la pression, pas à la vue. Le jour, elle s'enfouit et reste inactive ; la nuit, elle se met en chasse au ras du fond. La quasi-totalité des prises du bord tombe une fois la lumière éteinte, avec un créneau privilégié dans la pénombre du crépuscule et de l'aube.`,
    },
  ],
}
