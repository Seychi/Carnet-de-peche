'use client'

import { useEffect, useRef, useState } from 'react'
import type { Map as MapLibreMap, GeoJSONSource } from 'maplibre-gl'
import type { SupabaseClient } from '@supabase/supabase-js'
import {
  HEAT_SOURCE, HEAT_LAYER, HEAT_POINT_LAYER, SPOT_LAYER_IDS,
  HEAT_COLOR_EXPR, HEAT_WEIGHT_MAX, EMPTY_FC,
  cellsToGeoJSON, fetchCatchHeatmap, type HeatFilters,
} from '@/lib/map/heatmap'

const DEBOUNCE_MS = 350

type Args = {
  map: MapLibreMap | null
  enabled: boolean
  filters: HeatFilters
  version: number // bump → force un refetch (ping realtime)
}

/**
 * Pilote la couche heatmap des prises publiques SANS modifier MapView : opère
 * directement sur l'instance MapLibre obtenue via onMapReady. Crée la source/les
 * couches sous les markers, gère la visibilité, et re-fetch la RPC k-anonyme
 * (debounce) à la fin de chaque pan/zoom + sur changement de filtres/version.
 *
 * Retourne { cellCount, loading } pour l'état vide (« peu de prises pour l'instant »).
 */
export function useCatchHeatmap({ map, enabled, filters, version }: Args) {
  const [cellCount, setCellCount] = useState<number | null>(null) // null = pas encore chargé
  const [loading, setLoading] = useState(false)

  const filtersRef = useRef(filters); filtersRef.current = filters
  const enabledRef = useRef(enabled); enabledRef.current = enabled
  const supaRef = useRef<SupabaseClient | null>(null)
  const createdRef = useRef(false)
  const debTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const reqId = useRef(0)
  const aliveRef = useRef(true) // false au démontage → un fetch en vol ne touche plus la carte/state

  const filtersKey = `${filters.days}|${(filters.species ?? []).join(',')}|${(filters.techniques ?? []).join(',')}`

  async function getSupa(): Promise<SupabaseClient> {
    if (supaRef.current) return supaRef.current
    const { createClient } = await import('@/lib/supabase/client')
    supaRef.current = createClient()
    return supaRef.current
  }

  function ensureLayers(m: MapLibreMap) {
    if (createdRef.current || m.getSource(HEAT_SOURCE)) { createdRef.current = true; return }
    // Insère SOUS la 1re couche spot existante → les markers restent au-dessus.
    let beforeId: string | undefined
    for (const id of SPOT_LAYER_IDS) { if (m.getLayer(id)) { beforeId = id; break } }

    m.addSource(HEAT_SOURCE, { type: 'geojson', data: EMPTY_FC })
    m.addLayer({
      id: HEAT_LAYER,
      type: 'heatmap',
      source: HEAT_SOURCE,
      maxzoom: 12,
      layout: { visibility: 'none' },
      paint: {
        'heatmap-weight': ['interpolate', ['linear'], ['get', 'count'], 0, 0, HEAT_WEIGHT_MAX, 1],
        'heatmap-intensity': ['interpolate', ['linear'], ['zoom'], 4, 1, 12, 3],
        'heatmap-color': HEAT_COLOR_EXPR,
        'heatmap-radius': ['interpolate', ['linear'], ['zoom'], 4, 14, 9, 26, 12, 36],
        'heatmap-opacity': ['interpolate', ['linear'], ['zoom'], 10, 0.85, 12, 0.4],
      },
    }, beforeId)
    // Cercles au zoom élevé (la heatmap s'éteint à maxzoom 12) — matérialisent les mailles.
    m.addLayer({
      id: HEAT_POINT_LAYER,
      type: 'circle',
      source: HEAT_SOURCE,
      minzoom: 11,
      layout: { visibility: 'none' },
      paint: {
        'circle-radius': ['interpolate', ['linear'], ['get', 'count'], 3, 8, HEAT_WEIGHT_MAX, 22],
        'circle-color': '#dd513a',
        'circle-opacity': ['interpolate', ['linear'], ['zoom'], 11, 0, 12, 0.45],
        'circle-stroke-color': '#fca50a',
        'circle-stroke-width': 1,
      },
    }, beforeId)
    createdRef.current = true
  }

  function setVisible(m: MapLibreMap, on: boolean) {
    const v = on ? 'visible' : 'none'
    if (m.getLayer(HEAT_LAYER)) m.setLayoutProperty(HEAT_LAYER, 'visibility', v)
    if (m.getLayer(HEAT_POINT_LAYER)) m.setLayoutProperty(HEAT_POINT_LAYER, 'visibility', v)
  }

  async function refresh(m: MapLibreMap) {
    if (!enabledRef.current) return
    const id = ++reqId.current
    setLoading(true)
    const b = m.getBounds()
    const bbox = { minLng: b.getWest(), minLat: b.getSouth(), maxLng: b.getEast(), maxLat: b.getNorth() }
    try {
      const supa = await getSupa()
      const cells = await fetchCatchHeatmap(supa, bbox, m.getZoom(), filtersRef.current)
      // Carte démontée pendant le fetch, ou requête périmée → ne touche ni la carte ni le state.
      if (!aliveRef.current || id !== reqId.current) return
      try {
        const src = m.getSource(HEAT_SOURCE) as GeoJSONSource | undefined
        src?.setData(cellsToGeoJSON(cells))
      } catch { /* carte retirée entre-temps — ignore */ }
      setCellCount(cells.length)
    } finally {
      if (aliveRef.current && id === reqId.current) setLoading(false)
    }
  }

  function debouncedRefresh(m: MapLibreMap) {
    clearTimeout(debTimer.current)
    debTimer.current = setTimeout(() => { void refresh(m) }, DEBOUNCE_MS)
  }

  // Carte prête : crée les couches + branche moveend.
  useEffect(() => {
    if (!map) return
    aliveRef.current = true
    let cancelled = false
    const onMoveEnd = () => { if (enabledRef.current && !cancelled) debouncedRefresh(map) }

    const ready = () => {
      if (cancelled) return
      ensureLayers(map)
      setVisible(map, enabledRef.current)
      if (enabledRef.current) void refresh(map)
    }
    if (map.isStyleLoaded()) ready()
    else map.once('idle', ready)
    map.on('moveend', onMoveEnd)

    return () => {
      cancelled = true
      aliveRef.current = false
      clearTimeout(debTimer.current)
      map.off('moveend', onMoveEnd)
      map.off('idle', ready)
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
