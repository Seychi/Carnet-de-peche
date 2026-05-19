'use client'

import { useRef, useState } from 'react'
import { toast } from 'sonner'
import { Navigation } from 'lucide-react'
import Link from 'next/link'
import type { Map as MapLibreMap } from 'maplibre-gl'
import MapView from '@/components/map/MapView'
import SpotPopup from '@/components/map/SpotPopup'
import type { SpotMarker } from '@/lib/map/utils'
import { COASTAL_DEFAULT_CENTER, COASTAL_DEFAULT_ZOOM } from '@/lib/map/utils'

type UserTier = 'anonymous' | 'discovery' | 'local' | 'itinerant'

type MapShellProps = {
  spots: SpotMarker[]
  userTier: UserTier
}

export default function MapShell({ spots, userTier }: MapShellProps) {
  const [activeSpot, setActiveSpot] = useState<SpotMarker | null>(null)
  const [isGeolocating, setIsGeolocating] = useState(false)
  const mapInstanceRef = useRef<MapLibreMap | null>(null)

  const isAnonymous = userTier === 'anonymous'

  function handleGeolocate() {
    if (!navigator.geolocation) {
      toast.error('Géolocalisation non disponible sur ton navigateur')
      return
    }
    setIsGeolocating(true)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setIsGeolocating(false)
        mapInstanceRef.current?.flyTo({
          center: [pos.coords.longitude, pos.coords.latitude],
          zoom: 11,
          duration: 1500,
        })
      },
      (err) => {
        setIsGeolocating(false)
        if (err.code === 1) {
          toast.error('Géolocalisation refusée. Active-la dans tes paramètres.')
        } else if (err.code === 2) {
          toast.error('Géolocalisation non disponible')
        } else {
          toast.error('Localisation trop lente, réessaie')
        }
      },
      { timeout: 8000, maximumAge: 60_000 }
    )
  }

  return (
    // position: relative nécessaire pour le md:absolute de SpotPopup
    <div className="relative w-full h-full">
      <MapView
        spots={spots}
        initialCenter={COASTAL_DEFAULT_CENTER}
        initialZoom={COASTAL_DEFAULT_ZOOM}
        className="w-full h-full"
        onMarkerClick={setActiveSpot}
        onMapReady={(map) => {
          mapInstanceRef.current = map
        }}
      />

      {/* Bouton géolocalisation — top-right, au-dessus de la carte */}
      <button
        onClick={handleGeolocate}
        disabled={isGeolocating}
        title="Me géolocaliser"
        aria-label="Me géolocaliser"
        className={[
          'absolute top-3 right-3 z-10',
          'flex items-center gap-2 px-3 py-2 rounded-xl',
          'bg-white/95 backdrop-blur-sm shadow-md border border-ink-200',
          'text-ink-700 text-sm font-medium',
          'hover:bg-white hover:border-teal-400 transition-all',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500',
          'disabled:opacity-60 disabled:cursor-not-allowed',
        ].join(' ')}
      >
        <Navigation
          size={16}
          className={isGeolocating ? 'text-teal-500 animate-pulse' : 'text-ink-500'}
        />
        <span className="hidden sm:inline">
          {isGeolocating ? 'Localisation…' : 'Me géolocaliser'}
        </span>
      </button>

      {/* Popup spot actif */}
      {activeSpot && (
        <SpotPopup
          spot={activeSpot}
          onClose={() => setActiveSpot(null)}
          userTier={userTier}
        />
      )}

      {/* Bandeau CTA pour les anonymes — en bas, z-index inférieur à la popup */}
      {isAnonymous && !activeSpot && (
        <div className="absolute bottom-0 left-0 right-0 z-10 p-3 pointer-events-none">
          <div className="max-w-lg mx-auto bg-navy-900/95 backdrop-blur-sm text-white rounded-2xl px-4 py-3 flex items-center justify-between gap-3 shadow-lg pointer-events-auto">
            <p className="text-sm leading-snug">
              <span className="font-semibold">3 spots gratuits par département.</span>{' '}
              <span className="text-white/70">Crée ton carnet pour voir tous les spots.</span>
            </p>
            <Link
              href="/auth/register"
              className="shrink-0 px-3 py-1.5 bg-teal-500 hover:bg-teal-400 text-white text-sm font-semibold rounded-xl transition-colors whitespace-nowrap"
            >
              C'est gratuit
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}
