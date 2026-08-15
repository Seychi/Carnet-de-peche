import * as React from "react";
import { EmailShell, CtaButton, Text, h1, paragraph, BRAND, SITE_URL } from "./components";

type Props = {
  firstName?: string;
  planLabel?: string;
};

// Sujet : "Bienvenue dans Carnet de Pêche · Ton essai 7 jours démarre"
export default function WelcomeTrialEmail({ firstName = "pêcheur", planLabel = "Local" }: Props) {
  return (
    <EmailShell preview="Ton essai 7 jours démarre maintenant">
      <Text style={h1}>Bienvenue, {firstName} 🎣</Text>
      <Text style={paragraph}>
        Ton essai 7 jours de <strong>{planLabel}</strong> démarre maintenant. Tu as accès aux
        coordonnées GPS précises de tous les spots, aux filtres espèces et techniques, aux
        couches avancées de la carte et aux alertes sur tes spots favoris.
      </Text>
      <Text style={paragraph}>
        <strong>Aucune charge avant la fin de l&rsquo;essai.</strong> Tu peux annuler à tout moment
        en 1 clic depuis ton espace abonnement, pas de question, pas de friction.
      </Text>
      <Text style={{ ...paragraph, marginBottom: "24px" }}>
        Le meilleur moyen de voir si l&rsquo;app te parle : logue ta première prise.
      </Text>
      <CtaButton href={`${SITE_URL}/carnet/nouvelle`} label="Loguer ma première prise" />
      <Text style={{ fontSize: "13px", color: BRAND.inkSoft, margin: "20px 0 0" }}>
        Gérer ou annuler :{" "}
        <a href={`${SITE_URL}/compte/abonnement`} style={{ color: BRAND.teal }}>
          mon abonnement
        </a>
      </Text>
    </EmailShell>
  );
}

WelcomeTrialEmail.PreviewProps = {
  firstName: "Julien",
  planLabel: "Local",
} satisfies Props;
