import "server-only";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/types";
import { env } from "@/lib/env";

// Client Supabase service-role : bypass total de la RLS. À utiliser
// EXCLUSIVEMENT côté serveur dans les webhook handlers Stripe et scripts admin.
// Ne JAMAIS l'importer dans un Client Component (la clé service_role donne un
// accès complet à la base). En sprint 9, c'est la SEULE voie d'écriture autorisée
// dans `subscriptions` (avec le seed dev) — Stripe reste la source de vérité.
export function createServiceRoleClient() {
  const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) {
    throw new Error(
      "createServiceRoleClient : SUPABASE_SERVICE_ROLE_KEY manquante (requise côté webhook)."
    );
  }

  return createClient<Database>(env.NEXT_PUBLIC_SUPABASE_URL, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
