import "server-only";
import Stripe from "stripe";
import { env } from "@/lib/env";

// Client Stripe — SERVEUR UNIQUEMENT (import "server-only" casse le build si
// quelqu'un l'importe dans un Client Component). On choisit les clés selon
// l'environnement Vercel : LIVE en production, TEST partout ailleurs
// (dev + preview). Pas de fallback : si la clé attendue manque, lib/env a déjà
// fait échouer le parse (fail-fast).
const isProd = process.env.VERCEL_ENV === "production";

export const stripe = new Stripe(
  isProd ? env.STRIPE_SECRET_KEY : env.STRIPE_TEST_SECRET_KEY,
  {
    // Pinnée sur la version embarquée par le SDK stripe (cf node_modules/stripe).
    apiVersion: "2026-04-22.dahlia",
    typescript: true,
    appInfo: {
      name: "Carnet de Pêche",
      version: "1.0.0",
      url: "https://www.carnet-de-peche.com",
    },
  }
);

// Clé publishable exposée au client (OK côté navigateur).
export const STRIPE_PUBLISHABLE_KEY = isProd
  ? env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
  : env.NEXT_PUBLIC_STRIPE_TEST_PUBLISHABLE_KEY;

// Secret de vérification de signature webhook (selon l'environnement).
export const STRIPE_WEBHOOK_SECRET = isProd
  ? env.STRIPE_WEBHOOK_SECRET
  : env.STRIPE_TEST_WEBHOOK_SECRET;
