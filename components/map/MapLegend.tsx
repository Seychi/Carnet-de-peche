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

      {/* ⟢ MERGE C2 — Provenance + attribution OSM (ODbL). Le badge « Vérifié »
          (✓, forme) distingue les curés ; communautaire / importé n'en ont pas. */}
      <div className="flex items-center gap-3 border-t border-ink-100 pt-1.5">
        <span className="flex items-center gap-1.5 whitespace-nowrap">
          <span
            className="inline-flex h-3.5 w-3.5 items-center justify-center rounded-full bg-navy-950 text-[8px] font-bold text-white"
            aria-hidden
          >
            ✓
          </span>
          Coordonnée vérifiée
        </span>
        <span className="whitespace-nowrap text-ink-400">Communautaire / Importé : sans badge</span>
      </div>
      <p className="text-[10px] text-ink-400">
        Le badge ✓ marque une coordonnée vérifiée à la main, fixe. Pas un point communautaire approximatif.
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
