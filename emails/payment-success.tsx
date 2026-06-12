import * as React from "react";
import { EmailShell, CtaButton, Text, h1, paragraph, BRAND, SITE_URL } from "./components";

type Props = {
  firstName?: string;
  amount?: string;
  dateLabel?: string;
};

// Sujet : "Paiement reçu — bonne pêche 🎣"
// Envoyé sur invoice.payment_succeeded quand amount_paid > 0 (les factures à
// 0 € du début d'essai n'envoient rien — le welcome-trial couvre ce moment).
export default function PaymentSuccessEmail({
  firstName = "pêcheur",
  amount = "4,90 €",
  dateLabel = "12 juin 2026",
}: Props) {
  return (
    <EmailShell preview={`Paiement de ${amount} bien reçu`}>
      <Text style={h1}>Paiement reçu, merci {firstName}</Text>
      <Text style={paragraph}>
        On a bien encaissé <strong>{amount}</strong> le {dateLabel}. Ton accès continue sans
        interruption : carte complète, GPS précis, score d&rsquo;activité.
      </Text>
      <Text style={{ ...paragraph, marginBottom: "24px" }}>
        La facture détaillée est disponible à tout moment depuis ton espace abonnement.
      </Text>
      <CtaButton href={`${SITE_URL}/compte/abonnement`} label="Voir mes factures" />
      <Text style={{ fontSize: "13px", color: BRAND.inkSoft, margin: "20px 0 0" }}>
        Une question sur ce paiement ? Réponds simplement à cet email.
      </Text>
    </EmailShell>
  );
}

PaymentSuccessEmail.PreviewProps = {
  firstName: "Julien",
  amount: "4,90 €",
  dateLabel: "12 juin 2026",
} satisfies Props;
