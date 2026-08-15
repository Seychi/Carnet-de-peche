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

    // Web Push VAPID (sprint 39) — canal push « fenêtre optimale ».
    // OPTIONNELLES même en prod (choix volontaire) : sans elles, le push est INACTIF
    // (sendPushToUser no-op, l'abonnement client no-op) mais l'app fonctionne. Les
    // rendre `min(1)` en prod ferait throw env.ts au chargement → toute l'app casserait
    // tant que les clés ne sont pas posées dans Vercel. Désactivation propre > fail-fast.
    // `NEXT_PUBLIC_VAPID_PUBLIC_KEY` est une clé publique (inline côté client OK) ;
    // `VAPID_PRIVATE_KEY` reste serveur uniquement (jamais exposée au client).
    VAPID_PRIVATE_KEY: z.string().optional(),
    NEXT_PUBLIC_VAPID_PUBLIC_KEY: z.string().optional(),
    VAPID_SUBJECT: z.string().optional(),

    // Emails transactionnels (sprint 11 Bloc C) — requis en prod
    RESEND_API_KEY: isProd ? z.string().startsWith("re_") : z.string().optional(),
    // Webhook Resend (sprint 78) — alimente la liste de suppression sur rebond
    // dur ou plainte. VOLONTAIREMENT optionnel même en prod : l'endpoint doit
    // pouvoir être déployé AVANT d'être déclaré côté Resend. Sans secret, la
    // route répond 500 et rien d'autre ne casse. À rendre requis une fois le
    // webhook branché (cf docs/sprint-78/RECAP.md, reste manuel John).
    RESEND_WEBHOOK_SECRET: z.string().optional(),
    // Monitoring (sprint 11 Bloc D) — requis en prod (DSN public, pas un secret)
    NEXT_PUBLIC_SENTRY_DSN: isProd ? z.string().url() : z.string().optional(),

    // Analytics PostHog (sprint 26 / D-F1) — mesure d'audience EU sous consentement.
    // Clé publique (projet), pas un secret. Requise en prod ; optionnelle ailleurs
    // (sans elle, l'instrumentation est entièrement no-op : ni capture client ni serveur).
    NEXT_PUBLIC_POSTHOG_KEY: isProd ? z.string().min(1) : z.string().optional(),
    NEXT_PUBLIC_POSTHOG_HOST: z.string().url().default("https://eu.i.posthog.com"),

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
  VAPID_PRIVATE_KEY: process.env.VAPID_PRIVATE_KEY,
  NEXT_PUBLIC_VAPID_PUBLIC_KEY: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
  VAPID_SUBJECT: process.env.VAPID_SUBJECT,
  RESEND_API_KEY: process.env.RESEND_API_KEY,
  RESEND_WEBHOOK_SECRET: process.env.RESEND_WEBHOOK_SECRET,
  NEXT_PUBLIC_SENTRY_DSN: process.env.NEXT_PUBLIC_SENTRY_DSN,
  NEXT_PUBLIC_POSTHOG_KEY: process.env.NEXT_PUBLIC_POSTHOG_KEY,
  NEXT_PUBLIC_POSTHOG_HOST: process.env.NEXT_PUBLIC_POSTHOG_HOST,

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
