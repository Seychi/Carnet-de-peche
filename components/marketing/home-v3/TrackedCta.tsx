'use client'

import Link from 'next/link'
import { analytics } from '@/lib/analytics'

/**
 * Lien CTA de la home qui émet un event PostHog de conversion au clic (no-op sans
 * consentement / hors navigateur). Permet de tracker des CTA rendus dans des Server
 * Components (HomeSections) sans les passer client.
 */
export function TrackedCta({
  href,
  event,
  className,
  children,
}: {
  href: string
  event: string
  className?: string
  children: React.ReactNode
}) {
  return (
    <Link
      href={href}
      className={className}
      onClick={() => analytics.homeCtaClicked({ cta: event })}
    >
      {children}
    </Link>
  )
}
