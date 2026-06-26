import type { EspeceContent } from "../types"

/**
 * Fiche espèce — Oblade (Oblada melanura).
 * Le sparidé méditerranéen de pleine eau : longe la roche et les herbiers,
 * chasse entre deux eaux, mord surtout au coup du soir. Façade :
 * Méditerranée uniquement (quasi absente de l'Atlantique).
 * Réglementation vérifiée le 23/06/2026 (chiffres injectés, ne pas modifier
 * sans re-vérification aux sources).
 */
export const obladeEspece: EspeceContent = {
  slug: "oblade",

  intro: [
    `L'oblade, c'est le sparidé méditerranéen qu'on confond souvent avec un sar de loin, jusqu'à ce qu'on voie la grosse tache noire cerclée de blanc à la base de la queue. C'est sa carte d'identité : aucun autre poisson de nos digues ne porte ce point d'encre. Corps ovale, dos gris-bleu, flancs argentés rayés de fines lignes sombres : élégante, vive, et bien plus joueuse que sa réputation ne le laisse croire.`,
    `Contrairement au sar collé au caillou ou à la dorade qui fouille le fond, l'oblade vit entre deux eaux. Elle patrouille en petits bancs le long des roches et au-dessus des herbiers de posidonie, dans les trois à six premiers mètres, souvent à portée de lancer des jetées, des pointes et des sorties de port. C'est un poisson de Méditerranée : présente du Roussillon à la Corse, à l'année, elle est en revanche quasi absente de l'Atlantique : inutile de la chercher au-delà du golfe de Gascogne.`,
    `Sa pêche, c'est de la finesse pure. L'oblade a une petite bouche, une vue perçante et une méfiance redoutable de jour en eau claire. Mais au coup du soir, quand la lumière tombe, elle perd sa prudence et monte chasser dans la couche du dessus : c'est ton créneau. Pain, ver ou lanière fine sous flotteur léger, bas de ligne discret, et tu tiens une des plus jolies pêches du bord en été méditerranéen.`,
  ],

  identity: {
    famille: `Sparidés (Oblada melanura)`,
    tailleCourante: `18-28 cm du bord, 30 cm+ pour les beaux sujets`,
    tailleMax: `environ 35 cm pour près de 1 kg`,
    habitat: `Pleine eau le long de la roche et au-dessus des herbiers, entre deux eaux (3 à 6 m)`,
    regime: `Petits crustacés, vers, alevins et algues, régime mixte, surtout au crépuscule`,
  },

  regulation: {
    verifiedAt: "23/06/2026",
    source: "Arrêté du 26 octobre 2012 modifié ; règlement (CE) 1967/2006 : l'oblade n'y figure pas",
    minSizeCm: { "manche-atlantique": null, mediterranee: null },
    marquage: false,
    items: [
      `<strong>Pas de taille minimale réglementaire de capture</strong> en pêche de loisir en Méditerranée : l'oblade n'est listée ni à l'arrêté du 26 octobre 2012, ni au règlement (CE) 1967/2006. Cela n'autorise pas à tout garder : relâche les petits sujets et prélève avec mesure.`,
      `<strong>Espèce quasi absente de l'Atlantique</strong> : il n'y a pas non plus de maille nationale sur cette façade, mais c'est une cible méditerranéenne, pas atlantique.`,
      `<strong>Parc naturel marin du Golfe du Lion</strong> : maille locale de 20 cm + quota de 10 poissons/jour + autorisation requise (arrêté préfectoral du 12/02/2024). Si tu pêches entre Cerbère et Leucate, c'est cette règle locale qui s'applique.`,
      `<strong>Vérifie toujours la réglementation locale</strong> : réserves marines, cantonnements et zones protégées (Cerbère-Banyuls, Scandola, cœur du Parc national des Calanques…) peuvent restreindre ou interdire la pêche, au-delà des règles nationales.`,
    ],
  },

  saisons: {
    "manche-atlantique": [],
    mediterranee: [
      {
        saison: "Printemps",
        activite: 2,
        note: `Reprise franche dès que l'eau passe les 15-16 °C : les bancs se rapprochent du bord et mordent bien au coup du soir le long des digues.`,
      },
      {
        saison: "Été",
        activite: 3,
        note: `Pleine saison : oblades partout sur les jetées et les pointes, très actives au crépuscule et à la tombée de la nuit, par mer calme et eau chaude.`,
      },
      {
        saison: "Automne",
        activite: 2,
        note: `Encore de belles sessions en septembre-octobre, souvent les plus gros sujets de l'année, avant que le refroidissement ne calme les bancs.`,
      },
      {
        saison: "Hiver",
        activite: 1,
        note: `Activité minimale : les bancs gagnent un peu de fond et se font rares au bord. Cible secondaire entre deux coups de mer.`,
      },
    ],
  },

  techniques: [
    {
      slug: "flottante",
      why: `La technique reine pour l'oblade entre deux eaux : bolognaise ou anglaise 4-5 m, flotteur léger de 2 à 5 g réglé entre 1,5 et 3 m de profondeur. Un esche fin (boulette de pain, morceau de ver, fine lanière de sardine) descendu dans la couche où patrouille le banc. Un broumé léger de pain mouillé ou de sardine pilée fixe le poste et fait monter les poissons. Bas de ligne discret en 14-18/100 : sa vue est trop bonne pour du gros fil.`,
    },
    {
      slug: "surfcasting",
      why: `En appoint, surtout de nuit : un montage léger lancé près des enrochements ou au-dessus des herbiers, avec un appât fin (ver, morceau de crevette, lanière). L'oblade se prend mieux à mi-hauteur, donc privilégie un trainard long et peu plombé qui laisse l'esche évoluer plutôt qu'un montage cloué au fond. La nuit, sa méfiance tombe et elle gobe sans hésiter.`,
    },
  ],

  postes: [
    `L'oblade tient des postes de pleine eau, jamais loin de la structure : pieds de digues et de jetées, pointes rocheuses, tombants, bordures d'herbiers de posidonie et sorties de port. Cherche la lisière entre la roche claire et l'eau bleue, ou la bande de sable qui longe l'herbier : c'est là qu'elle patrouille. Un poste un peu haut (digue, môle) t'aide à repérer les bancs qui montent dans la couche du dessus à la tombée du jour.`,
    `Côté conditions, l'oblade aime le calme et la lumière déclinante. Vise un vent sous 15 km/h, une mer plate à peine ridée et une eau claire : c'est l'inverse du sar, qui lui veut du ressac. Le créneau en or, c'est le coup du soir (l'heure qui précède et qui suit le coucher du soleil) et la première partie de nuit, quand l'oblade perd sa méfiance et chasse activement entre deux eaux. En plein cagnard de midi, par eau cristalline, elle devient quasi impêchable : affine alors les diamètres ou attends le crépuscule.`,
    `En Méditerranée, le marnage est négligeable : ce n'est pas la marée qui commande, mais la lumière et le courant. Un léger courant de bordure qui longe la digue est un plus : il étale le broumé et amène les bancs sur ton coup. Amorce régulièrement, à petites doses, pour garder les oblades devant toi toute la session. Un poste broumé et tenu vaut bien mieux que dix lancers dispersés.`,
  ],

  faq: [
    {
      q: `Quelle est la taille minimale de capture de l'oblade ?`,
      a: `Il n'y a pas de taille minimale réglementaire nationale pour l'oblade en pêche de loisir : l'espèce ne figure ni à l'arrêté du 26 octobre 2012, ni au règlement (CE) 1967/2006. Attention toutefois : dans le Parc naturel marin du Golfe du Lion, une maille locale de 20 cm s'applique, avec un quota de 10 poissons par jour et une autorisation requise (arrêté préfectoral du 12/02/2024). Et même sans maille nationale, relâche les petits sujets : un poisson de 25-30 cm fait une belle prise.`,
    },
    {
      q: `Comment reconnaître une oblade d'un sar ?`,
      a: `Regarde la queue : l'oblade porte une grosse tache noire bien nette, cerclée de blanc, juste à la base de la nageoire caudale. C'est sa signature, aucun sar n'a ça. Le sar, lui, a des barres verticales sombres sur tout le corps et vit collé au caillou dans le ressac, alors que l'oblade nage entre deux eaux, plus élancée, avec de fines lignes longitudinales argentées.`,
    },
    {
      q: `Quel est le meilleur moment pour pêcher l'oblade du bord ?`,
      a: `Le coup du soir, sans hésiter. L'oblade est méfiante de jour en eau claire, mais à la tombée du jour et en début de nuit elle monte chasser entre deux eaux et perd sa prudence. Vise une mer plate, un vent faible et l'heure qui entoure le coucher du soleil. Côté saison, l'été est le pic en Méditerranée, avec de belles sessions au printemps et à l'automne.`,
    },
    {
      q: `Quel appât et quel montage pour l'oblade ?`,
      a: `Pêche fine à la flottante : flotteur léger de 2 à 5 g, esche réglée entre 1,5 et 3 m de profondeur (entre deux eaux), bas de ligne discret en 14-18/100. Côté appât, le pain (boulette ou croûte) est redoutable, suivi du ver, de la fine lanière de sardine et du morceau de crevette. Un broumé léger de pain ou de sardine pilée fixe le banc devant toi et fait toute la différence.`,
    },
  ],
}
