import { Waves } from 'lucide-react'
import { getTideCalibration, monthsAgo } from '@/lib/conditions/tide-calibration'

function formatAuditDate(iso: string | null): string | null {
  if (!iso) return null
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return null
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

/** Fraîcheur relative « il y a N mois » de l'audit (sprint 48, WS C). null si trop récent. */
function formatAuditFreshness(iso: string | null): string | null {
  const m = monthsAgo(iso)
  if (m == null || m < 1) return null
  return `il y a ${m} mois`
}

/**
 * Encart « confiance marées » sur la fiche spot (sprint 38, F3 + fix offset). Lit la
 * calibration mesurée (table publique `tide_calibration`) du port de référence du
 * département. Décision John (v2) : on APPLIQUE l'offset par port aux heures de PM/BM
 * affichées (cf SpotConditionsSection / TideChart) et on annonce l'écart RÉSIDUEL
 * mesuré, sourcé + daté. Honnête : on affiche le résidu réel, jamais « à la minute ».
 * Rien à afficher (Méditerranée non auditée, ou table vide) → null.
 */
export async function TideCalibrationNote({ department }: { department: string }) {
  const cal = await getTideCalibration(department)
  if (!cal) return null

  const auditDate = formatAuditDate(cal.verifiedAt)
  const auditFreshness = formatAuditFreshness(cal.verifiedAt)
  // Résidu mesuré après correction du biais ; fallback sur l'écart brut si absent.
  const residual = cal.residualMin ?? cal.medianErrorMin
  const residualMin = Math.round(residual)

  return (
    <div className="rounded-[18px] border border-sand-200 bg-white p-6">
      <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-navy-900">
        <Waves size={18} className="text-teal-600" aria-hidden="true" />
        Précision des marées
      </h3>
      <p className="text-[13px] leading-relaxed text-ink-600">
        Marées calées sur le port de référence de{' '}
        <span className="font-medium text-navy-900">{cal.port}</span>. Les heures de
        pleine et basse mer sont corrigées du décalage mesuré : écart résiduel de{' '}
        <span className="font-mono font-medium text-navy-900">{residualMin} min</span> vs
        SHOM{auditDate ? `, audité le ${auditDate}` : ''}.
      </p>
      {auditFreshness && (
        <p className="mt-1.5 text-[12px] text-ink-500">
          Calibration auditée {auditFreshness}.
        </p>
      )}
      <p className="mt-2 text-[11px] text-ink-400">
        {cal.source ?? 'SHOM vs Open-Meteo Marine'}
      </p>
    </div>
  )
}
