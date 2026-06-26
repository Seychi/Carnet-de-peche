import type { EspeceContent } from '../types'

/**
 * Fiche espèce — Marbré (Lithognathus mormyrus).
 * Le sparidé fouisseur des plages de sable méditerranéennes : surfcasting fin,
 * vers et bibi, méfiance redoutable. Cœur de zone = Méditerranée (maille 20 cm) ;
 * marginal en Atlantique sud-ouest (pas de maille nationale sur cette façade).
 * Réglementation vérifiée le 24/06/2026 (chiffres injectés, ne pas modifier sans
 * re-vérification aux sources).
 */
export const marbreEspece: EspeceContent = {
  slug: 'marbre',

  intro: [
    `Le marbré, c'est le sparidé fin des plages de sable : un corps argenté barré de fines marbrures sombres verticales, d'où son nom, et un museau allongé qui lui sert à fouiller le sable comme un cochon truffier. Là où le sar veut du caillou et du ressac, le marbré veut du sable propre, des cuvettes et des veines où s'accumulent les vers et les petits crustacés qu'il déterre.`,
    `C'est un poisson de Méditerranée avant tout : présent du Roussillon à la Corse, il se pêche du bord sur les grandes plages, les pointes sableuses et les bordures de graus, surtout du printemps à l'automne. Sur l'Atlantique, il reste marginal (quelques sujets dans le sud-ouest, du bassin d'Arcachon au Pays basque) mais ce n'est pas une vraie cible de cette façade. Ne le cherche pas en Manche : l'eau y est trop froide pour lui.`,
    `Sa pêche, c'est de la dentelle de surfcasting. Le marbré a une petite bouche, une méfiance de tous les instants et une touche discrète, souvent juste la bannière qui se détend ou tape doucement. Bas de ligne fin, hameçons piquants, esche fraîche et soignée : c'est une pêche technique qui récompense le pêcheur appliqué bien plus que le lanceur de plomb. Et c'est souvent à la tombée du jour et dans la nuit qu'il s'approche vraiment du bord.`,
  ],

  identity: {
    famille: 'Sparidés — Lithognathus mormyrus',
    tailleCourante: '20-30 cm du bord, 35 cm+ pour les beaux sujets',
    tailleMax: 'Environ 45 cm pour près de 1 kg, exceptionnel',
    habitat: 'Plages et fonds de sable propre, cuvettes et veines, bordures de graus, 0,5 à 5 m',
    regime: 'Fouisseur : vers marins, petits crustacés, mollusques déterrés dans le sable',
  },

  regulation: {
    verifiedAt: '24/06/2026',
    source: 'Arrêté du 26 octobre 2012 modifié (annexe Méditerranée, Lithognathus mormyrus)',
    minSizeCm: { 'manche-atlantique': null, mediterranee: 20 },
    marquage: false,
    items: [
      `<strong>Maille : 20 cm en Méditerranée</strong> (annexe Méditerranée de l'arrêté du 26 octobre 2012 modifié) : tout marbré sous cette taille doit être remis à l'eau immédiatement.`,
      `<strong>En Manche-Atlantique : pas de taille minimale nationale.</strong> Le marbré y est une espèce marginale et la maille de 20 cm vise la Méditerranée, où se concentre la pêche. Sur le sud-ouest atlantique, relâche bon sens à l'appui les petits sujets, faute de seuil légal.`,
      `<strong>Pas de quota national</strong> de captures et <strong>pas de marquage obligatoire</strong> pour le marbré en pêche de loisir.`,
      `<strong>Vérifie la réglementation locale.</strong> Le Parc naturel marin du Golfe du Lion et les réserves marines (Cerbère-Banyuls, cœur du Parc national des Calanques…) peuvent imposer une maille, un quota ou une autorisation plus stricts que la règle nationale. Renseigne-toi avant de pêcher sur ces zones.`,
    ],
  },

  saisons: {
    'manche-atlantique': [
      {
        saison: 'Printemps',
        activite: 1,
        note: `Espèce marginale sur cette façade : quelques sujets isolés dans le sud-ouest (Arcachon, Pays basque) au réchauffement, rien de comparable à la Méditerranée. Cible secondaire au mieux.`,
      },
      {
        saison: 'Été',
        activite: 1,
        note: `Présence ponctuelle sur les plages du sud-ouest atlantique en eau chaude, mais sans régularité. En Manche, l'eau est trop froide : le marbré y est absent.`,
      },
      {
        saison: 'Automne',
        activite: 1,
        note: `Quelques prises accidentelles possibles dans le sud-ouest tant que l'eau reste douce, mais ce n'est pas un poisson qu'on cible vraiment du bord sur l'Atlantique.`,
      },
      {
        saison: 'Hiver',
        activite: 1,
        note: `Absent du bord sur la façade Manche-Atlantique : eau trop froide. Vise la dorade grise ou le bar selon le secteur, pas le marbré.`,
      },
    ],
    mediterranee: [
      {
        saison: 'Printemps',
        activite: 2,
        note: `Reprise nette dès que l'eau passe les 15-16 °C : les marbrés se rapprochent des plages pour fouiller le sable. Bonnes sessions au coup du soir et en première partie de nuit.`,
      },
      {
        saison: 'Été',
        activite: 3,
        note: `Pleine saison : c'est LE poisson du surfcasting estival méditerranéen. Très présent sur les plages de sable, surtout la nuit et au crépuscule quand il vient fouiller près du bord. Pic d'activité de juin à septembre.`,
      },
      {
        saison: 'Automne',
        activite: 2,
        note: `Encore de belles pêches en septembre-octobre, souvent les plus gros sujets de l'année, avant que le refroidissement de l'eau ne les éloigne progressivement du bord.`,
      },
      {
        saison: 'Hiver',
        activite: 1,
        note: `Activité minimale : les marbrés gagnent un peu de fond et se font rares sur les plages. Cible secondaire entre deux coups de mer, à chercher les jours les plus doux.`,
      },
    ],
  },

  techniques: [
    {
      slug: 'surfcasting',
      why: `LA technique du marbré, et quasiment la seule du bord : montage fin et discret lancé sur une plage de sable, à 20-60 m selon le profil. Bas de ligne en 16-22/100, hameçons fins et piquants n°4 à 8, perles flottantes pour décoller l'esche du fond. La clé n'est pas la distance mais la finesse et la fraîcheur de l'appât : ver de sable (gravette, américain, dur), bibi, morceau de couteau. Ratisse en déplaçant tes lignes pour trouver les cuvettes et les veines où il fouille.`,
    },
    {
      slug: 'flottante',
      why: `En appoint depuis une pointe sableuse ou un bord de grau peu profond : flotteur léger réglé pour présenter un ver tout près du fond, dans une veine de courant qui longe le sable. Moins productif que le surfcasting sur ce poisson de fond, mais ça dépanne quand la mer est plate et que tu pêches une bordure précise au ras du sable.`,
    },
  ],

  postes: [
    `Le marbré tient des postes de sable propre, jamais loin d'un relief discret qui piège la nourriture : cuvettes creusées par la houle, veines plus sombres entre deux bancs de sable, abords des graus et des sorties d'eau, marches et fosses près du bord. Sur une plage qui paraît uniforme, c'est ce micro-relief qui fait toute la différence : repère-le à marée basse ou par eau claire, et place tes lignes dessus. Si rien ne touche après vingt minutes, déplace-toi de quelques mètres : le marbré fouille des zones précises, à toi de les trouver.`,
    `Côté conditions, le marbré aime une mer raisonnablement calme à légèrement formée, qui brasse juste assez le sable pour libérer les vers et les crustacés sans rendre l'eau impêchable. Une petite houle résiduelle après un coup de vent est idéale : elle a retourné le fond et mis la nourriture à disposition. À l'inverse, une grosse mer trop forte disperse les poissons et noie la touche déjà discrète. Le créneau en or, c'est la tombée du jour et la première partie de nuit : c'est là que le marbré s'approche franchement du bord pour fouiller, et que sa méfiance baisse.`,
    `En Méditerranée, le marnage est négligeable : ce n'est pas la marée qui commande mais la lumière, le vent et l'état du sable. Pêche le crépuscule et la nuit, amorce léger autour de tes lignes pour fixer le poste, et surveille ta bannière de près, car la touche du marbré est souvent une simple détente ou un petit tapotement, pas un départ franc. Logue tes prises avec le poste exact, l'heure et l'état de la mer : sur une même plage, les cuvettes productives reviennent et tes patterns t'y ramèneront plus vite.`,
  ],

  faq: [
    {
      q: 'Quelle est la taille minimale du marbré ?',
      a: `La maille est de 20 cm en Méditerranée (annexe Méditerranée de l'arrêté du 26 octobre 2012 modifié) : tout marbré plus petit se remet à l'eau immédiatement. En Manche-Atlantique, il n'y a pas de taille minimale nationale car l'espèce y est marginale : la maille de 20 cm vise la Méditerranée, où se concentre la pêche. Pas de quota ni de marquage obligatoire dans les deux cas. Vérifie aussi les règles locales (Parc naturel marin du Golfe du Lion, réserves).`,
    },
    {
      q: 'Quel est le meilleur appât pour le marbré ?',
      a: `Le ver de sable est roi : gravette, ver américain, ver dur, et le couteau. Le bibi fonctionne aussi, même s'il séduit souvent plus facilement la dorade et le sar que le marbré. La fraîcheur de l'esche compte autant que le choix : un ver vivant et bien escher sur un hameçon fin fait toute la différence sur ce poisson méfiant à petite bouche.`,
    },
    {
      q: 'Quand et où pêcher le marbré du bord ?',
      a: `En Méditerranée, sur les plages de sable, de mai à octobre avec un pic l'été, et surtout à la tombée du jour et en première partie de nuit, quand le marbré vient fouiller près du bord. Cherche les cuvettes et les veines de sable, les abords des graus. Sur l'Atlantique, c'est une espèce marginale (sud-ouest seulement), pas une vraie cible du bord.`,
    },
    {
      q: 'Pourquoi le marbré est-il réputé difficile à pêcher ?',
      a: `Parce qu'il cumule une petite bouche, une grande méfiance et une touche très discrète : souvent juste la bannière qui se détend ou tape doucement, sans départ franc. Il faut un bas de ligne fin (16-22/100), des hameçons piquants, une esche fraîche et soignée, et une vraie attention à la ligne. C'est une pêche technique qui récompense la finesse plus que la force, d'où sa réputation de poisson d'expert sur la plage.`,
    },
  ],
}
