import type { Metadata } from 'next'
import { LegalLayout } from '@/components/layout/LegalLayout'

export const metadata: Metadata = {
  title: 'Politique de confidentialité — Carnet de Pêche',
  description: 'Comment Carnet de Pêche collecte, utilise et protège tes données personnelles. Conformité RGPD.',
  robots: { index: true, follow: true },
}

const toc = [
  { id: 'responsable', label: 'Responsable du traitement' },
  { id: 'donnees-collectees', label: 'Données collectées' },
  { id: 'finalites', label: 'Finalités du traitement' },
  { id: 'base-legale', label: 'Base légale' },
  { id: 'sous-traitants', label: 'Sous-traitants' },
  { id: 'conservation', label: 'Durée de conservation' },
  { id: 'droits', label: 'Tes droits' },
  { id: 'cookies', label: 'Cookies' },
  { id: 'cnil', label: 'Droit de plainte' },
]

export default function ConfidentialitePage() {
  return (
    <LegalLayout
      title="Politique de confidentialité"
      lastUpdated="mai 2026"
      toc={toc}
    >
      <p>
        Chez Carnet de Pêche, la protection de tes données personnelles est une priorité. Cette politique t'explique quelles données nous collectons, pourquoi, comment nous les utilisons, et quels sont tes droits.
      </p>

      <h2 id="responsable">Responsable du traitement</h2>
      <p>
        Le responsable du traitement des données personnelles collectées via le site <strong>carnet-de-peche.com</strong> est :
      </p>
      <ul>
        <li><strong>Dénomination</strong> : [À COMPLÉTER PAR JOHN]</li>
        <li><strong>Adresse</strong> : [À COMPLÉTER]</li>
        <li><strong>Email DPO / contact vie privée</strong> : contact@carnet-de-peche.com</li>
      </ul>
      <p>
        En phase de démarrage, le fondateur assume les fonctions de délégué à la protection des données (DPO de facto). Une désignation formelle sera effectuée si le volume de traitement le nécessite.
      </p>

      <h2 id="donnees-collectees">Données collectées</h2>
      <h3>Données d'identité et de profil</h3>
      <ul>
        <li>Adresse email (fournie à l'inscription)</li>
        <li>Pseudo (username) — public</li>
        <li>Ville et département principal de pêche</li>
        <li>Fréquence de pratique et années d'expérience</li>
        <li>Photo de profil (optionnelle)</li>
      </ul>

      <h3>Données de préférences</h3>
      <ul>
        <li>Espèces ciblées (bar, dorade, lieu jaune, maquereau, sar, orphie)</li>
        <li>Techniques pratiquées (leurres, surfcasting, flottante, vif)</li>
        <li>Niveau de pratique (débutant / intermédiaire / expert)</li>
      </ul>

      <h3>Contenus générés par l'utilisateur</h3>
      <ul>
        <li>Prises loguées dans le carnet : espèce, taille, poids, technique, date, heure, conditions</li>
        <li>Coordonnées GPS des prises (floutées d'environ 1 km par défaut avant tout partage public)</li>
        <li>Photos associées aux prises</li>
        <li>Posts publiés sur le fil régional, commentaires et réactions</li>
      </ul>

      <h3>Données techniques</h3>
      <ul>
        <li>Adresse IP (collectée par les serveurs d'hébergement, non stockée dans notre base)</li>
        <li>User-agent du navigateur ou de l'application mobile</li>
        <li>Token de session Supabase Auth (stocké dans un cookie HttpOnly sécurisé)</li>
        <li>Données d'analytics anonymisées via Plausible (voir section Cookies)</li>
      </ul>

      <h2 id="finalites">Finalités du traitement</h2>
      <ul>
        <li><strong>Fourniture du service</strong> : gestion du compte, carnet de pêche, carte, fil régional</li>
        <li><strong>Personnalisation</strong> : adapter les suggestions de spots et les contenus éditoriaux à tes préférences</li>
        <li><strong>Communications transactionnelles</strong> : emails de confirmation d'inscription, réinitialisation de mot de passe, notifications de service</li>
        <li><strong>Modération du contenu</strong> : prévenir les abus, le spam et les contenus illicites</li>
        <li><strong>Amélioration du produit</strong> : analyser les usages de manière agrégée et anonymisée</li>
        <li><strong>Sécurité</strong> : détecter les tentatives de fraude ou d'accès non autorisé</li>
      </ul>
      <p>
        Nous <strong>n'envoyons jamais d'emails marketing</strong> sans que tu aies donné ton consentement explicite et séparé via une case à cocher dédiée. Ce consentement n'est pas demandé lors de l'inscription.
      </p>

      <h2 id="base-legale">Base légale des traitements</h2>
      <ul>
        <li><strong>Exécution du contrat</strong> (art. 6.1.b RGPD) : toutes les données nécessaires au fonctionnement du service — compte, carnet, carte, profil.</li>
        <li><strong>Intérêt légitime</strong> (art. 6.1.f RGPD) : modération anti-spam, sécurité du service, analytics agrégées.</li>
        <li><strong>Consentement</strong> (art. 6.1.a RGPD) : notifications push, communications marketing futures, géolocalisation précise si l'utilisateur l'autorise explicitement.</li>
      </ul>

      <h2 id="sous-traitants">Sous-traitants et transferts</h2>
      <p>
        Nous faisons appel aux sous-traitants suivants. Tous ont été sélectionnés pour leur niveau de conformité RGPD.
      </p>
      <ul>
        <li>
          <strong>Supabase</strong> — base de données PostgreSQL hébergée en région <strong>eu-west-3 (Frankfurt, UE)</strong>. Pas de transfert hors UE pour les données utilisateurs. <a href="https://supabase.com/privacy" target="_blank" rel="noopener noreferrer">Politique de confidentialité</a>
        </li>
        <li>
          <strong>Vercel</strong> — hébergement du frontend, serveurs edge aux États-Unis. Transfert encadré par des <strong>clauses contractuelles types (CCT)</strong> de la Commission européenne. <a href="https://vercel.com/legal/privacy-policy" target="_blank" rel="noopener noreferrer">Politique de confidentialité</a>
        </li>
        <li>
          <strong>Resend</strong> — envoi des emails transactionnels. Serveurs aux États-Unis, transfert encadré par CCT. <a href="https://resend.com/legal/privacy-policy" target="_blank" rel="noopener noreferrer">Politique de confidentialité</a>
        </li>
        <li>
          <strong>Open-Meteo</strong> — API météo et conditions marines publique. Aucune donnée personnelle transmise (appels depuis le serveur, sans identification utilisateur).
        </li>
        <li>
          <strong>Plausible Analytics</strong> — analytics web anonymisées, sans cookies, sans empreinte digitale, hébergé en UE. <a href="https://plausible.io/privacy" target="_blank" rel="noopener noreferrer">Politique de confidentialité</a>
        </li>
      </ul>

      <h2 id="conservation">Durée de conservation</h2>
      <ul>
        <li><strong>Compte actif</strong> : données conservées tant que le compte est actif.</li>
        <li><strong>Compte inactif</strong> : après <strong>3 ans d'inactivité</strong>, un email d'avertissement est envoyé. Sans réponse sous 30 jours, le compte et l'ensemble des données associées sont supprimés.</li>
        <li><strong>Suppression du compte</strong> : toutes les données personnelles identifiables sont supprimées dans un délai de <strong>30 jours</strong> suivant la demande. Les données agrégées et anonymisées peuvent être conservées à des fins statistiques.</li>
        <li><strong>Sauvegardes</strong> : les sauvegardes automatiques sont conservées <strong>30 jours glissants</strong>, puis purgées.</li>
        <li><strong>Données comptables et financières</strong> (abonnements Stripe) : conservées <strong>10 ans</strong> conformément aux obligations légales françaises.</li>
      </ul>

      <h2 id="droits">Tes droits</h2>
      <p>
        Conformément au RGPD (articles 15 à 22) et à la loi Informatique et Libertés, tu disposes des droits suivants sur tes données :
      </p>
      <ul>
        <li><strong>Droit d'accès</strong> : obtenir une copie de toutes les données que nous détenons sur toi.</li>
        <li><strong>Droit de rectification</strong> : corriger des données inexactes ou incomplètes.</li>
        <li><strong>Droit à l'effacement</strong> ("droit à l'oubli") : demander la suppression de tes données — disponible directement depuis ton profil.</li>
        <li><strong>Droit à la portabilité</strong> : recevoir tes données dans un format structuré et lisible par machine (JSON).</li>
        <li><strong>Droit d'opposition</strong> : t'opposer à un traitement fondé sur l'intérêt légitime.</li>
        <li><strong>Droit à la limitation</strong> : demander la suspension temporaire d'un traitement.</li>
        <li><strong>Retrait du consentement</strong> : à tout moment, sans frais, pour les traitements fondés sur le consentement.</li>
      </ul>
      <p>
        Pour exercer ces droits, écris-nous à{' '}
        <a href="mailto:contact@carnet-de-peche.com">contact@carnet-de-peche.com</a>.
        Nous répondrons dans un délai maximum de <strong>30 jours</strong>.
      </p>

      <h2 id="cookies">Cookies et traceurs</h2>
      <p>
        Nous utilisons uniquement des cookies strictement nécessaires au fonctionnement du service :
      </p>
      <ul>
        <li>
          <strong>Cookie de session Supabase</strong> : authentification et maintien de la session. Technique, indispensable, exempté de consentement CNIL.
        </li>
        <li>
          <strong>Plausible Analytics</strong> : mesure d'audience anonymisée, sans cookie, sans collecte d'adresse IP, sans empreinte. Conforme à la recommandation CNIL du 19 juin 2021 — <strong>exempté de bandeau de consentement</strong>.
        </li>
      </ul>
      <p>
        Nous n'utilisons <strong>aucun cookie publicitaire</strong>, aucun pixel de tracking tiers (Meta, Google Ads), aucun outil de fingerprinting.
      </p>

      <h2 id="cnil">Droit de plainte auprès de la CNIL</h2>
      <p>
        Si tu estimes que le traitement de tes données ne respecte pas la réglementation, tu as le droit d'introduire une réclamation auprès de la <strong>Commission Nationale de l'Informatique et des Libertés (CNIL)</strong> :
      </p>
      <ul>
        <li>En ligne : <a href="https://www.cnil.fr/fr/plaintes" target="_blank" rel="noopener noreferrer">cnil.fr/fr/plaintes</a></li>
        <li>Par courrier : CNIL, 3 Place de Fontenoy, TSA 80715, 75334 Paris Cedex 07</li>
      </ul>
    </LegalLayout>
  )
}
