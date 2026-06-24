'use client'

import { useState, startTransition } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  MoreHorizontal,
  Home,
  User,
  Users,
  Handshake,
  Bell,
  Fish,
  BookOpen,
  Wrench,
  CreditCard,
  Shield,
  LogOut,
  type LucideIcon,
} from 'lucide-react'
import { signOut } from '@/app/actions/auth'
import { cn } from '@/lib/utils'
import { Sheet, SheetTrigger, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'

type Item = { label: string; href: string; match: string; Icon: LucideIcon }

// Groupes de l'overflow « Plus » : tout ce qui n'est PAS dans la tab bar
// (Carnet · Carte · + · Fil) doit être atteignable ici en ≤ 2 taps.
function buildGroups(isModerator: boolean): { title?: string; items: Item[] }[] {
  return [
    {
      items: [
        { label: 'Accueil', href: '/home', match: '/home', Icon: Home },
        { label: 'Profil', href: '/profil', match: '/profil', Icon: User },
        { label: 'Mes pêcheurs', href: '/follows', match: '/follows', Icon: Users },
        { label: 'Co-pêchage', href: '/sorties', match: '/sorties', Icon: Handshake },
        { label: 'Notifications', href: '/notifications', match: '/notifications', Icon: Bell },
      ],
    },
    {
      title: 'Découvrir',
      items: [
        { label: 'Espèces', href: '/especes', match: '/especes', Icon: Fish },
        { label: 'Guides', href: '/guides', match: '/guides', Icon: BookOpen },
        { label: 'Techniques', href: '/techniques', match: '/techniques', Icon: Wrench },
      ],
    },
    {
      items: [
        { label: 'Mon abonnement', href: '/compte/abonnement', match: '/compte', Icon: CreditCard },
        ...(isModerator
          ? [{ label: 'Modération', href: '/moderation', match: '/moderation', Icon: Shield } as Item]
          : []),
      ],
    },
  ]
}

/**
 * Onglet « Plus » (overflow) de la tab bar mobile + sa feuille.
 *
 * Pattern natif standard (indispensable au futur port Expo) : un bottom-sheet
 * accessible (focus trap + Esc + fermeture au tap extérieur, fournis par le
 * primitive base-ui `Sheet`) listant toutes les destinations hors tab bar.
 * Cibles ≥ 44 px, `aria-current` sur l'item actif, animation neutralisée si
 * `prefers-reduced-motion`.
 */
export function MoreMenu({ isModerator = false }: { isModerator?: boolean }) {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)

  const groups = buildGroups(isModerator)
  // « Plus » actif quand la route courante appartient à l'overflow.
  const overflowMatches = groups.flatMap((g) => g.items.map((i) => i.match))
  const plusActive = overflowMatches.some((m) => pathname.startsWith(m))

  function handleSignOut() {
    setOpen(false)
    startTransition(() => signOut('/'))
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger
        render={
          <button
            type="button"
            aria-label="Plus"
            aria-current={plusActive ? 'page' : undefined}
            className={cn(
              'flex min-h-11 w-14 flex-col items-center justify-end gap-0.5 pb-0.5 text-[10px] font-semibold',
              plusActive ? 'text-navy-900' : 'text-ink-400',
            )}
          />
        }
      >
        <MoreHorizontal size={21} strokeWidth={1.7} aria-hidden="true" />
        Plus
      </SheetTrigger>

      <SheetContent
        side="bottom"
        className="rounded-t-2xl pb-[calc(1rem+env(safe-area-inset-bottom))] motion-reduce:transition-none"
      >
        <SheetHeader>
          <SheetTitle>Plus</SheetTitle>
        </SheetHeader>

        <nav aria-label="Plus de navigation" className="max-h-[68svh] overflow-y-auto px-2 pb-2">
          {groups.map((group, gi) => (
            <div key={gi}>
              {gi > 0 && <div className="my-1.5 border-t border-ink-100" />}
              {group.title && (
                <p className="mt-1 mb-0.5 px-3 font-mono text-[11px] font-medium uppercase tracking-[0.1em] text-ink-400">
                  {group.title}
                </p>
              )}
              {group.items.map(({ label, href, match, Icon }) => {
                const active = pathname.startsWith(match)
                return (
                  <Link
                    key={href}
                    href={href}
                    onClick={() => setOpen(false)}
                    aria-current={active ? 'page' : undefined}
                    className={cn(
                      'flex min-h-11 items-center gap-3 rounded-[10px] px-3 text-[15px] font-medium transition-colors',
                      active ? 'bg-navy-900 text-white' : 'text-ink-700 hover:bg-sand-100',
                    )}
                  >
                    <Icon size={19} strokeWidth={1.7} aria-hidden="true" />
                    {label}
                  </Link>
                )
              })}
            </div>
          ))}

          <div className="my-1.5 border-t border-ink-100" />
          <button
            type="button"
            onClick={handleSignOut}
            className="flex min-h-11 w-full items-center gap-3 rounded-[10px] px-3 text-[15px] font-medium text-ink-700 transition-colors hover:bg-sand-100 hover:text-coral-500"
          >
            <LogOut size={19} strokeWidth={1.7} aria-hidden="true" />
            Déconnexion
          </button>
        </nav>
      </SheetContent>
    </Sheet>
  )
}
