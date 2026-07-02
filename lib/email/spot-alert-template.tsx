import * as React from "react";
import {
  EmailShell,
  CtaButton,
  Section,
  Text,
  Link,
  h1,
  paragraph,
  BRAND,
  SITE_URL,
} from "@/emails/components";
import { buildAlertMessage } from "@/lib/alerts/message";
import type { SpotAlertPayload } from "@/lib/alerts/types";

// ─── Alerte par port (sprint 72) — template email ──────────────────────────────
// INVARIANTS (brief S72) :
//  - JAMAIS de coordonnée : le spot n'est cité que par son nom + son slug (lien).
//  - Honnêteté : la justification vient telle quelle du moteur (chiffres réels du
//    carnet ou mesures), le générique est EXPLICITEMENT labellisé « Alerte générique ».
//  - Copy FR, tutoiement, zéro tiret cadratin (CLAUDE.md §6).
// DA v2 : bloc sombre navy-950 + heure en gold, chiffres en mono (règle d'or).
// Différenciation perso / générique par le TEXTE du badge, pas par la teinte seule
// (John est daltonien).

const MONO = "'JetBrains Mono', 'Courier New', monospace";
const NAVY_950 = "#04141C"; // navy-950 DA v2
const GOLD = "#D9A53C"; // gold-500 DA v2

type Props = Pick<
  SpotAlertPayload,
  "spotName" | "spotSlug" | "windowLabel" | "kind" | "justification"
> & {
  firstName?: string;
  /** Token de désinscription email global (profiles.email_unsub_token, S26). */
  unsubToken?: string;
};

function capitalize(s: string): string {
  return s.length === 0 ? s : s[0].toUpperCase() + s.slice(1);
}

export default function SpotAlertEmail({
  firstName = "pêcheur",
  spotName,
  spotSlug,
  windowLabel,
  kind,
  justification,
  unsubToken = "TOKEN",
}: Props) {
  const isGeneric = kind === "generique";
  const when = capitalize(windowLabel);
  // Même source de copy que le push et l'in-app (lib/alerts/message, pur).
  const { title } = buildAlertMessage({ spotName, windowLabel, kind, justification });

  // UTM aligné sur le contrat de mesure du sprint (alert_clicked) :
  // utm_source=spot_alert & utm_medium=push|email|inapp.
  const spotUrl = `${SITE_URL}/spots/${spotSlug}?utm_source=spot_alert&utm_medium=email`;
  const settingsUrl = `${SITE_URL}/notifications`;
  const unsubUrl = `${SITE_URL}/unsubscribe?token=${unsubToken}`;

  return (
    <EmailShell preview={justification}>
      <Text
        style={{
          display: "inline-block",
          fontSize: "11px",
          fontWeight: "bold",
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          padding: "4px 10px",
          borderRadius: "999px",
          margin: "0 0 16px",
          backgroundColor: isGeneric ? "#faf3e3" : "#e6f7f4",
          color: isGeneric ? "#8a6420" : "#0f766e",
        }}
      >
        {isGeneric ? "Alerte générique" : "D’après ton carnet"}
      </Text>
      <Text style={h1}>{title}</Text>
      <Text style={paragraph}>
        {isGeneric
          ? `Salut ${firstName}, une grande marée arrive demain sur ton spot favori.`
          : `Salut ${firstName}, une fenêtre qui correspond à tes prises s’ouvre demain sur ton spot favori.`}
      </Text>
      <Section
        style={{
          backgroundColor: NAVY_950,
          borderRadius: "12px",
          padding: "20px 24px",
          margin: "0 0 20px",
        }}
      >
        <Text
          style={{
            fontFamily: MONO,
            fontSize: "24px",
            fontWeight: "bold",
            color: GOLD,
            margin: 0,
          }}
        >
          {when}
        </Text>
        <Text style={{ fontSize: "14px", color: "#ffffff", margin: "6px 0 0" }}>{spotName}</Text>
      </Section>
      <Section
        style={{
          borderLeft: `3px solid ${isGeneric ? GOLD : BRAND.teal}`,
          paddingLeft: "12px",
          margin: "0 0 24px",
        }}
      >
        <Text style={{ ...paragraph, margin: 0 }}>{justification}</Text>
      </Section>
      <CtaButton href={spotUrl} label="Voir la fiche spot" />
      <Text style={{ fontSize: "12px", color: BRAND.inkSoft, margin: "24px 0 0" }}>
        Tu reçois cette alerte parce que tu l&rsquo;as activée sur tes spots favoris.{" "}
        <Link href={settingsUrl} style={{ color: BRAND.inkSoft }}>
          Gérer mes alertes
        </Link>{" "}
        ·{" "}
        <Link href={unsubUrl} style={{ color: BRAND.inkSoft }}>
          Me désinscrire de tous les emails
        </Link>
        .
      </Text>
    </EmailShell>
  );
}

SpotAlertEmail.PreviewProps = {
  firstName: "Julien",
  spotName: "Pointe du Raz",
  spotSlug: "pointe-du-raz",
  windowLabel: "demain 06:10",
  kind: "perso",
  // Aligné sur la sortie RÉELLE du moteur (facts = marée + vitesse du vent,
  // sans direction : le forecast n'expose pas la direction à la fenêtre).
  justification:
    "Marée descendante, vent 12 km/h : 6 de tes 7 prises renseignées tombent en marée descendante.",
  unsubToken: "00000000-0000-0000-0000-000000000000",
} satisfies Props;
