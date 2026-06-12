import type { SpeciesContent } from './types'

/**
 * Contenu éditorial maquereau (Scomber scombrus) — pages programmatiques
 * /peche/maquereau/<technique>/<dépt>. Techniques autorisées par la matrice :
 * leurres, flottante.
 */
export const maquereauContent: SpeciesContent = {
  intro: [
    `Le maquereau, c'est le poisson qui a mis le pied à l'étrier à des générations de pêcheurs. Pélagique nerveux de 25 à 40 cm, il débarque en bancs compacts dès que l'eau passe les 12-14 °C, et quand il est là, ça se voit : chasses en surface, sternes qui piquent, sardines qui giclent. Pas besoin de matériel de pointe ni de spot secret — une digue, une jetée, un bout de canne, et tu peux remplir un seau en une heure.`,
    `Ce n'est pas pour autant un poisson sans intérêt. Le maquereau tape fort pour sa taille, tire en rushs courts et nerveux, et sa fenêtre de présence est capricieuse : un soir le port bouillonne, le lendemain plus rien. Toute la pêche consiste à être au bon endroit quand le banc passe.`,
    `C'est aussi LA pêche conviviale par excellence : du bord, en famille, avec des touches en rafale qui font les premiers souvenirs des gamins. Et dans la glacière, un poisson gras superbe à manger le soir même.`,
  ],

  techniques: {
    leurres: {
      paragraphs: [
        `La reine des techniques sur le maquereau, c'est la mitraillette : un train de 3 à 6 plumes ou tubes lumineux montés en potence sur un bas de ligne de 1,5 à 2 m, lesté par un plomb de 30 à 60 g (ou un petit jig qui pêche en plus). Tu lances depuis la digue ou la jetée, tu laisses couler en comptant — 5 secondes, 10 secondes, 15 secondes — puis tu ramènes par tirées sèches entrecoupées de pauses. Quand tu trouves la bonne profondeur, c'est touche à tous les lancers, souvent à 2 ou 3 poissons d'un coup. Une canne de 2,40 à 3 m avec une puissance 20-60 g et un moulinet 4000 garni de tresse 13-15/100 suffisent largement.`,
        `Quand les bancs chassent en surface ou que tu veux plus de sport, passe aux leurres individuels : petits jigs casting de 10 à 30 g, cuillers ondulantes ou tournantes de 8 à 15 g, ramenés vite en linéaire ou en dents de scie. Un maquereau de 35 cm sur une canne light, c'est un vrai combat. Vise les pointes de digue, les sorties de port et les veines de courant : le maquereau suit la nourriture, pas la structure. Si les chasses sont à 60 m et que tu n'y arrives pas, ne t'acharne pas — attends que le banc revienne à portée, il tourne.`,
      ],
      bullets: [
        `Mitraillette 3 à 6 plumes (blanches, argentées ou luminescentes) + plomb ou jig de 30 à 60 g selon vent et courant`,
        `Canne 2,40-3 m puissance 20-60 g, moulinet 4000, tresse 13-15/100 et arraché en nylon 35/100`,
        `Petits jigs 10-30 g et cuillers 8-15 g pour pêcher les chasses à l'unité, récupération rapide`,
        `Compte la descente du plomb pour répéter la profondeur exacte dès la première touche`,
        `Décroche au-dessus du seau : les poissons tombent souvent tout seuls, gain de temps quand ça mitraille`,
        `Saigne et mets sous glace immédiatement — la chair du maquereau tourne très vite`,
      ],
      seasonNote: `De mai à octobre dès que l'eau dépasse 12-14 °C, avec un pic net en juillet-août sur les digues ; les coups du matin et du soir concentrent l'essentiel des passages.`,
    },

    flottante: {
      paragraphs: [
        `Dans les ports, le long des quais et des pontons, la flottante fait merveille quand les maquereaux trainent entre deux eaux sans chasser franchement. Le montage est simple : flotteur coulissant de 4 à 10 g réglé entre 2 et 6 m de fond, bas de ligne en fluorocarbone 22-26/100 d'environ 50 cm, hameçon n° 4 à 1 à hampe longue. L'appât roi, c'est la lanière de maquereau : une bande de 5-6 cm taillée dans le flanc d'un poisson déjà pris, brillante et résistante, qui tient plusieurs touches. À défaut, une crevette entière ou un morceau de sardine font très bien le travail.`,
        `Le secret, c'est la profondeur : le banc évolue rarement en surface dans un port. Commence à 3 m, et descends d'un mètre toutes les dix minutes sans touche. Une fois la bonne hauteur trouvée, les départs s'enchaînent — le flotteur ne tremble pas, il plonge d'un coup. Anime légèrement en tirant le flotteur de 50 cm de temps en temps : la lanière qui papillonne déclenche les suiveurs. C'est la technique idéale pour initier un débutant ou un enfant : poste confortable, montage simple, touches visuelles et franches.`,
      ],
      bullets: [
        `Flotteur coulissant 4-10 g avec stop-float pour régler la profondeur de 2 à 6 m sans changer de montage`,
        `Bas de ligne fluorocarbone 22-26/100, hameçon n° 4 à 1 à hampe longue (plus facile à décrocher)`,
        `Lanière de maquereau de 5-6 cm taillée dans le flanc — l'appât le plus durable et le plus pris`,
        `Crevette ou morceau de sardine en dépannage, voire un bout de ver`,
        `Descends d'un mètre toutes les 10 minutes sans touche jusqu'à trouver le banc`,
        `Quelques morceaux de sardine écrasés jetés à l'eau fixent le banc devant ton poste`,
      ],
      seasonNote: `Tout l'été dans les ports et le long des quais, surtout tôt le matin et en fin de journée ; en Méditerranée, c'est souvent à l'aube que ça se joue.`,
    },
  },

  facades: {
    'manche-atlantique': `Sur la Manche et l'Atlantique, le maquereau arrive en bancs massifs entre mai et juin et reste jusqu'en octobre. Les digues, jetées et estacades sont les postes rois : Le Havre, Cherbourg, Saint-Malo, Brest, Lorient, Les Sables — partout le scénario est le même, des passages en rafale au lever et au coucher du soleil, amplifiés autour de la pleine mer. En plein été, les soirs de digue à la mitraillette sont une institution familiale : compte la descente, trouve la couche d'eau, et enchaîne.`,
    mediterranee: `En Méditerranée, le maquereau est bien présent mais plus capricieux : pas de passages massifs réguliers comme en Manche, plutôt des bancs qui rôdent au large et s'approchent par épisodes, souvent à l'aube. Vise les digues portuaires profondes, les sorties de port et les caps battus par le courant, de préférence aux premières lueurs. La flottante dans les ports (Sète, Marseille, Toulon) sort des poissons toute la belle saison, et les petits jigs lancés loin font la différence quand le banc reste à distance.`,
  },

  conditions: `Le maquereau se moque des marées autant qu'un poisson de mer peut s'en moquer : ce qui le fait approcher, c'est la nourriture. Cela dit, le courant rassemble les proies — sur la Manche et l'Atlantique, les deux heures autour de la pleine mer et le début de la descendante sont les meilleurs créneaux depuis les digues. Les vrais déclencheurs, ce sont la lumière et la saison : aube et crépuscule dominent largement, en pleine eau claire d'été. Un vent modéré qui ride la surface aide, une mer formée ou une eau turbide après un gros coup de vent coupe net l'activité. Surveille les oiseaux : sternes et goélands qui piquent, c'est le banc qui est là.`,
}
