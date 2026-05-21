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
