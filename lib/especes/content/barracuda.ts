import type { EspeceContent } from '../types'

/**
 * Fiche espèce — Barracuda / bécune (Sphyraena viridensis).
 * Angle : le prédateur de surface des digues éclairées et des ports méditerranéens,
 * pêché au minnow effilé à la tombée du jour et de nuit.
 * Façade : Méditerranée (cœur de zone). Quasi absent du bord en Manche-Atlantique
 * → tableau rempli mais honnête (activite 1, eau trop froide).
 * Réglementation vérifiée le 24/06/2026 : aucune maille nationale (absent de l'arrêté
 * du 26/10/2012) ; ne JAMAIS inventer de chiffre national.
 */
export const barracudaEspece: EspeceContent = {
  slug: 'barracuda',

  intro: [
    `Le barracuda — la bécune, comme on dit sur la côte — c'est le prédateur effilé qui patrouille les digues et les ports de Méditerranée. Un fuseau d'argent posté en chasse sous les lampadaires, une attaque foudroyante sur ton minnow à trois mètres du bord, et un premier rush qui te scie le poignet : du bord, peu de poissons offrent une touche aussi violente.`,
    `Tu le croises le long des grandes digues portuaires, dans les ports eux-mêmes, sur les secs rocheux à portée de lancer et aux embouchures où défilent les mulets. C'est un poisson de bordure et de surface : il chasse l'aube, le crépuscule et surtout la nuit, quand il se rapproche du bord pour cueillir les petits poissons attirés par la lumière. En plein été, sous un soleil de plomb et sur mer d'huile, il devient méfiant et difficile à leurrer ; c'est fin d'été, en automne et même en plein hiver que les plus belles bécunes se prennent.`,
    `Une technique domine du bord : le leurre dur effilé, minnow ou jerk de 12 à 17 cm, lancé loin et ramené lentement avec des pauses marquées — la bécune attaque neuf fois sur dix sur l'arrêt. Attention aux dents : un bas de ligne fluorocarbone costaud (autour de 35/100) n'est pas un luxe. Et avant de garder un beau sujet, lis la réglementation ci-dessous : il n'y a pas de maille nationale, mais une règle locale existe dans le Golfe du Lion.`,
  ],

  identity: {
    famille: 'Sphyraenidés (Sphyraena viridensis), le barracuda de Méditerranée',
    tailleCourante: '50-80 cm du bord, 90 cm+ pour les beaux sujets de digue',
    tailleMax: 'Environ 1,30 m, les très gros sujets restant rares du bord',
    habitat: 'Digues portuaires, ports éclairés, secs rocheux et embouchures — surface à mi-profondeur',
    regime: 'Chasseur de surface : petits mulets, sardines, athérines, tout banc de fourrage',
  },

  regulation: {
    verifiedAt: '24/06/2026',
    source:
      'Arrêté du 26 octobre 2012 modifié (tailles minimales pêche de loisir) — le barracuda (Sphyraena spp.) n’y figure pas',
    minSizeCm: { 'manche-atlantique': null, mediterranee: null },
    marquage: false,
    items: [
      `<strong>Pas de taille minimale réglementaire en France</strong> : le barracuda (Sphyraena spp.) ne figure pas dans l'arrêté du 26 octobre 2012 fixant les tailles minimales de capture. Aucun chiffre national ne s'applique — méfie-toi des « mailles » affichées au comptoir, elles sont inventées.`,
      `<strong>Pas de marquage obligatoire</strong> et <strong>pas de quota national</strong> pour la pêche de loisir.`,
      `Recommandation non réglementaire : <strong>no-kill conseillé sur les gros sujets</strong> (à partir d'environ 60 cm selon les sources de pêche). La bécune est un prédateur lent à se reconstituer et sa chair de gros sujet est médiocre — relâche les beaux poissons, ils font le sel du poste.`,
      `<strong>Règle LOCALE — Parc naturel marin du Golfe du Lion</strong> (Pyrénées-Orientales 66 et Aude 11) : depuis l'arrêté préfectoral du 12 février 2024, la pêche de loisir y impose une <strong>autorisation obligatoire</strong> (via l'application CatchMachine) et une <strong>taille minimale locale de 65 cm</strong> pour le barracuda. C'est une règle LOCALE propre à ce parc, pas une maille nationale : ailleurs en Méditerranée, elle ne s'applique pas.`,
    ],
  },

  saisons: {
    'manche-atlantique': [
      {
        saison: 'Printemps',
        activite: 1,
        note: `Espèce méditerranéenne : la bécune est quasi absente du bord en Manche-Atlantique, l'eau y est trop froide. À cette saison, considère-la comme hors cible sur cette façade.`,
      },
      {
        saison: 'Été',
        activite: 1,
        note: `Au mieux quelques individus erratiques poussés par les eaux les plus chaudes de l'année sur l'extrême sud du golfe de Gascogne — anecdotique, ne construis pas une session dessus.`,
      },
      {
        saison: 'Automne',
        activite: 1,
        note: `Toujours marginale : pas de population côtière exploitable du bord sur l'Atlantique ou la Manche. Pour la bécune, cap au sud, en Méditerranée.`,
      },
      {
        saison: 'Hiver',
        activite: 1,
        note: `Absente : l'eau froide de la façade chasse cette espèce thermophile. Aucune pêche du bord à attendre ici en hiver.`,
      },
    ],
    mediterranee: [
      {
        saison: 'Printemps',
        activite: 2,
        note: `Reprise progressive en mars-avril, quand l'eau se réchauffe : premières bécunes sur les digues, encore irrégulières, surtout au crépuscule et de nuit.`,
      },
      {
        saison: 'Été',
        activite: 2,
        note: `Poisson présent mais méfiant : sur mer plate et plein soleil, il boude. Joue exclusivement la nuit et l'aube, quand les bancs de mulets défilent sous les lampadaires des ports.`,
      },
      {
        saison: 'Automne',
        activite: 3,
        note: `LE pic de l'année : de fin août à novembre, les bécunes chassent ferme le long des digues éclairées, gros sujets compris. Les sessions de nuit donnent les plus belles attaques.`,
      },
      {
        saison: 'Hiver',
        activite: 2,
        note: `Activité qui se maintient sur les ports profonds et tempérés : on prend encore de belles bécunes en plein hiver, à ralentir l'animation et viser les nuits douces.`,
      },
    ],
  },

  techniques: [
    {
      slug: 'leurres',
      why: `La technique reine, et de loin : un minnow ou jerk effilé de 12 à 17 cm (type long bill flottant ou coulant) lancé au plus loin, ramené en linéaire lent entrecoupé de pauses de 3 à 5 secondes. La bécune frappe quasi toujours sur l'arrêt. Bas de ligne fluoro 35/100 obligatoire contre ses dents et l'abrasion des enrochements.`,
    },
    {
      slug: 'vif',
      why: `Le vif — petit mulet ou athérine — dérivé sous flotteur le long d'une digue ou aux abords d'un port prend les bécunes méfiantes qui suivent sans mordre le leurre. Filon utile de nuit, quand le poisson cale en bordure sur le banc de fourrage.`,
    },
  ],

  postes: [
    `La bécune est un poisson de bordure et de lumière. Les postes qui paient en priorité : les grandes digues portuaires éclairées, les quais des ports accessibles de nuit, les secs rocheux à portée de lancer et les embouchures où s'accumulent les mulets. Sous les lampadaires, la lumière concentre le fourrage et la bécune vient cueillir en lisière de la zone éclairée — c'est précisément cette frontière ombre/lumière qu'il faut prospecter, pas le plein faisceau.`,
    `Le moment du jour pèse plus que tout le reste : crépuscule (18 h-20 h), première heure du matin, et surtout la nuit (typiquement 21 h-1 h) quand les bancs de mulets circulent. En pleine journée, sous grand soleil, range la canne ou cherche très loin. Côté mer, le barracuda aime une mer calme à peu agitée et une eau claire : contrairement au sar ou au loup, ce n'est pas un poisson de gros temps, il chasse à vue. Une légère brise qui ride la surface aide à le décider sans le faire fuir.`,
    `Le marnage est négligeable en Méditerranée : ne raisonne pas marée mais activité du fourrage. Repère un banc de mulets qui défile le long de la digue et tu es sur le poste ; pas de fourrage, pas de bécune. Quand une chasse éclate en surface, balance ton minnow en lisière du banc, laisse-le couler une seconde, puis anime lentement avec des pauses appuyées — et tiens-toi prêt, l'attaque est sèche et le départ fulgurant.`,
  ],

  faq: [
    {
      q: 'Quelle est la taille minimale du barracuda en France ?',
      a: `Il n'y a pas de taille minimale réglementaire nationale : le barracuda (Sphyraena spp.) ne figure pas dans l'arrêté du 26 octobre 2012 sur les tailles minimales de capture. Pas de quota ni de marquage non plus. Attention toutefois à une règle locale : dans le Parc naturel marin du Golfe du Lion (départements 66 et 11), une autorisation (application CatchMachine) et une taille minimale locale de 65 cm s'appliquent depuis l'arrêté préfectoral du 12 février 2024. Et par bon sens, no-kill conseillé sur les gros sujets.`,
    },
    {
      q: 'Quel est le meilleur moment pour pêcher le barracuda du bord ?',
      a: `La nuit, du crépuscule à une heure du matin, est le créneau roi, surtout le long des digues éclairées des ports. L'aube fonctionne aussi. Côté saison, vise la fin d'été et l'automne (de fin août à novembre), le pic le plus régulier ; on en prend même en plein hiver sur les ports tempérés. Le plein soleil de midi sur mer d'huile est le pire moment.`,
    },
    {
      q: 'Quel leurre pour pêcher le barracuda en Méditerranée ?',
      a: `Un leurre dur effilé : minnow ou jerk de 12 à 17 cm, flottant ou coulant, en coloris naturel (sardine, mulet) ou flashy de nuit. Lance loin, ramène lentement avec des pauses de 3 à 5 secondes — la bécune attaque quasi toujours sur l'arrêt. Monte impérativement un bas de ligne fluorocarbone d'environ 35/100 pour résister à ses dents et à l'abrasion des enrochements.`,
    },
    {
      q: 'Où pêcher le barracuda du bord en France ?',
      a: `En Méditerranée, façade où l'espèce est chez elle : digues portuaires éclairées, ports, secs rocheux et embouchures, de la côte d'Azur au golfe du Lion. En Manche et en Atlantique, le barracuda est quasi absent du bord — l'eau y est trop froide — alors ne l'y cherche pas comme cible.`,
    },
  ],
}
