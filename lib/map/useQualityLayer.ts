'use client'

import { useEffect, useRef, useState } from 'react'
import type {
  Map as MapLibreMap,
  GeoJSONSource,
  MapLayerMouseEvent,
  Popup as MapLibrePopup,
} from 'maplibre-gl'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { SpotMarker } from '@/lib/map/utils'
import type { UserTier } from '@/lib/auth/tier'
import type { SeabedInfo } from '@/lib/conditions/bathymetry'
import { assessSuitability } from '@/lib/conditions/species-habitat'
import {
  QUALITY_SOURCE, QUALITY_FILL_LAYER, QUALITY_LABEL_LAYER, QUALITY_SPOT_LAYER_IDS,
  QUALITY_MIN_ZOOM, QUALITY_FILL_COLOR_EXPR, QUALITY_FILL_OPACITY_EXPR,
  EMPTY_FC, cellsToSquareGeoJSON, fetchQualityCells, buildQualityPopupHTML,
  type QualityFilters, type QualityCellProps, type FondState,
} from '@/lib/map/quality'

const DEBOUNCE_MS = 300

type Args = {
  map: MapLibreMap | null
  enabled: boolean
  filters: QualityFilters
  version: number // bump → refetch (ping realtime)
  tier: UserTier
  spots: SpotMarker[]
}

/**
 * Pilote la couche « Qualité » (Carte v2 / C3b) SANS modifier MapView : opère sur
 * l'instance MapLibre (onMapReady). Crée la grille de cellules colorées (fill +
 * label score) sous les markers, re-fetch la RPC get_quality_cells (debounce) au
 * pan/zoom + filtres/version, et ouvre au clic le popup DÉCOMPOSÉ (communauté /
 * fond / perso). La composante fond est récupérée à la demande (Itinérant, /api/seabed).
 *
 * Retourne { cellCount, loading } pour l'état vide honnête.
 */
export function useQualityLayer({ map, enabled, filters, version, tier, spots }: Args) {
  const [cellCount, setCellCount] = useState<number | null>(null)
  const [loading, setLoading] = useState(false)

  const filtersRef = useRef(filters); filtersRef.current = filters
  const enabledRef = useRef(enabled); enabledRef.current = enabled
  const tierRef = useRef(tier); tierRef.current = tier
  const spotsRef = useRef(spots); spotsRef.current = spots
  const supaRef = useRef<SupabaseClient | null>(null)
  const createdRef = useRef(false)
  const debTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const reqId = useRef(0)
  const aliveRef = useRef(true)

  // Popup courant + jeton anti-périmé (un fetch fond en vol ne réécrit pas un popup fermé/remplacé).
  const popupRef = useRef<MapLibrePopup | null>(null)
  const popupReqRef = useRef(0)

  const filtersKey = `${filters.days}|${filters.species ?? ''}|${filters.technique ?? ''}`

  async function getSupa(): Promise<SupabaseClient> {
    if (supaRef.current) return supaRef.current
    const { createClient } = await import('@/lib/supabase/client')
    supaRef.current = createClient()
    return supaRef.current
  }

  function ensureLayers(m: MapLibreMap) {
    if (createdRef.current || m.getSource(QUALITY_SOURCE)) { createdRef.current = true; return }
    // Insère SOUS la 1re couche spot → markers cliquables au-dessus.
    let beforeId: string | undefined
    for (const id of QUALITY_SPOT_LAYER_IDS) { if (m.getLayer(id)) { beforeId = id; break } }

    m.addSource(QUALITY_SOURCE, { type: 'geojson', data: EMPTY_FC })
    m.addLayer({
      id: QUALITY_FILL_LAYER,
      type: 'fill',
      source: QUALITY_SOURCE,
      minzoom: QUALITY_MIN_ZOOM,
      layout: { visibility: 'none' },
      paint: {
        'fill-color': QUALITY_FILL_COLOR_EXPR,
        'fill-opacity': QUALITY_FILL_OPACITY_EXPR,
        'fill-outline-color': '#04141C', // navy-950 — contour systématique (2e canal daltonien)
      },
    }, beforeId)
    // Chiffre du score (font de la map MapTiler) au zoom rapproché — canal le plus
    // robuste pour un daltonien : un nombre n'a pas de teinte.
    m.addLayer({
      id: QUALITY_LABEL_LAYER,
      type: 'symbol',
      source: QUALITY_SOURCE,
      minzoom: 10,
      layout: {
        visibility: 'none',
        'text-field': ['to-string', ['get', 'score']],
        'text-font': ['DIN Offc Pro Medium', 'Arial Unicode MS Bold'],
        'text-size': 12,
        'text-allow-overlap': false,
      },
      paint: {
        'text-color': '#ffffff',
        'text-halo-color': '#04141C',
        'text-halo-width': 1.5,
      },
    }, beforeId)
    createdRef.current = true
  }

  function setVisible(m: MapLibreMap, on: boolean) {
    const v = on ? 'visible' : 'none'
    if (m.getLayer(QUALITY_FILL_LAYER)) m.setLayoutProperty(QUALITY_FILL_LAYER, 'visibility', v)
    if (m.getLayer(QUALITY_LABEL_LAYER)) m.setLayoutProperty(QUALITY_LABEL_LAYER, 'visibility', v)
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
      const cells = await fetchQualityCells(supa, bbox, m.getZoom(), filtersRef.current)
      if (!aliveRef.current || id !== reqId.current) return
      try {
        const src = m.getSource(QUALITY_SOURCE) as GeoJSONSource | undefined
        src?.setData(cellsToSquareGeoJSON(cells))
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

  // Résout un spot curé situé DANS la cellule cliquée (pour le lien fiche).
  function spotInCell(cx: number, cy: number, cs: number): { slug: string; name: string } | null {
    const h = cs / 2
    const s = spotsRef.current.find(
      (sp) => Math.abs(sp.lng - cx) <= h && Math.abs(sp.lat - cy) <= h && sp.source === 'curated',
    )
    return s ? { slug: s.slug, name: s.name } : null
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
      const spotLayers = QUALITY_SPOT_LAYER_IDS.filter((id) => map.getLayer(id))
      if (spotLayers.length) {
        const hits = map.queryRenderedFeatures(e.point, { layers: spotLayers })
        if (hits.length) return
      }

      const raw = f.properties as Record<string, unknown>
      // Les props peuvent revenir typées string selon la source → coercition défensive.
      const props: QualityCellProps = {
        score: Number(raw.score),
        quality: String(raw.quality),
        community_count: Number(raw.community_count),
        fishers_count: Number(raw.fishers_count),
        perso_count: Number(raw.perso_count),
        cx: Number(raw.cx),
        cy: Number(raw.cy),
        cs: Number(raw.cs),
      }
      const species = filtersRef.current.species ?? null
      const days = filtersRef.current.days
      const isItinerant = tierRef.current === 'itinerant'
      const link = spotInCell(props.cx, props.cy, props.cs)

      const fondInitial: FondState = isItinerant ? { kind: 'loading' } : { kind: 'hidden' }
      const vm = { props, species, days, tier: tierRef.current, fond: fondInitial, spotLink: link }

      const maplibre = await import('maplibre-gl')
      if (cancelled) return
      const myReq = ++popupReqRef.current
      if (!popupRef.current) {
        popupRef.current = new maplibre.Popup({ closeButton: true, closeOnClick: true, maxWidth: '280px' })
      }
      popupRef.current.setLngLat([props.cx, props.cy]).setHTML(buildQualityPopupHTML(vm)).addTo(map)

      // Composante FOND : récupérée à la demande, Itinérant uniquement.
      if (!isItinerant) return
      const stale = () =>
        cancelled || myReq !== popupReqRef.current || !popupRef.current || !popupRef.current.isOpen()
      try {
        const res = await fetch(`/api/seabed?lat=${props.cy.toFixed(5)}&lng=${props.cx.toFixed(5)}`)
        if (stale()) return
        if (!res.ok) {
          popupRef.current!.setHTML(buildQualityPopupHTML({ ...vm, fond: { kind: 'unavailable' } }))
          return
        }
        const info = (await res.json()) as SeabedInfo
        if (stale()) return
        const assessment = assessSuitability(species, info)
        popupRef.current!.setHTML(buildQualityPopupHTML({ ...vm, fond: { kind: 'done', assessment } }))
      } catch {
        if (!stale()) popupRef.current!.setHTML(buildQualityPopupHTML({ ...vm, fond: { kind: 'unavailable' } }))
      }
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

    // ★ Sprint 88, Bloc 5 — les trois listeners DÉLÉGUÉS (ceux qui portent un
    // layerId) sont branchés et débranchés ensemble.
    //
    // Ils empruntent le wrapper interne de MapLibre, qui fait
    // `layerIds.filter((id) => this.getLayer(id))` (maplibre-gl 5.24.0,
    // dist/maplibre-gl-dev.js:72135) AVANT d'appeler notre handler — et `getLayer`
    // déréférence `this.style` sans le tester (:73161). Sur `webglcontextlost`
    // (:71347), `map.style` devient `null` alors que la carte reste MONTÉE et ses
    // écouteurs DOM actifs : le prochain tap plante, et notre handler n'a même pas
    // la main pour se défendre. C'est l'issue JAVASCRIPT-NEXTJS-19, sur /carte.
    //
    // Le drapeau évite les doubles inscriptions : `map.off` d'un délégué ne retire
    // que la PREMIÈRE correspondance (:72161), donc un `on` en trop resterait.
    let delegatesOn = false
    const attachDelegates = () => {
      if (delegatesOn) return
      delegatesOn = true
      map.on('click', QUALITY_FILL_LAYER, onClick)
      map.on('mouseenter', QUALITY_FILL_LAYER, onEnter)
      map.on('mouseleave', QUALITY_FILL_LAYER, onLeave)
    }
    const detachDelegates = () => {
      if (!delegatesOn) return
      delegatesOn = false
      map.off('click', QUALITY_FILL_LAYER, onClick)
      map.off('mouseenter', QUALITY_FILL_LAYER, onEnter)
      map.off('mouseleave', QUALITY_FILL_LAYER, onLeave)
    }

    attachDelegates()
    // MapLibre restaure le style tout seul après un incident GPU
    // (`_contextRestored`, :71350) : on se rebranche, sinon la couche qualité
    // deviendrait définitivement muette jusqu'au remontage du composant.
    map.on('webglcontextlost', detachDelegates)
    map.on('webglcontextrestored', attachDelegates)

    return () => {
      cancelled = true
      aliveRef.current = false
      clearTimeout(debTimer.current)
      map.off('moveend', onMoveEnd)
      map.off('idle', ready)
      map.off('webglcontextlost', detachDelegates)
      map.off('webglcontextrestored', attachDelegates)
      detachDelegates()
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
