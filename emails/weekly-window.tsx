import * as React from "react";
import {
  EmailShell,
  CtaButton,
  Text,
  Link,
  h1,
  paragraph,
  BRAND,
  WindowBlock,
  LocalUpsell,
  UnsubFooter,
  lifecycleUrl,
} from "./components";

// ─── Hebdo « ton créneau du week-end » (sprint 74, kind = weekly_window) ──────
// Envoyé le VENDREDI matin (le pêcheur planifie son week-end), uniquement aux
// comptes qui ont coché l'opt-in (profiles.weekly_window_optin, défaut false,
// case JAMAIS pré-cochée). C'est le seul email récurrent du sprint, donc le seul
// qui puisse devenir une habitude : c'est lui qui crée la raison de revenir.
//
// ⚠️ À ne pas confondre avec le `weekly_digest` du sprint 49 : celui-là est un
// PUSH du lundi qui récapitule les prises PASSÉES, en opt-OUT. Deux objets
// distincts (canal, cadence, sens, consentement), volontairement non fusionnés
// (décision « on crée » du Bloc 0, cf docs/sprint-74/research/anchor.md §1.2).
//
// HONNÊTETÉ : le créneau reste celui du secteur. Le libellé le dit, quel que soit
// l'historique du destinataire.

const CAMPAIGN = "weekly_window";

type Props = {
  firstName?: string;
  /** « Samedi 12 juillet 07:20 », composé par lib/lifecycle/dates.ts. */
  windowWhen: string;
  placeLabel: string;
  reasons?: string[];
  unsubToken?: string;
};

export default function WeeklyWindowEmail({
  firstName = "pêcheur",
  windowWhen,
  placeLabel,
  reasons = [],
  unsubToken = "TOKEN",
}: Props) {
  return (
    <EmailShell preview={`Ton créneau du week-end : ${windowWhen}`}>
      <Text style={h1}>Ton créneau du week-end</Text>
      <Text style={paragraph}>
        Salut {firstName}, voilà le meilleur moment de ton secteur pour ce week-end.
      </Text>

      <WindowBlock when={windowWhen} place={placeLabel} reasons={reasons} />

      <Text style={{ ...paragraph, marginBottom: "24px" }}>
        Si tu sors, pense à loguer, même une bredouille. C&rsquo;est ce qui transforme ce créneau
        générique en créneau calculé sur tes propres sorties.
      </Text>

      <CtaButton href={lifecycleUrl("/home", CAMPAIGN)} label="Voir mes conditions" />

      <Text style={{ fontSize: "13px", color: BRAND.inkSoft, margin: "20px 0 0" }}>
        Déjà sorti cette semaine ?{" "}
        <Link href={lifecycleUrl("/carnet/nouvelle", CAMPAIGN)} style={{ color: BRAND.teal }}>
          Logue ta prise
        </Link>
        .
      </Text>

      <LocalUpsell campaign={CAMPAIGN} />

      <UnsubFooter
        unsubToken={unsubToken}
        campaign={CAMPAIGN}
        reason="Tu reçois cet email chaque vendredi parce que tu l’as demandé."
      />
    </EmailShell>
  );
}

WeeklyWindowEmail.PreviewProps = {
  firstName: "Julien",
  windowWhen: "Samedi 12 juillet 07:20",
  placeLabel: "Secteur Finistère",
  reasons: ["Passage de lune", "Marée montante"],
  unsubToken: "00000000-0000-0000-0000-000000000000",
} satisfies Props;
