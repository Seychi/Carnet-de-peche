import { Header } from '@/components/layout/Header'

// Layout fullscreen pour la carte interactive.
// Pas de footer — la map occupe tout l'écran disponible.
// Sur mobile (< md) : le Header marketing est masqué — MapShell injecte son propre header compact (56px).
// h-dvh (100dvh) gère la barre URL iOS qui s'auto-hide, contrairement à h-screen (100vh).
export default function MapLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col h-dvh overflow-hidden">
      <div className="hidden md:block shrink-0">
        <Header />
      </div>
      <main id="main" className="flex-1 min-h-0">{children}</main>
    </div>
  )
}
