import { cn } from '@/lib/utils'

export type InstrumentsData = {
  /** Code département (« 29 »). */
  deptCode: string
  /** Libellé complet (« Finistère ») — affiché en desktop seulement. */
  deptLabel?: string | null
  /** Horaire prochaine pleine mer (« 06:42 »). */
  pm?: string | null
  /** Horaire prochaine basse mer (« 12:58 »). */
  bm?: string | null
  /** Sens de la marée en cours. */
  tideDirection?: 'up' | 'down' | null
  /** Coefficient — pas exposé par Open-Meteo en v1, affiché si fourni. */
  coef?: number | null
  /** Vent (« NO 12 »). */
  wind?: string | null
  /** Houle (« 0,8 m · 9 s »). */
  swell?: string | null
  /** Prochain créneau perso (« 18:30 → 21:30 »). */
  slot?: string | null
}

function Sep() {
  return <span className="opacity-25" aria-hidden="true">|</span>
}

/**
 * Bandeau instruments — « l'app sait toujours où en est la mer ».
 * Une ligne mono navy-950 : dépt · PM/BM · coef (▲/▼) · vent · houle ·
 * créneau perso. Mobile : version condensée, scroll horizontal autorisé
 * (seule exception de la charte). Présentation pure : les données viennent
 * des fetchs existants (Open-Meteo + solunar), branchées en phase 3.
 */
export function InstrumentsBar({ data, className }: { data: InstrumentsData; className?: string }) {
  const arrow =
    data.tideDirection === 'up' ? (
      <span className="text-teal-300">▲</span>
    ) : data.tideDirection === 'down' ? (
      <span className="text-coral-500">▼</span>
    ) : null

  return (
    <div
      data-slot="instruments-bar"
      className={cn(
        'relative bg-navy-950 font-mono text-[11px] tracking-[0.05em] text-white sm:text-[12px]',
        className,
      )}
    >
      {/* Fondu droit : affordance scroll horizontal sur mobile */}
      <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-8 bg-gradient-to-l from-navy-950 to-transparent sm:hidden" aria-hidden="true" />
      <div className="mx-auto flex h-9 max-w-[1180px] items-center gap-4 overflow-x-auto px-4 whitespace-nowrap sm:gap-7 sm:px-7 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <span className="uppercase">
          <span className="hidden sm:inline">{data.deptLabel ? `${data.deptLabel} · ` : ''}</span>
          {data.deptCode}
        </span>

        {(data.pm || data.bm) && (
          <>
            <Sep />
            <span>
              {data.pm && (
                <>
                  PM <b className="font-medium text-teal-300">{data.pm}</b>
                </>
              )}
              {data.pm && data.bm && ' · '}
              {data.bm && (
                <>
                  BM <b className="font-medium text-teal-300">{data.bm}</b>
                </>
              )}
            </span>
          </>
        )}

        {(data.coef != null || arrow) && (
          <>
            <Sep />
            <span>
              {data.coef != null ? (
                <>
                  COEF <b className="font-medium text-teal-300">{data.coef}</b>{' '}
                </>
              ) : (
                <span className="hidden sm:inline">MARÉE </span>
              )}
              {arrow}
            </span>
          </>
        )}

        {data.wind && (
          <>
            <Sep />
            <span className="hidden sm:inline">
              VENT <b className="font-medium text-teal-300">{data.wind}</b>
            </span>
            <span className="sm:hidden">
              <b className="font-medium text-teal-300">{data.wind}</b>
            </span>
          </>
        )}

        {data.swell && (
          <>
            <Sep />
            <span>
              HOULE <b className="font-medium text-teal-300">{data.swell}</b>
            </span>
          </>
        )}

        {data.slot && (
          <>
            <Sep />
            <span className="text-teal-300">
              <span className="hidden sm:inline">TON CRÉNEAU : </span>
              <span className="sm:hidden">▶ </span>
              <b className="font-medium">{data.slot}</b>
            </span>
          </>
        )}
      </div>
    </div>
  )
}
