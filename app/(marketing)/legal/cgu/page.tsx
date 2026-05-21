import type { Metadata } from 'next'
import { LegalLayout } from '@/components/layout/LegalLayout'

export const metadata: Metadata = {
  title: 'Conditions générales d’utilisation — Carnet de Pêche',
  description: 'Conditions générales d’utilisation du service Carnet de Pêche : objet, abonnements, contenu utilisateur, charte communautaire, responsabilités.',
  robots: { index: true, follow: true },
}

const toc = [
  { id: 'objet', label: 'Article 1 — Objet' },
  { id: 'editeur', label: 'Article 2 — Éditeur' },
  { id: 'definitions', label: 'Article 3 — Définitions' },
  { id: 'acces', label: 'Article 4 — Accès au service' },
  { id: 'abonnement', label: 'Article 5 — Abonnements' },
  { id: 'contenu', label: 'Article 6 — Contenu utilisateur' },
  { id: 'charte', label: 'Article 7 — Charte communautaire' },
  { id: 'pi', label: 'Article 8 — Propriété intellectuelle' },
  { id: 'donnees', label: 'Article 9 — Données personnelles' },
  { id: 'responsabilite', label: 'Article 10 — Responsabilité' },
  { id: 'force-majeure', label: 'Article 11 — Force majeure' },
  { id: 'modification', label: 'Article 12 — Modification' },
  { id: 'resiliation', label: 'Article 13 — Résiliation' },
  { id: 'mediation', label: 'Article 14 — Médiation' },
  { id: 'droit', label: 'Article 15 — Droit applicable' },
  { id: 'acceptation', label: 'Article 16 — Acceptation' },
]

export default function CGUPage() {
  return (
    <LegalLayout
      title="Conditions Générales d’Utilisation"
      lastUpdated="21 mai 2026"
      toc={toc}
    >
      <h2 id="objet">Article 1 — Objet</h2>
      <p>
        Les présentes Conditions Générales d’Utilisation (ci-après «&nbsp;<strong>CGU</strong>&nbsp;»)
        régissent l’utilisation du site <strong>www.carnet-de-peche.com</strong> et des services qui
        y sont associés (ci-après le «&nbsp;<strong>Service</strong>&nbsp;»).
      </p>
      <p>Le Service permet aux utilisateurs (ci-après «&nbsp;toi&nbsp;» ou «&nbsp;l’utilisateur&nbsp;») de :</p>
      <ul>
        <li>Tenir un carnet de pêche personnel (prises, photos, conditions environnementales)</li>
        <li>Consulter une carte des spots de pêche à la canne du bord en France métropolitaine</li>
        <li>Accéder à des guides éditoriaux sur la pêche du bord</li>
        <li>Participer à une communauté de pêcheurs via un fil régional (à venir)</li>
        <li>S’abonner à des formules payantes pour débloquer des fonctionnalités avancées</li>
      </ul>
      <p>L’utilisation du Service implique l’acceptation pleine et entière des présentes CGU.</p>

      <h2 id="editeur">Article 2 — Éditeur du service</h2>
      <p>Le Service est édité par :</p>
      <ul>
        <li><strong>John Sebastien CAMPBELL</strong> (Entrepreneur Individuel)</li>
        <li>SIREN : 977 995 174</li>
        <li>Adresse : 627 Chemin des Impiniers, 06220 Vallauris, France</li>
        <li>Email : <a href="mailto:contact@carnet-de-peche.com">contact@carnet-de-peche.com</a></li>
      </ul>

      <h2 id="definitions">Article 3 — Définitions</h2>
      <ul>
        <li><strong>«&nbsp;Carnet de Pêche&nbsp;»</strong> : le service décrit à l’article 1, exploité sur www.carnet-de-peche.com.</li>
        <li><strong>«&nbsp;Compte&nbsp;»</strong> : l’espace personnel sécurisé accessible après inscription.</li>
        <li><strong>«&nbsp;Contenu Utilisateur&nbsp;»</strong> : toute donnée publiée par l’utilisateur (prises, photos, commentaires, posts).</li>
        <li><strong>«&nbsp;Plan&nbsp;»</strong> : formule d’abonnement (Découverte, Local, Itinérant).</li>
        <li><strong>«&nbsp;Spot&nbsp;»</strong> : point de pêche référencé sur la carte.</li>
      </ul>

      <h2 id="acces">Article 4 — Accès au service</h2>
      <h3>4.1 Conditions d’accès</h3>
      <p>
        Le Service est accessible 24h/24, 7j/7 (sous réserve des interruptions de maintenance ou de
        force majeure). L’inscription est ouverte à toute personne physique majeure résidant en
        France métropolitaine, capable juridiquement de contracter.
      </p>
      <h3>4.2 Inscription</h3>
      <p>L’inscription se fait en fournissant :</p>
      <ul>
        <li>Une adresse email valide</li>
        <li>Un mot de passe (au moins 8 caractères) OU une connexion via fournisseur tiers (Google, Apple)</li>
        <li>Les informations demandées lors de l’onboarding (pseudo, ville, niveau, techniques, espèces favorites)</li>
      </ul>
      <p>
        L’utilisateur s’engage à fournir des informations exactes et à jour. Il est seul responsable
        de la confidentialité de son mot de passe.
      </p>
      <h3>4.3 Comptes multiples</h3>
      <p>
        Il est interdit de créer plusieurs comptes pour une même personne physique sans accord exprès
        de l’éditeur.
      </p>

      <h2 id="abonnement">Article 5 — Formules d’abonnement</h2>
      <h3>5.1 Plans disponibles</h3>
      <table>
        <thead>
          <tr><th>Plan</th><th>Tarif</th><th>Périmètre</th></tr>
        </thead>
        <tbody>
          <tr><td><strong>Découverte</strong></td><td>Gratuit</td><td>Carnet illimité, carte basique (3 spots/dept floutés 1 km), guides, fil en lecture seule, 1 département</td></tr>
          <tr><td><strong>Local</strong></td><td>4,90 € / mois ou 49 € / an</td><td>Carte complète du département, coords précises, scores, filtres, fil en écriture</td></tr>
          <tr><td><strong>Itinérant</strong></td><td>9,90 € / mois ou 99 € / an</td><td>Tous les départements côtiers FR, fonctionnalités avancées</td></tr>
        </tbody>
      </table>
      <p>
        Les tarifs s’entendent toutes taxes comprises (TTC). En tant que micro-entrepreneur,
        l’éditeur bénéficie de la franchise en base de TVA (article 293 B du CGI) — la TVA n’est pas
        applicable.
      </p>
      <h3>5.2 Essai gratuit</h3>
      <p>
        Les plans Local et Itinérant donnent droit à un <strong>essai gratuit de 7 jours</strong>. À
        l’issue de la période d’essai, ton abonnement est automatiquement reconduit aux conditions de
        la formule choisie, sauf annulation préalable de ta part.
      </p>
      <h3>5.3 Paiement</h3>
      <p>
        À compter de l’activation des paiements, ceux-ci sont effectués par carte bancaire via notre
        prestataire <strong>Stripe</strong>. Les données bancaires ne transitent pas par nos
        serveurs. L’abonnement est automatiquement reconduit à échéance, pour la même durée et au
        même tarif, sauf résiliation préalable.
      </p>
      <h3>5.4 Garantie satisfait ou remboursé</h3>
      <p>
        Si tu n’es pas satisfait, tu peux <strong>demander le remboursement</strong> de ton premier
        paiement dans un délai de <strong>30 jours</strong> à compter de la date de facturation, par
        email à contact@carnet-de-peche.com. Le remboursement est intégral, sans question.
      </p>
      <h3>5.5 Annulation et résiliation</h3>
      <p>
        Tu peux annuler ton abonnement à tout moment, <strong>en un clic</strong>, depuis l’espace de
        gestion de ton compte ou par email à contact@carnet-de-peche.com. L’annulation prend effet à
        la fin de la période en cours (mois ou année). Tu conserves l’accès aux fonctionnalités
        payantes jusqu’à cette date.
      </p>
      <h3>5.6 Droit de rétractation</h3>
      <p>
        Conformément à l’article L221-28 1° du Code de la consommation, <strong>tu renonces
        expressément à ton droit de rétractation</strong> dès lors que tu commences à utiliser le
        Service pendant la période d’essai gratuite. Toutefois, la garantie satisfait ou remboursé
        décrite à l’article 5.4 te protège pendant 30 jours.
      </p>
      <h3>5.7 Modification des tarifs</h3>
      <p>
        Toute modification des tarifs sera notifiée par email <strong>au moins 30 jours avant</strong>{' '}
        son entrée en vigueur. Tu pourras résilier sans frais avant cette date si tu n’acceptes pas la
        nouvelle tarification.
      </p>

      <h2 id="contenu">Article 6 — Contenu Utilisateur</h2>
      <h3>6.1 Responsabilité de l’utilisateur</h3>
      <p>
        Tu es seul responsable du Contenu Utilisateur que tu publies (prises, photos, commentaires,
        posts). Tu garantis disposer de tous les droits nécessaires sur ce contenu (notamment droits
        d’auteur sur les photos), que ce contenu ne viole pas les droits de tiers, et qu’il respecte
        les lois en vigueur et la Charte communautaire (article 7).
      </p>
      <h3>6.2 Licence d’utilisation</h3>
      <p>
        En publiant du Contenu Utilisateur, tu concèdes à <strong>John Sebastien CAMPBELL</strong> une
        licence non exclusive, gratuite, mondiale, pour la durée des droits, à l’effet de : diffuser
        ce contenu selon le niveau de confidentialité que tu as choisi, le stocker et le sauvegarder,
        l’adapter techniquement (compression, redimensionnement, conversion de format). Cette licence
        prend fin lorsque tu supprimes le contenu ou ton compte. Tu conserves la pleine propriété
        intellectuelle de ton contenu.
      </p>
      <h3>6.3 Contenu interdit</h3>
      <p>Sont strictement interdits les contenus :</p>
      <ul>
        <li>Illégaux, diffamatoires, injurieux, racistes, sexistes, homophobes</li>
        <li>Violents, à caractère pornographique ou pédopornographique</li>
        <li>Faisant l’apologie de pratiques de pêche illégales (braconnage, espèces protégées, hors saison, sous-taille)</li>
        <li>Révélant intentionnellement les coordonnées précises d’un spot non public dans le but de nuire</li>
        <li>Constituant du spam, de la publicité non sollicitée, ou du démarchage</li>
        <li>Violant les droits d’auteur de tiers</li>
      </ul>
      <h3>6.4 Modération</h3>
      <p>
        L’éditeur se réserve le droit, sans préavis ni indemnité, de supprimer tout contenu non
        conforme, de suspendre ou supprimer le compte d’un utilisateur ayant commis des manquements
        répétés, et de signaler tout contenu illégal aux autorités compétentes. Tout utilisateur peut
        signaler un contenu inapproprié via le bouton «&nbsp;Signaler&nbsp;» présent sur chaque post
        ou prise publique.
      </p>

      <h2 id="charte">Article 7 — Charte communautaire</h2>
      <p>L’utilisation du Service implique le respect des règles suivantes :</p>
      <ul>
        <li><strong>Bienveillance</strong> : tutoiement assumé, respect des autres pêcheurs, pas de moqueries sur les techniques ou les prises</li>
        <li><strong>Anti spot-burning</strong> : tu ne révèles JAMAIS les coordonnées précises du spot d’un autre pêcheur sans son accord. Le floutage GPS à 1 km protège ce principe.</li>
        <li><strong>Pêche responsable</strong> : respect des tailles légales, quotas, périodes et zones réglementées</li>
        <li><strong>No-kill encouragé</strong> : tu peux signaler tes prises remises à l’eau</li>
        <li><strong>Pas de pub déguisée</strong> : pas de promotion commerciale sans accord préalable de l’éditeur</li>
        <li><strong>Français lisible</strong> : ce n’est pas un site international, on écrit en français lisible</li>
      </ul>
      <p>Tout manquement répété peut entraîner la suspension ou la suppression du compte.</p>

      <h2 id="pi">Article 8 — Propriété intellectuelle de l’éditeur</h2>
      <p>
        L’ensemble des éléments du Service (à l’exception du Contenu Utilisateur) — incluant sans
        limitation le code source, l’architecture, les bases de données, le design, la marque
        «&nbsp;Carnet de Pêche&nbsp;», les guides éditoriaux, les algorithmes de scoring — sont la
        propriété exclusive de John Sebastien CAMPBELL et sont protégés par le droit d’auteur, le
        droit des marques et le droit des bases de données.
      </p>
      <p>
        Toute reproduction, modification, exploitation, totale ou partielle, est interdite sans
        autorisation écrite préalable. L’utilisateur dispose d’un droit personnel, non exclusif et non
        transférable d’utilisation du Service, strictement limité à un usage personnel et non
        commercial.
      </p>

      <h2 id="donnees">Article 9 — Données personnelles</h2>
      <p>
        Le traitement de tes données personnelles est régi par notre{' '}
        <a href="/legal/confidentialite">Politique de confidentialité</a>, conforme au RGPD. Tu
        disposes notamment des droits d’accès, rectification, effacement, portabilité et opposition.
        Pour toute demande : <a href="mailto:contact@carnet-de-peche.com">contact@carnet-de-peche.com</a>.
      </p>

      <h2 id="responsabilite">Article 10 — Limitations de responsabilité</h2>
      <h3>10.1 Disponibilité du Service</h3>
      <p>
        L’éditeur s’efforce d’assurer la disponibilité du Service 24h/24 et 7j/7, mais ne peut être
        tenu responsable des interruptions liées à la maintenance, aux pannes des prestataires
        d’hébergement (Vercel, Supabase), à un cas de force majeure ou au comportement de
        l’utilisateur.
      </p>
      <h3>10.2 Données environnementales</h3>
      <p>
        Les conditions météorologiques, marines et solunaires proviennent de l’API{' '}
        <strong>Open-Meteo</strong> (sources publiques, modèles ECMWF/DWD). <strong>Ces données sont
        fournies à titre indicatif</strong> et ne sauraient se substituer aux bulletins officiels
        (Météo-France, SHOM, CROSS, capitaineries). L’éditeur ne garantit ni l’exactitude, ni
        l’exhaustivité, ni la disponibilité continue de ces données.
      </p>
      <h3>10.3 Sécurité de la pêche</h3>
      <p>
        <strong>La pêche du bord, notamment depuis les zones rocheuses et exposées, comporte des
        risques mortels</strong> : vagues scélérates, ressac, marées montantes, chutes, hypothermie.
        Tu reconnais être seul responsable de l’évaluation des conditions de sortie, du respect des
        consignes de sécurité, de ta connaissance des zones fréquentées et de ta santé physique pour
        pratiquer cette activité. L’éditeur <strong>décline toute responsabilité</strong> en cas
        d’accident, blessure ou décès survenant lors d’une sortie de pêche, quelles qu’en soient les
        circonstances.
      </p>
      <h3>10.4 Respect de la réglementation</h3>
      <p>
        Tu es seul responsable du respect des règles applicables à la pêche dans la zone où tu
        pratiques (tailles minimales, quotas, périodes d’ouverture/fermeture, zones interdites,
        autorisations communales et licences). Les informations relatives aux tailles ou quotas
        affichées sur le Service sont indicatives et peuvent ne pas refléter les évolutions
        réglementaires les plus récentes.
      </p>
      <h3>10.5 Contenu Utilisateur</h3>
      <p>
        L’éditeur n’exerce pas de contrôle a priori sur le Contenu Utilisateur et ne pourra être tenu
        responsable des informations, opinions ou photographies publiées par les utilisateurs.
      </p>
      <h3>10.6 Limitation globale</h3>
      <p>
        En tout état de cause, la responsabilité de l’éditeur, si elle devait être engagée, serait
        limitée au montant des sommes versées par l’utilisateur au titre de son abonnement sur les 12
        derniers mois, et au maximum à 100 € pour les utilisateurs en formule Découverte.
      </p>

      <h2 id="force-majeure">Article 11 — Force majeure</h2>
      <p>
        Aucune des parties ne pourra être tenue responsable d’un manquement à ses obligations
        résultant d’un cas de force majeure au sens de l’article 1218 du Code civil (catastrophe
        naturelle, pandémie, guerre, panne généralisée d’internet, etc.).
      </p>

      <h2 id="modification">Article 12 — Modification des CGU</h2>
      <p>
        L’éditeur se réserve le droit de modifier les présentes CGU à tout moment. Toute modification
        substantielle sera notifiée par email aux utilisateurs inscrits <strong>au moins 30 jours
        avant</strong> son entrée en vigueur. La poursuite de l’utilisation du Service après cette
        date vaut acceptation des nouvelles CGU. La version applicable est toujours celle datée en bas
        de page.
      </p>

      <h2 id="resiliation">Article 13 — Résiliation</h2>
      <h3>13.1 Par l’utilisateur</h3>
      <p>
        Tu peux résilier ton compte à tout moment depuis <strong>/profil</strong>, ou par email à
        contact@carnet-de-peche.com. La résiliation est immédiate et irréversible.
      </p>
      <h3>13.2 Par l’éditeur</h3>
      <p>
        L’éditeur peut suspendre ou résilier ton compte sans préavis ni indemnité en cas de manquement
        grave ou répété aux CGU ou à la Charte, de comportement nuisible à la communauté, de tentative
        de fraude, ou d’inactivité prolongée (≥ 24 mois consécutifs). En cas de résiliation pour
        faute, les sommes versées ne sont pas remboursées.
      </p>

      <h2 id="mediation">Article 14 — Médiation et droit de la consommation</h2>
      <p>
        Conformément à l’article L612-1 du Code de la consommation, en cas de litige et après une
        réclamation préalable infructueuse auprès de l’éditeur (contact@carnet-de-peche.com), tu peux
        saisir gratuitement un médiateur de la consommation. Le médiateur compétent sera désigné par
        l’éditeur au plus tard lors de l’activation des abonnements payants, et mentionné ici.
      </p>
      <p>
        Tu peux également utiliser la plateforme européenne de Règlement en Ligne des Litiges (RLL) :{' '}
        <a href="https://ec.europa.eu/consumers/odr/" target="_blank" rel="noopener noreferrer">ec.europa.eu/consumers/odr</a>.
      </p>

      <h2 id="droit">Article 15 — Droit applicable et juridiction</h2>
      <p>
        Les présentes CGU sont régies par le <strong>droit français</strong>. En cas de litige, et à
        défaut de résolution amiable, les tribunaux français seront seuls compétents.
      </p>
      <p>
        Pour les utilisateurs ayant la qualité de consommateur, la juridiction compétente est, au
        choix de l’utilisateur, celle du lieu où il demeurait au moment de la conclusion du contrat,
        ou du lieu de survenance du fait dommageable (article R631-3 du Code de la consommation).
      </p>

      <h2 id="acceptation">Article 16 — Acceptation</h2>
      <p>L’inscription au Service vaut acceptation pleine et entière des présentes CGU.</p>
    </LegalLayout>
  )
}
