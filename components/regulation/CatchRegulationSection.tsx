import { Scale } from 'lucide-react'
import type { Facade } from '@/lib/seo/programmatic'
import {
  getRegulation,
  checkSize,
  getDailyQuota,
  getClosedWindows,
  isMarquageRequired,
  FACADE_LABELS,
} from '@/lib/regulation'
import { MED_MARINE_PARKS } from '@/lib/regulation/recfishing'

// Réglementation d'UNE prise (page détail) — maille façade-aware + quota +
// fermeture + marquage, sourcé/daté. Texte explicite, jamais la teinte seule.

export function CatchRegulationSection({
  species,
  facade,
  sizeCm,
  released,
  className,
}: {
  species: string
  facade: Facade | null
  sizeCm: number | null
  released: boolean
  className?: string
}) {
  const reg = getRegulation(species)
  // Espèce non au référentiel → pas de section (jamais de verdict faux).
  if (!reg) return null

  // Façade inconnue : on ne montre que ce qui ne dépend pas de la façade (marquage)
  // et on invite à renseigner le lieu, sans verdict de maille trompeur.
  const minSize = facade ? reg.minSizeCm[facade] : undefined
  const verdict = facade && sizeCm != null ? checkSize(species, facade, sizeCm) : null
  const quota = facade ? getDailyQuota(species, facade) : []
  const closed = facade ? getClosedWindows(species, facade) : []
  const marquage = isMarquageRequired(species)

  return (
    <div className={`bg-white rounded-[14px] border border-slate-100 p-5 shadow-sm ${className ?? ''}`}>
      <div className="mb-4 flex items-center gap-2">
        <Scale size={13} className="text-teal-600" />
        <p className="text-[10px] font-bold uppercase tracking-widest text-ink-500">Réglementation</p>
      </div>

      {!facade && (
        <p className="text-[13px] text-ink-500">
          Renseigne le lieu de la prise pour afficher la maille (elle varie selon la façade).
        </p>
      )}

      {facade && (
        <div className="space-y-3">
          {/* Maille */}
          <div>
            <p className="text-[13px] text-ink-700">
              Maille en {FACADE_LABELS[facade]} :{' '}
              <span className="font-mono font-semibold text-navy-900">
                {minSize != null ? `${minSize} cm` : 'aucune maille réglementaire'}
              </span>
            </p>
            {verdict?.status === 'undersize' && (
              <p className="mt-1 flex items-start gap-1.5 text-[12px] font-medium text-red-700">
                <span aria-hidden>⚠️</span>
                <span>
                  Cette prise ({sizeCm} cm) est sous la maille de {verdict.minSizeCm} cm
                  {released ? ' — bien relâchée.' : ' : elle aurait dû être remise à l’eau.'}
                </span>
              </p>
            )}
          </div>

          {/* Quota */}
          {quota.length > 0 && (
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-400">Quota journalier</p>
              <ul className="mt-1 space-y-0.5">
                {quota.map((q, i) => (
                  <li key={i} className="text-[12px] text-ink-700">
                    {q.note}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Fermetures / no-kill */}
          {closed.length > 0 && (
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-400">
                Fermeture / pêcher-relâcher
              </p>
              <ul className="mt-1 space-y-0.5">
                {closed.map((w, i) => (
                  <li key={i} className="text-[12px] text-ink-700">
                    {w.note}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Marquage (indépendant de la façade) */}
      {marquage && !released && (
        <p className="mt-3 flex items-start gap-1.5 text-[12px] text-amber-700">
          <span aria-hidden>✂️</span>
          <span>Marquage obligatoire : ablation de la partie inférieure de la nageoire caudale.</span>
        </p>
      )}

      {/* Parcs marins Méditerranée : maille parfois plus stricte + CatchMachine */}
      {facade === 'mediterranee' && (
        <p className="mt-3 text-[11px] leading-snug text-ink-500">
          En parc marin ({MED_MARINE_PARKS.join(', ')}), la <strong>maille locale peut être plus
          stricte</strong> (ex. bar 42 cm dans le Golfe du Lion) — vérifie l&rsquo;arrêté du parc. La
          déclaration y passe par l&rsquo;appli CatchMachine, pas RecFishing.
        </p>
      )}

      <p className="mt-3 border-t border-slate-100 pt-2.5 text-[11px] text-ink-400">
        {reg.source} · vérifié le {reg.verifiedAt}.
      </p>
    </div>
  )
}
