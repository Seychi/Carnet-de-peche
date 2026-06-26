import type { EspeceContent } from "../types"

/**
 * Fiche espèce — Vieille (Labrus bergylta).
 * Le grand labride strictement rocheux : Bretagne en tête, au crabe au pose sur la roche.
 * Façades : Manche-Atlantique (cœur de zone, surtout Bretagne) + Méditerranée (présence marginale).
 * Pas de maille légale, mais croissance très lente → no-kill recommandé au-delà de la conso.
 */
export const vieilleEspece: EspeceContent = {
  slug: "vieille",

  intro: [
    `La vieille, c'est le gros labride des cailloux : trapue, colorée comme un poisson tropical, scotchée à la roche du matin au soir. Du bord, elle ne pardonne pas l'amateurisme : la touche est un coup mat et lourd, suivi d'un départ brutal qui plonge droit dans la faille. Si tu ne la décolles pas du fond dans la première seconde, elle te scie ton bas de ligne sur l'arête la plus proche. C'est le combat le plus rustique et le plus franc de nos côtes rocheuses.`,
    `Elle est strictement liée à la roche : enrochements, têtes de roche, tombants couverts d'algues, failles encombrées de laminaires. Pas un poisson de sable, jamais. La Bretagne, c'est son royaume (Finistère, Morbihan, côtes du Trégor), partout où le granit plonge dans une eau froide et brassée. On la trouve aussi tout le long de la façade atlantique sur les zones rocheuses, et de façon plus marginale en Méditerranée, sur les secteurs de roche profonde. Les vieux mâles, les « coqs », virent au bleu-vert électrique et dépassent largement les 50 cm.`,
    `Une seule approche la prend vraiment du bord : l'appât naturel posé au contact de la roche. Crabe vert, bernard-l'ermite, parfois un gros ver, calé au plus près du dur, là où elle patrouille. Retiens d'emblée une règle qui n'est pas dans la loi mais qui devrait l'être : la vieille grandit terriblement lentement. Un beau coq de 50 cm peut avoir vingt ans. Garde un poisson moyen pour la marmite si tu veux, mais relâche les gros sujets : c'est du capital reproducteur qui ne se remplace pas.`,
  ],

  identity: {
    famille: `Labridés (Labrus bergylta)`,
    tailleCourante: `25-40 cm du bord, 45 cm+ pour les beaux sujets`,
    tailleMax: `~60 cm pour 4 kg et plus chez les vieux coqs`,
    habitat: `Strictement liée à la roche : enrochements, têtes de roche, tombants à laminaires : 1 à 15 m`,
    regime: `Crabes, bernard-l'ermite, moules, oursins, mollusques : dentition broyeuse puissante`,
  },

  regulation: {
    verifiedAt: "23/06/2026",
    source: "Arrêté du 26 octobre 2012 modifié ; arrêté du 17 mai 2011 modifié : la vieille n'y figure pas",
    minSizeCm: { "manche-atlantique": null, mediterranee: null },
    marquage: false,
    items: [
      `<strong>Manche et Atlantique : pas de taille minimale réglementaire de capture en pêche de loisir.</strong> La vieille ne figure pas dans la liste des espèces réglementées (arrêté du 26 octobre 2012 modifié).`,
      `<strong>Méditerranée : pas de taille minimale réglementaire de capture en pêche de loisir</strong> non plus pour cette espèce.`,
      `<strong>Pas de marquage obligatoire</strong> et pas de quota national pour la vieille en pêche de loisir.`,
      `Absence de maille ne veut pas dire absence de bon sens : <strong>la vieille a une croissance très lente</strong> (un gros coq peut avoir vingt ans). Au-delà de ta consommation immédiate, pratique le no-kill et relâche les beaux sujets, décrochés dans l'eau quand c'est possible. Vérifie aussi la réglementation locale (réserves, parcs marins) avant de pêcher.`,
    ],
  },

  saisons: {
    "manche-atlantique": [
      {
        saison: "Printemps",
        activite: 2,
        note: `Reprise nette dès que l'eau se réchauffe en avril-mai : les vieilles remontent sur les têtes de roche et remangent franchement le crabe.`,
      },
      {
        saison: "Été",
        activite: 3,
        note: `Pleine saison en Bretagne : poisson actif et collé au bord, beaux coqs sur les enrochements aux marées de vives-eaux.`,
      },
      {
        saison: "Automne",
        activite: 3,
        note: `Excellent jusqu'en octobre-novembre : la vieille se gave avant l'hiver, gros sujets sur les tombants à laminaires.`,
      },
      {
        saison: "Hiver",
        activite: 1,
        note: `Activité au plus bas : eau froide, poisson calé en profondeur sur la roche, touches rares et molles depuis le bord.`,
      },
    ],
    mediterranee: [
      {
        saison: "Printemps",
        activite: 1,
        note: `Présence marginale sur les secteurs de roche : quelques sujets possibles, mais c'est une cible secondaire ici.`,
      },
      {
        saison: "Été",
        activite: 2,
        note: `Meilleure période locale : la vieille fréquente les enrochements et tombants rocheux, prise au pose près du dur.`,
      },
      {
        saison: "Automne",
        activite: 2,
        note: `Activité correcte tant que l'eau reste douce : pêche au contact de la roche profonde sur les caps et digues rocheuses.`,
      },
      {
        saison: "Hiver",
        activite: 1,
        note: `Poisson rare et peu mobile au bord en saison froide : occasion plutôt qu'objectif de session.`,
      },
    ],
  },

  techniques: [
    {
      slug: "flottante",
      why: `La flottante au contact de la roche est l'approche la plus fine : bolognaise ou anglaise robuste, flotteur réglé pour poser l'appât juste au-dessus du fond, le long d'un tombant ou d'une faille. Un demi-crabe vert ou un bernard-l'ermite décortiqué, hameçon fort de fer, et tu laisses dériver au ras du dur. À l'enfoncement franc, ferre net et bride aussitôt : tout se joue dans la première seconde, avant qu'elle ne replonge dans la roche.`,
    },
    {
      slug: "surfcasting",
      why: `Le surfcasting de roche (plutôt une pêche au pose calée court) fonctionne bien sur les enrochements et les têtes de roche accessibles. Canne puissante, fil costaud (35-40/100), bas de ligne court et solide, plomb juste suffisant pour tenir le poste sans s'enrouler dans les laminaires. Appât : crabe entier ou demi-crabe ligaturé. Bannière tendue, canne en main : la vieille ne prévient pas, elle embarque, et il faut la décoller du fond instantanément.`,
    },
  ],

  postes: [
    `La vieille tient des postes très précis, toujours au contact du dur : têtes de roche isolées, tombants couverts de laminaires, failles et trous au pied des enrochements, gros blocs immergés près des digues et des pointes granitiques. Cherche la cassure : l'endroit où le fond passe brutalement de la roche plate au trou, où elle patrouille en quête de crabes. Si rien ne mord en vingt minutes sur un poste, déplace-toi de quelques mètres : elle est sédentaire et fidèle à son trou, c'est à toi d'aller le trouver.`,
    `Côté conditions, elle aime une eau brassée et oxygénée mais pas un déchaînement total. Un petit vent de secteur ouest, une houle résiduelle d'un demi-mètre à un mètre, une eau légèrement teintée : ce sont d'excellentes fenêtres, surtout par mer calme et claire où elle devient méfiante. Évite la grosse tempête qui colle l'appât dans les laminaires et rend le poste impêchable. Le matin tôt et la fin de journée restent les meilleurs créneaux horaires.`,
    `En Manche-Atlantique, la marée commande : pêche le montant et le début de descendante, idéalement les deux heures autour de la pleine mer, quand l'eau recouvre les têtes de roche et les zones à crabes où elle vient chasser. Cale ta session sur la courbe de marée de ton spot, vives-eaux de préférence pour mettre du courant et du brassage. En Méditerranée le marnage est négligeable : c'est la houle légère et le courant le long des tombants qui jouent le rôle de déclencheur en décollant la nourriture du caillou.`,
  ],

  faq: [
    {
      q: `Quelle est la taille minimale de la vieille ?`,
      a: `Il n'y a pas de taille minimale réglementaire de capture pour la vieille en pêche de loisir, ni en Manche-Atlantique ni en Méditerranée : l'espèce ne figure pas dans l'arrêté du 26 octobre 2012 modifié. Aucun marquage ni quota national non plus. Mais attention : pas de maille ne veut pas dire qu'il faut tout garder. La vieille grandit très lentement, alors relâche les beaux sujets et ne prélève que ce que tu manges.`,
    },
    {
      q: `Quel est le meilleur appât pour pêcher la vieille du bord ?`,
      a: `Le crabe est roi : crabe vert entier ou en demi, ligaturé pour qu'il tienne sur l'hameçon. Le bernard-l'ermite décortiqué est presque aussi efficace, suivi de la moule serrée au fil élastique et du gros ver dur. Sa dentition broie tout, donc privilégie un appât solide et un hameçon fort de fer. Pêche toujours au contact de la roche, au plus près des failles.`,
    },
    {
      q: `Quand pêcher la vieille ?`,
      a: `En Bretagne et sur l'Atlantique, vise le printemps à l'automne, avec un pic en été : eau réchauffée, poisson collé au bord. Pêche la marée montante et l'étale de pleine mer, le matin ou en fin de journée. En Méditerranée, c'est une cible plus marginale, surtout active l'été sur les secteurs de roche. L'hiver, eau froide oblige, elle se cale en profondeur et devient difficile au bord.`,
    },
    {
      q: `La vieille est-elle bonne à manger ?`,
      a: `Oui, c'est un poisson de roche correct : chair blanche et ferme, parfaite en soupe, en bouillabaisse bretonne ou cuite entière au four. Elle est un peu fade seule, donc relevée par une bonne marinade ou un court-bouillon, elle se défend bien. Un sujet moyen suffit pour une portion ; garde les gros coqs pour la photo et relâche-les : ils sont vieux et précieux pour la reproduction.`,
    },
  ],
}
