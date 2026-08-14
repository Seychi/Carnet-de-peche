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
  MONO,
  NAVY_950,
  GOLD,
} from "./components";

// ─── Alerte grande marée sur spot favori (sprint 77, Bloc 10.2) ───────────────
//
// ⚠️ PAS DE COEFFICIENT. Le brief demandait « préviens-moi quand le coefficient
// dépasse 90 ». Ce projet ne calcule aucun coefficient de marée (Open-Meteo ne
// l'expose pas, `tide_coefficient` est toujours null, re-vérifié au S72), et en
// fabriquer un à partir du marnage serait un chiffre inventé. Cet email dit donc
// ce qu'il mesure vraiment : le MARNAGE du lendemain, en mètres, comparé au seuil
// de grande marée de la façade (Manche 9 m, Atlantique 5 m, décision S49).
// Le paragraphe « comment on le calcule » est là pour que le pêcheur ne cherche
// pas un coef qui n'existe pas.
//
// AUTRES INVARIANTS :
//  - JAMAIS de coordonnée : le spot n'est cité que par son nom et son slug.
//  - Copy FR, tutoiement, zéro tiret cadratin (CLAUDE.md §6).
//  - Désinscription en un clic (token global S26) en plus du réglage dédié.

type Props = {
  firstName?: string;
  spotName: string;
  spotSlug: string;
  /** Marnage MESURÉ du lendemain, en mètres. */
  rangeM: number;
  /** Seuil de grande marée de la façade, en mètres. */
  thresholdM: number;
  /** Token de désinscription email global (profiles.email_unsub_token, S26). */
  unsubToken?: string;
};

/** Décimale française à 1 chiffre : 9.42 → « 9,4 » (même formatage que lib/alerts/message). */
function frDecimal1(n: number): string {
  return n.toFixed(1).replace(".", ",");
}

export default function BigTideAlertEmail({
  firstName = "pêcheur",
  spotName,
  spotSlug,
  rangeM,
  thresholdM,
  unsubToken = "TOKEN",
}: Props) {
  const spotUrl = `${SITE_URL}/spots/${spotSlug}?utm_source=big_tide_alert&utm_medium=email`;
  const settingsUrl = `${SITE_URL}/notifications`;
  const unsubUrl = `${SITE_URL}/unsubscribe?token=${unsubToken}`;

  return (
    <EmailShell preview={`Marnage prévu ${frDecimal1(rangeM)} m demain à ${spotName}`}>
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
          backgroundColor: "#faf3e3",
          color: "#8a6420",
        }}
      >
        Grande marée
      </Text>

      <Text style={h1}>Grande marée demain à {spotName}</Text>

      <Text style={paragraph}>
        Salut {firstName}. Tu suis {spotName}, et le marnage de demain y passe au-dessus du
        seuil de grande marée de la façade.
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
          {frDecimal1(rangeM)} m
        </Text>
        <Text style={{ fontSize: "14px", color: "#ffffff", margin: "6px 0 0" }}>
          Marnage prévu demain à {spotName}
        </Text>
        <Text style={{ fontSize: "12.5px", color: "#ffffff", opacity: 0.65, margin: "10px 0 0" }}>
          Seuil de grande marée de la façade : {frDecimal1(thresholdM)} m
        </Text>
      </Section>

      <Section
        style={{
          borderLeft: `3px solid ${GOLD}`,
          paddingLeft: "12px",
          margin: "0 0 24px",
        }}
      >
        <Text style={{ ...paragraph, margin: 0, fontSize: "13.5px", lineHeight: "21px" }}>
          Le marnage, c&rsquo;est l&rsquo;écart mesuré entre la pleine mer et la basse mer de
          la journée. On ne te donne pas de coefficient : on ne le calcule pas, et on
          préfère un chiffre mesuré à un chiffre approché.
        </Text>
      </Section>

      <CtaButton href={spotUrl} label="Voir les horaires de marée" />

      <Text style={{ fontSize: "12px", color: BRAND.inkSoft, margin: "24px 0 0" }}>
        Tu reçois cette alerte parce que tu l&rsquo;as activée sur tes spots favoris. Une
        seule alerte par épisode de grande marée, jamais la nuit.{" "}
        <Link href={settingsUrl} style={{ color: BRAND.inkSoft }}>
          Gérer mes alertes
        </Link>{" "}
        ·{" "}
        <Link href={unsubUrl} style={{ color: BRAND.inkSoft }}>
          Me désinscrire en un clic
        </Link>
        .
      </Text>
    </EmailShell>
  );
}

BigTideAlertEmail.PreviewProps = {
  firstName: "Julien",
  spotName: "Cap Fréhel",
  spotSlug: "cap-frehel",
  rangeM: 9.4,
  thresholdM: 9,
  unsubToken: "00000000-0000-0000-0000-000000000000",
} satisfies Props;
