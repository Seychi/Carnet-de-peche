'use client'

import { useMemo } from 'react'
import dynamic from 'next/dynamic'
import type { SpotMarker } from '@/lib/map/utils'

// Frontière client pour lazy-loader MapView (sprint 12 Bloc B) : MapLibre (~200 kB
// gz) sort du bundle initial de /carnet/[id]. ssr:false — la carte n'apporte rien
// au HTML initial ; le skeleton (dégradé navy) réserve la place exacte → pas de CLS.
const MapView = dynamic(() => import('@/components/map/MapView'), {
  ssr: false,
  loading: () => (
    <div
      aria-hidden
      className="h-full w-full motion-safe:animate-pulse"
      style={{ background: 'linear-gradient(180deg, #0A2F3D 0%, #103E50 55%, #14B8A6 170%)' }}
    />
  ),
})

type Props = {
  lng: number
  lat: number
  /** Point précis (proprio ou révélé) ou centre du flou. Pilote l'étiquette « ~1 km ». */
  isPrecise: boolean
  /** Libellé du lieu (location_label / spot_name) — sert d'aria-label au marqueur. */
  name: string
  species: string[]
}

// Mini-carte non interactive d'une prise. Ne reçoit JAMAIS geom brut : lng/lat
// viennent de catches_for_viewer (geom_visible, déjà flouté/précis selon le droit
// du viewer — cf migration 034). Réutilise MapView avec un unique marqueur neutre.
export default function CatchMiniMap({ lng, lat, isPrecise, name, species }: Props) {
  const marker = useMemo((): SpotMarker => ({
    id: 'catch-position',
    slug: '',
    name: name || 'Position',
    lng,
    lat,
    isPrecise,
    department: '',
    region: '',
    species,
    techniques: [],
    difficulty: 0,
    structure: null,
    verified: false,
  }), [lng, lat, isPrecise, name, species])

  return (
    <MapView
      spots={[marker]}
      initialCenter={[lng, lat]}
      initialZoom={13}
      className="h-full w-full"
      interactive={false}
    />
  )
}
