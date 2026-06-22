'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import type { FeedTab } from '@/lib/feed/types'

const TABS: { key: FeedTab; label: string }[] = [
  { key: 'dept', label: 'Ton département' },
  { key: 'follows', label: 'Tes follows' },
  { key: 'all', label: 'Tous les départements côtiers' },
]

export function FeedTabs({ current }: { current: FeedTab }) {
  const pathname = usePathname()

  return (
    <nav className="flex gap-1 border-b border-ink-100 overflow-x-auto pr-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {TABS.map((t) => {
        const active = t.key === current
        const href = t.key === 'dept' ? pathname : `${pathname}?tab=${t.key}`
        return (
          <Link
            key={t.key}
            href={href}
            scroll={false}
            aria-current={active ? 'page' : undefined}
            className={`whitespace-nowrap min-h-11 flex items-center px-2.5 sm:px-3 text-[13px] sm:text-[14px] font-semibold border-b-2 -mb-px transition-colors ${
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
  )
}
