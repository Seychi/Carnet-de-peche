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
  UnsubFooter,
  lifecycleUrl,
} from "./components";

// Sujet : "Bienvenue dans Carnet de Pêche 🎣"
// Envoyé à la fin de l'onboarding (= inscription effective). Brief sprint 11
// Bloc C : mentionner le fil 100% gratuit — l'argument différenciant post-pivot.
//
// ─── Enrichi au sprint 74 (kind = welcome) ───────────────────────────────────
// Le welcome existait et partait déjà (le brief S74 le croyait mort : faux, cf
// anchor.md §1.1). Ce qui lui manquait : une raison de revenir DEMAIN. On lui
// ajoute donc le prochain créneau du secteur, les UTM (sans quoi les retours
// sont invisibles dans PostHog, la métrique du sprint) et la désinscription en
// un clic. Le créneau est OPTIONNEL : si le pipeline solunar est indisponible,
// l'email part quand même, sans bloc créneau, plutôt que pas du tout.

const CAMPAIGN = "welcome";

type Props = {
  firstName?: string;
  /** « Demain 06:10 ». Absent = pipeline indisponible, le bloc est simplement omis. */
  windowWhen?: string | null;
  placeLabel?: string | null;
  reasons?: string[];
  unsubToken?: string;
};

export default function WelcomeEmail({
  firstName = "pêcheur",
  windowWhen = null,
  placeLabel = null,
  reasons = [],
  unsubToken = "TOKEN",
}: Props) {
  return (
    <EmailShell preview="Ton carnet est prêt : logue ta première prise">
      <Text style={h1}>Bienvenue, {firstName} 🎣</Text>
      <Text style={paragraph}>
        Ton carnet est prêt. Chaque prise que tu logues, espèce, taille, spot, conditions,
        affine tes patterns : le carnet apprend <strong>quand</strong> et <strong>où</strong> TU
        pêches le mieux, pas des moyennes génériques.
      </Text>

      {windowWhen && placeLabel && (
        <>
          <Text style={paragraph}>
            Pour commencer, le prochain créneau favorable de ton secteur :
          </Text>
          <WindowBlock when={windowWhen} place={placeLabel} reasons={reasons} />
        </>
      )}

      <Text style={paragraph}>
        Le carnet est <strong>illimité et gratuit</strong>, pour toujours. Et le{" "}
        <strong>fil régional est 100&nbsp;% gratuit</strong> : lecture, publication, likes,
        commentaires, follows, dans tous les départements côtiers.
      </Text>
      <Text style={{ ...paragraph, marginBottom: "24px" }}>
        Le meilleur point de départ : ta première prise. Deux minutes, et ton carnet commence à
        travailler pour toi.
      </Text>

      <CtaButton
        href={lifecycleUrl("/carnet/nouvelle", CAMPAIGN)}
        label="Loguer ma première prise"
      />

      <Text style={{ fontSize: "13px", color: BRAND.inkSoft, margin: "20px 0 0" }}>
        Envie d&rsquo;explorer d&rsquo;abord ?{" "}
        <Link href={lifecycleUrl("/carte", CAMPAIGN)} style={{ color: BRAND.teal }}>
          Découvre les spots près de chez toi
        </Link>{" "}
        ou{" "}
        <Link href={lifecycleUrl("/fil", CAMPAIGN)} style={{ color: BRAND.teal }}>
          passe voir le fil de ton département
        </Link>
        .
      </Text>

      <UnsubFooter
        unsubToken={unsubToken}
        campaign={CAMPAIGN}
        reason="Tu reçois cet email parce que tu viens de créer ton carnet."
      />
    </EmailShell>
  );
}

WelcomeEmail.PreviewProps = {
  firstName: "Julien",
  windowWhen: "Demain 06:10",
  placeLabel: "Secteur Finistère",
  reasons: ["Lever de lune", "Marée descendante"],
  unsubToken: "00000000-0000-0000-0000-000000000000",
} satisfies Props;
