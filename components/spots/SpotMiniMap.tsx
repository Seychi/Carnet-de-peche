'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { MapPin } from 'lucide-react'
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

// Filet de sécurité au-dessus du pire cas interne de MapView (sprint 77 Bloc 5 :
// « la mini-carte ne charge pas », fiche spot = la page qui porte 80 % des clics).
// MapView retente déjà 1 fois toute seule avant d'afficher son propre repli brut
// (« La carte n'a pas répondu, réessaie » sur fond gris) : fenêtre de révélation
// 10 000 ms + délai de reprise 1 500 ms + 2e fenêtre de révélation 10 000 ms =
// 21 500 ms de pire cas avant que MapView ne renonce elle-même. On ajoute une
// marge (~1 s) puis on bascule sur NOTRE repli, habillé au ton du site, plutôt
// que de laisser l'encart de tête vide/brut indéfiniment (MapView n'expose pas
// de callback d'échec : on ne peut détecter la réussite que via `onMapReady`).
const GIVE_UP_AFTER_MS = 22_500

export default function SpotMiniMap(props: Props) {
  // Incrémenté à chaque « Réessayer » manuel : change la `key` de MapView pour
  // forcer une instance totalement neuve (nouveau canvas WebGL, nouveaux refs).
  const [attempt, setAttempt] = useState(0)
  const [showFallback, setShowFallback] = useState(false)
  const giveUpTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    giveUpTimerRef.current = setTimeout(() => setShowFallback(true), GIVE_UP_AFTER_MS)
    return () => {
      if (giveUpTimerRef.current) clearTimeout(giveUpTimerRef.current)
    }
  }, [attempt])

  const handleMapReady = useCallback(() => {
    if (giveUpTimerRef.current) {
      clearTimeout(giveUpTimerRef.current)
      giveUpTimerRef.current = null
    }
  }, [])

  const handleRetry = useCallback(() => {
    setShowFallback(false)
    setAttempt((a) => a + 1)
  }, [])

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

  // Repli honnête : ni coordonnée ni carte brisée, juste le nom du spot sur un
  // fond marin (même palette que MapSkeleton) + une reprise manuelle. Aucune
  // donnée de position n'y transite (pas de fuite GPS, même dégradé).
  if (showFallback) {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center gap-2 px-6 py-8 text-center bg-[linear-gradient(180deg,#04141C_0%,#0A2F3D_45%,#0E3D50_75%,#103E50_100%)]">
        <MapPin className="text-teal-300" size={26} aria-hidden="true" />
        <p className="text-sm font-medium text-white">{props.name}</p>
        <p className="text-xs text-teal-300/80">
          Carte indisponible pour le moment{props.region ? ` · ${props.region}` : ''}
        </p>
        <button
          type="button"
          onClick={handleRetry}
          className="mt-1 flex min-h-11 items-center rounded-full border border-teal-300/40 px-4 text-xs font-medium text-teal-300 transition-colors hover:bg-teal-300/10"
        >
          Réessayer
        </button>
      </div>
    )
  }

  return (
    <MapView
      key={attempt}
      spots={[marker]}
      initialCenter={[props.lng, props.lat]}
      initialZoom={13}
      onMapReady={handleMapReady}
      className="w-full h-full"
      interactive={false}
    />
  )
}
