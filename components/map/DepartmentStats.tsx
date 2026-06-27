'use client'

import { useEffect, useState } from 'react'
import { BarChart3, X, Loader2 } from 'lucide-react'
import { DEPARTMENT_LABELS } from '@/lib/geo/departments'

// Sprint 41 / WS C — comptes par département. Lit la RPC get_department_stats
// (agrégat PUBLIC, non gaté, 0 geom) : par dépt, N spots publics (détail curé /
// communauté / importé) ET M zones actives k-anon. Spots et zones sont comptés
// SÉPARÉMENT (décision John D2 : jamais fondre zones et spots). Comptes honnêtes :
// si un dépt est maigre, le chiffre le dit (pas de gonflage).

type DeptStat = {
  department: string
  spot_count: number
  curated_count: number
  community_count: number
  imported_count: number
  active_zone_count: number
}

function deptLabel(dep: string): string {
  const code = (dep ?? '').trim()
  const name = DEPARTMENT_LABELS[code]
  return name ? `${code} ${name}` : code
}

export default function DepartmentStats() {
  const [open, setOpen] = useState(false)
  const [stats, setStats] = useState<DeptStat[] | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(false)

  // Charge à la PREMIÈRE ouverture seulement (pas au mount → 0 requête sur le
  // chemin critique de /carte ; cohérent avec « default OFF » des couches).
  useEffect(() => {
    if (!open || stats || loading) return
    let alive = true
    setLoading(true)
    ;(async () => {
      try {
        const { createClient } = await import('@/lib/supabase/client')
        const supa = createClient()
        const { data, error: err } = await supa.rpc('get_department_stats')
        if (!alive) return
        if (err || !data) {
          setError(true)
        } else {
          // Tri : plus de spots d'abord (les dépts les mieux couverts en tête).
          const rows = (data as DeptStat[])
            .slice()
            .sort((a, b) => b.spot_count - a.spot_count || a.department.localeCompare(b.department))
          setStats(rows)
        }
      } catch {
        if (alive) setError(true)
      } finally {
        if (alive) setLoading(false)
      }
    })()
    return () => {
      alive = false
    }
  }, [open, stats, loading])

  return (
    <div className="hidden md:block absolute bottom-4 right-4 z-20">
      {!open ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Comptes par département"
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/95 backdrop-blur-sm shadow-md border border-ink-200 text-ink-700 text-sm font-medium hover:bg-white hover:border-teal-400 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500"
        >
          <BarChart3 size={16} className="text-ink-500" />
          <span className="hidden lg:inline">Par département</span>
        </button>
      ) : (
        <div className="w-[280px] rounded-2xl bg-white/97 backdrop-blur-sm shadow-lg border border-ink-200 overflow-hidden">
          <div className="flex items-center justify-between px-3.5 py-2.5 border-b border-ink-100">
            <span className="flex items-center gap-1.5 font-semibold text-sm text-ink-900">
              <BarChart3 size={15} className="text-ink-500" /> Par département
            </span>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Fermer les comptes par département"
              className="p-1 -mr-1 rounded-full text-ink-400 hover:bg-ink-100 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500"
            >
              <X size={16} />
            </button>
          </div>

          <div className="max-h-[44vh] overflow-y-auto px-1.5 py-1.5">
            {loading && (
              <div className="flex items-center gap-2 px-2 py-3 text-[12px] text-ink-400">
                <Loader2 size={14} className="animate-spin" /> Chargement…
              </div>
            )}

            {error && !loading && (
              <p className="px-2 py-3 text-[12px] leading-snug text-ink-400">
                Comptes indisponibles pour l&apos;instant. Réessaie dans un moment.
              </p>
            )}

            {stats && stats.length === 0 && !loading && (
              <p className="px-2 py-3 text-[12px] leading-snug text-ink-400">
                Aucun spot public pour l&apos;instant.
              </p>
            )}

            {stats && stats.length > 0 && !loading && (
              <ul className="flex flex-col">
                {stats.map((s) => (
                  <li key={s.department} className="px-2 py-2 rounded-lg hover:bg-ink-50">
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="text-[13px] font-medium text-ink-900 truncate">
                        {deptLabel(s.department)}
                      </span>
                      {/* Spots et zones comptés SÉPARÉMENT (jamais fondus) */}
                      <span className="shrink-0 text-[11.5px] text-ink-600">
                        <span className="font-mono font-semibold text-ink-900">{s.spot_count}</span>
                        {' '}spot{s.spot_count > 1 ? 's' : ''}
                        {' · '}
                        <span className="font-mono font-semibold text-coral-600">{s.active_zone_count}</span>
                        {' '}zone{s.active_zone_count > 1 ? 's' : ''}
                      </span>
                    </div>
                    {/* Détail honnête de la provenance des spots */}
                    {s.spot_count > 0 && (
                      <p className="mt-0.5 text-[10.5px] text-ink-400">
                        {s.curated_count} curé{s.curated_count > 1 ? 's' : ''}
                        {s.community_count > 0 && ` · ${s.community_count} communauté`}
                        {s.imported_count > 0 && ` · ${s.imported_count} importé${s.imported_count > 1 ? 's' : ''}`}
                      </p>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>

          <p className="px-3.5 py-2 border-t border-ink-100 text-[10px] leading-snug text-ink-400">
            Spots vérifiés et zones actives (densité anonyme des prises) comptés séparément.
          </p>
        </div>
      )}
    </div>
  )
}
