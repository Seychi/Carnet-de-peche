import type { EspeceContent } from '../types'

/**
 * Fiche espèce ORPHIE (Belone belone) — /especes/orphie.
 * Réglementation vérifiée le 12/06/2026 (chiffres injectés, ne pas modifier
 * sans re-vérification aux sources).
 */
export const orphieEspece: EspeceContent = {
  slug: 'orphie',

  intro: [
    `L'orphie, c'est la flèche argentée des beaux jours : 50 à 70 cm de poisson qui chasse dans la pellicule d'eau, attaque franchement et enchaîne les chandelles une fois piquée. Visible depuis n'importe quelle digue dès que l'eau se réchauffe, c'est LA pêche idéale pour débuter du bord.`,
    `Tu la repères avant même de lancer : gerbes d'eau en surface, alevins qui giclent, parfois un bec fin qui fend la pellicule à 30 m de la digue. L'orphie chasse en bancs dans les deux premiers mètres d'eau, souvent à portée de lancer des jetées, des pointes rocheuses et des sorties de port. Pas besoin de matériel lourd ni de lever à 5 h : par mer calme, elle mord en pleine journée.`,
    `Sa seule vraie difficulté, c'est le ferrage. Son long bec osseux et étroit laisse peu de prise à l'hameçon : tu vas rater des touches, tout le monde en rate. C'est exactement ce qui rend cette pêche addictive, et une école parfaite pour apprendre à temporiser une touche au lieu de ferrer comme une brute. Lanière de maquereau sous flotteur ou petite cuiller ramenée vite : deux approches simples, des sauts garantis.`,
  ],

  identity: {
    famille: 'Bélonidés (Belone belone)',
    tailleCourante: '40-60 cm du bord, 70 cm pour les beaux sujets',
    tailleMax: 'environ 90 cm pour à peine 1 kg',
    habitat: `Pleine eau côtière, dans les deux premiers mètres sous la surface : digues, pointes, sorties d'estuaire`,
    regime: 'Lançons, alevins, sprats et petits crustacés chassés en surface',
  },

  regulation: {
    verifiedAt: '21/06/2026',
    source: 'Arrêté du 26 octobre 2012 modifié le 6 janvier 2026 (tailles minimales pêche de loisir)',
    minSizeCm: { 'manche-atlantique': 30, mediterranee: null },
    marquage: false,
    items: [
      `<strong>Maille : 30 cm</strong> en Manche et Atlantique : toute orphie sous cette taille doit être remise à l'eau immédiatement. En Méditerranée, l'espèce n'a pas de taille minimale réglementaire.`,
      `<strong>Pas de quota national</strong> en pêche de loisir, reste raisonnable, prélève ce que tu manges.`,
      `<strong>Arêtes vertes naturelles</strong> : c'est la biliverdine, un pigment inoffensif. L'orphie est parfaitement comestible.`,
    ],
  },

  saisons: {
    'manche-atlantique': [
      {
        saison: 'Printemps',
        activite: 2,
        note: `Les premiers bancs touchent les digues courant avril-mai, dès que l'eau passe les 14-15 °C. Encore irrégulier : repère les chasses avant de t'installer.`,
      },
      {
        saison: 'Été',
        activite: 3,
        note: `Pleine saison : bancs denses le long des digues et des pointes, chasses visibles à 100 m, ça mord du matin au soir par mer calme.`,
      },
      {
        saison: 'Automne',
        activite: 2,
        note: `Les bancs filent vers le large en septembre-octobre. Dernières belles sessions au petit matin, puis le départ est rapide et complet.`,
      },
      {
        saison: 'Hiver',
        activite: 1,
        note: `Absente du bord : l'orphie hiverne au large. Range la canne à flotteur et reviens guetter les premières gerbes en avril.`,
      },
    ],
    mediterranee: [
      {
        saison: 'Printemps',
        activite: 3,
        note: `Saison précoce : les bancs arrivent dès mars-avril sur les digues et les enrochements. Eau claire de printemps, sessions superbes au petit matin.`,
      },
      {
        saison: 'Été',
        activite: 3,
        note: `Présence massive. Vise la mer d'huile du petit matin avant le thermique ; un peu de sardine pilée fixe le banc devant toi toute la session.`,
      },
      {
        saison: 'Automne',
        activite: 2,
        note: `L'orphie reste jusqu'en novembre, bien plus tard qu'en Atlantique. Profite des fenêtres de calme entre deux coups de vent d'est.`,
      },
      {
        saison: 'Hiver',
        activite: 1,
        note: `Quelques traînards en tout début d'hiver, puis plus rien : les bancs regagnent le large jusqu'au retour de mars.`,
      },
    ],
  },

  techniques: [
    {
      slug: 'flottante',
      why: `La technique reine : une lanière de maquereau de 5-6 cm sous un flotteur réglé entre 0,5 et 1,5 m. À la touche, rends la main 3 à 5 secondes avant de mettre en tension. Sur ce bec osseux, le ferrage différé fait toute la différence.`,
    },
    {
      slug: 'leurres',
      why: `Petites cuillers argentées de 5 à 12 g ramenées vite, canne haute, dans les 50 premiers centimètres. Pour améliorer le ratio, remplace le triple par un simple à hampe longue, ou passe au floss sans hameçon : ses micro-dents s'emmêlent dans les fibres et le poisson repart intact.`,
    },
  ],

  postes: [
    `Cherche 2 à 3 m d'eau claire à portée de lancer : digues et jetées portuaires, pointes rocheuses, sorties d'estuaire. L'orphie ne colle pas au fond, elle patrouille la pellicule. Un poste haut comme une digue te donne un avantage énorme pour repérer les bancs et lancer au-delà. Si tu vois des gerbes d'eau ou des oiseaux qui piquent, ne réfléchis pas : chaque lancer dans la chasse compte.`,
    `Le vent et la houle décident de ta session plus que tout le reste. Vise un vent sous 15 km/h et plusieurs jours sans houle : l'eau s'éclaircit, la surface se lisse, et les orphies remontent franchement. Une mer ridée ou teintée après un coup de vent, et les bancs décollent du bord. En Méditerranée, tout se joue sur la lumière : petit matin, mer d'huile, avant que le thermique ne se lève.`,
    `Sur la Manche et l'Atlantique, pêche la montante et le tout début de la descendante : le courant plaque les bancs le long des ouvrages, et les deux heures avant la pleine mer sont souvent les meilleures. Repère les horaires de pleine mer de ton spot avant de partir. Arriver à mi-montante, c'est pêcher quand ça s'allume au lieu d'attendre que ça démarre.`,
  ],

  faq: [
    {
      q: `Pourquoi l'orphie a-t-elle les arêtes vertes, est-elle comestible ?`,
      a: `Cette couleur vient de la biliverdine, un pigment naturel totalement inoffensif présent dans ses os. L'orphie est parfaitement comestible : chair fine, légèrement iodée, parfaite en filets poêlés ou en escabèche. La couleur verte surprend dans l'assiette, mais elle n'altère ni le goût ni la qualité du poisson, c'est sa signature, pas un défaut.`,
    },
    {
      q: `Quelle est la taille minimale de capture de l'orphie ?`,
      a: `La maille est de 30 cm en Manche et Atlantique (arrêté du 26 octobre 2012 modifié le 6 janvier 2026) ; en Méditerranée, l'orphie n'a pas de taille minimale réglementaire. Il n'y a pas de quota national, et la plupart des poissons pris du bord font 40 à 60 cm, donc bien au-dessus de la maille.`,
    },
    {
      q: `Comment ferrer une orphie sans la décrocher ?`,
      a: `Surtout pas de ferrage sec : son bec osseux et étroit offre très peu de prise. À la flottante, ouvre le pick-up et compte 3 à 5 secondes pour la laisser engamer la lanière, puis mets en tension progressivement. Aux leurres, monte un hameçon simple fin de fer à hampe longue à la place du triple, et garde la ligne tendue mais souple pendant les sauts.`,
    },
    {
      q: `À quelle période pêcher l'orphie du bord ?`,
      a: `D'avril-mai à septembre-octobre sur la Manche et l'Atlantique, avec un pic en plein été quand l'eau dépasse les 14-15 °C. En Méditerranée, la saison est plus large : les bancs arrivent dès mars-avril et restent jusqu'en novembre. En hiver, elle gagne le large : inutile d'insister depuis le bord, attends le retour des beaux jours.`,
    },
  ],
}
