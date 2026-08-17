import type { SpeciesContent } from './types'

/**
 * Contenu éditorial SEICHE (Sepia officinalis) — pages programmatiques
 * /peche/seiche/<technique>/<dépt>. Techniques autorisées par la matrice
 * (lib/seo/programmatic.ts) : leurres (eging à la turlutte), flottante
 * (tenya et turlutte sous flotteur). Les deux façades sont servies : 225 spots
 * approuvés répartis sur les 24 départements côtiers (mesuré le 2026-08-17).
 * Cohérent avec la fiche profonde lib/especes/content/seiche.ts.
 */
export const seicheContent: SpeciesContent = {
  intro: [
    `La seiche, c'est le céphalopode qui a fait basculer la pêche du bord vers l'eging. Ni un poisson ni un calmar : un mollusque trapu, l'os dans le dos, dix bras dont deux tentacules qu'elle déploie en un éclair pour gober ta turlutte. Du bord, c'est une cible accessible, gourmande, et bien plus combative qu'on ne le croit. Elle tire par à-coups, se cale au fond, projette son encre, et te résiste jusqu'au dernier mètre.`,
    `Tu la trouves partout où le sable propre touche de la structure : herbiers de zostères ou de posidonie, pieds de digues, quais de port, plages abritées, pointes rocheuses. Le rendez-vous à ne pas rater, c'est le printemps, quand les seiches quittent le large pour venir pondre sur les herbiers : de mars à mai sur la Manche et l'Atlantique, de février à avril en Méditerranée. Elles sont alors à portée de canne depuis n'importe quelle jetée.`,
    `Deux gestes la prennent vraiment du bord. La turlutte ramenée en tirées-pauses, qui est la pêche la plus active et la plus fine, et l'appât naturel présenté au tenya ou sous flotteur, redoutable de nuit dans les ports éclairés. Dans les deux cas, la même règle : la seiche ne tape pas, elle s'installe. Tu sens un poids qui arrive, pas une touche. C'est là qu'il faut mettre en tension sans à-coup et ne plus jamais relâcher.`,
  ],

  techniques: {
    leurres: {
      paragraphs: [
        `L'eging, c'est la technique reine de la seiche du bord. Une canne de 2,40 à 2,70 m à scion sensible, une tresse fine (PE 0.6 à 0.8) et un mètre de fluorocarbone en 25/100 : le combo passe partout. Au bout, une turlutte de taille 2.5 à 3.5 selon la profondeur et le courant, la plus légère possible tant que tu touches le fond. L'animation est simple à décrire et longue à maîtriser : deux ou trois coups de scion secs pour faire monter et zigzaguer la turlutte, puis une pause franche pendant laquelle elle redescend bras écartés. C'est à la descente, sur la pause, que la seiche se jette dessus. Compte jusqu'à cinq, ramène le mou, recommence.`,
        `La touche ne ressemble à rien d'autre. Pas de coup sec : la bannière se tend doucement, ou tu remontes ta canne et il y a « du poids ». Ferre en souplesse, sans grand geste, et garde une tension parfaitement constante jusqu'à l'épuisette. La turlutte n'a que des paniers de piques, aucun hameçon ne se plante : la seiche tient parce qu'elle s'agrippe, et le moindre relâché la libère. Ratisse méthodiquement en éventail avant de te déplacer, parce qu'elle occupe des micro-postes : trois mètres à gauche, et tout change.`,
      ],
      bullets: [
        `Canne eging 2,40-2,70 m à scion sensible, tresse PE 0.6-0.8 et 1 m de fluorocarbone 25/100`,
        `Turlutte taille 2.5 à 3.5, la plus légère qui touche encore le fond`,
        `Animation : 2 ou 3 tirées sèches, puis une pause longue, la touche vient à la descente`,
        `Ferrage en douceur et tension CONSTANTE : sans hameçon piquant, tout relâché la libère`,
        `Lance en éventail et ratisse le poste avant de changer de place`,
        `Pointe haute à l'arrivée, sinon tu prends le jet d'encre`,
      ],
      seasonNote: `De mars à mai sur la Manche et l'Atlantique, de février à avril en Méditerranée : c'est la montée de ponte sur les herbiers, et de loin le meilleur moment. Seconde fenêtre à l'automne sur les seiches de l'année devenues belles.`,
    },

    flottante: {
      paragraphs: [
        `Quand la turlutte reste muette, l'appât naturel débloque la situation. Deux montages : le tenya, une tête plombée à pique sur laquelle tu ligatures une lanière de poisson ou une grosse crevette, posé et animé très lentement au ras du fond ; et l'appât suspendu sous un flotteur coulissant, réglé pour flotter à vingt ou trente centimètres au-dessus du substrat. Le second est imbattable le long des quais et dans les darses, où le fond est encombré et où une plombée franche s'accroche. Une bolognaise de 4 à 5 m suffit, avec un flotteur de 5 à 10 g bien visible de nuit.`,
        `La lecture de la touche est la même qu'à la turlutte, en plus lent encore. Le flotteur ne plonge pas : il s'enfonce doucement, ou il part de travers en glissant. Laisse une seconde ou deux, le temps que la seiche enserre bien l'appât de ses bras, puis mets en tension progressivement et ramène sans jamais donner de mou. C'est la pêche de nuit par excellence, en particulier dans les ports éclairés : les lampadaires concentrent crevettes et petits poissons, les seiches suivent, et tu tiens un poste fixe qui produit toute la soirée.`,
      ],
      bullets: [
        `Bolognaise 4-5 m, flotteur coulissant 5-10 g avec insert lumineux pour la nuit`,
        `Esche réglée 20 à 30 cm au-dessus du fond, jamais posée dessus`,
        `Variante tenya : tête plombée à pique, lanière de poisson ou crevette ligaturée`,
        `Appâts : lanière de sardine ou de maquereau, grosse crevette, petit poisson entier`,
        `Le flotteur s'enfonce lentement ou part de travers : attends 1 à 2 secondes, puis tension progressive`,
        `Poste de choix : quais et darses éclairés, où la lumière fixe le fourrage`,
      ],
      seasonNote: `Efficace toute la saison de présence, et vraiment décisif de nuit à l'automne, quand les seiches de l'année chassent sous les lampadaires des ports.`,
    },
  },

  facades: {
    'manche-atlantique': `Sur la Manche et l'Atlantique, tout se joue au printemps et à la marée. Les seiches montent pondre sur les herbiers de zostères de mars à mai, et deviennent accessibles depuis les digues, les cales, les pointes et les ports. Pêche les phases de courant modéré, en fin de montant et au début du descendant : l'étale de pleine mer, avec une bonne hauteur d'eau au pied des ouvrages, reste le créneau le plus sûr. En plein courant de vive-eau, ta turlutte décolle et ne travaille plus. Regarde la courbe de marée du spot avant de choisir ton heure.`,
    mediterranee: `En Méditerranée, le marnage est négligeable : ce ne sont pas les horaires de marée qui commandent mais la lumière et le vent. La montée de ponte est plus précoce, de février à avril, sur les herbiers de posidonie et au pied des digues. Vise le crépuscule et la nuit, et repère les ports éclairés : sous les lampadaires, les seiches viennent chasser les crevettes attirées par la lumière, et le poste reste bon des heures. Un fort mistral qui trouble l'eau, en revanche, coupe net une pêche qui se fait à vue.`,
  },

  conditions: `La seiche chasse à vue : elle veut une eau claire à légèrement teintée et une mer calme à peu agitée. Un vent modéré qui ride la surface ne gêne pas, mais la grosse houle la fait décoller vers des fonds plus tranquilles, et l'eau chargée d'après tempête annule la session. Elle est largement nocturne : le lever du jour, la tombée de la nuit et la nuit elle-même sont tes meilleurs créneaux, surtout sous un éclairage de port. Sur la Manche et l'Atlantique, ajoute la marée à l'équation et vise les courants modérés plutôt que les vive-eaux. Et dans tous les cas, pêche lentement : la seiche vient sur ce qui traîne, jamais sur ce qui fuit.`,
}
