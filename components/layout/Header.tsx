import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { UserMenu } from './UserMenu'
import { MobileNav } from '@/components/mobile-nav'

const NAV_LINKS = [
  { label: 'Carte', href: '/carte' },
  { label: 'Spots', href: '/spots' },
  { label: 'Guides', href: '/guides' },
  { label: 'Tarifs', href: '/tarifs' },
]

function BrandMark({ size = 34 }: { size?: number }) {
  return (
    <span
      className="grid place-items-center text-white shrink-0"
      style={{
        width: size, height: size,
        background: 'linear-gradient(135deg, var(--navy-900), var(--teal-500))',
        borderRadius: Math.round(size * 0.3),
      }}
    >
      <svg width={size * 0.59} height={size * 0.59} viewBox="0 0 24 24" fill="none"
        stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7S2 12 2 12z" />
      </svg>
    </span>
  )
}

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
    <header
      className="sticky top-0 z-50"
      style={{
        background: 'rgba(251,248,242,.92)',
        backdropFilter: 'saturate(180%) blur(14px)',
        WebkitBackdropFilter: 'saturate(180%) blur(14px)',
        borderBottom: '1px solid rgba(10,47,61,.07)',
      }}
    >
      <div className="mx-auto max-w-[1280px] px-6 flex items-center justify-between gap-4 h-[68px]">
        {/* Logo */}
        <Link
          href="/"
          className="flex items-center gap-2.5 font-display font-bold text-[17px] text-navy-900 shrink-0 min-h-[44px]"
        >
          <BrandMark size={34} />
          <span className="hidden sm:inline">Carnet de Pêche</span>
        </Link>

        {/* Nav desktop */}
        <nav className="hidden lg:flex gap-6 items-center">
          {NAV_LINKS.map((item) => (
            <Link
              key={item.label}
              href={item.href}
              className="inline-flex items-center min-h-[44px] text-[15px] font-medium text-ink-700 hover:text-navy-900 transition-colors"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        {/* Actions */}
        <div className="flex items-center gap-2 shrink-0">
          {user && profile ? (
            <UserMenu username={profile.username} avatarUrl={profile.avatar_url} />
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
    </header>
  )
}
