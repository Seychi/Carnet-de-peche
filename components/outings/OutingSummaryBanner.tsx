import type { ComponentType, ReactNode } from 'react'
import { Clock, MapPin, Fish, Waves, Wind, Thermometer, BadgeCheck, Route } from 'lucide-react'
import { DEPARTMENT_LABELS } from '@/lib/geo/departments'
import { SPECIES_LABELS } from '@/lib/labels'
import type { OutingSummary } from '@/lib/outings/summary'

// ─── Bandeau « sortie » d'un post de sortie solo (Sprint 73) ──────────────────
// Présentation pure (aucun hook) : réutilisée dans PostCard (fil) ET dans l'aperçu
// du composer. GEOM-FREE par construction : la zone affichée = le département, jamais
// un spot ni une coordonnée (la RPC get_outing_summary ne renvoie aucune géométrie).
//
// Daltonisme (John) : aucune information n'est portée par la seule teinte. La sortie
// est signalée par une icône + le label « SORTIE », la bredouille par une icône +
// « Bredouille assumée », la prise vérifiée par une icône BadgeCheck + « vérifiée ».

// Libellés de marée (le snapshot ne porte AUCUN coefficient : on n'invente pas de
// coef SHOM, l'info honnête est le marnage mesuré en mètres).
const TIDE_LABELS: Record<string, string> = {
  rising: 'Marée montante',
  falling: 'Marée descendante',
  slack: 'Étale',
}

function formatDurationMin(min: number | null): string | null {
  if (min == null || min <= 0) return null
  const h = Math.floor(min / 60)
  const m = min % 60
  if (h === 0) return `${m} min`
  if (m === 0) return `${h} h`
  return `${h} h ${String(m).padStart(2, '0')}`
}

function speciesLabel(key: string): string {
  return SPECIES_LABELS[key] ?? key
}

// conditions est un Record<string, unknown> (snapshot météo/marée, aucune coordonnée).
// On ne lit qu'un whitelist de champs météo/marée, chacun validé en type.
function readNumber(v: unknown): number | null {
  return typeof v === 'number' && Number.isFinite(v) ? v : null
}
function readString(v: unknown): string | null {
  return typeof v === 'string' && v.length > 0 ? v : null
}

function frDecimal(n: number, digits = 1): string {
  return n.toFixed(digits).replace('.', ',')
}

// Petite étiquette de donnée (fond translucide, chiffre en mono façon DA v2).
function Chip({
  icon: Icon,
  children,
}: {
  icon: ComponentType<{ size?: number; className?: string; 'aria-hidden'?: boolean }>
  children: ReactNode
}) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-2.5 py-1 text-[12px] text-white/90">
      <Icon size={13} className="shrink-0 text-teal-300" aria-hidden={true} />
      {children}
    </span>
  )
}

export function OutingSummaryBanner({
  summary,
  className,
}: {
  summary: OutingSummary
  className?: string
}) {
  const duration = formatDurationMin(summary.duration_min)
  const dept = summary.department
  const deptLabel = dept ? DEPARTMENT_LABELS[dept] ?? dept : null

  const cond = summary.conditions ?? {}
  const tideState = readString(cond.tide_state)
  const tideLabel = tideState ? TIDE_LABELS[tideState] ?? null : null
  const tideRange = readNumber(cond.tide_range_m)
  const wind = readNumber(cond.wind_speed_kmh)
  const water = readNumber(cond.water_temperature_c)

  const biggest = summary.biggest
  const species = summary.species ?? []

  return (
    <div
      className={[
        'relative overflow-hidden rounded-[12px] border border-teal-500/40 bg-gradient-to-br from-navy-800 to-navy-950 p-3.5 text-white',
        className ?? '',
      ].join(' ')}
    >
      {/* Accent radial discret (cohérent avec l'encart prise) */}
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-[radial-gradient(circle_at_85%_15%,rgba(94,234,212,.18),transparent_60%)]"
      />

      <div className="relative flex flex-col gap-2.5">
        {/* En-tête : label SORTIE + éventuelle bredouille */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1.5 font-mono text-[10.5px] font-semibold uppercase tracking-[0.14em] text-teal-300">
            <Route size={13} aria-hidden="true" />
            Sortie
          </span>
          {summary.blank && (
            <span className="inline-flex items-center gap-1 rounded-full border border-white/25 bg-white/10 px-2 py-0.5 text-[11px] font-semibold text-white/90">
              <Waves size={12} aria-hidden="true" />
              Bredouille assumée
            </span>
          )}
        </div>

        {/* Métriques clés : durée, zone (département), nombre de prises */}
        <div className="flex flex-wrap gap-1.5">
          {duration && (
            <Chip icon={Clock}>
              <span className="font-mono tabular-nums">{duration}</span>
            </Chip>
          )}
          {dept && (
            <Chip icon={MapPin}>
              <span className="font-mono">{dept}</span>
              {deptLabel && deptLabel !== dept && (
                <span className="text-white/70">{deptLabel}</span>
              )}
            </Chip>
          )}
          {!summary.blank && (
            <Chip icon={Fish}>
              <span className="font-mono tabular-nums">{summary.catch_count}</span>
              {summary.catch_count > 1 ? 'prises' : 'prise'}
            </Chip>
          )}
        </div>

        {/* Bredouille honnête : une phrase assumée plutôt qu'un vide gênant */}
        {summary.blank && (
          <p className="text-[13px] text-white/80">
            Aucune prise ce jour, mais la sortie compte. C&rsquo;est ça aussi, la pêche.
          </p>
        )}

        {/* Détail par espèce */}
        {species.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {species.map((s) => (
              <span
                key={s.species}
                className="inline-flex items-center gap-1 rounded-full bg-white/8 px-2 py-0.5 text-[12px] text-white/85"
              >
                {speciesLabel(s.species)}
                <span className="font-mono tabular-nums text-teal-300">×{s.count}</span>
              </span>
            ))}
          </div>
        )}

        {/* Plus grosse prise, uniquement si photo-vérifiée */}
        {biggest && (
          <div className="flex flex-wrap items-center gap-2 rounded-[10px] bg-white/8 px-2.5 py-1.5">
            <span className="text-[12.5px] text-white/85">
              Plus grosse : <span className="font-semibold text-white">{speciesLabel(biggest.species)}</span>
              {biggest.size_cm != null && (
                <span className="ml-1 font-mono tabular-nums text-teal-300">{biggest.size_cm} cm</span>
              )}
              {biggest.weight_g != null && (
                <span className="ml-1 font-mono tabular-nums text-teal-300">
                  {frDecimal(biggest.weight_g / 1000)} kg
                </span>
              )}
            </span>
            <span className="inline-flex items-center gap-1 rounded-full border border-teal-300/60 px-1.5 py-0.5 text-[10.5px] font-semibold text-teal-300">
              <BadgeCheck size={12} aria-hidden="true" />
              vérifiée
            </span>
          </div>
        )}

        {/* Conditions clés (marée, marnage, vent, eau) si présentes dans le snapshot */}
        {(tideLabel || tideRange != null || wind != null || water != null) && (
          <div className="flex flex-wrap gap-1.5">
            {tideLabel && <Chip icon={Waves}>{tideLabel}</Chip>}
            {tideRange != null && (
              <Chip icon={Waves}>
                marnage <span className="font-mono tabular-nums">{frDecimal(tideRange)} m</span>
              </Chip>
            )}
            {wind != null && (
              <Chip icon={Wind}>
                vent <span className="font-mono tabular-nums">{Math.round(wind)} km/h</span>
              </Chip>
            )}
            {water != null && (
              <Chip icon={Thermometer}>
                eau <span className="font-mono tabular-nums">{frDecimal(water)} °C</span>
              </Chip>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
