import Link from 'next/link'
import { Fish } from 'lucide-react'
import type { CatchRow } from '@/lib/catches/queries'
import { TagData } from '@/components/ui-v2/tag-data'
import { CatchRowItem } from './CatchRowItem'

// Groupe les prises par mois (la liste arrive déjà triée caught_at desc).
function groupByMonth(catches: CatchRow[]): { label: string; items: CatchRow[] }[] {
  const groups: { label: string; items: CatchRow[] }[] = []
  for (const c of catches) {
    const label = c.caught_at
      ? new Intl.DateTimeFormat('fr-FR', {
          month: 'long',
          year: 'numeric',
          timeZone: 'Europe/Paris',
        })
          .format(new Date(c.caught_at))
          .toUpperCase()
      : 'SANS DATE'
    const last = groups[groups.length - 1]
    if (last && last.label === label) last.items.push(c)
    else groups.push({ label, items: [c] })
  }
  return groups
}

// Reconstruit l'URL de pagination en préservant tous les autres filtres
function buildPageUrl(
  searchParams: Record<string, string | string[] | undefined>,
  page: number
): string {
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(searchParams)) {
    if (key === 'page') continue
    if (Array.isArray(value)) value.forEach((v) => params.append(key, v))
    else if (value) params.set(key, value)
  }
  if (page > 1) params.set('page', String(page))
  const qs = params.toString()
  return `/carnet${qs ? `?${qs}` : ''}`
}

export function CatchGrid({
  catches,
  photoUrls,
  totalCount,
  page,
  totalPages,
  hasFilters,
  searchParams,
}: {
  catches: CatchRow[]
  photoUrls: Record<string, string>
  totalCount: number
  page: number
  totalPages: number
  hasFilters: boolean
  searchParams: Record<string, string | string[] | undefined>
}) {
  // ── État vide : aucune prise du tout ──────────────────────────────────────
  if (catches.length === 0 && !hasFilters) {
    return (
      <div className="text-center py-24">
        <div className="w-20 h-20 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-5">
          <Fish size={36} className="text-slate-400" />
        </div>
        <p className="text-[17px] font-semibold text-navy-900 mb-2">
          Aucune prise encore
        </p>
        <p className="text-[14px] text-ink-400 mb-7 max-w-[240px] mx-auto leading-relaxed">
          Logue ta première prise pour commencer ton carnet.
        </p>
        <Link
          href="/carnet/nouvelle"
          className="inline-block px-6 py-3.5 bg-teal-500 text-white rounded-[14px] font-bold text-[15px] hover:bg-teal-600 transition-colors"
        >
          Loguer ma première prise
        </Link>
      </div>
    )
  }

  // ── État vide : filtres trop restrictifs ──────────────────────────────────
  if (catches.length === 0 && hasFilters) {
    return (
      <div className="text-center py-16">
        <p className="text-[15px] font-medium text-navy-900 mb-2">
          Aucune prise ne correspond
        </p>
        <p className="text-[13px] text-ink-400 mb-5">
          Essaie d&apos;élargir tes filtres ou de réinitialiser.
        </p>
        <Link
          href="/carnet"
          className="text-[13px] font-semibold text-teal-600 underline underline-offset-2"
        >
          Réinitialiser les filtres
        </Link>
      </div>
    )
  }

  // ── Liste groupée par mois (DA v2, réf carnet.html) ───────────────────────
  const groups = groupByMonth(catches)

  return (
    <div>
      <TagData className="mb-3 block">
        {totalCount} PRISE{totalCount > 1 ? 'S' : ''}
        {hasFilters ? (totalCount > 1 ? ' TROUVÉES' : ' TROUVÉE') : ''}
      </TagData>

      <div className="flex flex-col gap-5">
        {groups.map((g) => (
          <section key={g.label}>
            <TagData className="mb-2.5 block">{g.label}</TagData>
            <div className="flex flex-col gap-2.5">
              {g.items.map((c) => (
                <CatchRowItem
                  key={c.id}
                  catch={c}
                  photoUrl={c.photo_path ? photoUrls[c.photo_path] : undefined}
                />
              ))}
            </div>
          </section>
        ))}
      </div>

      {/* Pagination prev / next */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-6 pt-5 border-t border-sand-200">
          {page > 1 ? (
            <Link
              href={buildPageUrl(searchParams, page - 1)}
              className="px-4 py-2 rounded-[10px] text-[13px] font-medium border border-sand-200 text-ink-600 hover:border-ink-400 transition-colors"
            >
              ← Précédent
            </Link>
          ) : (
            <span className="px-4 py-2 text-[13px] text-ink-300 border border-sand-200 rounded-[10px]">
              ← Précédent
            </span>
          )}

          <span className="font-mono text-[12px] text-ink-400">
            {page} / {totalPages}
          </span>

          {page < totalPages ? (
            <Link
              href={buildPageUrl(searchParams, page + 1)}
              className="px-4 py-2 rounded-[10px] text-[13px] font-medium border border-sand-200 text-ink-600 hover:border-ink-400 transition-colors"
            >
              Suivant →
            </Link>
          ) : (
            <span className="px-4 py-2 text-[13px] text-ink-300 border border-sand-200 rounded-[10px]">
              Suivant →
            </span>
          )}
        </div>
      )}
    </div>
  )
}
