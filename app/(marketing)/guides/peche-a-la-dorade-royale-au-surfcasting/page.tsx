import type { Metadata } from 'next'
import { GuideLayout } from '@/components/layout/GuideLayout'

export const metadata: Metadata = {
  title: 'Pêche à la dorade royale au surfcasting — Guide complet · Carnet de Pêche',
  description: 'Tout savoir pour pêcher la dorade royale au surfcasting depuis le bord : périodes, montages, appâts, postes et réglementation.',
}

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'Article',
  headline: 'Pêche à la dorade royale au surfcasting',
  description: 'Guide complet pour la pêche à la dorade royale au surfcasting depuis la côte.',
  author: { '@type': 'Organization', name: 'Carnet de Pêche' },
  publisher: { '@type': 'Organization', name: 'Carnet de Pêche', url: 'https://carnet-de-peche.com' },
  datePublished: '2026-05-01',
  dateModified: '2026-05-01',
  inLanguage: 'fr',
}

const relatedGuides = [
  { slug: 'peche-au-bar-au-leurre', title: 'Pêche au bar au leurre depuis le bord' },
  { slug: 'les-meilleurs-spots-de-peche-en-bretagne', title: 'Les meilleurs spots de pêche en Bretagne' },
]

export default function GuideDoradePage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <GuideLayout
        title="Pêche à la dorade royale au surfcasting"
        excerpt="La dorade royale est un poisson exigeant mais accessible. Découvre les bonnes périodes, les montages et les spots où elle fréquente nos côtes."
        readTime={18}
        publishedAt="Mai 2026"
        category="Technique"
        species="Dorade royale"
        heroImage="/images/dorade.jpg"
        heroImageAlt="Dorade royale (Sparus aurata)"
        relatedGuides={relatedGuides}
      >
        <h2>La dorade royale (Sparus aurata)</h2>
        <p>
          La dorade royale est l'un des poissons les plus convoités du bord. Combative, méfiante et souvent
          capricieuse, elle récompense les pêcheurs qui comprennent ses habitudes alimentaires et ses postes
          de prédilection. Le surfcasting reste la technique reine pour la cibler depuis les plages et les
          zones de ressac.
        </p>
        <p>
          La « royale » se reconnaît à sa barre dorée entre les yeux — d'où son nom — et à la tache noire
          qui marque le départ de sa ligne latérale. C'est un poisson de groupe, qui patrouille en petits
          bancs de 3 à 10 individus, sauf les très gros spécimens qui finissent souvent solitaires.
        </p>
        <p>
          <strong>Son régime</strong> est large mais marqué : c'est avant tout une broyeuse. Ses molaires
          puissantes sont faites pour écraser les coquillages — moules, palourdes, coques, donaces, telines.
          Elle complète avec des <strong>crustacés</strong> (crabes verts, ermites, petites crevettes), des{' '}
          <strong>vers marins</strong> (arénicoles, néréides), et plus occasionnellement des{' '}
          <strong>petits poissons</strong> ou des <strong>céphalopodes</strong>. Cette spécialisation
          explique pourquoi les bons appâts sont rarement des leurres : pour la dorade, on revient aux
          fondamentaux du surfcasting avec des appâts naturels frais.
        </p>
        <p>
          <strong>Géographiquement</strong>, elle remonte chaque année plus haut sur la{' '}
          <strong>côte atlantique</strong> : autrefois cantonnée au golfe de Gascogne, on la prend désormais
          jusqu'en Bretagne nord et en Manche, conséquence directe du réchauffement des eaux. La saison y
          est étroite (juin à octobre). En <strong>Méditerranée</strong>, elle est présente toute l'année,
          avec un pic de mai à novembre. Les <strong>étangs littoraux</strong> (Thau, Salses-Leucate, Diana)
          abritent des populations sédentaires énormes et accessibles depuis le bord.
        </p>

        <h2>Le matériel de surfcasting</h2>
        <h3>La canne</h3>
        <p>
          Pour cibler la dorade au surfcasting, vise une canne de <strong>4 m à 4,50 m</strong>, en 3 brins.
          C'est la longueur qui te permet de lancer loin par-dessus la barre de ressac (souvent 80 à 120 m)
          et de tenir ta ligne haute au-dessus de l'écume.
        </p>
        <p>
          La <strong>puissance de lancer</strong> se situe entre <strong>100 g et 200 g</strong>. Cette
          plage couvre les plombs de 100-150 g que tu utiliseras 90 % du temps, avec une marge pour les
          jours de vent fort où il faut monter à 180 g.
        </p>
        <p>
          L'<strong>action parabolique</strong> est idéale pour la dorade : la canne plie progressivement
          sur toute sa longueur. Trois avantages :
        </p>
        <ol>
          <li>Elle accompagne les coups de tête vifs de la dorade et évite que l'hameçon ne s'arrache (sa gueule est solide mais l'attache reste fragile).</li>
          <li>Elle propulse mieux les gros plombs sur la distance.</li>
          <li>Elle absorbe la traction du courant, qui peut décrocher un plomb sur un blank trop raide.</li>
        </ol>
        <p>Distingue deux familles de cannes :</p>
        <ul>
          <li><strong>Cannes match</strong> (compétition) : techniques, légères, conçues pour des lancers ultra-précis à grande distance. Souvent en 3 brins emboîtés, blank fin et nerveux. Prix : à partir de 200-250 € pour de l'utile, ça monte vite. Réservées aux pêcheurs réguliers qui font de la distance.</li>
          <li><strong>Cannes beach</strong> (loisir/polyvalentes) : plus robustes, plus pardonnantes, montées télescopiques ou en 3 brins. Prix à partir de 50 € en télescopique, 90-150 € en 3 brins corrects.</li>
        </ul>
        <p>
          <strong>Budget pour débuter</strong> : 80-150 € pour une canne 3 brins beach honnête (Vercelli
          Oxygen, Daiwa Sealine X Surf, Shimano Beastmaster Surf, Sunset Spectro).{' '}
          <strong>Budget intermédiaire</strong> : 200-350 € pour passer en cannes type Tubertini ou Vercelli
          Enygma quand tu veux progresser en distance et précision.
        </p>

        <h3>Le moulinet</h3>
        <p>
          Le surfcasting demande des <strong>moulinets grande taille : 6000 à 8000</strong> (numérotation
          Shimano/Daiwa) ou « SurfCasting/Long Cast » selon les marques.
        </p>
        <p>
          Le <strong>tambour grand diamètre</strong> est non-négociable : un tambour large laisse la tresse
          ou le nylon se dérouler avec moins de friction au lancer, ce qui te gagne facilement 15 à 20
          mètres. Cherche les mentions « Long Cast Spool », « ABS » (Anti-Backlash Spool, Daiwa) ou
          « AeroWrap » (Shimano).
        </p>
        <p>
          Le <strong>ratio de récupération</strong> est secondaire en surfcasting : tu pêches en attente,
          pas en animation. Un ratio standard 4.0:1 à 4.7:1 fait parfaitement le job.
        </p>
        <p>
          Le <strong>freinage progressif</strong> est crucial pour la dorade : elle attaque souvent en
          marche arrière, démarre fort, puis ralentit, puis repart. Un frein qui sursaute te coûte le
          poisson. Vise les moulinets avec frein avant multi-disques (au moins 4-5 disques carbone ou
          feutre), pas un frein arrière minimaliste.
        </p>
        <p><strong>Recommandations par budget</strong> :</p>
        <ul>
          <li>Entrée de gamme (50-90 €) : Shimano Alivio 8000, Daiwa Emcast Surf, Penn Wrath 8000.</li>
          <li>Milieu de gamme (130-200 €) : Daiwa Crosscast 6000 / 8000, Shimano Ultegra XSD, Penn Surfblaster III.</li>
          <li>Haut de gamme (300-500 €) : Daiwa Tournament Basia, Shimano Aerocast, Penn Surfblaster Long Cast.</li>
        </ul>
        <p>
          <strong>Entretien après chaque session</strong> : c'est là que beaucoup de débutants flinguent
          leur matériel en une saison. Après chaque sortie en mer :{' '}
          <strong>rinçage à l'eau douce tiède au jet doux</strong> (jamais en pression directe sur le
          mécanisme), démontage du tambour pour sécher l'axe, <strong>graissage léger</strong> une fois
          par mois en saison. Le sable est pire que le sel : il use mécaniquement les engrenages. Si tu
          poses ton moulinet dans le sable, démonte et nettoie le soir même.
        </p>

        <h3>Le bas de ligne</h3>
        <p>
          Sur le moulinet, deux écoles : <strong>nylon de corps</strong> en 28-35/100 (plus pardonnant
          pour les lancers, meilleur retard) ou <strong>tresse</strong> en PE 1.5 à 2.5 (plus de
          sensibilité, lancers plus longs, mais moins tolérante aux frottements). Pour démarrer, reste
          sur le nylon — tu perdras moins de plombs.
        </p>
        <p>
          Au bout, un <strong>bas de ligne en fluorocarbone de 40 à 60/100</strong> (≈ 12-25 kg).
          Longueur : <strong>80 cm à 1,5 m</strong> selon le montage.
        </p>
        <p>
          <strong>Pourquoi le fluoro est indispensable sur fond clair</strong> : la dorade est l'un des
          poissons les plus méfiants des côtes françaises. Sur sable blanc ou tessons clairs, elle voit
          un nylon coloré et refuse l'appât. Le fluorocarbone, avec son indice de réfraction proche de
          l'eau (1,42 contre 1,33 pour l'eau et 1,53 pour le nylon), devient quasi invisible. Il a aussi
          une résistance à l'abrasion supérieure — utile contre les molaires de la dorade qui peuvent
          sectionner un nylon classique en quelques secondes pendant le combat.
        </p>
        <p><strong>Les deux montages dorade à connaître</strong> :</p>
        <ul>
          <li>
            <strong>Le paternoster</strong> : un bas de ligne avec un ou deux empiles (hameçons branchés
            perpendiculairement) au-dessus du plomb. Les appâts décollent du fond, plus visibles. Idéal
            sur plage de sable, fonds plats. C'est le montage de référence.
          </li>
          <li>
            <strong>Le running ledger</strong> (plomb coulissant) : le plomb coulisse librement sur la
            ligne, l'appât traîne au fond derrière. La dorade prend l'appât sans sentir la résistance
            du plomb avant de mâcher tranquillement. Très efficace en Méditerranée et sur les dorades
            méfiantes.
          </li>
        </ul>
        <p>
          <strong>Hameçons</strong> : taille 1 à 2/0, fer fort, modèles type Mustad Beak ou Owner
          Cutting Point. Aiguise systématiquement après chaque touche manquée.
        </p>

        <h2>Les montages et appâts</h2>
        <h3>Le ver de vase et le ver de sable</h3>
        <p>
          Ce sont les appâts de référence, ceux qui prennent de la dorade partout en France quand ils
          sont <strong>frais</strong>.
        </p>
        <p>
          L'<strong>arénicole</strong> (ver de sable) est le grand classique de l'Atlantique. Long,
          charnu, plein de sang qui diffuse en pleine eau, il attire la dorade à distance. Tu l'enfiles
          entier sur l'hameçon en commençant par la tête, en remontant sur la hampe et même sur le bas
          de ligne, en laissant les 2-3 cm de queue libres. Pour les grosses dorades, double-le ou
          triple-le sur le même hameçon.
        </p>
        <p>
          La <strong>néréide</strong> (ver de vase ou ver américain) est plus fine, plus mobile,
          particulièrement efficace en Méditerranée. Présentation similaire mais avec plus de soin :
          c'est un appât fragile.
        </p>
        <p>
          <strong>Conservation et reconditionnement</strong> : tes vers se gardent 4-5 jours au frais
          (5-8 °C, jamais au congélateur). À l'achat ou la récolte, sors-les de leur sciure ou de
          leur algue, rince-les rapidement à l'eau de mer, mets-les sur du papier journal légèrement
          humide. Avant la sortie, <strong>passe-les dans un mélange de farine de maïs (Polenta)</strong> :
          ça les raidit, les fait durer au lancer et limite leur acidité de surface qui repousse les
          poissons quand ils dégradent. Astuce surfcasting compétition.
        </p>

        <h3>Le crustacé (crabe vert, ermite)</h3>
        <p>
          Sur les <strong>zones rocheuses</strong> ou les plages avec <strong>enrochements</strong>, le
          crustacé surclasse souvent les vers. C'est l'appât naturel n°1 de la dorade dans ces zones :
          ses molaires sont littéralement faites pour ça.
        </p>
        <p>
          Le <strong>crabe vert</strong> (Carcinus maenas) se présente entier pour les grosses dorades :
          taille 2-3 cm, attache l'hameçon entre la 3ème et la 4ème patte par-dessous, fil ressort par
          le dos. Pour les dorades plus modestes, casse-le en deux et utilise un demi-crabe pince-fer
          mou (mue récente) — l'appât roi.
        </p>
        <p>
          L'<strong>ermite</strong> (Pagurus, le « bernard l'ermite ») est encore plus efficace mais
          demande un peu de préparation : casse la coquille avec un caillou, retire le corps mou. Tu
          peux l'utiliser tel quel ou couper le céphalothorax pour ne garder que le « cul ». Diffuseur
          de jus puissant, irrésistible.
        </p>
        <p>
          <strong>Réglementation de collecte</strong> : la pêche à pied à des fins d'appâts est
          encadrée. La règle générale : usage <strong>strictement personnel</strong>,{' '}
          <strong>quotas journaliers</strong> (souvent 100 g à 500 g selon l'espèce et le département),{' '}
          <strong>outils manuels</strong> uniquement, <strong>respect des tailles minimales</strong> (5
          cm pour le crabe vert dans certains départements). Vérifie l'arrêté préfectoral de ton
          département sur le site de la DDTM. Et ne pille pas les flaques de marée basse : un
          retournement de rochers se remet <strong>toujours</strong> dans le bon sens.
        </p>

        <h3>La moule et la palourde</h3>
        <p>
          En <strong>Méditerranée</strong> et sur certaines côtes atlantiques, la <strong>moule</strong>{' '}
          et la <strong>palourde</strong> sont les appâts de prédilection pour la grosse dorade. Logique :
          c'est exactement ce qu'elle broie naturellement.
        </p>
        <p>
          <strong>Astuce de fixation</strong> pour tenir au lancer (le grand défi des appâts mous) :
        </p>
        <ol>
          <li>Décoque la moule ou la palourde.</li>
          <li>Pique l'hameçon dans la partie la plus dure (le « pied » de la moule, le « siphon » de la palourde).</li>
          <li><strong>Ligature</strong> ensuite l'ensemble avec du <strong>fil élastique de cuisine</strong> (« bait elastic » des magasins de pêche, 0,2-0,3 mm) en 4-5 tours autour de l'appât et de la hampe.</li>
        </ol>
        <p>
          Sans cette ligature, ton appât s'arrache au lancer. Avec, il tient même sur un lancer à 100 m.
        </p>
        <p>
          <strong>Collecte dans le respect des quotas</strong> : moule, palourde, coque relèvent de la
          pêche à pied récréative. Quotas indicatifs (à vérifier dans ton département) :{' '}
          <strong>5 kg de moules</strong>, <strong>2 kg de palourdes</strong>,{' '}
          <strong>3 kg de coques</strong> par jour et par personne,{' '}
          <strong>outils manuels uniquement</strong>. Certaines zones sont interdites au ramassage pour
          cause de pollution — consulte la carte du Ifremer ou de l'ARS de ta région. Et{' '}
          <strong>n'utilise jamais</strong> des coquillages achetés en grande surface comme appâts :
          la cuisson les rend inefficaces.
        </p>

        <h2>Quand et où pêcher la dorade ?</h2>
        <p><strong>La saison principale</strong> dépend fortement de ta façade :</p>
        <ul>
          <li>
            <strong>Atlantique et Manche</strong> : pic de <strong>juin à octobre</strong>, avec souvent
            les meilleures sessions entre <strong>mi-août et fin septembre</strong> quand l'eau atteint
            son maximum thermique (18-22 °C en surface). En dehors de cette fenêtre, la dorade se rabat
            vers le large et devient quasi-introuvable depuis le bord.
          </li>
          <li>
            <strong>Méditerranée</strong> : présente <strong>toute l'année</strong>, avec un pic de{' '}
            <strong>mai à novembre</strong>. L'hiver, elle se concentre dans les étangs littoraux (Thau,
            Berre, Salses-Leucate) où elle reste prenable les jours de redoux.
          </li>
        </ul>
        <p><strong>Les meilleures conditions</strong> sont assez précises :</p>
        <ul>
          <li>
            <strong>Température de l'eau</strong> : la dorade s'active à partir de{' '}
            <strong>17-18 °C</strong> et devient mordeuse à <strong>20-22 °C</strong>. En dessous de
            15 °C, elle ralentit son alimentation.
          </li>
          <li>
            <strong>État de la mer</strong> : <strong>calme à légèrement agitée</strong> (houle
            0,3-1 m). En grosse mer, elle décroche du bord ; en mer d'huile par grand soleil, elle
            devient ultra-méfiante. Le « petit ressac » qui rebrasse le sable est la condition idéale —
            c'est lui qui libère vers et petits crustacés.
          </li>
          <li>
            <strong>Vent</strong> : <strong>vent de terre</strong> modéré (off-shore) en début/fin de
            journée, qui aplatit la mer et concentre les proies en bordure. Évite les vents on-shore
            forts.
          </li>
          <li>
            <strong>Lumière</strong> : la dorade chasse essentiellement à{' '}
            <strong>l'aube et au crépuscule</strong>, et <strong>toute la nuit</strong>. Le surfcasting
            nocturne d'été (22h-3h) est un must.
          </li>
        </ul>
        <p>
          <strong>La marée</strong>, sur les plages atlantiques, est centrale. La dorade vient se nourrir{' '}
          <strong>à marée haute</strong> dans la zone de ressac, là où les vagues retournent le sable et
          libèrent les coquillages. Vise les <strong>deux heures avant à deux heures après la pleine
          mer</strong>. Sur les <strong>coefficients 60-90</strong>, le mouvement d'eau est optimal.
          Au-delà de 100, le courant peut devenir trop fort sur certaines plages. En Méditerranée, la
          marée est négligeable mais la <strong>pression barométrique</strong> et le vent jouent le
          même rôle.
        </p>

        <h2>Lire une plage de surfcasting</h2>
        <p>
          Une plage qui paraît plate vue de la côte ne l'est jamais sous l'eau.{' '}
          <strong>Tout l'art du surfcasting commence par l'observation à marée basse.</strong>
        </p>
        <p><strong>Repérer les structures clés</strong> :</p>
        <ul>
          <li>
            <strong>Les bancs de sable</strong> (« barres ») sont des reliefs parallèles à la côte.
            Vus de la dune à marée basse, ils apparaissent comme des bandes plus claires (sable
            émergent) séparées par des bandes plus foncées (creux remplis d'eau). La dorade patrouille{' '}
            <strong>derrière</strong> les bancs, dans la fosse côté large, ou <strong>devant</strong>{' '}
            dans le couloir qui borde le bord.
          </li>
          <li>
            <strong>Les bâches</strong> sont des cuvettes plus profondes qui restent en eau à marée
            basse. Elles concentrent les coquillages et les vers — donc les dorades qui les chassent à
            marée montante. Une bâche, c'est un point chaud quasi-systématique.
          </li>
          <li>
            <strong>Les couloirs</strong> (ou « rip currents », baïnes en Aquitaine) sont des courants
            perpendiculaires à la côte qui évacuent l'eau du ressac vers le large. Ils emportent vers et
            coquillages mobilisés par les vagues,{' '}
            <strong>les déversant en chapelet au large</strong>. Les prédateurs comme la dorade et le
            bar se postent à l'embouchure du couloir pour avaler le tapis roulant.{' '}
            <strong>Attention</strong> : les baïnes sont dangereuses pour les baigneurs. Pêcher à côté,
            jamais dedans, jamais en marchant dans l'eau.
          </li>
        </ul>
        <p>
          <strong>L'observation à marée basse, mode d'emploi</strong> : repère la plage à coef{' '}
          {'>'} 90 lors d'une grande marée basse. Photographie, prends des notes,{' '}
          <strong>place des amers</strong> (un poteau, un arbre, un point fixe sur la dune). Quand tu
          reviens à marée montante, tu sais exactement où lancer — alors que tout est sous l'eau et
          invisible.
        </p>
        <p>
          Les outils <strong>Carnet de Pêche</strong> te font gagner des saisons sur cette lecture du
          terrain. La <strong>carte intelligente</strong> te montre la bathymétrie, te superpose le{' '}
          <strong>score d'activité 0-100</strong> par zone calculé sur les prises de dorade loguées par
          la communauté, et te filtre par <strong>espèce et technique</strong>. Tu visualises en quelques
          secondes les bancs, bâches et couloirs validés par des dizaines d'autres surfcasteurs — plus
          besoin de passer cinq étés à reconnaître une plage.
        </p>

        <h2>La réglementation</h2>
        <ul>
          <li><strong>Taille minimale de capture</strong> : 25 cm (règlement UE 2019/1241 — valable en Atlantique, Manche et Méditerranée).</li>
          <li><strong>Quota journalier</strong> : pas de quota spécifique pour la pêche récréative à ce jour, mais pratique raisonnée recommandée.</li>
          <li><strong>Zones de collecte d'appâts</strong> : la collecte de moules, palourdes et coques est soumise à des quotas journaliers et des zones autorisées — renseigne-toi auprès de la DDTM de ton département.</li>
        </ul>

        <h2>Loguer ta prise sur Carnet de Pêche</h2>
        <p>
          Tu viens de sortir une dorade royale, et son flanc doré scintille encore sur ton trépied. Avant
          de la relâcher (no-kill conseillé sur les petits sujets et les femelles) ou de la garder pour
          la planche, prends 20 secondes pour la loguer dans <strong>Carnet de Pêche</strong>.
        </p>
        <p>
          L'enregistrement est calé pour aller vite, même les doigts pleins de sable :
        </p>
        <ul>
          <li><strong>Espèce</strong> : Dorade royale (déjà filtrée dans tes favoris depuis l'onboarding).</li>
          <li><strong>Taille</strong> : un curseur entre 20 et 70 cm. Mesure rapide contre ta canne ou un mètre ruban à plat.</li>
          <li><strong>Poids</strong> (optionnel) : pesée à la balance ou estimation visuelle (une dorade de 40 cm pèse en moyenne 1,2 kg).</li>
          <li><strong>Technique</strong> : Surfcasting. Sous-menu pour le montage (paternoster / running ledger / autre).</li>
          <li><strong>Appât utilisé</strong> : précise — arénicole, néréide, crabe vert entier, demi-crabe, ermite, moule, palourde, mix. Cette donnée est cruciale pour tes stats annuelles et pour calibrer le score communautaire.</li>
          <li><strong>Photo</strong> (optionnelle, recommandée) : redimensionnée et compressée automatiquement.</li>
          <li><strong>Conditions auto-enregistrées</strong> : marée, coefficient, hauteur d'eau, vent direction/force, houle, température de l'air et de l'eau, pression atmosphérique, phase lunaire. Tu ne saisis rien, tout est récupéré en arrière-plan via Open-Meteo Marine.</li>
        </ul>
        <p>
          Côté <strong>confidentialité</strong>, ta prise est <strong>privée par défaut</strong>. Tu peux
          la rendre visible à tes amis (coords précises) ou à la communauté (coords floutées à 1 km pour
          protéger ta plage contre le spot-burning).
        </p>
        <p>
          <strong>Pourquoi ça compte au-delà de ton carnet perso</strong> : la dorade est l'espèce qui
          réagit le plus finement aux conditions (température, marée, pression). Chaque prise loguée
          affine le <strong>score d'activité</strong> des plages autour de toi. Ta dorade prise à 4h47
          du matin par marée descendante coef 78 et pression 1018 hPa fait monter le score de cette zone
          pour les sessions futures à conditions équivalentes — pour toi, et pour tous les pêcheurs de
          dorade de ton département. C'est exactement comme ça que la carte devient plus intelligente à
          chaque saison qui passe.
        </p>
        <p>
          <strong>Logue. Partage. Progresse.</strong> Ta prochaine session démarrera avec un cran
          d'avance.
        </p>
      </GuideLayout>
    </>
  )
}
