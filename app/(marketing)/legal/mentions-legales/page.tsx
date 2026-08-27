import type { Metadata } from 'next'
import { LegalLayout } from '@/components/layout/LegalLayout'

export const metadata: Metadata = {
  // Sprint 90 : URL canonique absolue. Ces quatre pages publiques n'en avaient
  // aucune, et le rapport de couverture du 23/08 comptait 17 pages « en double
  // sans URL canonique selectionnee par l'utilisateur ». `metadataBase` est pose
  // dans app/layout.tsx, donc un chemin relatif suffirait, mais on ecrit l'URL
  // entiere comme le fait deja app/(marketing)/especes/[slug]/page.tsx.
  alternates: { canonical: 'https://www.carnet-de-peche.com/legal/mentions-legales' },
  title: 'Mentions légales — Carnet de Pêche',
  description: 'Mentions légales du site Carnet de Pêche, conformément à l’article 6-III de la loi pour la confiance dans l’économie numérique (LCEN).',
  robots: { index: true, follow: true },
}

const toc = [
  { id: 'editeur', label: 'Éditeur du site' },
  { id: 'hebergement', label: 'Hébergement' },
  { id: 'propriete-intellectuelle', label: 'Propriété intellectuelle' },
  { id: 'donnees-personnelles', label: 'Données personnelles' },
  { id: 'cookies', label: 'Cookies' },
  { id: 'responsabilite', label: 'Limitation de responsabilité' },
  { id: 'droit-applicable', label: 'Droit applicable' },
  { id: 'contact', label: 'Contact' },
]

export default function MentionsLegalesPage() {
  return (
    <LegalLayout
      title="Mentions légales"
      lastUpdated="21 mai 2026"
      toc={toc}
    >
      <h2 id="editeur">Éditeur du site</h2>
      <p>
        Le site <strong>www.carnet-de-peche.com</strong> est édité par :
      </p>
      <ul>
        <li><strong>John Sebastien CAMPBELL</strong>, Entrepreneur Individuel</li>
        <li><strong>Activité</strong> : développeur informatique (libérale non réglementée)</li>
        <li><strong>SIREN</strong> : 977 995 174</li>
        <li><strong>SIRET</strong> (établissement principal) : 977 995 174 00025</li>
        <li><strong>Code APE</strong> : 6201Z — Programmation informatique</li>
        <li><strong>Immatriculation au Registre National des Entreprises (RNE)</strong> : 24 avril 2024</li>
        <li><strong>Adresse de l’établissement</strong> : 627 Chemin des Impiniers, 06220 Vallauris, France</li>
        <li><strong>Email</strong> : <a href="mailto:contact@carnet-de-peche.com">contact@carnet-de-peche.com</a></li>
      </ul>
      <p>
        N° de TVA intracommunautaire : non applicable (franchise en base de TVA, article 293 B du CGI).
      </p>
      <p>
        <strong>Directeur de la publication</strong> : John Sebastien Campbell.
      </p>

      <h2 id="hebergement">Hébergement</h2>
      <p>Le site est hébergé par :</p>
      <ul>
        <li><strong>Vercel Inc.</strong></li>
        <li>440 N Barranca Avenue #4133, Covina, CA 91723, États-Unis</li>
        <li>Téléphone : +1 (559) 288-7060</li>
        <li><a href="https://vercel.com" target="_blank" rel="noopener noreferrer">vercel.com</a></li>
      </ul>
      <p>Le stockage des bases de données et fichiers est assuré par :</p>
      <ul>
        <li><strong>Supabase Inc.</strong></li>
        <li>970 Toa Payoh North #07-04, Singapour 318992</li>
        <li>Région d’hébergement des données : eu-west-3 (Paris, France)</li>
        <li><a href="https://supabase.com" target="_blank" rel="noopener noreferrer">supabase.com</a></li>
      </ul>

      <h2 id="propriete-intellectuelle">Propriété intellectuelle</h2>
      <p>
        Sauf mention contraire, l’ensemble des contenus présents sur le site (textes, illustrations,
        photographies, code source, logos, marque «&nbsp;Carnet de Pêche&nbsp;», architecture, design)
        sont la propriété exclusive de John Sebastien Campbell ou font l’objet d’une autorisation
        d’utilisation.
      </p>
      <p>
        Toute reproduction, représentation, modification, publication, adaptation ou exploitation de
        tout ou partie des éléments du site, par quelque procédé que ce soit, est interdite sans
        autorisation écrite préalable.
      </p>
      <p>
        Les contenus publiés par les utilisateurs (prises loguées, photos, commentaires, posts du fil
        régional) restent la propriété de leurs auteurs respectifs. En les publiant sur le site,
        l’utilisateur concède à John Sebastien Campbell une licence non exclusive d’utilisation à des
        fins de diffusion sur la plateforme, conformément aux{' '}
        <a href="/legal/cgu">Conditions Générales d’Utilisation</a>.
      </p>

      <h2 id="donnees-personnelles">Données personnelles</h2>
      <p>
        Le traitement des données personnelles est régi par notre{' '}
        <a href="/legal/confidentialite">Politique de confidentialité</a>, conforme au Règlement
        (UE) 2016/679 (RGPD) et à la loi Informatique et Libertés modifiée.
      </p>
      <p>
        Pour toute demande relative à tes données personnelles (accès, rectification, suppression,
        portabilité, opposition) : <a href="mailto:contact@carnet-de-peche.com">contact@carnet-de-peche.com</a>.
      </p>

      <h2 id="cookies">Cookies</h2>
      <p>
        Le site utilise uniquement des cookies strictement nécessaires à son fonctionnement (session
        d’authentification, préférences). Aucun cookie publicitaire ni de mesure d’audience tierce
        n’est déposé sans consentement préalable. Pour plus de détails, consulte notre{' '}
        <a href="/legal/confidentialite">Politique de confidentialité</a>.
      </p>

      <h2 id="responsabilite">Limitation de responsabilité</h2>
      <p>
        <strong>Pêche en mer : sécurité avant tout.</strong> Le site fournit des informations
        indicatives sur les conditions météo, marées, et les spots de pêche, à partir de sources
        tierces (Open-Meteo, données utilisateurs). Ces informations sont fournies à titre informatif
        et <strong>ne sauraient se substituer à ton propre jugement</strong> ni aux bulletins
        officiels (Météo-France, SHOM, CROSS) pour évaluer les conditions de sortie.
      </p>
      <p>
        La pêche du bord, notamment depuis les zones rocheuses et exposées, comporte des risques
        (vagues scélérates, ressac, marées, accès dangereux). Tu es seul responsable de l’évaluation
        de ces risques et de ta sécurité. John Sebastien Campbell ne pourra être tenu responsable
        d’aucun dommage corporel, matériel ou immatériel résultant de l’utilisation des informations
        diffusées sur le site.
      </p>
      <p>
        Les coordonnées GPS des spots sont fournies à titre indicatif. L’utilisateur reste
        responsable du respect des réglementations locales (tailles légales, quotas, périodes de
        pêche, zones interdites, autorisations communales).
      </p>

      <h2 id="droit-applicable">Droit applicable et juridiction compétente</h2>
      <p>
        Les présentes mentions légales sont régies par le <strong>droit français</strong>. Tout
        litige relatif au site relèvera de la compétence des tribunaux français.
      </p>

      <h2 id="contact">Contact</h2>
      <p>
        Pour toute question ou réclamation relative aux présentes mentions légales :{' '}
        <a href="mailto:contact@carnet-de-peche.com">contact@carnet-de-peche.com</a>.
      </p>
    </LegalLayout>
  )
}
