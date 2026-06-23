import type { EspeceContent } from "../types"

/**
 * Fiche espèce — Seiche (Sepia officinalis).
 * Le céphalopode roi de l'eging du bord : turlutte et madai au tenya.
 * Façades : Manche-Atlantique + Méditerranée. Pic de pêche au printemps,
 * quand les seiches montent côtières pour pondre sur les herbiers.
 * Pas de maille légale en pêche de loisir — 18 cm = recommandation de maturité.
 */
export const seicheEspece: EspeceContent = {
  slug: "seiche",

  intro: [
    `La seiche, c'est le céphalopode qui a fait basculer la pêche du bord vers l'eging. Ni un poisson, ni un calmar : un mollusque trapu, l'os dans le dos, dix bras dont deux tentacules-fouets qu'elle déploie en un éclair pour gober ta turlutte. Du bord, c'est une cible accessible, gourmande et étonnamment combative — elle tire par à-coups, se cale au fond, projette son encre, et te résiste jusqu'au dernier mètre.`,
    `Tu la trouves là où il y a du sable propre, des herbiers de zostères et des bordures de roche : ports, digues, plages abritées, pointes rocheuses. Sur la Manche et l'Atlantique, c'est LE rendez-vous du printemps, quand les seiches quittent le large et remontent côtières pour pondre sur les herbiers — pic net de mars à mai. En Méditerranée, le même phénomène se produit un peu plus tôt, de février à avril, avec des poissons souvent calés au pied des digues et le long des herbiers de posidonie.`,
    `Deux gestes la prennent vraiment du bord : la turlutte (eging) ramenée par tirées-pauses, et le madai au tenya sur lequel tu piques un appât naturel. Règle d'or : la seiche attaque à la descente et tient sa proie sans lâcher. Tu sens un poids qui s'installe plus qu'une touche franche — c'est le moment de ferrer en douceur et de garder une tension constante, sinon elle décroche. Et garde la pointe haute à l'arrivée : un jet d'encre, ça se mérite.`,
  ],

  identity: {
    famille: `Céphalopodes, Sépiidés (Sepia officinalis)`,
    tailleCourante: `15-25 cm de manteau du bord, 1 kg et plus pour les beaux sujets`,
    tailleMax: `~45 cm de manteau pour 3 à 4 kg`,
    habitat: `Sable, herbiers de zostères/posidonie et bordures de roche — 0 à 15 m, montée côtière au printemps pour la ponte`,
    regime: `Chasseuse à l'affût : crevettes, crabes, petits poissons, gobies — frappe à la tentacule`,
  },

  regulation: {
    verifiedAt: "23/06/2026",
    source: "Arrêté du 26 octobre 2012 modifié (tailles minimales, pêche de loisir) ; règlement (CE) 1967/2006 (Méditerranée) — la seiche n'y figure pas",
    minSizeCm: { "manche-atlantique": null, mediterranee: null },
    marquage: false,
    items: [
      `<strong>Pas de taille minimale réglementaire de capture en pêche de loisir</strong> pour la seiche en Manche et Atlantique : aucune maille n'est fixée par la réglementation.`,
      `<strong>Pas de taille minimale réglementaire de capture en pêche de loisir</strong> en Méditerranée non plus : la seiche ne figure pas dans le règlement (CE) 1967/2006.`,
      `<strong>Bonne pratique recommandée : 18 cm</strong> de manteau. C'est la taille scientifique de maturité — au-delà, la seiche a eu le temps de se reproduire au moins une fois. Relâche les plus petites, c'est l'avenir du poste.`,
      `<strong>Pas de quota national</strong> ni de marquage obligatoire pour la pêche de loisir. Reste raisonnable : la seiche vit un an, pond et meurt — prélever des pondeuses au printemps, c'est scier la branche sur laquelle tu pêches.`,
    ],
  },

  saisons: {
    "manche-atlantique": [
      {
        saison: "Printemps",
        activite: 3,
        note: `Le pic absolu : de mars à mai, les seiches montent côtières pondre sur les herbiers, accessibles depuis n'importe quelle digue ou pointe.`,
      },
      {
        saison: "Été",
        activite: 2,
        note: `Les pondeuses ont disparu mais les juvéniles de l'année grossissent : pêche de petits sujets le long des ports et des plages abritées.`,
      },
      {
        saison: "Automne",
        activite: 2,
        note: `Seconde fenêtre intéressante : les seiches de l'année atteignent une belle taille avant de regagner le large aux premiers coups de froid.`,
      },
      {
        saison: "Hiver",
        activite: 1,
        note: `Activité minimale : la majorité des seiches est repartie au large vers les fonds plus chauds, cible secondaire et aléatoire du bord.`,
      },
    ],
    mediterranee: [
      {
        saison: "Printemps",
        activite: 3,
        note: `Pleine saison de février-mars à avril : ponte sur les herbiers de posidonie, beaux sujets calés au pied des digues et des enrochements.`,
      },
      {
        saison: "Été",
        activite: 2,
        note: `Les grosses sont passées, place aux juvéniles qui grossissent vite : turlutte fine de nuit dans les ports et le long des bordures rocheuses.`,
      },
      {
        saison: "Automne",
        activite: 2,
        note: `Bonne reprise sur des seiches de l'année devenues exploitables : eau encore chaude, poisson actif au crépuscule et de nuit sous les lampadaires.`,
      },
      {
        saison: "Hiver",
        activite: 1,
        note: `Présence diffuse au gré des redoux : quelques captures dans les ports profonds, mais l'essentiel a gagné le large.`,
      },
    ],
  },

  techniques: [
    {
      slug: "leurres",
      why: `L'eging est LA technique de la seiche du bord. Tu lances une turlutte (calmar artificiel lesté, taille 2.5 à 3.5 selon la profondeur) et tu la ramènes en tirées-pauses : deux ou trois coups de scion secs pour la faire monter et zigzaguer, puis une pause pendant laquelle elle redescend bras écartés — c'est à la descente que la seiche se jette dessus. La touche est sourde : un poids qui s'installe, une bannière qui se tend doucement. Ferre en gardant la tension, sans à-coup, et ramène régulièrement : la seiche s'agrippe aux paniers de la turlutte sans hameçon piquant, le moindre relâché la libère. Canne eging 2,40-2,70 m, tresse fine + fluoro 25/100, c'est le combo gagnant.`,
    },
    {
      slug: "flottante",
      why: `Le madai au tenya (ou seiche au flotteur) est redoutable quand l'eging ne donne pas. Tu pique une lanière de poisson, une crevette ou un petit appât sur un tenya plombé — ou tu suspends un appât naturel sous un flotteur coulissant réglé pour pêcher juste au-dessus du fond. La seiche, opportuniste, vient enserrer l'appât de ses bras : le flotteur s'enfonce lentement ou part de travers. Laisse-la prendre une seconde, puis ferre en souplesse et garde-la tendue. Imbattable de nuit dans les ports éclairés, où les seiches viennent chasser crevettes et petits poissons attirés par la lumière.`,
    },
  ],

  postes: [
    `La seiche aime le sable propre bordé de structure : la lisière entre une plage et un herbier, le pied d'une digue qui retombe sur du sable, une pointe rocheuse, une passe portuaire. Cherche les transitions — c'est là qu'elle chasse à l'affût, posée sur le fond, prête à bondir sur tout ce qui passe. Les ports sont des valeurs sûres au printemps : quais, darses, abords des bouées et des coffres. Si tu connais un herbier de zostères ou de posidonie accessible du bord, c'est un aimant à seiches en période de ponte.`,
    `Côté conditions, la seiche déteste l'eau trop sale et la grosse houle : elle chasse à vue et veut une eau claire à légèrement teintée, une mer calme à peu agitée. Un vent modéré qui ride la surface ne gêne pas, mais évite les jours de tempête où elle décolle vers des fonds plus calmes. Les meilleurs moments sont le lever et le coucher du jour, et surtout la nuit — la seiche est largement nocturne. En port, les lampadaires qui éclairent l'eau créent des spots fixes : la lumière concentre les crevettes et les petits poissons, les seiches suivent.`,
    `La marée commande beaucoup sur la Manche et l'Atlantique : privilégie les phases de courant modéré, en fin de montant et au début du descendant, quand l'eau bouge sans arracher ta turlutte. L'étale de pleine mer, avec une hauteur d'eau confortable au pied des structures, est souvent le meilleur créneau. En Méditerranée, où le marnage est négligeable, c'est l'heure (crépuscule, nuit) et l'éclairage artificiel qui font la différence plutôt que la marée. Dans tous les cas, ratisse méthodiquement : la seiche tient des micro-postes, quelques mètres à gauche ou à droite peuvent tout changer.`,
  ],

  faq: [
    {
      q: `Quelle est la taille minimale de la seiche ?`,
      a: `Il n'existe pas de taille minimale réglementaire de capture pour la seiche en pêche de loisir, ni en Manche-Atlantique ni en Méditerranée : la seiche n'est listée dans aucune maille (arrêté du 26 octobre 2012 modifié ; règlement CE 1967/2006). Par bonne pratique, on recommande toutefois de relâcher les sujets de moins de 18 cm de manteau, taille scientifique de maturité, pour préserver la ressource.`,
    },
    {
      q: `Quelle est la meilleure saison pour pêcher la seiche du bord ?`,
      a: `Le printemps, sans hésiter. De mars à mai sur la Manche et l'Atlantique, de février à avril en Méditerranée, les seiches montent côtières pour pondre sur les herbiers et deviennent accessibles depuis n'importe quelle digue, port ou pointe rocheuse. L'automne offre une seconde fenêtre intéressante sur des seiches de l'année devenues belles.`,
    },
    {
      q: `Quelle technique et quel montage pour la seiche ?`,
      a: `L'eging à la turlutte est la technique reine : turlutte taille 2.5 à 3.5 ramenée en tirées-pauses, la seiche attaque à la descente. En alternative, le madai au tenya consiste à piquer un appât naturel (lanière de poisson, crevette) sur un tenya plombé. Une canne eging de 2,40-2,70 m, une tresse fine et un bas de ligne fluoro 25/100 couvrent les deux approches.`,
    },
    {
      q: `Comment savoir qu'une seiche a touché ?`,
      a: `Oublie la touche franche du poisson : la seiche s'installe sur ta turlutte ou ton appât et tu ressens un poids mort, une bannière qui se tend lentement ou part de travers. Ferre alors en douceur, sans à-coup brutal, et garde une tension constante jusqu'au bord — la seiche s'agrippe sans hameçon piquant et le moindre relâché la libère. Garde la pointe haute à l'arrivée pour éviter le jet d'encre.`,
    },
  ],
}
