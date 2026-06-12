import * as React from "react";
import { EmailShell, CtaButton, Text, h1, paragraph, BRAND, SITE_URL } from "./components";

type Props = {
  firstName?: string;
};

// Sujet : "Bienvenue dans Carnet de Pêche 🎣"
// Envoyé à la fin de l'onboarding (= inscription effective). Brief sprint 11
// Bloc C : mentionner le fil 100% gratuit — l'argument différenciant post-pivot.
export default function WelcomeEmail({ firstName = "pêcheur" }: Props) {
  return (
    <EmailShell preview="Ton carnet est prêt — logue ta première prise">
      <Text style={h1}>Bienvenue, {firstName} 🎣</Text>
      <Text style={paragraph}>
        Ton carnet est prêt. Chaque prise que tu logues — espèce, taille, spot, conditions —
        affine tes patterns : le carnet apprend <strong>quand</strong> et <strong>où</strong> TU
        pêches le mieux, pas des moyennes génériques.
      </Text>
      <Text style={paragraph}>
        Le carnet est <strong>illimité et gratuit</strong>, pour toujours. Et le{" "}
        <strong>fil régional est 100&nbsp;% gratuit</strong> : lecture, publication, likes,
        commentaires, follows — dans tous les départements côtiers.
      </Text>
      <Text style={{ ...paragraph, marginBottom: "24px" }}>
        Le meilleur point de départ : ta première prise. Deux minutes, et ton carnet commence à
        travailler pour toi.
      </Text>
      <CtaButton href={`${SITE_URL}/carnet/nouvelle`} label="Loguer ma première prise" />
      <Text style={{ fontSize: "13px", color: BRAND.inkSoft, margin: "20px 0 0" }}>
        Envie d&rsquo;explorer d&rsquo;abord ?{" "}
        <a href={`${SITE_URL}/carte`} style={{ color: BRAND.teal }}>
          Découvre les spots près de chez toi
        </a>{" "}
        ou{" "}
        <a href={`${SITE_URL}/fil`} style={{ color: BRAND.teal }}>
          passe voir le fil de ton département
        </a>
        .
      </Text>
    </EmailShell>
  );
}

WelcomeEmail.PreviewProps = {
  firstName: "Julien",
} satisfies Props;
