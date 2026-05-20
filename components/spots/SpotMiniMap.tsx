'use client'

import { useMemo } from 'react'
import MapView from '@/components/map/MapView'
import type { SpotMarker } from '@/lib/map/utils'

type Props = {
  id: string
  slug: string
  name: string
  lng: number
  lat: number
  isPrecise: boolean
  department: string
  region: string
  species: string[]
  techniques: string[]
  difficulty: number
  structure?: string | null
  verified: boolean
}

export default function SpotMiniMap(props: Props) {
  const marker = useMemo((): SpotMarker => ({
    id: props.id,
    slug: props.slug,
    name: props.name,
    lng: props.lng,
    lat: props.lat,
    isPrecise: props.isPrecise,
    department: props.department,
    region: props.region,
    species: props.species,
    techniques: props.techniques,
    difficulty: props.difficulty,
    structure: props.structure,
    verified: props.verified,
  }), [props])

  return (
    <MapView
      spots={[marker]}
      initialCenter={[props.lng, props.lat]}
      initialZoom={13}
      className="w-full h-full"
      interactive={false}
    />
  )
}
