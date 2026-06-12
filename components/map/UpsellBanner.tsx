'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { X } from 'lucide-react'

const COOKIE_NAME = 'upsell-dismissed-at'
const DISMISS_DURATION_DAYS = 7

export default function UpsellBanner() {
  const [visible, setVisible] = useState(true)
  const [entered, setEntered] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => setEntered(true), 60)
    return () => clearTimeout(timer)
  }, [])

  function handleDismiss() {
    const maxAge = DISMISS_DURATION_DAYS * 24 * 60 * 60
    document.cookie = `${COOKIE_NAME}=${Date.now()}; path=/; max-age=${maxAge}; SameSite=Lax`
    setVisible(false)
  }

  if (!visible) return null

  return (
    <div
      className={[
        'fixed bottom-0 left-0 right-0 z-40',
        'transition-transform duration-300 ease-out',
        entered ? 'translate-y-0' : 'translate-y-full',
      ].join(' ')}
    >
      <div className="mx-auto max-w-2xl px-3 pb-3">
        <div className="bg-navy-900 border-t-2 border-teal-500 rounded-2xl px-4 py-3 shadow-xl flex items-center gap-3">
          <p className="flex-1 text-sm text-white/90 leading-snug">
            Tu vois <span className="text-white font-semibold">3 spots par département</span>. Passe en{' '}
            <span className="text-teal-400 font-semibold">Local</span> (4,90 €/mois) pour la carte
            complète, les filtres et le score.
          </p>
          <div className="flex items-center gap-2 shrink-0">
            <Link
              href="/tarifs"
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
