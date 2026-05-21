import { z } from "zod";

// En prod (Vercel), les vars serveur sont requises : un build qui échoue vaut mieux
// qu'un silent fail runtime (ex. cron 401 faute de CRON_SECRET). En dev/preview,
// elles restent optionnelles pour ne pas bloquer `pnpm dev`.
const isProd = process.env.VERCEL_ENV === "production";

const envSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  SUPABASE_PROJECT_REF: z.string().min(1).optional(),
  // Serveur uniquement — required en prod, optionnels en dev/preview
  SUPABASE_SERVICE_ROLE_KEY: isProd ? z.string().min(1) : z.string().min(1).optional(),
  CRON_SECRET: isProd ? z.string().min(8) : z.string().optional(),
});

const _env = envSchema.safeParse({
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  SUPABASE_PROJECT_REF: process.env.SUPABASE_PROJECT_REF,
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
  CRON_SECRET: process.env.CRON_SECRET,
});

if (!_env.success) {
  console.error("❌ Variables d'environnement invalides :", _env.error.format());
  throw new Error("Variables d'environnement manquantes ou invalides. Vérifie ton .env.local.");
}

export const env = _env.data;
