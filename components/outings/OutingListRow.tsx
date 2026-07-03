import { Fish, MapPin, Clock } from 'lucide-react'
import type { OutingListItem } from '@/lib/outings/list'
import { DEPARTMENT_LABELS } from '@/lib/geo/departments'
import { SPECIES_LABELS, TECHNIQUE_LABELS } from '@/lib/labels'
import { TagData } from '@/components/ui-v2/tag-data'
import { ShareButton } from '@/components/share/ShareButton'
import { TellOutingButton } from '@/components/outings/TellOutingButton'
import type { ComposerUser } from '@/components/feed/PostComposer'

// Une ligne de la liste « Mes sorties » (page /carnet/sorties). Server Component
// pur (présentation) : chiffres en mono (DA v2), zéro coordonnée, et un bouton
// « Partager ma sortie » (opt-in, ShareButton kind=outing).

const fmtDay = new Intl.DateTimeFormat('fr-FR', {
  weekday: 'short',
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  timeZone: 'Europe/Paris',
})

const fmtTime = new Intl.DateTimeFormat('fr-FR', {
  hour: '2-digit',
  minute: '2-digit',
  timeZone: 'Europe/Paris',
})

function speciesLabel(key: string | null): string {
  if (!key) return 'Prise'
  return SPECIES_LABELS[key] ?? key
}

// Durée lisible (« 2 h 15 ») si la sortie a une fin postérieure au début.
function formatDuration(startIso: string, endIso: string | null): string | null {
  if (!endIso) return null
  const start = new Date(startIso).getTime()
  const end = new Date(endIso).getTime()
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return null
  const mins = Math.round((end - start) / 60000)
  const h = Math.floor(mins / 60)
  const m = mins % 60
  if (h === 0) return `${m} min`
  if (m === 0) return `${h} h`
  return `${h} h ${String(m).padStart(2, '0')}`
}

export function OutingListRow({
  outing,
  composerUser = null,
  postId = null,
}: {
  outing: OutingListItem
  // Identité de l'auteur (pour le composer de récit) — présente sur /carnet/sorties.
  composerUser?: ComposerUser | null
  // Id du post de récit déjà publié pour cette sortie (null si aucun).
  postId?: string | null
}) {
  const deptLabel = DEPARTMENT_LABELS[outing.department] ?? outing.department
  const duration = formatDuration(outing.started_at, outing.ended_at)
  const best = outing.bestCatch
  const techniqueLabel = outing.technique ? TECHNIQUE_LABELS[outing.technique] ?? outing.technique : null
  // CTA « Raconte cette sortie » : sortie clôturée (ended_at) + identité auteur connue.
  const canTell = composerUser != null && outing.ended_at != null

  return (
    <li className="rounded-[14px] border border-sand-200 bg-white px-4 py-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        {/* Date + lieu + technique */}
        <div className="min-w-0">
          <p className="text-[15px] font-semibold capitalize text-navy-900">
            {fmtDay.format(new Date(outing.started_at))}
          </p>
          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-ink-500">
            <span className="inline-flex items-center gap-1 text-[13px]">
              <Clock size={13} aria-hidden="true" />
              <span className="font-mono tabular-nums">{fmtTime.format(new Date(outing.started_at))}</span>
              {duration && (
                <>
                  <span aria-hidden="true">·</span>
                  <span className="font-mono tabular-nums">{duration}</span>
                </>
              )}
            </span>
            <span className="inline-flex items-center gap-1 text-[13px]">
              <MapPin size={13} aria-hidden="true" />
              <span className="font-mono">{outing.department}</span>
              <span>{deptLabel}</span>
            </span>
            {techniqueLabel && (
              <span className="text-[13px]">{techniqueLabel}</span>
            )}
          </div>
        </div>

        {/* Compteur de prises / badge bredouille */}
        {outing.blank ? (
          <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-teal-500/40 bg-teal-50 px-3 py-1 text-[12.5px] font-semibold text-teal-700">
            Bredouille, ça compte
          </span>
        ) : (
          <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-sand-200 bg-slate-50 px-3 py-1 text-[13px] font-semibold text-navy-900">
            <Fish size={14} aria-hidden="true" />
            <span className="font-mono tabular-nums">{outing.catchCount}</span>
            {outing.catchCount > 1 ? 'prises' : 'prise'}
          </span>
        )}
      </div>

      {/* Meilleure prise + espèces */}
      {!outing.blank && (
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          {best && (
            <div className="rounded-[10px] bg-slate-50 px-3 py-2">
              <TagData>Meilleure prise</TagData>
              <p className="mt-0.5 text-[14px] font-semibold text-navy-900">
                {speciesLabel(best.species)}
                {best.size_cm != null && (
                  <span className="ml-1.5 font-mono tabular-nums text-ink-600">
                    {best.size_cm} cm
                  </span>
                )}
              </p>
            </div>
          )}
          {outing.species.length > 0 && (
            <div className="rounded-[10px] bg-slate-50 px-3 py-2">
              <TagData>Espèces</TagData>
              <p className="mt-0.5 text-[14px] text-ink-700">
                {outing.species.map((s) => speciesLabel(s)).join(', ')}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Raconter la sortie (post de fil, opt-in) + partage (carte, sans coordonnée) */}
      <div className="mt-3 flex flex-wrap items-center justify-end gap-2">
        {canTell && composerUser && (
          <TellOutingButton outingId={outing.id} postId={postId} currentUser={composerUser} />
        )}
        <ShareButton
          input={{ kind: 'outing', outingId: outing.id }}
          title="Ma sortie — Carnet de Pêche"
          text="Ma sortie de pêche, loguée sur Carnet de Pêche."
          label="Partager ma sortie"
          variant="ghost"
        />
      </div>
    </li>
  )
}
