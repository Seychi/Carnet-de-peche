'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { analytics } from '@/lib/analytics'

/**
 * CTA primaire du hero, auth-aware SANS rendre la home dynamique.
 *
 * La page reste statique (ISR `revalidate=3600`) : ce composant s'hydrate côté
 * client et lit la session via le client navigateur. Le rendu INITIAL (statique,
 * servi au CDN et aux bots) est toujours la variante anonyme « Créer mon carnet »
 * → bon pour le SEO. Une fois hydraté, si une session existe, le CTA bascule en
 * « Aller à mon carnet » → /home (plus aucune invitation à se réinscrire).
 *
 * Aucun fetch serveur ajouté sur la home : le check session est client-only
 * (getSession lit le store local, pas de round-trip réseau → bascule quasi
 * instantanée, flash négligeable pour les connectés).
 */
export function HeroPrimaryCta({
  className,
  registerLabel,
  event,
}: {
  className?: string
  registerLabel: string
  /** Identifiant d'event PostHog (conversion) à émettre au clic. Optionnel. */
  event?: string
}) {
  const [authed, setAuthed] = useState(false)

  useEffect(() => {
    let active = true
    const supabase = createClient()
    supabase.auth.getSession().then(({ data }) => {
      if (active) setAuthed(!!data.session)
    })
    return () => {
      active = false
    }
  }, [])

  const href = authed ? '/home' : '/auth/register'
  const label = authed ? 'Aller à mon carnet' : registerLabel

  return (
    <Link
      href={href}
      className={className}
      onClick={event ? () => analytics.homeCtaClicked({ cta: event }) : undefined}
    >
      {label}
      <ArrowRight size={16} strokeWidth={1.7} />
    </Link>
  )
}
