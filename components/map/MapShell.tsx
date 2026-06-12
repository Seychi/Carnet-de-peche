'use client'

import { useRef, useState, useMemo, useCallback } from 'react'
import dynamic from 'next/dynamic'
import { useRouter, usePathname } from 'next/navigation'
import { toast } from 'sonner'
import { Navigation, Locate, SlidersHorizontal, X } from 'lucide-react'
import Link from 'next/link'
import { BackButton } from '@/components/layout/BackButton'
import type { Map as MapLibreMap } from 'maplibre-gl'

import UpsellBanner from '@/components/map/UpsellBanner'
import UserLocationMarker from '@/components/map/UserLocationMarker'
import MapLegend from '@/components/map/MapLegend'
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet'
import type { SpotMarker } from '@/lib/map/utils'
import { COASTAL_DEFAULT_CENTER, COASTAL_DEFAULT_ZOOM } from '@/lib/map/utils'
import type { UserTier } from '@/lib/auth/tier'
import type { SpotFilters } from '@/lib/spots/filters-schema'
import { hasActiveFilters, countActiveFilters, serializeFiltersToSearchParams } from '@/lib/spots/filter-url'
import { SPECIES_LABELS, TECHNIQUE_LABELS, STRUCTURE_LABELS } from '@/lib/labels'
import { DEPARTMENT_LABELS } from '@/lib/geo/departments'
import { getCenterForDepartment } from '@/lib/geo/department-centroids'
import type { NearbySpot } from '@/lib/spots/nearby'

// MapLibre pèse ~400 KB — on le lazy-charge pour ne pas alourdir le First Load JS.
// Le skeleton s'affiche pendant l'init WebGL (~300–600 ms sur mobile).
function MapSkeleton() {
  return (
    <div className="w-full h-full bg-ink-100 flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" />
    </div>
  )
}

const MapView = dynamic(() => import('@/components/map/MapView'), {
  ssr: false,
  loading: () => <MapSkeleton />,
})

// Panneaux affichés uniquement à l'interaction (sidebar/sheet filtres, panneau
// nearby, popup spot) — lazy-chargés pour les sortir du First Load JS de /carte.
function FiltersSkeleton() {
  return (
    <div className="p-4 space-y-5 animate-pulse" aria-hidden="true">
      {Array.from({ length: 4 }, (_, i) => (
        <div key={i} className="space-y-2">
          <div className="h-2.5 w-20 bg-ink-100 rounded" />
          <div className="h-8 bg-ink-100 rounded-xl" />
        </div>
      ))}
    </div>
  )
}

const MapFilters = dynamic(() => import('@/components/map/MapFilters'), {
  ssr: false,
  loading: () => <FiltersSkeleton />,
})

const NearbyPanel = dynamic(() => import('@/components/map/NearbyPanel'), {
  ssr: false,
})

// Chunk préchargé dès que la carte est prête (cf onMapReady) : il est déjà en
// cache au premier clic marker → ouverture instantanée du popup.
const loadSpotPopup = () => import('@/components/map/SpotPopup')
const SpotPopup = dynamic(loadSpotPopup, { ssr: false })

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

type NearbyState = {
  isOpen: boolean
  isLoading: boolean
  results: NearbySpot[]
  error: string | null
}

const NEARBY_INITIAL: NearbyState = {
  isOpen: false,
  isLoading: false,
  results: [],
  error: null,
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

const LS_KEY = 'carte:last-filters'

// Sidebar partagé (filtres desktop / NearbyPanel tablet)
const ASIDE_BASE =
  'flex-col shrink-0 bg-white border-r border-ink-100 shadow-[2px_0_8px_rgba(0,0,0,0.05)] overflow-hidden z-10 w-80'

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
  const router = useRouter()
  const pathname = usePathname()
  const [activeSpot, setActiveSpot] = useState<SpotMarker | null>(null)
  const [isGeolocating, setIsGeolocating] = useState(false)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [sheetOpenCount, setSheetOpenCount] = useState(0)
  const [filters, setFilters] = useState<SpotFilters>(initialFilters)
  const [nearby, setNearby] = useState<NearbyState>(NEARBY_INITIAL)
  const [nearbySheetOpen, setNearbySheetOpen] = useState(false)
  // Position GPS cachée — partagée entre "Me géolocaliser" et "Spots autour de moi"
  const [userPosition, setUserPosition] = useState<{ lat: number; lng: number } | null>(null)
  // Instance de la carte — état réactif pour pouvoir passer à UserLocationMarker
  const [mapInstance, setMapInstance] = useState<MapLibreMap | null>(null)
  const mapInstanceRef = useRef<MapLibreMap | null>(null)

  const isAnonymous = userTier === 'anonymous'
  const activeCount = countActiveFilters(filters)
  const filteredSpots = useMemo(() => filterSpots(spots, filters), [spots, filters])

  // Set stable des IDs nearby — passé à MapView pour le highlight visuel
  const nearbySpotIds = useMemo(
    () =>
      nearby.isOpen && nearby.results.length > 0
        ? new Set(nearby.results.map((s) => s.id))
        : undefined,
    [nearby.isOpen, nearby.results],
  )

  const handleFiltersChange = useCallback((f: SpotFilters) => setFilters(f), [])

  function handleApply(newFilters: SpotFilters) {
    // Recentrage : un (autre) département vient d'être sélectionné → flyTo son centroïde.
    // Sans ça, filtrer « 29 » depuis une vue Morbihan laisse des spots 56 à l'écran (audit 2026-06-11).
    if (newFilters.department && newFilters.department !== filters.department) {
      mapInstanceRef.current?.flyTo({
        center: getCenterForDepartment(newFilters.department),
        zoom: 8.5,
        duration: 1500,
      })
    }
    handleFiltersChange(newFilters)
    const params = serializeFiltersToSearchParams(newFilters)
    const qs = params.toString()
    router.replace(pathname + (qs ? '?' + qs : ''), { scroll: false })
    try {
      if (hasActiveFilters(newFilters)) {
        localStorage.setItem(LS_KEY, JSON.stringify(newFilters))
      } else {
        localStorage.removeItem(LS_KEY)
      }
    } catch { /* ignore */ }
    setSheetOpen(false)
  }

  function openSheet() {
    setSheetOpenCount((c) => c + 1)
    setSheetOpen(true)
  }

  function handleGeolocate() {
    if (!navigator.geolocation) {
      toast.error('Géolocalisation non supportée sur cet appareil.')
      return
    }
    setIsGeolocating(true)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setIsGeolocating(false)
        const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude }
        setUserPosition(loc)
        mapInstanceRef.current?.flyTo({
          center: [loc.lng, loc.lat],
          zoom: 11,
          duration: 1500,
        })
      },
      (err) => {
        setIsGeolocating(false)
        if (err.code === 1)
          toast.error('Géolocalisation refusée. Active-la dans les paramètres de ton navigateur.')
        else if (err.code === 2)
          toast.error('Position introuvable. Réessaie dans un instant.')
        else
          toast.error('Géolocalisation trop lente. Réessaie dans un instant.')
      },
      { timeout: 8000, maximumAge: 60_000 },
    )
  }

  async function fetchNearby(lat: number, lng: number) {
    const params = new URLSearchParams({ lat: String(lat), lng: String(lng) })
    if (filters.species?.length) params.set('species', filters.species.join(','))
    if (filters.techniques?.length) params.set('techniques', filters.techniques.join(','))

    try {
      const res = await fetch(`/api/spots/nearby?${params}`)
      if (!res.ok) throw new Error()
      const data = (await res.json()) as NearbySpot[]
      setNearby((prev) => ({ ...prev, isLoading: false, results: data }))
    } catch {
      setNearby((prev) => ({
        ...prev,
        isLoading: false,
        error: 'Impossible de récupérer les spots. Réessaie.',
      }))
    }
  }

  function handleNearby() {
    if (!navigator.geolocation && !userPosition) {
      toast.error('Géolocalisation non supportée sur cet appareil.')
      return
    }

    setNearby((prev) => ({ ...prev, isOpen: true, isLoading: true, error: null, results: [] }))

    // Sheet uniquement sur mobile (< md = 768px).
    // Tablet → sidebar gauche via CSS. Desktop → sidebar droite via CSS.
    if (typeof window !== 'undefined' && window.innerWidth < 768) {
      setNearbySheetOpen(true)
    }

    // Réutilise la position GPS déjà obtenue (via "Me géolocaliser" ou requête précédente)
    if (userPosition) {
      fetchNearby(userPosition.lat, userPosition.lng)
      return
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude }
        setUserPosition(loc)
        fetchNearby(loc.lat, loc.lng)
      },
      (err) => {
        const msg =
          err.code === 1
            ? 'Géolocalisation refusée. Active-la dans les paramètres de ton navigateur.'
            : err.code === 2
              ? 'Position introuvable. Réessaie dans un instant.'
              : 'Géolocalisation trop lente. Réessaie dans un instant.'
        setNearby((prev) => ({ ...prev, isLoading: false, error: msg }))
      },
      { timeout: 8000, maximumAge: 60_000 },
    )
  }

  function handleNearbyClose() {
    setNearby((prev) => ({ ...prev, isOpen: false }))
    setNearbySheetOpen(false)
  }

  function handleNearbyResultClick(spot: NearbySpot) {
    const marker = spots.find((s) => s.id === spot.id)
    if (marker) {
      setActiveSpot(marker)
      mapInstanceRef.current?.flyTo({
        center: [marker.lng, marker.lat],
        zoom: 13,
        duration: 1000,
      })
    }
    setNearbySheetOpen(false)
  }

  const nearbyPanelProps = {
    results: nearby.results,
    userLocation: userPosition,
    userTier,
    isLoading: nearby.isLoading,
    error: nearby.error,
    onResultClick: handleNearbyResultClick,
    onRetry: userPosition
      ? () => fetchNearby(userPosition.lat, userPosition.lng)
      : undefined,
    onClose: handleNearbyClose,
  }

  const sharedFiltersProps = {
    userTier,
    userDepartment,
    availableDepartments,
    onFiltersChange: handleFiltersChange,
    spotCount: filteredSpots.length,
  }

  return (
    <div className="flex flex-col w-full h-full overflow-hidden">

      {/* ── Header mobile compact — md:hidden ──────────────────────── */}
      <div className="md:hidden shrink-0 h-14 flex items-center justify-between px-4 bg-white border-b border-ink-100 z-20">
        <BackButton fallbackHref="/" />
        <span className="font-display font-semibold text-base text-ink-900">Carte</span>
        <button
          onClick={openSheet}
          aria-label="Ouvrir les filtres"
          className="relative p-2 -mr-2 rounded-xl text-ink-700 hover:bg-ink-100 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500"
        >
          <SlidersHorizontal size={20} />
          {activeCount > 0 && (
            <span className="absolute top-1.5 right-1 w-[18px] h-[18px] flex items-center justify-center rounded-full bg-teal-500 text-navy-950 text-[9px] font-bold leading-none">
              {activeCount}
            </span>
          )}
        </button>
      </div>

      {/* ── Zone principale (sidebars + carte) ─────────────────────── */}
      <div className="flex-1 min-h-0 flex flex-col lg:flex-row">

        {/* ── Desktop : sidebar GAUCHE — toujours filtres (lg+) ─────── */}
      <aside className={`hidden lg:flex ${ASIDE_BASE}`}>
        <div className="px-4 py-3 border-b border-ink-100 shrink-0">
          <h2 className="font-semibold text-sm text-ink-900">Filtres</h2>
          {activeCount > 0 && (
            <span className="text-xs text-ink-500">
              {activeCount} filtre{activeCount > 1 ? 's' : ''} actif{activeCount > 1 ? 's' : ''}
            </span>
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

      {/* ── Tablet : sidebar GAUCHE — NearbyPanel quand ouvert (md–lg) */}
      {nearby.isOpen && (
        <aside className={`hidden md:flex lg:hidden ${ASIDE_BASE}`}>
          <NearbyPanel {...nearbyPanelProps} layout="sidebar" />
        </aside>
      )}

      {/* ── Tablet : top bar compacte — cachée quand nearby ouvert ── */}
      {!nearby.isOpen && (
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
              <span className="w-4 h-4 flex items-center justify-center rounded-full bg-teal-500 text-navy-950 text-[10px] font-bold">
                {activeCount}
              </span>
            )}
          </button>
        </div>
      )}

      {/* ── Zone carte (toutes tailles) ────────────────────────────── */}
      <div className="relative flex-1 min-h-0 min-w-0">
        <MapView
          spots={filteredSpots}
          nearbySpotIds={nearbySpotIds}
          initialCenter={initialCenter ?? COASTAL_DEFAULT_CENTER}
          initialZoom={initialZoom ?? COASTAL_DEFAULT_ZOOM}
          className="w-full h-full"
          onMarkerClick={setActiveSpot}
          onMapReady={(map) => {
            mapInstanceRef.current = map
            setMapInstance(map)
            // Carte prête → un clic marker peut suivre : on précharge le chunk popup
            void loadSpotPopup()
          }}
        />

        {/* Stack boutons — top-right — tablet/desktop uniquement (FAB stack gère mobile) */}
        <div className="hidden md:flex absolute top-3 right-3 z-10 flex-col gap-2">
          {/* Géolocaliser */}
          <button
            onClick={handleGeolocate}
            disabled={isGeolocating}
            title="Me géolocaliser"
            aria-label="Me géolocaliser"
            className={[
              'relative flex items-center gap-2 px-3 py-2 rounded-xl overflow-hidden',
              'bg-white/95 backdrop-blur-sm shadow-md border border-ink-200',
              'text-ink-700 text-sm font-medium',
              'hover:bg-white hover:border-teal-400 transition-all',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500',
              'disabled:opacity-70 disabled:cursor-not-allowed',
            ].join(' ')}
          >
            {isGeolocating && (
              <span className="absolute inset-0 rounded-xl bg-teal-400/15 animate-pulse pointer-events-none" aria-hidden="true" />
            )}
            <Navigation
              size={16}
              className={isGeolocating ? 'text-teal-500' : 'text-ink-500'}
            />
            <span className="hidden sm:inline">
              {isGeolocating ? 'Localisation…' : 'Me géolocaliser'}
            </span>
          </button>

          {/* Spots autour de moi */}
          <button
            onClick={handleNearby}
            title="Spots autour de moi"
            aria-label="Spots autour de moi"
            className={[
              'flex items-center gap-2 px-3 py-2 rounded-xl',
              'backdrop-blur-sm shadow-md text-sm font-medium transition-all',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500',
              nearby.isOpen
                ? 'bg-teal-500 border border-teal-500 text-navy-950 font-semibold hover:bg-teal-400'
                : 'bg-white/95 border border-ink-200 text-ink-700 hover:bg-white hover:border-teal-400',
            ].join(' ')}
          >
            <Locate size={16} className={nearby.isLoading ? 'animate-pulse' : ''} />
            <span className="hidden sm:inline">Spots autour de moi</span>
          </button>
        </div>

        {/* FAB Filtres
            — mobile : toujours visible (md:hidden)
            — tablet : visible quand nearby est ouvert (lg:hidden sinon md:hidden)
            — desktop : jamais (lg+ est géré par la sidebar)                       */}
        <button
          onClick={openSheet}
          aria-label="Ouvrir les filtres"
          className={[
            'absolute top-3 left-3 z-10',
            'flex items-center gap-1.5 px-3 py-2 rounded-xl',
            'bg-white/95 backdrop-blur-sm shadow-md border border-ink-200',
            'text-ink-700 text-sm font-medium',
            'hover:bg-white hover:border-teal-400 transition-all',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500',
            // Le header compact mobile gère le bouton filtres sur mobile.
            // FAB uniquement sur tablet quand nearby ouvert (la top bar est remplacée par NearbyPanel).
            nearby.isOpen ? 'hidden md:flex lg:hidden' : 'hidden',
          ].join(' ')}
        >
          <SlidersHorizontal size={16} className="text-ink-500" />
          <span>Filtres</span>
          {activeCount > 0 && (
            <span className="w-5 h-5 flex items-center justify-center rounded-full bg-teal-500 text-navy-950 text-xs font-bold">
              {activeCount}
            </span>
          )}
        </button>

        {/* Légende qualité — desktop uniquement */}
        <MapLegend />

        {/* Marqueur position utilisateur — affiché après géolocalisation */}
        <UserLocationMarker map={mapInstance} position={userPosition} />

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
                className="shrink-0 px-3 py-1.5 bg-teal-500 hover:bg-teal-400 text-navy-950 text-sm font-semibold rounded-xl transition-colors whitespace-nowrap"
              >
                C&apos;est gratuit
              </Link>
            </div>
          </div>
        )}

        {/* Bandeau upsell discovery */}
        {showUpsell && !activeSpot && <UpsellBanner />}
      </div>

      {/* ── Desktop : sidebar DROITE — NearbyPanel quand ouvert (lg+) */}
      {nearby.isOpen && (
        <aside className="hidden lg:flex flex-col w-[360px] shrink-0 bg-white border-l border-ink-100 shadow-lg z-10 overflow-hidden">
          <NearbyPanel {...nearbyPanelProps} layout="sidebar" />
        </aside>
      )}

      </div>{/* end zone principale */}

      {/* ── FAB stack — mobile uniquement (md:hidden) ──────────────── */}
      {/* bottom calc() intègre la safe area iOS pour rester au-dessus de la home bar */}
      <div
        className="md:hidden fixed z-50 flex flex-col gap-3"
        style={{ bottom: 'calc(1.5rem + env(safe-area-inset-bottom, 0px))', right: '1rem' }}
      >
        <button
          onClick={handleGeolocate}
          disabled={isGeolocating}
          aria-label="Centrer la carte sur ma position"
          className={[
            'relative w-14 h-14 rounded-full flex items-center justify-center',
            'bg-white shadow-lg border-2',
            isGeolocating ? 'border-teal-500/60' : 'border-teal-500/20',
            'hover:border-teal-500 active:scale-95 transition-all',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500',
            'disabled:cursor-not-allowed',
          ].join(' ')}
        >
          {isGeolocating && (
            <span
              className="absolute inset-0 rounded-full bg-teal-400/30 animate-ping pointer-events-none"
              aria-hidden="true"
            />
          )}
          <Locate
            size={22}
            className={isGeolocating ? 'text-teal-500' : 'text-ink-700'}
          />
        </button>
        <button
          onClick={handleNearby}
          aria-label="Trouver les spots proches"
          className={[
            'w-14 h-14 rounded-full flex items-center justify-center',
            'shadow-lg border-2 transition-all',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500',
            nearby.isOpen
              ? 'bg-teal-500 border-teal-500 text-navy-950 hover:bg-teal-400 active:bg-teal-600'
              : 'bg-white border-teal-500/20 text-ink-700 hover:border-teal-500 active:scale-95',
          ].join(' ')}
        >
          <Navigation
            size={22}
            className={nearby.isLoading ? 'animate-pulse' : ''}
          />
        </button>
      </div>

      {/* ── Bottom sheet filtres — mobile + tablet ──────────────────── */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent
          side="bottom"
          showCloseButton={false}
          className="flex flex-col p-0 rounded-t-2xl overflow-hidden pb-[env(safe-area-inset-bottom)]"
          style={{ height: '92svh' }}
        >
          <SheetTitle className="sr-only">Filtres de la carte</SheetTitle>

          <div className="flex justify-center pt-2 shrink-0" aria-hidden="true">
            <div className="w-10 h-1 rounded-full bg-ink-200" />
          </div>

          <div className="flex items-center justify-between px-4 py-2.5 border-b border-ink-100 shrink-0">
            <span className="font-semibold text-base text-ink-900">
              Filtres
              {activeCount > 0 && (
                <span className="ml-2 text-sm font-normal text-ink-500">
                  ({activeCount} actif{activeCount > 1 ? 's' : ''})
                </span>
              )}
            </span>
            <button
              onClick={() => setSheetOpen(false)}
              aria-label="Fermer les filtres"
              className="p-1.5 rounded-full text-ink-500 hover:bg-ink-100 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500"
            >
              <X size={18} />
            </button>
          </div>

          <div className="flex-1 min-h-0 overflow-hidden">
            <MapFilters
              key={sheetOpenCount}
              initialFilters={filters}
              layout="sheet"
              onApply={handleApply}
              spotCount={filteredSpots.length}
              userTier={userTier}
              userDepartment={userDepartment}
              availableDepartments={availableDepartments}
            />
          </div>
        </SheetContent>
      </Sheet>

      {/* ── Bottom sheet NearbyPanel — mobile uniquement (< md) ─────── */}
      {/* 3 snap points : 20vh preview / 50vh half (défaut) / 90vh full */}
      <Sheet
        open={nearbySheetOpen}
        onOpenChange={(v) => {
          if (!v) handleNearbyClose()
          else setNearbySheetOpen(true)
        }}
        snapPoints={['20vh', '50vh', '90vh']}
        defaultSnap={1}
        dragHandle={false}
      >
        <SheetContent
          side="bottom"
          showCloseButton={false}
          className="flex flex-col p-0 overflow-hidden pb-[env(safe-area-inset-bottom)]"
          aria-label="Spots autour de moi"
        >
          <NearbyPanel {...nearbyPanelProps} layout="sheet" />
        </SheetContent>
      </Sheet>
    </div>
  )
}
