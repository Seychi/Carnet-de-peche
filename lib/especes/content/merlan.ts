import type { EspeceContent } from '../types'

/**
 * Fiche espèce merlan (Merlangius merlangus) — /especes/merlan.
 * Angle : LE poisson du surfcasting d'hiver sur le sable — sessions de nuit
 * glaciales, montages à empiles multiples, touches franches. Façade unique :
 * Manche + Atlantique nord (gadidé d'eau froide, absent de Méditerranée
 * → activite 1 + note). Réglementation vérifiée le 24/06/2026 : maille 27 cm,
 * PAS de marquage, PAS de quota, PAS de fermeture.
 */
export const merlanEspece: EspeceContent = {
  slug: 'merlan',

  intro: [
    `Le merlan, c'est le poisson qui sauve l'hiver du surfcasteur. Quand le bar a regagné le large et que la plage est vide à 2 h du matin sous 5 °C, lui s'approche du sable pour se gaver, vorace, peu méfiant, et en bancs serrés sur les bons fonds. Une touche de merlan, c'est franc : il ne mordille pas, il avale.`,
    `Ce petit gadidé d'eau froide est un poisson de saison courte et intense. De novembre à mars, il colonise les plages de sable et les fonds sablo-vaseux de la Manche et de l'Atlantique nord : Nord, Pas-de-Calais, baie de Somme, côtes normandes et bretonnes. Le reste de l'année il reste au large ou repart frayer, et tu ne le croiseras quasiment plus du bord. C'est un poisson grégaire : quand tu en touches un, il y en a d'autres juste derrière, d'où l'intérêt des montages à plusieurs hameçons qui prospectent la colonne d'eau d'un seul lancer.`,
    `Côté règlement, le merlan est l'un des plus simples de nos côtes : une maille de 27 cm en Manche-Atlantique, et c'est tout. Pas de marquage, pas de quota de loisir, pas de fermeture. Ça n'autorise pas le carnage, un beau merlan met des années à pousser et la ressource souffre, mais ça en fait un poisson de table accessible et une excellente école pour apprendre le surfcasting d'hiver. Cette fiche te donne les saisons par façade, les montages qui font la différence et comment lire le poste de nuit sur le sable.`,
  ],

  identity: {
    famille: 'Gadidés (Merlangius merlangus), cousin du tacaud, de la morue et du lieu',
    tailleCourante: '25-35 cm du bord, 40 cm+ pour un beau merlan de plage',
    tailleMax: '≈ 70 cm pour 3 kg (très rare, surtout au large)',
    habitat: 'Plages de sable et fonds sablo-vaseux de 5 à 25 m, proches de têtes de roche, Manche et Atlantique nord',
    regime: "Opportuniste vorace : vers, petits crustacés, alevins, morceaux de poisson",
  },

  regulation: {
    verifiedAt: '24/06/2026',
    source: 'Arrêté du 26 octobre 2012 modifié (annexe I, Merlangius merlangus)',
    minSizeCm: { 'manche-atlantique': 27, mediterranee: null },
    marquage: false,
    items: [
      `<strong>Maille : 27 cm</strong> en Manche et Atlantique (annexe I de l'arrêté du 26 octobre 2012 modifié). Tout merlan sous cette taille est remis à l'eau immédiatement.`,
      `<strong>Pas de marquage obligatoire</strong> : le merlan ne figure pas dans la liste limitative de l'arrêté du 17 mai 2011, tu n'as pas à entailler la caudale.`,
      `<strong>Pas de quota de loisir ni de fermeture nationale</strong> pour le merlan. Reste raisonnable malgré tout : c'est un poisson grégaire facile à surpêcher d'un seul poste : prélève l'assiette, pas le banc.`,
      `<strong>Absent de Méditerranée</strong> (espèce d'eau froide) : aucune maille n'y est définie pour lui.`,
    ],
  },

  saisons: {
    'manche-atlantique': [
      {
        saison: 'Printemps',
        activite: 1,
        note: `Le merlan a quitté la côte pour frayer et regagner le large : quasi introuvable du bord au printemps. Range les cannes de surf à merlan, c'est la saison du bar et du lieu.`,
      },
      {
        saison: 'Été',
        activite: 1,
        note: `Hors saison : l'eau est trop chaude, le merlan reste au large sur des fonds plus profonds. Tu n'en prendras pas du bord en plein été.`,
      },
      {
        saison: 'Automne',
        activite: 2,
        note: `Le retour : dès que l'eau refroidit en fin d'automne, les premiers bancs reviennent sur les plages. Novembre lance la saison, les sessions de nuit redeviennent productives.`,
      },
      {
        saison: 'Hiver',
        activite: 3,
        note: `LE moment : de décembre à février, le merlan se gave près du bord par eau froide et agitée. Surfcasting de nuit sur le sable, touches franches en rafale, la saison reine du poisson d'hiver.`,
      },
    ],
    mediterranee: [
      {
        saison: 'Printemps',
        activite: 1,
        note: `Espèce d'eau froide absente de Méditerranée : pas de merlan ici. Son aire de répartition s'arrête à l'Atlantique nord et à la Manche.`,
      },
      {
        saison: 'Été',
        activite: 1,
        note: `Aucune présence en Méditerranée : l'eau est bien trop chaude pour ce gadidé septentrional. Inutile de le chercher.`,
      },
      {
        saison: 'Automne',
        activite: 1,
        note: `Toujours absent : même quand l'eau se rafraîchit, la Méditerranée reste hors de son aire. Vise plutôt la dorade ou le sar sur les plages méditerranéennes.`,
      },
      {
        saison: 'Hiver',
        activite: 1,
        note: `Pas de merlan en Méditerranée, même au cœur de l'hiver : la mer n'y descend jamais aux températures qu'il recherche.`,
      },
    ],
  },

  techniques: [
    {
      slug: 'surfcasting',
      why: `LA technique du merlan, et de loin : un montage à empiles multiples (flapper rig à trois hameçons, ou empile haute + long traînard sur le sable) lancé au-delà de la barre, appâté à l'arénicole ou au morceau de maquereau. La nuit, à la baisse, sur une plage de sable qui creuse un peu.`,
    },
    {
      slug: 'flottante',
      why: `Marginale mais utile depuis un môle ou une digue sableuse : un montage coulissant ou paternoster posé sur fond meuble, appâté au ver ou au lambeau de poisson, accroche les merlans qui patrouillent au pied de la structure de nuit.`,
    },
  ],

  postes: [
    `Le merlan se cherche sur le sable, pas sur la roche. Vise les grandes plages océanes et les fonds sablo-vaseux, idéalement à proximité d'une tête de roche ou d'un cassé qui concentre la nourriture : Nord, Pas-de-Calais, baie de Somme, plages normandes et bretonnes. Repère les irrégularités du fond, baïnes, fosses, petites dunes successives, sorties de courant : c'est là que le banc patrouille. Une plage parfaitement plate et uniforme produit moins qu'un fond qui creuse, où les vers et les crustacés délogés s'accumulent.`,
    `C'est une pêche de nuit et de saison froide, assume-le. Le merlan mord essentiellement la nuit, avec un pic d'activité qui démarre souvent deux heures avant la basse mer et court sur la descendante. Le froid et une eau brassée le rapprochent du bord : une mer agitée de 0,5 à 1,5 m et un vent de mer qui trouble l'eau jouent en ta faveur, à l'inverse du bar tu n'as pas besoin d'eau claire. Équipe-toi en conséquence : cannes de 4,20 à 5 m, 100 à 200 g de puissance pour lancer loin et tenir le plomb sur le sable malgré le courant. Habille-toi pour rester immobile dans le froid pendant des heures.`,
    `Le montage fait la prise plus que l'appât. Le merlan a une bouche fragile et des dents fines : un flapper rig à trois empiles courtes, ou une empile haute de 50-70 cm doublée d'un long traînard de 80-100 cm qui ondule sur le sable, explore toute la colonne d'eau et te dit vite à quelle hauteur il chasse. Ajoute des perles rouges ou phosphorescentes en teaser devant l'hameçon, de nuit, ça déclenche. Côté appât, reste simple : un boudin d'arénicole ou un morceau de maquereau de la taille du petit doigt suffit ; il avale, inutile de soigner la présentation comme pour la dorade.`,
  ],

  faq: [
    {
      q: 'Quelle est la taille minimale du merlan en 2026 ?',
      a: `La maille du merlan est de 27 cm en Manche et Atlantique. En dessous, c'est remise à l'eau immédiate. Le merlan n'impose pas de marquage de la caudale (il n'est pas dans la liste de l'arrêté du 17 mai 2011) et il n'y a ni quota de loisir ni fermeture nationale. Source : arrêté du 26 octobre 2012 modifié, vérifié le 24/06/2026.`,
    },
    {
      q: 'Quelle est la meilleure période pour pêcher le merlan du bord ?',
      a: `L'hiver, de décembre à février, est de loin la meilleure période : le merlan se rapproche des plages par eau froide et agitée pour se nourrir. La saison s'ouvre dès novembre quand l'eau refroidit. Au printemps et en été il repart au large et devient introuvable du bord. C'est vraiment un poisson de saison froide.`,
    },
    {
      q: 'Quel montage et quel appât pour le merlan en surfcasting ?',
      a: `Un montage à empiles multiples : soit le flapper rig à trois hameçons, soit une empile haute de 50-70 cm plus un long traînard de 80-100 cm qui repose sur le sable. Ajoute des perles rouges ou phospho en teaser. Côté appât, l'arénicole et le morceau de maquereau sont les valeurs sûres ; un boudin de la taille du petit doigt suffit, le merlan n'est pas difficile.`,
    },
    {
      q: 'Faut-il pêcher le merlan de jour ou de nuit ?',
      a: `De nuit, presque toujours. Le merlan se rapproche du bord et se met à chasser activement une fois la nuit tombée, avec un pic qui commence souvent deux heures avant la basse mer. Une mer un peu agitée et froide renforce l'activité. Les sessions de jour donnent beaucoup moins, sauf par temps très couvert et mer formée.`,
    },
  ],
}
