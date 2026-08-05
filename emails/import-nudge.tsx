import * as React from "react";
import {
  EmailShell,
  CtaButton,
  Text,
  Link,
  h1,
  paragraph,
  BRAND,
  UnsubFooter,
  lifecycleUrl,
} from "./components";

// ─── J+3 « débloque tes tendances » (sprint 74, kind = j3_import) ─────────────
// Cible : compte onboardé il y a 3 jours et TOUJOURS à zéro prise. Dernier email
// d'activation de la séquence (pas de J+7 : au-delà, relancer un compte qui n'a
// rien logué relève du spam, pas de l'activation).
//
// Angle unique : l'import. Loguer une prise demande d'aller pêcher ; importer 3
// sorties passées se fait de mémoire, tout de suite, et débloque exactement la
// même chose. UN SEUL CTA (exigence du brief) : pas d'upsell ici, on ne vend rien
// à quelqu'un qui n'a pas encore vu la valeur.
//
// HONNÊTETÉ : « dès 3 prises » est le vrai seuil du moteur perso
// (computePersonalTendencies.hasEnough), pas un chiffre marketing.

const CAMPAIGN = "j3_import";

type Props = {
  firstName?: string;
  unsubToken?: string;
};

export default function ImportNudgeEmail({
  firstName = "pêcheur",
  unsubToken = "TOKEN",
}: Props) {
  return (
    <EmailShell preview="3 prises suffisent pour débloquer tes tendances">
      <Text style={h1}>3 prises, et ton carnet parle</Text>
      <Text style={paragraph}>
        Salut {firstName}. Ton carnet est prêt depuis quelques jours, mais il lui manque la seule
        chose qu&rsquo;il ne peut pas deviner : ce que TU prends, et dans quelles conditions.
      </Text>
      <Text style={paragraph}>
        Pas besoin d&rsquo;attendre ta prochaine sortie. Tes trois dernières prises, même
        approximatives, suffisent à faire démarrer le moteur : le carnet croise chaque prise avec
        la marée, le vent et le moment de la journée, puis te dit où et quand TES prises tombent.
      </Text>
      <Text style={{ ...paragraph, marginBottom: "24px" }}>
        Deux minutes, de mémoire, et tu ne pars plus jamais d&rsquo;une moyenne générique.
      </Text>

      <CtaButton href={lifecycleUrl("/carnet/import", CAMPAIGN)} label="Importer mes prises" />

      <Text style={{ fontSize: "13px", color: BRAND.inkSoft, margin: "20px 0 0" }}>
        Tu préfères commencer par une sortie fraîche ?{" "}
        <Link href={lifecycleUrl("/carnet/nouvelle", CAMPAIGN)} style={{ color: BRAND.teal }}>
          Loguer une prise
        </Link>
        . La bredouille compte aussi : c&rsquo;est une donnée comme une autre.
      </Text>

      <UnsubFooter
        unsubToken={unsubToken}
        campaign={CAMPAIGN}
        reason="Tu reçois cet email parce que tu as créé ton carnet il y a quelques jours."
      />
    </EmailShell>
  );
}

ImportNudgeEmail.PreviewProps = {
  firstName: "Julien",
  unsubToken: "00000000-0000-0000-0000-000000000000",
} satisfies Props;
