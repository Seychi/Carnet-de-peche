'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import type { FeedTab } from '@/lib/feed/types'

const TABS: { key: FeedTab; label: string }[] = [
  { key: 'dept', label: 'Ton département' },
  { key: 'follows', label: 'Tes follows' },
  { key: 'all', label: 'Toute la côte' },
]

export function FeedTabs({ current }: { current: FeedTab }) {
  const pathname = usePathname()

  return (
    <div className="relative border-b border-ink-100">
      {/* Fondu droit : affordance scroll sur très petit écran (mobile only ;
          couleur = fond de page sand-50, pas blanc, pour ne pas masquer en clair) */}
      <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-8 bg-gradient-to-l from-sand-50 to-transparent sm:hidden" aria-hidden="true" />
      <nav className="flex gap-1 overflow-x-auto pr-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {TABS.map((t) => {
          const active = t.key === current
          const href = t.key === 'dept' ? pathname : `${pathname}?tab=${t.key}`
          return (
            <Link
              key={t.key}
              href={href}
              scroll={false}
              aria-current={active ? 'page' : undefined}
              className={`whitespace-nowrap min-h-11 flex items-center px-2 sm:px-3 text-[12px] sm:text-[14px] font-semibold border-b-2 -mb-px transition-colors ${
                active
                  ? 'border-teal-500 text-navy-900'
                  : 'border-transparent text-ink-400 hover:text-ink-600'
              }`}
            >
              {t.label}
            </Link>
          )
        })}
      </nav>
    </div>
  )
}
