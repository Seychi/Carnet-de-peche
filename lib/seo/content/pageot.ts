import type { SpeciesContent } from './types'

/**
 * Contenu éditorial PAGEOT COMMUN (Pagellus erythrinus) — pages programmatiques
 * /peche/pageot/<technique>/<dépt>. Techniques autorisées par la matrice
 * (lib/seo/programmatic.ts) : surfcasting (la reine), flottante (palangrotte).
 * Inventaire mesuré le 2026-08-17 : 101 spots approuvés, mais seuls 7 départements
 * méditerranéens passent le seuil de 3 spots (34, 64 et 30 sont écartés). Le texte
 * `facades['manche-atlantique']` n'est donc jamais servi ; il est renseigné parce
 * que le type l'exige. Cohérent avec lib/especes/content/pageot.ts (maille 15 cm Med).
 */
export const pageotContent: SpeciesContent = {
  intro: [
    `Le pageot commun, c'est le petit sparidé rose argenté du sable, du gravier et des bordures de coralligène. Reflets cuivrés sur le dos, ventre nacré, une touche discrète, et une fois ferré il tire droit et nerveux pour son gabarit. C'est un poisson de fond et un poisson de patience : tu le cherches sur le substrat, jamais en surface, et tu le prends en posant un appât naturel là où il fouille.`,
    `Ne le confonds pas avec ses cousins. On parle ici du pageot commun (Pagellus erythrinus), ni de la dorade rose (Pagellus bogaraveo), bien plus grosse et soumise à marquage, ni du pageot acarne, reconnaissable à sa tache noire à l'aisselle de la pectorale. Le pageot commun reste modeste, 20 à 30 cm du bord en moyenne, mais il compense par le nombre et par une chair excellente. En Méditerranée, sa maille est de 15 cm.`,
    `Deux approches le prennent du bord. Le surfcasting léger, pour poser l'esche sur le sable ou le gravier qu'il laboure, et la pêche à soutenir sous flotteur, le long des digues et des marges du coralligène. Dans les deux cas, le même credo : bas de ligne fin, petits hameçons, appât naturel frais. Il a une bouche modeste et il inspecte avant de mordre, surtout par eau claire : le matériel grossier ne prend pas de pageot.`,
  ],

  techniques: {
    surfcasting: {
      paragraphs: [
        `Le surfcasting du pageot est un surfcasting léger, presque une pêche à l'anglaise posée. Une canne souple de 80 à 120 g, un montage à plombée fixe ou coulissante, et surtout un bas de ligne fin en 16 à 20/100 avec des hameçons n° 6 à 2 : sa bouche est modeste, l'hameçon doit suivre. Vise le sable et le gravier au pied des digues, les plages à fond mixte, et surtout la marge du coralligène, cette frontière entre la roche et le sable où il vient fouiller. La distance importe peu, la nature du fond fait tout.`,
        `Tends bien ta bannière, parce que la touche du pageot se lit et ne se devine pas : une série de petits coups secs pendant qu'il tâte l'appât, puis un départ franc. Ne ferre pas sur les tocs, tu ne ramènerais qu'un hameçon nettoyé. Attends que la canne se plie vraiment, puis accompagne. Si rien ne vient au bout de vingt à trente minutes, déplace ton appât de quelques mètres au lieu de t'entêter : le pageot fouine des zones précises, chenaux, dépressions entre deux barres de sable, creux où le courant dépose la nourriture.`,
      ],
      bullets: [
        `Canne souple 80-120 g, plombée fixe ou coulissante, pas de matériel lourd`,
        `Bas de ligne fin 16-20/100, hameçons n° 6 à 2 (bouche modeste)`,
        `Fonds visés : sable et gravier en pied de digue, marges du coralligène, plages mixtes`,
        `Appâts : ver américain, gravette, bibi, morceau de crevette ou de couteau`,
        `Bannière tendue : petits tocs d'inspection, PUIS départ franc, ferre sur le départ`,
        `Sans touche en 20 à 30 minutes, déplace-toi de quelques mètres`,
      ],
      seasonNote: `Bon du printemps à l'automne en Méditerranée, avec des sessions plus régulières à l'aube, au crépuscule et de nuit, quand il se rapproche franchement du bord.`,
    },

    flottante: {
      paragraphs: [
        `La flottante, appelée aussi pêche à soutenir ou palangrotte selon les régions, excelle là où le surfcasting est gêné : le long des digues, des jetées et des bordures de coralligène, où le fond accroche et où la distance ne sert à rien. Tu présentes l'appât à mi-fond ou juste au-dessus du substrat, à courte distance, avec un flotteur léger ou une simple plombée qui descend lentement. Une bolognaise de 5 à 6 m ou une canne à soutenir courte depuis le quai, un corps de ligne en 20/100, un bas de ligne en 16/100 et des hameçons n° 8 à 4.`,
        `Le geste qui change tout, c'est l'amorçage. Un mélange de sable et de chair écrasée, sardine ou moule, jeté par petites doses au même endroit, fixe le banc sur ton poste et le fait monter dans la couche. Reste discret en diamètre : par eau claire, le pageot vient regarder, tourne autour, et repart si quelque chose le gêne. La touche est un enfoncement net après quelques hésitations : laisse-le engamer une seconde, puis ferre en souplesse. Sur un poste amorcé et tenu, tu enchaînes plusieurs poissons de suite.`,
      ],
      bullets: [
        `Bolognaise 5-6 m ou canne à soutenir depuis le quai, corps de ligne 20/100`,
        `Esche présentée à mi-fond ou juste au-dessus du substrat, à courte distance`,
        `Bas de ligne 16/100, hameçons n° 8 à 4`,
        `Amorçage sable + chair écrasée (sardine, moule) par petites doses régulières`,
        `Poste type : digues, jetées, bordures de coralligène, fonds encombrés`,
        `Laisse engamer une seconde après l'enfoncement, puis ferre en souplesse`,
      ],
      seasonNote: `Praticable toute la belle saison, et particulièrement productive de nuit et au crépuscule le long des ouvrages portuaires.`,
    },
  },

  facades: {
    'manche-atlantique': `Le pageot commun se rencontre sur l'Atlantique sud, mais il y reste discret, saisonnier, et notre catalogue n'y compte pas assez de spots pour publier une page départementale honnête. Nous ne servons donc de pages pageot qu'en Méditerranée. Sur la façade atlantique, oriente plutôt ton surfcasting vers la dorade grise, le bar ou le rouget selon le fond que tu as devant toi.`,
    mediterranee: `La Méditerranée est son domaine, du Roussillon à la Corse. Cherche les fonds meubles et surtout les transitions : sable et gravier en pied de digue, bordures de plage à fond mixte, et les marges du coralligène où la roche cède au sable. Les zones un peu creuses, les chenaux et les dépressions entre deux barres retiennent la nourriture déposée par le courant, et c'est là qu'il fouine. Le marnage étant négligeable, ce sont l'heure et le courant qui commandent, pas la marée : l'aube, le crépuscule et la nuit sont les meilleures fenêtres.`,
  },

  conditions: `Le pageot préfère une mer maniable à légèrement formée : un petit clapot qui remue le sable et libère vers et crustacés, sans grosse houle qui rendrait une pêche fine impossible. Un vent modéré de face ou de travers, qui ride la surface, le met en confiance par grand soleil. À l'inverse, mer démontée et eau très chargée le poussent au large, et c'est le moment de changer de poste ou d'espèce plutôt que d'insister. Ses meilleures fenêtres sont l'aube, le crépuscule et la nuit, quand il se rapproche du bord et perd sa méfiance. Amorce peu mais souvent, garde des diamètres fins, et laisse-lui le temps d'engamer avant de ferrer.`,
}
