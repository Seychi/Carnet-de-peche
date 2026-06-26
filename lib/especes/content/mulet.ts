import type { EspeceContent } from '../types'

/**
 * Fiche espèce MULET (Chelon labrosus) — /especes/mulet.
 * Le méfiant des ports et des estuaires : pêche fine au pain ou à
 * l'asticot sous flotteur. Plusieurs muges (Mugil spp.) sont regroupés
 * sous le terme « mulet ». Réglementation vérifiée le 23/06/2026
 * (chiffres injectés, ne pas modifier sans re-vérification aux sources).
 */
export const muletEspece: EspeceContent = {
  slug: 'mulet',

  intro: [
    `Le mulet, c'est le poisson que tu vois tous les jours et que tu n'arrives jamais à prendre. Des bancs entiers qui patrouillent sous tes pieds dans le port, des lèvres charnues qui gobent en surface… et au moindre faux pas, tout se volatilise. Loin d'être le poisson « facile » qu'on raconte, c'est l'un des plus méfiants du bord, et c'est exactement ce qui en fait une pêche d'orfèvre.`,
    `Sous le nom de mulet se cachent en réalité plusieurs espèces de muges (Mugil spp.), dont le mulet lippu (Chelon labrosus) est le plus courant du bord. Il colonise les eaux saumâtres et tranquilles : bassins de port, estuaires, embouchures, darses, là où l'eau douce rencontre la mer et où les algues tapissent les quais. Omnivore, il broute le film verdâtre des cales, aspire la vase chargée de micro-organismes, et raffole de tout ce qui flotte : d'où la pêche au pain, technique reine pour le faire sortir de sa réserve.`,
    `Ne te laisse pas avoir par sa réputation de poisson de seconde zone : un mulet de 50 cm pris au flotteur en fil fin, c'est un combat magnifique, des rushs puissants et une défense rageuse qui mettent ta tresse à l'épreuve. Une fois qu'on y a goûté, on devient accro à cette pêche d'approche, discrète et technique, qui se pratique en short au bord d'un quai par une belle journée.`,
  ],

  identity: {
    famille: 'Mugilidés (Chelon labrosus, mulet lippu), plusieurs muges regroupés sous Mugil spp.',
    tailleCourante: '30-50 cm du bord, 60 cm pour les beaux sujets',
    tailleMax: 'environ 75 cm pour 3-4 kg sur les plus gros lippus',
    habitat: 'Fonds meubles des ports et estuaires : bassins, darses, embouchures, eaux saumâtres calmes près des quais',
    regime: 'Omnivore : film algal des quais, micro-organismes de la vase, débris végétaux et tout appât flottant (pain, fromage)',
  },

  regulation: {
    verifiedAt: '23/06/2026',
    source: 'Arrêté du 26 octobre 2012 modifié (annexe I, « Mulets / Mugil spp. »)',
    minSizeCm: { 'manche-atlantique': 30, mediterranee: null },
    marquage: false,
    items: [
      `<strong>Maille : 30 cm</strong> en Manche et Atlantique (Mugil spp.). Tout mulet sous cette taille doit être remis à l'eau immédiatement.`,
      `<strong>Méditerranée : pas de taille minimale réglementaire de capture en pêche de loisir</strong> pour le mulet. Reste raisonnable et ne conserve que de beaux sujets.`,
      `<strong>Aucune fermeture ni quota loisir national</strong> ; des arrêtés préfectoraux locaux peuvent ajouter des restrictions. Vérifie l'affichage de ton port et la réglementation de ton département.`,
      `<strong>Pêche dans les ports</strong> : certains bassins interdisent ou encadrent la pêche pour des raisons de sécurité ou de salubrité. Respecte la signalétique et ne prélève pas de poisson en eau douteuse.`,
    ],
  },

  saisons: {
    'manche-atlantique': [
      {
        saison: 'Printemps',
        activite: 2,
        note: `Les bancs réinvestissent les ports et estuaires dès que l'eau se réchauffe (avril-mai). Poissons encore prudents mais le brouméage au pain les remet vite en appétit.`,
      },
      {
        saison: 'Été',
        activite: 3,
        note: `Pleine saison : mulets actifs en surface dans les ports, gobages visibles, eau chaude et bancs nombreux. Le meilleur moment pour la pêche au pain.`,
      },
      {
        saison: 'Automne',
        activite: 2,
        note: `Encore de belles sessions en septembre-octobre, les poissons font des réserves avant le froid. L'activité se calme à mesure que l'eau refroidit.`,
      },
      {
        saison: 'Hiver',
        activite: 1,
        note: `Les bancs se concentrent en eau plus profonde et plus calme, l'appétit chute. Quelques poissons restent dans les bassins abrités, pêche lente et patiente.`,
      },
    ],
    mediterranee: [
      {
        saison: 'Printemps',
        activite: 2,
        note: `Reprise précoce dans les ports et les étangs littoraux dès mars-avril. Les premiers gobages reviennent avec les eaux qui se réchauffent.`,
      },
      {
        saison: 'Été',
        activite: 3,
        note: `Présence massive dans les bassins et marinas, mulets en surface toute la journée. Vise les heures calmes : tôt le matin et en soirée, eau claire.`,
      },
      {
        saison: 'Automne',
        activite: 2,
        note: `Belle activité maintenue plus tard qu'en Atlantique grâce à la douceur. Les fenêtres de calme entre deux coups de mistral sont les plus productives.`,
      },
      {
        saison: 'Hiver',
        activite: 1,
        note: `Les bancs gagnent les zones profondes et abritées des ports et lagunes. Pêche possible mais ralentie, sur des poissons peu mordeurs.`,
      },
    ],
  },

  techniques: [
    {
      slug: 'flottante',
      why: `La technique reine : flotteur fin réglé peu profond, hameçon n°10-14 garni d'une boulette de mie de pain ou d'asticots, le tout amorcé au pain trempé qui dérive en surface. Fil fin (12-16/100), nylon discret, et de la patience : le mulet inspecte longtemps avant de gober. À la touche, ferre en douceur : sa bouche est tendre et se déchire vite.`,
    },
    {
      slug: 'surfcasting',
      why: `Plus marginale mais efficace en estuaire et embouchure : montage léger posé sur fond meuble, esche au pain durci, au ver ou au filet de sardine pour les gros lippus qui fouillent la vase. À privilégier quand les mulets ne montent pas en surface et restent collés au fond, notamment par eau froide ou trouble.`,
    },
  ],

  postes: [
    `Le mulet est un poisson de calme et de structure : cherche-le dans les bassins de port abrités du vent, le long des quais tapissés d'algues, sous les pontons, dans les darses et aux embouchures où l'eau douce et la mer se mélangent. Il broute le film verdâtre des cales et des coques de bateau, alors ces zones « sales » sont souvent les plus poissonneuses. Repère les gobages en surface avant de t'installer : si tu vois les bancs tourner et goûter le pain qui flotte, tu es au bon poste.`,
    `Côté conditions, vise le calme plat. Un vent fort qui ride et brasse l'eau du port disperse les bancs et rend les mulets nerveux ; une eau lisse et claire, au contraire, les fait monter et gober en confiance. En estuaire, le moment de marée compte : la fin de la montante et l'étale de pleine mer ramènent l'eau saumâtre et les poissons vers le bord, tandis que la descendante les entraîne vers le large. Dans les ports fermés, l'effet de marée est moindre. C'est la lumière et le calme qui dominent.`,
    `La clé reste l'amorçage et la discrétion. Lance régulièrement de petites boulettes de pain trempé pour fixer le banc et créer une traînée flottante, puis présente ton hameçon dans cette dérive. Reste en retrait, baisse-toi, évite les vibrations sur le quai : un mulet voit ton ombre et sent tes pas dans le béton. Aux premières heures du jour et en soirée, quand le port est désert et l'eau immobile, tu auras tes meilleures chances sur ces poissons réputés imprenables.`,
  ],

  faq: [
    {
      q: 'Quelle est la taille minimale de capture du mulet ?',
      a: `La maille est de 30 cm en Manche et Atlantique pour les mulets (Mugil spp.), selon l'arrêté du 26 octobre 2012 modifié. En Méditerranée, le mulet n'a pas de taille minimale réglementaire de capture en pêche de loisir. Il n'existe ni quota ni fermeture au niveau national, mais des arrêtés préfectoraux locaux peuvent ajouter des restrictions : vérifie la réglementation de ton port et de ton département.`,
    },
    {
      q: 'Comment pêcher le mulet au pain ?',
      a: `Monte un flotteur fin réglé peu profond et un hameçon n°10-14 garni d'une boulette de mie de pain bien tassée. Amorce d'abord en lançant régulièrement de petits morceaux de pain trempé qui dérivent en surface pour fixer le banc, puis présente ton esche dans cette traînée. Pêche en fil fin (12-16/100), reste discret, et ferre en douceur car la bouche du mulet est fragile et se déchire facilement.`,
    },
    {
      q: 'Où trouver le mulet du bord ?',
      a: `Dans les eaux calmes et saumâtres : bassins de port, darses, le long des quais couverts d'algues, sous les pontons, et aux embouchures d'estuaires où l'eau douce rejoint la mer. Le mulet broute le film verdâtre des cales et des coques, donc les zones « sales » et abritées du port sont souvent les meilleures. Repère les gobages en surface pour localiser les bancs avant de pêcher.`,
    },
    {
      q: 'Quelle est la meilleure saison pour le mulet ?',
      a: `L'été est la pleine saison sur les deux façades : eau chaude, bancs nombreux et mulets actifs en surface, idéal pour la pêche au pain. Le printemps et l'automne offrent encore de belles sessions, un peu plus prudentes. En hiver, les poissons gagnent les zones profondes et abritées et mordent peu. En Méditerranée, la douceur prolonge la saison plus tard qu'en Atlantique.`,
    },
  ],
}
