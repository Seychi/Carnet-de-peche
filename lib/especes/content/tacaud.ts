import type { EspeceContent } from "../types"

/**
 * Fiche espèce tacaud (Trisopterus luscus) — /especes/tacaud.
 * Angle : le gade des structures, l'animateur des sessions d'hiver au ver.
 * Façade unique : Manche + Atlantique (quasi absent de Méditerranée → saisons []).
 * Réglementation vérifiée le 23/06/2026 : aucune maille légale en pêche de loisir.
 */
export const tacaudEspece: EspeceContent = {
  slug: "tacaud",

  intro: [
    `Le tacaud, c'est le poisson qui te sauve une session d'hiver. Quand le bar a décroché et que la dorade dort, lui reste là, collé aux structures, à mordre franc sur un bas de ligne au ver. Du bord, il ne se mérite pas : il se trouve. Tu poses ton appât au pied d'une digue, près d'une épave ou sur un fond de roche, et si le banc est là, ça tape dans les minutes qui suivent.`,
    `Ce petit gadidé — cousin du lieu jaune et de la morue — vit en banc serré au ras du fond, toujours proche d'un relief : enrochements de port, têtes de roche, carcasses d'épaves, piles de pont. Il se reconnaît à sa silhouette trapue, son corps cuivré barré de bandes sombres, son barbillon sous le menton et la grande tache noire à la base de la nageoire pectorale. En France, son terrain du bord, c'est la Manche et l'Atlantique : de la côte d'Opale au Pays basque. En Méditerranée, il est quasi absent — autant l'oublier là-bas.`,
    `Côté réglementation, bonne nouvelle pour les débutants : il n'y a pas de taille minimale légale de capture en pêche de loisir. Le tacaud n'est listé ni dans l'arrêté maille ni dans le règlement européen. Attention quand même : sa chair est fragile et s'altère vite, alors on garde raisonnable et on consomme très frais. Cette fiche te donne les saisons façade par façade, les deux techniques qui prennent vraiment du bord — pose au ver et flottante posée — et les postes selon le vent, la houle et la marée.`,
  ],

  identity: {
    famille: "Gadidés (Trisopterus luscus), cousin du lieu jaune et de la morue",
    tailleCourante: "20-30 cm du bord, 35 cm+ pour un beau sujet",
    tailleMax: "≈ 45 cm pour 1,5 kg (rarissime du bord)",
    habitat: "Se serre près des structures, épaves et roche, en banc — digues, enrochements, têtes de roche, Manche / Atlantique",
    regime: "Fouilleur de fond : vers, crustacés, petits mollusques, alevins et morceaux de poisson",
  },

  regulation: {
    verifiedAt: "23/06/2026",
    source: "Arrêté du 26 octobre 2012 modifié ; règlement (UE) 2019/1241 — le tacaud n'y figure pas",
    minSizeCm: { "manche-atlantique": null, mediterranee: null },
    marquage: false,
    items: [
      `<strong>Pas de taille minimale réglementaire de capture en pêche de loisir</strong> en Manche et Atlantique : le tacaud n'est listé ni dans l'arrêté maille ni dans le règlement européen 2019/1241.`,
      `<strong>Recommandation, pas obligation</strong> : beaucoup de pêcheurs relâchent les sujets sous 19 cm (taille de première maturité). C'est un geste de bon sens pour la ressource, pas une règle légale.`,
      `<strong>Pas de quota ni de fermeture</strong> spécifiques au tacaud à la date de vérification — pêche ouverte toute l'année, dans le respect de la réglementation générale de la pêche de loisir.`,
      `<strong>Chair fragile</strong> : sans maille à respecter, la vraie règle est de prélever raisonnablement et de consommer le poisson très frais — il s'altère vite.`,
    ],
  },

  saisons: {
    "manche-atlantique": [
      {
        saison: "Printemps",
        activite: 2,
        note: `Les bancs restent actifs sur les structures, mais les sujets sont plus dispersés qu'en hiver. Une bonne pioche reste possible au ver sur les digues et la roche.`,
      },
      {
        saison: "Été",
        activite: 1,
        note: `Le tacaud se fait discret du bord : eau chaude, bancs décrochés vers le large et plus profond. C'est souvent du petit tacaud qui pille les appâts destinés à d'autres espèces.`,
      },
      {
        saison: "Automne",
        activite: 2,
        note: `L'eau refroidit, les bancs se reforment et se rapprochent des structures. À partir d'octobre, la régularité remonte nettement sur les ports et les enrochements.`,
      },
      {
        saison: "Hiver",
        activite: 3,
        note: `La pleine saison du bord : bancs serrés sur les épaves, digues et têtes de roche, mordeur même par mer froide. C'est LE poisson des sessions hivernales quand le reste boude.`,
      },
    ],
    mediterranee: [],
  },

  techniques: [
    {
      slug: "surfcasting",
      why: `La pose au fond est l'arme numéro un : bas de ligne à deux ou trois empiles, hameçons fins de fer escher au ver de chalut, dur ou arénicole, plombée juste suffisante pour tenir au pied de la structure. Le tacaud fouille le fond en banc — dès qu'un poisson est là, les autres suivent, et les touches s'enchaînent.`,
    },
    {
      slug: "flottante",
      why: `Au bord d'une digue profonde ou d'un port, la pêche au flotteur coulissant réglé pour présenter le ver à 30-50 cm du fond est redoutable : tu cibles précisément la couche où le banc circule, et le flotteur signale les touches franches du tacaud sans rien manquer.`,
    },
  ],

  postes: [
    `Le bon poste à tacaud se résume à un mot : la structure. Vise tout ce qui casse un fond plat et offre un abri au banc — enrochements et musoirs de digue, pieds de jetée portuaire, têtes de roche, épaves accessibles depuis le bord, piles de pont. Plus il y a de relief et de hauteur d'eau, mieux c'est. Les fonds de sable nu sans rien autour, eux, ne produisent presque jamais : sans structure, pas de banc.`,
    `Le moment de marée compte beaucoup. Les phases qui produisent sont le montant et les deux heures qui encadrent la pleine mer : plus d'eau sur tes enrochements, un courant qui relance l'activité du banc au ras du fond et amène les vers déterrés vers tes hameçons. Les coefficients moyens à forts amplifient le phénomène le long des digues. La nuit et les premières heures de l'aube sont souvent les plus productives, surtout en hiver. La courbe de marée et les horaires de pleine et basse mer de ton spot suffisent à caler la session.`,
    `Côté ciel et mer : le tacaud n'a pas peur d'une mer formée, au contraire — un peu de remous et d'eau teintée le met en confiance et le colle aux structures. Un vent modéré de secteur favorable, une houle qui reste gérable au pied de la digue, et tu pêches dans de bonnes conditions. Évite seulement les grosses tempêtes qui rendent les enrochements dangereux et la tenue de fond impossible. Une eau froide et brassée d'hiver, loin de te gêner, signe souvent les meilleures sessions.`,
  ],

  faq: [
    {
      q: "Quelle est la taille minimale légale du tacaud en pêche de loisir ?",
      a: `Il n'y a pas de taille minimale réglementaire de capture pour le tacaud en pêche de loisir, ni en Manche-Atlantique ni en Méditerranée : il ne figure ni dans l'arrêté maille ni dans le règlement européen 2019/1241. Beaucoup de pêcheurs relâchent quand même les sujets sous 19 cm (première maturité), mais c'est une recommandation, pas une obligation. Vérifié le 23/06/2026.`,
    },
    {
      q: "Quelle est la meilleure saison pour pêcher le tacaud du bord ?",
      a: `L'hiver, sans hésiter : les bancs se serrent sur les structures et le tacaud mord franc même par eau froide, quand le bar et la dorade ont décroché. L'automne, à partir d'octobre, est une bonne montée en régime. L'été, il se fait rare du bord et se décroche vers le large. C'est le poisson idéal des sessions de saison froide.`,
    },
    {
      q: "Quel appât et quel montage pour le tacaud ?",
      a: `Le ver est roi : ver de chalut, dur ou arénicole, sur des hameçons fins de fer (n° 4 à 1). Un montage surfcasting à deux ou trois empiles posé au pied d'une digue ou d'une tête de roche est la valeur sûre. En port profond, une flottante coulissante réglée à 30-50 cm du fond cible précisément le banc. Un morceau de poisson ou de crevette fonctionne aussi très bien.`,
    },
    {
      q: "Où trouver le tacaud du bord en France ?",
      a: `Sur les façades Manche et Atlantique, de la côte d'Opale au Pays basque : digues et enrochements de port, têtes de roche, épaves accessibles, piles de pont. Il vit en banc collé aux structures, jamais sur le sable nu. En Méditerranée, il est quasi absent — inutile de le cibler là-bas.`,
    },
  ],
}
