import * as React from "react";
import { EmailShell, CtaButton, Text, h1, paragraph, BRAND, SITE_URL } from "./components";

type Props = {
  firstName?: string;
  accessUntil?: string;
};

// Sujet : "Ton abonnement est annulé — à bientôt"
export default function SubscriptionCanceledEmail({
  firstName = "pêcheur",
  accessUntil = "28 juin 2026",
}: Props) {
  return (
    <EmailShell preview="Ton abonnement est annulé — à bientôt">
      <Text style={h1}>À bientôt, {firstName}</Text>
      <Text style={paragraph}>
        Ton abonnement est bien annulé. Tu gardes l&rsquo;accès complet jusqu&rsquo;au{" "}
        <strong>{accessUntil}</strong> — profite-en pour loguer encore quelques prises.
      </Text>
      <Text style={paragraph}>
        Ton carnet, lui, reste à toi pour toujours : tes prises, tes stats, tes spots. Rien ne se
        perd.
      </Text>
      <Text style={{ ...paragraph, marginBottom: "24px" }}>
        Quand tu veux revenir, on t&rsquo;accueille les bras ouverts.
      </Text>
      <CtaButton href={`${SITE_URL}/tarifs`} label="Revoir les formules" />
      <Text style={{ fontSize: "13px", color: BRAND.inkSoft, margin: "20px 0 0" }}>
        Un retour à nous faire ? Réponds simplement à cet email.
      </Text>
    </EmailShell>
  );
}

SubscriptionCanceledEmail.PreviewProps = {
  firstName: "Julien",
  accessUntil: "28 juin 2026",
} satisfies Props;
