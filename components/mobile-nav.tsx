'use client'

import { useState, useEffect, startTransition } from 'react'
import { Menu, X, LogOut, User, BookOpen, CreditCard } from 'lucide-react'
import Link from 'next/link'
import { signOut } from '@/app/actions/auth'

const NAV_ITEMS = [
  { label: 'Carte', href: '/carte' },
  { label: 'Spots', href: '/spots' },
  { label: 'Guides', href: '/guides' },
  { label: 'Tarifs', href: '/tarifs' },
]

interface MobileNavProps {
  isAuthenticated?: boolean
  username?: string | null
}

export function MobileNav({ isAuthenticated = false, username = null }: MobileNavProps) {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [open])

  function handleSignOut() {
    setOpen(false)
    // Server Action : session révoquée côté serveur, puis redirect '/'
    startTransition(() => signOut('/'))
  }

  return (
    <>
      <button
        className="lg:hidden flex items-center justify-center min-w-[44px] min-h-[44px] rounded-xl text-ink-700 hover:text-navy-900 hover:bg-ink-100 transition-colors"
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? 'Fermer le menu' : 'Ouvrir le menu'}
        aria-expanded={open}
      >
        {open ? <X size={22} /> : <Menu size={22} />}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40 lg:hidden bg-ink-900/20" onClick={() => setOpen(false)} />
          <div
            className="fixed top-[68px] left-0 right-0 z-50 lg:hidden border-b border-ink-100"
            style={{
              background: 'rgba(251,248,242,.97)',
              backdropFilter: 'saturate(180%) blur(16px)',
              WebkitBackdropFilter: 'saturate(180%) blur(16px)',
            }}
          >
            <nav className="mx-auto max-w-[1280px] px-6 pb-6">
              <div className="flex flex-col">
                {NAV_ITEMS.map((item) => (
                  <Link
                    key={item.label}
                    href={item.href}
                    onClick={() => setOpen(false)}
                    className="text-[17px] font-medium text-ink-700 hover:text-navy-900 py-4 border-b border-ink-100 last:border-0 transition-colors"
                  >
                    {item.label}
                  </Link>
                ))}
              </div>

              {isAuthenticated ? (
                <div className="flex flex-col gap-2 pt-5 border-t border-ink-100 mt-2">
                  {username && (
                    <p className="text-sm text-ink-500 mb-1">Connecté en tant que <strong>{username}</strong></p>
                  )}
                  <Link
                    href="/profil"
                    onClick={() => setOpen(false)}
                    className="flex items-center gap-3 py-3 text-[15px] font-medium text-ink-700 hover:text-navy-900 transition-colors"
                  >
                    <User size={18} className="text-ink-400" />
                    Mon profil
                  </Link>
                  <Link
                    href="/carnet"
                    onClick={() => setOpen(false)}
                    className="flex items-center gap-3 py-3 text-[15px] font-medium text-ink-700 hover:text-navy-900 transition-colors border-b border-ink-100"
                  >
                    <BookOpen size={18} className="text-ink-400" />
                    Mon carnet
                  </Link>
                  <Link
                    href="/compte/abonnement"
                    onClick={() => setOpen(false)}
                    className="flex items-center gap-3 py-3 text-[15px] font-medium text-ink-700 hover:text-navy-900 transition-colors border-b border-ink-100"
                  >
                    <CreditCard size={18} className="text-ink-400" />
                    Mon abonnement
                  </Link>
                  <button
                    onClick={handleSignOut}
                    className="flex items-center gap-3 py-3 text-[15px] font-medium text-ink-700 hover:text-red-600 transition-colors w-full text-left mt-1"
                  >
                    <LogOut size={18} className="text-ink-400" />
                    Déconnexion
                  </button>
                </div>
              ) : (
                <div className="flex flex-col gap-2.5 pt-5">
                  <Link
                    href="/auth/login"
                    onClick={() => setOpen(false)}
                    className="flex items-center justify-center px-4 rounded-full text-[15px] font-semibold text-navy-900 border-[1.5px] border-ink-200 min-h-[48px] transition-colors hover:bg-ink-100"
                  >
                    Connexion
                  </Link>
                  <Link
                    href="/auth/register"
                    onClick={() => setOpen(false)}
                    className="flex items-center justify-center px-4 rounded-full text-[15px] font-semibold min-h-[48px] text-white"
                    style={{ background: 'var(--navy-900)', boxShadow: '0 4px 14px rgba(10,47,61,.18)' }}
                  >
                    Créer mon carnet
                  </Link>
                </div>
              )}
            </nav>
          </div>
        </>
      )}
    </>
  )
}
