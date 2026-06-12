import type { SpeciesContent } from './types'

/**
 * Contenu éditorial — Sar commun (Diplodus sargus).
 * Poisson des zones agitées : ressac, enrochements, digues battues.
 * Façades : Méditerranée (cœur de zone) + Atlantique sud (17-33-40-64-85).
 */
export const sarContent: SpeciesContent = {
  intro: [
    `Le sar commun, c'est le sparidé des zones qui bougent. Là où la dorade cherche le calme, lui patrouille dans le ressac : enrochements battus, pieds de digues, sorties de calanques, eau blanche chargée d'oxygène. Un poisson trapu, méfiant, avec une dentition capable de broyer un crabe — et l'une des touches les plus sèches que tu croiseras du bord.`,
    `Tu le trouves collé à la roche, souvent dans moins de 3 m d'eau, parfois dans 50 cm de mousse. En Méditerranée, c'est LE poisson roi des digues et des calanques. Sur l'Atlantique, il occupe la façade sud : du Pays basque aux pertuis charentais, sur les épis, les pointes rocheuses et les enrochements portuaires.`,
    `Deux approches le prennent vraiment du bord : le surfcasting léger dans les vagues et la flottante au ras des cailloux. Dans les deux cas, la règle est la même — bas de ligne discret, appât naturel solide, ferrage immédiat. Il ne te laissera pas de deuxième chance.`,
  ],

  techniques: {
    surfcasting: {
      paragraphs: [
        `Oublie le surfcasting lourd à 100 m : le sar se prend court, dans l'eau blanche, souvent entre 20 et 50 m du bord. Une canne de 4,20 m de puissance 60-100 g suffit largement, montée avec un plomb montre ou pyramide de 40 à 80 g selon le ressac. Cherche les veines de courant le long des enrochements, les fosses creusées au pied des épis, la zone exacte où la vague vient de casser : c'est là qu'il fouille le fond retourné par la houle.`,
        `Côté montage, fais simple et discret : un trainard court de 30 à 50 cm en fluorocarbone 26 à 30/100, hameçon fort de fer n° 2 à 4, et un appât qui tient le ressac — demi-crabe vert ligaturé, moule décoquillée serrée au fil élastique, gros ver dur, ou bibi côté Méditerranée. Pêche canne haute, bannière tendue en permanence : la touche est un coup sec unique, parfois violent. Ferre dans la seconde, sinon tu remontes un hameçon nettoyé. Une fois piqué, il file droit dans la roche : bride d'entrée, sans lui laisser un mètre.`,
      ],
      bullets: [
        `Canne surf légère 4,20 m / 60-100 g, moulinet 5000-6000, corps de ligne 30/100 + arraché`,
        `Plombs montre ou pyramide 40-80 g, à adapter à la force du ressac`,
        `Trainard court 30-50 cm en fluorocarbone 26-30/100 — pas d'empiles multiples`,
        `Hameçons forts de fer n° 2 à 4`,
        `Appâts : demi-crabe vert, moule au fil élastique, ver dur, bibi en Méditerranée`,
        `Bannière toujours tendue : la touche dure une seconde, le ferrage doit suivre`,
      ],
      seasonNote: `D'avril à novembre, avec un pic net en fin d'été et en automne dès que la mer se forme : un bon coup de vent la veille, et les sars sont à table dans le ressac.`,
    },

    flottante: {
      paragraphs: [
        `La flottante, c'est la pêche du sar au contact : tu pêches à gratter, au ras du caillou, dans la mousse du ressac. Une bolognaise de 5 à 6 m fait l'affaire, avec un flotteur de 2 à 6 g selon le clapot. Sonde court : la plupart des touches viennent entre 1 et 3 m de profondeur, souvent à moins de 2 m du bord. Un broumé léger — moules écrasées, sardine pilée mélangée au sable — colle les poissons sous ta canne, surtout en Méditerranée. Et reste mobile : sans touche au bout de vingt minutes, change de bloc — les sars tiennent des postes précis, c'est à toi d'aller les trouver.`,
        `C'est une pêche fine : fluorocarbone 22 à 26/100, hameçon n° 4 à 6 selon la taille de l'appât. Les appâts rois : crabe mou, bernard-l'ermite décortiqué, moule fraîche. Le sar tape sec et recrache aussi vite — au moindre enfoncement franc du flotteur, ferre. Le combat est court mais brutal : il pique droit vers son trou et les trois premières secondes décident de tout. Garde la canne haute, frein réglé ferme, et écarte-le du caillou immédiatement.`,
      ],
      bullets: [
        `Bolognaise 5-6 m à action de pointe, nylon 24-28/100 en corps de ligne`,
        `Flotteur 2-6 g selon le clapot, plombée groupée près du bas de ligne`,
        `Bas de ligne fluorocarbone 22-26/100, hameçon n° 4 à 6`,
        `Appâts : crabe mou, bernard-l'ermite, moule décoquillée`,
        `Broumé léger pour fixer le poste : moules écrasées + sable`,
        `Ferrage instantané, frein ferme — tout se joue dans les 3 premières secondes`,
      ],
      seasonNote: `Praticable toute la belle saison ; vise l'aube et le coup du soir avec une mer légèrement formée — le plat total sur eau cristalline rend le sar quasi impêchable en pleine journée.`,
    },
  },

  facades: {
    'manche-atlantique': `Sur la façade atlantique, le sar est un poisson du sud : Pays basque, Landes, Gironde, Charente-Maritime, Vendée. Cherche-le sur les digues et enrochements portuaires (Socoa, Capbreton), les épis landais, les pointes rocheuses des pertuis. La marée commande tout : pêche le montant, surtout les deux dernières heures avant la pleine mer, quand l'eau recouvre les moulières et les zones à crabes. Au nord de la Loire, il devient anecdotique — n'en fais pas une cible.`,
    mediterranee: `En Méditerranée, le sar est LE poisson des digues, des jetées et des calanques. Sa meilleure fenêtre : juste après un coup de mistral ou de levant, quand l'eau blanchie par le ressac le décomplexe totalement. Par eau claire et mer plate, affine tout (18-22/100 en pointe) ou attends le soir. Les blocs des grandes digues portuaires, les failles des calanques et les plateformes rocheuses corses tiennent du poisson toute l'année, avec de très beaux sujets en hiver.`,
  },

  conditions: `Le sar mange quand ça bouge. Une mer formée, une eau teintée par le ressac, un vent de face de 15 à 25 km/h : ce sont tes meilleures conditions — souvent celles où plus personne ne pêche. À l'inverse, plat total et eau cristalline égalent poisson ultra-méfiant : descends en diamètre ou reviens au crépuscule. Sur l'Atlantique, cale tes sessions sur la marée montante : regarde la courbe du spot et vise les deux heures avant la pleine mer, étale comprise. Côté horaires, aube et coup du soir dominent, et le surfcasting de nuit sort les plus gros sujets.`,
}
