'use client'

import { usePathname } from 'next/navigation'
import { AppSidebar } from './AppSidebar'
import { TabBar } from './TabBar'

// Routes (app) sans chrome : flows plein écran.
const BARE_PREFIXES = ['/onboarding', '/carnet/nouvelle']

/**
 * Shell de l'app connectée (DA v2) : header + bandeau instruments sticky,
 * sidebar ≥ 960 px, tab bar + FAB < 960 px. L'onboarding et le flow
 * « Loguer » restent plein écran, sans chrome.
 */
export function AppShell({
  header,
  instruments,
  banner,
  children,
  isModerator = false,
}: {
  header: React.ReactNode
  instruments: React.ReactNode
  banner: React.ReactNode
  children: React.ReactNode
  isModerator?: boolean
}) {
  const pathname = usePathname()
  const bare = BARE_PREFIXES.some((p) => pathname.startsWith(p))

  if (bare) {
    return (
      <>
        {banner}
        {children}
      </>
    )
  }

  return (
    <div className="flex min-h-dvh flex-col bg-sand-50">
      {banner}
      {/* will-change-transform promeut ce bloc en couche GPU séparée → évite
          le repaint plein écran header/bandeau au scroll (flash blanc 1-frame). */}
      <div className="sticky top-0 z-40 will-change-transform">
        {header}
        {instruments}
      </div>
      <div className="flex-1 desk:grid desk:grid-cols-[232px_1fr]">
        <AppSidebar />
        {/* pb mobile = hauteur tab bar + safe-area, pour ne rien masquer */}
        <main className="min-w-0 pb-[88px] desk:pb-0">{children}</main>
      </div>
      <TabBar isModerator={isModerator} />
    </div>
  )
}
