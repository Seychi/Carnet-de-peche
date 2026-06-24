'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, NotebookText, Map, MessageCircle, User, Users, Handshake, Fish, BookOpen, type LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

// Groupe principal « mon espace ».
const ITEMS = [
  { label: 'Accueil', href: '/home', match: '/home', Icon: Home },
  { label: 'Mon carnet', href: '/carnet', match: '/carnet', Icon: NotebookText },
  { label: 'Carte', href: '/carte', match: '/carte', Icon: Map },
  { label: 'Fil', href: '/fil', match: '/fil', Icon: MessageCircle },
  { label: 'Mes pêcheurs', href: '/follows', match: '/follows', Icon: Users },
  { label: 'Co-pêchage', href: '/sorties', match: '/sorties', Icon: Handshake },
  { label: 'Profil', href: '/profil', match: '/profil', Icon: User },
] as const

// Groupe « Découvrir » — pont vers l'éditorial (sinon inaccessible depuis le shell app).
const DISCOVER = [
  { label: 'Espèces', href: '/especes', match: '/especes', Icon: Fish },
  { label: 'Guides', href: '/guides', match: '/guides', Icon: BookOpen },
] as const

/** Sidebar app desktop (≥ 960 px) — item actif navy plein (DA v2). */
export function AppSidebar() {
  const pathname = usePathname()

  function renderItem({
    label,
    href,
    match,
    Icon,
  }: {
    label: string
    href: string
    match: string
    Icon: LucideIcon
  }) {
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
  }

  return (
    <aside className="hidden border-r border-sand-200 bg-white p-3.5 desk:block">
      <nav className="sticky top-[116px] flex flex-col gap-0.5" aria-label="Navigation de l'app">
        {ITEMS.map(renderItem)}

        <p className="mt-3 mb-1 px-3.5 font-mono text-[11px] font-medium uppercase tracking-[0.1em] text-ink-400">
          Découvrir
        </p>
        {DISCOVER.map(renderItem)}
      </nav>
    </aside>
  )
}
