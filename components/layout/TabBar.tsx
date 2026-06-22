'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { NotebookText, Map, MessageCircle, User, Plus } from 'lucide-react'
import { cn } from '@/lib/utils'

const TABS = [
  { label: 'Carnet', href: '/carnet', match: '/carnet', Icon: NotebookText },
  { label: 'Carte', href: '/carte', match: '/carte', Icon: Map },
  // FAB central inséré entre les deux paires
  { label: 'Fil', href: '/fil', match: '/fil', Icon: MessageCircle },
  { label: 'Profil', href: '/profil', match: '/profil', Icon: User },
] as const

function Tab({
  label,
  href,
  active,
  Icon,
}: {
  label: string
  href: string
  active: boolean
  Icon: (typeof TABS)[number]['Icon']
}) {
  return (
    <Link
      href={href}
      aria-current={active ? 'page' : undefined}
      className={cn(
        'flex min-h-11 w-14 flex-col items-center justify-end gap-0.5 pb-0.5 text-[10px] font-semibold',
        active ? 'text-navy-900' : 'text-ink-400',
      )}
    >
      <Icon size={21} strokeWidth={1.7} aria-hidden="true" />
      {label}
    </Link>
  )
}

/**
 * Tab bar mobile DA v2 (< 960 px) : Carnet · Carte · FAB « + » central
 * (l'action n°1 du produit) · Fil · Profil. Identique en PWA et en natif.
 */
export function TabBar() {
  const pathname = usePathname()

  return (
    <nav
      aria-label="Navigation principale"
      className="fixed inset-x-0 bottom-0 z-40 flex items-end justify-around border-t border-sand-200 bg-white px-2 pt-1.5 desk:hidden will-change-transform"
      style={{ paddingBottom: 'calc(0.625rem + env(safe-area-inset-bottom))' }}
    >
      {TABS.slice(0, 2).map((t) => (
        <Tab key={t.href} {...t} active={pathname.startsWith(t.match)} />
      ))}

      <Link
        href="/carnet/nouvelle"
        aria-label="Loguer une prise"
        className="-mt-7 flex size-[52px] items-center justify-center rounded-full border-4 border-sand-50 bg-teal-500 text-navy-950 shadow-[0_4px_14px_rgba(20,184,166,.4)] transition-colors hover:bg-teal-300"
      >
        <Plus size={26} strokeWidth={2.2} aria-hidden="true" />
      </Link>

      {TABS.slice(2).map((t) => (
        <Tab key={t.href} {...t} active={pathname.startsWith(t.match)} />
      ))}
    </nav>
  )
}
