import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Logo } from '@/components/ui-v2/Logo'
import { UserMenu } from './UserMenu'
import { MobileNav } from '@/components/mobile-nav'
import { HeaderShell } from './HeaderShell'

const NAV_LINKS = [
  { label: 'Carte', href: '/carte' },
  { label: 'Spots', href: '/spots' },
  { label: 'Espèces', href: '/especes' },
  { label: 'Guides', href: '/guides' },
  { label: 'Tarifs', href: '/tarifs' },
]

export async function Header() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  let profile: { username: string | null; avatar_url: string | null } | null = null
  if (user) {
    const { data } = await supabase
      .from('profiles')
      .select('username, avatar_url')
      .eq('id', user.id)
      .single()
    profile = data
  }

  return (
    <HeaderShell>
      <div className="mx-auto max-w-[1280px] px-6 flex items-center justify-between gap-4 h-[68px]">
        {/* Logo */}
        <Link
          href="/"
          className="flex items-center gap-2.5 font-display font-bold text-[17px] text-navy-900 shrink-0 min-h-[44px]"
        >
          <Logo size={34} variant="light" className="shrink-0" />
          <span className="hidden sm:inline">Carnet de Pêche</span>
        </Link>

        {/* Nav desktop */}
        <nav className="hidden lg:flex gap-6 items-center">
          {NAV_LINKS.map((item) => (
            <Link
              key={item.label}
              href={item.href}
              className="relative inline-flex items-center min-h-[44px] text-[15px] font-medium text-ink-700 transition-colors hover:text-navy-900 after:pointer-events-none after:absolute after:bottom-[9px] after:left-0 after:h-[2px] after:w-0 after:rounded-full after:bg-teal-500 after:transition-[width] after:duration-300 hover:after:w-full focus-visible:after:w-full"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        {/* Actions */}
        <div className="flex items-center gap-2 shrink-0">
          {user && profile ? (
            <>
              {/* Pont retour vers l'app pour un connecté qui navigue le shell marketing/carte. */}
              <Link
                href="/home"
                className="hidden sm:inline-flex items-center min-h-[44px] px-3 text-[14px] font-semibold text-navy-900 hover:text-teal-700 transition-colors"
              >
                Mon carnet
              </Link>
              <UserMenu username={profile.username} avatarUrl={profile.avatar_url} />
            </>
          ) : (
            <>
              <Link
                href="/auth/login"
                className="hidden sm:inline-flex items-center px-4 py-2.5 rounded-full text-[14px] font-semibold text-navy-900 border-[1.5px] border-ink-200 min-h-[44px] hover:bg-ink-100 transition-colors"
              >
                Connexion
              </Link>
              <Link
                href="/auth/register"
                className="inline-flex items-center px-4 py-2.5 rounded-full text-[14px] font-semibold min-h-[44px] whitespace-nowrap text-white"
                style={{ background: 'var(--navy-900)', boxShadow: '0 4px 14px rgba(10,47,61,.18)' }}
              >
                Créer mon carnet
              </Link>
            </>
          )}
          <MobileNav isAuthenticated={!!user} username={profile?.username ?? null} />
        </div>
      </div>
    </HeaderShell>
  )
}
