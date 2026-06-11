'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, NotebookText, Map, MessageCircle, User } from 'lucide-react'
import { cn } from '@/lib/utils'

const ITEMS = [
  { label: 'Accueil', href: '/home', match: '/home', Icon: Home },
  { label: 'Mon carnet', href: '/carnet', match: '/carnet', Icon: NotebookText },
  { label: 'Carte', href: '/carte', match: '/carte', Icon: Map },
  { label: 'Fil', href: '/fil', match: '/fil', Icon: MessageCircle },
  { label: 'Profil', href: '/profil', match: '/profil', Icon: User },
] as const

/** Sidebar app desktop (≥ 960 px) — item actif navy plein (DA v2). */
export function AppSidebar() {
  const pathname = usePathname()

  return (
    <aside className="hidden border-r border-sand-200 bg-white p-3.5 desk:block">
      <nav className="sticky top-[116px] flex flex-col gap-0.5" aria-label="Navigation de l'app">
        {ITEMS.map(({ label, href, match, Icon }) => {
          const active = pathname.startsWith(match)
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? 'page' : undefined}
              className={cn(
                'flex min-h-11 items-center gap-3 rounded-[10px] px-3.5 text-[15px] font-medium transition-colors',
                active ? 'bg-navy-900 text-white' : 'text-ink-600 hover:bg-sand-100',
              )}
            >
              <Icon size={20} strokeWidth={1.7} aria-hidden="true" />
              {label}
            </Link>
          )
        })}
      </nav>
    </aside>
  )
}
