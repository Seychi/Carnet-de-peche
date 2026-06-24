import type { Metadata } from 'next'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { unsubscribeByToken } from './actions'
import { ResubscribeButton } from './resubscribe-button'

// Page publique de désinscription marketing (lien email, sans login). On effectue
// la désinscription dès le chargement à partir du token — 1 clic, conforme RGPD.
export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Désinscription — Carnet de Pêche',
  robots: { index: false, follow: false },
}

export default async function UnsubscribePage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>
}) {
  const { token } = await searchParams
  const done = token ? await unsubscribeByToken(token) : false

  // Si l'utilisateur est connecté, on lui offre de réactiver en 1 clic.
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  return (
    <div className="max-w-xl mx-auto px-6 py-20 text-center">
      {done ? (
        <>
          <h1 className="font-display text-2xl font-bold text-navy-900">C&rsquo;est noté.</h1>
          <p className="mt-4 text-ink-600 leading-relaxed">
            Tu ne recevras plus d&rsquo;emails de relance ni de conseils de notre part. Les emails
            liés à ton compte (essai, paiement) continuent, eux, d&rsquo;arriver — ils font partie du
            service.
          </p>
          {user ? (
            <div className="mt-8">
              <ResubscribeButton />
            </div>
          ) : (
            <p className="mt-6 text-sm text-ink-500">
              Tu changes d&rsquo;avis ? Tu pourras réactiver ces emails depuis{' '}
              <Link href="/compte/abonnement" className="text-teal-700 underline">
                ton compte
              </Link>
              .
            </p>
          )}
        </>
      ) : (
        <>
          <h1 className="font-display text-2xl font-bold text-navy-900">Lien invalide</h1>
          <p className="mt-4 text-ink-600 leading-relaxed">
            Ce lien de désinscription n&rsquo;est pas valide ou a expiré. Si tu veux gérer tes
            préférences d&rsquo;email, fais-le depuis ton compte.
          </p>
          <div className="mt-8">
            <Link
              href="/compte/abonnement"
              className="inline-block px-6 py-3 rounded-[12px] bg-teal-500 hover:bg-teal-400 text-navy-950 font-semibold text-sm transition-colors duration-200"
            >
              Gérer mes préférences
            </Link>
          </div>
        </>
      )}
    </div>
  )
}
