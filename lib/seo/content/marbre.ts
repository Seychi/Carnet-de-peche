import type { SpeciesContent } from './types'

/**
 * Contenu éditorial MARBRÉ (Lithognathus mormyrus) — pages programmatiques
 * /peche/marbre/<technique>/<dépt>. Techniques autorisées par la matrice
 * (lib/seo/programmatic.ts) : surfcasting (la reine), flottante (appoint).
 * Espèce MÉDITERRANÉENNE : l'inventaire mesuré ne lui ouvre que les 9 départements
 * de la façade (112 spots approuvés, mesuré le 2026-08-17), donc le texte
 * `facades['manche-atlantique']` n'est jamais servi. Il est renseigné parce que le
 * type l'exige, et il dit le statut marginal réel plutôt que d'inventer une pêche.
 * Cohérent avec la fiche profonde lib/especes/content/marbre.ts (maille 20 cm Med).
 */
export const marbreContent: SpeciesContent = {
  intro: [
    `Le marbré, c'est le sparidé fin des plages de sable. Un corps argenté barré de fines marbrures sombres verticales, d'où son nom, et un museau allongé qui lui sert à fouiller le substrat comme un cochon truffier. Là où le sar réclame du caillou et du ressac, lui veut du sable propre, des cuvettes et des veines où s'accumulent les vers et les petits crustacés qu'il déterre.`,
    `C'est un poisson de Méditerranée, présent du Roussillon à la Corse, qu'on pêche du bord sur les grandes plages, les pointes sableuses et les bordures de graus, du printemps à l'automne. En Manche et sur la façade atlantique, il reste anecdotique : quelques sujets dans le sud-ouest, rien qui justifie d'y organiser une session. Ne le cherche pas au nord, l'eau y est trop froide pour lui.`,
    `Sa pêche, c'est de la dentelle. Petite bouche, méfiance de tous les instants, touche discrète qui se résume souvent à une bannière qui se détend. Bas de ligne fin, hameçons piquants, esche fraîche et soignée : le marbré récompense le pêcheur appliqué bien plus que le lanceur de plomb. Et il s'approche vraiment du bord à la tombée du jour, puis dans la nuit. Dernier point à connaître avant de partir : en Méditerranée, sa maille est de 20 cm.`,
  ],

  techniques: {
    surfcasting: {
      paragraphs: [
        `Le surfcasting du marbré se joue à la finesse, pas à la distance. Une canne souple de 100 à 150 g, un moulinet 5000 et un corps de ligne en 28/100 avec arraché suffisent : tu poses tes lignes entre 20 et 60 m selon le profil de la plage, souvent bien plus près que tu ne le crois. Le montage doit être discret : bas de ligne en 16 à 22/100, empiles courtes, hameçons fins et piquants n° 4 à 8, et une ou deux perles flottantes pour décoller l'esche du sable et la faire onduler. Une plombée juste assez lourde pour tenir, pas plus : le grappin surdimensionné ancre ta ligne et noie la touche.`,
        `Tout le reste est affaire de lecture de plage et de fraîcheur d'appât. Repère à la lumière du jour, ou par eau claire, les cuvettes creusées par la houle, les veines plus sombres entre deux bancs de sable, les marches près du bord : c'est là qu'il fouille, et un mètre de côté change tout. Côté esche, le ver de sable est roi (gravette, ver américain, ver dur), suivi du couteau et du bibi, toujours frais et esché proprement. La touche est souvent une simple détente de bannière ou un tapotement mou, jamais un départ franc : garde le fil tendu, surveille ta pointe, et si rien ne se passe en vingt minutes, décale tes lignes plutôt que d'attendre.`,
      ],
      bullets: [
        `Canne souple 100-150 g, corps de ligne 28/100 avec arraché, distance 20-60 m`,
        `Bas de ligne fin 16-22/100, empiles courtes, hameçons piquants n° 4 à 8`,
        `Perles flottantes pour décoller l'esche du sable`,
        `Plombée minimale qui tient : un grappin trop lourd noie une touche déjà discrète`,
        `Appâts : gravette, ver américain, ver dur, couteau, bibi, toujours frais`,
        `Vise les cuvettes et les veines, et déplace tes lignes si rien ne touche en 20 minutes`,
      ],
      seasonNote: `De mai à octobre avec un pic net de juin à septembre, et surtout à la tombée du jour puis en première partie de nuit, quand il vient fouiller près du bord.`,
    },

    flottante: {
      paragraphs: [
        `La flottante est un appoint, pas la voie principale : le marbré est un poisson de fond, et le flotteur ne le battra jamais sur une grande plage. Elle prend tout son sens sur une configuration précise : une pointe sableuse, un bord de grau peu profond, une bordure où un courant longe le sable. Là, une bolognaise de 5 à 6 m avec un flotteur de 2 à 4 g te permet de présenter un ver à quelques centimètres du fond, exactement dans la veine, et de le faire dériver naturellement au lieu de le laisser posé.`,
        `Règle le fond au plus juste : l'esche doit frôler le sable, jamais traîner dessus ni flotter au-dessus. Bas de ligne en 16 à 18/100, hameçon fin n° 6 à 8, une gravette ou un ver américain bien esché. Accompagne la dérive en retenant très légèrement le flotteur, ce qui relève un peu l'appât et déclenche souvent la touche. Comme au surfcasting, la touche est discrète : le flotteur hésite, s'enfonce à moitié, repart. Ferre sur le mouvement franc, pas sur le premier frémissement. C'est une pêche de mer plate et d'eau claire, quand le surfcasting n'a rien à offrir.`,
      ],
      bullets: [
        `Bolognaise 5-6 m, flotteur léger 2-4 g, corps de ligne 20/100`,
        `Sonde réglée au plus juste : l'esche frôle le sable sans traîner`,
        `Bas de ligne 16-18/100, hameçon fin n° 6 à 8`,
        `Poste type : pointe sableuse, bord de grau, veine de courant qui longe le sable`,
        `Retiens légèrement la dérive pour animer le ver, c'est souvent ce qui déclenche`,
        `Ferre sur le mouvement franc du flotteur, pas sur le premier frémissement`,
      ],
      seasonNote: `Solution de mer plate et d'eau claire, du printemps à l'automne, sur une bordure précise que le surfcasting couvre mal.`,
    },
  },

  facades: {
    'manche-atlantique': `Le marbré n'est pas une cible de la façade Manche-Atlantique : quelques sujets isolés remontent dans le sud-ouest, du bassin d'Arcachon au Pays basque, mais sans régularité, et l'eau de la Manche est bien trop froide pour lui. Nous ne publions donc pas de page départementale marbré hors Méditerranée. Sur ces côtes, oriente ton surfcasting vers la dorade grise, le bar ou la sole selon la saison.`,
    mediterranee: `La Méditerranée est son terrain, du Roussillon à la Corse. Cherche le sable propre bordé d'un relief discret qui piège la nourriture : cuvettes creusées par la houle, veines plus sombres entre deux bancs, abords des graus et des sorties d'eau, marches et fosses proches du bord. Sur une plage qui paraît uniforme, c'est ce micro-relief qui fait tout. Le marnage étant négligeable, ce n'est pas la marée qui commande mais la lumière, le vent et l'état du sable : pêche le crépuscule et la nuit, et note bien le poste exact de tes prises, car les cuvettes productives reviennent d'une année sur l'autre.`,
  },

  conditions: `Le marbré aime une mer raisonnablement calme à légèrement formée, qui brasse assez le sable pour libérer vers et crustacés sans rendre l'eau impêchable. La configuration idéale, c'est la houle résiduelle du lendemain d'un coup de vent : le fond a été retourné, la nourriture est à disposition, et le poisson est à table près du bord. À l'inverse, une grosse mer disperse les bancs et noie une touche déjà minuscule. Le créneau en or reste la tombée du jour et la première partie de nuit, quand sa méfiance baisse. Amorce léger autour de tes lignes pour fixer le poste, et logue le poste, l'heure et l'état de la mer : sur une même plage, ce sont toujours les mêmes cuvettes qui donnent.`,
}
