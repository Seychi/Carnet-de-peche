import { z } from "zod";

// En prod (Vercel), les vars serveur sont requises : un build qui échoue vaut mieux
// qu'un silent fail runtime (ex. cron 401 faute de CRON_SECRET). En dev/preview,
// elles restent optionnelles pour ne pas bloquer `pnpm dev`.
const isProd = process.env.VERCEL_ENV === "production";

// --- Stripe ---------------------------------------------------------------
// On charge TOUTES les vars Stripe en `string` (défaut "" pour garder un type
// stable côté lib/stripe/pricing.ts), puis on impose via superRefine la présence
// du jeu correspondant à l'environnement actif :
//   - prod  → clés/price_ids LIVE requis
//   - dev/preview → clés/price_ids TEST requis
// Le jeu non-actif reste optionnel (jamais lu). Aucun fallback silencieux sur
// le jeu actif : si une var manque, le parse échoue (fail-fast).
const stripeStr = z.string().default("");

const envSchema = z
  .object({
    NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
    NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
    SUPABASE_PROJECT_REF: z.string().min(1).optional(),
    // Serveur uniquement — required en prod, optionnels en dev/preview
    SUPABASE_SERVICE_ROLE_KEY: isProd ? z.string().min(1) : z.string().min(1).optional(),
    CRON_SECRET: isProd ? z.string().min(8) : z.string().optional(),

    // Stripe — LIVE (prod)
    STRIPE_SECRET_KEY: stripeStr,
    STRIPE_WEBHOOK_SECRET: stripeStr,
    NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: stripeStr,
    STRIPE_PRICE_LOCAL_MONTHLY: stripeStr,
    STRIPE_PRICE_LOCAL_ANNUAL: stripeStr,
    STRIPE_PRICE_ITINERANT_MONTHLY: stripeStr,
    STRIPE_PRICE_ITINERANT_ANNUAL: stripeStr,

    // Stripe — TEST (dev + preview)
    STRIPE_TEST_SECRET_KEY: stripeStr,
    STRIPE_TEST_WEBHOOK_SECRET: stripeStr,
    NEXT_PUBLIC_STRIPE_TEST_PUBLISHABLE_KEY: stripeStr,
    STRIPE_TEST_PRICE_LOCAL_MONTHLY: stripeStr,
    STRIPE_TEST_PRICE_LOCAL_ANNUAL: stripeStr,
    STRIPE_TEST_PRICE_ITINERANT_MONTHLY: stripeStr,
    STRIPE_TEST_PRICE_ITINERANT_ANNUAL: stripeStr,
  })
  .superRefine((data, ctx) => {
    const required: (keyof typeof data)[] = isProd
      ? [
          "STRIPE_SECRET_KEY",
          "STRIPE_WEBHOOK_SECRET",
          "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY",
          "STRIPE_PRICE_LOCAL_MONTHLY",
          "STRIPE_PRICE_LOCAL_ANNUAL",
          "STRIPE_PRICE_ITINERANT_MONTHLY",
          "STRIPE_PRICE_ITINERANT_ANNUAL",
        ]
      : [
          "STRIPE_TEST_SECRET_KEY",
          "STRIPE_TEST_WEBHOOK_SECRET",
          "NEXT_PUBLIC_STRIPE_TEST_PUBLISHABLE_KEY",
          "STRIPE_TEST_PRICE_LOCAL_MONTHLY",
          "STRIPE_TEST_PRICE_LOCAL_ANNUAL",
          "STRIPE_TEST_PRICE_ITINERANT_MONTHLY",
          "STRIPE_TEST_PRICE_ITINERANT_ANNUAL",
        ];

    for (const key of required) {
      if (!data[key] || (data[key] as string).length === 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: [key],
          message: `Variable Stripe requise en ${isProd ? "production" : "dev/preview"} : ${key}`,
        });
      }
    }
  });

const _env = envSchema.safeParse({
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  SUPABASE_PROJECT_REF: process.env.SUPABASE_PROJECT_REF,
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
  CRON_SECRET: process.env.CRON_SECRET,

  STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY,
  STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET,
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY,
  STRIPE_PRICE_LOCAL_MONTHLY: process.env.STRIPE_PRICE_LOCAL_MONTHLY,
  STRIPE_PRICE_LOCAL_ANNUAL: process.env.STRIPE_PRICE_LOCAL_ANNUAL,
  STRIPE_PRICE_ITINERANT_MONTHLY: process.env.STRIPE_PRICE_ITINERANT_MONTHLY,
  STRIPE_PRICE_ITINERANT_ANNUAL: process.env.STRIPE_PRICE_ITINERANT_ANNUAL,

  STRIPE_TEST_SECRET_KEY: process.env.STRIPE_TEST_SECRET_KEY,
  STRIPE_TEST_WEBHOOK_SECRET: process.env.STRIPE_TEST_WEBHOOK_SECRET,
  NEXT_PUBLIC_STRIPE_TEST_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_STRIPE_TEST_PUBLISHABLE_KEY,
  STRIPE_TEST_PRICE_LOCAL_MONTHLY: process.env.STRIPE_TEST_PRICE_LOCAL_MONTHLY,
  STRIPE_TEST_PRICE_LOCAL_ANNUAL: process.env.STRIPE_TEST_PRICE_LOCAL_ANNUAL,
  STRIPE_TEST_PRICE_ITINERANT_MONTHLY: process.env.STRIPE_TEST_PRICE_ITINERANT_MONTHLY,
  STRIPE_TEST_PRICE_ITINERANT_ANNUAL: process.env.STRIPE_TEST_PRICE_ITINERANT_ANNUAL,
});

if (!_env.success) {
  console.error("❌ Variables d'environnement invalides :", _env.error.format());
  throw new Error("Variables d'environnement manquantes ou invalides. Vérifie ton .env.local.");
}

export const env = _env.data;
