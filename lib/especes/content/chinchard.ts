import type { EspeceContent } from "../types"

/**
 * Fiche espèce chinchard (Trachurus trachurus), aussi appelé saurel —
 * /especes/chinchard. Pélagique de banc qui chasse en pleine eau, ciblé
 * aux mitraillettes/leurres l'été-automne sur les digues de Manche,
 * Atlantique et Méditerranée. Maille 15 cm sur les deux façades.
 * Réglementation pêche de loisir : maille 15 cm, PAS de quota ni de fermeture
 * (les TAC UE sur le chinchard visent la pêche pro, pas le loisir).
 * Vérifiée le 24/06/2026.
 */
export const chinchardEspece: EspeceContent = {
  slug: "chinchard",

  intro: [
    `Le chinchard — le saurel, comme on l'appelle souvent — c'est le pélagique de banc qui tape entre deux maquereaux quand l'été bat son plein. Tu le reconnais à sa ligne latérale armée d'écussons coupants, son œil énorme et sa nervosité de poisson de pleine eau. Il chasse en bancs serrés, file vite, et débarque souvent là où le maquereau finit par lasser : sorties de port, pointes de digue, veines de courant.`,
    `Ne le snobe pas sous prétexte qu'il « se prend tout seul ». Le chinchard a sa propre logique : il colle plus volontiers au fond et entre deux eaux que le maquereau qui chasse en surface, et il mord souvent quand la lumière tombe. Trouve sa profondeur — compte la descente de ton plomb, repère à quelle hauteur les touches partent — et tu enchaînes, parfois deux ou trois poissons d'un coup sur la mitraillette. Sur du matériel léger, ses rushs courts et nerveux te surprennent à chaque fois.`,
    `C'est aussi une pêche conviviale et accessible : une digue, un train de plumes, le bon créneau au crépuscule, et la glacière se remplit. Côté réglementation, c'est simple pour le loisir — une maille de 15 cm, pas de quota — mais prélève avec mesure : un banc se décime vite.`,
  ],

  identity: {
    famille: "Carangidés (Trachurus trachurus)",
    tailleCourante: "18-30 cm du bord",
    tailleMax: "40 cm pour les beaux sujets — au-delà, c'est exceptionnel à la canne",
    habitat: "Pleine eau, en banc : sorties de port, pointes de digue, jetées et veines de courant, souvent entre deux eaux ou près du fond",
    regime: "Petits poissons (lançons, juvéniles de sardine et de sprat), crevettes, zooplancton et larves",
  },

  regulation: {
    verifiedAt: "24/06/2026",
    source: "Arrêté du 26 octobre 2012 modifié (Trachurus spp., taille minimale pêche de loisir)",
    minSizeCm: { "manche-atlantique": 15, mediterranee: 15 },
    marquage: false,
    items: [
      `<strong>Maille : 15 cm</strong> en Manche, Atlantique et Méditerranée — toute prise sous la taille retourne à l'eau, manipulée le moins possible.`,
      `<strong>Pas de quota ni de marquage</strong> pour la pêche de loisir du chinchard à ce jour. Les règlements UE qui visent le chinchard (TAC) concernent la pêche professionnelle, pas la pêche de loisir du bord.`,
      `<strong>Prélève ce que tu consommes</strong> — un banc de chinchards se décime vite. En réserve ou parc marin, vérifie toujours la réglementation locale (la maille passe à 20 cm dans le Parc naturel marin du Golfe du Lion).`,
    ],
  },

  saisons: {
    "manche-atlantique": [
      {
        saison: "Printemps",
        activite: 1,
        note: `Encore rare du bord : les bancs sont au large et l'eau trop froide. Quelques sujets isolés en fin de printemps quand la température grimpe.`,
      },
      {
        saison: "Été",
        activite: 3,
        note: `Le pic : bancs serrés sur les digues et sorties de port, souvent au crépuscule. La mitraillette enchaîne dès que tu as trouvé la profondeur.`,
      },
      {
        saison: "Automne",
        activite: 2,
        note: `Encore de beaux coups en septembre-octobre, surtout le soir, puis les bancs filent au large à mesure que l'eau refroidit.`,
      },
      {
        saison: "Hiver",
        activite: 1,
        note: `Absent du bord : le chinchard hiverne au large et en profondeur. Rien à espérer depuis les digues avant le retour des eaux chaudes.`,
      },
    ],
    mediterranee: [
      {
        saison: "Printemps",
        activite: 2,
        note: `Les bancs se rapprochent des ports et des digues profondes dès que l'eau se réchauffe — passages irréguliers, souvent aux premières et dernières lueurs.`,
      },
      {
        saison: "Été",
        activite: 3,
        note: `Pleine saison : très présent le soir et la nuit sur les digues et sorties de port, attiré par les éclairages qui concentrent le menu fretin.`,
      },
      {
        saison: "Automne",
        activite: 2,
        note: `Encore actif en début d'automne, surtout de nuit ; l'activité s'espace à mesure que l'eau refroidit et que les bancs gagnent le large.`,
      },
      {
        saison: "Hiver",
        activite: 1,
        note: `Devenu rare du bord : quelques poissons isolés autour des ports éclairés les nuits douces, rien de vraiment ciblable à la canne.`,
      },
    ],
  },

  techniques: [
    {
      slug: "leurres",
      why: `La technique reine : mitraillette de 3 à 6 plumes ou tubes lumineux, lestée d'un plomb ou d'un petit jig de 20 à 50 g, ramenée par tirées lentes et descentes contrôlées. Le chinchard colle plus au fond et entre deux eaux que le maquereau — varie la profondeur jusqu'à trouver le banc, puis répète. Petits jigs et leurres souples montés fin (1,5-3 g) au crépuscule pour plus de sport sur les sujets actifs.`,
    },
    {
      slug: "flottante",
      why: `Flotteur coulissant réglé entre 3 et 8 m, escher d'un morceau de lanière de poisson, de crevette ou d'un ver : redoutable de nuit dans les ports éclairés, quand le banc traîne entre deux eaux sans chasser franchement. Montage simple, touches franches, idéal pour cibler le chinchard quand la mitraillette tourne à vide.`,
    },
    {
      slug: "vif",
      why: `Occasionnel mais utile : un petit chinchard pris au début de session fait un vif de premier ordre pour le bar ou le lieu qui rôde sous le banc. Monté sur un montage coulissant léger, il te branche directement sur les prédateurs attirés par l'agitation du banc — deux pêches en une depuis le même poste.`,
    },
  ],

  postes: [
    `Le chinchard suit la nourriture et la lumière, pas la structure : vise les endroits où le courant concentre le menu fretin — pointes de digue, jetées, estacades, sorties de port et veines de courant. En Méditerranée, les digues et quais éclairés sont des aimants la nuit : les lampadaires attirent le plancton et les alevins, le banc vient se servir dessous. Repère à quelle profondeur les touches partent et reste-y : un banc de chinchards évolue souvent à une hauteur d'eau précise.`,
    `Côté marée, le chinchard est moins horloger qu'un bar, mais le courant rassemble ses proies : sur la Manche et l'Atlantique, les deux heures autour de la pleine mer et le début de la descendante concentrent les passages depuis les digues. Le vrai déclencheur reste la lumière — l'aube et surtout le crépuscule dominent largement, et la pêche se prolonge volontiers dans la nuit, là où le maquereau, lui, s'arrête au coucher du soleil.`,
    `Le vent et la houle font le tri : une brise modérée qui ride la surface met le banc en confiance et aide. À l'inverse, une mer formée ou une eau turbide après un gros coup de vent coupe l'activité — le chinchard chasse à vue, il lui faut une eau propre. Après une tempête, laisse passer 24 à 48 h que l'eau se clarifie.`,
  ],

  faq: [
    {
      q: "Quelle est la taille minimale du chinchard ?",
      a: `La maille est de 15 cm en Manche, Atlantique et Méditerranée : tout poisson sous cette taille doit être remis à l'eau. Il n'y a pas de marquage obligatoire ni de quota journalier pour la pêche de loisir du chinchard. Les quotas (TAC) que l'on voit passer dans les règlements européens concernent la pêche professionnelle, pas la pêche de loisir du bord.`,
    },
    {
      q: "Peut-on pêcher le chinchard en Vendée et dans le golfe de Gascogne ?",
      a: `Oui : aucune interdiction ne vise la pêche de loisir du chinchard dans le golfe de Gascogne. La seule règle est la maille de 15 cm. Les mesures européennes sur le chinchard du golfe de Gascogne (zone CIEM 8) sont des quotas commerciaux qui s'appliquent à la pêche professionnelle. Comme partout, vérifie la réglementation locale si tu pêches dans une réserve ou un parc marin.`,
    },
    {
      q: "Quand pêcher le chinchard du bord ?",
      a: `De l'été au début de l'automne, avec un pic en juillet-août sur les digues, sorties de port et pointes. Vise le crépuscule et la nuit : le chinchard mord bien quand la lumière tombe, plus tard que le maquereau. En Méditerranée, les digues et quais éclairés le concentrent de nuit ; en Manche et Atlantique, joue les deux heures autour de la pleine mer au coucher du soleil.`,
    },
    {
      q: "Quel montage pour pêcher le chinchard ?",
      a: `La référence, c'est la mitraillette : un train de 3 à 6 plumes ou tubes lumineux en potence, lesté d'un plomb ou d'un petit jig de 20 à 50 g, ramené par tirées lentes en variant la profondeur. Le chinchard colle souvent plus au fond et entre deux eaux que le maquereau, alors prospecte toute la couche d'eau. Dans les ports éclairés de nuit, un flotteur coulissant réglé entre 3 et 8 m avec une lanière de poisson ou une crevette fait aussi très bien le travail.`,
    },
  ],
}
