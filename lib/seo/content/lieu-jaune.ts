import type { SpeciesContent } from './types'

/**
 * Contenu éditorial lieu jaune (Pollachius pollachius) — pages programmatiques.
 * Techniques autorisées par la matrice : leurres, vif.
 * Espèce d'eau froide : Manche + Atlantique nord uniquement, absente de Méditerranée.
 */
export const lieuJauneContent: SpeciesContent = {
  intro: [
    `Le lieu jaune, c'est le poisson des eaux froides et profondes. Du bord, tu ne le trouveras pas sur la plage de sable : il te faut une pointe rocheuse qui plonge vite, une digue portuaire ou un tombant avec 8 à 15 m d'eau à portée de lancer. Bretagne ouest et nord, Cotentin : c'est là que ça se passe. Et sa défense ne trompe pas : des rushs vers le fond caractéristiques qui mettent le frein à l'épreuve.`,
    `La fenêtre est courte : le lieu chasse près du fond et monte rarement en pleine journée. Tôt le matin, dans la pénombre, il s'approche des roches pour chasser le lançon : la première heure de jour vaut souvent plus que tout le reste de la session.`,
    `Deux approches du bord : le leurre souple ramené lentement près du fond, ou le vif — lançon en tête — présenté en dérive. Dans les deux cas, la règle est la même : pêche profond, pêche lent, pêche tôt.`,
  ],

  techniques: {
    leurres: {
      paragraphs: [
        `Pour le lieu jaune du bord, oublie les animations nerveuses : c'est le linéaire lent près du fond qui prend. Monte un shad ou un slug finesse de 10 à 15 cm sur tête plombée de 10 à 25 g selon la profondeur et le courant — assez lourd pour rester dans le dernier mètre au-dessus du fond, assez léger pour que le leurre nage à vitesse réduite. Couleurs naturelles d'abord : blanc nacré, ayu, imitation lançon. Lance loin, laisse couler jusqu'au contact du fond, puis ramène en linéaire très lent, deux ou trois tours de manivelle, en gardant le contact. Les touches sont franches : un arrêt brutal ou un coup sec, puis le poisson plonge.`,
        `Le poste fait tout. Cherche les pointes rocheuses où tu as plus de 8 m d'eau à moins de 50 m du bord, les digues avec enrochements et les tombants. Une canne de 2,40 à 2,70 m puissance 10-35 g, tresse PE 1 à 1.5 et un fluoro de 30 à 35/100 en pointe font l'affaire — le fluoro encaisse les frottements sur la roche, inévitables quand tu pêches aussi près du fond. Tu vas accrocher : prévois des têtes plombées en nombre, c'est le prix du lieu jaune du bord.`,
      ],
      bullets: [
        `Shads et slugs finesse 10-15 cm, coloris naturels (blanc nacré, imitation lançon)`,
        `Têtes plombées 10-25 g, à adapter à la profondeur et au courant — stock conséquent, les accrocs font partie du jeu`,
        `Canne 2,40-2,70 m, 10-35 g, tresse PE 1-1.5 + pointe fluoro 30-35/100`,
        `Récupération : linéaire lent dans le dernier mètre au-dessus du fond, sans animation`,
        `Poste : 8 m d'eau minimum à portée de lancer — pointe rocheuse, digue, tombant`,
        `Créneau roi : la première heure de jour, avant que le soleil tape`,
      ],
      seasonNote: `D'avril-mai à octobre sur les pointes bretonnes, avec un pic net en début et fin de saison quand l'eau est fraîche ; en plein été, seules les premières lueurs du jour restent vraiment productives.`,
    },
    vif: {
      paragraphs: [
        `Le vif est sans doute la technique la plus régulière pour le lieu jaune du bord — et le lançon est le vif roi, c'est sa proie naturelle numéro un. Deux montages selon le poste. En dérive sous flotteur : un flotteur coulissant réglé pour présenter le lançon à 1 ou 2 m du fond, un bas de ligne fluoro 30/100 d'environ 1,50 m et un hameçon fin de fer n°1 à 2/0 piqué dans la lèvre ou derrière la tête pour que le vif nage librement. Tu laisses dériver le long du tombant avec le courant, et tu couvres du terrain sans ramener.`,
        `Sur les postes sans dérive exploitable, passe à la plombée légère : un plomb olive coulissant de 20 à 40 g, un émerillon, et le même bas de ligne long pour que le lançon évolue décollé du fond. Tends la ligne, ouvre le pick-up ou règle un frein léger : le lieu engame en s'éloignant, laisse-lui une à deux secondes avant de ferrer, sinon tu le piques du bout des lèvres. À défaut de lançon, une petite vieille ou un tacaud font le job, mais l'écart de résultats est réel. Garde tes vifs en seau aéré, un lançon mort pêche dix fois moins.`,
      ],
      bullets: [
        `Vif n°1 : le lançon (à pêcher au mini-jig ou à la mitraillette sur le sable à proximité)`,
        `Flotteur coulissant réglé 1-2 m au-dessus du fond pour la dérive le long des tombants`,
        `Plombée légère : olive coulissante 20-40 g + émerillon pour les postes sans courant`,
        `Bas de ligne fluoro 30/100, 1,50 m, hameçon fin de fer n°1 à 2/0 piqué dans la lèvre`,
        `Ferrage différé : laisse le poisson engamer 1-2 secondes ligne libre`,
        `Vivier ou seau aéré obligatoire — un lançon vif fait toute la différence`,
      ],
      seasonNote: `De mai à septembre-octobre, quand les lançons sont présents sur les plages voisines ; pêche le vif aux mêmes heures que le leurre, aube en tête, et sur les étales de courant quand la dérive devient pêchable.`,
    },
  },

  facades: {
    'manche-atlantique': `Tu es ici au cœur de l'aire du lieu jaune du bord. Les pointes du Finistère (Crozon, Cap Sizun, pays des abers), les caps des Côtes-d'Armor et la côte ouest du Cotentin offrent ce qu'il lui faut : de l'eau profonde collée à la roche, des courants marqués et une eau qui reste fraîche. Plus tu descends vers le sud de l'Atlantique, plus il devient rare du bord — au sud de la Loire, c'est surtout une pêche bateau. Vise les digues profondes et les pointes battues, et accepte que ce soit une pêche de lève-tôt.`,
    mediterranee: `Le lieu jaune est un poisson d'eau froide : il est absent de Méditerranée, et on ne l'y pêche pas du bord. Si tu pêches sur cette façade, regarde plutôt nos pages sar, dorade royale ou bar.`,
  },

  conditions: `Le lieu jaune aime l'eau qui bouge : les coefficients moyens à forts relancent le courant le long des tombants et activent les chasses près du fond. Les meilleures phases du bord sont le montant et les deux heures qui encadrent la pleine mer — plus de hauteur d'eau sur tes roches, donc le poisson s'approche. Regarde la courbe de marée du spot et cale ta session pour que l'aube tombe sur le montant : c'est la combinaison gagnante. Un vent modéré qui ride la surface aide, une mer trop formée rend la pêche au ras du fond impossible. Eau claire à légèrement teintée, et évite les coups de chaud prolongés qui le renvoient au large.`,
}
