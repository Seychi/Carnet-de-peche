import { Waves } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'

// ── Département côtier → façade marée ────────────────────────────────────────
// On choisit un PORT DE RÉFÉRENCE par façade pour rattacher l'écart mesuré
// (table tide_calibration, sprint 38). lib/geo/departments.ts ne porte pas de
// notion de façade → petite table locale, source unique ici.
//
// Méditerranée volontairement absente : micro-marée surtout météorologique, non
// auditée (cf docs/sprint-38/tide-calibration-results.md). Un département médit.
// n'affiche donc pas d'encart, plutôt qu'un faux écart.
type Facade = 'manche' | 'atlantique'

// Le port de référence dont on lit la ligne tide_calibration pour la façade.
const FACADE_REFERENCE_PORT: Record<Facade, string> = {
  manche: 'Saint-Malo',
  atlantique: 'Brest',
}

// Pour l'Atlantique, on rattache chaque département au port étalon le plus
// représentatif géographiquement (parmi ceux audités). Honnête : on nomme le
// port de référence réel, jamais le spot lui-même.
const ATLANTIC_PORT_BY_DEPARTMENT: Record<string, string> = {
  '29': 'Brest', // Finistère
  '56': 'Pornichet', // Morbihan
  '44': 'Pornichet', // Loire-Atlantique
  '85': "Les Sables-d'Olonne", // Vendée
  '17': "Les Sables-d'Olonne", // Charente-Maritime
  '33': 'Arcachon (Eyrac)', // Gironde
  '40': 'Arcachon (Eyrac)', // Landes
  '64': 'Arcachon (Eyrac)', // Pyrénées-Atlantiques
}

const DEPARTMENT_FACADE: Record<string, Facade> = {
  // Manche / mer du Nord
  '14': 'manche', // Calvados
  '50': 'manche', // Manche
  '76': 'manche', // Seine-Maritime
  '59': 'manche', // Nord
  '62': 'manche', // Pas-de-Calais
  '35': 'manche', // Ille-et-Vilaine (Saint-Malo)
  '22': 'manche', // Côtes-d'Armor (côte nord Bretagne)
  // Atlantique
  '29': 'atlantique', // Finistère
  '56': 'atlantique', // Morbihan
  '44': 'atlantique', // Loire-Atlantique
  '85': 'atlantique', // Vendée
  '17': 'atlantique', // Charente-Maritime
  '33': 'atlantique', // Gironde
  '40': 'atlantique', // Landes
  '64': 'atlantique', // Pyrénées-Atlantiques
  // Méditerranée → volontairement non mappée (pas d'encart, cf en-tête)
}

function referencePortForDepartment(dept: string): string | null {
  const facade = DEPARTMENT_FACADE[dept]
  if (!facade) return null
  if (facade === 'atlantique') {
    return ATLANTIC_PORT_BY_DEPARTMENT[dept] ?? FACADE_REFERENCE_PORT.atlantique
  }
  return FACADE_REFERENCE_PORT[facade]
}

function formatAuditDate(iso: string | null): string | null {
  if (!iso) return null
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return null
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

/**
 * Encart « confiance marées » sur la fiche spot (sprint 38, F3). Lit la précision
 * mesurée dans tide_calibration (table publique) côté serveur, selon la façade du
 * département du spot. Honnête : on affiche l'écart médian vs SHOM tel quel, même
 * s'il dépasse 15 min (décision John D3 : précision mesurée seulement, aucun offset
 * appliqué, aucun coef inventé). Rien à afficher (Méditerranée, ou table vide) → null.
 */
export async function TideCalibrationNote({ department }: { department: string }) {
  const dept = String(department).trim()
  const refPort = referencePortForDepartment(dept)
  if (!refPort) return null

  const supabase = await createClient()
  const { data } = await supabase
    .from('tide_calibration')
    .select('port, median_error_min, verified_at, source')
    .eq('port', refPort)
    .maybeSingle()

  if (!data || data.median_error_min == null) return null

  const auditDate = formatAuditDate(data.verified_at)
  const errorMin = Math.round(data.median_error_min)

  return (
    <div className="rounded-[18px] border border-sand-200 bg-white p-6">
      <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-navy-900">
        <Waves size={18} className="text-teal-600" aria-hidden="true" />
        Précision des marées
      </h3>
      <p className="text-[13px] leading-relaxed text-ink-600">
        Marées calées sur le port de référence de{' '}
        <span className="font-medium text-navy-900">{data.port}</span>. Écart médian
        mesuré de{' '}
        <span className="font-mono font-medium text-navy-900">{errorMin} min</span> vs
        SHOM{auditDate ? `, audité le ${auditDate}` : ''}.
      </p>
      <p className="mt-2 text-[11px] text-ink-400">
        {data.source ?? 'SHOM vs Open-Meteo Marine'}
      </p>
    </div>
  )
}
