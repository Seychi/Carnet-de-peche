import * as React from "react";
import { describe, it, expect } from "vitest";
import { render } from "@react-email/components";
import WelcomeTrialEmail from "../welcome-trial";
import TrialDay5Email from "../trial-day-5";
import PaymentFailedEmail from "../payment-failed";
import SubscriptionCanceledEmail from "../subscription-canceled";

// Vérifie que chaque template se rend en HTML non vide et contient son contenu
// clé. Headless — pas d'envoi, pas de serveur preview (Resend = sprint 11).
describe("templates emails (rendu HTML)", () => {
  it("welcome-trial mentionne l'essai et le plan", async () => {
    const html = await render(<WelcomeTrialEmail firstName="Julien" planLabel="Local" />);
    expect(html).toContain("Bienvenue");
    expect(html).toContain("Local");
    expect(html).toContain("/carnet/nouvelle");
  });

  it("trial-day-5 mentionne les jours restants et le montant", async () => {
    const html = await render(
      <TrialDay5Email daysLeft={2} amount="4,90 €" dateLabel="28 mai" />
    );
    expect(html).toContain("2 jour");
    expect(html).toContain("4,90");
    expect(html).toContain("/compte/abonnement");
  });

  it("payment-failed renvoie vers la mise à jour de la carte", async () => {
    const html = await render(<PaymentFailedEmail firstName="Julien" />);
    expect(html).toContain("paiement");
    expect(html).toContain("/compte/abonnement");
  });

  it("subscription-canceled indique la date de fin d'accès", async () => {
    const html = await render(<SubscriptionCanceledEmail accessUntil="28 juin 2026" />);
    expect(html).toContain("28 juin 2026");
    expect(html).toContain("/tarifs");
  });
});
