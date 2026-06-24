import type { EspeceContent } from '../types'

/**
 * Fiche espèce lieu noir (Pollachius virens) — /especes/lieu-noir.
 * Angle : le bagarreur de banc des digues profondes — pélagique, rapide,
 * à chercher en pleine eau au jig et au train de plumes (≠ lieu jaune,
 * plus fouisseur de fond). Façade unique : Manche + Atlantique nord
 * (gadidé d'eau froide, absent de Méditerranée → activite 1 + note).
 * Réglementation vérifiée le 24/06/2026. ⚠️ Ne PAS confondre avec le lieu
 * jaune : le lieu noir n'a NI quota loisir NI fermeture nationale.
 */
export const lieuNoirEspece: EspeceContent = {
  slug: 'lieu-noir',

  intro: [
    `Le lieu noir, c'est le bagarreur de banc des eaux froides : un poisson qui chasse en troupe, qui démarre comme un missile et qui ne lâche jamais une fois piqué. Du bord, il ne se cale pas comme son cousin le lieu jaune au ras de la roche — il patrouille en pleine eau le long des digues profondes et des quais industriels, à la recherche d'un nuage d'alevins à pulvériser.`,
    `Ne te trompe pas de poisson : le lieu jaune est un embusqué qui colle aux tombants, le lieu noir est un nomade qui suit ses proies. Quand un banc passe à portée de digue, ça touche en rafale — d'où le train de plumes et le jig animés vite, plutôt que le linéaire lent. Son territoire du bord se résume à la Manche et à l'Atlantique nord : ports en eau profonde du Cotentin, du Pays de Caux (Étretat, Fécamp), de Bretagne nord, grands môles et estuaires creux. C'est un gadidé d'eau froide : au sud de la Loire il se fait rare depuis la côte, et en Méditerranée il est tout simplement absent.`,
    `Bonne nouvelle côté règlement : contrairement au lieu jaune, le lieu noir n'a NI quota de loisir NI fermeture nationale — juste une maille de 35 cm et le marquage caudal pour ce que tu gardes. Ça ne dispense pas de bon sens : un banc se vide vite, alors prélève l'assiette et relâche le reste. Cette fiche te donne les saisons réelles par façade, les techniques qui prennent vraiment du bord, et comment lire le poste selon le vent, la mer et la marée.`,
  ],

  identity: {
    famille: 'Gadidés (Pollachius virens), cousin du lieu jaune, de la morue et du tacaud',
    tailleCourante: '40-55 cm du bord, 60 cm+ quand un beau banc passe la digue',
    tailleMax: '≈ 1,30 m pour 25 kg (sujets de pleine mer, hors de portée du bord)',
    habitat: 'Pleine eau le long des digues profondes, quais, môles et estuaires creux — Manche et Atlantique nord',
    regime: "Chasseur de banc : alevins, sprats, lançons, petits poissons d'argent en pleine eau",
  },

  regulation: {
    verifiedAt: '24/06/2026',
    source:
      'Arrêté du 26 octobre 2012 modifié (annexe I, Pollachius virens) ; arrêté du 17 mai 2011 modifié (marquage, « lieu jaune/noir »)',
    minSizeCm: { 'manche-atlantique': 35, mediterranee: null },
    marquage: true,
    items: [
      `<strong>Maille : 35 cm</strong> en Manche et Atlantique (annexe I de l'arrêté du 26 octobre 2012 modifié) — tout lieu noir sous cette taille est remis à l'eau immédiatement.`,
      `<strong>Marquage obligatoire</strong> de chaque lieu noir conservé : ablation de la partie inférieure de la nageoire caudale avant le débarquement (le lieu noir figure dans la liste de l'arrêté du 17 mai 2011 modifié).`,
      `<strong>Pas de quota de loisir ni de fermeture nationale</strong> pour le lieu noir — ⚠️ ne le confonds pas avec le <strong>lieu jaune</strong>, qui lui est fermé du 1ᵉʳ janvier au 30 avril et limité à 2 poissons/jour. Ces règles ne s'appliquent PAS au lieu noir.`,
      `<strong>Absent de Méditerranée</strong> (espèce d'eau froide) : aucune maille n'y est définie pour lui.`,
    ],
  },

  saisons: {
    'manche-atlantique': [
      {
        saison: 'Printemps',
        activite: 3,
        note: `Mars-avril, les bancs remontent à la côte : c'est le créneau réputé d'Étretat et des ports cauchois, train de plumes et jigs rouge/jaune sur les bancs qui passent la digue.`,
      },
      {
        saison: 'Été',
        activite: 2,
        note: `L'eau chauffe et une partie des bancs décroche vers le large ; il reste des poissons actifs à l'aube et au coup du soir le long des môles profonds, au jig animé vite.`,
      },
      {
        saison: 'Automne',
        activite: 3,
        note: `Le grand moment : eau qui refroidit, alevins concentrés près des structures, bancs voraces qui touchent en rafale sur les digues et estuaires creux. Régularité maximale.`,
      },
      {
        saison: 'Hiver',
        activite: 2,
        note: `Une partie gagne le large pour frayer, mais le lieu noir reste présent du bord par temps couvert et mer agitée — c'est l'un des rares poissons qui sauve une session de janvier.`,
      },
    ],
    mediterranee: [
      {
        saison: 'Printemps',
        activite: 1,
        note: `Espèce d'eau froide absente de Méditerranée : tu ne croiseras pas de lieu noir du bord ici, l'eau est bien trop chaude pour ce gadidé septentrional.`,
      },
      {
        saison: 'Été',
        activite: 1,
        note: `Aucune présence en Méditerranée : inutile de le chercher, son aire de répartition s'arrête à l'Atlantique nord et à la Manche.`,
      },
      {
        saison: 'Automne',
        activite: 1,
        note: `Toujours absent : même en saison froide, la Méditerranée reste hors de son aire de répartition. Vise plutôt le loup, le sar ou la dorade.`,
      },
      {
        saison: 'Hiver',
        activite: 1,
        note: `Pas de lieu noir en Méditerranée, même au cœur de l'hiver : l'eau ne descend jamais assez bas pour ce poisson nordique.`,
      },
    ],
  },

  techniques: [
    {
      slug: 'leurres',
      why: `L'arme numéro un sur banc : jig métallique de 20-40 g ou shad ramené vite et par à-coups en pleine eau, pas au ras du fond. Quand le banc est là, ça percute fort — varie la profondeur de récupération pour trouver la couche où il chasse.`,
    },
    {
      slug: 'vif',
      why: `À soutenir le long d'une digue profonde, un train de plumes ou un teaser monté au-dessus d'un petit poisson plombé exploite parfaitement le réflexe de banc : plusieurs leurres dans la colonne d'eau augmentent les chances de tomber sur le bon étage.`,
    },
    {
      slug: 'surfcasting',
      why: `Plus marginal pour cette espèce de pleine eau, mais un montage traînard avec lanière de maquereau ou de sardine posé depuis un môle profond accroche les lieus noirs qui patrouillent près du fond les jours de grosse mer.`,
    },
  ],

  postes: [
    `Le bon poste à lieu noir, c'est de la hauteur d'eau ET du passage. Vise les grandes digues et môles qui plongent vite, les quais industriels en eau profonde, les estuaires creux et les pointes balayées par le courant : Cotentin, Pays de Caux (Étretat, Fécamp, Le Havre), ports de Bretagne nord. Contrairement au lieu jaune qui colle au tombant, le lieu noir patrouille en pleine eau — c'est un poisson de banc mobile, pas un embusqué de fond. Si tu ne touches pas, ce n'est souvent pas le poste qui est mauvais, c'est que le banc n'est pas encore passé : reste mobile, prospecte la colonne d'eau, change d'étage.`,
    `La météo compte autant que la marée pour cette espèce. Le lieu noir adore le temps couvert et la mer un peu agitée : un ciel gris et un vent de mer qui ride la surface cassent la luminosité, mettent les alevins en mouvement et déclenchent les chasses en plein jour. La mer d'huile sous grand soleil est le pire scénario — réserve-la à l'aube et au crépuscule. Une houle modérée le long des digues profondes concentre la nourriture contre les enrochements ; au-delà, la sécurité prime, ces postes deviennent dangereux par grosse mer.`,
    `Côté marée, le courant fait tout : ce sont les phases de montant et de descendant établis, quand l'eau circule le long de la digue, qui ramènent les bancs et leurs proies — pas les étales molles. Cale ta session sur la reprise du courant après l'étale et sur les coefficients moyens à forts, qui brassent la colonne d'eau. La courbe de marée et les horaires de pleine et basse mer de ton spot sont dans l'app : croise-les avec tes propres prises pour repérer l'heure où le banc passe TON poste — c'est souvent la même fenêtre d'un jour à l'autre.`,
  ],

  faq: [
    {
      q: 'Quelle est la taille minimale du lieu noir et y a-t-il un quota ?',
      a: `La maille est de 35 cm en Manche et Atlantique, et tout poisson conservé doit être marqué (ablation de la partie inférieure de la nageoire caudale). En revanche, le lieu noir n'a ni quota de loisir ni fermeture nationale — à ne pas confondre avec le lieu jaune, fermé de janvier à avril et limité à 2 par jour. Source : arrêté du 26 octobre 2012 modifié, vérifié le 24/06/2026.`,
    },
    {
      q: 'Quelle est la différence entre le lieu noir et le lieu jaune ?',
      a: `Le lieu jaune est un embusqué qui colle aux tombants rocheux et chasse le lançon au ras du fond ; on le prend au souple finesse en linéaire lent. Le lieu noir est un poisson de banc qui patrouille en pleine eau le long des digues profondes ; on le prend au jig et au train de plumes animés vite. Côté règlement, le lieu jaune est fermé de janvier à avril (quota 2/jour), le lieu noir non.`,
    },
    {
      q: 'Quelle est la meilleure période pour pêcher le lieu noir du bord ?',
      a: `L'automne en premier (septembre-décembre), quand l'eau refroidit et que les alevins se concentrent près des digues : les bancs touchent en rafale. Le printemps est l'autre grand moment, notamment mars-avril sur les ports cauchois comme Étretat. En été, limite-toi à l'aube et au coup du soir. Le lieu noir reste même prenable en hiver par temps couvert et mer agitée.`,
    },
    {
      q: 'Quel leurre pour le lieu noir du bord ?',
      a: `Un jig métallique de 20 à 40 g ou un shad de 10-12 cm, ramenés vite et par à-coups en pleine eau — pas au ras du fond comme pour le lieu jaune. Les coloris qui marchent : naturels argentés type sprat, ou flashy rouge/jaune sur eau teintée. Sur banc actif, un train de plumes ou un teaser monté au-dessus du leurre multiplie les touches en explorant plusieurs étages d'un coup.`,
    },
  ],
}
