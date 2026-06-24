import type { Metadata } from 'next'
import { LegalLayout } from '@/components/layout/LegalLayout'

export const metadata: Metadata = {
  title: 'Politique de confidentialité — Carnet de Pêche',
  description: 'Comment Carnet de Pêche collecte, utilise et protège tes données personnelles, conformément au RGPD et à la loi Informatique et Libertés.',
  robots: { index: true, follow: true },
}

const toc = [
  { id: 'preambule', label: '1. Préambule' },
  { id: 'responsable', label: '2. Responsable du traitement' },
  { id: 'donnees', label: '3. Données collectées' },
  { id: 'finalites', label: '4. Finalités et bases légales' },
  { id: 'destinataires', label: '5. Destinataires' },
  { id: 'transferts', label: '6. Transferts hors UE' },
  { id: 'conservation', label: '7. Durée de conservation' },
  { id: 'droits', label: '8. Tes droits' },
  { id: 'securite', label: '9. Sécurité' },
  { id: 'cookies', label: '10. Cookies' },
  { id: 'modification', label: '11. Modification' },
  { id: 'contact', label: '12. Contact' },
]

export default function ConfidentialitePage() {
  return (
    <LegalLayout
      title="Politique de confidentialité"
      lastUpdated="24 juin 2026"
      toc={toc}
    >
      <h2 id="preambule">1. Préambule</h2>
      <p>
        La présente politique décrit comment <strong>Carnet de Pêche</strong> (édité par John
        Sebastien CAMPBELL, Entrepreneur Individuel, SIREN 977 995 174) collecte, utilise et protège
        tes données personnelles dans le cadre de l’utilisation du site{' '}
        <strong>www.carnet-de-peche.com</strong>.
      </p>
      <p>
        Nous attachons une importance particulière à la protection de la vie privée et à la sécurité
        des données. Cette politique est conforme au <strong>Règlement (UE) 2016/679 (RGPD)</strong>{' '}
        et à la <strong>loi Informatique et Libertés du 6 janvier 1978 modifiée</strong>.
      </p>

      <h2 id="responsable">2. Responsable du traitement</h2>
      <p>Le responsable du traitement est :</p>
      <ul>
        <li><strong>John Sebastien CAMPBELL</strong> (Entrepreneur Individuel)</li>
        <li>SIREN : 977 995 174</li>
        <li>Adresse : 627 Chemin des Impiniers, 06220 Vallauris, France</li>
        <li>Email : <a href="mailto:contact@carnet-de-peche.com">contact@carnet-de-peche.com</a></li>
      </ul>
      <p>
        Carnet de Pêche n’a pas désigné de Délégué à la Protection des Données (DPO) car le
        traitement de données ne le rend pas obligatoire (article 37 RGPD). Pour toute question
        relative à tes données, contacte directement le responsable du traitement à l’adresse
        ci-dessus.
      </p>

      <h2 id="donnees">3. Données collectées</h2>
      <h3>3.1 Données d’inscription et de profil</h3>
      <ul>
        <li>Email</li>
        <li>Mot de passe (stocké sous forme de hash cryptographique, jamais en clair)</li>
        <li>Pseudo (username)</li>
        <li>Bio (texte libre, optionnel, max 280 caractères)</li>
        <li>Ville et département principal</li>
        <li>Niveau de pêche (débutant / intermédiaire / expert)</li>
        <li>Techniques pratiquées, espèces favorites</li>
        <li>Fréquence de pêche, années de pratique</li>
        <li>Avatar (photo de profil, optionnel)</li>
      </ul>
      <h3>3.2 Données de connexion via fournisseurs tiers</h3>
      <p>
        Si tu te connectes via <strong>Google OAuth</strong> ou <strong>Apple Sign-In</strong> (à
        venir) : nom, prénom, email, photo de profil — uniquement les informations strictement
        nécessaires à la création de ton compte.
      </p>
      <h3>3.3 Données de pêche (le carnet)</h3>
      <p>À chaque prise loguée, nous collectons les données que tu fournis :</p>
      <ul>
        <li>Espèce, taille, poids</li>
        <li>Technique utilisée, leurre / appât</li>
        <li>Photo (optionnelle), date et heure</li>
        <li>Position GPS de la prise</li>
        <li>Conditions environnementales captées automatiquement (météo, vent, vagues, marée, lune) via l’API <strong>Open-Meteo</strong></li>
        <li>Niveau de confidentialité que tu choisis (privée / abonnés / publique)</li>
        <li>Notes libres</li>
      </ul>
      <h3>3.4 Données techniques</h3>
      <ul>
        <li>Adresse IP (conservée 13 mois max)</li>
        <li>Type de navigateur, système d’exploitation, langue</li>
        <li>Pages visitées et timestamps</li>
        <li>Identifiants de session (cookies strictement nécessaires)</li>
      </ul>
      <p>
        Nous utilisons <strong>PostHog</strong> pour la <strong>mesure d’audience anonymisée</strong>
        du site (pages vues, parcours, événements d’usage agrégés), uniquement{' '}
        <strong>sous réserve de ton consentement</strong> recueilli via le bandeau affiché à ta
        première visite. Tant que tu n’as pas accepté, aucune mesure n’est effectuée. L’hébergement
        des données PostHog est situé dans l’<strong>Union européenne</strong>. Aucune donnée
        directement identifiante (email, nom) ni position GPS n’est transmise à cet outil. Tu peux
        retirer ton consentement à tout moment (voir section <a href="#cookies">10. Cookies</a>).
      </p>
      <h3>3.5 Données de paiement</h3>
      <p>
        Lorsque tu souscris à un abonnement Local ou Itinérant (paiement par carte bancaire via
        notre prestataire Stripe) : email de facturation, informations relatives à la souscription
        (plan, dates, statut). Les données de carte bancaire <strong>ne transitent JAMAIS</strong>{' '}
        par nos serveurs et ne sont jamais stockées chez nous : elles sont collectées et traitées
        exclusivement par <strong>Stripe</strong>, prestataire conforme PCI-DSS Niveau 1.
      </p>

      <h2 id="finalites">4. Finalités et bases légales</h2>
      <table>
        <thead>
          <tr><th>Finalité</th><th>Données utilisées</th><th>Base légale</th></tr>
        </thead>
        <tbody>
          <tr><td>Création et gestion du compte</td><td>Inscription, profil</td><td>Exécution du contrat (CGU)</td></tr>
          <tr><td>Affichage du carnet personnel</td><td>Prises, photos, conditions</td><td>Exécution du contrat</td></tr>
          <tr><td>Calcul du scoring personnalisé</td><td>Prises, historique</td><td>Intérêt légitime + exécution du contrat</td></tr>
          <tr><td>Affichage des prises publiques (fil régional)</td><td>Prises publiques, géolocalisation floutée de plusieurs centaines de mètres</td><td>Consentement</td></tr>
          <tr><td>Communication par email (confirmation, reset, notifications)</td><td>Email</td><td>Exécution du contrat</td></tr>
          <tr><td>Facturation et gestion de l’abonnement</td><td>Données paiement (via Stripe)</td><td>Exécution du contrat</td></tr>
          <tr><td>Modération et signalement</td><td>Tous types de contenus</td><td>Intérêt légitime</td></tr>
          <tr><td>Sécurité, prévention de la fraude</td><td>Adresse IP, logs</td><td>Intérêt légitime</td></tr>
          <tr><td>Respect des obligations légales (comptable, fiscale)</td><td>Données de facturation</td><td>Obligation légale</td></tr>
        </tbody>
      </table>

      <h2 id="destinataires">5. Destinataires des données</h2>
      <h3>5.1 Sous-traitants techniques</h3>
      <table>
        <thead>
          <tr><th>Sous-traitant</th><th>Rôle</th><th>Localisation</th></tr>
        </thead>
        <tbody>
          <tr><td><strong>Supabase Inc.</strong></td><td>Base de données, authentification, stockage photos</td><td>eu-west-1 (Dublin, Irlande, UE)</td></tr>
          <tr><td><strong>Vercel Inc.</strong></td><td>Hébergement du site et exécution du code</td><td>USA (SCC, DPA disponible)</td></tr>
          <tr><td><strong>Open-Meteo</strong></td><td>Conditions météo, marines, solunaires</td><td>Allemagne (UE), données anonymes</td></tr>
          <tr><td><strong>Stripe Inc.</strong></td><td>Traitement des paiements</td><td>USA + UE (SCC, PCI-DSS N1)</td></tr>
          <tr><td><strong>Resend Inc.</strong> (à venir)</td><td>Emails transactionnels</td><td>USA (SCC, DPA disponible)</td></tr>
          <tr><td><strong>PostHog</strong></td><td>Mesure d’audience anonymisée (sous consentement)</td><td>Union européenne</td></tr>
        </tbody>
      </table>
      <h3>5.2 Pas de revente, pas de publicité</h3>
      <p>
        Nous ne vendons, ne louons et ne partageons jamais tes données avec des tiers à des fins de
        prospection commerciale. Aucune publicité tierce n’est diffusée sur le site.
      </p>
      <h3>5.3 Visibilité par les autres utilisateurs</h3>
      <ul>
        <li><strong>Données toujours publiques</strong> : pseudo, avatar, bio, ville/département (sur ton profil public)</li>
        <li><strong>Données dépendantes de tes choix</strong> : prises (privée / abonnés / publique), géolocalisation (précise / floutée de plusieurs centaines de mètres)</li>
      </ul>

      <h2 id="transferts">6. Transferts hors Union Européenne</h2>
      <p>
        Certains de nos sous-traitants sont basés hors UE (Vercel, Stripe). Ces transferts
        sont encadrés par les <strong>Clauses Contractuelles Types (SCC)</strong> de la Commission
        européenne, conformément à l’article 46 du RGPD. Tu peux demander une copie des garanties
        applicables en contactant <a href="mailto:contact@carnet-de-peche.com">contact@carnet-de-peche.com</a>.
      </p>

      <h2 id="conservation">7. Durée de conservation</h2>
      <table>
        <thead>
          <tr><th>Type de donnée</th><th>Durée de conservation</th></tr>
        </thead>
        <tbody>
          <tr><td>Compte actif (toutes données)</td><td>Tant que ton compte existe</td></tr>
          <tr><td>Compte supprimé</td><td>Effacement immédiat des données identifiantes ; logs anonymisés 13 mois max</td></tr>
          <tr><td>Données de facturation</td><td>10 ans (article L102 B du Livre des procédures fiscales)</td></tr>
          <tr><td>Données de connexion (IP, logs)</td><td>13 mois (article L34-1 du CPCE)</td></tr>
          <tr><td>Cookies de session</td><td>Durée de la session (effacés à la déconnexion)</td></tr>
        </tbody>
      </table>
      <p>
        Tu peux supprimer ton compte à tout moment depuis <strong>/profil</strong>. La suppression
        est irréversible et effective immédiatement.
      </p>

      <h2 id="droits">8. Tes droits</h2>
      <p>Conformément aux articles 15 à 22 du RGPD, tu disposes des droits suivants :</p>
      <table>
        <thead>
          <tr><th>Droit</th><th>Comment l’exercer</th></tr>
        </thead>
        <tbody>
          <tr><td><strong>Accès</strong></td><td>Demande à contact@carnet-de-peche.com</td></tr>
          <tr><td><strong>Rectification</strong></td><td>Modifie depuis /profil ou demande par email</td></tr>
          <tr><td><strong>Effacement</strong> (droit à l’oubli)</td><td>Suppression du compte sur /profil — immédiat et irréversible</td></tr>
          <tr><td><strong>Limitation</strong> du traitement</td><td>Demande à contact@carnet-de-peche.com</td></tr>
          <tr><td><strong>Portabilité</strong> (format JSON)</td><td>Demande par email (réponse sous 30 jours)</td></tr>
          <tr><td><strong>Opposition</strong></td><td>Demande à contact@carnet-de-peche.com</td></tr>
          <tr><td><strong>Retrait du consentement</strong></td><td>Paramètres de confidentialité ou demande par email</td></tr>
          <tr><td><strong>Réclamation CNIL</strong></td><td><a href="https://www.cnil.fr" target="_blank" rel="noopener noreferrer">www.cnil.fr</a> — 3 Place de Fontenoy, TSA 80715, 75334 PARIS CEDEX 07</td></tr>
        </tbody>
      </table>
      <p>
        Tu disposes également du <strong>droit de définir des directives</strong> relatives à la
        conservation, à l’effacement et à la communication de tes données après ton décès (article 85
        de la loi du 6 janvier 1978).
      </p>

      <h2 id="securite">9. Sécurité</h2>
      <p>Nous mettons en œuvre des mesures techniques et organisationnelles pour protéger tes données :</p>
      <ul>
        <li>Chiffrement TLS/HTTPS de toutes les communications</li>
        <li>Mots de passe hashés (bcrypt), jamais stockés en clair</li>
        <li>Politiques d’accès strictes (Row Level Security Supabase) : chacun n’accède qu’à ses propres données + les contenus publics autorisés</li>
        <li>Sauvegardes automatiques quotidiennes de la base de données (rétention 7 jours)</li>
        <li>Accès au panneau d’administration limité au responsable du traitement</li>
      </ul>
      <p>
        En cas de violation de données affectant tes données personnelles, nous nous engageons à
        notifier la CNIL dans les 72 heures et à t’informer directement si la violation est
        susceptible d’engendrer un risque élevé pour tes droits et libertés (articles 33-34 RGPD).
      </p>

      <h2 id="cookies">10. Cookies</h2>
      <p>Le site utilise uniquement les cookies suivants :</p>
      <table>
        <thead>
          <tr><th>Cookie</th><th>Type</th><th>Finalité</th><th>Durée</th></tr>
        </thead>
        <tbody>
          <tr><td><code>sb-*</code> (Supabase Auth)</td><td>Strictement nécessaire</td><td>Maintenir ta session connectée</td><td>7 jours</td></tr>
          <tr><td>Préférences (filtres carte…)</td><td>Strictement nécessaire</td><td>Mémoriser tes choix d’interface</td><td>Session</td></tr>
          <tr><td><code>cdp-analytics-consent</code></td><td>Strictement nécessaire</td><td>Mémoriser ton choix d’accepter ou refuser la mesure d’audience</td><td>6 mois</td></tr>
          <tr><td><code>ph_*</code> (PostHog)</td><td>Mesure d’audience</td><td>Mesurer l’usage du site de façon anonymisée (base légale : consentement)</td><td>13 mois max</td></tr>
        </tbody>
      </table>
      <p>
        Les cookies <strong>strictement nécessaires</strong> au fonctionnement du site (session,
        préférences, mémorisation de ton choix de consentement) sont déposés sans consentement
        préalable (article 82 de la loi Informatique et Libertés). Le cookie de{' '}
        <strong>mesure d’audience PostHog</strong> n’est déposé <strong>qu’après ton consentement
        explicite</strong> via le bandeau affiché à ta première visite ; si tu refuses (ou tant que
        tu n’as pas tranché), aucune mesure n’est effectuée. Tu peux retirer ton consentement à tout
        moment en supprimant le cookie <code>cdp-analytics-consent</code> via les paramètres de ton
        navigateur (le bandeau réapparaîtra) ou en nous écrivant. Aucun cookie publicitaire tiers
        n’est jamais déposé.
      </p>

      <h2 id="modification">11. Modification de la politique</h2>
      <p>
        Cette politique peut évoluer en fonction des changements légaux, techniques ou fonctionnels
        du service. Toute modification substantielle sera notifiée par email aux utilisateurs
        inscrits <strong>au moins 30 jours avant</strong> son entrée en vigueur. La version
        applicable est toujours celle datée en bas de page.
      </p>

      <h2 id="contact">12. Contact</h2>
      <p>
        Pour toute question relative à la présente politique ou à tes données personnelles :{' '}
        <a href="mailto:contact@carnet-de-peche.com">contact@carnet-de-peche.com</a>.
      </p>
      <p>
        Nous nous engageons à répondre dans un délai maximum de <strong>30 jours</strong> à compter
        de la réception de ta demande, conformément à l’article 12 du RGPD.
      </p>
    </LegalLayout>
  )
}
