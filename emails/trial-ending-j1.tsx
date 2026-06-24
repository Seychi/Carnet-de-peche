import * as React from "react";
import { EmailShell, CtaButton, Text, h1, paragraph, BRAND, SITE_URL } from "./components";

type Props = {
  firstName?: string;
  amount?: string;
  dateLabel?: string;
};

// TRANSACTIONNEL (J-1) — « ton essai se termine demain ». Base légale = exécution
// du contrat : on prévient avant le premier prélèvement. PAS d'opt-out, pas de
// lien de désinscription (ce n'est pas du marketing).
// Sujet : "Ton essai se termine demain"
export default function TrialEndingJ1Email({
  firstName = "pêcheur",
  amount = "4,90 €",
  dateLabel = "demain",
}: Props) {
  return (
    <EmailShell preview="Ton essai se termine demain">
      <Text style={h1}>C&rsquo;est demain, {firstName}</Text>
      <Text style={paragraph}>
        Ton essai gratuit se termine <strong>demain</strong>. Sauf annulation de ta part, tu seras
        prélevé(e) de <strong>{amount}</strong> le {dateLabel}, et ton accès complet continue sans
        coupure.
      </Text>
      <Text style={paragraph}>
        Si l&rsquo;app t&rsquo;a convaincu, tu n&rsquo;as rien à faire. Sinon, tu peux annuler en 1
        clic — aucune charge ne sera appliquée.
      </Text>
      <Text style={{ ...paragraph, marginBottom: "24px" }}>Tu gardes la main, toujours.</Text>
      <CtaButton href={`${SITE_URL}/compte/abonnement`} label="Gérer mon essai" />
      <Text style={{ fontSize: "13px", color: BRAND.inkSoft, margin: "20px 0 0" }}>
        Annulation immédiate via le Customer Portal, accessible depuis ton abonnement.
      </Text>
    </EmailShell>
  );
}

TrialEndingJ1Email.PreviewProps = {
  firstName: "Julien",
  amount: "4,90 €",
  dateLabel: "28 mai",
} satisfies Props;
