import type { EspeceContent } from "../types"

/**
 * Fiche espèce — Pageot commun / pageot rouge (Pagellus erythrinus).
 * À NE PAS confondre avec la dorade rose / pageot rose (Pagellus bogaraveo,
 * 40 cm Atl / 33 cm Med + marquage) ni le pageot acarne (Pagellus acarne).
 * Façades : Méditerranée (cœur de zone) + Atlantique sud (présence plus discrète).
 */
export const pageotEspece: EspeceContent = {
  slug: "pageot",

  // Sprint 78, Bloc 4 : titre porté à l'intention PÊCHE.
  // Relevé GSC 90 j au 2026-08-15 : 261 impressions / 2 clics / 0,77 %.
  // 52 caractères, mesuré. Aucun doublon avec les 25 autres fiches.
  seoTitle: 'Pageot : où le pêcher du bord en Méditerranée, spots',

  intro: [
    `Le pageot commun, c'est le petit sparidé rose argenté qui peuple le sable, le gravier et les bordures de coralligène, un poisson de fond, fin et bagarreur pour sa taille, qu'on prend du bord dès qu'on pose un appât naturel posé sur le substrat. Reflets cuivrés sur le dos, ventre nacré, une touche discrète mais une fois ferré il tire droit et nerveux. C'est un poisson de patience : tu le cherches au fond, pas en surface.`,
    `Attention à ne pas le confondre : on parle ici du PAGEOT COMMUN (Pagellus erythrinus), ni de la dorade rose / pageot rose (Pagellus bogaraveo), bien plus grosse et soumise à marquage, ni du pageot acarne (Pagellus acarne), reconnaissable à sa tache noire à l'aisselle de la pectorale. Le pageot commun reste modeste (20 à 30 cm du bord en moyenne), mais il compense par le nombre et par une chair excellente.`,
    `C'est avant tout un poisson de Méditerranée, où il fréquente le sable, le gravier et le coralligène à faible profondeur, accessible depuis les digues, les jetées et les plages à fond mixte. On le rencontre aussi sur l'Atlantique sud, plus discret et plus saisonnier. Deux approches le prennent vraiment du bord : le surfcasting léger pour poser l'appât sur le fond sableux, et la pêche à la flottante / palangrotte au ras des bordures rocheuses. Dans tous les cas : bas de ligne fin, petits hameçons, appât naturel. C'est un poisson à la bouche modeste qui refuse le matériel grossier.`,
  ],

  identity: {
    famille: `Sparidés (Pagellus erythrinus)`,
    tailleCourante: `20-30 cm du bord, 35 cm+ pour les beaux sujets`,
    tailleMax: `~50 cm pour environ 1,5 kg (exceptionnel du bord)`,
    habitat: `Fonds de sable, de gravier et de coralligène : fréquente le sable, le gravier et le coralligène, de quelques mètres à plusieurs dizaines de mètres`,
    regime: `Vers, petits crustacés, mollusques et menus poissons fouillés sur le fond`,
  },

  regulation: {
    verifiedAt: "23/06/2026",
    source: "Arrêté du 26 octobre 2012 modifié (annexe Méditerranée) ; règlement (CE) 1967/2006 (Pagellus erythrinus)",
    minSizeCm: { "manche-atlantique": null, mediterranee: 15 },
    marquage: false,
    items: [
      `<strong>Méditerranée : taille minimale de 15 cm.</strong> Tout pageot en dessous se remet à l'eau immédiatement : décroché dans l'eau si possible, il repart sans dommage.`,
      `<strong>Manche et Atlantique : pas de taille minimale réglementaire de capture en pêche de loisir</strong> pour le pageot commun. Garde malgré tout une mesure raisonnable : un poisson trop petit se relâche par bon sens.`,
      `<strong>Pas de quota national</strong> de captures pour la pêche de loisir, et pas de marquage obligatoire pour cette espèce.`,
      `<strong>Parc naturel marin du Golfe du Lion :</strong> taille portée à 25 cm + quota + autorisation (depuis février 2024). Vérifie toujours la réglementation locale avant de pêcher dans une réserve ou un parc marin.`,
    ],
  },

  saisons: {
    "manche-atlantique": [
      {
        saison: "Printemps",
        activite: 1,
        note: `Présence discrète et tardive : quelques sujets remontent vers la côte sud-atlantique avec le réchauffement, mais c'est une cible occasionnelle.`,
      },
      {
        saison: "Été",
        activite: 2,
        note: `Meilleure fenêtre de la façade : l'eau chaude rapproche les pageots des plages à fond mixte et des digues, du Pays basque aux pertuis.`,
      },
      {
        saison: "Automne",
        activite: 2,
        note: `Encore présent en début d'automne tant que l'eau reste douce ; les prises se raréfient nettement dès que la température chute.`,
      },
      {
        saison: "Hiver",
        activite: 1,
        note: `Quasi absent du bord : le pageot gagne les fonds plus profonds et sort du périmètre du pêcheur côtier.`,
      },
    ],
    mediterranee: [
      {
        saison: "Printemps",
        activite: 2,
        note: `Reprise franche dès que l'eau se réchauffe : les bancs se rapprochent du sable et du gravier le long des digues et des plages.`,
      },
      {
        saison: "Été",
        activite: 3,
        note: `Pleine saison : pageots actifs sur tous les fonds mixtes, excellents coups à l'aube et de nuit sur appât naturel posé.`,
      },
      {
        saison: "Automne",
        activite: 3,
        note: `Le poisson reste vorace et se gave avant l'hiver ; souvent les plus beaux sujets de l'année sur le coralligène en bordure.`,
      },
      {
        saison: "Hiver",
        activite: 1,
        note: `Activité réduite : les pageots gagnent les fonds plus profonds, quelques touches seulement par eau encore tempérée.`,
      },
    ],
  },

  techniques: [
    {
      slug: "surfcasting",
      why: `Le surfcasting léger est l'arme reine pour le pageot : tu poses ton appât naturel directement sur le fond de sable ou de gravier, là où il fouille. Canne souple 80-120 g, montage à plombée fixe ou coulissante, bas de ligne fin en 16-20/100 et petits hameçons n°6 à n°2. La bouche du pageot est modeste, il faut adapter. Tends bien la bannière : la touche est souvent une série de petits coups secs avant le départ franc, ferre quand la canne se plie.`,
    },
    {
      slug: "flottante",
      why: `La flottante (ou palangrotte / pêche à soutenir) excelle le long des digues et des bordures de coralligène : flotteur léger ou plombée légère, tu présentes l'appât à mi-fond ou au ras du substrat, à courte distance du bord. Un léger amorçage de sable mêlé de chair écrasée fixe le banc sur le poste. Reste discret en diamètre : par eau claire, le pageot inspecte avant de mordre.`,
    },
  ],

  postes: [
    `Le pageot tient les fonds meubles et les transitions : cherche le sable et le gravier en pied de digue, les bordures de plage à fond mixte, et surtout les marges du coralligène, cette frontière entre la roche et le sable où il vient fouiller. Repère les zones un peu creuses, les chenaux et les dépressions entre deux barres de sable : c'est là qu'il fouine la nourriture déposée par le courant. Sans touche au bout de vingt à trente minutes, déplace ton appât de quelques mètres plutôt que de t'entêter sur un point mort.`,
    `Côté conditions, le pageot préfère une mer maniable à légèrement formée et une eau pas trop agitée : un petit clapot qui remue le sable et libère les vers et les crustacés du fond, sans grosse houle qui rendrait la pêche fine impossible. Un vent modéré de travers ou de face qui ride la surface aide à le mettre en confiance par grand soleil. À l'inverse, mer démontée et eau très chargée le poussent au large. Privilégie alors un autre poste ou une autre espèce.`,
    `En Méditerranée, le marnage est négligeable : ce sont les heures et le courant qui commandent. Les meilleures fenêtres sont l'aube, le crépuscule et la nuit, quand le pageot se rapproche du bord et perd sa méfiance. Sur l'Atlantique sud, cale plutôt ta session sur la marée montante et les deux dernières heures avant la pleine mer, quand l'eau recouvre les zones sableuses riches en proies. Regarde la courbe de marée de ton spot et pêche cette fenêtre, étale comprise.`,
  ],

  faq: [
    {
      q: `Quelle est la taille minimale du pageot ?`,
      a: `En Méditerranée, la taille minimale du pageot commun est de 15 cm (arrêté du 26 octobre 2012 modifié, annexe Méditerranée) ; tout poisson plus petit se remet à l'eau immédiatement. En Manche et Atlantique, il n'existe pas de taille minimale réglementaire de capture en pêche de loisir pour cette espèce. Attention : dans le Parc naturel marin du Golfe du Lion, la taille est portée à 25 cm avec quota et autorisation depuis février 2024.`,
    },
    {
      q: `Comment ne pas confondre le pageot commun avec la dorade rose ?`,
      a: `Le pageot commun (Pagellus erythrinus) reste modeste, rose argenté à reflets cuivrés, sans tache marquée. La dorade rose ou pageot rose (Pagellus bogaraveo) est bien plus grosse, avec une tache noire à l'épaule, et elle est soumise à des règles strictes (40 cm en Atlantique, 33 cm en Méditerranée, plus marquage obligatoire). Le pageot acarne, lui, porte une tache noire à l'aisselle de la pectorale. En cas de doute sur l'espèce, mieux vaut relâcher.`,
    },
    {
      q: `Quel est le meilleur appât pour le pageot du bord ?`,
      a: `Les appâts naturels fins sont rois : ver de mer (arénicole, dur), bibi et gravette en Méditerranée, morceau de crevette ou de coquillage, lamelle de calamar pour tenir l'hameçon. Présente-les sur de petits hameçons (n°6 à n°2) et un bas de ligne fin : le pageot a une bouche modeste et inspecte avant de mordre. Un léger amorçage de sable mêlé de chair écrasée aide à fixer le banc.`,
    },
    {
      q: `Quand pêcher le pageot ?`,
      a: `En Méditerranée, le pic va du printemps à l'automne, avec un sommet en été et en début d'automne ; les meilleures heures sont l'aube, le crépuscule et la nuit. Sur l'Atlantique sud, c'est une cible plus occasionnelle et estivale, à pêcher de préférence sur la marée montante, dans les deux dernières heures avant la pleine mer. L'hiver, le poisson gagne le large et sort du périmètre du pêcheur du bord.`,
    },
  ],
}
