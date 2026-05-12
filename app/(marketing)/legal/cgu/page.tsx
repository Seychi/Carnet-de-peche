import type { Metadata } from 'next'
import { LegalLayout } from '@/components/layout/LegalLayout'

export const metadata: Metadata = {
  title: 'Conditions générales d\'utilisation — Carnet de Pêche',
  description: 'Conditions générales d\'utilisation du service Carnet de Pêche. Règles de la communauté, droits et obligations des utilisateurs.',
  robots: { index: true, follow: true },
}

const toc = [
  { id: 'objet', label: 'Objet et acceptation' },
  { id: 'inscription', label: 'Inscription et compte' },
  { id: 'contenu-utilisateur', label: 'Contenu utilisateur' },
  { id: 'regles-communaute', label: 'Règles de la communauté' },
  { id: 'moderation', label: 'Modération' },
  { id: 'abonnements', label: 'Abonnements payants' },
  { id: 'responsabilite', label: 'Responsabilité' },
  { id: 'modification', label: 'Modification des CGU' },
  { id: 'droit-applicable', label: 'Droit applicable' },
]

export default function CguPage() {
  return (
    <LegalLayout
      title="Conditions générales d'utilisation"
      lastUpdated="mai 2026"
      toc={toc}
    >
      <h2 id="objet">1. Objet et acceptation</h2>
      <p>
        Les présentes Conditions Générales d'Utilisation (CGU) régissent l'accès et l'utilisation du service <strong>Carnet de Pêche</strong>, accessible via le site <strong>carnet-de-peche.com</strong> et ses applications mobiles associées (ci-après « le Service »).
      </p>
      <p>
        En créant un compte ou en utilisant le Service, tu acceptes sans réserve les présentes CGU. Si tu n'acceptes pas ces conditions, tu dois cesser d'utiliser le Service.
      </p>
      <p>
        L'éditeur se réserve le droit de modifier les présentes CGU à tout moment. Les modifications entrent en vigueur après un préavis de 30 jours (voir section « Modification des CGU »).
      </p>

      <h2 id="inscription">2. Inscription et compte</h2>
      <p>
        Pour accéder à l'ensemble des fonctionnalités du Service, tu dois créer un compte en fournissant une adresse email valide et un pseudo unique.
      </p>
      <ul>
        <li>
          <strong>Un compte par personne</strong> : chaque individu ne peut détenir qu'un seul compte actif. La création de comptes multiples pour contourner une suspension est interdite.
        </li>
        <li>
          <strong>Âge minimum</strong> : le Service est réservé aux personnes âgées d'au moins <strong>18 ans</strong>, ou aux mineurs disposant de l'autorisation préalable de leur représentant légal.
        </li>
        <li>
          <strong>Exactitude des informations</strong> : tu t'engages à fournir des informations exactes lors de l'inscription et à les maintenir à jour.
        </li>
        <li>
          <strong>Sécurité du compte</strong> : tu es responsable de la confidentialité de tes identifiants de connexion. Toute activité réalisée depuis ton compte est réputée effectuée par toi.
        </li>
        <li>
          <strong>Transfert de compte</strong> : les comptes sont personnels et non cessibles.
        </li>
      </ul>

      <h2 id="contenu-utilisateur">3. Contenu utilisateur</h2>
      <p>
        Le Service te permet de publier des contenus (prises loguées, photos, posts, commentaires — ci-après « Contenu Utilisateur »).
      </p>
      <h3>Propriété</h3>
      <p>
        Tu restes l'unique propriétaire de ton Contenu Utilisateur. En publiant sur le Service, tu concèdes à l'éditeur une <strong>licence non-exclusive, mondiale, gratuite</strong> pour afficher, reproduire et distribuer ce contenu dans le cadre du fonctionnement du Service (fil régional, carte, profil public). Cette licence prend fin à la suppression du contenu concerné.
      </p>
      <h3>Responsabilité</h3>
      <p>
        Tu es seul responsable du Contenu Utilisateur que tu publies. Tu garantis que ce contenu ne viole aucun droit de tiers et ne contrevient à aucune loi ou réglementation en vigueur.
      </p>
      <h3>Contenu interdit</h3>
      <p>
        Il est interdit de publier tout contenu :
      </p>
      <ul>
        <li>Illicite, diffamatoire, injurieux, discriminatoire ou incitant à la haine</li>
        <li>Portant atteinte à la vie privée de tiers</li>
        <li>Contenant des données personnelles de tiers sans leur consentement</li>
        <li>À caractère publicitaire ou commercial non autorisé par l'éditeur</li>
        <li>Contenant des virus, malwares ou tout code malveillant</li>
      </ul>

      <h2 id="regles-communaute">4. Règles de la communauté</h2>
      <p>
        Carnet de Pêche est une communauté de pêcheurs passionnés. Pour préserver sa qualité et son esprit, les règles suivantes s'appliquent à tous les membres.
      </p>
      <h3>Respect de la réglementation</h3>
      <ul>
        <li>
          <strong>Tailles minimales de capture</strong> : tout contenu valorisant ou montrant la capture de poissons sous taille légale sera modéré. Les tailles de référence sont celles fixées par la réglementation française et européenne en vigueur.
        </li>
        <li>
          <strong>Périodes d'interdiction</strong> : la publication de contenus montrant des captures durant les périodes de protection des espèces est interdite.
        </li>
        <li>
          <strong>Quotas</strong> : inciter à dépasser les quotas journaliers légaux est interdit.
        </li>
      </ul>
      <h3>Respect des spots et des autres pêcheurs</h3>
      <ul>
        <li>
          <strong>Pas de spot-burning</strong> : il est interdit de divulguer publiquement les coordonnées précises de spots sensibles ou de les identifier de façon à nuire aux pêcheurs locaux ou à l'équilibre de l'écosystème. Les fonctionnalités de floutage GPS du Service sont conçues pour protéger les spots — il est interdit de les contourner intentionnellement.
        </li>
        <li>
          <strong>Pas d'incitation au braconnage</strong> : tout contenu valorisant le braconnage, le non-respect des quotas ou des zones de protection est strictement interdit et sera signalé aux autorités compétentes si nécessaire.
        </li>
        <li>
          <strong>Respect de l'environnement</strong> : nous encourageons la pratique du <em>catch and release</em> raisonné et le respect des milieux naturels.
        </li>
      </ul>
      <h3>Comportement entre membres</h3>
      <ul>
        <li>Le harcèlement, l'intimidation et les comportements agressifs envers d'autres membres sont interdits.</li>
        <li>Le spam et la publication répétée de contenus identiques sont interdits.</li>
        <li>L'usurpation d'identité d'un autre membre ou d'une marque est interdite.</li>
      </ul>

      <h2 id="moderation">5. Modération</h2>
      <p>
        L'éditeur se réserve le droit de supprimer, sans préavis ni indemnité, tout Contenu Utilisateur qui enfreint les présentes CGU, la réglementation applicable ou les règles de la communauté.
      </p>
      <p>
        En cas de violation grave ou répétée, l'éditeur peut suspendre ou supprimer le compte concerné. L'utilisateur sera informé par email dans un délai raisonnable.
      </p>
      <p>
        Tout utilisateur peut signaler un contenu inapproprié via la fonctionnalité de signalement disponible dans l'application.
      </p>
      <p>
        <strong>Note sur le lancement</strong> : au lancement du Service, la modération est manuelle et réactive (sur signalement). Une modération automatisée assistée par IA sera progressivement mise en place.
      </p>

      <h2 id="abonnements">6. Abonnements payants</h2>
      <p>
        Le Service propose des formules d'abonnement payantes (<strong>Local</strong> et <strong>Itinérant</strong>) en complément de la formule gratuite (<strong>Découverte</strong>). Les fonctionnalités incluses dans chaque formule sont décrites sur la <a href="/tarifs">page Tarifs</a>.
      </p>
      <h3>Prix et facturation</h3>
      <ul>
        <li>Les prix sont affichés en euros TTC.</li>
        <li>La facturation est mensuelle ou annuelle selon la formule choisie.</li>
        <li>Le renouvellement est <strong>automatique</strong> à l'échéance, sauf résiliation préalable.</li>
      </ul>
      <h3>Essai</h3>
      <p>
        Un essai de <strong>7 jours</strong> est proposé sur les formules Local et Itinérant. Une carte bancaire est requise pour activer l'essai. À l'issue de la période d'essai, l'abonnement est automatiquement activé — tu peux annuler à tout moment avant cette échéance pour ne pas être prélevé.
      </p>
      <h3>Résiliation</h3>
      <p>
        Tu peux résilier ton abonnement à tout moment depuis ton espace personnel. La résiliation prend effet à la fin de la période d'abonnement en cours — tu continues à bénéficier des fonctionnalités Premium jusqu'à cette date.
      </p>
      <h3>Droit de rétractation</h3>
      <p>
        Conformément à l'article L.221-18 du Code de la consommation, tu disposes d'un délai de <strong>14 jours</strong> à compter de la souscription pour exercer ton droit de rétractation, sans justification. Pour ce faire, contacte-nous à <a href="mailto:contact@carnet-de-peche.com">contact@carnet-de-peche.com</a>. Le remboursement sera effectué dans un délai de 14 jours suivant la rétractation.
      </p>
      <h3>Garantie satisfait ou remboursé</h3>
      <p>
        Au-delà du droit légal de rétractation, nous offrons une <strong>garantie satisfait ou remboursé</strong> sur le premier mois d'abonnement. Si le Service ne correspond pas à tes attentes, contacte-nous et nous te remboursons intégralement, sans conditions.
      </p>

      <h2 id="responsabilite">7. Limitation de responsabilité</h2>
      <p>
        Les informations présentes sur Carnet de Pêche (spots, espèces, conditions, marées) sont fournies à titre <strong>indicatif et informatif</strong>, sur la base de données communautaires et de services tiers. Elles ne constituent pas un avis professionnel.
      </p>
      <p>
        L'éditeur ne peut être tenu responsable :
      </p>
      <ul>
        <li>Des décisions prises par les utilisateurs sur la base des informations du Service</li>
        <li>Des accidents, blessures ou dommages survenus lors de sorties de pêche</li>
        <li>De l'inexactitude ou de l'obsolescence de certaines données communautaires</li>
        <li>Des interruptions temporaires du Service pour maintenance ou cas de force majeure</li>
        <li>Du contenu publié par les utilisateurs (responsabilité exclusive de leurs auteurs)</li>
      </ul>
      <p>
        Il appartient à chaque utilisateur de vérifier la réglementation locale en vigueur avant toute sortie de pêche.
      </p>

      <h2 id="modification">8. Modification des CGU</h2>
      <p>
        L'éditeur peut modifier les présentes CGU à tout moment. En cas de modification substantielle, tu seras informé par email au moins <strong>30 jours avant</strong> l'entrée en vigueur des nouvelles conditions.
      </p>
      <p>
        Si tu n'acceptes pas les nouvelles CGU, tu peux supprimer ton compte avant leur entrée en vigueur. La poursuite de l'utilisation du Service après cette date vaut acceptation des nouvelles conditions.
      </p>

      <h2 id="droit-applicable">9. Droit applicable et juridiction</h2>
      <p>
        Les présentes CGU sont régies par le <strong>droit français</strong>. En cas de litige relatif à l'interprétation ou à l'exécution des présentes, et à défaut de résolution amiable, les tribunaux français seront seuls compétents.
      </p>
      <p>
        Pour tout litige de consommation, tu peux également recourir à la <strong>médiation de la consommation</strong> conformément aux articles L.612-1 et suivants du Code de la consommation, avant tout recours judiciaire.
      </p>
    </LegalLayout>
  )
}
