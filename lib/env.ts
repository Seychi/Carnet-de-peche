import { z } from "zod";

const envSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  SUPABASE_PROJECT_REF: z.string().min(1).optional(),
});

const _env = envSchema.safeParse({
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  SUPABASE_PROJECT_REF: process.env.SUPABASE_PROJECT_REF,
});

if (!_env.success) {
  console.error("❌ Variables d'environnement invalides :", _env.error.format());
  throw new Error("Variables d'environnement manquantes ou invalides. Vérifie ton .env.local.");
}

export const env = _env.data;
