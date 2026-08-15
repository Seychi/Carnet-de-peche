'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { X } from 'lucide-react'
import { analytics } from '@/lib/analytics'
import { useBottomBarHeight } from '@/components/map/useBottomBarHeight'
import { useConsentBannerVisible } from '@/lib/hooks/useConsentBannerVisible'

const COOKIE_NAME = 'upsell-dismissed-at'
const DISMISS_DURATION_DAYS = 7
const SURFACE = 'map_banner'

export default function UpsellBanner() {
  const [visible, setVisible] = useState(true)
  const [entered, setEntered] = useState(false)
  // Sprint 81, Bloc 2 : une sollicitation a la fois (cf SignupBanner).
  const consentBannerVisible = useConsentBannerVisible()
  const shown = visible && !consentBannerVisible
  const barRef = useBottomBarHeight<HTMLDivElement>(shown)

  useEffect(() => {
    if (!shown) return
    const timer = setTimeout(() => setEntered(true), 60)
    analytics.paywallViewed({ surface: SURFACE })
    return () => clearTimeout(timer)
  }, [shown])

  function handleDismiss() {
    const maxAge = DISMISS_DURATION_DAYS * 24 * 60 * 60
    document.cookie = `${COOKIE_NAME}=${Date.now()}; path=/; max-age=${maxAge}; SameSite=Lax`
    setVisible(false)
  }

  if (!shown) return null

  return (
    <div
      ref={barRef}
      className={[
        // `sticky-bottom-bar` : sprint 79, Bloc 1 (cf app/globals.css).
        'sticky-bottom-bar fixed bottom-0 left-0 right-0 z-40',
        'transition-transform duration-300 ease-out',
        entered ? 'translate-y-0' : 'translate-y-full',
      ].join(' ')}
    >
      <div className="mx-auto max-w-2xl px-3 pb-3">
        <div className="bg-navy-900 border-t-2 border-teal-500 rounded-2xl px-4 py-3 shadow-xl flex items-center gap-3">
          {/* ⚠️ Sprint 77, Bloc 4 : ce bandeau ne s'adresse qu'aux comptes
              GRATUITS, et il leur annonçait « tu vois 3 spots par département ».
              Depuis la migration 110 c'est FAUX : un compte gratuit voit tous
              les spots. Ce qui lui manque réellement, c'est la précision des
              coordonnées, les filtres et les couches. On vend ça, pas autre chose. */}
          <p className="flex-1 text-sm text-white/90 leading-snug">
            Tu vois tous les spots, en{' '}
            <span className="text-white font-semibold">position approchée</span>. Passe en{' '}
            <span className="text-teal-400 font-semibold">Local</span> (4,90 €/mois) pour le GPS
            précis, les filtres et les couches.
          </p>
          <div className="flex items-center gap-2 shrink-0">
            <Link
              href="/tarifs"
              onClick={() => analytics.upsellClicked({ surface: SURFACE })}
              className="px-3 py-1.5 bg-teal-500 hover:bg-teal-400 text-navy-950 text-sm font-semibold rounded-xl transition-colors whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-300"
            >
              Voir les tarifs
            </Link>
            <button
              onClick={handleDismiss}
              aria-label="Fermer"
              className="p-1.5 rounded-full text-white/60 hover:text-white hover:bg-white/10 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50"
            >
              <X size={16} />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
