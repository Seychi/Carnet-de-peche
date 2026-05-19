import { Header } from '@/components/layout/Header'

// Layout fullscreen pour la carte interactive.
// Pas de footer — la map occupe tout l'écran disponible.
export default function MapLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col h-screen overflow-hidden">
      <Header />
      <main className="flex-1 min-h-0">{children}</main>
    </div>
  )
}
