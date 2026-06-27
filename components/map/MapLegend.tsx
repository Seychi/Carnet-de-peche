import type { QualityLevel } from '@/lib/solunar/types'
import { QUALITY_MARKER_COLORS } from '@/lib/map/utils'

const ITEMS: { quality: QualityLevel; label: string }[] = [
  { quality: 'exceptionnelle', label: 'Exceptionnelle' },
  { quality: 'tres_bonne', label: 'Très Bonne' },
  { quality: 'bonne', label: 'Bonne' },
  { quality: 'moyenne', label: 'Moyenne' },
  { quality: 'faible', label: 'Faible' },
]

// Légende qualité + provenance — desktop uniquement (pas assez de place sur
// mobile ; l'attribution OSM du fond de carte couvre le mobile via le contrôle
// d'attribution MapLibre).
export default function MapLegend() {
  return (
    <div className="hidden md:flex absolute bottom-4 left-4 z-20 flex-col gap-1.5 px-3 py-2 rounded-xl bg-white/95 backdrop-blur-sm shadow-md border border-ink-200 text-[11px] text-ink-600">
      {/* Qualité (cividis colorblind-safe) */}
      <div className="flex items-center gap-3">
        {ITEMS.map(({ quality, label }) => (
          <span key={quality} className="flex items-center gap-1.5 whitespace-nowrap">
            <span
              className="w-2.5 h-2.5 rounded-full shrink-0"
              style={{ backgroundColor: QUALITY_MARKER_COLORS[quality] }}
              aria-hidden
            />
            {label}
          </span>
        ))}
      </div>

      {/* ⟢ Sprint 41 / WS C — Lisibilité des 4 natures. La FORME + le glyphe
          portent l'info (daltonisme), pas la teinte seule. Le ✓ est réservé aux
          spots curés ; communautaire et importé ont un repère distinct (jamais ✓). */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-ink-100 pt-1.5">
        <span className="flex items-center gap-1.5 whitespace-nowrap">
          <span
            className="inline-flex h-3.5 w-3.5 items-center justify-center rounded-full bg-navy-950 text-[8px] font-bold text-white"
            aria-hidden
          >
            ✓
          </span>
          Curé vérifié
        </span>
        <span className="flex items-center gap-1.5 whitespace-nowrap">
          <span
            className="inline-flex h-3.5 w-3.5 items-center justify-center rounded-full bg-[#475569] text-[9px] font-bold text-white"
            aria-hidden
          >
            ~
          </span>
          Communauté
        </span>
        <span className="flex items-center gap-1.5 whitespace-nowrap">
          <span
            className="inline-flex h-3.5 w-3.5 items-center justify-center rounded-full bg-[#94a3b8] text-[9px] font-bold text-white"
            aria-hidden
          >
            ◦
          </span>
          Importé
        </span>
        <span className="flex items-center gap-1.5 whitespace-nowrap">
          <span
            className="inline-block h-3.5 w-3.5 rounded-[3px]"
            style={{ background: 'rgba(229,96,79,0.28)', border: '1.5px dashed #B23A2C' }}
            aria-hidden
          />
          Zone active
        </span>
      </div>
      <p className="text-[10px] text-ink-400">
        Le badge ✓ marque une coordonnée vérifiée à la main, fixe. Pas un point communautaire ou importé approximatif.
      </p>

      <p className="text-[10px] text-ink-400">
        Structures ©{' '}
        <a
          href="https://www.openstreetmap.org/copyright"
          target="_blank"
          rel="noopener noreferrer"
          className="underline hover:text-ink-600"
        >
          OpenStreetMap
        </a>{' '}
        contributors
      </p>
    </div>
  )
}
