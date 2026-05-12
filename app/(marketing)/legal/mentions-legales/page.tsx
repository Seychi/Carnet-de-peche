import type { Metadata } from 'next'
import { LegalLayout } from '@/components/layout/LegalLayout'

export const metadata: Metadata = {
  title: 'Mentions légales — Carnet de Pêche',
  description: 'Mentions légales du site Carnet de Pêche, conformément à la loi pour la confiance dans l\'économie numérique (LCEN).',
  robots: { index: true, follow: true },
}

const toc = [
  { id: 'editeur', label: 'Éditeur du site' },
  { id: 'directeur-publication', label: 'Directeur de publication' },
  { id: 'hebergement', label: 'Hébergement' },
  { id: 'propriete-intellectuelle', label: 'Propriété intellectuelle' },
  { id: 'responsabilite', label: 'Limitation de responsabilité' },
  { id: 'reglementation-peche', label: 'Réglementation de la pêche' },
  { id: 'contact', label: 'Contact' },
]

export default function MentionsLegalesPage() {
  return (
    <LegalLayout
      title="Mentions légales"
      lastUpdated="mai 2026"
      toc={toc}
    >
      <h2 id="editeur">Éditeur du site</h2>
      <p>
        Le site <strong>carnet-de-peche.com</strong> est édité par :
      </p>
      <ul>
        <li><strong>Dénomination sociale</strong> : [À COMPLÉTER PAR JOHN — ex. : Carnet de Pêche SAS / EI John Dupont]</li>
        <li><strong>Forme juridique</strong> : [À COMPLÉTER — EI / SASU / SAS]</li>
        <li><strong>Numéro SIRET</strong> : [À COMPLÉTER]</li>
        <li><strong>Adresse du siège social</strong> : [À COMPLÉTER — adresse postale complète]</li>
        <li><strong>Adresse email</strong> : contact@carnet-de-peche.com</li>
        <li><strong>Numéro de TVA intracommunautaire</strong> : [À COMPLÉTER si applicable]</li>
      </ul>

      <h2 id="directeur-publication">Directeur de publication</h2>
      <p>
        Le directeur de la publication est <strong>[À COMPLÉTER — Prénom Nom]</strong>, en sa qualité de représentant légal de la société éditrice.
      </p>

      <h2 id="hebergement">Hébergement</h2>
      <h3>Hébergement web (frontend)</h3>
      <ul>
        <li><strong>Société</strong> : Vercel Inc.</li>
        <li><strong>Adresse</strong> : 340 S Lemon Ave #4133, Walnut, CA 91789, États-Unis</li>
        <li><strong>Site web</strong> : <a href="https://vercel.com" target="_blank" rel="noopener noreferrer">vercel.com</a></li>
      </ul>

      <h3>Hébergement base de données</h3>
      <ul>
        <li><strong>Société</strong> : Supabase Inc.</li>
        <li><strong>Adresse</strong> : 970 Toa Payoh North #07-04, Singapore 318992</li>
        <li><strong>Région de stockage des données</strong> : eu-west-3 (Frankfurt, Allemagne, Union européenne)</li>
        <li><strong>Site web</strong> : <a href="https://supabase.com" target="_blank" rel="noopener noreferrer">supabase.com</a></li>
      </ul>

      <h3>Service d'envoi d'emails transactionnels</h3>
      <ul>
        <li><strong>Société</strong> : Resend Inc.</li>
        <li><strong>Adresse</strong> : 2261 Market Street #5039, San Francisco, CA 94114, États-Unis</li>
        <li><strong>Site web</strong> : <a href="https://resend.com" target="_blank" rel="noopener noreferrer">resend.com</a></li>
      </ul>

      <h2 id="propriete-intellectuelle">Propriété intellectuelle</h2>
      <p>
        L'ensemble des éléments constituant le site Carnet de Pêche (structure, textes, graphismes, logiciels, images, sons, vidéos, base de données, etc.) est la propriété exclusive de l'éditeur ou fait l'objet d'une autorisation d'utilisation.
      </p>
      <p>
        Toute reproduction, représentation, modification, publication ou adaptation, totale ou partielle, de ces éléments, quel que soit le moyen ou le procédé utilisé, est interdite sans l'autorisation préalable et écrite de l'éditeur, sous peine de poursuites judiciaires.
      </p>
      <p>
        Les contenus publiés par les utilisateurs (prises loguées, photos, posts du fil régional) restent la propriété de leurs auteurs. En publiant du contenu sur Carnet de Pêche, l'utilisateur concède à l'éditeur une licence non-exclusive d'affichage, conformément aux <a href="/legal/cgu">Conditions Générales d'Utilisation</a>.
      </p>

      <h2 id="responsabilite">Limitation de responsabilité</h2>
      <p>
        L'éditeur s'efforce d'assurer l'exactitude et la mise à jour des informations diffusées sur ce site. Toutefois, il ne peut garantir l'exactitude, la précision, l'exhaustivité ou la pertinence de ces informations.
      </p>
      <p>
        Les informations relatives aux spots de pêche, aux espèces, aux conditions météorologiques et aux marées sont fournies à titre indicatif, sur la base des données communautaires et de services tiers (Open-Meteo). L'éditeur ne saurait être tenu responsable des décisions prises par les utilisateurs sur la base de ces informations.
      </p>
      <p>
        L'éditeur ne peut être tenu responsable des dommages directs ou indirects résultant de l'accès ou de l'utilisation du site, ni d'une éventuelle indisponibilité du service.
      </p>

      <h2 id="reglementation-peche">Réglementation de la pêche</h2>
      <p>
        Carnet de Pêche est un outil numérique d'aide à la pratique de la pêche récréative. L'utilisation du service est subordonnée au respect de la réglementation française en vigueur, notamment :
      </p>
      <ul>
        <li>Les tailles minimales de capture par espèce</li>
        <li>Les périodes de fermeture et d'ouverture de la pêche</li>
        <li>Les quotas journaliers et les limites de captures autorisées</li>
        <li>Les zones de pêche réglementées ou interdites</li>
        <li>L'obligation de détenir les autorisations requises (permis, adhésion fédérale le cas échéant)</li>
      </ul>
      <p>
        L'éditeur décline toute responsabilité en cas de non-respect par les utilisateurs de la réglementation applicable. Il appartient à chaque pêcheur de se renseigner auprès des autorités compétentes (DPMA, DDTM, fédérations de pêche) avant toute sortie.
      </p>

      <h2 id="contact">Contact</h2>
      <p>
        Pour toute question relative aux présentes mentions légales, tu peux nous contacter à l'adresse suivante :{' '}
        <a href="mailto:contact@carnet-de-peche.com">contact@carnet-de-peche.com</a>
      </p>
    </LegalLayout>
  )
}
