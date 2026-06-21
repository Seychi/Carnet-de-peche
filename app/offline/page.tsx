import type { Metadata } from 'next'
import { WifiOff } from 'lucide-react'
import { Bathy } from '@/components/ui-v2/bathy'
import { TagData } from '@/components/ui-v2/tag-data'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export const metadata: Metadata = {
  title: 'Hors ligne · Carnet de Pêche',
  robots: { index: false, follow: false },
}

// Page de repli servie par le service worker quand le réseau est coupé.
// Statique volontairement : aucune donnée requise pour rendre.
export default function OfflinePage() {
  return (
    <main className="relative flex min-h-dvh flex-col items-center justify-center overflow-hidden bg-navy-950 px-6 text-center text-white">
      <Bathy opacity={0.35} />
      <div className="relative">
        <WifiOff size={40} strokeWidth={1.5} className="mx-auto mb-5 text-teal-300" aria-hidden="true" />
        <TagData variant="on-dark">RÉSEAU COUPÉ</TagData>
        <h1 className="mt-2 font-display text-[26px] leading-tight text-white">
          Tu es hors ligne.
        </h1>
        <p className="mx-auto mt-3 max-w-sm text-[14.5px] leading-relaxed text-white/60">
          Classique en bord de mer. Les pages que tu as déjà consultées (spots, marées du jour)
          restent disponibles via le bouton retour. Le reste reviendra avec le réseau.
        </p>
        <a
          href="/home"
          className={cn(buttonVariants({ variant: 'accent', size: 'cta' }), 'mt-6')}
        >
          Réessayer
        </a>
      </div>
    </main>
  )
}
