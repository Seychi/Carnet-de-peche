import type { SpeciesContent } from './types'

/**
 * Contenu éditorial LICHE AMIE (Lichia amia) — pages programmatiques
 * /peche/liche/<technique>/<dépt>. Techniques autorisées par la matrice
 * (lib/seo/programmatic.ts) : leurres (surface), vif.
 * Inventaire mesuré le 2026-08-17 : 15 spots approuvés seulement, dont 2
 * départements au seuil de 3 spots (2A et 83). C'est le plus petit lot du bloc,
 * assumé : la liche est une cible rare et très recherchée, la page vaut par
 * l'intention de recherche, pas par le volume. Le texte
 * `facades['manche-atlantique']` n'est jamais servi (aucun département atlantique
 * ouvert) ; il est renseigné parce que le type l'exige.
 * Cohérent avec la fiche profonde lib/especes/content/liche.ts.
 */
export const licheContent: SpeciesContent = {
  intro: [
    `La liche amie, c'est le grand prédateur accessible du bord en Méditerranée. Un corps comprimé, argenté, une ligne latérale qui ondule en vagues, une queue de sprinteur, et des sujets qui dépassent régulièrement le mètre. Quand elle explose sous un popper à dix mètres de tes pieds, tu comprends pourquoi certains pêcheurs y consacrent leurs étés entiers.`,
    `Elle chasse là où il y a du fourrage, et son fourrage, ce sont les mulets. Cible donc les abords des digues, les plages qui ont un peu de fond et de la pente, et surtout les embouchures et les sorties de canaux où les bancs s'accumulent. Le delta du Rhône, autour de Port-Saint-Louis, concentre les meilleurs secteurs de France, et la Corse tient de très beaux poissons le long de ses pointes.`,
    `Deux façons de la prendre, et elles se complètent. Le leurre de surface, quand la chasse est visible et que le poisson est décidé, pour l'attaque la plus spectaculaire de la pêche du bord française. Et le vif dérivé sous flotteur, quand la liche suit sans taper, tourne autour du popper et refuse de conclure. Le point commun des deux : il faut du fil, un frein réglé avant la touche, et des nerfs.`,
  ],

  techniques: {
    leurres: {
      paragraphs: [
        `La pêche reine, c'est la surface. Une canne longue de 2,70 à 3 m pour lancer loin et garder le contrôle d'un poisson qui rushe, un moulinet 5000 à 6000 bien rempli, de la tresse en PE 2 à 3 et un bas de ligne en fluorocarbone 50 à 70/100. Côté leurres, deux familles : le popper de 12 à 18 cm, travaillé à grands coups de scion pour générer remous et bruit, et le stickbait animé en walking the dog, plus discret, qui passe mieux sur les poissons méfiants ou par mer d'huile. Change d'un à l'autre plutôt que d'insister avec le même quand ça suit sans taper.`,
        `Le geste qui fait la différence, c'est la gestion de la chasse. Ne lance jamais au cœur du banc affolé : pose ton leurre en lisière, là où les liches cueillent les retardataires. Anime fort, puis marque une pause franche, parce que l'attaque arrive souvent sur l'arrêt ou sur la relance juste après. Et surtout, ne ferre pas au bruit : attends de sentir le poids dans la canne, sinon tu arraches le leurre de la gueule. Une fois piquée, elle part droit et long : le frein doit être réglé avant la touche, jamais pendant, et tu accompagnes sans jamais bloquer.`,
      ],
      bullets: [
        `Canne 2,70-3 m, moulinet 5000-6000, tresse PE 2-3, fluorocarbone 50-70/100`,
        `Poppers 12-18 cm et stickbaits : alterne si ça suit sans taper`,
        `Lance en LISIÈRE de la chasse, jamais au cœur du banc affolé`,
        `Anime fort, puis pause franche : l'attaque vient souvent sur l'arrêt ou la relance`,
        `Ferre au POIDS, pas au bruit de l'explosion en surface`,
        `Frein réglé avant la touche, et de la réserve de fil : le premier rush est long`,
      ],
      seasonNote: `De la fin du printemps à l'automne, avec un cœur d'été net, et à l'aube ou au coup du soir bien plus qu'en plein midi.`,
    },

    vif: {
      paragraphs: [
        `Le vif prend les liches que la surface ne convertit pas : celles qui suivent, refusent, ou chassent trop profond pour monter. Le mulet est le vif roi puisqu'il est déjà leur proie principale, mais tout petit poisson de fourrage local fait l'affaire. Monte-le sous un flotteur coulissant costaud, réglé pour le laisser évoluer entre un et trois mètres, sur un hameçon simple fort de fer piqué sous la dorsale ou aux narines. Bas de ligne en fluorocarbone 60/100 minimum, et une agrafe solide : une liche de belle taille casse tout le reste.`,
        `Le poste compte autant que le montage. Laisse dériver le long d'une digue, dans le courant d'une embouchure ou à la sortie d'un canal, là où les mulets transitent. Le flotteur doit voyager naturellement, sans être tiré par la bannière : donne du fil régulièrement. Quand la liche prend, laisse-la partir quelques secondes pour qu'elle tourne le vif avant de mettre en tension, puis ferre franchement. C'est la valeur sûre des journées où la chasse est visible mais où plus rien ne monte sur le leurre.`,
      ],
      bullets: [
        `Vif roi : le mulet, sinon tout petit poisson de fourrage du poste`,
        `Flotteur coulissant costaud, vif réglé entre 1 et 3 m sous la surface`,
        `Hameçon simple fort de fer, piqué sous la dorsale ou aux narines`,
        `Bas de ligne fluorocarbone 60/100 minimum, agrafe et émerillon solides`,
        `Postes : long des digues, courant d'embouchure, sortie de canal`,
        `Donne du fil pour une dérive naturelle, laisse partir quelques secondes, puis ferre franchement`,
      ],
      seasonNote: `Même fenêtre que les leurres, de la fin du printemps à l'automne, et particulièrement payant quand les chasses sont visibles mais que la surface ne donne rien.`,
    },
  },

  facades: {
    'manche-atlantique': `La liche amie n'est pas une cible de la Manche ni de l'Atlantique : sa présence y est trop rare et trop irrégulière pour organiser une session du bord, et notre catalogue n'y compte aucun spot qui la porte. Nous ne publions donc de pages liche qu'en Méditerranée. Sur la façade atlantique, le prédateur de surface à chercher aux leurres reste le bar, et le tassergal sur la pointe sud.`,
    mediterranee: `La Méditerranée est son terrain, avec deux pôles nets : le delta du Rhône et ses sorties de canaux, où les bancs de mulets attirent les plus grosses, et les pointes et digues corses, plus sauvages, où la liche chasse au ras des cailloux. Le marnage étant négligeable, raisonne activité et lumière plutôt que marée : l'aube et le coup du soir écrasent le plein soleil. Cherche le repère absolu, le banc de fourrage en panique, un nuage de mulets qui gicle en surface et des oiseaux qui piquent. C'est là que tout se passe, et ça peut durer trois minutes.`,
  },

  conditions: `La liche chasse à vue : elle veut une mer calme à peu agitée et une eau claire, pas du gros temps. Une légère brise qui ride la surface est même un plus, parce qu'elle camoufle ton popper et ta tresse. À l'inverse, mer plate de plomb et eau cristalline en pleine journée rendent les poissons très méfiants : passe alors au vif, affine ton fluorocarbone, ou attends la baisse de lumière. Le moment du jour est décisif, l'aube et le coup du soir valent dix fois midi. Reste mobile et garde les yeux sur l'eau : ici, tu ne pêches pas un poste, tu pêches une chasse, et elle ne prévient pas.`,
}
