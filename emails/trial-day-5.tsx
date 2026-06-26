import * as React from "react";
import { EmailShell, CtaButton, Text, h1, paragraph, BRAND, SITE_URL } from "./components";

type Props = {
  firstName?: string;
  daysLeft?: number;
  amount?: string;
  dateLabel?: string;
};

// Sujet : "Plus que 2 jours d'essai — toujours partant ?"
export default function TrialDay5Email({
  firstName = "pêcheur",
  daysLeft = 2,
  amount = "4,90 €",
  dateLabel = "28 mai",
}: Props) {
  return (
    <EmailShell preview={`Plus que ${daysLeft} jours d'essai`}>
      <Text style={h1}>Toujours partant, {firstName} ?</Text>
      <Text style={paragraph}>
        Il te reste <strong>{daysLeft} jour{daysLeft > 1 ? "s" : ""}</strong> d&rsquo;essai. À la
        fin, tu seras prélevé(e) de <strong>{amount}</strong> le {dateLabel}.
      </Text>
      <Text style={paragraph}>
        Si l&rsquo;app t&rsquo;a convaincu, tu n&rsquo;as rien à faire. Sinon, tu peux annuler en 1
        clic : aucune charge ne sera appliquée.
      </Text>
      <Text style={{ ...paragraph, marginBottom: "24px" }}>Tu gardes la main, toujours.</Text>
      <CtaButton href={`${SITE_URL}/compte/abonnement`} label="Gérer mon essai" />
      <Text style={{ fontSize: "13px", color: BRAND.inkSoft, margin: "20px 0 0" }}>
        Annulation immédiate via le Customer Portal, accessible depuis ton abonnement.
      </Text>
    </EmailShell>
  );
}

TrialDay5Email.PreviewProps = {
  firstName: "Julien",
  daysLeft: 2,
  amount: "4,90 €",
  dateLabel: "28 mai",
} satisfies Props;
