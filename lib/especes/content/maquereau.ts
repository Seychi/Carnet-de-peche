import type { EspeceContent } from '../types'

/**
 * Fiche espèce maquereau (Scomber scombrus) — /especes/maquereau.
 * Le pélagique convivial des digues : présent mai-septembre en
 * Manche/Atlantique (octobre possible, absent l'hiver), passages plus
 * précoces (avril) et irréguliers en Méditerranée, souvent à l'aube.
 * Réglementation vérifiée le 12/06/2026.
 */
export const maquereauEspece: EspeceContent = {
  slug: 'maquereau',

  intro: [
    `Le maquereau, c'est la pêche plaisir par excellence : un pélagique nerveux de 25 à 40 cm qui débarque en bancs compacts dès que l'eau passe les 12-14 °C. Pas de spot secret, pas de matériel de pointe — une digue, le bon créneau, et ça mitraille à tous les lancers.`,
    `Ne te fie pas à sa réputation de poisson facile : sa fenêtre de présence est capricieuse. Un soir, le port bouillonne de chasses — sternes qui piquent, sardines qui giclent — et le lendemain, plus rien. Toute la pêche du maquereau consiste à être au bon endroit quand le banc passe, et à trouver vite la profondeur où il évolue. Compte la descente de ton plomb : dès la première touche, tu sais où répéter. Et pour sa taille, il tape fort, avec des rushs courts et rageurs qui surprennent toujours sur du matériel léger.`,
    `C'est aussi LA pêche conviviale du bord : en famille, depuis une jetée, avec des touches en rafale qui fabriquent les premiers souvenirs des gamins. Et dans la glacière, un poisson gras superbe à griller le soir même — à condition de l'avoir saigné et glacé dès la capture.`,
  ],

  identity: {
    famille: 'Scombridés (Scomber scombrus)',
    tailleCourante: '25-40 cm du bord',
    tailleMax: '60 cm pour les records — 45 cm, c\'est déjà un très beau sujet du bord',
    habitat: 'Pleine eau : pointes de digues, jetées, sorties de port et veines de courant quand les bancs approchent',
    regime: 'Petits poissons (sprats, lançons, juvéniles de sardine), zooplancton, petites crevettes',
  },

  regulation: {
    verifiedAt: '12/06/2026',
    source: 'Arrêté du 26 octobre 2012 modifié (tailles minimales pêche de loisir)',
    items: [
      `<strong>Maille : 20 cm</strong> — toute prise sous cette taille retourne à l'eau, sans exception.`,
      `<strong>Pas de quota récréatif national</strong> sur le maquereau à ce jour.`,
      `<strong>Prélève ce que tu consommes</strong> — les bancs ne sont pas inépuisables, et un seau plein qui finit à la poubelle ne fait honneur à personne.`,
    ],
  },

  saisons: {
    'manche-atlantique': [
      {
        saison: 'Printemps',
        activite: 2,
        note: `Les premiers bancs touchent les digues en mai, dès que l'eau passe 12-14 °C — passages encore irréguliers, parfois massifs.`,
      },
      {
        saison: 'Été',
        activite: 3,
        note: `Le pic : passages en rafale matin et soir sur digues et jetées. Quand le banc est là, le seau se remplit en une heure.`,
      },
      {
        saison: 'Automne',
        activite: 2,
        note: `Encore de beaux coups en septembre, des passages possibles en octobre, puis les bancs filent au large et les touches s'espacent.`,
      },
      {
        saison: 'Hiver',
        activite: 1,
        note: `Absent du bord : les bancs hivernent au large. Rien à espérer depuis les digues avant le retour des eaux à 12 °C.`,
      },
    ],
    mediterranee: [
      {
        saison: 'Printemps',
        activite: 3,
        note: `Passages plus précoces qu'en Atlantique, dès avril — irréguliers et souvent à l'aube, sur les digues profondes et sorties de port.`,
      },
      {
        saison: 'Été',
        activite: 2,
        note: `Présent mais capricieux : les bancs rôdent au large et s'approchent par épisodes. La flottante dans les ports sauve les matinées calmes.`,
      },
      {
        saison: 'Automne',
        activite: 2,
        note: `Derniers passages en début d'automne, toujours aux premières lueurs ; l'activité s'éteint à mesure que l'eau refroidit.`,
      },
      {
        saison: 'Hiver',
        activite: 1,
        note: `Quasi absent du bord : quelques poissons isolés au large, rien de ciblable à la canne depuis les digues.`,
      },
    ],
  },

  techniques: [
    {
      slug: 'leurres',
      why: `La technique reine : mitraillette de 3 à 6 plumes lestée d'un plomb ou d'un jig de 30 à 60 g, ramenée par tirées sèches. Quand tu as trouvé la profondeur du banc, c'est touche à tous les lancers, souvent à 2-3 poissons d'un coup. Petits jigs 10-30 g et cuillers sur les chasses pour plus de sport.`,
    },
    {
      slug: 'flottante',
      why: `Flotteur coulissant réglé entre 2 et 6 m, lanière de maquereau ou morceau de sardine : imbattable dans les ports quand le banc traîne entre deux eaux sans chasser. Touches franches, montage simple — idéale pour initier un débutant ou un enfant.`,
    },
  ],

  postes: [
    `Le maquereau suit la nourriture, pas la structure : inutile de chercher les roches ou les herbiers, vise les endroits où le courant concentre les proies. Pointes de digue, jetées, estacades, sorties de port et veines de courant sont les postes rois. Le meilleur indicateur reste le ciel : des sternes et des goélands qui piquent à répétition, c'est le banc qui chasse dessous. S'il est à 60 m et hors de portée, ne t'acharne pas — il tourne, il reviendra à distance de lancer.`,
    `Côté marée, le maquereau est moins calé sur les horaires qu'un bar, mais le courant rassemble ses proies : sur la Manche et l'Atlantique, les deux heures autour de la pleine mer et le début de la descendante concentrent l'essentiel des passages depuis les digues. Le vrai déclencheur, c'est la lumière : aube et crépuscule dominent largement, en pleine eau claire d'été. En Méditerranée, c'est encore plus marqué — la plupart des coups se jouent aux premières lueurs.`,
    `Le vent et la houle font le tri : une brise modérée qui ride la surface rassure le banc et aide franchement. À l'inverse, une mer formée ou une eau turbide après un gros coup de vent coupe net l'activité — le maquereau chasse à vue, il lui faut une eau propre. Après une tempête, laisse passer 24 à 48 h que l'eau se clarifie avant d'y retourner.`,
  ],

  faq: [
    {
      q: 'Quand pêcher le maquereau du bord ?',
      a: `De mai à septembre sur la Manche et l'Atlantique, avec un pic net en juillet-août sur les digues ; des passages restent possibles en octobre, puis plus rien l'hiver. En Méditerranée, les bancs arrivent plus tôt, dès avril, mais de façon irrégulière. Dans tous les cas, vise l'aube et le crépuscule : ce sont les créneaux qui concentrent l'essentiel des passages.`,
    },
    {
      q: 'Quelle est la taille minimale du maquereau ?',
      a: `La maille du maquereau en pêche de loisir est fixée à 20 cm (arrêté du 26 octobre 2012 modifié, vérifié le 12/06/2026). Tout poisson sous cette taille doit être remis à l'eau. Il n'existe pas de quota récréatif national, mais prélève uniquement ce que tu consommes : les bancs paraissent inépuisables, ils ne le sont pas.`,
    },
    {
      q: 'Quel montage pour pêcher le maquereau ?',
      a: `Le montage de référence, c'est la mitraillette : un train de 3 à 6 plumes ou tubes lumineux en potence, lesté d'un plomb ou d'un petit jig de 30 à 60 g. Une canne de 2,40 à 3 m en puissance 20-60 g et un moulinet 4000 suffisent. Dans les ports, un flotteur coulissant réglé entre 2 et 6 m avec une lanière de maquereau fait aussi très bien le travail.`,
    },
    {
      q: 'Comment conserver le maquereau après la capture ?',
      a: `Saigne-le et mets-le sous glace immédiatement : la chair du maquereau est grasse et tourne très vite, en quelques heures à température ambiante. Une glacière avec des pains de glace dès le poste, c'est la différence entre un poisson superbe à griller le soir même et un poisson bon à jeter. Consomme-le idéalement dans les 24 à 48 h.`,
    },
  ],
}
