'use client'

import { useState, useEffect } from 'react'
import { Menu, X } from 'lucide-react'
import Link from 'next/link'

const NAV_ITEMS = [
  { label: 'Carte', href: '#' },
  { label: 'Spots', href: '#' },
  { label: 'Guides', href: '#' },
  { label: 'Tarifs', href: '#tarifs' },
]

export function MobileNav() {
  const [open, setOpen] = useState(false)

  // Bloque le scroll body quand le menu est ouvert
  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [open])

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
          {/* Overlay */}
          <div
            className="fixed inset-0 z-40 lg:hidden bg-ink-900/20"
            onClick={() => setOpen(false)}
          />

          {/* Drawer */}
          <div
            className="fixed top-[68px] left-0 right-0 z-50 lg:hidden border-b border-ink-100"
            style={{
              background: 'rgba(251,248,242,.97)',
              backdropFilter: 'saturate(180%) blur(16px)',
              WebkitBackdropFilter: 'saturate(180%) blur(16px)',
            }}
          >
            <nav className="mx-auto max-w-[1200px] px-5 pb-5">
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
                  className="flex items-center justify-center px-4 rounded-full text-[15px] font-semibold min-h-[48px]"
                  style={{
                    background: 'var(--navy-900)',
                    color: '#fff',
                    boxShadow: '0 4px 14px rgba(10,47,61,.18)',
                  }}
                >
                  Créer mon carnet
                </Link>
              </div>
            </nav>
          </div>
        </>
      )}
    </>
  )
}
