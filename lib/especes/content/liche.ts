import type { EspeceContent } from '../types'

/**
 * Fiche espèce — Liche / liche amie (Lichia amia).
 * Angle : le gros carangidé pélagique qui chasse en surface près des digues et
 * des plages méditerranéennes — l'explosion sur popper à dix mètres du bord.
 * Façade : Méditerranée. Absente du bord en Manche-Atlantique → tableau rempli
 * mais honnête (activite 1, eau trop froide / espèce thermophile).
 * Réglementation vérifiée le 24/06/2026 : aucune maille nationale (absente de
 * l'arrêté du 26/10/2012) ; ne JAMAIS inventer de chiffre national.
 */
export const licheEspece: EspeceContent = {
  slug: 'liche',

  intro: [
    `La liche amie, c'est le poids lourd des carangidés méditerranéens : un poisson large, puissant, taillé pour la course, qui chasse en surface à portée de lancer. Une explosion sur ton popper à dix mètres du bord suivie d'un départ qui fait hurler le frein — du bord, peu d'espèces offrent une sensation aussi brutale. Les beaux sujets dépassent le mètre et pèsent plus de dix kilos.`,
    `Tu la trouves là où le fourrage s'accumule : abords des digues, plages avec un peu de fond, embouchures et sorties de canaux où défilent les mulets — sa proie de prédilection. Le delta du Rhône, vers Port-Saint-Louis, est réputé le meilleur secteur de France pour elle. C'est un poisson chaud : les premières liches arrivent près du bord en avril-mai, le pic se situe de l'été à l'automne, et elles décrochent vers le large quand l'eau refroidit. En Manche et en Atlantique, elle est absente du bord — inutile de l'y chercher.`,
    `La pêche reine, c'est la surface : popper et stickbait travaillés à grands coups de scion pour créer du remous et du bruit, puis pause — c'est souvent sur l'arrêt ou à la relance qu'elle frappe. Le vif (mulet en tête) en dérive est l'autre option, redoutable sur les sujets méfiants. Canne longue de 2,70 à 3 m pour lancer loin et tenir le poisson. Une chose à savoir avant de garder : il n'y a pas de maille nationale, mais le Golfe du Lion impose une règle locale — détaillée plus bas.`,
  ],

  identity: {
    famille: 'Carangidés (Lichia amia), la liche amie — « leerfish »',
    tailleCourante: '50-80 cm du bord, le mètre+ pour les beaux sujets',
    tailleMax: 'Jusqu’à environ 2 m pour près de 50 kg (très gros sujets rares du bord)',
    habitat: 'Abords de digues, plages, embouchures et sorties de canaux — chasse en surface',
    regime: 'Chasseur pélagique de surface : mulets, sardines, athérines, bancs de fourrage',
  },

  regulation: {
    verifiedAt: '24/06/2026',
    source:
      'Arrêté du 26 octobre 2012 modifié — la liche (Lichia amia) n’y figure pas',
    minSizeCm: { 'manche-atlantique': null, mediterranee: null },
    marquage: false,
    items: [
      `<strong>Pas de taille minimale réglementaire en France</strong> : la liche (Lichia amia) ne figure pas dans l'arrêté du 26 octobre 2012 fixant les tailles minimales de capture. Aucun chiffre national ne s'applique — n'invente pas de « maille » et méfie-toi de celles qu'on te récite au bord.`,
      `<strong>Pas de marquage obligatoire</strong> et <strong>pas de quota national</strong> pour la pêche de loisir.`,
      `Recommandation non réglementaire : la liche atteint sa <strong>maturité vers 50-60 cm</strong> ; <strong>no-kill conseillé en dessous d'environ 50 cm</strong> pour laisser les juvéniles se reproduire. C'est un superbe poisson de combat plus qu'un poisson de table — beaucoup de pêcheurs la relâchent systématiquement.`,
      `<strong>Règle LOCALE — Parc naturel marin du Golfe du Lion</strong> (Pyrénées-Orientales 66 et Aude 11) : depuis l'arrêté préfectoral du 12 février 2024, la pêche de loisir y impose une <strong>autorisation obligatoire</strong> (application CatchMachine), une <strong>taille minimale locale d'environ 50 cm</strong> et un <strong>quota local</strong> pour la liche. Ce sont des règles LOCALES propres à ce parc, pas une maille nationale : hors de ce périmètre, elles ne s'appliquent pas.`,
    ],
  },

  saisons: {
    'manche-atlantique': [
      {
        saison: 'Printemps',
        activite: 1,
        note: `Espèce méditerranéenne thermophile : la liche est absente du bord en Manche-Atlantique, l'eau y est trop froide. Hors cible sur cette façade au printemps.`,
      },
      {
        saison: 'Été',
        activite: 1,
        note: `Tout au plus quelques individus erratiques sur l'extrême sud de la façade atlantique lors des pointes de chaleur — anecdotique, aucune population du bord à viser.`,
      },
      {
        saison: 'Automne',
        activite: 1,
        note: `Toujours marginale : pas de chasse côtière exploitable du bord en Atlantique ou en Manche. Pour la liche, c'est la Méditerranée.`,
      },
      {
        saison: 'Hiver',
        activite: 1,
        note: `Absente : l'eau froide exclut ce carangidé de chaleur. Aucune pêche du bord à espérer ici en hiver.`,
      },
    ],
    mediterranee: [
      {
        saison: 'Printemps',
        activite: 2,
        note: `Les premières liches reviennent vers le bord en avril-mai quand l'eau se réchauffe : chasses encore irrégulières aux embouchures et le long des plages, à guetter de près.`,
      },
      {
        saison: 'Été',
        activite: 3,
        note: `Pleine saison : de juin à septembre, les liches chassent en surface près du bord, sur les bancs de mulets. C'est LE moment du popper, à l'aube et au coup du soir surtout.`,
      },
      {
        saison: 'Automne',
        activite: 3,
        note: `Le pic se prolonge jusqu'en novembre : les gros sujets se gavent avant l'hiver, explosions franches en surface, notamment aux sorties de canaux et au delta du Rhône.`,
      },
      {
        saison: 'Hiver',
        activite: 1,
        note: `Les liches décrochent vers le large dès que l'eau refroidit : quasi pas de chasse du bord en hiver. Repère tes postes et range les poppers jusqu'au printemps.`,
      },
    ],
  },

  techniques: [
    {
      slug: 'leurres',
      why: `La pêche reine : le leurre de surface. Popper de 12-18 cm travaillé à grands coups de scion pour générer remous et bruit, ou stickbait en walking-the-dog sur les chasses. La liche frappe souvent sur la pause ou à la relance. Canne longue (2,70-3 m) pour lancer loin et garder le contrôle d'un poisson qui rushe.`,
    },
    {
      slug: 'vif',
      why: `Le vif — mulet ou petit poisson de fourrage en tête — dérivé sous flotteur le long d'une digue ou à une embouchure prend les liches méfiantes qui suivent sans taper le leurre. Valeur sûre quand la chasse est visible mais que la surface ne donne rien.`,
    },
  ],

  postes: [
    `La liche se pêche là où elle chasse, et elle chasse là où il y a du fourrage. Cible en priorité les abords des digues, les plages avec un peu de fond et de la pente, et surtout les embouchures et sorties de canaux où s'accumulent les mulets. Le delta du Rhône, autour de Port-Saint-Louis, concentre les meilleurs secteurs de France. Le repère absolu, c'est le banc de fourrage : un nuage de mulets affolés en surface, des éclaboussures, des oiseaux qui plongent — pose ton leurre en lisière et accroche-toi.`,
    `Le moment du jour est décisif : l'aube et le coup du soir écrasent le plein soleil de midi, quand les liches viennent chasser en surface en bordure. Côté mer, vise une mer calme à peu agitée et une eau claire — c'est un chasseur à vue, pas un poisson de gros temps. Une légère brise qui ride la surface aide même à camoufler ton popper. À l'inverse, mer plate de plomb et eau cristalline en pleine journée rendent les liches très méfiantes : passe en vif ou attends la baisse de lumière.`,
    `Le marnage étant négligeable en Méditerranée, raisonne activité plutôt que marée. Quand une chasse explose, ne lance pas au cœur du banc affolé : pose ton popper en lisière, là où les liches cueillent les retardataires, anime fort puis marque une pause franche. Tiens-toi prêt à l'arrêt et à la relance — c'est là qu'arrive l'explosion. Et garde du fil : un beau sujet part droit et long, ton frein doit être réglé avant la touche, pas pendant.`,
  ],

  faq: [
    {
      q: 'Quelle est la taille minimale de la liche en France ?',
      a: `Il n'y a pas de taille minimale réglementaire nationale : la liche (Lichia amia) ne figure pas dans l'arrêté du 26 octobre 2012 sur les tailles minimales de capture. Pas de quota ni de marquage au niveau national non plus. En revanche, dans le Parc naturel marin du Golfe du Lion (départements 66 et 11), une autorisation (application CatchMachine), une taille minimale locale d'environ 50 cm et un quota local s'appliquent depuis l'arrêté préfectoral du 12 février 2024. Par bon sens, no-kill conseillé sous ~50 cm partout ailleurs.`,
    },
    {
      q: 'Comment pêcher la liche du bord en Méditerranée ?',
      a: `À la surface, c'est la pêche qui procure le plus de sensations : popper de 12-18 cm travaillé à grands coups de scion pour faire du bruit et des remous, ou stickbait sur les chasses, avec des pauses franches où la liche frappe souvent. Utilise une canne longue de 2,70 à 3 m pour lancer loin. Le vif (mulet en dérive) est l'alternative quand la surface ne donne rien.`,
    },
    {
      q: 'Quelle est la meilleure période pour la liche ?',
      a: `De l'été à l'automne, grosso modo de juin à novembre, avec un pic entre juillet et septembre. Les premières liches reviennent au bord en avril-mai, puis décrochent vers le large quand l'eau refroidit en hiver. À la journée, vise l'aube et le coup du soir, quand elles chassent en surface en bordure.`,
    },
    {
      q: 'Où pêcher la liche du bord en France ?',
      a: `En Méditerranée uniquement pour la pêche du bord : abords de digues, plages avec du fond, embouchures et sorties de canaux à mulets, le delta du Rhône autour de Port-Saint-Louis étant le secteur phare. La liche est absente du bord en Manche et en Atlantique — l'eau y est trop froide pour ce carangidé de chaleur.`,
    },
  ],
}
