import type { EspeceContent } from "../types"

/**
 * Fiche espèce — Calmar / encornet (Loligo vulgaris).
 * Le céphalopode des digues : eging à la turlutte, de nuit sous les lampadaires,
 * en automne-hiver quand les bancs reviennent vers la côte. Présent sur les deux
 * façades (Manche-Atlantique + Méditerranée). AUCUNE taille minimale réglementaire
 * en pêche de loisir — ne pas confondre avec le seuil PRO de 11 cm.
 * Réglementation vérifiée le 23/06/2026 (chiffres figés, ne pas modifier sans
 * re-vérification aux sources).
 */
export const calmarEspece: EspeceContent = {
  slug: "calmar",

  intro: [
    `Le calmar — l'encornet, si tu préfères — c'est la pêche qui transforme une digue déserte de novembre en poste d'affût. Un céphalopode nerveux qui rôde au-dessus du sable et des structures, surtout de nuit, et qui se chasse à la turlutte : ce petit leurre armé de couronnes d'épingles que tu animes en dents de scie sous les lampadaires du port. Une fois que tu as goûté à cette pêche, tu ne ranges plus la canne en hiver.`,
    `Ne te fie pas à sa réputation de proie facile : le calmar est un prédateur à vue qui frappe à l'aube, au crépuscule et la nuit, quand la lumière des réverbères attire le plancton, puis les petits poissons, puis lui. Il se tient juste au-dessus du fond, sur une langue de sable ou contre un enrochement, et il monte sur la turlutte en l'enserrant de ses tentacules — pas de touche brutale, juste un poids mort soudain dans la canne. Tout l'art de l'eging tient dans cette lecture fine : sentir le moment où il s'est saisi du leurre et accompagner sans ferrer comme une brute.`,
    `C'est aussi une pêche économique et propre : pas besoin de vifs ni d'esches, une boîte de turluttes de couleurs différentes suffit pour une saison entière. Et dans la glacière, un calmar d'une nuit de digue vaut tous les étals — à condition de le rincer et de le glacer vite. Reste vigilant sur une chose : il encre. Décroche-le tête vers l'extérieur, bras tendu, sous peine de repeindre ta veste en noir.`,
  ],

  identity: {
    famille: `Loliginidés (Loligo vulgaris) — calmar commun, dit aussi encornet`,
    tailleCourante: `15-25 cm de manteau du bord, 30 cm pour les beaux sujets`,
    tailleMax: `environ 40-50 cm de manteau (hors tentacules), près de 2 kg`,
    habitat: `Rôde au-dessus du sable et des structures, surtout de nuit : digues, jetées, sorties de port éclairées, langues de sable entre les roches`,
    regime: `Prédateur à vue : petits poissons (lançons, sprats), crevettes et juvéniles chassés dans la colonne d'eau`,
  },

  regulation: {
    verifiedAt: "23/06/2026",
    source:
      "Arrêté du 26 octobre 2012 modifié ; règlement (UE) 2019/1241 — le calmar n'y est pas listé",
    minSizeCm: { "manche-atlantique": null, mediterranee: null },
    marquage: false,
    items: [
      `<strong>Pas de taille minimale réglementaire de capture en pêche de loisir</strong> en Manche et Atlantique : le calmar (Loligo vulgaris) n'est listé ni à l'arrêté tailles, ni au règlement européen.`,
      `<strong>Pas de taille minimale réglementaire de capture en pêche de loisir</strong> en Méditerranée non plus — même règle, l'espèce n'est pas réglementée pour la pêche récréative.`,
      `<strong>Ne confonds pas avec le seuil professionnel de 11 cm</strong> que tu peux croiser : il concerne la pêche PROFESSIONNELLE, pas la pêche de loisir. Aucune maille ne s'applique à toi du bord.`,
      `<strong>Pas de quota ni de marquage obligatoire</strong> pour cette espèce. Reste raisonnable : ne prélève que ce que tu consommes et relâche les plus petits sujets, c'est l'avenir du poste.`,
    ],
  },

  saisons: {
    "manche-atlantique": [
      {
        saison: "Printemps",
        activite: 1,
        note: `Période creuse du bord : les calmars adultes se sont dispersés et reproduits, les passages côtiers sont rares et irréguliers. La turlutte ne paye plus, range-la jusqu'à l'automne.`,
      },
      {
        saison: "Été",
        activite: 1,
        note: `Quasi absent des digues : le calmar se tient au large par eau chaude. Quelques juvéniles isolés à la tombée de la nuit, sans rien de ciblable de façon fiable.`,
      },
      {
        saison: "Automne",
        activite: 3,
        note: `La pleine saison : les bancs reviennent vers la côte dès octobre-novembre. Affût de nuit sous les lampadaires des ports, turlutte en dents de scie — c'est LE créneau de l'année.`,
      },
      {
        saison: "Hiver",
        activite: 2,
        note: `La saison continue tant que l'eau reste douce : belles nuits possibles en décembre-janvier sur les digues éclairées, puis l'activité faiblit avec le froid et la clarté de l'eau.`,
      },
    ],
    mediterranee: [
      {
        saison: "Printemps",
        activite: 1,
        note: `Activité faible du bord : les gros sujets sont rentrés pondre puis ont quitté la côte. Quelques touches à la nuit tombée, mais la saison de la turlutte est passée.`,
      },
      {
        saison: "Été",
        activite: 1,
        note: `Période la plus creuse : le calmar fuit les eaux chaudes vers le large et le fond. Inutile d'insister depuis les jetées, attends le rafraîchissement automnal.`,
      },
      {
        saison: "Automne",
        activite: 3,
        note: `Le pic méditerranéen : dès que l'eau redescend en octobre, les calmars collent les digues et les sorties de port éclairées. Nuits noires sans lune, turlutte rose ou orange — sessions superbes.`,
      },
      {
        saison: "Hiver",
        activite: 3,
        note: `Toujours excellent : l'hiver doux méditerranéen prolonge la saison sur les jetées et les pointes. Vise les nuits calmes après un coup de vent, quand l'eau s'éclaircit à nouveau.`,
      },
    ],
  },

  techniques: [
    {
      slug: "leurres",
      why: `L'eging à la turlutte est la seule vraie technique du bord. Une turlutte (egi) de 2,5 à 3,5 pouces, armée de ses couronnes d'épingles, animée en dents de scie : deux ou trois coups de scion secs pour la faire monter, puis une longue descente sur bannière semi-tendue où il la gobe. Ne ferre pas, accompagne — tu sens un poids mort, tu mets en tension et tu maintiens. Varie les couleurs (rose, orange, naturel) et la vitesse de coulée jusqu'à trouver ce qu'il veut ce soir-là. Canne eging légère de 2,40-2,70 m, tresse fine et bas de ligne fluoro : le combo gagnant.`,
    },
    {
      slug: "flottante",
      why: `L'alternative passive sous lampadaire : une turlutte suspendue sous un flotteur lumineux, réglée à 1-2 m sous la surface, qui dérive lentement dans le halo de lumière. Imbattable quand le calmar est haut dans la colonne d'eau et refuse l'animation sèche. Montage simple, idéal pour pêcher deux cannes ou initier un débutant à l'affût de nuit.`,
    },
  ],

  postes: [
    `Cherche la lumière et le sable. Le poste roi, c'est la digue ou la jetée de port équipée de lampadaires : le halo attire le plancton, qui attire les petits poissons, qui attirent le calmar. Pose-toi à la limite du cône de lumière, là où le clair rencontre le sombre — c'est la zone d'embuscade. Un fond de sable, ou une langue de sable entre deux enrochements, dans 3 à 8 m d'eau à portée de lancer, concentre les chasses. Repère les spots de jour pour pêcher serein la nuit venue.`,
    `Le moment fait tout : le calmar est un animal de pénombre. L'aube, le crépuscule et surtout les premières heures de nuit noire dominent largement — vise les nuits sans lune, où les réverbères sont la seule source de lumière. Côté marée, privilégie les coefficients moyens et les phases de courant modéré : l'étale et le début de montante ou de descendante, quand le calmar peut se tenir en chasse sans lutter contre un fort courant qui balaye le sable. Une eau qui file trop fort plaque ta turlutte et coupe les touches.`,
    `Le vent et la houle décident de la clarté de l'eau, et le calmar chasse à vue. Vise une mer calme à peine ridée, plusieurs jours sans gros coup de vent : l'eau redevient claire, la lumière des lampadaires pénètre, et les calmars montent franchement. Une mer formée ou une eau brune après une tempête tue net la session — laisse passer 24 à 48 h que tout se décante. Et garde toujours une épuisette à portée : un beau calmar bras tendu hors de l'eau encre, mieux vaut le maîtriser vite et tête vers le large.`,
  ],

  faq: [
    {
      q: `Quelle est la taille minimale de capture du calmar ?`,
      a: `Il n'y a pas de taille minimale réglementaire de capture pour le calmar (Loligo vulgaris) en pêche de loisir, ni en Manche-Atlantique ni en Méditerranée : l'espèce n'est listée ni à l'arrêté du 26 octobre 2012 modifié, ni au règlement (UE) 2019/1241. Attention à ne pas confondre avec le seuil de 11 cm cité côté pêche professionnelle, qui ne s'applique pas à la pêche récréative. Reste raisonnable malgré tout et relâche les plus petits sujets.`,
    },
    {
      q: `Quelle est la meilleure saison pour pêcher le calmar du bord ?`,
      a: `L'automne et l'hiver, sans hésiter. Les bancs reviennent vers la côte dès octobre-novembre, et la saison se prolonge tout l'hiver en Méditerranée comme sur l'Atlantique tant que l'eau reste douce. Le printemps et l'été sont creux depuis le bord : le calmar se tient au large par eau chaude. Pendant la bonne saison, c'est une pêche de nuit, sous les lampadaires des ports et des digues.`,
    },
    {
      q: `Comment pêcher le calmar à la turlutte ?`,
      a: `L'eging : une turlutte (egi) de 2,5 à 3,5 pouces lancée au-dessus d'un fond de sable, animée en dents de scie. Donne deux ou trois coups de scion secs pour la faire monter, puis laisse-la redescendre lentement sur bannière semi-tendue — c'est pendant la coulée que le calmar la gobe. Tu ne sens pas une touche franche mais un poids mort soudain : mets en tension en douceur, sans ferrer, et garde le contact. Change de couleur (rose, orange, naturel) tant que ça ne mord pas.`,
    },
    {
      q: `Le calmar et l'encornet, c'est le même animal ?`,
      a: `Oui, c'est exactement le même : encornet est simplement l'autre nom courant du calmar (Loligo vulgaris). On parle aussi d'eging pour la technique de pêche à la turlutte. À ne pas confondre avec la seiche, un autre céphalopode au corps plus large et à l'os interne (l'os de seiche), ni avec le poulpe. Le calmar se reconnaît à son manteau allongé en fuseau et à ses deux nageoires en pointe de flèche.`,
    },
  ],
}
