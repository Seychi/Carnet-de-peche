import * as React from "react";
import { EmailShell, CtaButton, Text, h1, paragraph, BRAND, SITE_URL } from "./components";

type Props = {
  firstName?: string;
};

// Sujet : "On n'a pas pu encaisser ton paiement"
export default function PaymentFailedEmail({ firstName = "pêcheur" }: Props) {
  return (
    <EmailShell preview="On n'a pas pu encaisser ton paiement">
      <Text style={h1}>Petit souci de paiement</Text>
      <Text style={paragraph}>
        Salut {firstName}, on n&rsquo;a pas réussi à encaisser ton dernier paiement. Pas de panique
        : ça arrive souvent (carte expirée, plafond, banque qui bloque).
      </Text>
      <Text style={{ ...paragraph, marginBottom: "24px" }}>
        Mets à jour ta carte en quelques secondes pour ne pas perdre l&rsquo;accès à la carte
        complète et au fil régional.
      </Text>
      <CtaButton href={`${SITE_URL}/compte/abonnement`} label="Mettre à jour ma carte" />
      <Text style={{ fontSize: "13px", color: BRAND.inkSoft, margin: "20px 0 0" }}>
        On retentera automatiquement le prélèvement. Si tu ne fais rien, ton accès repassera en
        Découverte.
      </Text>
    </EmailShell>
  );
}

PaymentFailedEmail.PreviewProps = {
  firstName: "Julien",
} satisfies Props;
