import type { EspeceContent } from "../types"

/**
 * Fiche espèce — Plie / carrelet (Pleuronectes platessa) — /especes/plie.
 * Angle : le poisson plat du sable et de la vase, cible reine du surfcasting
 * doux d'hiver-printemps. Taches orange caractéristiques.
 * Façade unique : Manche + Atlantique (ABSENT de Méditerranée → saisons []).
 * Réglementation vérifiée le 23/06/2026 (arrêté du 26 octobre 2012 modifié).
 */
export const plieEspece: EspeceContent = {
  slug: "plie",

  intro: [
    `La plie, qu'on appelle aussi carrelet, c'est le poisson plat par excellence du bord en Manche et en Atlantique : un carré de sable vivant, couché sur le fond, qui se trahit par ses taches orange vif éparpillées sur le dos brun. Du bord, c'est une pêche de patience et de finesse, pas de force — mais quand tu en alignes cinq ou six sur une session d'hiver, plage déserte et thermos à portée de main, tu comprends pourquoi tant de surfcasteurs l'attendent toute l'année.`,
    `Tu la trouves posée sur les fonds de sable propre et de vase, là où elle s'enfouit à demi pour guetter vers, coques et petits crustacés. Elle ne chasse pas en pleine eau : elle aspire ce qui passe à portée de bouche, d'où une touche souvent discrète, un simple alourdissement de la pointe de canne. Son territoire du bord, c'est toute la façade nord : Manche, baies sableuses de Bretagne nord, estuaires et grandes plages de l'Atlantique, du Cotentin aux Landes. En Méditerranée, inutile de la chercher — elle y est tout simplement absente.`,
    `La plie est une cible de saison froide : elle se rapproche des côtes et entre dans les estuaires de la fin de l'automne au début du printemps, quand l'eau fraîchit. Une technique la prend vraiment du bord — le surfcasting léger, ver ou coque posé sur le sable — et tout se joue sur la discrétion du montage et la lecture de la marée. Cette fiche te donne les saisons façade par façade, le montage qui paie, et les postes selon le vent, la houle et le moment de marée.`,
  ],

  identity: {
    famille: `Pleuronectidés (Pleuronectes platessa), les yeux sur le côté droit`,
    tailleCourante: `25-35 cm du bord, 40 cm+ pour un beau carrelet`,
    tailleMax: `≈ 90 cm pour 7 kg (sujets du large, hors de portée du bord)`,
    habitat: `Fonds de sable propre et de vase, baies et estuaires — quelques mètres d'eau`,
    regime: `Vers marins, coques, petits crustacés et mollusques aspirés sur le fond`,
  },

  regulation: {
    verifiedAt: "23/06/2026",
    source: "Arrêté du 26 octobre 2012 modifié (Pleuronectes platessa)",
    minSizeCm: { "manche-atlantique": 27, mediterranee: null },
    marquage: false,
    items: [
      `<strong>Taille minimale : 27 cm</strong> en Manche et Atlantique — tout carrelet sous cette taille doit être remis à l'eau immédiatement.`,
      `<strong>Pas de taille minimale réglementaire de capture en pêche de loisir en Méditerranée</strong> : la plie y est absente, la question ne se pose donc pas sur le terrain.`,
      `<strong>Pas de marquage obligatoire</strong> pour la plie et <strong>pas de quota national</strong> en pêche de loisir. Reste mesuré malgré tout : ne prélève que des poissons à maille et ce dont tu as besoin pour la table.`,
    ],
  },

  saisons: {
    "manche-atlantique": [
      {
        saison: "Printemps",
        activite: 2,
        note: `Bon début de saison en mars : les plies encore proches du bord se gavent avant de décrocher vers le large quand l'eau se réchauffe en avril-mai.`,
      },
      {
        saison: "Été",
        activite: 1,
        note: `Période creuse : les poissons ont gagné les fonds plus profonds et frais. Quelques captures de nuit dans les estuaires, mais c'est une cible secondaire.`,
      },
      {
        saison: "Automne",
        activite: 2,
        note: `Le retour : dès que l'eau fraîchit en octobre-novembre, les plies reviennent vers les baies et les embouchures. La régularité grimpe semaine après semaine.`,
      },
      {
        saison: "Hiver",
        activite: 3,
        note: `Le pic : décembre à février, plies bien présentes et en chair sur le sable. Plage déserte, eau froide, ver ou coque sur le fond — le meilleur créneau de l'année.`,
      },
    ],
    mediterranee: [],
  },

  techniques: [
    {
      slug: "surfcasting",
      why: `La technique reine, et quasiment la seule du bord pour la plie : tu poses un ver (arénicole, dur, néréide) ou une coque sur un fond de sable propre, à 30-80 m, sur un montage discret. Canne légère 80-120 g, bas de ligne fin en 18-22/100, hameçons fins de fer n° 4 à 1, et tu surveilles une pointe de canne souple — la touche est rarement violente, c'est souvent un simple alourdissement ou un fil qui se détend. Des perles flottantes ou un petit flotteur de trainard qui décollent l'appât de quelques centimètres font une vraie différence pour mettre l'esche dans le champ de vision d'un poisson couché sur le sable.`,
    },
  ],

  postes: [
    `Le bon poste à plie se résume à une chose : du sable propre, ou du sable mêlé de vase, sans relief agressif. Vise les grandes plages océanes à pente douce, le fond des baies abritées, et surtout les estuaires et les chenaux où la marée concentre la nourriture. Repère, à marée basse de vives-eaux, les zones où le sable est marqué de tortillons de vers et de petites coques affleurantes : c'est là que la plie viendra fouiller à marée haute. Les fonds durs, les enrochements et la roche, eux, ne l'intéressent pas — laisse-les au sar et au bar.`,
    `Le moment de marée commande tout. Les plies suivent la montante pour venir se nourrir sur des fonds que la mer vient de recouvrir : pêche surtout les deux à trois heures avant la pleine mer et le début de la descendante, quand le courant relancé balaie les vers hors du sable. Dans les estuaires, le jusant qui draine la nourriture vers la fosse peut aussi très bien donner. Cale ta session sur la courbe de marée de ton spot, pas sur ta montre — et privilégie les coefficients moyens (60-90), assez forts pour brasser le fond sans rendre l'eau trop chargée ni le plomb impossible à tenir.`,
    `Côté ciel, la plie n'aime pas le gros temps. Une mer peu agitée à modérément formée, une houle inférieure à un mètre, une eau légèrement teintée par le ressac : voilà tes meilleures fenêtres. Un vent de terre ou de travers modéré t'aide à pêcher propre et à sentir les touches fines ; un vent de face qui lève une houle d'1,5 m et plus rend la détection impossible et décolle le poisson du bord. La nuit et les deux heures autour du lever du jour, par temps froid et calme d'hiver, restent les créneaux les plus réguliers.`,
  ],

  faq: [
    {
      q: `Quelle est la taille minimale de la plie ?`,
      a: `La taille minimale de capture est de 27 cm en Manche et Atlantique (arrêté du 26 octobre 2012 modifié). En dessous, c'est remise à l'eau immédiate. Il n'existe pas de quota national ni de marquage obligatoire pour la plie en pêche de loisir. En Méditerranée, la question ne se pose pas : l'espèce y est absente.`,
    },
    {
      q: `Quelle est la meilleure saison pour pêcher la plie du bord ?`,
      a: `L'hiver, et de loin : de décembre à février, les plies se rapprochent des côtes et des estuaires, bien en chair, et c'est le pic de l'année. L'automne (octobre-novembre) marque le retour des poissons vers le bord, et le début du printemps (mars) reste bon avant qu'elles ne décrochent vers le large. L'été est creux du bord.`,
    },
    {
      q: `Quel appât et quel montage pour la plie au surfcasting ?`,
      a: `Le ver arrive en tête — arénicole, ver dur (bibi), néréide —, suivi de la coque et de la moule décoquillée. Monte un bas de ligne fin en 18-22/100, des hameçons fins de fer n° 4 à 1, et ajoute une ou deux perles flottantes (ou un petit flotteur de trainard) pour décoller l'esche du sable : une plie couchée sur le fond repère mieux un appât légèrement surélevé. Touche discrète, ferrage en douceur.`,
    },
    {
      q: `Où trouver la plie en France ?`,
      a: `Sur les façades Manche et Atlantique uniquement : grandes plages de sable, baies abritées, estuaires et chenaux du Cotentin et de la Bretagne nord jusqu'aux Landes. Elle recherche le sable propre et la vase, jamais la roche. En Méditerranée, elle est absente — n'espère pas l'y croiser.`,
    },
  ],
}
