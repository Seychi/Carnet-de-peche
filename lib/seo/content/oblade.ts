import type { SpeciesContent } from './types'

/**
 * Contenu éditorial OBLADE (Oblada melanura) — pages programmatiques
 * /peche/oblade/<technique>/<dépt>. Techniques autorisées par la matrice
 * (lib/seo/programmatic.ts) : flottante (la reine), surfcasting (appoint de nuit).
 * Espèce MÉDITERRANÉENNE : l'inventaire mesuré ne lui ouvre que les 9 départements
 * de la façade (227 spots approuvés, mesuré le 2026-08-17), donc le texte
 * `facades['manche-atlantique']` n'est jamais servi. Il reste renseigné parce que
 * le type l'exige, et il dit la vérité plutôt que d'inventer une pêche atlantique.
 * Cohérent avec la fiche profonde lib/especes/content/oblade.ts.
 */
export const obladeContent: SpeciesContent = {
  intro: [
    `L'oblade, c'est le sparidé qu'on prend pour un sar tant qu'on n'a pas vu sa queue. À la base de la caudale, une grosse tache noire cerclée de blanc : aucun autre poisson de nos digues ne porte ce point d'encre. Corps ovale, dos gris-bleu, flancs argentés rayés de fines lignes sombres. Vive, élégante, et beaucoup plus joueuse que sa réputation.`,
    `Là où le sar reste collé au caillou et où la dorade fouille le fond, l'oblade vit entre deux eaux. Elle patrouille en petits bancs le long des roches et au-dessus des herbiers de posidonie, dans les trois à six premiers mètres, souvent à portée de lancer d'une jetée ou d'une pointe. C'est une Méditerranéenne, présente du Roussillon à la Corse toute l'année : inutile de la chercher au-delà du golfe de Gascogne.`,
    `Sa pêche, c'est de la finesse pure. Petite bouche, vue perçante, méfiance redoutable de jour en eau claire. Mais au coup du soir, quand la lumière tombe, elle monte chasser dans la couche du dessus et oublie sa prudence : c'est ton créneau, et il dure une heure et demie. Pain, ver ou lanière fine sous flotteur léger, bas de ligne discret, et tu tiens l'une des plus jolies pêches du bord en été méditerranéen.`,
  ],

  techniques: {
    flottante: {
      paragraphs: [
        `La flottante est faite pour ce poisson de pleine eau. Bolognaise ou anglaise de 4 à 5 m, corps de ligne en 18/100, flotteur léger de 2 à 5 g, et surtout une sonde réglée entre 1,5 et 3 m : tu pêches la couche où patrouille le banc, jamais le fond. Le bas de ligne fait toute la différence, en 14 à 18/100 avec un hameçon fin de fer n° 8 à 12. Sa vue est trop bonne pour du gros diamètre, et sa bouche trop petite pour un gros hameçon. Côté esche, la boulette de pain reste imbattable, suivie du morceau de ver et de la fine lanière de sardine.`,
        `Le broumé n'est pas un détail, c'est la moitié du travail. Du pain mouillé pétri avec un peu de sable, ou de la sardine pilée, jeté par petites poignées régulières au même endroit : tu montes le banc dans la couche haute et tu le gardes devant toi toute la session. Un poste amorcé et tenu vaut dix lancers dispersés. La touche est vive et nette, le flotteur part franchement de côté ou plonge d'un coup. Ferre aussitôt mais sans brutalité, l'hameçon est fin et la lèvre fragile. Le combat est court, nerveux, avec des rushes latéraux en surface.`,
      ],
      bullets: [
        `Bolognaise ou anglaise 4-5 m, corps de ligne 18/100, flotteur léger 2-5 g`,
        `Sonde entre 1,5 et 3 m : l'oblade est entre deux eaux, pas au fond`,
        `Bas de ligne discret 14-18/100, hameçon fin de fer n° 8 à 12`,
        `Appâts : boulette de pain, morceau de ver, fine lanière de sardine, crevette`,
        `Broumé léger et RÉGULIER (pain mouillé ou sardine pilée) pour fixer le banc`,
        `Ferrage immédiat mais souple : hameçon fin, lèvre fragile`,
      ],
      seasonNote: `De la reprise du printemps, dès que l'eau passe les 15 à 16 °C, jusqu'en octobre, avec un pic net en plein été. Le créneau du jour, c'est l'heure qui entoure le coucher du soleil.`,
    },

    surfcasting: {
      paragraphs: [
        `Le surfcasting n'est pas la voie royale pour l'oblade, et il faut le pêcher autrement que pour un poisson de fond. L'erreur classique est de clouer l'esche sur le sable : l'oblade évolue à mi-hauteur et ne descendra pas la chercher. Monte donc un trainard long, 1,20 à 1,50 m, peu plombé, avec une ou deux perles flottantes qui décollent l'appât et le laissent onduler dans le courant. Une canne souple de 60 à 100 g suffit largement, avec un plomb juste assez lourd pour tenir : tu pêches à 20 ou 40 m, le long des enrochements ou au-dessus d'un herbier, pas au bout du monde.`,
        `L'intérêt réel de cette approche, c'est la nuit. Une fois la lumière tombée, la méfiance de l'oblade s'effondre et elle gobe sans inspecter, ce qui rend enfin possible une pêche où elle ne voit pas ton fil. Garde des appâts fins malgré tout, ver ou morceau de crevette sur hameçon n° 6 à 10, et surveille ta bannière : la touche reste discrète, souvent une simple détente suivie d'un départ. C'est aussi la façon de continuer à pêcher quand le clapot rend la flottante illisible.`,
      ],
      bullets: [
        `Canne souple 60-100 g, plombée juste suffisante pour tenir, distance courte (20-40 m)`,
        `Trainard LONG de 1,20 à 1,50 m, peu plombé, avec perles flottantes`,
        `Ne cloue pas l'esche au fond : l'oblade mange à mi-hauteur`,
        `Hameçons n° 6 à 10, appâts fins : ver, morceau de crevette, lanière`,
        `Pêche de nuit en priorité, le long des enrochements et des bordures d'herbier`,
        `Touche discrète : une détente de bannière avant le départ, reste sur la canne`,
      ],
      seasonNote: `Approche de nuit, du printemps à l'automne, et solution de repli quand le clapot rend le flotteur illisible.`,
    },
  },

  facades: {
    'manche-atlantique': `L'oblade n'est pas une cible de la Manche ni de l'Atlantique : l'espèce y est quasi absente et aucune pêche du bord ne s'organise autour d'elle sur cette façade. Si tu pêches en Bretagne, en Normandie ou dans les pertuis, vise plutôt la dorade grise, le bar ou le mulet selon le poste. Nous ne publions donc pas de page départementale oblade en dehors de la Méditerranée, faute de poisson et faute de spots.`,
    mediterranee: `La Méditerranée, c'est tout son territoire, du Roussillon à la Corse. Cherche-la sur les pieds de digues et de jetées, les pointes rocheuses, les tombants et les bordures d'herbiers de posidonie, partout où la roche claire cède la place à l'eau bleue. Un poste surélevé (môle, digue) aide énormément à repérer les bancs qui montent à la tombée du jour. Le marnage étant négligeable, ce n'est pas la marée qui décide mais la lumière et le courant de bordure : un léger courant qui longe l'ouvrage étale ton broumé et amène les poissons sur ton coup.`,
  },

  conditions: `L'oblade veut du calme et de la lumière déclinante, l'exact inverse du sar. Vise un vent sous 15 km/h, une mer plate à peine ridée et une eau claire. Le créneau en or, c'est le coup du soir, l'heure qui précède et celle qui suit le coucher du soleil, prolongé par la première partie de nuit : la méfiance tombe et le banc monte chasser entre deux eaux. En plein cagnard de midi sur eau cristalline, elle devient quasi impêchable : descends alors en diamètre, allonge ton bas de ligne, ou reviens au crépuscule. Amorce à petites doses tout du long, régulièrement, plutôt qu'en une fois : c'est ce qui garde le banc devant toi.`,
}
