import { NextResponse, type NextRequest } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'

// Web Push — désinscription d'un abonnement (sprint 39, WS B).
// Runtime Node (pas edge). Authentifié : on ne supprime que les abonnements du
// user courant (RLS delete own, migration 065). Le filtre `endpoint` cible le
// device concerné (l'autre côté, le client appelle subscription.unsubscribe()).
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const bodySchema = z.object({
  endpoint: z.string().url({ message: 'Endpoint d’abonnement invalide.' }),
})

// POST /api/push/unsubscribe
// Body : { endpoint } → supprime la ligne (own) correspondante.
export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json(
      { error: 'Connecte-toi pour gérer tes alertes.' },
      { status: 401 },
    )
  }

  let raw: unknown
  try {
    raw = await request.json()
  } catch {
    return NextResponse.json({ error: 'Corps de requête invalide.' }, { status: 400 })
  }

  const parsed = bodySchema.safeParse(raw)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Endpoint invalide.' }, { status: 400 })
  }

  // RLS delete own : redondant avec le filtre user_id, mais explicite = défense en
  // profondeur (on ne peut de toute façon pas supprimer l'abonnement d'autrui).
  const { error } = await supabase
    .from('push_subscriptions')
    .delete()
    .eq('endpoint', parsed.data.endpoint)
    .eq('user_id', user.id)

  if (error) {
    console.error('[push/unsubscribe] delete échec :', error.message)
    return NextResponse.json(
      { error: 'Impossible de désactiver ton abonnement.' },
      { status: 500 },
    )
  }

  return NextResponse.json({ ok: true })
}
