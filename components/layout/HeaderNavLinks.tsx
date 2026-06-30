'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

// Nav desktop du header marketing, isolée en client pour porter aria-current
// (le Header est un Server Component). Repère de page active doublé : couleur
// ET soulignement persistant (jamais l'info par la seule teinte, sprint 56).
const NAV_LINKS = [
  { label: 'Carte', href: '/carte' },
  { label: 'Spots', href: '/spots' },
  { label: 'Espèces', href: '/especes' },
  { label: 'Guides', href: '/guides' },
  { label: 'Tarifs', href: '/tarifs' },
]

export function HeaderNavLinks() {
  const pathname = usePathname()
  return (
    <nav className="hidden lg:flex gap-6 items-center">
      {NAV_LINKS.map((item) => {
        const active = pathname === item.href || pathname.startsWith(`${item.href}/`)
        return (
          <Link
            key={item.label}
            href={item.href}
            aria-current={active ? 'page' : undefined}
            className="relative inline-flex items-center min-h-[44px] text-[15px] font-medium text-ink-700 transition-colors hover:text-navy-900 after:pointer-events-none after:absolute after:bottom-[9px] after:left-0 after:h-[2px] after:w-0 after:rounded-full after:bg-teal-500 after:transition-[width] after:duration-300 hover:after:w-full focus-visible:after:w-full aria-[current=page]:text-navy-900 aria-[current=page]:after:w-full"
          >
            {item.label}
          </Link>
        )
      })}
    </nav>
  )
}
