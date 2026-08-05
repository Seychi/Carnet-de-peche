import * as React from "react";
import {
  Body,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Link,
  Preview,
  Section,
  Text,
} from "@react-email/components";

// Charte Carnet de Pêche (cf CLAUDE.md §6)
export const BRAND = {
  navy: "#0A2F3D",
  teal: "#14B8A6",
  sand: "#FBF8F2",
  ink: "#0E1A22",
  inkSoft: "#5b6b73",
};

export const SITE_URL = "https://www.carnet-de-peche.com";

// Wrapper commun à tous les emails. Named export uniquement (pas de default) →
// react-email ne le liste pas comme template.
export function EmailShell({
  preview,
  children,
}: {
  preview: string;
  children: React.ReactNode;
}) {
  return (
    <Html lang="fr">
      <Head />
      <Preview>{preview}</Preview>
      <Body style={{ backgroundColor: BRAND.sand, margin: 0, fontFamily: "Arial, sans-serif" }}>
        <Container
          style={{
            maxWidth: "480px",
            margin: "0 auto",
            padding: "32px 16px",
          }}
        >
          <Section style={{ paddingBottom: "16px" }}>
            <Text style={{ fontSize: "18px", fontWeight: "bold", color: BRAND.navy, margin: 0 }}>
              📒 Carnet de Pêche
            </Text>
          </Section>
          <Section
            style={{
              backgroundColor: "#ffffff",
              borderRadius: "14px",
              padding: "28px",
              border: "1px solid #e5e7eb",
            }}
          >
            {children}
          </Section>
          <Hr style={{ borderColor: "#e5e7eb", margin: "24px 0 12px" }} />
          <Text style={{ fontSize: "12px", color: BRAND.inkSoft, margin: 0 }}>
            Carnet de Pêche · Logue. Partage. Progresse.{" "}
            <Link href={`${SITE_URL}/compte/abonnement`} style={{ color: BRAND.inkSoft }}>
              Gérer mes préférences
            </Link>
          </Text>
        </Container>
      </Body>
    </Html>
  );
}

// Styles partagés
export const h1: React.CSSProperties = {
  fontSize: "20px",
  fontWeight: "bold",
  color: BRAND.navy,
  margin: "0 0 16px",
};

export const paragraph: React.CSSProperties = {
  fontSize: "15px",
  lineHeight: "24px",
  color: BRAND.ink,
  margin: "0 0 16px",
};

export function CtaButton({ href, label }: { href: string; label: string }) {
  return (
    <a
      href={href}
      style={{
        display: "inline-block",
        backgroundColor: BRAND.teal,
        color: "#ffffff",
        fontSize: "15px",
        fontWeight: "bold",
        textDecoration: "none",
        padding: "12px 24px",
        borderRadius: "12px",
      }}
    >
      {label}
    </a>
  );
}

export { Heading, Section, Text, Link };

// ─── Briques partagées des emails de cycle de vie (sprint 74) ─────────────────
// Named exports uniquement (pas de default) → react-email ne liste pas ce fichier
// comme un template. Mutualisé entre welcome / first-window / import-nudge /
// weekly-window pour que les 4 emails d'activation aient exactement la même DA.

/** DA v2 : tout chiffre métier passe en mono (règle d'or, CLAUDE.md §6). */
export const MONO = "'JetBrains Mono', 'Courier New', monospace";
export const NAVY_950 = "#04141C";
export const GOLD = "#D9A53C";

/**
 * URL du site taguée UTM pour la mesure des retours (Bloc 4 : c'est LA métrique
 * du sprint, un lien non tagué rend le retour invisible dans PostHog).
 * `campaign` = le `LifecycleKind` de l'email (welcome / j1_window / …).
 */
export function lifecycleUrl(path: string, campaign: string): string {
  const sep = path.includes("?") ? "&" : "?";
  return `${SITE_URL}${path}${sep}utm_source=lifecycle&utm_medium=email&utm_campaign=${campaign}`;
}

/**
 * Bloc « créneau » sombre : jour + heure en gold mono, lieu, puis les raisons FR
 * telles que le moteur solunar les fournit. AUCUN score, AUCUN pourcentage : ces
 * emails s'adressent à des comptes sans historique, la règle d'honnêteté du brief
 * interdit d'y présenter quoi que ce soit comme personnalisé.
 */
export function WindowBlock({
  when,
  place,
  reasons = [],
}: {
  when: string;
  place: string;
  reasons?: string[];
}) {
  return (
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
          fontSize: "22px",
          fontWeight: "bold",
          color: GOLD,
          margin: 0,
        }}
      >
        {when}
      </Text>
      <Text style={{ fontSize: "14px", color: "#ffffff", margin: "6px 0 0" }}>{place}</Text>
      {reasons.length > 0 && (
        <Text style={{ fontSize: "12.5px", color: "#ffffff", opacity: 0.65, margin: "10px 0 0" }}>
          {reasons.join(" · ")}
        </Text>
      )}
    </Section>
  );
}

/**
 * Encart d'upsell Local. HONNÊTE par construction : il ne promet pas un meilleur
 * créneau, il vend la PROACTIVITÉ (être prévenu la veille), qui est exactement ce
 * que le tier Local ajoute (moteur d'alertes sprint 72). Le créneau générique de
 * cet email, lui, reste gratuit pour toujours : le positionnement pricing du brief
 * est intact.
 */
export function LocalUpsell({ campaign }: { campaign: string }) {
  return (
    <Section
      style={{
        borderLeft: `3px solid ${GOLD}`,
        paddingLeft: "12px",
        margin: "24px 0 0",
      }}
    >
      <Text style={{ fontSize: "13.5px", lineHeight: "21px", color: BRAND.ink, margin: 0 }}>
        Ce créneau est celui de ton secteur, et il restera gratuit. Avec{" "}
        <Link href={lifecycleUrl("/tarifs", campaign)} style={{ color: BRAND.teal }}>
          Local
        </Link>
        , tu es prévenu la veille quand TES conditions arrivent sur ton spot, calculé sur les
        prises de ton carnet.
      </Text>
    </Section>
  );
}

/**
 * Pied de page RGPD : pourquoi tu reçois ça + désinscription en UN clic (route
 * /unsubscribe, service-role idempotent, sprint 26). Obligatoire sur tout email
 * de catégorie marketing.
 */
export function UnsubFooter({
  unsubToken,
  campaign,
  reason,
}: {
  unsubToken?: string;
  campaign: string;
  reason: string;
}) {
  // Token absent (colonne nulle sur un vieux profil) : on affiche le réglage plutôt
  // qu'un lien de désinscription cassé. Le lien un clic reste la voie normale.
  return (
    <Text style={{ fontSize: "12px", color: BRAND.inkSoft, margin: "24px 0 0" }}>
      {reason}{" "}
      <Link href={lifecycleUrl("/notifications", campaign)} style={{ color: BRAND.inkSoft }}>
        Gérer mes emails
      </Link>
      {unsubToken ? (
        <>
          {" "}
          ·{" "}
          <Link
            href={`${SITE_URL}/unsubscribe?token=${unsubToken}`}
            style={{ color: BRAND.inkSoft }}
          >
            Me désinscrire en un clic
          </Link>
        </>
      ) : null}
      .
    </Text>
  );
}
