import type { EspeceContent } from "../types"

/**
 * Fiche espèce — Congre (Conger conger).
 * Le serpent des enrochements : pêche de force au pose, de nuit, gros appât.
 * Façades : Manche-Atlantique + Méditerranée (maille 60 cm sur les deux).
 */
export const congreEspece: EspeceContent = {
  slug: "congre",

  // Sprint 77 Bloc 9 : 404 impressions/sem., 6 clics (CTR 1,5 %). Requêtes
  // d'identification (« congre poisson »). La maille (60 cm) n'est pas ce qui
  // distingue le congre pour un pêcheur : c'est la pêche de nuit, de force. On
  // porte cette accroche plutôt que le chiffre réglementaire. 54 caractères, mesuré.
  seoTitle: "Congre : où le pêcher de nuit du bord, spots et postes",

  intro: [
    `Le congre, c'est le poids lourd nocturne du bord : un anguillidé géant à la peau visqueuse et à la mâchoire de tenaille, tapi dans le moindre trou de roche, prêt à plier ta canne en deux dès la nuit tombée. La touche n'a rien de timide, elle part comme un coup de poing, et la première seconde décide de tout : soit tu le décolles de son terrier, soit il s'y enroule et tu peux dire adieu au bas de ligne.`,
    `Ce n'est pas un poisson qu'on cherche, c'est un poisson qu'on attend. Le congre vit caché le jour et sort chasser la nuit le long des enrochements, sous les digues, dans les failles et sur les épaves accessibles du bord. Il fréquente toutes nos côtes rocheuses : la Manche et l'Atlantique de la Bretagne au Pays basque, et toute la Méditerranée, des digues du golfe du Lion aux tombants corses. Partout où il y a du gros caillou, de la profondeur et de l'obscurité, il y a du congre.`,
    `Du bord, ça se joue à la pêche de force : canne puissante, gros plomb, fil costaud et un appât généreux posé au pied du dur. Pas de finesse ici : un congre de belle taille tracte comme un sac de ciment et te teste sur la solidité, pas sur la discrétion. Cette fiche te donne les saisons par façade, la technique qui le prend vraiment du bord, les appâts et montages qui tiennent le choc, et les postes à viser selon le vent, la houle et la marée.`,
  ],

  identity: {
    famille: "Congridés (Conger conger), grand cousin marin de l'anguille",
    tailleCourante: "60-120 cm du bord, les beaux sujets dépassent 1,50 m",
    tailleMax: "≈ 3 m pour plus de 60 kg (sujets d'épave profonde, hors de portée du bord)",
    habitat: "Trous de roche, failles, enrochements de digues et épaves, chasseur nocturne",
    regime: "Carnassier vorace : poissons, céphalopodes, crustacés, charognes",
  },

  regulation: {
    verifiedAt: "23/06/2026",
    source: "Arrêté du 26 octobre 2012 modifié (annexe I, Conger conger)",
    minSizeCm: { "manche-atlantique": 60, mediterranee: 60 },
    marquage: false,
    items: [
      `<strong>Taille minimale : 60 cm</strong> en Manche-Atlantique comme en Méditerranée. Tout congre sous cette maille doit être relâché immédiatement.`,
      `<strong>Pas de quota national</strong> de captures pour la pêche de loisir. Le congre se relâche très bien : décroche-le au sol avec une pince longue, sans le sortir de l'eau plus que nécessaire.`,
      `<strong>Réserve locale</strong> : dans le Parc naturel marin du Golfe du Lion, la taille minimale locale est renforcée (jusqu'à 120 cm) et des quotas s'appliquent. Vérifie les arrêtés préfectoraux avant de pêcher.`,
      `Attention à la manipulation : la dentition du congre est redoutable et il se débat violemment hors de l'eau. Pince, gant, et jamais les doigts près de la gueule.`,
    ],
  },

  saisons: {
    "manche-atlantique": [
      {
        saison: "Printemps",
        activite: 2,
        note: `L'eau se réchauffe et le congre se remet à chasser activement la nuit : reprise franche dès mai sur les enrochements et les digues profondes.`,
      },
      {
        saison: "Été",
        activite: 3,
        note: `Pleine saison du bord : nuits douces, congres sortis et affamés le long des digues portuaires et des têtes de roche. Le créneau roi.`,
      },
      {
        saison: "Automne",
        activite: 3,
        note: `Les plus gros sujets de l'année avant le refroidissement : septembre-octobre, mer encore chaude, sessions de nuit très productives sur les épaves accessibles.`,
      },
      {
        saison: "Hiver",
        activite: 1,
        note: `Eau froide, congre apathique calé au fond de son trou : touches rares et molles, cible secondaire à réserver aux nuits les plus clémentes.`,
      },
    ],
    mediterranee: [
      {
        saison: "Printemps",
        activite: 2,
        note: `Réveil progressif avec la remontée de la température : les congres recommencent à patrouiller les digues et les tombants dès la nuit tombée.`,
      },
      {
        saison: "Été",
        activite: 3,
        note: `Cœur de saison : nuits chaudes, congres très actifs au pied des digues et des enrochements portuaires. Pêche de nuit obligatoire, l'eau claire les cale le jour.`,
      },
      {
        saison: "Automne",
        activite: 3,
        note: `Eau encore tiède et gros poissons en chasse : excellente période jusqu'en novembre sur les tombants et les blocs profonds des ports.`,
      },
      {
        saison: "Hiver",
        activite: 2,
        note: `Activité ralentie mais le congre reste pêchable du bord : la Méditerranée garde une eau plus douce que l'Atlantique, vise les nuits sans coup de mistral.`,
      },
    ],
  },

  techniques: [
    {
      slug: "surfcasting",
      why: `La pêche de force au pose est LA technique à congre du bord, déclinée du surfcasting lourd : canne puissante (100-200 g), moulinet garni de tresse ou de gros nylon, plomb grappin de 100-150 g pour tenir le courant, et un bas de ligne court en gros diamètre (60-80/100) terminé d'un hameçon fort de fer. Tu poses un appât généreux au pied des enrochements, bannière tendue, et tu attends la touche : un départ brutal qu'il faut contrer immédiatement pour décoller le poisson de son trou avant qu'il ne s'y enroule.`,
    },
    {
      slug: "vif",
      why: `Sur les postes très marqués, un vif mort ou un gros lambeau de poisson présenté en plombée lourde décolle les plus beaux sujets : le congre est avant tout un prédateur d'odeur et de proies consistantes. Un demi-maquereau ou une seiche entière laisse une traînée olfactive qui le fait sortir de sa cache. Présentation au plus près du dur, plomb assez lourd pour rester fixe malgré la houle et le ressac.`,
    },
  ],

  postes: [
    `Le congre tient des postes précis et toujours au contact du gros caillou : pieds de digues et de jetées portuaires, enrochements profonds, têtes de roche et failles, épaves et blocs immergés à portée de lancer. Ce qu'il lui faut, c'est de la profondeur et un abri. Vise les structures qui plongent vite avec plusieurs mètres d'eau au pied. Le sable plat ne donne rien : sans trou pour se cacher le jour, pas de congre la nuit.`,
    `La nuit n'est pas une option, c'est la condition. Le congre est un chasseur nocturne strict du bord : l'essentiel des touches tombe entre le coucher du soleil et le milieu de nuit, avec un pic dans les deux premières heures d'obscurité. Côté marée, privilégie le montant et les heures qui encadrent la pleine mer : plus de hauteur d'eau sur les enrochements, un courant relancé qui répand l'odeur de ton appât et fait sortir les poissons des terriers. Cale ta session sur une nuit montante en t'appuyant sur la courbe de marée et les horaires de pleine et basse mer de ton spot.`,
    `Côté ciel, le congre est moins regardant que le bar ou la dorade : une mer légèrement formée ne le dérange pas, au contraire elle brasse le fond et l'active. Évite seulement la grosse houle au-delà de 2 m qui rend les postes d'enrochement dangereux de nuit et empêche le plomb de tenir. Une nuit douce, peu ventée, après quelques jours stables, reste l'idéal. En Méditerranée, méfie-toi du mistral qui creuse la mer sur les digues exposées ; sur l'Atlantique, cale ta sortie sur une fenêtre de houle modérée et un coefficient moyen à fort pour profiter du courant.`,
  ],

  faq: [
    {
      q: "Quelle est la taille minimale du congre ?",
      a: `La taille minimale de capture est de 60 cm en Manche-Atlantique comme en Méditerranée (arrêté du 26 octobre 2012 modifié, annexe I). Tout congre en dessous doit être relâché immédiatement, idéalement décroché au sol avec une pince sans le sortir de l'eau plus que nécessaire. Attention : dans le Parc naturel marin du Golfe du Lion, une taille locale renforcée (jusqu'à 120 cm) et des quotas peuvent s'appliquer. Vérifie les arrêtés préfectoraux. Vérifié le 23/06/2026.`,
    },
    {
      q: "Quelle est la meilleure période pour pêcher le congre du bord ?",
      a: `L'été et le début d'automne, quand l'eau est chaude et les nuits douces : de juin à octobre, le congre chasse activement la nuit le long des enrochements et des digues. En hiver, l'eau froide le rend apathique sur l'Atlantique, alors qu'il reste pêchable en Méditerranée où l'eau est plus douce. Dans tous les cas, c'est une pêche de nuit.`,
    },
    {
      q: "Quel appât et quel montage pour le congre du bord ?",
      a: `Un gros appât odorant posé au pied du dur : demi-maquereau, sardine entière, lanière de seiche ou de calamar, le tout sur un hameçon fort de fer. Le montage est une pêche de force : canne puissante, gros plomb grappin de 100-150 g pour tenir le courant, bas de ligne court en 60-80/100 résistant à l'abrasion sur la roche. Bannière tendue, et au premier départ il faut contrer immédiatement pour décoller le poisson de son trou.`,
    },
    {
      q: "Comment pêcher le congre depuis une digue ?",
      a: `De nuit, sur le montant, au pied des enrochements profonds. Pose ton appât au plus près du dur (c'est là que le congre patrouille) sans lancer trop loin sur le sable où il n'ira pas. Tiens la canne ou garde la bannière sous tension : la touche est un départ brutal qu'il faut contrer dans la seconde pour empêcher le poisson de s'enrouler dans la roche. Prévois pince longue et gant : la dentition est redoutable et il se débat fort hors de l'eau.`,
    },
  ],
}
