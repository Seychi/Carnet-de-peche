import type { SpeciesContent } from './types'

/**
 * Contenu éditorial ROUGET-BARBET DE ROCHE (Mullus surmuletus) — pages
 * programmatiques /peche/rouget/<technique>/<dépt>. UNE seule technique autorisée
 * par la matrice (lib/seo/programmatic.ts) : surfcasting. La fiche profonde
 * n'en documente pas d'autre du bord, on n'en invente pas.
 * Inventaire mesuré le 2026-08-17 : 43 spots approuvés très dispersés (23 dépts),
 * dont 5 seulement passent le seuil de 3 spots (33, 34, 40, 44, 85). Les DEUX
 * façades sont servies (34 = Méditerranée, les 4 autres = Atlantique).
 * Cohérent avec lib/especes/content/rouget.ts (maille 15 cm sur les deux façades).
 */
export const rougetContent: SpeciesContent = {
  intro: [
    `Le rouget-barbet de roche, c'est le fouisseur orangé du sable. Deux longs barbillons sous le menton, une robe rosée qui s'allume de rouge dès qu'il sort de l'eau, et une chair qui en fait l'un des poissons les plus recherchés de nos côtes. Du bord, ce n'est pas un poisson de combat : c'est un poisson de finesse, qui récompense la lecture du fond et la patience bien plus que la puissance.`,
    `Tu le trouves partout où il peut labourer : plages de sable propre, langues de gravier, mélanges sablo-graveleux au pied des digues, bordures d'herbiers. Il avance le nez au fond, barbillons en éventail, et remue le substrat pour débusquer vers, petits crustacés et mollusques. Ce comportement dicte toute ta pêche : un appât posé au ras du sable, immobile ou ramené très lentement, sur une zone qu'il est en train de fouiller. Il est présent sur les deux façades, avec un net pic d'été et d'automne.`,
    `Une seule approche le prend vraiment du bord : le surfcasting léger, fil tendu, sur fond sablo-graveleux, avec un appât naturel discret. Pas besoin de lancer loin : il vient souvent à 20 ou 40 m, dans la première barre, là où le sable se mélange au gravier. Sa touche est typée, une série de petits tocs nerveux pendant qu'il tâte avant d'aspirer. Laisse-le faire, temporise, ferre quand la pointe se charge vraiment. Trop pressé, tu ne ramènes que ta plombée. Sa maille est de 15 cm, sur les deux façades.`,
  ],

  techniques: {
    surfcasting: {
      paragraphs: [
        `Tout se joue sur la nature du fond, pas sur la distance. Une canne fine de 80 à 120 g, une plombée juste assez lourde pour tenir, un bas de ligne en 18 à 22/100 monté sur empiles courtes, et des hameçons n° 4 à 8 : voilà l'ensemble du matériel. Vise les transitions, là où le sable propre se mélange au gravier, les bordures d'herbiers, les langues sableuses entre deux têtes de roche, les abords sableux au pied des digues et des épis. Sur l'Atlantique, repère ces dépressions et ces chenaux à marée basse : ce sont tes coups une fois la mer revenue.`,
        `La touche du rouget est une signature, apprends-la et tu doubleras tes prises. Il tape d'abord une série de petits tocs nerveux, parce qu'il tâte l'appât de ses barbillons avant de l'aspirer. Ne ferre surtout pas au premier toc : laisse la canne se charger franchement, puis accompagne sans grand coup. Garde le fil tendu en permanence, c'est la seule façon de lire ces micro-touches. Et si le poste reste muet, essaie un ramené très lent par paliers, quelques tours de moulinet puis un arrêt : ce déplacement d'appât sur le sable déclenche souvent l'attaque là où l'immobilité ne donne rien.`,
      ],
      bullets: [
        `Canne fine 80-120 g, plombée minimale qui tient le fond, distance 20-50 m`,
        `Bas de ligne 18-22/100, empiles COURTES, hameçons n° 4 à 8`,
        `Fonds visés : transition sable et gravier, bordures d'herbiers, abords de digues et d'épis`,
        `Appâts : ver américain, arénicole, gravette, ver dur, bibi, toujours frais`,
        `Ne ferre PAS sur les petits tocs, attends que la canne se charge, puis accompagne`,
        `Poste muet : tente un ramené très lent par paliers pour provoquer la touche`,
      ],
      seasonNote: `Pic de juin à octobre sur les deux façades, avec un cœur d'été net et souvent les plus beaux sujets en septembre et octobre. En hiver, il décroche vers le large et devient une cible secondaire du bord.`,
    },
  },

  facades: {
    'manche-atlantique': `Sur l'Atlantique, cale ta session sur la marée : les deux dernières heures du montant et le début du descendant sont les meilleures fenêtres, quand l'eau recouvre les zones de sable et de gravier qu'il vient fouiller. Le rouget se rapproche du bord avec le réchauffement, plutôt à partir de mai, et devient vraiment régulier en plein été du sud de la Bretagne au golfe de Gascogne. Repère les dépressions et les chenaux à marée basse : ce que tu vois à sec est exactement ce que tu pêcheras à mer haute.`,
    mediterranee: `En Méditerranée, le marnage est négligeable : ce sont l'heure et l'état de la mer qui commandent les repas. Vise le lever et le coucher du jour, quand l'eau cristalline cesse de le rendre méfiant, et surtout les lendemains de petit coup de mer, quand le fond reste légèrement troublé et que la nourriture a été remise en suspension. Les plus gros rougets de l'année se prennent souvent en septembre et octobre, sur le sable et le sablo-graveleux, du pied des digues jusqu'aux plages ouvertes.`,
  },

  conditions: `Le rouget aime une mer qui a un peu de vie sans être déchaînée. Un léger clapot, une houle résiduelle d'un demi-mètre, une eau légèrement teintée par un coup de mer qui retombe : c'est l'idéal, parce que le fond remué libère la nourriture et met les poissons à table. À l'inverse, eau parfaitement cristalline et plat d'huile en plein soleil le rendent méfiant : descends alors en diamètre et vise l'aube ou le crépuscule. Un vent portant de 10 à 20 km/h qui crée un peu de surface aide presque toujours. Ne reste pas figé sur un poste muet : décale-toi de quelques dizaines de mètres pour retrouver la bonne nature de fond, c'est ce qui fait la différence.`,
}
