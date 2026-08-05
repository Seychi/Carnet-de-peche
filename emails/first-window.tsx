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

// ─── J+1 « ton créneau » (sprint 74, kind = j1_window) ────────────────────────
// Cible : compte onboardé la veille et TOUJOURS à zéro prise. C'est le premier
// point de contact après J0, celui qui manquait totalement (diagnostic 05/08 :
// 0 utilisateur revenu après J+1 sur 20 inscrits en 60 jours).
//
// INVARIANTS :
//  - Le créneau est celui du SECTEUR (département), explicitement labellisé comme
//    générique. Un compte à zéro prise n'a rien à personnaliser : jamais de %,
//    jamais de « tes conditions » (règle d'honnêteté du brief).
//  - Un seul bénéfice par CTA : loguer. L'import est un lien secondaire.
//  - Upsell Local présent mais honnête : il vend la proactivité, pas la donnée.

const CAMPAIGN = "j1_window";

type Props = {
  firstName?: string;
  /** « Demain 06:10 », composé par lib/lifecycle/dates.ts::formatWindowWhen. */
  windowWhen: string;
  /** « Finistère » : libellé du département, pas de coordonnée. */
  placeLabel: string;
  /** Raisons FR du moteur solunar (factors.reasons), reprises telles quelles. */
  reasons?: string[];
  /** Nom du spot mis en favori à la fin de l'onboarding, s'il y en a un. */
  favoriteSpotName?: string | null;
  favoriteSpotSlug?: string | null;
  unsubToken?: string;
};

export default function FirstWindowEmail({
  firstName = "pêcheur",
  windowWhen,
  placeLabel,
  reasons = [],
  favoriteSpotName = null,
  favoriteSpotSlug = null,
  unsubToken = "TOKEN",
}: Props) {
  return (
    <EmailShell preview={`Ton prochain créneau : ${windowWhen}`}>
      <Text style={h1}>Ton prochain créneau, {firstName}</Text>
      <Text style={paragraph}>
        Tu as calibré ton carnet hier. Voilà le prochain créneau favorable de ton secteur, celui
        que le carnet regarde pour toi tous les jours.
      </Text>

      <WindowBlock when={windowWhen} place={placeLabel} reasons={reasons} />

      {favoriteSpotName && favoriteSpotSlug && (
        <Text style={{ ...paragraph, fontSize: "13.5px" }}>
          Ton spot favori :{" "}
          <Link
            href={lifecycleUrl(`/spots/${favoriteSpotSlug}`, CAMPAIGN)}
            style={{ color: BRAND.teal, fontWeight: "bold" }}
          >
            {favoriteSpotName}
          </Link>
          . Marées, vent et houle du jour y sont déjà affichés.
        </Text>
      )}

      <Text style={{ ...paragraph, marginBottom: "24px" }}>
        Il reste une pièce manquante : tes prises. Dès la première, le carnet commence à comparer
        TES sorties aux conditions, et ce créneau générique devient le tien.
      </Text>

      <CtaButton href={lifecycleUrl("/carnet/nouvelle", CAMPAIGN)} label="Loguer une prise" />

      <Text style={{ fontSize: "13px", color: BRAND.inkSoft, margin: "20px 0 0" }}>
        Tu as déjà des sorties en tête ?{" "}
        <Link href={lifecycleUrl("/carnet/import", CAMPAIGN)} style={{ color: BRAND.teal }}>
          Importe tes prises passées en 2 minutes
        </Link>
        .
      </Text>

      <LocalUpsell campaign={CAMPAIGN} />

      <UnsubFooter
        unsubToken={unsubToken}
        campaign={CAMPAIGN}
        reason="Tu reçois cet email parce que tu viens de créer ton carnet."
      />
    </EmailShell>
  );
}

FirstWindowEmail.PreviewProps = {
  firstName: "Julien",
  windowWhen: "Demain 06:10",
  placeLabel: "Secteur Finistère",
  reasons: ["Lever de lune", "Marée descendante"],
  favoriteSpotName: "Jetée du vieux port de Roscoff",
  favoriteSpotSlug: "jetee-du-vieux-port-de-roscoff",
  unsubToken: "00000000-0000-0000-0000-000000000000",
} satisfies Props;
