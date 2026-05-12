import type { Metadata } from 'next'
import Link from 'next/link'
import { GuideLayout } from '@/components/layout/GuideLayout'

export const metadata: Metadata = {
  title: 'Les meilleurs spots de pêche en Bretagne — Guide · Carnet de Pêche',
  description: 'De la Pointe du Raz à Belle-Île, notre sélection des spots phares de Bretagne pour la pêche à la canne du bord : bar, lieu jaune, maquereau et dorade.',
}

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'Article',
  headline: 'Les meilleurs spots de pêche en Bretagne',
  description: 'Sélection des spots phares de Bretagne pour la pêche à la canne du bord.',
  author: { '@type': 'Organization', name: 'Carnet de Pêche' },
  publisher: { '@type': 'Organization', name: 'Carnet de Pêche', url: 'https://carnet-de-peche.com' },
  datePublished: '2026-05-01',
  dateModified: '2026-05-01',
  inLanguage: 'fr',
}

const relatedGuides = [
  { slug: 'peche-au-bar-au-leurre', title: 'Pêche au bar au leurre depuis le bord' },
  { slug: 'peche-a-la-dorade-royale-au-surfcasting', title: 'Pêche à la dorade royale au surfcasting' },
]

export default function GuideBretagnePage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <GuideLayout
        title="Les meilleurs spots de pêche en Bretagne"
        excerpt="De la Pointe du Raz à Belle-Île, un tour des spots phares de Bretagne pour la pêche à la canne du bord : bar, lieu jaune, maquereau et dorade."
        readTime={16}
        publishedAt="Mai 2026"
        category="Spots"
        species="Multi-espèces"
        heroImage="https://images.unsplash.com/photo-1757874905959-9fc34f5abdaa?w=1400&h=840&auto=format&fit=crop&q=80"
        heroImageAlt="Côtes sauvages et falaises de Bretagne"
        relatedGuides={relatedGuides}
      >
        <h2>Pourquoi la Bretagne est-elle un eldorado pour la pêche du bord ?</h2>
        <p>
          La Bretagne concentre plus de 2 700 km de côtes — soit le tiers du littoral français. Ses fonds
          variés (roches, sables, estuaires), ses courants forts et sa richesse en proies naturelles en
          font l'une des régions les plus productives d'Europe pour la pêche à la canne du bord. Bar,
          lieu jaune, maquereau et dorade y cohabitent sur des linéaires côtiers accessibles depuis le
          GR34, le sentier des douaniers.
        </p>
        <p>
          L'hydrologie bretonne explique cette densité. La <strong>température de l'eau</strong> y oscille
          entre 9 °C en février et 18-19 °C en août — une fenêtre tempérée idéale pour le bar et le lieu
          jaune, et juste assez chaude en fin d'été pour attirer la dorade royale jusqu'au nord Finistère.
          Les <strong>amplitudes de marée</strong> sont parmi les plus fortes au monde : jusqu'à{' '}
          <strong>13-14 mètres</strong> en baie du Mont-Saint-Michel (record d'Europe), 7 à 9 mètres en
          rade de Brest, 5 à 6 mètres sur la côte sud.
        </p>
        <p>
          Cette respiration océanique massive crée des <strong>courants violents</strong> qui décollent les
          proies des fonds, oxygènent l'eau, et déclenchent les phases de chasse des prédateurs.
          Concrètement : un coefficient de 90 sur la pointe de Penmarc'h, c'est plusieurs millions de
          mètres cubes d'eau qui balayent les cassures rocheuses en quelques heures. Le bar n'a qu'à se
          poster et ouvrir la bouche. C'est la combinaison « eau tempérée + marnage extrême + topographie
          variée » qui fait de la Bretagne le terrain de jeu n°1 du pêcheur du bord en France.
        </p>

        <h2>Notre sélection de spots</h2>
        <p>
          Voici 5 spots testés par la communauté Carnet de Pêche. Tous sont accessibles aux pêcheurs
          possédant un niveau de pratique adapté à la difficulté indiquée.
        </p>

        <h3>Pointe du Raz — Finistère (29)</h3>
        <p>
          <strong>Espèces :</strong> Bar, Lieu jaune, Maquereau · <strong>Difficulté :</strong> 4/5
        </p>
        <p>
          Spot iconique de l'extrême ouest breton. Courants forts, structures rocheuses profondes.
          Réservé aux pêcheurs expérimentés, mais les bars y sont trophées.
        </p>
        <p>
          <strong>Les meilleurs postes</strong> se trouvent en contrebas du sémaphore, le long du sentier
          qui descend vers le <strong>Trou de l'Enfer</strong> et plus loin vers la perspective du{' '}
          <strong>Phare de la Vieille</strong>. Tu cherches les éperons rocheux qui plongent direct sur
          des fosses à 15-20 m — c'est là que les bars trophées se postent en embuscade dans le courant.
          Le secteur juste au nord, vers la baie des Trépassés, offre des postes plus abordables si la
          mer est trop formée à la pointe.
        </p>
        <p>
          <strong>Techniques adaptées</strong> : leurres souples lourds (BlackMinnow 120 ou 140 en têtes
          plombées de 20-40 g, indispensable pour tenir le courant), stickbaits gros gabarit type
          Patchinko 140 par mer calme, et pêche en verticale aux jigs métalliques 30-50 g depuis les
          surplombs. Pour le lieu jaune et le maquereau, mitraillettes ou shads moyens en prospection
          profonde.
        </p>
        <p>
          <strong>Horaires de marée</strong> : les meilleures fenêtres sont les{' '}
          <strong>2 heures précédant l'étale de pleine mer</strong> et la{' '}
          <strong>première heure de descente</strong>, par coefficients 70-95. À l'étale, ça pêche peu.
          En grand coef ({'>'} 100), le courant devient ingérable.
        </p>
        <p>
          <strong>Accès</strong> : parking principal du site (payant en saison), puis descente par les
          sentiers balisés. Compte 15-20 minutes de marche jusqu'aux postes intéressants, avec dénivelé.{' '}
          <strong>Chaussures Vibram obligatoires</strong>, gilet auto-gonflable conseillé, et{' '}
          <strong>jamais en solo</strong> — la mer y a déjà pris des pêcheurs trop sûrs d'eux.
        </p>

        <h3>Plage de Penhors — Finistère (29)</h3>
        <p>
          <strong>Espèces :</strong> Bar, Dorade royale · <strong>Difficulté :</strong> 2/5
        </p>
        <p>
          Longue plage de sable accessible à tous. Idéale pour le surfcasting, dorade royale en été et
          bar à l'automne.
        </p>
        <p>
          <strong>Les meilleurs postes</strong> se répartissent sur les 3 km de plage entre la chapelle
          de Penhors et l'ouverture sur la baie d'Audierne. Repère à marée basse les{' '}
          <strong>bâches</strong> (creux qui restent en eau) et les <strong>couloirs</strong>
          perpendiculaires : ce sont les autoroutes à dorades à marée montante. Le secteur{' '}
          <strong>central</strong>, en face du parking principal, concentre les bonnes bâches. Le{' '}
          <strong>sud</strong> est plus exposé au vent d'ouest, plus formé, meilleur pour le bar par mer
          agitée.
        </p>
        <p>
          <strong>Techniques adaptées</strong> : surfcasting classique avec montage paternoster 1 ou 2
          empiles, plombs 100-150 g pour passer la barre de ressac. Pour la dorade, arénicoles fraîches
          et demi-crabes verts en été. Pour le bar, lançons frais ou couteaux à l'automne, ou switch sur
          le <strong>leurre souple</strong> depuis le rivage si tu vois des activités de chasse en surface
          (souvent à l'aube en septembre-octobre).
        </p>
        <p>
          <strong>Horaires de marée</strong> : la dorade vient au plus haut de la marée, dans la zone de
          ressac qui retourne le sable. Vise les <strong>2 h avant à 2 h après la pleine mer</strong>. Le
          bar accepte mieux toutes les phases mais préfère les marées descendantes du soir. Coefs 60-90
          idéaux.
        </p>
        <p>
          <strong>Accès</strong> : très simple — parking gratuit en bord de plage, à 100 m du sable.
          C'est un spot parfait pour démarrer le surfcasting ou pour les sessions famille.
        </p>

        <h3>Quiberon — Côte Sauvage — Morbihan (56)</h3>
        <p>
          <strong>Espèces :</strong> Bar, Dorade royale, Maquereau · <strong>Difficulté :</strong> 3/5
        </p>
        <p>
          Côte exposée à l'océan avec plusieurs postes le long du sentier. Alternance surfcasting et
          leurres selon les conditions.
        </p>
        <p>
          <strong>Les meilleurs postes</strong> s'égrènent sur les 8 km de côte exposée entre{' '}
          <strong>Port Bara</strong> au nord et <strong>Port Blanc / Beg-er-Goalennec</strong> au sud,
          accessibles par le GR34. Trois zones se distinguent : Port Bara (criques rocheuses avec petits
          coins de sable, bars à la traque), Port Rhu (mix sable et roche, polyvalent), et Pointe du
          Percho (rochers profonds, lieu jaune et gros bars). Les zones les plus connues sont aussi les
          plus fréquentées le week-end — vise les <strong>postes intermédiaires</strong> entre les
          parkings touristiques.
        </p>
        <p>
          <strong>Techniques adaptées</strong> : c'est le spot polyvalent par excellence. Par{' '}
          <strong>mer formée</strong> (vent d'ouest 20-30 km/h), surfcasting depuis les plages d'angle
          avec arénicoles ou lançons pour le bar. Par <strong>mer calme et lumière faible</strong>,
          leurres souples et stickbaits depuis les rochers — Patchinko 100, Sammy 100, BlackMinnow
          90/120. Pour le maquereau en banc, mitraillettes ou petits metals 15-25 g.
        </p>
        <p>
          <strong>Horaires de marée</strong> : la côte sauvage pêche bien en{' '}
          <strong>marée montante</strong> et la <strong>première heure de descente</strong>. Les{' '}
          <strong>grands coefs</strong> ({'>'} 95) sont à éviter sur certains postes en surplomb (risque
          de submersion). Les <strong>levées du jour d'été</strong> sont magiques pour le bar au
          stickbait.
        </p>
        <p>
          <strong>Accès</strong> : nombreux parkings tout le long de la D186 (route côtière), puis
          sentier balisé GR34. Compte 5 à 30 minutes de marche selon le poste choisi. La descente sur
          les rochers est parfois technique — chaussures crantées obligatoires, mer surveillée en
          permanence.
        </p>

        <h3>Belle-Île — Pointe des Poulains — Morbihan (56)</h3>
        <p>
          <strong>Espèces :</strong> Bar, Lieu jaune · <strong>Difficulté :</strong> 4/5
        </p>
        <p>
          Spot mythique pour le bar au leurre de surface en été. Accessible en navette depuis Quiberon.
        </p>
        <p>
          <strong>Les meilleurs postes</strong> se concentrent sur les <strong>éperons rocheux</strong>{' '}
          au nord et à l'est du phare des Poulains, classés Grand Site de France. Les bars patrouillent
          dans les <strong>couloirs entre les îlots</strong> et dans les{' '}
          <strong>cassures à 5-15 m</strong> qui partent du sémaphore. Le secteur de la{' '}
          <strong>plage de Ster Vraz</strong>, juste en contrebas, offre une alternative
          plage/surfcasting si la mer est trop dure sur la pointe.
        </p>
        <p>
          <strong>Techniques adaptées</strong> : c'est LE spot où sortir le <strong>stickbait</strong>{' '}
          de l'année. Les bars de Belle-Île ont la réputation de gober les leurres de surface en plein
          jour quand ailleurs ils ne touchent qu'à l'aube. Patchinko 140, Sammy 115, Lucky Craft
          Gunfish 135 en coloris ayou ou bleu dos. Compléter avec des leurres souples gros calibres
          (BM 120/140) pour la prospection profonde et le lieu jaune. À l'automne, mitraillettes pour
          les maquereaux qui font le bouchon.
        </p>
        <p>
          <strong>Horaires de marée</strong> : la pointe est exposée à plein nord-ouest. Les{' '}
          <strong>2 h avant à 1 h après la pleine mer</strong> sont la fenêtre reine, par coefs 70-90.{' '}
          <strong>Vent d'ouest modéré et houle 1-1,5 m</strong> = conditions parfaites pour le
          stickbait. À l'étale de basse mer, la pointe se vide en deux heures, ne reste pas trop
          longtemps.
        </p>
        <p>
          <strong>Accès</strong> : navette <strong>Compagnie Océane</strong> depuis
          Quiberon-Port-Maria vers Le Palais (45 min), puis location vélo, voiture ou bus pour la
          pointe des Poulains (15 km). <strong>Compte une journée minimum</strong>, idéalement deux
          nuits sur place — c'est un spot pour qui veut investir le déplacement, pas pour une session
          courte.
        </p>

        <h3>Le Dibenn (Brest) — Finistère (29)</h3>
        <p>
          <strong>Espèces :</strong> Lieu jaune, Bar · <strong>Difficulté :</strong> 2/5
        </p>
        <p>
          Digue accessible toute l'année. Lieu jaune en automne-hiver, bar en saison. Idéal pour les
          sessions courtes.
        </p>
        <p>
          <strong>Les meilleurs postes</strong> s'étalent sur la longueur de la digue. Le{' '}
          <strong>bout de l'ouvrage</strong> est le poste à lieu jaune par excellence : fond rapide à
          10-15 m, présence permanente de bancs en hiver. La <strong>partie médiane</strong> est plus
          polyvalente, on y prend bar, vieille et tacaud. Évite l'angle d'amorce où le fond remonte
          vite et où les accroches sont fréquentes.
        </p>
        <p>
          <strong>Techniques adaptées</strong> : pour le <strong>lieu jaune</strong>, leurres souples
          sur têtes plombées 15-25 g (BlackMinnow 120, Crazy Sand-eel, Madaï rig avec petits shads),
          ramenés en linéaire lent près du fond. Mitraillettes plumeuses très efficaces aussi, surtout
          en hiver quand les lieus sont en banc serré. Pour le <strong>bar</strong>, leurres souples à
          la traque en saison (mai-octobre), parfois stickbait sur eau calme à l'aube.
        </p>
        <p>
          <strong>Horaires de marée</strong> : la digue est protégée par sa configuration, on peut y
          pêcher quasi toutes phases. Les <strong>étales de pleine mer et de basse mer</strong> sont les
          moments de bascule du courant et déclenchent souvent les touches. Pour le lieu jaune d'hiver,
          la <strong>descente</strong> (avec courant sortant) donne souvent les meilleures sessions, par
          toutes lumières.
        </p>
        <p>
          <strong>Accès</strong> : parking proche, marche très courte (5 minutes max) sur la digue
          elle-même. <strong>Sécurisé</strong>, accessible aux enfants en saison calme. C'est le spot
          parfait pour une session « après le boulot » ou une initiation famille. Reste vigilant en
          hiver : la digue peut être glissante avec embruns et algues.
        </p>

        <h2>Conseils pratiques pour pêcher en Bretagne</h2>
        <h3>Sécurité en bord de mer</h3>
        <p>
          La Bretagne est connue pour ses conditions météo changeantes. Quelques règles de base :
        </p>
        <ul>
          <li>Consulte les prévisions météo et l'état de la mer avant chaque sortie (Météo France, Windy).</li>
          <li>Ne tourne jamais le dos à la mer sur les rochers — les vagues dites « scélérates » peuvent surgir sans prévenir.</li>
          <li>Emporte toujours un moyen de communication chargé.</li>
          <li>Informe quelqu'un de ton lieu de pêche et de ton heure de retour prévue.</li>
        </ul>

        <h3>La réglementation en Bretagne</h3>
        <p>Les règles européennes et nationales s'appliquent, avec quelques spécificités à connaître :</p>
        <ul>
          <li>
            <strong>Bar</strong> (Dicentrarchus labrax) : taille minimale <strong>42 cm en
            Bretagne</strong> (au-dessus du 48° de latitude nord — plus restrictif que la règle
            générale Atlantique 36 cm). Quota journalier : <strong>2 bars par pêcheur et par
            jour</strong>, du 1er mars au 30 novembre (à vérifier annuellement, les chiffres sont
            revus par l'UE). Du 1er février au 31 mars : <strong>no-kill obligatoire</strong> dans le
            golfe de Gascogne.
          </li>
          <li>
            <strong>Dorade royale</strong> : taille minimale <strong>23 cm</strong> réglementairement,{' '}
            <strong>25 cm</strong> recommandé pour respecter la maturité sexuelle. Pas de quota européen
            mais pratique raisonnée conseillée.
          </li>
          <li><strong>Lieu jaune</strong> : taille minimale <strong>30 cm</strong>, pas de quota récréatif spécifique.</li>
          <li><strong>Maquereau</strong> : taille minimale <strong>20 cm</strong>.</li>
        </ul>
        <p><strong>Zonages spécifiques à surveiller</strong> :</p>
        <ul>
          <li>
            <strong>Parc naturel marin d'Iroise</strong> (de l'île de Sein à Ouessant) : la pêche
            récréative à la canne y est autorisée, mais certaines zones ponctuelles (frayères, herbiers
            protégés) sont fermées saisonnièrement. Carte officielle sur le site de l'OFB.
          </li>
          <li>
            <strong>Sites Natura 2000</strong> : nombreux sur le littoral breton (golfe du Morbihan,
            Trégor-Goëlo, archipel de Molène). Pêche autorisée sauf arrêtés préfectoraux spécifiques.
          </li>
          <li>
            <strong>Réserves naturelles</strong> (Sept-Îles, Saint-Nicolas-des-Glénan) : règles
            spécifiques, certaines zones interdites.
          </li>
        </ul>
        <p>
          <strong>Marquage obligatoire</strong> : depuis 2019, le bar et la dorade royale capturés en
          mer (récréatif) doivent être <strong>marqués par sectionnement de la partie inférieure de la
          nageoire caudale</strong> dès leur capture, avant transport. Outil simple, à avoir dans le
          sac.
        </p>
        <p>
          L'app <strong>Carnet de Pêche</strong> signale automatiquement les{' '}
          <strong>zones fermées</strong> à proximité de ta position et affiche les tailles légales en
          cours pour chaque espèce de ton département.
        </p>

        <h2>Utiliser la carte Carnet de Pêche en Bretagne</h2>
        <p>
          La Bretagne, c'est plus de 2 700 km de côtes — autant dire que tu peux passer dix saisons à
          chercher tes spots sans en avoir fait le tour. La carte <strong>Carnet de Pêche</strong> te
          fait gagner ces années.
        </p>
        <p>
          <strong>Filtrer les spots bretons</strong> : ouvre la carte, zoome sur ton département (29,
          22, 56, 35), applique les filtres <strong>espèce</strong> (bar / dorade / lieu jaune…) et{' '}
          <strong>technique</strong> (leurre / surfcasting / verticale…). Tu ne vois plus que les postes
          calibrés pour ce que tu veux faire ce week-end.
        </p>
        <p>
          <strong>Lire le score d'activité 0-100</strong> : chaque spot est noté en temps réel à partir
          des prises loguées par la communauté, pondérées par les conditions (marée, vent, lumière,
          saison). Un score 78 sur un spot de bar à 6 h du matin avec coef 84, c'est le signal
          qu'aujourd'hui c'est probablement là qu'il faut être. Un score 22, c'est le signal que tu
          peux dormir une heure de plus.
        </p>
        <p>
          <strong>Superposer les couches</strong> : marée et coefficient en direct, vent et houle
          Open-Meteo Marine, bathymétrie sous-marine, sentier GR34 pour les accès. En 30 secondes, tu
          prépares une session qui aurait pris une heure d'arbitrage sur 3 onglets ouverts. C'est
          exactement le genre de préparation qui fait la différence entre une bredouille et une session
          mémorable. Et chaque prise que tu logues fait monter le score des spots autour pour toute la
          communauté bretonne qui pêche derrière toi.
        </p>

        <h2>Explorer la carte complète</h2>
        <p>
          Les spots présentés dans ce guide sont référencés sur la carte Carnet de Pêche. Les abonnés
          Local et Itinérant accèdent aux coordonnées GPS précises et au score d'activité de chaque spot.
        </p>
        <p>
          <Link href="/spots?dept=29">Voir tous les spots du Finistère →</Link>
        </p>
        <p>
          <Link href="/spots?dept=56">Voir tous les spots du Morbihan →</Link>
        </p>
      </GuideLayout>
    </>
  )
}
