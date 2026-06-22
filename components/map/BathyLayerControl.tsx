'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import { Waves, Lock } from 'lucide-react'
import type { Map as MapLibreMap, Popup as MapLibrePopup, MapMouseEvent } from 'maplibre-gl'
import type { UserTier } from '@/lib/auth/tier'
import type { SeabedInfo } from '@/lib/conditions/bathymetry'
import {
  addBathyLayer,
  removeBathyLayer,
  setBathyOpacity,
  buildSeabedPopupHTML,
  SPOT_LAYER_IDS,
} from '@/lib/map/bathymetry-layer'

// Couche avancée « Fond marin » (profondeur + nature du fond) — réservée Itinérant
// (cf brief C3a + tarifs §8 CLAUDE.md). ⚠️ DEMANDER À JOHN : les tarifs listent
// « Couches avancées (bathymétrie) » côté Local ET « Bathymétrie SHOM premium »
// côté Itinérant. Le brief C3a tranche Itinérant → on s'y tient ; un seul point de
// changement si John préfère Local : BATHY_TIER ci-dessous.
const BATHY_TIER: UserTier = 'itinerant'

// Composant AUTONOME : il porte tout l'état + les effets + l'UI de la couche, et se
// place une seule fois sur la carte. Au merge avec C1 (qui possède le squelette du
// sélecteur de couches), on déplace CE composant dans le sélecteur — rien d'autre à
// défaire. La logique MapLibre vit dans lib/map/bathymetry-layer.ts.
export default function BathyLayerControl({
  map,
  userTier,
}: {
  map: MapLibreMap | null
  userTier: UserTier
}) {
  const isItinerant = userTier === BATHY_TIER
  const [active, setActive] = useState(false)
  const [opacity, setOpacity] = useState(0.7)
  const popupRef = useRef<MapLibrePopup | null>(null)

  // Ajout/retrait de la couche raster (lazy : rien n'est chargé tant que !active).
  useEffect(() => {
    if (!map || !isItinerant) return
    if (active) addBathyLayer(map, opacity)
    else removeBathyLayer(map)
    return () => {
      // au démontage : on nettoie la couche pour ne pas la laisser orpheline
      if (map.getLayer('bathy-depth')) removeBathyLayer(map)
    }
    // opacity géré par l'effet dédié (évite remove/add à chaque cran du slider)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, isItinerant, active])

  useEffect(() => {
    if (map && active && isItinerant) setBathyOpacity(map, opacity)
  }, [map, active, isItinerant, opacity])

  // Popup « Fond / Profondeur » au clic carte (hors clic sur un spot). Lookup
  // serveur /api/seabed (gated Itinérant) → on ne le branche que pour Itinérant.
  useEffect(() => {
    if (!map || !active || !isItinerant) return
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
      popupRef.current = popup
      const myReq = ++reqId
      popup
        .setLngLat([lng, lat])
        .setHTML('<div style="font:13px system-ui;color:#64748b;min-width:150px">Analyse du fond…</div>')
        .addTo(map)

      // Garde commune : clic obsolète, effet démonté, ou popup fermée par l'utilisateur
      // (closeOnClick / bouton ×) pendant le fetch → ne pas réécrire (sinon popup fantôme).
      const stale = () => cancelled || myReq !== reqId || !popup || !popup.isOpen()

      try {
        const res = await fetch(`/api/seabed?lat=${lat.toFixed(5)}&lng=${lng.toFixed(5)}`)
        if (stale()) return
        if (!res.ok) {
          popup!.setHTML('<div style="font:13px system-ui;color:#64748b;min-width:150px">Donnée indisponible.</div>')
          return
        }
        const info = (await res.json()) as SeabedInfo
        if (stale()) return
        popup!.setHTML(buildSeabedPopupHTML(info))
      } catch {
        if (!stale()) {
          popup!.setHTML('<div style="font:13px system-ui;color:#64748b;min-width:150px">Donnée indisponible.</div>')
        }
      }
    }

    map.on('click', handler)
    map.getCanvas().style.cursor = 'crosshair'
    return () => {
      cancelled = true
      map.off('click', handler)
      if (map.getCanvas) map.getCanvas().style.cursor = ''
      popup?.remove()
      popupRef.current = null
    }
  }, [map, active, isItinerant])

  // ── UI ────────────────────────────────────────────────────────────────────
  // Aperçu pour l'upsell : les tiers < Itinérant VOIENT le contrôle (verrouillé)
  // → ça donne envie. Le clic mène aux tarifs au lieu d'activer la couche.
  if (!isItinerant) {
    return (
      <Link
        href="/tarifs?from=bathy"
        onClick={() =>
          toast.info('Couche Fond marin (profondeur + nature du fond) réservée à l’offre Itinérant.')
        }
        title="Fond marin — offre Itinérant"
        aria-label="Couche fond marin (réservée à l’offre Itinérant)"
        className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/95 backdrop-blur-sm shadow-md border border-ink-200 text-ink-500 text-sm font-medium hover:bg-white hover:border-gold-400 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500"
      >
        <Waves size={16} className="text-ink-400" />
        <span className="hidden sm:inline">Fond marin</span>
        <Lock size={13} className="text-gold-500" />
      </Link>
    )
  }

  return (
    <div className="flex flex-col items-stretch gap-1.5">
      <button
        type="button"
        onClick={() => setActive((a) => !a)}
        aria-pressed={active}
        title="Couche fond marin (profondeur + nature du fond)"
        aria-label="Afficher la couche fond marin"
        className={[
          'flex items-center gap-2 px-3 py-2 rounded-xl backdrop-blur-sm shadow-md text-sm font-medium transition-all',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500',
          active
            ? 'bg-teal-500 border border-teal-500 text-navy-950 font-semibold hover:bg-teal-400'
            : 'bg-white/95 border border-ink-200 text-ink-700 hover:bg-white hover:border-teal-400',
        ].join(' ')}
      >
        <Waves size={16} className={active ? 'text-navy-950' : 'text-ink-500'} />
        <span className="hidden sm:inline">Fond marin</span>
      </button>

      {active && (
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/95 backdrop-blur-sm shadow-md border border-ink-200">
          <label htmlFor="bathy-opacity" className="sr-only">
            Opacité de la couche fond marin
          </label>
          <span className="font-mono text-[10px] text-ink-400">opacité</span>
          <input
            id="bathy-opacity"
            type="range"
            min={0.2}
            max={1}
            step={0.05}
            value={opacity}
            onChange={(e) => setOpacity(Number(e.target.value))}
            className="w-20 accent-teal-500"
          />
        </div>
      )}
    </div>
  )
}
