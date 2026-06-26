import type { EspeceContent } from '../types'

/**
 * Fiche espèce — Rouget-barbet de roche (Mullus surmuletus).
 * Le fouisseur du sable et du gravier : surfcasting léger et pêche au ver
 * sur fonds sablo-graveleux. Façades : Manche-Atlantique + Méditerranée.
 * Réglementation vérifiée le 23/06/2026 (chiffres injectés, ne pas modifier
 * sans re-vérification aux sources).
 */
export const rougetEspece: EspeceContent = {
  slug: 'rouget',

  intro: [
    `Le rouget-barbet de roche, c'est le fouisseur orangé du sable : deux longs barbillons sous le menton, une robe rosée qui s'allume de rouge dès qu'il sort de l'eau, et une chair fine qui en fait un des poissons les plus recherchés sur l'étal. Du bord, c'est une prise élégante qui récompense la pêche fine et la lecture du fond, pas un poisson de combat, mais un poisson de finesse.`,
    `Tu le trouves là où il peut fouiller : plages de sable propre, langues de gravier, mélanges sablo-graveleux au pied des digues et en bordure des herbiers. Il avance le nez au fond, ses barbillons en éventail, et remue le substrat pour débusquer vers, petits crustacés et mollusques. C'est précisément ce comportement qui dicte ta pêche : un appât posé au ras du sable, immobile ou ramené très lentement, dans une zone qu'il est en train de labourer. Présent sur les deux façades (du sud de la Manche jusqu'au golfe de Gascogne, et tout le pourtour méditerranéen) avec un net pic estival et automnal quand l'eau est chaude.`,
    `Une seule approche le prend vraiment du bord : le surfcasting léger, fil tendu, monté sur fonds sablo-graveleux avec un appât naturel discret. Pas besoin de lancer loin ni de matériel lourd : le rouget vient souvent à 20-40 m, dans la première barre, là où le sable se mélange au gravier. Sa touche est typée : une série de petits tocs nerveux sur la canne, parce qu'il tâte l'appât avant de l'aspirer. Laisse-le faire, temporise, et ferre quand la pointe se charge vraiment. Trop pressé, tu ne ramènes que ta plombée.`,
  ],

  identity: {
    famille: `Mullidés (Mullus surmuletus)`,
    tailleCourante: `15-25 cm du bord, 30 cm+ pour les beaux sujets`,
    tailleMax: `environ 40 cm pour près de 1 kg`,
    habitat: `Fonds sablo-graveleux et abords rocheux : fouille le sable et le gravier de ses barbillons`,
    regime: `Vers, petits crustacés et mollusques fouillés dans le substrat`,
  },

  regulation: {
    verifiedAt: '23/06/2026',
    source: 'Arrêté du 26 octobre 2012 modifié (genre Mullus)',
    minSizeCm: { 'manche-atlantique': 15, mediterranee: 15 },
    marquage: false,
    items: [
      `<strong>Taille minimale : 15 cm</strong> en Manche-Atlantique comme en Méditerranée. Tout rouget sous cette maille se remet à l'eau immédiatement. Attention au piège classique : les 11 cm que tu vois parfois cités concernent la pêche PROFESSIONNELLE en Méditerranée, pas la pêche de loisir. Pour toi, c'est 15 cm partout.`,
      `<strong>Pas de quota national</strong> de captures en pêche de loisir. Reste raisonnable, le rouget se prélève avec mesure.`,
      `<strong>Parc naturel marin du Golfe du Lion :</strong> maille portée à 20 cm + autorisation + quota (arrêté préfectoral du 12/02/2024). Si tu pêches entre Cap Leucate et la frontière espagnole, vérifie et applique cette réglementation locale renforcée.`,
    ],
  },

  saisons: {
    'manche-atlantique': [
      {
        saison: 'Printemps',
        activite: 1,
        note: `Reprise lente : le rouget se rapproche du bord avec le réchauffement de l'eau, mais reste irrégulier tant qu'on n'a pas franchi les 14-15 °C, plutôt à partir de mai.`,
      },
      {
        saison: 'Été',
        activite: 3,
        note: `Pleine saison : eau chaude, rougets actifs sur les plages de sable et de gravier, du sud Bretagne au golfe de Gascogne. Le meilleur créneau du bord.`,
      },
      {
        saison: 'Automne',
        activite: 2,
        note: `Encore de bons poissons tant que l'eau reste douce, souvent les plus beaux sujets de l'année avant qu'ils ne gagnent le large avec le refroidissement.`,
      },
      {
        saison: 'Hiver',
        activite: 1,
        note: `Cible secondaire : le rouget décroche vers les fonds plus profonds et se fait rare du bord. Quelques captures isolées au sud de la façade par eau encore tempérée.`,
      },
    ],
    mediterranee: [
      {
        saison: 'Printemps',
        activite: 2,
        note: `Les rougets reviennent sur les fonds sableux côtiers avec la remontée des températures : bons coups dès avril-mai au lever et au coucher du jour.`,
      },
      {
        saison: 'Été',
        activite: 3,
        note: `Cœur de saison : poisson présent partout sur le sable et le sablo-graveleux, du pied des digues aux plages. Pêche tôt et tard, l'eau cristalline rend le rouget méfiant en plein jour.`,
      },
      {
        saison: 'Automne',
        activite: 3,
        note: `Toujours excellent tant que l'eau garde sa chaleur : les plus gros rougets de l'année se prennent souvent en septembre-octobre, juste après un petit coup de mer qui trouble le fond.`,
      },
      {
        saison: 'Hiver',
        activite: 1,
        note: `Activité minimale : les rougets gagnent les fonds plus profonds. Quelques poissons restent accessibles par mer calme et eau douce, mais c'est une période creuse du bord.`,
      },
    ],
  },

  techniques: [
    {
      slug: 'surfcasting',
      why: `Le surfcasting léger est l'arme reine du rouget : tu poses un appât naturel discret au ras du sable, à 20-50 m du bord, sur une zone sablo-graveleuse qu'il vient labourer. Canne fine 80-120 g, bas de ligne en 18-22/100, hameçons n° 4 à 8 montés sur empile courte, plombée juste assez lourde pour tenir le fond. Garde le fil tendu et lis la pointe : le rouget tape d'abord une série de petits tocs nerveux avant d'aspirer l'appât : ne ferre pas au premier toc, laisse la canne se charger franchement, puis accompagne. Un ramené très lent par paliers déclenche souvent la touche quand ça reste muet.`,
    },
  ],

  postes: [
    `Le rouget tient des postes lisibles une fois qu'on sait lire une plage : cherche les transitions, là où le sable propre se mélange au gravier, les bordures d'herbiers, les langues sableuses entre deux têtes de roche, et les abords sableux au pied des digues et des épis. C'est dans ces zones de fouille qu'il passe sa journée le nez au fond. Repère à marée basse, sur l'Atlantique, les dépressions et les chenaux qui retiennent l'eau et le gravier : ce sont tes coups une fois la mer revenue.`,
    `Côté conditions, le rouget aime une mer qui a un peu de vie sans être déchaînée. Un léger clapot, une houle résiduelle d'un demi-mètre, une eau légèrement teintée par un coup de mer qui retombe : c'est l'idéal, car le fond remué libère la nourriture et met les rougets à table. À l'inverse, eau parfaitement cristalline et plat d'huile en plein soleil rendent le poisson méfiant : descends en diamètre et vise l'aube ou le crépuscule. Un vent de secteur portant 10-20 km/h qui crée un peu de surface t'aide presque toujours.`,
    `Sur l'Atlantique, cale ta session sur la marée : les deux dernières heures du montant et le début du descendant sont les meilleures fenêtres, quand l'eau recouvre les zones de sable et de gravier que le rouget vient fouiller. En Méditerranée, le marnage est négligeable : ce sont l'heure (lever et coucher du jour) et l'état de la mer après un coup de vent qui commandent les repas. Dans les deux cas, ne reste pas figé sur un poste muet : décale-toi de quelques dizaines de mètres pour retrouver la bonne nature de fond, c'est souvent ce qui fait la différence.`,
  ],

  faq: [
    {
      q: `Quelle est la taille minimale du rouget ?`,
      a: `La taille minimale est de 15 cm en Manche-Atlantique comme en Méditerranée (arrêté du 26 octobre 2012 modifié, genre Mullus). Attention : les 11 cm parfois cités ne concernent que la pêche professionnelle en Méditerranée. En pêche de loisir, c'est bien 15 cm partout. Tout poisson en dessous se remet à l'eau immédiatement. Et si tu pêches dans le Parc naturel marin du Golfe du Lion, la maille y est relevée à 20 cm, avec autorisation et quota.`,
    },
    {
      q: `Quand pêcher le rouget du bord ?`,
      a: `Le rouget se pêche surtout par eau chaude : pic de juin à octobre sur les deux façades, avec un cœur d'été net. Sur l'Atlantique, vise la marée montante, les deux dernières heures avant la pleine mer. En Méditerranée, privilégie le lever et le coucher du jour, et les lendemains de petit coup de mer quand le fond reste légèrement troublé. En hiver, il décroche vers le large et devient une cible secondaire du bord.`,
    },
    {
      q: `Quel appât pour le rouget en surfcasting ?`,
      a: `Les vers sont rois : ver de chalut (arénicole), gravette, et surtout le ver américain (néréide) qui tient bien à l'hameçon. La dure (ver dur) et le bibi fonctionnent aussi très bien, en particulier en Méditerranée. Monte un appât bien escher mais pas démesuré, sur un hameçon fin n° 4 à 8, et pose-le au ras du sable sur une zone sablo-graveleuse. Un appât discret et frais fait toute la différence sur ce poisson fouisseur.`,
    },
    {
      q: `Le rouget est-il bon à manger ?`,
      a: `Excellent, c'est même un des poissons les plus fins de nos côtes : chair délicate, légèrement parfumée, parfaite poêlée entière ou en filets, souvent cuisinée avec son foie. Un rouget de 18-25 cm fait une belle portion. Comme il grandit lentement et reste fidèle à ses fonds de fouille, prélève avec mesure : quelques beaux poissons valent mieux qu'un seau de petits sujets tout juste à la maille.`,
    },
  ],
}
