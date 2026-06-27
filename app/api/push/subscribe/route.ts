import { NextResponse, type NextRequest } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'

// Web Push — enregistrement d'un abonnement (sprint 39, WS B).
// Runtime Node (pas edge) : aligné avec le reste du canal push. Authentifié :
// l'abonnement est inséré pour `auth.uid()` (RLS owner-only, migration 065).
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const bodySchema = z.object({
  endpoint: z.string().url({ message: 'Endpoint d’abonnement invalide.' }),
  keys: z.object({
    p256dh: z.string().min(1, { message: 'Clé p256dh manquante.' }),
    auth: z.string().min(1, { message: 'Clé auth manquante.' }),
  }),
})

// POST /api/push/subscribe
// Body : { endpoint, keys: { p256dh, auth } } (sortie de subscription.toJSON()).
// Upsert sur `endpoint` (unique) : un device qui se ré-abonne rafraîchit ses clés
// sans créer de doublon. 401 si non connecté.
export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json(
      { error: 'Connecte-toi pour activer les alertes.' },
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
    return NextResponse.json(
      { error: 'Abonnement invalide.', details: parsed.error.flatten().fieldErrors },
      { status: 400 },
    )
  }

  const { endpoint, keys } = parsed.data
  const ua = request.headers.get('user-agent')

  // Upsert on conflict (endpoint) : le device peut rafraîchir ses clés. RLS
  // (insert/update own) garantit qu'on ne touche que les lignes de ce user.
  const { error } = await supabase.from('push_subscriptions').upsert(
    {
      user_id: user.id,
      endpoint,
      p256dh: keys.p256dh,
      auth: keys.auth,
      ua,
    },
    { onConflict: 'endpoint' },
  )

  if (error) {
    console.error('[push/subscribe] upsert échec :', error.message)
    return NextResponse.json(
      { error: 'Impossible d’enregistrer ton abonnement.' },
      { status: 500 },
    )
  }

  return NextResponse.json({ ok: true })
}
