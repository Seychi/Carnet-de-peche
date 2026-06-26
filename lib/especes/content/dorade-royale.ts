import type { EspeceContent } from '../types'

/**
 * Fiche espèce — Dorade royale (Sparus aurata).
 * Angle : la belle méfiante des fonds coquilliers.
 * Techniques (ordre matrice) : surfcasting (phare), flottante, leurres.
 */
export const doradeRoyaleEspece: EspeceContent = {
  slug: 'dorade-royale',

  intro: [
    `La dorade royale, c'est la belle méfiante des fonds coquilliers : un bandeau doré entre les yeux, des mâchoires capables de broyer une huître, et un premier rush qui te prend dix mètres de fil. Du bord, peu de poissons offrent un combat aussi brutal sur un montage aussi fin.`,
    `Tu la trouves sur les fonds sablo-vaseux et les zones coquillières : plages à pente douce, baies abritées, parcs à huîtres et bouchots, graus des étangs méditerranéens, ports et digues. Elle remonte avec la marée pour fouiller dans 1 à 5 m d'eau, souvent à 30-70 m du bord, bien plus près que tu ne l'imagines. Couteau, bibi, crabe mou ou crevette vivante : tout ce qui craque sous la dent l'intéresse.`,
    `C'est aussi la plus capricieuse de nos côtes : elle goûte, recrache, revient, et snobe un appât délavé ou un bas de ligne trop épais. La finesse de présentation et le bon créneau de marée comptent plus que la distance de lancer. Note tes sorties et repère les conditions de tes réussites : avec la royale, les patterns se répètent d'une année sur l'autre.`,
  ],

  identity: {
    famille: 'Sparidés (Sparus aurata)',
    tailleCourante: '25-45 cm du bord, 50 cm+ pour les belles',
    tailleMax: 'Environ 70 cm, les sujets de plus de 5 kg restent exceptionnels du bord',
    habitat: 'Fonds sablo-vaseux et coquilliers de 1 à 30 m : baies abritées, parcs à huîtres, graus, ports',
    regime: 'Coquillages (moules, couteaux), crabes, vers marins, crevettes (mâchoires broyeuses)',
  },

  regulation: {
    verifiedAt: '21/06/2026',
    source:
      'Arrêté du 26 octobre 2012 modifié le 6 janvier 2026 (tailles minimales) ; arrêté du 17 mai 2011 modifié (marquage)',
    minSizeCm: { 'manche-atlantique': 23, mediterranee: 23 },
    marquage: true,
    items: [
      `Taille minimale de capture : <strong>23 cm</strong>, sur toutes les façades (Manche, Atlantique, Méditerranée). Exception locale : 30 cm dans le Parc naturel marin du Golfe du Lion.`,
      `<strong>Marquage obligatoire</strong> de chaque poisson conservé : ablation de la partie inférieure de la nageoire caudale.`,
      `Pas de quota national à ce jour (hors aires marines protégées, où des limites locales s'appliquent), pratique raisonnée conseillée : relâche de préférence les sujets proches de la maille.`,
    ],
  },

  saisons: {
    'manche-atlantique': [
      {
        saison: 'Printemps',
        activite: 2,
        note: `Les premières royales touchent la côte en avril-mai : le bassin d'Arcachon et les pertuis charentais ouvrent le bal dès que l'eau se réchauffe.`,
      },
      {
        saison: 'Été',
        activite: 3,
        note: `Pleine saison sur toute la façade : plages, baies et parcs à huîtres. Les sessions de nuit sortent les poissons les plus réguliers.`,
      },
      {
        saison: 'Automne',
        activite: 3,
        note: `Le pic de l'année : poissons gavés avant la redescente, gros sujets en surfcasting de nuit en octobre-novembre.`,
      },
      {
        saison: 'Hiver',
        activite: 1,
        note: `Redescendue au large dès les gros refroidissements : quasi introuvable du bord, attends le retour d'avril-mai.`,
      },
    ],
    mediterranee: [
      {
        saison: 'Printemps',
        activite: 3,
        note: `Premier pic de l'année : les royales rentrent dans les étangs par les graus et reprennent les plages, appétit grand ouvert.`,
      },
      {
        saison: 'Été',
        activite: 2,
        note: `Présente partout mais éparpillée et méfiante en eau chaude : vise l'aube, le crépuscule et surtout la nuit.`,
      },
      {
        saison: 'Automne',
        activite: 3,
        note: `Le grand rendez-vous : les dorades regagnent la mer par les graus de Thau, Leucate ou Salses, les plus grosses de l'année.`,
      },
      {
        saison: 'Hiver',
        activite: 1,
        note: `Présente à l'année mais ralentie : prenable par belles journées calmes sur les postes profonds, présentation très lente.`,
      },
    ],
  },

  techniques: [
    {
      slug: 'surfcasting',
      why: `LA technique reine pour la royale : couteau ou bibi posé sur la zone coquillière à 30-70 m, plombée débrayable, de nuit pour les gros sujets.`,
    },
    {
      slug: 'flottante',
      why: `Redoutable dans les ports et le long des digues : crevette vivante présentée à 30-50 cm du fond, montage fin et amorçage léger aux moules broyées.`,
    },
    {
      slug: 'leurres',
      why: `La technique montante : tenya ou madaï de 7 à 20 g garni d'une lanière de gambas, raclé au ras du fond avec de longues pauses. La touche vient à la pause.`,
    },
  ],

  postes: [
    `La royale mange avec le mouvement d'eau. Le créneau roi : la montante qui recouvre les zones coquillières, surtout les deux dernières heures avant la pleine mer et l'étale qui suit. Cale tes sessions sur la courbe de marée de ton spot et sois en place avant que l'eau n'atteigne le poste : c'est la marée qui amène le poisson sur la table.`,
    `Le scénario en or côté météo : un coup de vent la veille qui a remué le fond et délogé vers et coquillages, suivi d'une mer qui s'assagit avec une houle résiduelle de 0,5 à 1 m et une eau encore teintée. À l'inverse, une grosse houle en cours rend le surfcasting quasi impraticable, et une mer d'huile en eau très claire t'oblige à descendre en diamètre, ou à basculer sur les ports à la flottante.`,
    `Elle devient vraiment active au-dessus de 14-15 °C d'eau. Côté horaires : aube, crépuscule et première partie de nuit dominent ; en plein été, la nuit fait clairement la différence sur les beaux poissons. Dans les ports, vise plutôt tôt le matin, avant le trafic des bateaux, et reste discret sur le ponton, une royale qui t'a repéré ne mangera plus.`,
  ],

  faq: [
    {
      q: 'Quelle est la taille minimale pour pêcher la dorade royale ?',
      a: `La maille est fixée à 23 cm sur toutes les façades (Manche, Atlantique, Méditerranée) par l'arrêté du 26 octobre 2012 modifié. Tu dois aussi marquer chaque poisson conservé en coupant la partie inférieure de la nageoire caudale. Pas de quota national, mais relâcher les sujets proches de la maille reste la pratique raisonnée.`,
    },
    {
      q: 'Quel est le meilleur appât pour la dorade royale ?',
      a: `Le couteau entier ligaturé au fil élastique est l'appât roi en surfcasting, devant le bibi, le crabe mou et le mourre de porc en Méditerranée. À la flottante dans les ports, la crevette vivante piquée sous la corne fait la différence. Règle d'or : renouvelle l'appât toutes les 30-40 minutes, la royale snobe un appât délavé.`,
    },
    {
      q: 'Quand pêcher la dorade royale du bord ?',
      a: `Sur l'Atlantique, d'avril-mai (bassin d'Arcachon, pertuis charentais) jusqu'aux refroidissements d'octobre-novembre, avec un pic de la fin d'été au début d'automne. En Méditerranée, toute l'année avec deux pics : printemps et automne, quand les poissons transitent par les graus. Dans la journée, vise la montante, l'aube, le crépuscule, et la nuit pour les gros sujets.`,
    },
    {
      q: 'À quelle distance lancer pour la dorade royale en surfcasting ?',
      a: `Inutile d'envoyer à 120 m : la royale fouille la première bordure, entre 30 et 70 m, dans 1,5 à 4 m d'eau, dès que la marée recouvre la zone coquillière. Repère un banc de moules, une sortie d'étang ou une veine de courant entre deux bancs de sable, et pose ton appât dessus plutôt que de viser la distance.`,
    },
  ],
}
