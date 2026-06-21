import type { EspeceContent } from '../types'

/**
 * Fiche espèce lieu jaune (Pollachius pollachius) — /especes/lieu-jaune.
 * Angle : le combattant d'eau froide des pointes profondes.
 * Façade unique : Manche + Atlantique nord (absent de Méditerranée → saisons []).
 * Réglementation vérifiée le 12/06/2026 (arrêté du 24 décembre 2024).
 */
export const lieuJauneEspece: EspeceContent = {
  slug: 'lieu-jaune',

  intro: [
    `Le lieu jaune, c'est le combattant d'eau froide des pointes profondes : un premier rush vers la roche qui plie la canne et punit un frein trop serré. Du bord, il se mérite — 8 à 15 m d'eau à portée de lancer, l'aube, et un leurre ramené lentement au ras du fond.`,
    `Ce gadidé — cousin de la morue — vit collé aux structures : tombants rocheux, têtes de roche, piles de digues. Il chasse le lançon près du fond et monte rarement en pleine eau passé le lever du jour. En France, son territoire du bord se résume à la Manche et à l'Atlantique nord : pointes du Finistère, caps des Côtes-d'Armor, ouest du Cotentin. Au sud de la Loire, il devient anecdotique depuis la côte, et en Méditerranée il est tout simplement absent.`,
    `Depuis l'arrêté du 24 décembre 2024, la donne a changé : pêche fermée du 1er janvier au 30 avril, maille à 42 cm, deux poissons par jour. Résultat, la réouverture de mai est devenue LE rendez-vous de l'année — des poissons frais, peu sollicités, et des lançons de retour sur les côtes. Cette fiche te donne les saisons, les deux techniques qui prennent vraiment du bord — souple finesse et vif de lançon — et les postes selon le vent, la houle et la marée.`,
  ],

  identity: {
    famille: 'Gadidés (Pollachius pollachius), cousin de la morue et du tacaud',
    tailleCourante: '35-50 cm du bord, 60 cm+ sur les pointes profondes',
    tailleMax: "≈ 1,30 m pour 18 kg (sujets de pleine eau, rarissimes du bord)",
    habitat: 'Tombants rocheux, digues et pointes avec 8-15 m d’eau, eaux fraîches Manche / Atlantique nord',
    regime: 'Chasseur de fond : lançons en tête, petits poissons, céphalopodes, crustacés',
  },

  regulation: {
    verifiedAt: '21/06/2026',
    source:
      'Arrêté du 24 décembre 2024 (fermeture + quota, zones CIEM 7 et 8) ; arrêté du 26 octobre 2012 modifié (maille) ; arrêté du 17 mai 2011 modifié (marquage)',
    minSizeCm: { 'manche-atlantique': 42, mediterranee: null },
    marquage: true,
    items: [
      `<strong>Maille : 42 cm</strong> en Manche et Atlantique — tout lieu jaune sous cette taille doit être relâché immédiatement.`,
      `<strong>Quota : 2 lieus jaunes par jour et par pêcheur</strong>, toutes techniques confondues.`,
      `<strong>Fermeture totale du 1er janvier au 30 avril</strong> — aucune capture ni détention pendant cette période.`,
      `<strong>Marquage obligatoire</strong> de chaque lieu jaune conservé : ablation de la partie inférieure de la nageoire caudale.`,
    ],
  },

  saisons: {
    'manche-atlantique': [
      {
        saison: 'Printemps',
        activite: 3,
        note: `Fermeture jusqu'au 30 avril, puis réouverture en force : poissons frais sur les tombants, lançons de retour, le meilleur créneau de l'année avec l'automne.`,
      },
      {
        saison: 'Été',
        activite: 2,
        note: `L'eau chauffe et le lieu décroche vers le large : seule la première heure de jour produit encore sur les pointes profondes.`,
      },
      {
        saison: 'Automne',
        activite: 3,
        note: `Eau qui refroidit, lançons encore présents : les beaux sujets reviennent à portée de lancer. De septembre à décembre, la régularité est excellente.`,
      },
      {
        saison: 'Hiver',
        activite: 1,
        note: `Pêche fermée du 1er janvier au 30 avril : aucune capture ni détention. Repère tes tombants aux grandes marées basses en attendant mai.`,
      },
    ],
    mediterranee: [],
  },

  techniques: [
    {
      slug: 'leurres',
      why: `Le souple finesse de 10-15 cm sur tête plombée de 10-25 g, ramené en linéaire très lent dans le dernier mètre au-dessus du fond, est l'arme numéro un : c'est l'imitation directe du lançon qu'il chasse le long des tombants.`,
    },
    {
      slug: 'vif',
      why: `Le vif — lançon en tête — présenté en dérive sous flotteur ou en plombée légère décollée du fond reste la valeur sûre des postes profonds, surtout quand le lieu boude les leurres une fois le soleil levé.`,
    },
  ],

  postes: [
    `Le bon poste à lieu jaune se reconnaît à une seule chose : la profondeur collée au bord. Vise les pointes rocheuses qui plongent vite — 8 m d'eau minimum à moins de 50 m —, les digues portuaires profondes et les tombants avec du courant. Finistère, Côtes-d'Armor, Cotentin : c'est là que ces profils existent du bord. Oublie les plages et le sable plat : sans relief ni hauteur d'eau, pas de lieu.`,
    `Le moment de marée pèse plus que la météo. Les phases fortes du bord sont le montant et les deux heures qui encadrent la pleine mer : plus de hauteur d'eau sur tes roches, un courant relancé qui active les chasses au ras du fond. Les coefficients moyens à forts amplifient le phénomène le long des tombants. Cale ta session pour que l'aube tombe sur le montant — la courbe de marée et les horaires de pleine et basse mer de ton spot suffisent à le planifier. Aux étales, ralentis encore la récupération.`,
    `Côté ciel : un vent modéré qui ride la surface te sert, il casse la luminosité et rapproche le poisson de la roche. Une houle au-delà de 1,5 m, en revanche, rend la pêche au ras du fond impossible — dérive incontrôlable, accrochages en série, et des pointes battues qui deviennent dangereuses. Cherche une mer peu agitée, une eau claire à légèrement teintée, et méfie-toi des coups de chaud prolongés qui renvoient les poissons au large.`,
  ],

  faq: [
    {
      q: 'Quelle est la taille minimale et le quota pour le lieu jaune en 2026 ?',
      a: `La maille est fixée à 42 cm et le quota à 2 lieus jaunes par jour et par pêcheur. La pêche de loisir est totalement fermée du 1er janvier au 30 avril — aucune capture ni détention — et tout poisson conservé doit être marqué. Source : arrêté du 24 décembre 2024, vérifié le 12/06/2026.`,
    },
    {
      q: 'Quelle est la meilleure période pour pêcher le lieu jaune du bord ?',
      a: `Mai-juin, juste après la réouverture : des poissons frais, peu sollicités, et des lançons de retour sur les côtes. L'automne, de septembre à décembre, est l'autre grand moment, quand l'eau refroidit. En été, limite-toi à la première heure de jour. Et rappel : la pêche est fermée du 1er janvier au 30 avril.`,
    },
    {
      q: 'Quel leurre pour le lieu jaune du bord ?',
      a: `Un souple finesse de 10 à 15 cm — shad ou slug imitation lançon, blanc nacré ou ayu — sur tête plombée de 10 à 25 g selon la profondeur et le courant. L'animation qui prend : laisser couler jusqu'au contact du fond, puis un linéaire très lent dans le dernier mètre. Prévois du stock de têtes, les accrochages font partie du jeu.`,
    },
    {
      q: 'Où pêcher le lieu jaune du bord en France ?',
      a: `Sur les façades Manche et Atlantique nord : pointes du Finistère (Crozon, Cap Sizun, abers), caps des Côtes-d'Armor, ouest du Cotentin. Il faut 8 m d'eau et plus à portée de lancer — pointes rocheuses, digues profondes, tombants. Au sud de la Loire, il devient rare depuis la côte, et il est absent de Méditerranée.`,
    },
  ],
}
