import Link from 'next/link'
import { MapPin, ShieldCheck, ArrowRight } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { SPECIES_LABELS, TECHNIQUE_LABELS, STRUCTURE_LABELS } from '@/lib/labels'
import { DEPARTMENT_LABELS } from '@/lib/geo/departments'
import { TagData } from '@/components/ui-v2/tag-data'
import { TideSparkline } from '@/components/ui-v2/tide-sparkline'

/* ─── <SpotCard slug="..." /> — encart spot lié (RPC existante, tolérant) ───── */

export async function SpotCard({ slug }: { slug: string }) {
  const supabase = await createClient()
  const { data, error } = await supabase.rpc('get_spot_by_slug', { p_slug: slug })
  if (error || !data || data.length === 0) return null
  const spot = data[0]
  const dept = String(spot.department).trim()
  const species = (spot.species ?? [])
    .slice(0, 3)
    .map((s: string) => SPECIES_LABELS[s] ?? s)
    .join(' · ')

  return (
    <Link
      href={`/spots/${spot.slug}`}
      className="not-prose group my-6 flex items-center gap-4 rounded-[14px] border border-sand-200 bg-white p-4 no-underline shadow-[inset_3px_0_0_var(--teal-500)] transition-colors hover:border-teal-500/40"
    >
      <span className="flex size-10 shrink-0 items-center justify-center rounded-[10px] bg-navy-950 text-teal-300">
        <MapPin size={18} strokeWidth={1.7} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[15px] font-semibold text-navy-900">{spot.name}</span>
        <TagData className="block truncate">
          {(DEPARTMENT_LABELS[dept] ?? dept).toUpperCase()} · {dept}
          {spot.structure ? ` · ${(STRUCTURE_LABELS[spot.structure] ?? spot.structure).toUpperCase()}` : ''}
          {species ? ` · ${species.toUpperCase()}` : ''}
        </TagData>
      </span>
      <ArrowRight
        size={16}
        className="shrink-0 text-ink-400 transition-transform group-hover:translate-x-0.5 group-hover:text-teal-600"
      />
    </Link>
  )
}

/* ─── <TechniqueBadge type="leurres" /> ─────────────────────────────────────── */

export function TechniqueBadge({ type }: { type: string }) {
  return (
    <span className="not-prose inline-flex items-center rounded-full border border-navy-900 bg-navy-900 px-3 py-1 align-middle font-mono text-[11px] font-medium uppercase tracking-[0.06em] text-white">
      {TECHNIQUE_LABELS[type] ?? type}
    </span>
  )
}

/* ─── <TideExplainer /> — courbe de marée pédagogique annotée ───────────────── */

// Marée semi-diurne type (PM 06:42 / BM 12:58 / PM 19:07) — illustration statique.
const DEMO_POINTS = Array.from({ length: 25 }, (_, h) => ({
  hour: h,
  height_m: 3.5 + 2.4 * Math.cos(((h - 6.7) / 12.42) * 2 * Math.PI),
}))
const DEMO_EXTREMA = [
  { type: 'high' as const, hour: 6.7 },
  { type: 'low' as const, hour: 12.97 },
  { type: 'high' as const, hour: 19.12 },
]

export function TideExplainer() {
  return (
    <figure className="not-prose my-8 rounded-[14px] border border-sand-200 bg-white p-5">
      <div className="mb-2 flex items-baseline justify-between gap-3">
        <span className="text-[14px] font-semibold text-navy-900">
          Une journée de marée type (semi-diurne)
        </span>
        <TagData>EXEMPLE · 2 PM / 2 BM PAR ~24 H 50</TagData>
      </div>
      <TideSparkline points={DEMO_POINTS} extrema={DEMO_EXTREMA} nowHour={9.5} className="h-24" />
      <figcaption className="mt-3 grid gap-1.5 text-[13px] leading-relaxed text-ink-600 sm:grid-cols-3">
        <span>
          <strong className="text-teal-600">PM</strong> (pleine mer) : l&apos;eau est au plus haut,
          le courant s&apos;inverse.
        </span>
        <span>
          <strong className="text-ink-400">BM</strong> (basse mer) : l&apos;eau est au plus bas,
          l&apos;autre étale.
        </span>
        <span>
          <strong className="text-coral-500">Le curseur</strong> : « maintenant ». Entre deux
          étales, l&apos;eau bouge. C&apos;est là que ça mord.
        </span>
      </figcaption>
    </figure>
  )
}

/* ─── <RegulationBox species verifiedAt> — encart réglementaire daté ────────── */

export function RegulationBox({
  species,
  verifiedAt,
  children,
}: {
  /** Libellé affiché (« Bar », « Dorade royale »…). */
  species: string
  /** Date de vérification « JJ/MM/AAAA » — OBLIGATOIRE (crédibilité). */
  verifiedAt: string
  children: React.ReactNode
}) {
  return (
    <aside className="not-prose my-8 rounded-[14px] border border-gold-500/35 bg-gold-500/[0.07] p-5">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <span className="inline-flex items-center gap-2 font-mono text-[11.5px] font-medium uppercase tracking-[0.08em] text-[#A87C20]">
          <ShieldCheck size={14} strokeWidth={1.7} />
          Réglementation · {species}
        </span>
        <TagData variant="gold">VÉRIFIÉ LE {verifiedAt}</TagData>
      </div>
      <div className="text-[14px] leading-relaxed text-ink-700 [&_li]:mt-1 [&_strong]:text-navy-900 [&_ul]:list-disc [&_ul]:pl-5">
        {children}
      </div>
      <p className="mt-3 text-[12px] leading-snug text-ink-400">
        La réglementation évolue : vérifie l&apos;arrêté en vigueur de ta façade avant de prélever.
      </p>
    </aside>
  )
}
