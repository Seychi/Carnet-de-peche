import 'server-only'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'

// Client Supabase service-role : bypass la RLS. À N'UTILISER QUE côté serveur
// (routes API, crons). Ne JAMAIS l'importer dans du code client — la clé
// service_role donne un accès total à la base.
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !serviceKey) {
    throw new Error(
      'Client admin indisponible : NEXT_PUBLIC_SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY manquante.'
    )
  }

  return createSupabaseClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}
