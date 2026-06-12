import type { SpeciesContent } from './types'

/**
 * Contenu éditorial ORPHIE (Belone belone) — pages programmatiques
 * /peche/orphie/<technique>/<dépt>. Techniques autorisées par la matrice
 * (lib/seo/programmatic.ts) : flottante, leurres.
 */
export const orphieContent: SpeciesContent = {
  intro: [
    `L'orphie, c'est le poisson qui sauve les sessions d'été. Dès que l'eau dépasse les 14-15 °C, elle débarque en bancs le long des côtes et chasse en pleine surface, souvent à portée de lancer des digues et des pointes. Corps de flèche de 50 à 70 cm, robe argentée, long bec fin : tu la repères aux gerbes d'eau qu'elle déclenche en poursuivant lançons et alevins.`,
    `C'est une pêche ludique avant tout. L'orphie attaque franchement, saute, fait des chandelles, repart en glissade — mais son bec osseux et étroit la rend difficile à ferrer. Tu vas rater des touches, tout le monde en rate : c'est précisément ce qui rend cette pêche addictive, et c'est une école parfaite pour apprendre à gérer une touche sans précipitation.`,
    `Deux approches du bord : la flottante avec une lanière de maquereau, simple et redoutable pour débuter ou pour initier un gamin, et les petits leurres ramenés vite en surface pour une pêche plus active, jusqu'à la version scandinave sans hameçon.`,
  ],

  techniques: {
    flottante: {
      paragraphs: [
        `Le montage est simple : une canne légère et assez longue pour manier le flotteur, un corps de ligne en 20/100, un flotteur de 4 à 10 g réglé entre 0,5 et 1,5 m sous la surface — l'orphie chasse dans la pellicule, inutile de pêcher creux. Au bout, un hameçon fin de fer à hampe longue (n°4 à 6) armé d'une lanière de maquereau de 5 à 6 cm taillée fine côté peau, ou d'une crevette. Lance au-delà du banc, laisse dériver avec le vent et le courant, et anime par petites tirées pour faire vivre l'esche.`,
        `Tout se joue au ferrage. Le bec de l'orphie est dur et étroit : si tu ferres dès que le flotteur plonge, tu la piques au bout du nez et elle se décroche à la première chandelle. À la touche, ouvre le pick-up ou rends la main, compte 3 à 5 secondes pour la laisser engamer la lanière, puis mets en tension progressivement, sans grand coup de canne. Le combat est spectaculaire pour le gabarit : sauts, départs courts, glissades en surface. Garde une ligne tendue mais souple jusqu'à l'épuisette — c'est un poisson qui se décroche autant qu'il se pique.`,
      ],
      bullets: [
        `Canne légère de 3,60 à 4,20 m, action de pointe, nylon 20/100`,
        `Flotteur fixe ou coulissant de 4 à 10 g, réglé entre 0,5 et 1,5 m sous la surface`,
        `Hameçon fin de fer à hampe longue, n°4 à n°6`,
        `Lanière de maquereau de 5-6 cm taillée fine (côté peau) ou crevette entière`,
        `À la touche : laisse filer 3 à 5 secondes avant de mettre en tension, pas de ferrage sec`,
        `Un peu de sardine pilée jetée régulièrement pour fixer le banc devant toi`,
      ],
      seasonNote: `De mai à octobre sur la plupart des côtes, avec un pic en plein été quand l'eau est chaude et claire — c'est LA pêche des vacances, idéale pour débuter.`,
    },

    leurres: {
      paragraphs: [
        `Matériel light : canne spinning de 2,10 à 2,40 m puissance 5-20 g, tresse fine (PE 0.6 à 0.8) et un mètre de fluoro en 24/100. Côté leurres, petites cuillers ondulantes ou tournantes de 5 à 12 g en coloris argent, petits jigs allongés, ou lançon souple de 8 à 10 cm monté sur une tête plombée de 3 à 5 g. La clé, c'est la bande d'eau : ramène vite, canne haute, dans les 50 premiers centimètres. L'orphie suit, slashe, rate, revient — quand tu la vois derrière le leurre, accélère au lieu de ralentir, c'est l'accélération qui déclenche l'attaque.`,
        `Le problème du bec se règle de deux façons. Soit tu remplaces le triple par un hameçon simple fin de fer à hampe longue, qui se loge mieux dans le bec étroit. Soit tu passes à la technique scandinave du floss : pas d'hameçon du tout, juste une touffe de fibres (soie à mouche, brins de nylon floché) montée en bout de ligne ou à la place du triple. Les micro-dents de l'orphie s'emmêlent dedans, tu la déposes à l'épuisette et elle repart sans une égratignure. Sur les grosses concentrations d'été, c'est la méthode la plus efficace et la plus propre.`,
      ],
      bullets: [
        `Canne spinning 2,10-2,40 m, puissance 5-20 g, tresse PE 0.6-0.8 + fluoro 24/100`,
        `Petites cuillers ondulantes et tournantes de 5 à 12 g, coloris argent`,
        `Lançon souple de 8 à 10 cm sur tête plombée de 3 à 5 g`,
        `Récupération rapide, canne haute, leurre dans les 50 premiers centimètres`,
        `Remplace le triple par un simple fin de fer pour améliorer le ratio de ferrage`,
        `Version floss sans hameçon : les dents s'emmêlent dans les fibres, décrochage net et poisson intact`,
      ],
      seasonNote: `Dès l'arrivée des bancs au printemps et tout l'été ; les chasses de surface par matinée calme sont les meilleurs créneaux pour les leurres.`,
    },
  },

  facades: {
    'manche-atlantique': `Les bancs arrivent courant mai sur les côtes bretonnes, vendéennes et normandes, et restent jusqu'en septembre-octobre. Cherche-les depuis les digues et jetées des ports, les pointes rocheuses et les sorties d'estuaire : partout où il y a 2-3 m d'eau claire à portée de lancer. La marée montante plaque les bancs le long des ouvrages — les deux heures avant la pleine mer sont souvent les meilleures. Après plusieurs jours de mer calme, l'eau s'éclaircit et les orphies remontent franchement en surface.`,
    mediterranee: `L'orphie est plus précoce en Méditerranée : les premiers bancs touchent les digues dès mars-avril, et l'espèce reste présente jusque tard en automne. Sans grande marée, tout se joue sur la lumière et le vent : vise le petit matin, mer d'huile, avant que le thermique ne se lève et ne ride la surface. Les digues portuaires, les enrochements et les plages avec du fond proche concentrent les bancs. Un peu de sardine pilée jetée régulièrement suffit à les fixer devant toi toute la session.`,
  },

  conditions: `L'orphie aime l'eau claire et la mer calme : un vent sous 15 km/h et quelques jours sans houle comptent plus que n'importe quel autre paramètre. Sur l'Atlantique et la Manche, pêche la montante et le tout début de la descendante — les bancs longent les digues quand le courant porte. Le matin tôt et la fin de journée restent les meilleurs créneaux, mais en plein été elle mord toute la journée tant que la surface reste lisse. Repère les gerbes d'eau et les oiseaux qui piquent : un banc en chasse se voit à 100 m, et là, chaque lancer compte.`,
}
