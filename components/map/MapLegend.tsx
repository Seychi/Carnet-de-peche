import type { QualityLevel } from '@/lib/solunar/types'
import { QUALITY_MARKER_COLORS } from '@/lib/map/utils'

const ITEMS: { quality: QualityLevel; label: string }[] = [
  { quality: 'exceptionnelle', label: 'Exceptionnelle' },
  { quality: 'tres_bonne', label: 'Très Bonne' },
  { quality: 'bonne', label: 'Bonne' },
  { quality: 'moyenne', label: 'Moyenne' },
  { quality: 'faible', label: 'Faible' },
]

// Légende qualité — desktop uniquement (pas assez de place sur mobile).
export default function MapLegend() {
  return (
    <div className="hidden md:flex absolute bottom-4 left-4 z-20 items-center gap-3 px-3 py-2 rounded-xl bg-white/95 backdrop-blur-sm shadow-md border border-ink-200 text-[11px] text-ink-600">
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
  )
}
