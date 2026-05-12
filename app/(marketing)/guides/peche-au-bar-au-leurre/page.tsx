import type { Metadata } from 'next'
import { GuideLayout } from '@/components/layout/GuideLayout'

export const metadata: Metadata = {
  title: 'Pêche au bar au leurre depuis le bord — Guide complet · Carnet de Pêche',
  description: 'Technique, matériel, saison, postes : tout ce qu\'il faut savoir pour démarrer ou progresser sur le bar au leurre depuis la côte française.',
}

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'Article',
  headline: 'Pêche au bar au leurre depuis le bord',
  description: 'Guide complet pour la pêche au bar au leurre depuis la côte.',
  author: { '@type': 'Organization', name: 'Carnet de Pêche' },
  publisher: { '@type': 'Organization', name: 'Carnet de Pêche', url: 'https://carnet-de-peche.com' },
  datePublished: '2026-05-01',
  dateModified: '2026-05-01',
  inLanguage: 'fr',
}

const relatedGuides = [
  { slug: 'peche-a-la-dorade-royale-au-surfcasting', title: 'Pêche à la dorade royale au surfcasting' },
  { slug: 'les-meilleurs-spots-de-peche-en-bretagne', title: 'Les meilleurs spots de pêche en Bretagne' },
]

export default function GuideBarPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <GuideLayout
        title="Pêche au bar au leurre depuis le bord"
        excerpt="Technique, matériel, saison, postes : tout ce qu'il faut savoir pour démarrer ou progresser sur le bar au leurre depuis la côte."
        readTime={20}
        publishedAt="Mai 2026"
        category="Technique"
        species="Bar"
        heroImage="/images/bar.jpg"
        heroImageAlt="Bar commun (Dicentrarchus labrax)"
        relatedGuides={relatedGuides}
      >
        <h2>Comprendre le bar (Dicentrarchus labrax)</h2>
        <p>
          Le bar européen est l'espèce phare de la pêche à la canne du bord sur nos côtes atlantiques et méditerranéennes. Prédateur opportuniste, il chasse en embuscade dans les cassures, les courants et les zones de déferlement. C'est précisément là que le leurre est le plus efficace.
        </p>
        <p>
          Le bar est un chasseur visuel et acoustique. Il repère ses proies à la vibration latérale d'abord, puis à la vue. Son menu varie selon la saison et l'endroit : civelles et lançons au printemps, sardines et maquereaux en été, crabes mous et crevettes à la fin de l'automne. Cette opportunité alimentaire explique pourquoi on peut le prendre avec des leurres très variés au cours de l'année — l'enjeu, c'est d'imiter ce qu'il mange à ce moment-là, dans cet endroit-là.
        </p>
        <p>
          Son activité est rythmée par deux mécaniques principales. La première, c'est la marée. Le bar chasse quand l'eau bouge. Les phases les plus productives sont la mi-montante et le début de la descente, parce que le courant déloge les proies des cassures et des herbiers. À l'étale, il se met souvent en pause. Les coefficients de 70-95 sont un sweet spot : assez de courant pour activer les poissons, pas assez pour rendre la pêche injouable.
        </p>
        <p>
          La seconde, c'est la lumière. Le bar chasse surtout aux heures à faible luminosité — l'aube, le crépuscule, la nuit, et parfois en plein jour si le ciel est couvert ou la mer brassée. En plein soleil et eau calme, il décroche et descend.
        </p>
        <p>
          Côté météo, une houle modérée et un vent d'ouest (sur l'Atlantique) brassent l'eau, oxygènent la zone et excitent les bancs. C'est typiquement le genre de conditions où une session courte peut transformer ta journée.
        </p>

        <h2>Le bon matériel pour débuter</h2>
        <h3>La canne</h3>
        <p>
          Pour le bar au leurre depuis le bord, vise une canne entre <strong>2,70 m et 3 m</strong>. C'est la longueur qui te permet à la fois de lancer loin depuis une plage et de gérer un poisson dans les rochers. Plus court (2,40 m) c'est jouable pour la pêche en bateau ou les postes très techniques, plus long (3,30 m) c'est utile pour le surfcasting mais devient encombrant aux leurres.
        </p>
        <p>
          La puissance de lancer idéale est <strong>15-60 g</strong> (parfois noté ML/M, medium-light à medium). Cette plage couvre 90 % de ce que tu vas lancer : leurres souples de 12-25 g, stickbaits autour de 20 g, jigs jusqu'à 40 g.
        </p>
        <p>L'action compte autant que la puissance :</p>
        <ul>
          <li><strong>Action de pointe rapide</strong> (fast) : idéale pour les leurres souples montés sur tête plombée. La pointe nerveuse transmet bien les vibrations et permet d'animer sec.</li>
          <li><strong>Action semi-parabolique</strong> (regular-fast) : meilleure pour les stickbaits et les leurres durs. Elle absorbe les coups de tête du bar pendant le combat et évite que l'hameçon décroche.</li>
        </ul>
        <p>
          <strong>Budget pour débuter : 80-150 €.</strong> Sur cette gamme tu trouves des cannes solides chez Major Craft (Crostage), Tenryu (Injection SP), Sakura (Speciment X), ou Daiwa (Ballistic, Lateo). Évite les premiers prix sous 50 € : la qualité de blank ne suit pas et tu vas la casser dans l'année.
        </p>

        <h3>Le moulinet</h3>
        <p>
          Pour cette canne, monte un moulinet <strong>taille 3000 à 4000</strong> (numérotation Shimano/Daiwa). Le 3000 est plus léger et te fatigue moins sur de longues sessions, le 4000 a une capacité de ligne supérieure et un meilleur frein — utile si tu pêches dans des zones avec gros poissons (estuaires, pointes battues).
        </p>
        <p>
          Le <strong>ratio de récupération</strong> idéal est entre <strong>5.6:1 et 6.2:1</strong>. Trop lent, tu galères à ramener un leurre de surface ou à récupérer du mou rapidement. Trop rapide (au-dessus de 6.5:1), tu perds en puissance pour sortir un poisson du courant.
        </p>
        <p>
          L'<strong>étanchéité</strong> est non-négociable en bord de mer. Le sel et le sable tuent les moulinets bas de gamme en quelques sessions. Cherche les mentions « sealed body », « IPX5 » ou « Magsealed » (Daiwa). Rince ton moulinet à l'eau douce après chaque sortie, même si c'est étanche.
        </p>
        <p><strong>Recommandations par budget :</strong></p>
        <ul>
          <li>Entrée de gamme (60-90 €) : Shimano Nasci, Daiwa Ninja LT, Penn Wrath.</li>
          <li>Milieu de gamme (120-180 €) : Shimano Stradic FL, Daiwa Fuego LT, Penn Slammer III.</li>
          <li>Haut de gamme (250-400 €) : Shimano Stradic Ci4+, Daiwa Certate, Shimano Twin Power.</li>
        </ul>

        <h3>La tresse et le bas de ligne</h3>
        <p>
          Sur le moulinet, va directement à la <strong>tresse</strong>. Le nylon est définitivement dépassé pour la pêche au leurre : la tresse n'a quasiment pas d'élasticité, transmet toutes les vibrations, et permet des lancers 20 % plus longs.
        </p>
        <p>
          Pour le bar, monte une <strong>tresse PE 1.0 à PE 1.5, soit 15-20 lbs (≈ 7-9 kg de résistance)</strong>. C'est largement assez pour brider un bar de 70 cm dans la roche. Marques fiables : Daiwa J-Braid 8 Brins, Sufix 832, YGK G-Soul, Varivas Avani.
        </p>
        <p>
          Au bout de la tresse, monte impérativement un <strong>bas de ligne en fluorocarbone de 30 à 40/100</strong> (soit ≈ 7-12 kg). Longueur recommandée : 1 à 1,5 m. Pourquoi le fluoro est indispensable :
        </p>
        <ol>
          <li><strong>Invisibilité.</strong> Le fluorocarbone a un indice de réfraction proche de l'eau. Dans les eaux claires de la Manche ou de la Méditerranée, un bar voit la tresse colorée et décroche. Le fluoro disparaît.</li>
          <li><strong>Résistance à l'abrasion.</strong> La tresse, malgré sa résistance, est fragile au frottement contre la roche, les moules, les coquillages. Le fluoro encaisse.</li>
          <li><strong>Rigidité.</strong> Il limite les emmêlements sur les hameçons triples des leurres durs.</li>
        </ol>
        <p>
          <strong>Le nœud de liaison tresse/fluoro</strong> est l'étape qui dégoûte la plupart des débutants. Apprends-en un seul, mais bien : le <strong>nœud FG</strong> — le plus fin, le plus résistant, passe à travers les anneaux sans accrocher. Apprends-le sur YouTube, prévois une heure pour le maîtriser. C'est l'investissement le plus rentable de ta saison. En secours : le <strong>nœud Albright modifié</strong>, plus simple, légèrement moins propre.
        </p>

        <h2>Les leurres incontournables</h2>
        <p>
          Tu n'as pas besoin d'une boîte à 200 leurres pour démarrer. Une dizaine bien choisis couvre 95 % des situations.
        </p>
        <p>
          <strong>Les leurres souples</strong> (shads, slugs, finesses) sont les plus polyvalents et les plus pardonnants pour un débutant. Tu les montes sur une tête plombée (5 à 20 g selon la profondeur et le courant), et tu les ramènes en linéaire. Marques de référence : Fiiish Black Minnow (taille 90 ou 120), Delalande Sandra, Keitech Easy Shiner. Compte 5 à 12 € par leurre.
        </p>
        <p>
          <strong>Les leurres durs</strong> se déclinent en plusieurs sous-familles : <strong>stickbaits</strong> (Xorus Patchinko, Lucky Craft Gunfish) qu'on anime en « walking the dog », <strong>poppers</strong> pour les surfaces brassées, <strong>jerkbaits et minnows</strong> (Daiwa Shoreline Shiner, IMA Komomo) qui nagent entre 10 cm et 1 m, et <strong>lipless</strong> (Pontoon21 Bet-A-Vib) pour les zones profondes. Compte 15 à 35 € par leurre.
        </p>
        <p>
          <strong>Les leurres métalliques</strong> (metals, casting jigs) sont indispensables quand le bar chasse au large. Marques : Maria Mucho Lucir, Major Craft Jigpara. Compte 8 à 20 €.
        </p>

        <div className="not-prose overflow-x-auto my-6 rounded-[14px] border border-ink-100">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="bg-navy-900 text-white">
                <th className="text-left px-4 py-3 font-semibold">Famille</th>
                <th className="text-left px-4 py-3 font-semibold">Conditions idéales</th>
                <th className="text-left px-4 py-3 font-semibold">Profondeur de nage</th>
                <th className="text-left px-4 py-3 font-semibold">Prix indicatif</th>
              </tr>
            </thead>
            <tbody>
              {[
                ['Leurre souple shad', 'Toutes conditions, eau brassée à calme', '1 à 5 m', '5-12 €'],
                ['Leurre souple slug', 'Eau claire, bar méfiant, postes peu profonds', '0,5 à 2 m', '7-15 €'],
                ['Stickbait surface', 'Aube/crépuscule, mer calme à modérée', 'Surface', '18-30 €'],
                ['Popper', 'Mer brassée, activité visible en surface', 'Surface', '15-25 €'],
                ['Jerkbait / minnow', 'Pêche à vue, bordures, eau claire', '0,3 à 1,5 m', '15-25 €'],
                ['Lipless', 'Eau profonde, courant, prospection rapide', '1 à 4 m', '18-30 €'],
                ['Metal jig', 'Vent fort, bar au large, gros lancers', 'Toute la colonne', '8-20 €'],
              ].map(([famille, conditions, profondeur, prix], i) => (
                <tr key={famille} className={i % 2 === 0 ? 'bg-white' : 'bg-sand-50'}>
                  <td className="px-4 py-3 font-medium text-navy-900 border-b border-ink-100">{famille}</td>
                  <td className="px-4 py-3 text-ink-700 border-b border-ink-100">{conditions}</td>
                  <td className="px-4 py-3 text-ink-700 border-b border-ink-100">{profondeur}</td>
                  <td className="px-4 py-3 text-ink-700 border-b border-ink-100">{prix}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p>
          <strong>Coloris à prévoir</strong> : ayou (imitation lançon argenté) pour les eaux claires, bleu dos / ventre blanc pour les conditions classiques, chartreuse ou orange fluo pour les eaux brassées et la pêche de nuit, brun/marron pour les fonds rocheux.
        </p>

        <h2>Les techniques d'animation</h2>
        <h3>Le leurre souple en linéaire</h3>
        <p>
          C'est la technique la plus simple et celle qui pêche le plus de bars chaque année. Tu lances ton shad monté sur tête plombée, tu laisses descendre quelques secondes (compte « 1, 2, 3 » par mètre de profondeur ciblée), puis tu récupères régulièrement.
        </p>
        <p>
          <strong>Le bon rythme</strong>, c'est celui où tu sens la palette de ton shad battre dans ta canne — une vibration légère et continue. Si tu ne sens rien, tu ramènes trop lentement. Si tu sens des secousses violentes, tu ramènes trop vite. Une bonne base : 1 tour de manivelle par seconde, avec des accélérations courtes et des pauses d'une seconde toutes les 5-10 tours. Le bar attaque souvent quand la vitesse change.
        </p>
        <p>
          <strong>Profondeur de nage</strong> : c'est ta tête plombée qui décide. Sur 3 m de fond, une tête de 10 g te garde à mi-eau ; une tête de 20 g racle le fond. Si tu accroches tous les 2 lancers, tu es trop lourd. Si tu ne sens jamais le contact du fond, tu es trop léger.
        </p>

        <h3>Le stickbait en surface</h3>
        <p>
          C'est la pêche la plus visuelle, la plus addictive, et celle qui te fera devenir accro au bar. Tu vois le poisson exploser sous ton leurre, parfois deux ou trois fois avant qu'il ne s'accroche.
        </p>
        <p>
          <strong>Le « walking the dog »</strong> est l'animation reine du stickbait : canne pointée vers l'eau, tu donnes des petits coups secs du poignet (pas du bras) à un rythme régulier, en récupérant un peu de ligne entre chaque coup. Bien exécuté, le stickbait part en zigzag de gauche à droite, comme un poisson blessé qui panique.
        </p>
        <p><strong>Conditions idéales :</strong></p>
        <ul>
          <li>Surface calme à modérément agitée (en grosse mer, le stickbait est noyé sous la mousse).</li>
          <li>Lumière faible : levée du jour, fin de journée, ciel couvert.</li>
          <li>Marée montante ou descendante, jamais l'étale plate.</li>
          <li>Présence visible de bancs de proies en surface (mulets, athérines, lançons).</li>
        </ul>
        <p>
          <strong>Astuce</strong> : quand un bar tape ton stickbait et le rate, ne ferre pas et continue ton animation. 8 fois sur 10 il revient dans les secondes qui suivent. Si tu ferres dans le vide, tu sors le leurre de la zone — game over.
        </p>

        <h3>La pêche en verticale depuis les rochers</h3>
        <p>
          Quand tu pêches depuis un poste en surplomb — une pointe rocheuse, un éperon, une digue haute — tu peux exploiter une technique trop souvent ignorée : la verticale. Au lieu de lancer loin, tu descends ton leurre quasiment à l'aplomb du poste et tu animes en montées-descentes successives. Le bar prend ton leurre pour une proie qui remonte le long du mur.
        </p>
        <p>
          <strong>Animation</strong> : descente contrôlée frein légèrement tendu, pause de 2 secondes au fond, puis 2 ou 3 coups de scion vers le haut pour faire remonter le leurre d'un mètre, nouvelle descente. Le bar attaque quasi-systématiquement sur la descente.
        </p>
        <p><strong>Sécurité — à lire deux fois :</strong></p>
        <ul>
          <li>Ne pêche <strong>jamais</strong> seul depuis un poste en surplomb. Un coup de mer mal anticipé t'envoie à l'eau, et personne ne te voit.</li>
          <li>Porte des <strong>chaussures avec semelle Vibram</strong> ou crampons — la roche couverte d'algues est plus glissante que de la glace.</li>
          <li>Surveille la <strong>mer derrière toi</strong>, pas devant. Les vagues scélérates arrivent quand tu regardes ton leurre.</li>
          <li>Consulte les <strong>horaires de marée</strong> avant : un poste accessible à mi-marée descendante peut t'isoler une heure après.</li>
          <li>Gilet de sauvetage auto-gonflable conseillé. Pas négociable si tu pêches de nuit ou en mer formée.</li>
        </ul>

        <h2>Quand pêcher le bar au leurre ?</h2>
        <p>
          <strong>La saison principale</strong> s'étend d'<strong>avril à novembre</strong>, avec deux pics. <strong>Avril-juin</strong> : le bar remonte du large, les poissons sont voraces et moins méfiants. <strong>Septembre-novembre</strong> : les bars se gavent avant l'hiver — c'est la période des plus belles prises, avec souvent des trophées au-delà de 70 cm.
        </p>
        <p>
          En <strong>juillet-août</strong>, ça pêche aussi, mais l'eau chaude pousse les bars en zones plus profondes ou plus fraîches (estuaires, courants). En <strong>décembre-mars</strong>, c'est le creux : le bar est encore prenable en Méditerranée et dans le sud de l'Atlantique, mais les sessions sont plus longues pour moins de poissons.
        </p>
        <p>
          <strong>Les meilleures heures</strong> sont les transitions de lumière : le <strong>lever du soleil</strong> (la fameuse « première heure ») et le <strong>coucher du soleil</strong>. La <strong>pêche de nuit</strong> est exceptionnelle en été — moins de pression, eau plus fraîche, bars actifs en chasse de surface. Évite le plein soleil de midi en mer calme.
        </p>
        <p>
          <strong>Le rôle de la marée</strong> est central. Vise la <strong>mi-montante</strong>, la <strong>pleine mer ± une heure</strong> et le <strong>début de descente</strong> (coef 70-95). À l'étale, fais une pause ou change de poste. Les grandes marées (coef {'>'} 95) sont à double tranchant : très productives à pleine mer, injouables à marée basse.
        </p>
        <p>
          <strong>La météo parfaite</strong> : vent d'ouest 10-25 km/h sur l'Atlantique, houle modérée 0,5-1,5 m, ciel couvert ou variable. Une mer d'huile par grand beau temps est presque toujours une mauvaise session.
        </p>

        <h2>Choisir son poste</h2>
        <p>
          Le bar n'est pas réparti uniformément le long de la côte. Il fréquente des structures précises, et savoir lire le terrain depuis le bord, c'est 80 % de la réussite.
        </p>
        <p>
          <strong>Les pointes rocheuses</strong> sont des aimants à bars. Le courant qui contourne la pointe crée des zones de remous et de contre-courants où les proies se concentrent. Pêche le côté abrité, juste à la jonction entre l'eau calme et le courant.
        </p>
        <p>
          <strong>Les estuaires</strong> sont productifs à toutes saisons. Le mélange eau douce / eau salée attire civelles, lançons, mulets — donc les bars. Vise les changements de fond, les piles de pont, les zones de confluence.
        </p>
        <p>
          <strong>Les plages à bancs de sable</strong> cachent des bars derrière chaque cassure. Repère les zones où la vague casse différemment : ça signale un haut-fond, une fosse, un déversoir naturel.
        </p>
        <p>
          <strong>Les digues et cales</strong> amènent des fonds intéressants à portée de lancer. Vise les angles, les coins où la digue rejoint la côte, les fonds à la base des enrochements.
        </p>
        <p>
          C'est exactement ce que <strong>la carte Carnet de Pêche</strong> te permet de faire en quelques secondes : visualiser les structures sous-marines (bathymétrie, cassures, herbiers), superposer le <strong>score d'activité communautaire 0-100</strong> calculé à partir des prises loguées, et filtrer par espèce et technique. Plus besoin de passer trois saisons à apprendre une côte.
        </p>

        <h2>La réglementation à connaître</h2>
        <p>
          Avant de pratiquer, quelques règles non-négociables :
        </p>
        <ul>
          <li><strong>Taille minimale de capture</strong> : 36 cm en Atlantique et Manche, 25 cm en Méditerranée (règlement UE 2019/1241).</li>
          <li><strong>Quota journalier</strong> : 3 bars par pêcheur et par jour en Atlantique-Manche-Mer du Nord (révisé annuellement — vérifier la réglementation en vigueur).</li>
          <li><strong>Pratique du no-kill</strong> : fortement conseillée hors des périodes de forte abondance. Utilise des hameçons sans ardillon pour faciliter la remise à l'eau.</li>
          <li><strong>Zones interdites</strong> : certaines zones marines protégées interdisent la pêche. Vérifie la réglementation locale auprès de la DDTM.</li>
        </ul>

        <h2>Loguer ta prise sur Carnet de Pêche</h2>
        <p>
          Tu viens de sortir ton premier bar au leurre. Avant de relâcher (ou de remplir ton quota), prends 20 secondes pour le loguer dans <strong>Carnet de Pêche</strong>. L'interface est faite pour aller vite, sur le poste, les mains mouillées :
        </p>
        <ul>
          <li><strong>Espèce</strong> : Bar (déjà filtré dans tes favoris depuis l'onboarding).</li>
          <li><strong>Taille</strong> : un curseur entre 30 et 90 cm. Pose ta canne à côté du poisson pour mesurer si tu n'as pas de mètre.</li>
          <li><strong>Poids</strong> (optionnel) : pesée ou estimation.</li>
          <li><strong>Technique</strong> : leurre. Sous-menu : souple linéaire / stickbait / verticale / etc.</li>
          <li><strong>Leurre utilisé</strong> : note le modèle exact (Fiiish BM120 ayou, Patchinko 100…) — utile pour tes stats annuelles.</li>
          <li><strong>Photo</strong> (optionnelle, recommandée) : redimensionnée automatiquement.</li>
          <li><strong>Conditions auto-enregistrées</strong> : marée, coefficient, vent, houle, météo, température eau, phase lunaire. Tu ne rentres rien, tout est récupéré en arrière-plan via Open-Meteo Marine.</li>
        </ul>
        <p>
          Ta prise est <strong>privée par défaut</strong>. Tu peux la passer visible pour tes amis (coords précises) ou pour la communauté (coords floutées à 1 km — anti spot-burning). Chaque prise loguée alimente le <strong>score d'activité</strong> des spots autour de toi : ton bar pris à 7h12 par marée montante coef 82 fait monter le score de ce coin pour toute la communauté qui pêche le bar dans ton département. C'est comme ça que la carte devient plus intelligente chaque saison.
        </p>
      </GuideLayout>
    </>
  )
}
