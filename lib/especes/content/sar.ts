import type { EspeceContent } from '../types'

/**
 * Fiche espèce — Sar commun (Diplodus sargus).
 * Le sparidé teigneux du ressac : digues, calanques, enrochements battus.
 * Façades : Méditerranée (cœur de zone, à l'année) + Atlantique sud (avril-novembre).
 */
export const sarEspece: EspeceContent = {
  slug: 'sar',

  intro: [
    `Le sar commun, c'est le sparidé du ressac : trapu, méfiant, collé aux rochers battus là où la dorade ne s'aventure pas. Touche sèche comme un coup de marteau, départ droit dans la caille — du bord, c'est un des combats les plus francs de nos côtes.`,
    `Tu le trouves dans moins de 5 m d'eau, parfois dans 50 cm de mousse, toujours au contact du dur. En Méditerranée, c'est LE poisson des digues, des jetées et des calanques : présent à l'année, avec un pic net en automne-hiver dès que la mer se forme. Sur l'Atlantique, il occupe la façade sud — du Pays basque aux pertuis charentais, en passant par les épis landais et les enrochements portuaires de la Gironde — grosso modo d'avril à novembre.`,
    `Deux approches le prennent vraiment du bord : le surfcasting léger dans les vagues et la flottante au ras des cailloux. Règle commune : bas de ligne discret, appât naturel solide, ferrage immédiat — il ne te laisse pas de deuxième chance. Et retiens ceci : le sar mange quand ça bouge. La mer formée qui fait rentrer tout le monde au port, c'est précisément ton créneau.`,
  ],

  identity: {
    famille: `Sparidés (Diplodus sargus)`,
    tailleCourante: `20-35 cm du bord, 40 cm+ pour les beaux sujets`,
    tailleMax: `~45 cm pour près de 2 kg`,
    habitat: `Enrochements battus, digues, calanques — 0 à 5 m d'eau, dans le ressac`,
    regime: `Crabes, moules, vers, bernard-l'ermite — dentition broyeuse`,
  },

  regulation: {
    verifiedAt: '21/06/2026',
    source:
      'Arrêté du 26 octobre 2012 modifié le 6 janvier 2026 (maille) ; arrêté du 17 mai 2011 modifié (marquage)',
    minSizeCm: { 'manche-atlantique': 25, mediterranee: 23 },
    marquage: true,
    items: [
      `<strong>Taille minimale : 25 cm</strong> en Manche et Atlantique, <strong>23 cm</strong> en Méditerranée — en dessous, remise à l'eau immédiate.`,
      `<strong>Marquage obligatoire</strong> de chaque sar conservé : ablation de la partie inférieure de la nageoire caudale, dès la capture.`,
      `<strong>Pas de quota national</strong> de captures pour la pêche de loisir. Reste raisonnable malgré tout : un poisson de roche se prélève avec mesure.`,
      `En Méditerranée, <strong>vérifie la réglementation locale avant de pêcher</strong> : réserves marines et zones protégées (Cerbère-Banyuls, Scandola, cœur du Parc national des Calanques…) peuvent restreindre ou interdire la pêche.`,
    ],
  },

  saisons: {
    'manche-atlantique': [
      {
        saison: 'Printemps',
        activite: 2,
        note: `Reprise en avril sur les digues basques et les épis landais : les premiers crabes mous remettent les sars à table.`,
      },
      {
        saison: 'Été',
        activite: 2,
        note: `Poisson présent mais méfiant par eau claire : vise l'aube, le coup du soir et les journées de houle résiduelle.`,
      },
      {
        saison: 'Automne',
        activite: 3,
        note: `Le pic : mer formée, eau teintée, gros sujets dans le ressac jusqu'en novembre, des pertuis charentais au Pays basque.`,
      },
      {
        saison: 'Hiver',
        activite: 1,
        note: `Activité minimale : quelques poissons calés au Pays basque entre deux coups de mer, mais c'est une cible secondaire.`,
      },
    ],
    mediterranee: [
      {
        saison: 'Printemps',
        activite: 2,
        note: `Les sars se rapprochent du bord avec le réchauffement de l'eau : bons coups au lever du jour le long des digues.`,
      },
      {
        saison: 'Été',
        activite: 2,
        note: `Présent partout mais ultra-méfiant en eau cristalline : affine les diamètres, pêche de nuit ou aux toutes premières lueurs.`,
      },
      {
        saison: 'Automne',
        activite: 3,
        note: `Cœur de saison : premiers coups de levant, eau blanchie, les sars se gavent dans la mousse au pied des blocs.`,
      },
      {
        saison: 'Hiver',
        activite: 3,
        note: `Les plus beaux poissons de l'année entre deux coups de mistral : mer formée, sars mordeurs, et souvent personne au bord.`,
      },
    ],
  },

  techniques: [
    {
      slug: 'surfcasting',
      why: `Le surfcasting léger est l'arme reine dès que la mer se forme : tu poses un demi-crabe ou une moule ligaturée dans l'eau blanche, à 20-50 m du bord, là où la houle retourne le fond. Canne 60-100 g, trainard court, bannière tendue — la touche est un coup sec unique, le ferrage doit suivre dans la seconde.`,
    },
    {
      slug: 'flottante',
      why: `La flottante, c'est le sar au contact : bolognaise 5-6 m, flotteur 2-6 g, et tu pêches à gratter au ras des rochers, dans la mousse, souvent à moins de 2 m du bord. Un broumé léger de moules écrasées fixe le poste ; au premier enfoncement franc, ferre — tout se joue dans les trois premières secondes.`,
    },
  ],

  postes: [
    `Le sar tient des postes précis, toujours au contact du dur : pieds de digues et de jetées, failles et sorties de calanques, épis, pointes rocheuses, enrochements portuaires. Cherche la zone exacte où la vague vient de casser — l'eau blanche chargée d'oxygène où il fouille le fond retourné par la houle. Sans touche au bout de vingt minutes, change de bloc : c'est à toi d'aller le trouver, pas l'inverse.`,
    `Côté conditions, retiens une règle simple : plus ça bouge, mieux il mord. Un vent de face de 15 à 25 km/h, une houle d'un mètre, une eau teintée par le ressac : ce sont tes meilleures fenêtres. En Méditerranée, le créneau en or, c'est juste après un coup de mistral ou de levant, quand la mer retombe mais que l'eau reste blanchie. À l'inverse, plat total et eau cristalline égalent poisson quasi impêchable en pleine journée — descends en 18-22/100 ou attends le crépuscule.`,
    `Sur l'Atlantique, la marée commande tout : pêche le montant, surtout les deux dernières heures avant la pleine mer, quand l'eau recouvre les moulières et les zones à crabes au pied des enrochements. Regarde la courbe de marée de ton spot et cale ta session sur cette fenêtre, étale comprise. En Méditerranée, le marnage est négligeable : c'est la houle qui joue le rôle de la marée — elle décolle la nourriture du caillou et déclenche les repas.`,
  ],

  faq: [
    {
      q: `Quelle est la taille minimale du sar ?`,
      a: `La taille minimale est de 25 cm en Manche et Atlantique, et de 23 cm en Méditerranée (arrêté du 26 octobre 2012 modifié le 6 janvier 2026). Tout poisson en dessous se remet à l'eau immédiatement, et vite : décroché dans l'eau si possible, il repart sans dommage. Tout sar conservé doit aussi être marqué (ablation de la partie inférieure de la nageoire caudale). En Méditerranée, vérifie aussi les règles locales des réserves marines.`,
    },
    {
      q: `Quel est le meilleur appât pour pêcher le sar du bord ?`,
      a: `Le crabe est roi : crabe mou en flottante, demi-crabe vert ligaturé en surfcasting. Viennent ensuite la moule décoquillée serrée au fil élastique, le bernard-l'ermite décortiqué et le gros ver dur. En Méditerranée, ajoute le bibi. Dans tous les cas, un appât solide qui tient le ressac et les coups de dents des petits poissons.`,
    },
    {
      q: `Quand pêcher le sar ?`,
      a: `Quand la mer bouge. En Méditerranée, le sar se pêche à l'année avec un pic automne-hiver, juste après un coup de mistral ou de levant. Sur l'Atlantique sud, vise avril à novembre, marée montante, deux dernières heures avant la pleine mer. Aux heures, l'aube et le coup du soir dominent ; le plat total de midi est le pire créneau.`,
    },
    {
      q: `Le sar est-il bon à manger ?`,
      a: `Oui, c'est même un des meilleurs poissons de roche : chair blanche, ferme et fine, excellente entière au four ou grillée. Un sujet de 25-30 cm suffit pour une portion. Prélève avec mesure — le sar grandit lentement et reste fidèle à ses postes : un bloc vidé met longtemps à se repeupler.`,
    },
  ],
}
