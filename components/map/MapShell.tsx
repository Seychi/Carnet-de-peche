'use client'

import { useRef, useState, useMemo, useCallback } from 'react'
import { toast } from 'sonner'
import { Navigation, SlidersHorizontal, X } from 'lucide-react'
import Link from 'next/link'
import type { Map as MapLibreMap } from 'maplibre-gl'
import MapView from '@/components/map/MapView'
import SpotPopup from '@/components/map/SpotPopup'
import MapFilters from '@/components/map/MapFilters'
import UpsellBanner from '@/components/map/UpsellBanner'
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet'
import type { SpotMarker } from '@/lib/map/utils'
import { COASTAL_DEFAULT_CENTER, COASTAL_DEFAULT_ZOOM } from '@/lib/map/utils'
import type { UserTier } from '@/lib/auth/tier'
import type { SpotFilters } from '@/lib/spots/filters-schema'
import { hasActiveFilters, countActiveFilters } from '@/lib/spots/filter-url'
import { SPECIES_LABELS, TECHNIQUE_LABELS, STRUCTURE_LABELS } from '@/lib/labels'
import { DEPARTMENT_LABELS } from '@/lib/geo/departments'

type MapShellProps = {
  spots: SpotMarker[]
  userTier: UserTier
  initialCenter?: [number, number]
  initialZoom?: number
  showUpsell?: boolean
  initialFilters?: SpotFilters
  userDepartment?: string
  availableDepartments?: string[]
}

function filterSpots(spots: SpotMarker[], filters: SpotFilters): SpotMarker[] {
  if (!hasActiveFilters(filters)) return spots
  return spots.filter((spot) => {
    if (filters.species?.length && !spot.species.some((s) => (filters.species as string[]).includes(s))) return false
    if (filters.techniques?.length && !spot.techniques.some((t) => (filters.techniques as string[]).includes(t))) return false
    if (filters.department !== undefined && spot.department !== filters.department) return false
    if (filters.structure !== undefined && spot.structure !== filters.structure) return false
    if (filters.difficulty !== undefined && (spot.difficulty ?? 0) > filters.difficulty) return false
    return true
  })
}

// Résumé textuel des filtres actifs pour la top bar tablet
function ActiveFilterChips({ filters }: { filters: SpotFilters }) {
  return (
    <>
      {filters.species?.map((s) => (
        <span key={s} className="px-2 py-0.5 rounded-full bg-teal-500/10 text-teal-700 text-xs font-medium whitespace-nowrap">
          {SPECIES_LABELS[s] ?? s}
        </span>
      ))}
      {filters.techniques?.map((t) => (
        <span key={t} className="px-2 py-0.5 rounded-full bg-navy-900/10 text-navy-900 text-xs font-medium whitespace-nowrap">
          {TECHNIQUE_LABELS[t] ?? t}
        </span>
      ))}
      {filters.department && (
        <span className="px-2 py-0.5 rounded-full bg-ink-100 text-ink-700 text-xs font-medium whitespace-nowrap">
          {DEPARTMENT_LABELS[filters.department] ?? filters.department}
        </span>
      )}
      {filters.structure && (
        <span className="px-2 py-0.5 rounded-full bg-ink-100 text-ink-700 text-xs font-medium whitespace-nowrap">
          {STRUCTURE_LABELS[filters.structure] ?? filters.structure}
        </span>
      )}
      {filters.difficulty !== undefined && (
        <span className="px-2 py-0.5 rounded-full bg-ink-100 text-ink-700 text-xs font-medium whitespace-nowrap">
          {'★'.repeat(filters.difficulty)} max
        </span>
      )}
    </>
  )
}

export default function MapShell({
  spots,
  userTier,
  initialCenter,
  initialZoom,
  showUpsell = false,
  initialFilters = {},
  userDepartment,
  availableDepartments = [],
}: MapShellProps) {
  const [activeSpot, setActiveSpot] = useState<SpotMarker | null>(null)
  const [isGeolocating, setIsGeolocating] = useState(false)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [sheetOpenCount, setSheetOpenCount] = useState(0)
  const [filters, setFilters] = useState<SpotFilters>(initialFilters)
  const mapInstanceRef = useRef<MapLibreMap | null>(null)

  const isAnonymous = userTier === 'anonymous'
  const activeCount = countActiveFilters(filters)
  const filteredSpots = useMemo(() => filterSpots(spots, filters), [spots, filters])

  const handleFiltersChange = useCallback((f: SpotFilters) => setFilters(f), [])

  function openSheet() {
    setSheetOpenCount((c) => c + 1)
    setSheetOpen(true)
  }

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
        if (err.code === 1) toast.error('Géolocalisation refusée. Active-la dans tes paramètres.')
        else if (err.code === 2) toast.error('Géolocalisation non disponible')
        else toast.error('Localisation trop lente, réessaie')
      },
      { timeout: 8000, maximumAge: 60_000 }
    )
  }

  const sharedFiltersProps = {
    userTier,
    userDepartment,
    availableDepartments,
    onFiltersChange: handleFiltersChange,
    spotCount: filteredSpots.length,
  }

  return (
    <div className="flex flex-col lg:flex-row w-full h-full">
      {/* ── Desktop : sidebar gauche (lg+) ─────────────────────────── */}
      <aside className="hidden lg:flex flex-col w-80 shrink-0 bg-white border-r border-ink-100 shadow-[2px_0_8px_rgba(0,0,0,0.05)] overflow-hidden z-10">
        <div className="px-4 py-3 border-b border-ink-100 shrink-0">
          <h2 className="font-semibold text-sm text-ink-900">Filtres</h2>
          {activeCount > 0 && (
            <span className="text-xs text-ink-500">{activeCount} filtre{activeCount > 1 ? 's' : ''} actif{activeCount > 1 ? 's' : ''}</span>
          )}
        </div>
        <div className="flex-1 min-h-0 overflow-hidden">
          <MapFilters
            initialFilters={initialFilters}
            layout="sidebar"
            {...sharedFiltersProps}
          />
        </div>
      </aside>

      {/* ── Tablet : top bar compacte (md – lg) ────────────────────── */}
      <div className="hidden md:flex lg:hidden shrink-0 bg-white border-b border-ink-100 px-3 h-12 items-center gap-2 overflow-x-auto z-10">
        <div className="flex items-center gap-1.5 min-w-0 overflow-x-auto">
          <ActiveFilterChips filters={filters} />
        </div>
        <div className="flex-1 shrink-0" />
        <button
          onClick={openSheet}
          className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-ink-50 border border-ink-200 text-ink-700 text-sm font-medium hover:bg-ink-100 transition-colors whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500"
        >
          <SlidersHorizontal size={14} />
          Filtres
          {activeCount > 0 && (
            <span className="w-4 h-4 flex items-center justify-center rounded-full bg-teal-500 text-white text-[10px] font-bold">
              {activeCount}
            </span>
          )}
        </button>
      </div>

      {/* ── Zone carte (toutes tailles) ────────────────────────────── */}
      <div className="relative flex-1 min-h-0 min-w-0">
        <MapView
          spots={filteredSpots}
          initialCenter={initialCenter ?? COASTAL_DEFAULT_CENTER}
          initialZoom={initialZoom ?? COASTAL_DEFAULT_ZOOM}
          className="w-full h-full"
          onMarkerClick={setActiveSpot}
          onMapReady={(map) => { mapInstanceRef.current = map }}
        />

        {/* Bouton géolocalisation — top-right */}
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
          <Navigation size={16} className={isGeolocating ? 'text-teal-500 animate-pulse' : 'text-ink-500'} />
          <span className="hidden sm:inline">{isGeolocating ? 'Localisation…' : 'Me géolocaliser'}</span>
        </button>

        {/* FAB Filtres — top-left, mobile uniquement */}
        <button
          onClick={openSheet}
          aria-label="Ouvrir les filtres"
          className={[
            'md:hidden absolute top-3 left-3 z-10',
            'flex items-center gap-1.5 px-3 py-2 rounded-xl',
            'bg-white/95 backdrop-blur-sm shadow-md border border-ink-200',
            'text-ink-700 text-sm font-medium',
            'hover:bg-white hover:border-teal-400 transition-all',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500',
          ].join(' ')}
        >
          <SlidersHorizontal size={16} className="text-ink-500" />
          <span>Filtres</span>
          {activeCount > 0 && (
            <span className="w-5 h-5 flex items-center justify-center rounded-full bg-teal-500 text-white text-xs font-bold">
              {activeCount}
            </span>
          )}
        </button>

        {/* Popup spot actif */}
        {activeSpot && (
          <SpotPopup spot={activeSpot} onClose={() => setActiveSpot(null)} userTier={userTier} />
        )}

        {/* Bandeau CTA anonymes */}
        {isAnonymous && !activeSpot && (
          <div className="absolute bottom-0 left-0 right-0 z-10 p-3 pointer-events-none">
            <div className="max-w-lg mx-auto bg-navy-900/95 backdrop-blur-sm text-white rounded-2xl px-4 py-3 flex items-center justify-between gap-3 shadow-lg pointer-events-auto">
              <p className="text-sm leading-snug">
                <span className="font-semibold">3 spots gratuits par département.</span>{' '}
                <span className="text-white/70">Crée ton carnet pour voir tous les spots.</span>
              </p>
              <Link
                href="/auth/login?tab=register"
                className="shrink-0 px-3 py-1.5 bg-teal-500 hover:bg-teal-400 text-white text-sm font-semibold rounded-xl transition-colors whitespace-nowrap"
              >
                C'est gratuit
              </Link>
            </div>
          </div>
        )}

        {/* Bandeau upsell discovery */}
        {showUpsell && !activeSpot && <UpsellBanner />}
      </div>

      {/* ── Bottom sheet — mobile + tablet ─────────────────────────── */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent
          side="bottom"
          showCloseButton={false}
          className="flex flex-col p-0 rounded-t-2xl overflow-hidden pb-[env(safe-area-inset-bottom)]"
          style={{ height: '92svh' }}
        >
          {/* Titre sr-only pour a11y (base-ui Dialog exige un titre) */}
          <SheetTitle className="sr-only">Filtres de la carte</SheetTitle>

          {/* Drag handle */}
          <div className="flex justify-center pt-2 shrink-0" aria-hidden="true">
            <div className="w-10 h-1 rounded-full bg-ink-200" />
          </div>

          {/* Header sheet */}
          <div className="flex items-center justify-between px-4 py-2.5 border-b border-ink-100 shrink-0">
            <span className="font-semibold text-base text-ink-900">
              Filtres
              {activeCount > 0 && <span className="ml-2 text-sm font-normal text-ink-500">({activeCount} actif{activeCount > 1 ? 's' : ''})</span>}
            </span>
            <button
              onClick={() => setSheetOpen(false)}
              aria-label="Fermer les filtres"
              className="p-1.5 rounded-full text-ink-500 hover:bg-ink-100 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500"
            >
              <X size={18} />
            </button>
          </div>

          {/* MapFilters — remonté à chaque ouverture via key */}
          <div className="flex-1 min-h-0 overflow-hidden">
            <MapFilters
              key={sheetOpenCount}
              initialFilters={filters}
              layout="sheet"
              onApply={() => setSheetOpen(false)}
              {...sharedFiltersProps}
            />
          </div>
        </SheetContent>
      </Sheet>
    </div>
  )
}
