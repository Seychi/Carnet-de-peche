'use client'

import { useEffect } from 'react'
import type { Map as MapLibreMap, MapMouseEvent, Popup as MapLibrePopup } from 'maplibre-gl'
import type { SeabedInfo } from '@/lib/conditions/bathymetry'
import {
  addBathyLayer,
  removeBathyLayer,
  setBathyOpacity,
  buildSeabedPopupHTML,
  BATHY_DEPTH_LAYER,
  SPOT_LAYER_IDS,
} from '@/lib/map/bathymetry-layer'

const LOADING_HTML =
  '<div style="font:13px system-ui;color:#64748b;min-width:150px">Analyse du fond…</div>'
const UNAVAILABLE_HTML =
  '<div style="font:13px system-ui;color:#64748b;min-width:150px">Donnée indisponible.</div>'

/**
 * Couche « Fond marin » (profondeur + nature du fond) — Carte v2 / C3a.
 * Gère l'ajout/retrait LAZY de la couche raster EMODnet (rien chargé tant que !active)
 * + le popup « Fond : X · Profondeur : Y m » au clic carte (lookup serveur /api/seabed).
 * `enabled` = tier Itinérant : hors Itinérant on ne branche rien (l'UI propose l'upsell).
 * Logique pure dans lib/map/bathymetry-layer.ts.
 */
export function useBathyLayer({
  map,
  active,
  opacity,
  enabled,
}: {
  map: MapLibreMap | null
  active: boolean
  opacity: number
  enabled: boolean
}) {
  // Ajout / retrait de la couche raster.
  useEffect(() => {
    if (!map || !enabled) return
    if (active) addBathyLayer(map, opacity)
    else removeBathyLayer(map)
    return () => {
      if (map.getLayer(BATHY_DEPTH_LAYER)) removeBathyLayer(map)
    }
    // opacity géré par l'effet dédié (pas de remove/add à chaque cran du slider)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, enabled, active])

  useEffect(() => {
    if (map && active && enabled) setBathyOpacity(map, opacity)
  }, [map, active, enabled, opacity])

  // Popup « Fond / Profondeur » au clic carte (hors clic sur un spot).
  useEffect(() => {
    if (!map || !active || !enabled) return
    let cancelled = false
    let popup: MapLibrePopup | null = null
    let reqId = 0

    const handler = async (e: MapMouseEvent) => {
      // Ne pas voler le clic d'un spot (évite le double-popup avec la fiche spot).
      const spotLayers = SPOT_LAYER_IDS.filter((id) => map.getLayer(id))
      if (spotLayers.length) {
        const hits = map.queryRenderedFeatures(e.point, { layers: spotLayers })
        if (hits.length) return
      }

      const { lng, lat } = e.lngLat
      const maplibre = await import('maplibre-gl')
      if (cancelled) return
      if (!popup) popup = new maplibre.Popup({ closeButton: true, closeOnClick: true, maxWidth: '240px' })
      const myReq = ++reqId
      popup.setLngLat([lng, lat]).setHTML(LOADING_HTML).addTo(map)

      // Garde : clic obsolète, effet démonté, ou popup fermée par l'utilisateur pendant
      // le fetch → ne pas réécrire (sinon popup fantôme).
      const stale = () => cancelled || myReq !== reqId || !popup || !popup.isOpen()

      try {
        const res = await fetch(`/api/seabed?lat=${lat.toFixed(5)}&lng=${lng.toFixed(5)}`)
        if (stale()) return
        if (!res.ok) {
          popup!.setHTML(UNAVAILABLE_HTML)
          return
        }
        const info = (await res.json()) as SeabedInfo
        if (stale()) return
        popup!.setHTML(buildSeabedPopupHTML(info))
      } catch {
        if (!stale()) popup!.setHTML(UNAVAILABLE_HTML)
      }
    }

    map.on('click', handler)
    map.getCanvas().style.cursor = 'crosshair'
    return () => {
      cancelled = true
      map.off('click', handler)
      if (map.getCanvas) map.getCanvas().style.cursor = ''
      popup?.remove()
    }
  }, [map, active, enabled])
}
