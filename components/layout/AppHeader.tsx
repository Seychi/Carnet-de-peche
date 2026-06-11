import Link from 'next/link'
import { Plus } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { UserMenu } from './UserMenu'

/** Logo DA v2 (carré teal + onde navy) — repris des maquettes. */
function BrandMark({ size = 30 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 30 30" aria-hidden="true" className="shrink-0">
      <rect width="30" height="30" rx="8" fill="var(--teal-500)" />
      <path
        d="M5 19 C9 12, 12 12, 15 16 S 21 21, 25 13"
        stroke="var(--navy-950)"
        strokeWidth="2.2"
        fill="none"
        strokeLinecap="round"
      />
    </svg>
  )
}

/**
 * Header app allégé DA v2 : logo + « + Loguer » + avatar.
 * La nav vit dans la sidebar (desktop) et la tab bar (mobile).
 */
export async function AppHeader() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

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
    <header className="border-b border-sand-200 bg-white">
      <div className="mx-auto flex h-16 max-w-[1280px] items-center justify-between gap-3 px-4 sm:px-6">
        <Link
          href="/home"
          className="flex min-h-11 items-center gap-2.5 font-display text-[17px] font-bold text-navy-900"
        >
          <BrandMark />
          <span className="hidden sm:inline">Carnet de Pêche</span>
        </Link>

        <div className="flex items-center gap-2.5">
          <Link
            href="/carnet/nouvelle"
            className="hidden min-h-11 items-center gap-1.5 rounded-lg bg-teal-500 px-4 text-[14px] font-semibold text-navy-950 transition-colors hover:bg-teal-300 sm:inline-flex"
          >
            <Plus size={16} strokeWidth={2.2} aria-hidden="true" />
            Loguer
          </Link>
          {profile && <UserMenu username={profile.username} avatarUrl={profile.avatar_url} />}
        </div>
      </div>
    </header>
  )
}
