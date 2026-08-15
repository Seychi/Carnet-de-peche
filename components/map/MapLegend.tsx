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
export default function MapLegend({ availableSources = [] }: { availableSources?: string[] }) {
  return (
    <div className="hidden md:flex absolute bottom-4 left-4 z-20 flex-col gap-1.5 px-3 py-2 rounded-xl bg-white/95 backdrop-blur-sm shadow-md border border-ink-200 text-xs text-ink-600">
      {/* Qualité (cividis colorblind-safe)

          ⚠️ AUDIT DU 15/08, P0-1 — cette échelle décrit la qualité du MEILLEUR
          MOMENT DU JOUR (`spot_scores.day_score`), pas la condition à l'instant
          présent. Elle ne le disait pas, d'où le constat « la carte annonce très
          bon sur un spot que le site juge faible » : la comparaison portait sur
          `current_quality`, une colonne que l'application n'affiche NULLE PART.

          ⚠️ Ne PAS « corriger » en basculant la couleur sur `current_quality` :
          ce serait annuler le commit `24d4ef4` du 23/06 (« fin du 0/100
          partout »). `current_score` est la note de la fenêtre active à l'instant
          où le cron tourne, 05:00 UTC, heure à laquelle presque aucun spot n'a de
          créneau actif : il vaut ~toujours 0. */}
      <div className="flex items-center gap-3">
        <span className="font-mono text-[10px] font-medium uppercase tracking-[0.08em] text-ink-400">
          Qualité du jour
        </span>
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
            className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-navy-950 text-xs font-bold leading-none text-white"
            aria-hidden
          >
            ✓
          </span>
          Curé vérifié
        </span>
        {availableSources.includes('community') && (
          <span className="flex items-center gap-1.5 whitespace-nowrap">
            <span
              className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-[#475569] text-xs font-bold leading-none text-white"
              aria-hidden
            >
              ~
            </span>
            Communauté
          </span>
        )}
        {availableSources.includes('imported') && (
          <span className="flex items-center gap-1.5 whitespace-nowrap">
            <span
              className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-[#94a3b8] text-xs font-bold leading-none text-white"
              aria-hidden
            >
              ◦
            </span>
            Importé
          </span>
        )}
      </div>
      <p className="text-xs text-ink-400">
        Le badge ✓ marque une coordonnée vérifiée à la main, fixe.
      </p>

      <p className="text-xs text-ink-400">
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
