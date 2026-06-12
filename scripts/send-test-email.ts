/**
 * Envoi d'un email de TEST via Resend — QA délivrabilité + rendu (sprint 11
 * Bloc C : « rendu propre Gmail + Apple Mail »).
 *
 *   pnpm tsx scripts/send-test-email.ts <template> <destinataire>
 *   pnpm tsx scripts/send-test-email.ts welcome redkps4@gmail.com
 *
 * Templates : welcome · welcome-trial · trial-day-5 · payment-success ·
 * payment-failed · subscription-canceled (rendus avec leurs PreviewProps).
 * La clé est lue depuis .env.local (RESEND_API_KEY) ou l'env.
 * N'importe PAS lib/email/send.ts (marqué server-only) — même client Resend,
 * même expéditeur.
 */
import { readFileSync } from "node:fs";
import * as React from "react";
import { Resend } from "resend";

const FROM = "Carnet de Pêche <bonjour@carnet-de-peche.com>";

const TEMPLATES: Record<string, { file: string; subject: string }> = {
  welcome: { file: "../emails/welcome", subject: "Bienvenue dans Carnet de Pêche 🎣" },
  "welcome-trial": {
    file: "../emails/welcome-trial",
    subject: "Bienvenue dans Carnet de Pêche · Ton essai 7 jours démarre",
  },
  "trial-day-5": { file: "../emails/trial-day-5", subject: "Plus que 2 jours d'essai — toujours partant ?" },
  "payment-success": { file: "../emails/payment-success", subject: "Paiement reçu — bonne pêche 🎣" },
  "payment-failed": { file: "../emails/payment-failed", subject: "On n'a pas pu encaisser ton paiement" },
  "subscription-canceled": {
    file: "../emails/subscription-canceled",
    subject: "Ton abonnement est annulé — à bientôt",
  },
};

function loadApiKey(): string {
  if (process.env.RESEND_API_KEY) return process.env.RESEND_API_KEY;
  try {
    const envFile = readFileSync(new URL("../.env.local", import.meta.url), "utf8");
    const match = envFile.match(/^\s*RESEND_API_KEY\s*=\s*"?([^"\r\n]+)"?\s*$/m);
    if (match) return match[1];
  } catch {
    // .env.local absent — on tombe sur l'erreur explicite plus bas
  }
  throw new Error("RESEND_API_KEY introuvable (env ou .env.local).");
}

async function main() {
  const [templateName, to] = process.argv.slice(2);
  if (!templateName || !to || !TEMPLATES[templateName]) {
    console.error(
      `Usage : pnpm tsx scripts/send-test-email.ts <template> <destinataire>\nTemplates : ${Object.keys(TEMPLATES).join(" · ")}`
    );
    process.exit(1);
  }

  const { file, subject } = TEMPLATES[templateName];
  const mod = await import(file);
  const Template = mod.default;
  const props = Template.PreviewProps ?? {};

  const resend = new Resend(loadApiKey());
  const { data, error } = await resend.emails.send({
    from: FROM,
    to,
    subject: `[TEST] ${subject}`,
    react: React.createElement(Template, props),
  });

  if (error) {
    console.error(`❌ Échec Resend : ${error.name} — ${error.message}`);
    process.exit(1);
  }
  console.log(`✅ Email « ${templateName} » envoyé à ${to} (id: ${data?.id})`);
}

main();
