import * as React from "react";
import { EmailShell, CtaButton, Text, Link, h1, paragraph, BRAND, SITE_URL } from "./components";

type Props = {
  firstName?: string;
  /** Token de désinscription marketing (profiles.email_unsub_token). Lien sans login. */
  unsubToken?: string;
};

// MARKETING (J+2) — « ton essai a expiré, reviens ». Base légale = intérêt
// légitime / soft opt-in client existant. DOIT inclure un lien de désinscription
// fonctionnel (RGPD) → /unsubscribe?token=... Le cron ne l'envoie qu'aux profils
// marketing_email_optin = true.
// Sujet : "Ton essai est terminé — ton carnet t'attend"
export default function PostTrialWinbackEmail({
  firstName = "pêcheur",
  unsubToken = "TOKEN",
}: Props) {
  const unsubUrl = `${SITE_URL}/unsubscribe?token=${unsubToken}`;
  return (
    <EmailShell preview="Ton essai est terminé. Ton carnet t'attend">
      <Text style={h1}>Ton carnet t&rsquo;attend, {firstName}</Text>
      <Text style={paragraph}>
        Ton essai s&rsquo;est terminé et tu n&rsquo;as pas activé d&rsquo;abonnement. Pas de souci :
        ton carnet, tes prises et tes stats restent à toi, gratuitement, pour toujours.
      </Text>
      <Text style={paragraph}>
        Si les coordonnées précises, les filtres et l&rsquo;alerte de la veille sur tes spots
        favoris t&rsquo;ont manqué, tu peux reprendre quand tu veux. C&rsquo;est sans engagement, annulable
        en 1 clic.
      </Text>
      <Text style={{ ...paragraph, marginBottom: "24px" }}>
        On serait ravis de te revoir au bord de l&rsquo;eau.
      </Text>
      <CtaButton href={`${SITE_URL}/tarifs`} label="Revoir les formules" />
      <Text style={{ fontSize: "12px", color: BRAND.inkSoft, margin: "24px 0 0" }}>
        Tu reçois cet email parce que tu as essayé un abonnement Carnet de Pêche.{" "}
        <Link href={unsubUrl} style={{ color: BRAND.inkSoft }}>
          Me désinscrire des emails de relance
        </Link>
        .
      </Text>
    </EmailShell>
  );
}

PostTrialWinbackEmail.PreviewProps = {
  firstName: "Julien",
  unsubToken: "00000000-0000-0000-0000-000000000000",
} satisfies Props;
