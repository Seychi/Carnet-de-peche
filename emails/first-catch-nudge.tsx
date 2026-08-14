import * as React from "react";
import {
  EmailShell,
  CtaButton,
  Text,
  BRAND,
  h1,
  paragraph,
  UnsubFooter,
  lifecycleUrl,
} from "./components";

// ─── J+2 « logue ta première prise » (sprint 77, kind = j2_first_catch) ────────
// Cible : compte onboardé il y a exactement 2 jours et TOUJOURS à zéro prise.
//
// UNE SEULE ACTION (exigence du brief Bloc 8.4) : loguer la première prise. Pas
// d'upsell, pas de second lien concurrent, pas de « découvre aussi ». Un compte
// qui n'a rien logué n'a encore rien à acheter.
//
// HONNÊTETÉ : le seul chiffre cité est « 13 h », la médiane RÉELLE mesurée en base
// le 13/08 (délai inscription -> 1re prise chez ceux qui loguent). On ne promet
// aucun résultat de pêche et on ne cite aucune statistique inventée.
//
// Le spot favori, quand il existe, sert à pré-remplir le formulaire
// (/carnet/nouvelle?spot_id=…, paramètre réellement supporté par la page) et à
// nommer le lieu. JAMAIS de coordonnée : le nom du spot, rien d'autre.

const CAMPAIGN = "j2_first_catch";

type Props = {
  firstName?: string;
  /** Nom du spot favori le plus ancien, ou null : sert à nommer le lieu, jamais à le situer. */
  favoriteSpotName?: string | null;
  /** uuid du spot favori : pré-remplit le formulaire de prise. */
  favoriteSpotId?: string | null;
  unsubToken?: string;
};

export default function FirstCatchNudgeEmail({
  firstName = "pêcheur",
  favoriteSpotName = null,
  favoriteSpotId = null,
  unsubToken = "TOKEN",
}: Props) {
  const ctaHref = lifecycleUrl(
    favoriteSpotId ? `/carnet/nouvelle?spot_id=${favoriteSpotId}` : "/carnet/nouvelle",
    CAMPAIGN,
  );

  return (
    <EmailShell preview="Ta première prise, et ton carnet commence à travailler">
      <Text style={h1}>Il manque une prise à ton carnet</Text>

      <Text style={paragraph}>
        Salut {firstName}. Ton carnet est ouvert depuis deux jours et il est encore vide.
        Tant qu&rsquo;il l&rsquo;est, il ne peut rien t&rsquo;apprendre : c&rsquo;est
        ta première prise qui lui donne de quoi travailler.
      </Text>

      <Text style={paragraph}>
        {favoriteSpotName
          ? `Une seule prise suffit pour démarrer, même une vieille sortie de mémoire, même à ${favoriteSpotName}. Espèce, taille approximative, date : le carnet va chercher tout seul la marée, le vent et le moment de la journée qu'il faisait ce jour-là.`
          : "Une seule prise suffit pour démarrer, même une vieille sortie de mémoire. Espèce, taille approximative, date : le carnet va chercher tout seul la marée, le vent et le moment de la journée qu'il faisait ce jour-là."}
      </Text>

      <Text style={{ ...paragraph, marginBottom: "24px" }}>
        Chez les pêcheurs qui franchissent le pas, ça se joue dans les 13 heures qui
        suivent l&rsquo;inscription. Toi, il te reste une minute à y passer.
      </Text>

      <CtaButton href={ctaHref} label="Loguer ma première prise" />

      <Text style={{ fontSize: "13px", color: BRAND.inkSoft, margin: "20px 0 0" }}>
        La bredouille compte aussi : une sortie sans prise est une donnée comme une autre.
      </Text>

      <UnsubFooter
        unsubToken={unsubToken}
        campaign={CAMPAIGN}
        reason="Tu reçois cet email parce que tu as créé ton carnet il y a deux jours et qu’il est encore vide."
      />
    </EmailShell>
  );
}

FirstCatchNudgeEmail.PreviewProps = {
  firstName: "Julien",
  favoriteSpotName: "Pointe du Raz",
  favoriteSpotId: "00000000-0000-0000-0000-000000000001",
  unsubToken: "00000000-0000-0000-0000-000000000000",
} satisfies Props;
