import type { EspeceContent } from "../types"

/**
 * Fiche espèce — Dorade grise (Spondyliosoma cantharus).
 * Aussi appelée griset ou canthare. Le sparidé grégaire des fonds rocheux
 * et coquilliers : pêche au ver/crabe au posé, en banc.
 * Façades : Manche-Atlantique + Méditerranée. Maille 23 cm partout. Pas de marquage.
 */
export const doradeGriseEspece: EspeceContent = {
  slug: "dorade-grise",

  intro: [
    `La dorade grise, qu'on appelle aussi griset ou canthare, c'est le sparidé discret mais généreux de nos côtes : moins doré que sa cousine royale, mais largement plus accessible du bord. Robe gris ardoise marquée de fines lignes longitudinales, corps ovale et haut, touche nerveuse suivie d'une défense en têtes de bélier. Quand un banc passe sur ton appât, ça enchaîne.`,
    `Sa grande différence avec la royale et le sar, c'est le banc. Le griset vit en groupe, souvent nombreux, calé sur les fonds rocheux et les zones coquillières : tombants, têtes de roche, sèches, épaves côtières, mais aussi le sable parsemé de galets et de coquilles au pied des digues et des jetées. Du bord, tu le trouves dès que la roche n'est pas loin : pointes, enrochements portuaires, plateaux rocheux à marée basse. Quand tu en prends un, reste sur le poste : les autres suivent.`,
    `Deux appâts naturels font tout le travail : le ver (arénicole, dur, néréide) et le crabe ou le morceau de coquillage, présentés au posé sur le fond. C'est une pêche simple, idéale pour se faire la main, mais qui récompense le soin du montage et le bon créneau de marée. Note tes sorties : le griset est fidèle à ses postes et à ses horaires, et les patterns reviennent d'une année sur l'autre.`,
  ],

  identity: {
    famille: `Sparidés (Spondyliosoma cantharus)`,
    tailleCourante: `20-35 cm du bord, 40 cm+ pour les beaux grisets`,
    tailleMax: `Environ 50 cm pour près de 2 kg, exceptionnel du bord`,
    habitat: `Fonds rocheux et coquilliers, tombants et sèches, souvent en banc, de 3 à 30 m`,
    regime: `Vers marins, petits crustacés, coquillages, algues, régime omnivore opportuniste`,
  },

  regulation: {
    verifiedAt: "23/06/2026",
    source: "Arrêté du 26 octobre 2012 modifié (Spondyliosoma cantharus)",
    minSizeCm: { "manche-atlantique": 23, mediterranee: 23 },
    marquage: false,
    items: [
      `<strong>Taille minimale : 23 cm</strong> en Manche et Atlantique comme en Méditerranée. En dessous, remise à l'eau immédiate, décrochée dans l'eau si possible.`,
      `<strong>Pas de marquage obligatoire</strong> pour la dorade grise : tu n'as pas à couper la nageoire caudale des poissons conservés (contrairement au bar, au sar ou à la dorade royale).`,
      `<strong>Pas de quota national</strong> de captures en pêche de loisir. Reste raisonnable : le griset vit en banc et se prélève vite sur un poste, relâche les sujets justes à la maille.`,
      `Avant de pêcher, <strong>vérifie la réglementation locale</strong> : certaines aires marines protégées et réserves peuvent imposer des règles plus strictes ou interdire la pêche.`,
    ],
  },

  saisons: {
    "manche-atlantique": [
      {
        saison: "Printemps",
        activite: 3,
        note: `Le grand rendez-vous : les grisets remontent vers la côte pour frayer dès que l'eau passe 12-13 °C, bancs serrés sur les têtes de roche d'avril à juin.`,
      },
      {
        saison: "Été",
        activite: 2,
        note: `Bien présent sur les zones rocheuses et les enrochements portuaires, mais éparpillé : vise le montant, l'aube et le coup du soir pour grouper les touches.`,
      },
      {
        saison: "Automne",
        activite: 2,
        note: `Encore de beaux poissons jusqu'en octobre avant le départ vers le large : les grisets se gavent de vers et de crabes sur les fonds coquilliers.`,
      },
      {
        saison: "Hiver",
        activite: 1,
        note: `Le griset gagne les fonds plus profonds et devient difficile du bord : cible secondaire, quelques poissons sur les postes les plus creux par temps doux.`,
      },
    ],
    mediterranee: [
      {
        saison: "Printemps",
        activite: 2,
        note: `Reprise nette avec le réchauffement : les bancs reviennent sur les tombants et les sèches proches du bord, bons coups au lever du jour.`,
      },
      {
        saison: "Été",
        activite: 2,
        note: `Présent le long des digues et des plateaux rocheux mais méfiant en eau claire : affine les diamètres et pêche tôt le matin ou de nuit.`,
      },
      {
        saison: "Automne",
        activite: 3,
        note: `Cœur de saison : eau encore chaude, grisets actifs et regroupés sur les zones rocheuses, les plus beaux sujets de l'année tombent à cette période.`,
      },
      {
        saison: "Hiver",
        activite: 1,
        note: `Activité ralentie, poissons calés sur les fonds profonds : prenable par belles journées calmes mais loin d'être la meilleure fenêtre.`,
      },
    ],
  },

  techniques: [
    {
      slug: "surfcasting",
      why: `La technique de référence pour le griset du bord : tu poses un montage à deux ou trois empiles garnies de ver dur ou de morceau de crabe sur la zone rocho-coquillière, à 20-60 m. Plombée juste assez lourde pour tenir, bannière tendue. Le griset tape sec puis se met en travers, ferre dès que ça secoue franchement. Vise les bordures de roche et le sable parsemé de coquilles.`,
    },
    {
      slug: "flottante",
      why: `Redoutable au-dessus des tombants et le long des digues : bolognaise 5-6 m, flotteur coulissant réglé pour présenter l'esche à 30-50 cm du fond. Un broumé léger de coquillages écrasés ou de sardine hachée fixe le banc sous le flotteur, et les touches s'enchaînent une fois les grisets calés. Esche fine au bout d'un bas de ligne discret.`,
    },
  ],

  postes: [
    `Le griset tient les fonds durs : têtes de roche, tombants, sèches, plateaux rocheux, mais aussi le sable parsemé de galets et de coquilles au pied des digues, des jetées et des enrochements portuaires. La clé, c'est la transition : la bordure où la roche rencontre le coquillier, là où il fouille. Comme il vit en banc, le premier poisson t'indique le bon poste : reste dessus, ré-amorce, et enchaîne tant que les touches viennent. Sans rien après vingt minutes, décale-toi de quelques mètres vers la roche.`,
    `Côté marée, le griset mange avec le mouvement d'eau : le montant et les deux heures qui encadrent la pleine mer sont les créneaux les plus réguliers, quand le courant recouvre les fonds coquilliers et remet le banc à table. Cale ta session sur la courbe de marée de ton spot et l'étale qui suit. En Méditerranée où le marnage est faible, c'est plutôt l'aube, le crépuscule et une légère houle qui décolle la nourriture du fond qui déclenchent les repas.`,
    `Côté météo, une mer légèrement formée avec une eau un peu teintée vaut mieux qu'un plat d'huile cristallin, surtout en plein jour : la touche est plus franche et le poisson moins méfiant. Évite la grosse houle qui rend le posé impraticable sur la roche, et par eau très claire descends en diamètre. Un vent de terre modéré qui aplatit le clapot tout en gardant un peu de courant est souvent la fenêtre idéale du bord.`,
  ],

  faq: [
    {
      q: `Quelle est la taille minimale de la dorade grise ?`,
      a: `La taille minimale de capture est de 23 cm en Manche, en Atlantique et en Méditerranée (arrêté du 26 octobre 2012 modifié). Tout poisson en dessous se remet à l'eau immédiatement. Contrairement au bar, au sar ou à la dorade royale, la dorade grise n'est pas soumise au marquage : tu n'as pas à couper la nageoire caudale des poissons conservés. Il n'y a pas de quota national, mais reste mesuré car le griset se prélève vite en banc.`,
    },
    {
      q: `Comment différencier la dorade grise de la dorade royale et du sar ?`,
      a: `La dorade grise (griset) a une robe gris ardoise uniforme striée de fines lignes longitudinales, sans bandeau doré ni tache marquée. La dorade royale arbore un bandeau doré entre les yeux et une tache sombre sur l'opercule. Le sar, lui, porte des barres verticales sombres bien nettes et une grosse tache noire sur le pédoncule caudal. Le griset est aussi plus grégaire : il vit en banc, là où royale et sar sont plus solitaires.`,
    },
    {
      q: `Quel est le meilleur appât pour la dorade grise du bord ?`,
      a: `Les vers marins sont rois : arénicole, ver dur, néréide, présentés au posé sur le fond. Viennent ensuite le morceau de crabe vert, la lanière de coquillage (couteau, moule) et le morceau de sardine. Un appât solide qui tient le courant et résiste aux petits poissons fait la différence. En flottante, un broumé léger de coquillages écrasés ou de sardine hachée fixe le banc sous le flotteur et déclenche les séries.`,
    },
    {
      q: `Quand pêcher la dorade grise ?`,
      a: `Sur la Manche et l'Atlantique, le meilleur moment est le printemps (avril-juin) quand les bancs remontent frayer près de la côte, avec une bonne activité jusqu'en automne. En Méditerranée, vise plutôt l'automne en cœur de saison, ainsi que le printemps. Aux heures, privilégie la marée montante, l'aube et le coup du soir ; en hiver le griset gagne le large et devient difficile du bord.`,
    },
  ],
}
