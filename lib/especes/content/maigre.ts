import type { EspeceContent } from "../types"

/**
 * Fiche espèce — MAIGRE (Argyrosomus regius).
 * Le géant des estuaires : gros sciaenidé de la Gironde et des grands fonds
 * sableux, prisé du bord à la tombée du jour sur les grosses marées.
 * Réglementation vérifiée aux sources le 23/06/2026 — ne pas modifier les
 * chiffres sans re-vérifier (maille Atlantique relevée de 45 à 50 cm en 2022,
 * marquage obligatoire).
 */
export const maigreEspece: EspeceContent = {
  slug: "maigre",

  intro: [
    `Le maigre, c'est le poisson de cauchemar des bredouilles et le rêve de toute une vie de pêcheur du bord. Gros sciaenidé argenté qui dépasse facilement le mètre, il remonte les grands estuaires de la façade atlantique (la Gironde en tête) et patrouille les vastes étendues de sable des baies ouvertes. Tu peux pêcher dix ans sans en voir un, puis sentir un soir une traction sourde qui te scie les bras : à ce moment-là, plus rien d'autre ne compte.`,
    `Ce qui le rend reconnaissable entre tous, c'est sa grogne. Le maigre fait vibrer sa vessie natatoire et émet un grognement caverneux qu'on entend depuis le bord les soirs calmes, surtout pendant la fraie. Les anciens repéraient les bancs à l'oreille bien avant les sondeurs. Du bord, on vise des sujets de 50 à 80 cm, mais un « gros » de plus d'un mètre pour 15 kg et plus reste à portée de canne dans les bonnes conditions. C'est rare, c'est lourd, ça se mérite.`,
    `Le maigre ne se pêche pas au hasard. Il faut le bon estuaire, la bonne marée, les grandes, les vraies, et le bon créneau, souvent la tombée du jour et la première partie de la nuit. C'est une pêche d'affût et de patience, où tu poses un vif ou tu animes un gros souple dans la veine de courant en attendant que le géant passe. Lis la réglementation ci-dessous avant de garder ta prise : la maille est sérieuse et le marquage est obligatoire.`,
  ],

  identity: {
    famille: "Sciaenidés — Argyrosomus regius (le « courbine » en Espagne)",
    tailleCourante: "50-80 cm du bord, 1 m+ pour les beaux sujets",
    tailleMax: "Jusqu'à 2 m et plus de 50 kg, exceptionnel du bord",
    habitat: "Estuaires, embouchures et grands fonds sableux, de 2 à 30 m d'eau",
    regime: "Carnassier puissant : mulets, sardines, seiches, crevettes, vers",
  },

  regulation: {
    verifiedAt: "23/06/2026",
    source: "Arrêté du 26 octobre 2012 modifié (relevé par l'arrêté du 23 août 2022) ; arrêté du 17 mai 2011 modifié (marquage)",
    minSizeCm: { "manche-atlantique": 50, mediterranee: 45 },
    marquage: true,
    items: [
      "<strong>Maille : 50 cm</strong> en Manche, mer du Nord et Atlantique (taille relevée de 45 à 50 cm par l'arrêté du 23 août 2022). <strong>45 cm</strong> en Méditerranée.",
      "<strong>Marquage obligatoire</strong> de tout maigre conservé : ablation de la partie inférieure de la nageoire caudale, dès le débarquement.",
      "En dessous de la maille, c'est remise à l'eau immédiate. Manipule le poisson mouillé, sans le poser sur le sable sec, pour qu'il reparte en forme.",
    ],
  },

  saisons: {
    "manche-atlantique": [
      {
        saison: "Printemps",
        activite: 3,
        note: `La grande saison : les maigres remontent les estuaires pour frayer dès mai-juin, c'est le moment des grognes et des plus beaux sujets à portée de canne.`,
      },
      {
        saison: "Été",
        activite: 3,
        note: `Pleine saison estuarienne et sur les plages ouvertes : pêche à la tombée du jour et de nuit, vif et gros souples sur les grandes marées.`,
      },
      {
        saison: "Automne",
        activite: 2,
        note: `Les poissons sont encore là mais redescendent vers le large au fil des semaines : septembre reste bon, octobre se complique.`,
      },
      {
        saison: "Hiver",
        activite: 1,
        note: `La quasi-totalité des maigres a regagné les grands fonds du large ; les captures du bord deviennent anecdotiques.`,
      },
    ],
    mediterranee: [
      {
        saison: "Printemps",
        activite: 2,
        note: `Reprise d'activité à la sortie de l'hiver : on cherche les maigres aux abords des graus, des ports et des embouchures, à l'aube et au crépuscule.`,
      },
      {
        saison: "Été",
        activite: 3,
        note: `La meilleure période en Méditerranée : sujets actifs près des grandes plages et des sorties d'étangs, pêche fine de nuit sur fond de sable.`,
      },
      {
        saison: "Automne",
        activite: 2,
        note: `Encore quelques poissons sur les zones sableuses et autour des digues tant que l'eau reste tiède ; ça baisse nettement après les premiers coups d'est.`,
      },
      {
        saison: "Hiver",
        activite: 1,
        note: `Période creuse : les maigres se tiennent au large sur les fonds profonds, hors de portée du pêcheur du bord.`,
      },
    ],
  },

  techniques: [
    {
      slug: "vif",
      why: `La méthode reine pour les gros : un mulet ou une sardine vivante dérivés dans la veine de courant d'un estuaire, à la tombée du jour sur grande marée.`,
    },
    {
      slug: "leurres",
      why: `Un gros leurre souple de 15-20 cm, shad ou worm, raclé lentement près du fond sableux ou animé dans le courant, redoutable au crépuscule.`,
    },
    {
      slug: "surfcasting",
      why: `Sur les grandes plages ouvertes : ver de mer, lançon ou bibi sur montage solide, lancé dans les fosses, idéal de nuit sur mer un peu formée.`,
    },
  ],

  postes: [
    `Le maigre est un poisson de grandes marées. Sur la façade Manche-Atlantique, oublie les petits coefficients : vise les marées à fort coefficient (90 et plus), quand le courant brasse l'estuaire et déplace les bancs de nourriture. Les deux dernières heures de montante et le début de descendante, autour de la pleine mer, concentrent l'essentiel des passages. Cale ta session sur la marée de TON estuaire, pas sur ta montre. La courbe et les horaires de pleine et basse mer sont dans l'app, croise-les avec tes propres prises pour repérer TON créneau.`,
    `Côté conditions, le maigre aime l'eau qui bouge et la lumière qui baisse. Une eau légèrement teintée par le courant ou par un coup de vent met les poissons en confiance ; la mer d'huile en plein jour est presque toujours stérile. La tombée du jour et la première partie de la nuit écrasent le reste de la journée. Beaucoup de captures se font dans l'heure qui suit le coucher du soleil. Un léger clapot sur les plages ouvertes, sans excès de houle, aide aussi au surfcasting en creusant les fosses où le maigre vient fouiller.`,
    `Les postes qui paient : les veines de courant des grands estuaires (la Gironde reste la référence), les fosses et chenaux qui bordent les bancs de sable, les sorties d'eau douce et les abords des digues qui canalisent le courant. Place-toi là où le courant accélère et où le fond change : bordure de fosse, cassure sableuse, confluence. En Méditerranée, vise les grandes plages de sable, les graus et les sorties d'étangs, de préférence à l'aube et au crépuscule. Partout, le même réflexe : sois en place avant la tombée du jour, sur la bonne phase de marée, et tends l'oreille. La grogne du maigre te dira qu'il est là.`,
  ],

  faq: [
    {
      q: "Quelle est la taille minimale du maigre en 2026 ?",
      a: `La maille est de 50 cm en Atlantique, Manche et mer du Nord (elle a été relevée de 45 à 50 cm par l'arrêté du 23 août 2022) et de 45 cm en Méditerranée. Tout maigre conservé doit en plus être marqué par l'ablation de la partie inférieure de la nageoire caudale. En dessous de la maille, c'est remise à l'eau immédiate.`,
    },
    {
      q: "Quelle est la meilleure saison pour pêcher le maigre du bord ?",
      a: `Sur la façade atlantique, le pic se situe au printemps et en été (mai à août), quand les maigres remontent les estuaires pour frayer : c'est la période des grognes et des plus gros sujets. En Méditerranée, l'été est le moment le plus régulier. L'hiver, les poissons regagnent les grands fonds du large et deviennent hors de portée du bord.`,
    },
    {
      q: "Quelle technique pour prendre un maigre du bord ?",
      a: `Le vif est la valeur sûre pour les gros : un mulet ou une sardine vivante dérivés dans la veine de courant d'un estuaire à la tombée du jour. Les gros leurres souples (shad ou worm de 15-20 cm) animés près du fond marchent bien au crépuscule, et le surfcasting au ver ou au lançon sur les grandes plages ouvertes complète la panoplie de nuit.`,
    },
    {
      q: "Pourquoi parle-t-on de la grogne du maigre ?",
      a: `Le maigre fait vibrer sa vessie natatoire et émet un grognement caverneux, surtout pendant la fraie au printemps. On l'entend depuis le bord les soirs calmes, et c'est un excellent indicateur : si tu entends grogner, des poissons sont à portée. Les pêcheurs expérimentés repèrent ainsi les bancs avant même de lancer.`,
    },
  ],
}
