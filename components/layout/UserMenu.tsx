'use client'

import { useState, useRef, useEffect, startTransition } from 'react'
import Link from 'next/link'
import { signOut } from '@/app/actions/auth'
import { LogOut, User, BookOpen, CreditCard, ChevronDown, Shield, MessageCircle, Users } from 'lucide-react'

interface UserMenuProps {
  username: string | null
  avatarUrl: string | null
  isModerator?: boolean
}

export function UserMenu({ username, avatarUrl, isModerator = false }: UserMenuProps) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  // Fermer si clic en dehors
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  function handleSignOut() {
    setOpen(false)
    // Server Action : session révoquée côté serveur, puis redirect '/'
    startTransition(() => signOut('/'))
  }

  const initials = username ? username.slice(0, 2).toUpperCase() : '?'

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 min-h-[44px] px-2 rounded-xl hover:bg-ink-100 transition-colors"
        aria-label="Menu utilisateur"
        aria-expanded={open}
      >
        {/* Avatar */}
        {avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- avatar utilisateur (Supabase Storage), <img> volontaire : pas de refacto next/image dans ce sprint
          <img src={avatarUrl} alt={username ?? 'Avatar'} className="w-8 h-8 rounded-full object-cover" />
        ) : (
          <div className="w-8 h-8 rounded-full bg-navy-900 flex items-center justify-center shrink-0">
            <span className="text-white text-xs font-bold">{initials}</span>
          </div>
        )}
        <span className="hidden sm:block text-sm font-medium text-navy-900 max-w-[120px] truncate">
          {username ?? 'Pêcheur'}
        </span>
        <ChevronDown size={14} className={`text-ink-400 transition-transform duration-150 ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-52 bg-white border border-ink-100 rounded-[14px] shadow-lg overflow-hidden z-50">
          <div className="px-4 py-3 border-b border-ink-100">
            <p className="text-sm font-semibold text-navy-900 truncate">{username ?? 'Pêcheur'}</p>
          </div>
          <nav className="py-1.5">
            <Link
              href="/profil"
              onClick={() => setOpen(false)}
              className="flex items-center gap-3 px-4 py-2.5 text-sm text-ink-700 hover:bg-ink-50 hover:text-navy-900 transition-colors"
            >
              <User size={15} className="text-ink-400" />
              Mon profil
            </Link>
            <Link
              href="/carnet"
              onClick={() => setOpen(false)}
              className="flex items-center gap-3 px-4 py-2.5 text-sm text-ink-700 hover:bg-ink-50 hover:text-navy-900 transition-colors"
            >
              <BookOpen size={15} className="text-ink-400" />
              Mon carnet
            </Link>
            <Link
              href="/fil"
              onClick={() => setOpen(false)}
              className="flex items-center gap-3 px-4 py-2.5 text-sm text-ink-700 hover:bg-ink-50 hover:text-navy-900 transition-colors"
            >
              <MessageCircle size={15} className="text-ink-400" />
              Fil régional
            </Link>
            <Link
              href="/follows"
              onClick={() => setOpen(false)}
              className="flex items-center gap-3 px-4 py-2.5 text-sm text-ink-700 hover:bg-ink-50 hover:text-navy-900 transition-colors"
            >
              <Users size={15} className="text-ink-400" />
              Mes pêcheurs
            </Link>
            <Link
              href="/compte/abonnement"
              onClick={() => setOpen(false)}
              className="flex items-center gap-3 px-4 py-2.5 text-sm text-ink-700 hover:bg-ink-50 hover:text-navy-900 transition-colors"
            >
              <CreditCard size={15} className="text-ink-400" />
              Mon abonnement
            </Link>
            {isModerator && (
              <Link
                href="/moderation"
                onClick={() => setOpen(false)}
                className="flex items-center gap-3 px-4 py-2.5 text-sm text-ink-700 hover:bg-ink-50 hover:text-navy-900 transition-colors"
              >
                <Shield size={15} className="text-ink-400" />
                Modération
              </Link>
            )}
          </nav>
          <div className="py-1.5 border-t border-ink-100">
            <button
              onClick={handleSignOut}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-ink-700 hover:bg-ink-50 hover:text-red-600 transition-colors"
            >
              <LogOut size={15} className="text-ink-400" />
              Déconnexion
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
