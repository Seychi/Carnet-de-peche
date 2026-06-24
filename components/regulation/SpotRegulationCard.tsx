import Link from 'next/link'
import { Scale } from 'lucide-react'
import { facadeOf, SPECIES_BY_DB_KEY } from '@/lib/seo/programmatic'
import { SPECIES_LABELS } from '@/lib/labels'
import {
  getMinSize,
  getDailyQuota,
  getClosedWindows,
  isMarquageRequired,
  FACADE_LABELS,
} from '@/lib/regulation'
import { getMarineParkNotice } from '@/lib/regulation/recfishing'

// Réglementation par espèce du spot (sprint 24) — maille façade-aware + repères
// quota / fermeture / marquage. Tout en texte (jamais la teinte seule, John daltonien).
// Le détail sourcé + daté vit sur chaque fiche espèce (lien). Façade = département du spot.

export function SpotRegulationCard({
  department,
  species,
}: {
  department: string
  species: string[]
}) {
  const facade = facadeOf(department)
  const parkNotice = getMarineParkNotice(department)

  // Espèces du spot résolues vers le référentiel (ignore les clés inconnues).
  const rows = species
    .map((dbKey) => {
      const slug = SPECIES_BY_DB_KEY[dbKey]
      if (!slug) return null
      return {
        slug,
        dbKey,
        label: SPECIES_LABELS[dbKey] ?? dbKey,
        minSize: getMinSize(dbKey, facade),
        hasQuota: getDailyQuota(dbKey, facade).length > 0,
        hasClosed: getClosedWindows(dbKey, facade).length > 0,
        marquage: isMarquageRequired(dbKey),
      }
    })
    .filter((r): r is NonNullable<typeof r> => r !== null)

  if (rows.length === 0) return null

  return (
    <div className="bg-white rounded-[18px] border border-sand-200 p-6">
      <h3 className="mb-1 flex items-center gap-1.5 font-mono text-[11.5px] font-medium uppercase tracking-[0.08em] text-ink-500">
        <Scale size={13} className="text-teal-500" />
        Réglementation
      </h3>
      <p className="mb-4 text-[11px] text-ink-400">
        Mailles en {FACADE_LABELS[facade]}. Détail et sources sur chaque fiche.
      </p>
      <ul className="flex flex-col gap-2.5">
        {rows.map((r) => (
          <li key={r.dbKey} className="flex items-center justify-between gap-3 text-sm">
            <Link href={`/especes/${r.slug}`} className="text-navy-900 hover:text-teal-700 hover:underline">
              {r.label}
            </Link>
            <span className="flex items-center gap-1.5 shrink-0">
              <span className="font-mono font-semibold text-navy-900">
                {r.minSize != null ? `${r.minSize} cm` : 'pas de maille'}
              </span>
              {r.hasClosed && <Chip>fermeture</Chip>}
              {r.hasQuota && <Chip>quota</Chip>}
              {r.marquage && <Chip>marquage</Chip>}
            </span>
          </li>
        ))}
      </ul>

      {/* Avertissement parc marin — gaté par département (exact, pas « tout Med »). */}
      {parkNotice && (
        <p className="mt-4 border-t border-sand-200 pt-3 text-[11px] leading-snug text-ink-500">
          {parkNotice}
        </p>
      )}
    </div>
  )
}

function Chip({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-full border border-amber-300 bg-amber-50 px-1.5 py-0.5 text-[10px] font-medium text-amber-700">
      {children}
    </span>
  )
}
