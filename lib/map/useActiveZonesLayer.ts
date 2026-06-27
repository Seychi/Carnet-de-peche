'use client'

import { useEffect, useRef, useState } from 'react'
import type {
  Map as MapLibreMap,
  GeoJSONSource,
  MapLayerMouseEvent,
  Popup as MapLibrePopup,
} from 'maplibre-gl'
import type { SupabaseClient } from '@supabase/supabase-js'
import {
  ZONES_SOURCE, ZONES_FILL_LAYER, ZONES_LINE_LAYER, ZONES_LABEL_LAYER,
  ZONES_SPOT_LAYER_IDS, ZONES_MIN_ZOOM, ZONES_LABEL_MIN_ZOOM,
  ZONES_FILL_COLOR, ZONES_FILL_OPACITY_EXPR, ZONES_LINE_COLOR, ZONES_LINE_DASHARRAY,
  EMPTY_FC, zonesToSquareGeoJSON, fetchActiveZones, buildActiveZonePopupHTML,
  type ZonesFilters, type ActiveZoneProps,
} from '@/lib/map/active-zones'

const DEBOUNCE_MS = 350

type Args = {
  map: MapLibreMap | null
  enabled: boolean
  filters: ZonesFilters
  version: number // bump → force un refetch (ping realtime)
}

/**
 * Pilote la couche « Zones actives » (Sprint 41 / WS A) SANS modifier MapView :
 * opère sur l'instance MapLibre (onMapReady). Crée une grille de cellules
 * cliquables (fill + contour POINTILLÉS + label « Np ») SOUS les markers, re-fetch
 * la RPC k-anonyme get_active_zones (debounce) au pan/zoom + filtres/version, et
 * ouvre au clic un petit popup « N prises récentes, M pêcheurs » (+ espèce dominante
 * si k-anon). Rendu 100 % GPU (fill/line/symbol). Aucune coordonnée précise reçue.
 *
 * Retourne { cellCount, loading } pour l'état vide honnête.
 */
export function useActiveZonesLayer({ map, enabled, filters, version }: Args) {
  const [cellCount, setCellCount] = useState<number | null>(null) // null = pas encore chargé
  const [loading, setLoading] = useState(false)

  const filtersRef = useRef(filters); filtersRef.current = filters
  const enabledRef = useRef(enabled); enabledRef.current = enabled
  const supaRef = useRef<SupabaseClient | null>(null)
  const createdRef = useRef(false)
  const debTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const reqId = useRef(0)
  const aliveRef = useRef(true)
  const popupRef = useRef<MapLibrePopup | null>(null)

  const filtersKey = `${filters.days}|${(filters.species ?? []).join(',')}|${(filters.techniques ?? []).join(',')}`

  async function getSupa(): Promise<SupabaseClient> {
    if (supaRef.current) return supaRef.current
    const { createClient } = await import('@/lib/supabase/client')
    supaRef.current = createClient()
    return supaRef.current
  }

  function ensureLayers(m: MapLibreMap) {
    if (createdRef.current || m.getSource(ZONES_SOURCE)) { createdRef.current = true; return }
    // Insère SOUS la 1re couche spot → markers cliquables au-dessus.
    let beforeId: string | undefined
    for (const id of ZONES_SPOT_LAYER_IDS) { if (m.getLayer(id)) { beforeId = id; break } }

    m.addSource(ZONES_SOURCE, { type: 'geojson', data: EMPTY_FC })
    // 1) Remplissage : opacité ∝ rang de densité (corail monochrome).
    m.addLayer({
      id: ZONES_FILL_LAYER,
      type: 'fill',
      source: ZONES_SOURCE,
      minzoom: ZONES_MIN_ZOOM,
      layout: { visibility: 'none' },
      paint: {
        'fill-color': ZONES_FILL_COLOR,
        'fill-opacity': ZONES_FILL_OPACITY_EXPR,
      },
    }, beforeId)
    // 2) Contour POINTILLÉS — canal de FORME signature (distinct du contour plein
    //    de la couche Qualité et de l'absence de contour de la heatmap).
    m.addLayer({
      id: ZONES_LINE_LAYER,
      type: 'line',
      source: ZONES_SOURCE,
      minzoom: ZONES_MIN_ZOOM,
      layout: { visibility: 'none', 'line-join': 'round' },
      paint: {
        'line-color': ZONES_LINE_COLOR,
        'line-width': 1.5,
        'line-dasharray': ZONES_LINE_DASHARRAY,
      },
    }, beforeId)
    // 3) Label « Np » (nombre de prises) — 2e canal le plus robuste pour daltonien
    //    (un nombre n'a pas de teinte) ; suffixe « p » distinct du score /100 qualité.
    m.addLayer({
      id: ZONES_LABEL_LAYER,
      type: 'symbol',
      source: ZONES_SOURCE,
      minzoom: ZONES_LABEL_MIN_ZOOM,
      layout: {
        visibility: 'none',
        'text-field': ['concat', ['to-string', ['get', 'catch_count']], 'p'],
        'text-font': ['DIN Offc Pro Medium', 'Arial Unicode MS Bold'],
        'text-size': 12,
        'text-allow-overlap': false,
      },
      paint: {
        'text-color': '#ffffff',
        'text-halo-color': '#7A271A', // corail très foncé — contraste fort
        'text-halo-width': 1.5,
      },
    }, beforeId)
    createdRef.current = true
  }

  function setVisible(m: MapLibreMap, on: boolean) {
    const v = on ? 'visible' : 'none'
    for (const id of [ZONES_FILL_LAYER, ZONES_LINE_LAYER, ZONES_LABEL_LAYER]) {
      if (m.getLayer(id)) m.setLayoutProperty(id, 'visibility', v)
    }
    if (!on) popupRef.current?.remove()
  }

  async function refresh(m: MapLibreMap) {
    if (!enabledRef.current) return
    const id = ++reqId.current
    setLoading(true)
    const b = m.getBounds()
    const bbox = { minLng: b.getWest(), minLat: b.getSouth(), maxLng: b.getEast(), maxLat: b.getNorth() }
    try {
      const supa = await getSupa()
      const zones = await fetchActiveZones(supa, bbox, m.getZoom(), filtersRef.current)
      // Carte démontée pendant le fetch, ou requête périmée → ne touche ni la carte ni le state.
      if (!aliveRef.current || id !== reqId.current) return
      try {
        const src = m.getSource(ZONES_SOURCE) as GeoJSONSource | undefined
        src?.setData(zonesToSquareGeoJSON(zones))
      } catch { /* carte retirée entre-temps — ignore */ }
      setCellCount(zones.length)
    } finally {
      if (aliveRef.current && id === reqId.current) setLoading(false)
    }
  }

  function debouncedRefresh(m: MapLibreMap) {
    clearTimeout(debTimer.current)
    debTimer.current = setTimeout(() => { void refresh(m) }, DEBOUNCE_MS)
  }

  // ── Carte prête : crée les couches + branche moveend + clic + survol ──────────
  useEffect(() => {
    if (!map) return
    aliveRef.current = true
    let cancelled = false

    const onMoveEnd = () => { if (enabledRef.current && !cancelled) debouncedRefresh(map) }
    const onEnter = () => { map.getCanvas().style.cursor = 'pointer' }
    const onLeave = () => { map.getCanvas().style.cursor = '' }

    const onClick = async (e: MapLayerMouseEvent) => {
      const f = e.features?.[0]
      if (!f) return
      // Ne pas voler le clic d'un spot (évite le double-popup avec la fiche spot).
      const spotLayers = ZONES_SPOT_LAYER_IDS.filter((id) => map.getLayer(id))
      if (spotLayers.length) {
        const hits = map.queryRenderedFeatures(e.point, { layers: spotLayers })
        if (hits.length) return
      }
      const raw = f.properties as Record<string, unknown>
      const props: ActiveZoneProps = {
        catch_count: Number(raw.catch_count),
        fishers_count: Number(raw.fishers_count),
        rank: Number(raw.rank),
        dominant_species: String(raw.dominant_species ?? ''),
        cx: Number(raw.cx),
        cy: Number(raw.cy),
      }
      const maplibre = await import('maplibre-gl')
      if (cancelled) return
      if (!popupRef.current) {
        popupRef.current = new maplibre.Popup({ closeButton: true, closeOnClick: true, maxWidth: '260px' })
      }
      popupRef.current
        .setLngLat([props.cx, props.cy])
        .setHTML(buildActiveZonePopupHTML(props, filtersRef.current.days))
        .addTo(map)
    }

    const ready = () => {
      if (cancelled) return
      ensureLayers(map)
      setVisible(map, enabledRef.current)
      if (enabledRef.current) void refresh(map)
    }
    if (map.isStyleLoaded()) ready()
    else map.once('idle', ready)
    map.on('moveend', onMoveEnd)
    map.on('click', ZONES_FILL_LAYER, onClick)
    map.on('mouseenter', ZONES_FILL_LAYER, onEnter)
    map.on('mouseleave', ZONES_FILL_LAYER, onLeave)

    return () => {
      cancelled = true
      aliveRef.current = false
      clearTimeout(debTimer.current)
      map.off('moveend', onMoveEnd)
      map.off('idle', ready)
      map.off('click', ZONES_FILL_LAYER, onClick)
      map.off('mouseenter', ZONES_FILL_LAYER, onEnter)
      map.off('mouseleave', ZONES_FILL_LAYER, onLeave)
      popupRef.current?.remove()
    }
  }, [map]) // eslint-disable-line react-hooks/exhaustive-deps

  // Toggle visibilité + (re)fetch quand enabled / filtres / version changent.
  useEffect(() => {
    if (!map || !createdRef.current) return
    setVisible(map, enabled)
    if (enabled) debouncedRefresh(map)
    else setCellCount(null)
  }, [map, enabled, version, filtersKey]) // eslint-disable-line react-hooks/exhaustive-deps

  return { cellCount, loading }
}
