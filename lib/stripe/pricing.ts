import { env } from "@/lib/env";

// Single source of truth du mapping price_id ↔ plan. Les price_ids viennent des
// env vars (renseignées depuis le Stripe Dashboard). On choisit le jeu LIVE en
// prod, TEST ailleurs — cohérent avec lib/stripe/client.ts.
const isProd = process.env.VERCEL_ENV === "production";

export type PlanInterval = "monthly" | "annual";
export type PaidPlan = "local" | "itinerant";

export const STRIPE_PRICES = {
  local: {
    monthly: isProd ? env.STRIPE_PRICE_LOCAL_MONTHLY : env.STRIPE_TEST_PRICE_LOCAL_MONTHLY,
    annual: isProd ? env.STRIPE_PRICE_LOCAL_ANNUAL : env.STRIPE_TEST_PRICE_LOCAL_ANNUAL,
  },
  itinerant: {
    monthly: isProd ? env.STRIPE_PRICE_ITINERANT_MONTHLY : env.STRIPE_TEST_PRICE_ITINERANT_MONTHLY,
    annual: isProd ? env.STRIPE_PRICE_ITINERANT_ANNUAL : env.STRIPE_TEST_PRICE_ITINERANT_ANNUAL,
  },
} as const satisfies Record<PaidPlan, Record<PlanInterval, string>>;

// Map inverse price_id → plan. Construite au chargement à partir de STRIPE_PRICES.
export const STRIPE_PRICE_TO_PLAN: Record<string, PaidPlan> = {
  [STRIPE_PRICES.local.monthly]: "local",
  [STRIPE_PRICES.local.annual]: "local",
  [STRIPE_PRICES.itinerant.monthly]: "itinerant",
  [STRIPE_PRICES.itinerant.annual]: "itinerant",
};

/** Retourne le plan associé à un price_id Stripe, ou null si inconnu. */
export function priceIdToPlan(priceId: string): PaidPlan | null {
  return STRIPE_PRICE_TO_PLAN[priceId] ?? null;
}

/** Résout le price_id à partir d'un couple (plan, interval). */
export function planToPriceId(plan: PaidPlan, interval: PlanInterval): string {
  return STRIPE_PRICES[plan][interval];
}
