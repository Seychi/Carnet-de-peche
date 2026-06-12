import type { SpeciesContent } from './types'

/**
 * Contenu éditorial — BAR (Dicentrarchus labrax).
 * L'espèce reine du bord en France : 4 techniques couvertes (leurres,
 * surfcasting, vif, flottante). Rédigé pour les pages programmatiques
 * /peche/bar/<technique>/<dépt>.
 */
export const barContent: SpeciesContent = {
  intro: [
    `Le bar, c'est l'espèce reine du bord en France. Présent de Dunkerque à Hendaye et sur toute la Méditerranée — où on l'appelle loup —, c'est un chasseur opportuniste qui colle littéralement au caillou : il remonte dans 50 cm d'eau pour pousser les lançons sur le sable, patrouille les estuaires à la montante et vient fouiller l'écume des plages la nuit.`,
    `Ce qui le rend passionnant du bord, c'est qu'il se pêche de mille façons : leurre souple raclé près du fond, stickbait qui zigzague en surface, ver d'arénicole posé dans une baïne à 2h du matin, lançon vivant dérivé sous une pointe, crevette sous un flotteur le long d'un quai. Quatre techniques, quatre saisons, quatre ambiances.`,
    `Du poisson maillé de 45 cm au spécimen de 80 cm et 5 kg, le bar récompense ceux qui lisent l'eau : courant, lumière, vague, horaire de marée. C'est exactement ce qu'on t'aide à croiser avec ton carnet.`,
  ],

  techniques: {
    leurres: {
      paragraphs: [
        `Deux familles de leurres font 90 % de tes bars du bord. D'abord le leurre souple pêché entre deux eaux : un shad de 10 à 12 cm monté sur tête plombée de 7 à 15 g selon le courant — 7 g dans 2 m d'eau calme, 12-15 g quand la veine de courant pousse fort sur une pointe. Tu lances en amont du courant, tu laisses descendre, et tu ramènes lentement, juste assez vite pour sentir la caudale battre, en redonnant du mou à chaque relâché. Les postes battus — pointes rocheuses, sorties de parcs, têtes de roche qui brassent — sont les meilleurs : le bar s'y poste face au courant et frappe ce qui passe.`,
        `Ensuite la surface, la pêche la plus addictive : un stickbait de 9 à 12 cm animé en walking the dog, gauche-droite régulier, sur les chasses à vue ou les plateaux rocheux recouverts de 1 à 2 m d'eau. Règle d'or : ne ferre jamais sur l'explosion. Continue d'animer une seconde, attends de sentir le poids du poisson, puis ferre ample. La moitié des attaques en surface sont ratées par le bar lui-même — laisse-lui une deuxième chance au lieu de lui arracher le leurre de la gueule.`,
      ],
      bullets: [
        `Canne spinning 2,30-2,70 m, puissance 7-28 g ou 10-35 g, action de pointe`,
        `Tresse PE 1.2 à 1.5 + tête de ligne fluorocarbone 28-30/100 (1,5 m)`,
        `Shads 10-12 cm coloris naturels (sardine, lançon, blanc nacré), têtes plombées 7-15 g`,
        `Stickbaits et poppers 9-12 cm pour la surface, jerkbait minnow 10-12 cm en plan B`,
        `Pince longue + épuisette ou grip : le bar se décroche vite au bord`,
        `Déplace-toi : 10 lancers par poste, pas 100 — un bar actif tape dans les 3 premiers passages`,
      ],
      seasonNote: `D'avril à novembre partout, avec deux pics : mai-juin et septembre-octobre. La surface donne surtout de juin à octobre, aux premières lueurs et au coup du soir.`,
    },

    surfcasting: {
      paragraphs: [
        `Le surfcasting à bar, c'est la nuit, sur les plages océanes, avec de l'appât frais. Oublie les lancers à 120 m : le bar chasse dans la première baïne, souvent à 20-40 m du sable, là où la vague creuse et déterre les vers et les couteaux. Va lire ta plage à marée basse en plein jour : repère les baïnes, les sorties d'eau, les bancs de coquillages, et note les alignements. La nuit, tu pêches ces structures-là à la remontante, idéalement la deuxième moitié de montante jusqu'à une heure après la pleine mer.`,
        `Côté montage, simple et solide : empile basse ou montage coulissant, hameçon 2/0 à 3/0 à hampe longue, plomb de 100 à 150 g — grappin si le courant latéral déporte ta ligne. L'arénicole reste l'appât numéro un, le couteau juste derrière (superbe après un coup de mer qui en a arraché du sable), le crabe mou en option quand les petits poissons pillent tout. Esche généreusement : un bar de 60 cm n'a pas peur d'une bouchée de 10 cm. Une mer avec 1 m à 1,5 m de vague et de l'écume vaut dix fois une mer d'huile.`,
      ],
      bullets: [
        `Canne surf 4,20-4,50 m, puissance 100-200 g, moulinet 8000 avec 30-35/100 ou tresse + arraché`,
        `Empile basse ou coulissant, hameçon 2/0-3/0 hampe longue, bas de ligne 35-40/100`,
        `Plombs 100-150 g, grappin dès que le courant latéral fait dériver`,
        `Arénicole et couteau en priorité, crabe mou en secours`,
        `Frontale en lumière rouge pour ne pas balayer l'eau de blanc`,
        `Repère ta plage à basse mer le jour : baïnes et sorties d'eau = 80 % des touches`,
      ],
      seasonNote: `Meilleure période : septembre à décembre, de nuit, sur une mer formée 24-48 h après un coup de vent. Le printemps (avril-mai) donne aussi sur les plages abritées.`,
    },

    vif: {
      paragraphs: [
        `La pêche au vif sous les pointes rocheuses, c'est la technique des gros bars. Le principe : présenter un lançon ou un chinchard vivant dans la veine de courant qui longe la pointe, là où les prédateurs patrouillent. Première étape, capturer tes vifs sur place au sabiki (train de plumes) — lançons de 15-20 cm ou petits chinchards — et les garder en pleine forme dans un seau aéré ou un vivier flottant. Un vif mou ne vaut rien : change-le dès qu'il fatigue.`,
        `Montage classique : flotteur coulissant de 20 à 40 g réglé pour présenter le vif entre 2 et 4 m sous la surface, bas de ligne fluorocarbone 40/100 de 1,5 m, hameçon simple fort de fer 2/0 à 4/0 piqué dans les naseaux ou devant la dorsale. Tu laisses dériver dans le courant, tu accompagnes la coulée canne haute, et quand le flotteur plonge tu comptes deux à trois secondes avant de ferrer — le bar engame souvent en deux temps. C'est une pêche de patience et de créneaux courts : la demi-heure où le courant s'établit après l'étale concentre la majorité des touches.`,
      ],
      bullets: [
        `Canne 3-3,60 m, puissance 30-80 g, moulinet 5000 garni de 30/100 ou tresse PE 2`,
        `Flotteur coulissant 20-40 g + perle et stop-float, plombée groupée sous le flotteur`,
        `Bas de ligne fluoro 40/100, hameçon simple fort de fer 2/0-4/0 piqué naseaux ou dos`,
        `Vifs : lançon 15-20 cm ou petit chinchard, capturés au sabiki sur le poste`,
        `Seau aéré ou vivier flottant pour garder les vifs nerveux — change un vif fatigué`,
        `Compte 2-3 secondes à la plongée du flotteur avant le ferrage`,
      ],
      seasonNote: `De juin à novembre, quand lançons et chinchards stationnent sous les pointes. Vise la première heure de courant après l'étale, montante comme descendante.`,
    },

    flottante: {
      paragraphs: [
        `La crevette vivante sous un flotteur, c'est la pêche fine du bar dans les ports, les bassins et les estuaires — et c'est redoutable quand tout le reste échoue. Le matériel descend d'un cran : canne légère de 4 à 5 m ou canne anglaise, flotteur de 2 à 6 g, nylon 24/100 en corps de ligne et pointe fluoro 22-26/100, hameçon fin de fer n°4 à 6. La crevette se pique sous la corne ou dans le dernier anneau de la queue pour qu'elle reste vivante et gigote : c'est ce frétillement qui déclenche la touche.`,
        `La clé, c'est la lecture du port : les bars longent les quais à l'ombre des coques, se postent sous les pontons, les piles de pont et les sorties d'eau douce. Règle ton flotteur pour présenter la crevette entre 1 et 3 m, et fais glisser ta dérive le long des structures plutôt qu'en plein milieu du bassin. Les touches sont franches mais courtes : ferre dès que le flotteur s'enfonce franchement. Pêche en te déplaçant, un quai après l'autre, surtout aux heures calmes — tôt le matin avant l'activité du port, ou en hiver quand les bars se replient dans les bassins où l'eau reste plus tempérée.`,
      ],
      bullets: [
        `Canne 4-5 m légère ou anglaise 3,90 m, moulinet 2500-3000, nylon 24/100`,
        `Flotteur fixe ou coulissant 2-6 g, plombée étalée discrète`,
        `Pointe fluorocarbone 22-26/100, hameçon fin de fer n°4-6`,
        `Crevettes vivantes (bouquet ou grise), piquées sous la corne ou dans la queue`,
        `Petit vivier ou seau aéré pour garder les crevettes vives`,
        `Pêche l'ombre : coques, pontons, piles, sorties d'eau douce`,
      ],
      seasonNote: `Efficace toute l'année dans les ports, avec un vrai pic en hiver (décembre-février) quand les bars se concentrent dans les bassins. En Méditerranée, privilégie le lever du jour.`,
    },
  },

  facades: {
    'manche-atlantique': `Ici, la marée commande tout : un poste mort à basse mer devient une autoroute à bars deux heures après la renverse. Les coefficients de 70 à 95 brassent l'eau juste ce qu'il faut — au-delà de 100, le courant et la turbidité compliquent la présentation. Les estuaires bretons et les rias (Trieux, abers, Aven) se pêchent à la montante, quand le bar remonte avec le flot ; les baïnes landaises et les plages océanes donnent de nuit au surfcasting. Cale chaque session sur les horaires de pleine et basse mer de ton spot, pas sur ta montre.`,
    mediterranee: `Le loup méditerranéen est le même poisson, mais il a vu passer beaucoup plus de leurres : eau claire et pression de pêche obligent à affiner. Descends en 22-26/100 fluoro, réduis tes leurres à 7-10 cm, soigne la discrétion. Sans marée significative, c'est la lumière qui rythme tout : le lever du jour est LE créneau, le coup du soir juste derrière. Vise les digues, les enrochements de port, les graus et les étangs (Thau, Berre), et guette les coups d'est : une embouchure brassée après le vent remet les loups en chasse pour 48 h.`,
  },

  conditions: `Le bar aime l'eau qui bouge. Sur la façade Manche-Atlantique, les meilleurs créneaux encadrent la renverse : les deux dernières heures de montante et la première de descendante concentrent l'activité, sur des coefficients moyens à forts. En lumière, l'aube et le crépuscule dominent — et la nuit noire pour le surfcasting. Un vent de mer de 15 à 25 km/h qui teinte légèrement l'eau vaut mieux qu'une mer d'huile sous grand soleil ; après un coup de vent, pêche les embouchures et les plages dès que l'eau commence à clarifier. Croise les horaires de marée de ton spot avec tes propres prises : ton pattern vaut plus que la moyenne.`,
}
