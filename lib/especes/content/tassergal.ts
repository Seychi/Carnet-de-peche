import type { EspeceContent } from '../types'

/**
 * Fiche espèce — Tassergal (Pomatomus saltatrix), aussi « bluefish ».
 * Le chasseur de surface véloce et coupant : cœur de zone en Méditerranée,
 * remonte l'Atlantique (golfe de Gascogne) l'été-automne. Du bord = leurre de
 * surface / casting jig / vif, bas de ligne acier obligatoire (dents tranchantes).
 * Réglementation vérifiée le 24/06/2026 : AUCUNE maille, AUCUN quota, AUCUN
 * marquage en France — ne PAS confondre avec le quota du bar (chiffres injectés,
 * ne pas modifier sans re-vérification aux sources).
 */
export const tassergalEspece: EspeceContent = {
  slug: 'tassergal',

  // Sprint 77 Bloc 9 : 548 impressions/sem., 8 clics (CTR 1,5 %). Le tassergal n'a
  // aucune maille (regulation.minSizeCm est null sur les deux façades) : la formule
  // générique retombe donc sur « pêche du bord » sans nommer l'espèce, alors que le
  // synonyme anglophone (« bluefish ») porte une partie réelle du volume de requêtes
  // d'identification. On le nomme dans le title pour capter ce clic. 50 caractères,
  // mesuré.
  seoTitle: 'Tassergal (bluefish) : où le pêcher du bord, spots',

  intro: [
    `Le tassergal (le « bluefish » des Américains), c'est la brute du bord : un prédateur en banc, véloce, qui débarque dans une chasse comme un coup de couteau et repart aussi vite. Quand un banc rentre sur ta plage ou ta digue, l'eau bout, les mulets et les sardines giclent en surface, et tout ce qui passe se fait trancher. Aucun autre poisson de nos côtes ne t'offre une attaque aussi brutale sur un leurre de surface.`,
    `Son territoire, c'est d'abord la Méditerranée, où il chasse de mai à octobre le long des digues, des embouchures et des plages profondes. Mais l'été et l'automne, les bancs remontent l'Atlantique : on le prend du bord dans le golfe de Gascogne, des Landes à la Vendée, quand l'eau dépasse les 18-20 °C et que les bancs de fourrage se concentrent près de la côte. C'est une pêche de fenêtre : il faut être là quand le banc est là.`,
    `Attention, ce poisson a une particularité qui change tout ton montage : une mâchoire armée de dents tranchantes comme des lames de rasoir. Sans bas de ligne acier ou fluoro très épais, il sectionne ta ligne net et part avec ton leurre. Manipule-le avec une pince et de la prudence, il mord même hors de l'eau. Beaucoup de pêcheurs le relâchent : sa chair se conserve mal et il reste fragile localement. Lis le bloc réglementation : contrairement au bar, il n'a pas de maille en France, ce qui n'autorise pas à massacrer un banc entier.`,
  ],

  identity: {
    famille: 'Pomatomidés : Pomatomus saltatrix (« bluefish », « anchova »)',
    tailleCourante: '40-70 cm du bord, 80 cm+ pour les beaux sujets',
    tailleMax: 'Plus de 1 m pour 10 kg et plus, rare mais possible du bord',
    habitat: 'Plages profondes, digues, embouchures et ports, chasseur de surface et de pleine eau',
    regime: 'Prédateur grégaire : sardines, mulets, anchois, lançons (coupe ses proies en deux)',
  },

  regulation: {
    verifiedAt: '24/06/2026',
    source:
      'Arrêté du 26 octobre 2012 modifié : le tassergal (Pomatomus saltatrix) n’y figure pas ; arrêté du 17 mai 2011 modifié (marquage) : non listé',
    minSizeCm: { 'manche-atlantique': null, mediterranee: null },
    marquage: false,
    items: [
      `<strong>Pas de taille minimale réglementaire de capture en France</strong>, ni en Méditerranée ni en Manche-Atlantique : le tassergal ne figure pas à l'arrêté du 26 octobre 2012 qui fixe les mailles. Aucune taille légale ne s'impose donc, mais relâche les petits sujets et prélève avec mesure.`,
      `<strong>Ne le confonds pas avec le bar.</strong> Le quota strict (2 à 3 poissons/jour selon le parallèle), la fermeture de février-mars et le marquage concernent le <strong>bar européen (Dicentrarchus labrax)</strong>, PAS le tassergal. Le tassergal n'a ni quota national, ni fermeture, ni marquage obligatoire.`,
      `<strong>Aucun marquage obligatoire</strong> et aucune période de fermeture nationale pour le tassergal en pêche de loisir.`,
      `<strong>No-kill recommandé.</strong> Vu ses dents tranchantes, manipule-le avec une pince à mâchoire et un bas de ligne acier pour décrocher sans te blesser ; si tu le relâches, fais-le vite et sans le sortir longtemps de l'eau. Vérifie toujours la réglementation locale : réserves marines et parcs (Calanques, Cerbère-Banyuls, Scandola…) peuvent imposer des règles supplémentaires.`,
    ],
  },

  saisons: {
    'manche-atlantique': [
      {
        saison: 'Printemps',
        activite: 1,
        note: `Eau encore trop froide sur la façade : les bancs ne sont pas remontés. Le tassergal est une cible quasi nulle au printemps en Atlantique, attends la chauffe estivale.`,
      },
      {
        saison: 'Été',
        activite: 2,
        note: `Dès que l'eau passe les 18-20 °C, les premiers bancs remontent le golfe de Gascogne (Landes, Gironde, Vendée) en suivant le fourrage : chasses en surface possibles sur les plages profondes et les embouchures.`,
      },
      {
        saison: 'Automne',
        activite: 2,
        note: `Le meilleur créneau atlantique : septembre-octobre, les bancs concentrés près du bord chassent activement avant de redescendre. Reste opportuniste : c'est une pêche de fenêtre, là quand le banc est là.`,
      },
      {
        saison: 'Hiver',
        activite: 1,
        note: `Les bancs ont regagné le sud et le large : le tassergal est absent du bord sur la façade Manche-Atlantique en hiver.`,
      },
    ],
    mediterranee: [
      {
        saison: 'Printemps',
        activite: 2,
        note: `Reprise franche en mai dès que l'eau se réchauffe : les bancs reviennent chasser le long des digues et des embouchures, leurres de surface à l'aube et au coup du soir.`,
      },
      {
        saison: 'Été',
        activite: 3,
        note: `Pleine saison : tassergals partout sur les plages profondes, les ports et les graus, chasses spectaculaires en surface au lever et au coucher du jour. Garde un œil sur les oiseaux et les giclées de fourrage.`,
      },
      {
        saison: 'Automne',
        activite: 3,
        note: `Le pic absolu : septembre à novembre, les bancs se gavent avant l'hiver, les plus gros sujets passent à portée de lancer du bord. Eau encore chaude, chasses fréquentes : LA période à viser.`,
      },
      {
        saison: 'Hiver',
        activite: 1,
        note: `Les bancs décrochent vers le large et le sud avec le refroidissement : quelques poissons isolés possibles dans les ports tempérés, mais c'est une cible secondaire en hiver.`,
      },
    ],
  },

  techniques: [
    {
      slug: 'leurres',
      why: `La technique reine et la plus grisante : stickbait ou popper de 9-14 cm animé vite et nerveusement en surface, sur une chasse ou en aveugle au-dessus des bancs de fourrage. Le casting jig de 20-40 g lancé loin et ramené en dents de scie va chercher les poissons sous la surface et porte au-delà de la barre. Bas de ligne acier ou gros fluoro impératif, sinon il coupe net.`,
    },
    {
      slug: 'vif',
      why: `Redoutable sur les gros sujets méfiants : un vif (sardine, mulet, chinchard) dérivé en surface ou à mi-hauteur près d'une embouchure ou d'une digue. Monte un empile acier court devant l'hameçon pour résister à sa mâchoire. Idéal quand les chasses se font rares mais que les bancs rôdent.`,
    },
    {
      slug: 'surfcasting',
      why: `Sur les plages profondes, une canne surfcasting puissante (H à XH, 2,50 m+) permet d'envoyer loin un vif ou un gros leurre lourd au-delà de la barre, là où les bancs patrouillent. Les sujets dépassent souvent 80 cm du bord : prévois du matériel costaud et un bas de ligne renforcé acier.`,
    },
  ],

  postes: [
    `Le tassergal est un poisson de fenêtre : tu ne le poses pas comme un sar, tu le croises quand le banc est là. Les postes qui paient sont ceux où le fourrage se concentre et se fait piéger : embouchures de fleuves et graus, pieds de digues et de jetées exposées, plages profondes avec une barre proche, sorties de port. Garde toujours un œil sur la surface : une giclée de sardines, des oiseaux qui plongent, une nappe d'eau qui frémit signalent un banc qui chasse. Quand ça explose, sois prêt à lancer en trois secondes.`,
    `Côté conditions, le tassergal aime l'eau qui bouge et qui s'oxygène. Un vent de mer modéré de 15 à 25 km/h, une mer légèrement formée, une eau teintée par le ressac mettent les bancs en confiance et déclenchent les chasses. Évite la mer d'huile sous grand soleil de midi : comme presque tout ce qui chasse en surface, il donne le meilleur à l'aube et au crépuscule, et tard dans la nuit chaude d'été. En Méditerranée, le marnage est négligeable : c'est la lumière, le vent et la présence du fourrage qui commandent, pas la marée. Sur l'Atlantique, ajoute la marée à l'équation : les bancs suivent le fourrage qui se déplace avec le courant, souvent sur le montant et autour de la pleine mer.`,
    `La température de l'eau est ton meilleur indicateur, surtout en Atlantique : sous 18 °C, inutile d'insister, les bancs ne sont pas là. Au-dessus de 20 °C, l'été et l'automne, c'est la bonne fenêtre. Logue chaque chasse croisée, l'heure et les conditions dans ton carnet : le tassergal est tellement lié au passage des bancs que tes propres observations valent de l'or pour anticiper le prochain coup au même poste.`,
  ],

  faq: [
    {
      q: 'Y a-t-il une taille minimale pour garder un tassergal en France ?',
      a: `Non : il n'existe pas de taille minimale réglementaire pour le tassergal en France, ni en Méditerranée ni en Atlantique : l'espèce ne figure pas à l'arrêté du 26 octobre 2012. Attention à ne pas le confondre avec le bar (Dicentrarchus labrax), qui lui a une maille de 42 cm en Atlantique et 30 cm en Méditerranée, un quota et un marquage. Le tassergal n'a aucune de ces contraintes nationales, mais relâche les petits sujets et prélève avec mesure.`,
    },
    {
      q: 'Pourquoi faut-il un bas de ligne acier pour le tassergal ?',
      a: `Parce que sa mâchoire est armée de dents tranchantes comme des lames qui s'intercalent parfaitement : sans précaution, il sectionne un nylon ou une tresse en un coup de gueule et part avec ton leurre. Monte un empile acier souple ou un gros fluorocarbone très épais devant l'hameçon, et décroche-le toujours avec une pince, il mord même hors de l'eau.`,
    },
    {
      q: 'Quelle est la meilleure période pour pêcher le tassergal du bord ?',
      a: `En Méditerranée, de mai à novembre, avec un pic net en automne (septembre-octobre-novembre) quand les bancs se gavent avant l'hiver. Sur l'Atlantique, c'est plus tardif et plus ponctuel : l'été et l'automne, quand l'eau dépasse 18-20 °C et que les bancs remontent le golfe de Gascogne. Aux heures, vise l'aube, le coup du soir et la nuit chaude d'été, surtout dès qu'une chasse éclate en surface.`,
    },
    {
      q: 'Quel leurre choisir pour le tassergal ?',
      a: `Pour la surface, un stickbait ou un popper de 9 à 14 cm animé vite et nerveusement déclenche son agressivité naturelle. Pour aller chercher loin et sous la surface, un casting jig de 20 à 40 g lancé au-delà de la barre et ramené en dents de scie est imbattable. Dans tous les cas, monte un bas de ligne acier, et accepte d'en perdre quelques-uns, ça fait partie du jeu avec ce coupeur de fil.`,
    },
  ],
}
