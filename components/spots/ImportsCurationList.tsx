'use client'

import { useState, useCallback, useMemo } from 'react'
import { MapPin, ChevronDown, ChevronRight, SkipForward } from 'lucide-react'
import CurateSpotForm, { type ImportToCurate } from '@/components/spots/CurateSpotForm'
import { STRUCTURE_LABELS } from '@/lib/labels'
import { DEPARTMENT_LABELS } from '@/lib/geo/departments'

// Liste cliente des imports à curer (un onglet de la modération). Chaque ligne se
// déplie sur CurateSpotForm. « Suivant » enchaîne l'import suivant de la page (même
// département) une fois l'actuel curé/rejeté. Modérateur-only : protégé par la garde
// de page (is_moderator) ; chaque action (curateSpot/moderateRejectSpot) re-vérifie.

type Props = {
  imports: ImportToCurate[]
}

export default function ImportsCurationList({ imports }: Props) {
  const [openId, setOpenId] = useState<string | null>(null)
  // Imports déjà traités cette session (curés ou rejetés) → grisés, sortis du flux.
  const [doneIds, setDoneIds] = useState<Set<string>>(new Set())

  const remaining = useMemo(
    () => imports.filter((s) => !doneIds.has(s.id)),
    [imports, doneIds],
  )

  const goNext = useCallback(
    (currentId: string) => {
      setDoneIds((prev) => {
        const next = new Set(prev)
        next.add(currentId)
        return next
      })
      // Ouvre le prochain import non traité de la liste.
      const idx = imports.findIndex((s) => s.id === currentId)
      const nextSpot = imports
        .slice(idx + 1)
        .find((s) => !doneIds.has(s.id) && s.id !== currentId)
      setOpenId(nextSpot ? nextSpot.id : null)
    },
    [imports, doneIds],
  )

  if (imports.length === 0) {
    return (
      <div className="rounded-[14px] border border-sand-200 bg-white px-6 py-12 text-center">
        <MapPin size={32} className="mx-auto mb-3 text-ink-200" aria-hidden="true" />
        <p className="text-[14px] text-ink-400">Aucun import à curer pour ce filtre.</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      {imports.map((spot) => {
        const isOpen = openId === spot.id
        const isDone = doneIds.has(spot.id)
        const dept = spot.department.trim()
        return (
          <div
            key={spot.id}
            className={`rounded-[14px] border bg-white transition-opacity ${
              isDone ? 'border-sand-200 opacity-50' : 'border-sand-200'
            }`}
          >
            <button
              type="button"
              onClick={() => !isDone && setOpenId(isOpen ? null : spot.id)}
              disabled={isDone}
              aria-expanded={isOpen}
              className="flex w-full items-start justify-between gap-3 px-4 py-3.5 text-left disabled:cursor-default"
            >
              <span className="min-w-0">
                <span className="inline-flex items-center gap-1.5 text-[15px] font-semibold text-navy-900">
                  <MapPin size={14} className="shrink-0 text-teal-600" aria-hidden="true" />
                  <span className="truncate">{spot.name}</span>
                </span>
                <span className="mt-0.5 block text-[12px] text-ink-400">
                  {spot.structure ? (STRUCTURE_LABELS[spot.structure] ?? spot.structure) : 'Structure à renseigner'}
                  {' · '}
                  <span className="font-mono">{dept}</span> {DEPARTMENT_LABELS[dept] ?? ''}
                </span>
              </span>
              {isDone ? (
                <span className="shrink-0 text-[12px] font-medium text-ink-400">Traité</span>
              ) : isOpen ? (
                <ChevronDown size={18} className="shrink-0 text-ink-400" aria-hidden="true" />
              ) : (
                <ChevronRight size={18} className="shrink-0 text-ink-400" aria-hidden="true" />
              )}
            </button>

            {isOpen && !isDone && (
              <div className="border-t border-sand-100 px-4 py-4">
                <CurateSpotForm spot={spot} onDone={() => goNext(spot.id)} />
              </div>
            )}
          </div>
        )
      })}

      {remaining.length === 0 && doneIds.size > 0 && (
        <div className="rounded-[14px] border border-teal-500/30 bg-teal-500/5 px-6 py-8 text-center">
          <SkipForward size={28} className="mx-auto mb-2 text-teal-600" aria-hidden="true" />
          <p className="text-[14px] font-medium text-navy-900">
            Tous les imports de cette page sont traités. Passe à la page suivante.
          </p>
        </div>
      )}
    </div>
  )
}
